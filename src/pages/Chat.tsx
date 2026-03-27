import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ChatMessageBubble } from '@/components/chat/ChatMessageBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { streamChat, ChatMessage } from '@/lib/chat-stream';
import {
  createConversation,
  getMessages,
  saveMessage,
  updateConversationTitle,
  messagesToChatFormat,
} from '@/lib/conversations';
import { useToast } from '@/hooks/use-toast';
import { Bot, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function Chat() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(chatId || null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Load existing conversation
  useEffect(() => {
    if (!chatId) return;
    setLoadingHistory(true);
    getMessages(chatId)
      .then((msgs) => {
        setMessages(messagesToChatFormat(msgs));
        setConversationId(chatId);
      })
      .catch(() => toast({ title: 'Failed to load conversation', variant: 'destructive' }))
      .finally(() => setLoadingHistory(false));
  }, [chatId]);

  useEffect(scrollToBottom, [messages, scrollToBottom]);

  const handleSend = async (content: string) => {
    if (!user) return;

    const userMsg: ChatMessage = { role: 'user', content };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsStreaming(true);

    let activeConversationId = conversationId;

    try {
      // Create conversation if new
      if (!activeConversationId) {
        const conv = await createConversation(user.id, content.slice(0, 80));
        activeConversationId = conv.id;
        setConversationId(conv.id);
        navigate(`/chat/${conv.id}`, { replace: true });
      }

      // Save user message
      await saveMessage(activeConversationId, 'user', content);

      // Stream AI response
      let assistantContent = '';
      const controller = new AbortController();
      abortRef.current = controller;

      await streamChat({
        messages: updatedMessages,
        signal: controller.signal,
        onDelta: (chunk) => {
          assistantContent += chunk;
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === 'assistant') {
              return prev.map((m, i) =>
                i === prev.length - 1 ? { ...m, content: assistantContent } : m
              );
            }
            return [...prev, { role: 'assistant', content: assistantContent }];
          });
        },
        onDone: async () => {
          if (assistantContent && activeConversationId) {
            await saveMessage(activeConversationId, 'assistant', assistantContent);
            // Auto-title on first exchange
            if (updatedMessages.length === 1) {
              const title = content.length > 60 ? content.slice(0, 57) + '...' : content;
              await updateConversationTitle(activeConversationId, title);
            }
          }
          setIsStreaming(false);
          abortRef.current = null;
        },
        onError: (error) => {
          toast({ title: 'AI Error', description: error, variant: 'destructive' });
          setIsStreaming(false);
          abortRef.current = null;
        },
      });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to send message', variant: 'destructive' });
      setIsStreaming(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Chat Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3 bg-card/80 backdrop-blur-sm">
        <Button variant="ghost" size="icon" asChild className="md:hidden">
          <Link to="/"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent">
          <Bot className="h-4 w-4 text-accent-foreground" />
        </div>
        <div>
          <p className="font-semibold text-sm text-foreground">NexaBot</p>
          <p className="text-xs text-muted-foreground">
            {isStreaming ? 'Typing...' : 'Online'}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {loadingHistory && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loadingHistory && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
                <Bot className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">How can I help you?</h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Ask me anything — from answering questions and writing content to brainstorming ideas and solving problems.
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <ChatMessageBubble
              key={i}
              role={msg.role}
              content={msg.content}
              isStreaming={isStreaming && i === messages.length - 1 && msg.role === 'assistant'}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={isStreaming} />
    </div>
  );
}
