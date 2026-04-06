import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare, CalendarDays, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getConversations } from '@/lib/conversations';
import { formatDistanceToNow } from 'date-fns';

export default function Index() {
  const { user } = useAuth();
  const [recentChats, setRecentChats] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    getConversations(user.id).then((c) => setRecentChats(c.slice(0, 4)));
  }, [user]);

  const quickActions = [
    { icon: MessageSquare, label: 'New Chat', description: 'Start a conversation', color: 'text-primary', path: '/chat' },
    { icon: CalendarDays, label: 'Schedule', description: 'Manage your tasks', color: 'text-accent', path: '/tasks' },
    { icon: Sparkles, label: 'Ask Anything', description: 'Get instant answers', color: 'text-success', path: '/chat' },
  ];

  return (
    <main className="container py-6 space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Welcome{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ''}
        </h1>
        <p className="mt-1 text-muted-foreground">What can I help you with today?</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {quickActions.map((action) => (
          <Link key={action.label} to={action.path}>
            <Card className="cursor-pointer border-border/50 transition-all hover:shadow-md hover:-translate-y-0.5 h-full">
              <CardContent className="flex flex-col items-center gap-2 p-5 text-center">
                <action.icon className={`h-7 w-7 ${action.color}`} />
                <div>
                  <p className="font-semibold text-sm text-foreground">{action.label}</p>
                  <p className="text-xs text-muted-foreground">{action.description}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Conversations */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground">Recent Conversations</h2>
          {recentChats.length > 0 && (
            <Link to="/history" className="text-xs text-primary hover:underline">View all</Link>
          )}
        </div>

        {recentChats.length === 0 ? (
          <Card className="border-border/50 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <MessageSquare className="h-9 w-9 text-muted-foreground/50 mb-2" />
              <p className="text-muted-foreground text-sm">No conversations yet</p>
              <p className="text-xs text-muted-foreground/70">Start a new chat to get going</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {recentChats.map((chat) => (
              <Link key={chat.id} to={`/chat/${chat.id}`}>
                <Card className="border-border/50 transition-all hover:shadow-md hover:bg-secondary/50">
                  <CardContent className="flex items-center gap-3 p-4">
                    <MessageSquare className="h-5 w-5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">{chat.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(chat.updated_at), { addSuffix: true })}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
