import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const question = formData.get("question") as string | null;

    if (!file) {
      return new Response(
        JSON.stringify({ error: "No file provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Read file content
    const bytes = new Uint8Array(await file.arrayBuffer());
    const fileName = file.name.toLowerCase();
    
    let extractedText = "";
    
    // For text-based files, extract directly
    if (fileName.endsWith(".txt") || fileName.endsWith(".md") || fileName.endsWith(".csv")) {
      extractedText = new TextDecoder().decode(bytes);
    } else {
      // For PDF, DOCX, images - use Gemini's multimodal capabilities
      // Convert file to base64 for the AI
      const base64 = btoa(String.fromCharCode(...bytes));
      
      let mimeType = "application/octet-stream";
      if (fileName.endsWith(".pdf")) mimeType = "application/pdf";
      else if (fileName.endsWith(".docx")) mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      else if (fileName.endsWith(".doc")) mimeType = "application/msword";
      else if (fileName.endsWith(".png")) mimeType = "image/png";
      else if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")) mimeType = "image/jpeg";
      else if (fileName.endsWith(".webp")) mimeType = "image/webp";
      else if (fileName.endsWith(".gif")) mimeType = "image/gif";

      const systemPrompt = `You are a document analysis assistant. Extract and analyze the content of the uploaded file. If the user has a specific question, answer it based on the document content. Otherwise, provide a comprehensive summary of the document's contents.`;

      const userContent = [
        {
          type: "image_url",
          image_url: {
            url: `data:${mimeType};base64,${base64}`,
          },
        },
        {
          type: "text",
          text: question || "Please extract all text content from this document and provide a comprehensive summary. Include key points, structure, and any important details.",
        },
      ];

      const aiResponse = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userContent },
            ],
          }),
        }
      );

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        console.error("AI gateway error:", aiResponse.status, errText);
        return new Response(
          JSON.stringify({ error: "Failed to process document with AI" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const aiData = await aiResponse.json();
      extractedText = aiData.choices?.[0]?.message?.content || "Unable to extract content";
    }

    // If we extracted text from a text file, also run it through AI for analysis
    if (extractedText && (fileName.endsWith(".txt") || fileName.endsWith(".md") || fileName.endsWith(".csv"))) {
      const aiResponse = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: "You are a document analysis assistant. Analyze the provided text content.",
              },
              {
                role: "user",
                content: `${question || "Summarize and analyze this document:"}\n\n${extractedText.slice(0, 30000)}`,
              },
            ],
          }),
        }
      );

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        extractedText = aiData.choices?.[0]?.message?.content || extractedText;
      }
    }

    return new Response(
      JSON.stringify({ 
        analysis: extractedText,
        fileName: file.name,
        fileSize: file.size,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("process-document error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
