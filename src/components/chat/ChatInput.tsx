import { useState, useRef, useEffect, KeyboardEvent, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Mic, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, [input]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInput('');
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
    finalTranscript = input; // preserve existing text
    recognition.start();
    setIsListening(true);
  }, [input, stopListening]);

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const canSend = input.trim().length > 0 && !disabled;

  return (
    <div className="border-t border-border/50 bg-background/60 backdrop-blur-xl p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
      <div className="mx-auto max-w-3xl">
        <div className="relative flex items-end rounded-full border border-border bg-card shadow-sm transition-shadow focus-within:shadow-md focus-within:border-primary/30">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask NexaBot anything..."
            className="flex-1 resize-none bg-transparent py-3 pl-5 pr-24 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none max-h-[120px] min-h-[44px] scrollbar-none"
            rows={1}
            disabled={disabled}
          />
          <div className="absolute right-2 bottom-1.5 flex items-center gap-1">
            {/* Mic button */}
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
              {isListening ? (
                <Square className="h-4 w-4 fill-primary" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </button>

            {/* Send button */}
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
