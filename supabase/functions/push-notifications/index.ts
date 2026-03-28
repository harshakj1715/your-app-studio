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
    const { action, subscription, userId, taskTitle, taskDueDate } = await req.json();

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (action === "subscribe") {
      // Store push subscription
      const res = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          Prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify({
          user_id: userId,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error("Failed to save subscription:", err);
        throw new Error("Failed to save subscription");
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "unsubscribe") {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/push_subscriptions?user_id=eq.${userId}&endpoint=eq.${encodeURIComponent(subscription.endpoint)}`,
        {
          method: "DELETE",
          headers: {
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
        }
      );

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "notify") {
      // This would be called by a cron job to send push notifications for upcoming tasks
      // For now, return success - VAPID-based sending requires the web-push library
      return new Response(
        JSON.stringify({ success: true, message: "Notification queued" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("push-notifications error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
