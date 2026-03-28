import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Upload, FileText, Image, Loader2, Send, Trash2, File, X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  path: string;
  uploadedAt: Date;
}

interface AnalysisResult {
  fileName: string;
  analysis: string;
  timestamp: Date;
}

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'text/plain',
  'text/markdown',
  'text/csv',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function getFileIcon(type: string) {
  if (type.startsWith('image/')) return Image;
  return FileText;
}

export default function Files() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [question, setQuestion] = useState('');
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);
  const [results, setResults] = useState<AnalysisResult[]>([]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files?.length) return;
    const file = e.target.files[0];

    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast({ title: 'Unsupported file type', description: 'Please upload PDF, DOCX, images, or text files.', variant: 'destructive' });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: 'File too large', description: 'Maximum file size is 10MB.', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from('documents').upload(filePath, file);
      if (error) throw error;

      const newFile: UploadedFile = {
        id: filePath,
        name: file.name,
        size: file.size,
        type: file.type,
        path: filePath,
        uploadedAt: new Date(),
      };
      setFiles(prev => [newFile, ...prev]);
      setSelectedFile(newFile);
      toast({ title: 'File uploaded successfully' });
    } catch (err) {
      toast({ title: 'Upload failed', variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile || !user) return;
    setAnalyzing(true);

    try {
      // Download the file from storage
      const { data: fileData, error: dlError } = await supabase.storage
        .from('documents')
        .download(selectedFile.path);
      if (dlError || !fileData) throw dlError || new Error('Download failed');

      // Send to edge function for processing
      const formData = new FormData();
      formData.append('file', fileData, selectedFile.name);
      if (question.trim()) formData.append('question', question.trim());

      const { data: { session } } = await supabase.auth.getSession();
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/process-document`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Processing failed');
      }

      const result = await response.json();
      setResults(prev => [{
        fileName: selectedFile.name,
        analysis: result.analysis,
        timestamp: new Date(),
      }, ...prev]);
      setQuestion('');
      toast({ title: 'Analysis complete' });
    } catch (err) {
      toast({
        title: 'Analysis failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDelete = async (file: UploadedFile) => {
    try {
      await supabase.storage.from('documents').remove([file.path]);
      setFiles(prev => prev.filter(f => f.id !== file.id));
      if (selectedFile?.id === file.id) setSelectedFile(null);
      toast({ title: 'File deleted' });
    } catch {
      toast({ title: 'Delete failed', variant: 'destructive' });
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div className="container py-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Files & Documents</h1>
          <p className="text-sm text-muted-foreground">Upload and analyze documents with AI</p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.webp,.gif,.txt,.md,.csv"
            className="hidden"
            onChange={handleUpload}
          />
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} size="sm">
            {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
            Upload
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Files list */}
        <Card className="md:col-span-1">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium">Uploaded Files</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-2">
            {files.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <File className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p>No files uploaded yet</p>
              </div>
            ) : (
              <div className="space-y-1">
                {files.map(file => {
                  const Icon = getFileIcon(file.type);
                  return (
                    <div
                      key={file.id}
                      className={cn(
                        'flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer text-sm transition-colors',
                        selectedFile?.id === file.id ? 'bg-primary/10 text-primary' : 'hover:bg-secondary'
                      )}
                      onClick={() => setSelectedFile(file)}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 flex-shrink-0"
                        onClick={(e) => { e.stopPropagation(); handleDelete(file); }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Analysis panel */}
        <Card className="md:col-span-2">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium">
              {selectedFile ? `Analyze: ${selectedFile.name}` : 'Select a file to analyze'}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {selectedFile ? (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Ask a question about this document (optional)"
                    value={question}
                    onChange={e => setQuestion(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
                  />
                  <Button onClick={handleAnalyze} disabled={analyzing} size="sm">
                    {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>

                {analyzing && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing document...
                  </div>
                )}

                <ScrollArea className="max-h-[400px]">
                  <div className="space-y-4">
                    {results
                      .filter(r => r.fileName === selectedFile.name)
                      .map((result, i) => (
                        <div key={i} className="bg-secondary/50 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-[10px]">Analysis</Badge>
                            <span className="text-xs text-muted-foreground">
                              {result.timestamp.toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                            {result.analysis}
                          </div>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Upload a file and select it to start AI analysis</p>
                <p className="text-xs mt-1">Supports PDF, DOCX, images, and text files</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
