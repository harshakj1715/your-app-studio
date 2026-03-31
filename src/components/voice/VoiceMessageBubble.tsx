import { useState, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Volume2, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { markdownToSpeech, shouldShowSpeaker } from '@/lib/speech-utils';
import type { ChatMessage } from '@/lib/chat-stream';

interface Props {
  message: ChatMessage;
}

export default function VoiceMessageBubble({ message }: Props) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const isAssistant = message.role === 'assistant';
  const showSpeaker = isAssistant && shouldShowSpeaker(message.content);

  const handleSpeak = useCallback(() => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const cleanText = markdownToSpeech(message.content);
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    utteranceRef.current = utterance;
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }, [isSpeaking, message.content]);

  return (
    <div className={`flex ${isAssistant ? 'justify-start' : 'justify-end'} mb-3`}>
      <div
        className={`relative max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
          isAssistant
            ? 'bg-card border border-border text-foreground'
            : 'bg-primary text-primary-foreground'
        }`}
      >
        {showSpeaker && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSpeak}
            className="absolute top-1 right-1 h-7 w-7 rounded-full opacity-70 hover:opacity-100"
            aria-label={isSpeaking ? 'Stop reading' : 'Read aloud'}
          >
            {isSpeaking ? (
              <Square className="h-3.5 w-3.5 text-destructive" />
            ) : (
              <Volume2 className="h-3.5 w-3.5" />
            )}
          </Button>
        )}

        {isAssistant ? (
          <div className="prose prose-sm dark:prose-invert max-w-none pr-6">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        ) : (
          <p>{message.content}</p>
        )}
      </div>
    </div>
  );
}
