import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Bot, MessageSquare, CalendarDays, Mic, LogOut, Sparkles } from 'lucide-react';

export default function Index() {
  const { user, signOut } = useAuth();

  const quickActions = [
    { icon: MessageSquare, label: 'New Chat', description: 'Start a conversation', color: 'text-primary' },
    { icon: CalendarDays, label: 'Schedule', description: 'Manage your tasks', color: 'text-accent' },
    { icon: Mic, label: 'Voice Chat', description: 'Talk hands-free', color: 'text-warning' },
    { icon: Sparkles, label: 'Ask Anything', description: 'Get instant answers', color: 'text-success' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <Bot className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">NexaBot</span>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8 space-y-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Welcome{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ''}
          </h1>
          <p className="mt-1 text-muted-foreground">What can I help you with today?</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {quickActions.map((action) => (
            <Card key={action.label} className="cursor-pointer border-border/50 transition-all hover:shadow-md hover:-translate-y-0.5">
              <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
                <action.icon className={`h-8 w-8 ${action.color}`} />
                <div>
                  <p className="font-semibold text-foreground">{action.label}</p>
                  <p className="text-xs text-muted-foreground">{action.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Conversations Placeholder */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Recent Conversations</h2>
          <Card className="border-border/50 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <MessageSquare className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No conversations yet</p>
              <p className="text-sm text-muted-foreground/70">Start a new chat to get going</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
