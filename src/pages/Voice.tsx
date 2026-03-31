import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { streamChat, ChatMessage } from '@/lib/chat-stream';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Volume2, Square, ArrowLeft, Bot } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Voice() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    synthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, []);

  const handleVoiceResult = useCallback(async (spokenText: string) => {
    if (!user || !spokenText.trim()) return;
    setIsProcessing(true);
    setResponse('');

    const userMsg: ChatMessage = { role: 'user', content: spokenText };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);

    let assistantContent = '';
    try {
      await streamChat({
        messages: updatedMessages,
        onDelta: (chunk) => {
          assistantContent += chunk;
          setResponse(assistantContent);
        },
        onDone: () => {
          setMessages(prev => [...prev, { role: 'assistant', content: assistantContent }]);
          setIsProcessing(false);
          // Only speak a brief confirmation, not the full response
          speak("Here's what I found.");
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
  }, [user, messages, speak, toast]);

  const startListening = useCallback(() => {
    if (!SpeechRecognition) {
      toast({ title: 'Not Supported', description: 'Speech recognition is not available in this browser. Try Chrome.', variant: 'destructive' });
      return;
    }

    window.speechSynthesis.cancel();
    setIsSpeaking(false);

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
      if (final) {
        handleVoiceResult(final);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error !== 'aborted') {
        toast({ title: 'Mic Error', description: `Speech recognition error: ${event.error}`, variant: 'destructive' });
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    setTranscript('');
  }, [SpeechRecognition, handleVoiceResult, toast]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
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
            {isListening ? 'Listening...' : isSpeaking ? 'Speaking...' : isProcessing ? 'Thinking...' : 'Tap mic to talk'}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 gap-8">
        {/* Visualizer circle */}
        <div className={`relative flex items-center justify-center w-40 h-40 rounded-full transition-all duration-500 ${
          isListening
            ? 'bg-destructive/10 ring-4 ring-destructive/30 animate-pulse'
            : isSpeaking
            ? 'bg-primary/10 ring-4 ring-primary/30 animate-pulse'
            : isProcessing
            ? 'bg-accent/20 ring-2 ring-accent/30'
            : 'bg-muted'
        }`}>
          {isListening ? (
            <Mic className="h-12 w-12 text-destructive" />
          ) : isSpeaking ? (
            <Volume2 className="h-12 w-12 text-primary" />
          ) : (
            <Mic className="h-12 w-12 text-muted-foreground" />
          )}
        </div>

        {/* Transcript */}
        <div className="text-center max-w-md min-h-[3rem]">
          {transcript && (
            <p className="text-sm text-muted-foreground italic">"{transcript}"</p>
          )}
          {response && !isProcessing && (
            <p className="text-sm text-foreground mt-2 whitespace-pre-wrap text-left">{response}</p>
          )}
          {isProcessing && (
            <p className="text-sm text-muted-foreground animate-pulse">Thinking...</p>
          )}
        </div>

        {/* Controls */}
        <div className="flex gap-4">
          {isListening ? (
            <Button size="lg" variant="destructive" onClick={stopListening} className="rounded-full h-14 w-14">
              <MicOff className="h-6 w-6" />
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={startListening}
              disabled={isProcessing}
              className="rounded-full h-14 w-14"
            >
              <Mic className="h-6 w-6" />
            </Button>
          )}
          {isSpeaking && (
            <Button size="lg" variant="outline" onClick={stopSpeaking} className="rounded-full h-14 w-14">
              <Square className="h-5 w-5" />
            </Button>
          )}
        </div>

        {!SpeechRecognition && (
          <p className="text-xs text-destructive text-center">
            Speech recognition is not supported in this browser. Please use Chrome or Edge.
          </p>
        )}
      </div>
    </div>
  );
}
