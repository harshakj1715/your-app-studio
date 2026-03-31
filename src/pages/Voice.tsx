import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { streamChat, ChatMessage } from '@/lib/chat-stream';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mic, MicOff, ArrowLeft, Bot } from 'lucide-react';
import { Link } from 'react-router-dom';
import VoiceMessageBubble from '@/components/voice/VoiceMessageBubble';

export default function Voice() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleVoiceResult = useCallback(async (spokenText: string) => {
    if (!user || !spokenText.trim()) return;
    setIsProcessing(true);

    const userMsg: ChatMessage = { role: 'user', content: spokenText };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);

    let assistantContent = '';
    try {
      await streamChat({
        messages: updatedMessages,
        onDelta: (chunk) => {
          assistantContent += chunk;
          // Live-update the assistant message
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last?.role === 'assistant') {
              return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
            }
            return [...prev, { role: 'assistant', content: assistantContent }];
          });
        },
        onDone: () => {
          setIsProcessing(false);
        },
        onError: (error) => {
          toast({ title: 'AI Error', description: error, variant: 'destructive' });
          setIsProcessing(false);
        },
      });
    } catch {
      toast({ title: 'Error', description: 'Failed to get response', variant: 'destructive' });
      setIsProcessing(false);
    }
  }, [user, messages, toast]);

  const startListening = useCallback(() => {
    if (!SpeechRecognition) {
      toast({ title: 'Not Supported', description: 'Speech recognition is not available in this browser. Try Chrome.', variant: 'destructive' });
      return;
    }

    window.speechSynthesis.cancel();

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setTranscript(final || interim);
      if (final) handleVoiceResult(final);
    };

    recognition.onerror = (event: any) => {
      if (event.error !== 'aborted') {
        toast({ title: 'Mic Error', description: `Speech recognition error: ${event.error}`, variant: 'destructive' });
      }
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    setTranscript('');
  }, [SpeechRecognition, handleVoiceResult, toast]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      window.speechSynthesis.cancel();
    };
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3 bg-card/80 backdrop-blur-sm">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent">
          <Bot className="h-4 w-4 text-accent-foreground" />
        </div>
        <div>
          <p className="font-semibold text-sm text-foreground">Voice Chat</p>
          <p className="text-xs text-muted-foreground">
            {isListening ? 'Listening...' : isProcessing ? 'Thinking...' : 'Tap mic to talk'}
          </p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-4">
        {messages.length === 0 && !isProcessing && (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-20">
            <Bot className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm">Tap the mic and start speaking</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <VoiceMessageBubble key={i} message={msg} />
        ))}
        {isListening && transcript && (
          <div className="flex justify-end mb-3">
            <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm bg-primary/60 text-primary-foreground italic">
              {transcript}...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Mic controls */}
      <div className="flex flex-col items-center gap-2 border-t border-border py-4 bg-card/80 backdrop-blur-sm">
        {isListening ? (
          <Button size="lg" variant="destructive" onClick={stopListening} className="rounded-full h-14 w-14 animate-pulse">
            <MicOff className="h-6 w-6" />
          </Button>
        ) : (
          <Button size="lg" onClick={startListening} disabled={isProcessing} className="rounded-full h-14 w-14">
            <Mic className="h-6 w-6" />
          </Button>
        )}
        {!SpeechRecognition && (
          <p className="text-xs text-destructive text-center">
            Speech recognition not supported. Please use Chrome or Edge.
          </p>
        )}
      </div>
    </div>
  );
}
