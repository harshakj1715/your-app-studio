import { useState, useRef, useEffect, KeyboardEvent, useCallback } from 'react';
import { Send, Mic, Square, Plus, X, FileText, Image, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export interface ChatAttachment {
  file: File;
  preview?: string;
  type: string;
}

interface ChatInputProps {
  onSend: (message: string, attachments?: ChatAttachment[]) => void;
  disabled?: boolean;
}

function getFileIcon(type: string) {
  if (type.startsWith('image/')) return Image;
  if (type.includes('spreadsheet') || type.includes('csv')) return FileSpreadsheet;
  return FileText;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, [input]);

  const handleSend = () => {
    const trimmed = input.trim();
    if ((!trimmed && attachments.length === 0) || disabled) return;
    onSend(trimmed, attachments.length > 0 ? attachments : undefined);
    setInput('');
    setAttachments([]);
    stopListening();
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let finalTranscript = '';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += t + ' ';
        } else {
          interim = t;
        }
      }
      setInput(finalTranscript + interim);
    };

    recognition.onerror = () => stopListening();
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    finalTranscript = input;
    recognition.start();
    setIsListening(true);
  }, [input, stopListening]);

  const toggleListening = () => {
    if (isListening) stopListening();
    else startListening();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: ChatAttachment[] = [];
    Array.from(files).forEach((file) => {
      const attachment: ChatAttachment = { file, type: file.type };
      if (file.type.startsWith('image/')) {
        attachment.preview = URL.createObjectURL(file);
      }
      newAttachments.push(attachment);
    });

    setAttachments((prev) => [...prev, ...newAttachments]);
    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => {
      const removed = prev[index];
      if (removed.preview) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      attachments.forEach((a) => a.preview && URL.revokeObjectURL(a.preview));
    };
  }, []);

  const canSend = (input.trim().length > 0 || attachments.length > 0) && !disabled;

  return (
    <div className="border-t border-border/50 bg-background/60 backdrop-blur-xl p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
      <div className="mx-auto max-w-3xl">
        {/* Attachment previews */}
        {attachments.length > 0 && (
          <div className="flex gap-2 mb-2 flex-wrap px-2">
            {attachments.map((att, i) => {
              const Icon = getFileIcon(att.type);
              return (
                <div
                  key={i}
                  className="relative group flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground"
                >
                  {att.preview ? (
                    <img src={att.preview} alt="" className="h-8 w-8 rounded object-cover" />
                  ) : (
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="max-w-[120px] truncate">{att.file.name}</span>
                  <button
                    onClick={() => removeAttachment(i)}
                    className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="relative flex items-end rounded-full border border-border bg-card shadow-sm transition-shadow focus-within:shadow-md focus-within:border-primary/30">
          {/* File attach button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 ml-1.5 mb-1.5 shrink-0"
            title="Attach file"
          >
            <Plus className="h-4 w-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt,.md,.csv,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp"
            onChange={handleFileSelect}
            className="hidden"
          />

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask NexaBot anything..."
            className="flex-1 resize-none bg-transparent py-3 pl-1 pr-24 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none max-h-[120px] min-h-[44px] scrollbar-none"
            rows={1}
            disabled={disabled}
          />
          <div className="absolute right-2 bottom-1.5 flex items-center gap-1">
            <button
              type="button"
              onClick={toggleListening}
              disabled={disabled}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200",
                isListening
                  ? "bg-primary/10 text-primary animate-pulse"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              title={isListening ? "Stop listening" : "Voice input"}
            >
              {isListening ? <Square className="h-4 w-4 fill-primary" /> : <Mic className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200",
                canSend
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "text-muted-foreground/40 cursor-not-allowed"
              )}
              title="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}