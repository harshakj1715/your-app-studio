import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getConversations, deleteConversation } from '@/lib/conversations';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, Search, Trash2, Loader2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

export default function History() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) return;
    getConversations(user.id)
      .then(setConversations)
      .catch(() => toast({ title: 'Failed to load history', variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, [user]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      toast({ title: 'Conversation deleted' });
    } catch {
      toast({ title: 'Failed to delete', variant: 'destructive' });
    }
  };

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="container max-w-2xl py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="md:hidden">
            <Link to="/"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <h1 className="text-xl font-bold text-foreground">Chat History</h1>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <Card className="border-border/50 border-dashed">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <MessageSquare className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">
                {search ? 'No matching conversations' : 'No conversations yet'}
              </p>
            </CardContent>
          </Card>
        )}

        <div className="space-y-2">
          {filtered.map((conv) => (
            <Card
              key={conv.id}
              className="cursor-pointer border-border/50 transition-all hover:shadow-md hover:bg-secondary/50"
              onClick={() => navigate(`/chat/${conv.id}`)}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <MessageSquare className="h-5 w-5 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{conv.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={(e) => handleDelete(conv.id, e)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
