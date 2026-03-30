import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, MessageSquare, CheckCircle2, FileText, TrendingUp } from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';

interface DailyCount {
  date: string;
  count: number;
}

interface TaskStatusCount {
  status: string;
  count: number;
}

const chartConfig: ChartConfig = {
  messages: { label: 'Messages', color: 'hsl(var(--primary))' },
  conversations: { label: 'Conversations', color: 'hsl(var(--accent))' },
  todo: { label: 'To Do', color: 'hsl(var(--muted-foreground))' },
  in_progress: { label: 'In Progress', color: 'hsl(var(--primary))' },
  done: { label: 'Done', color: 'hsl(var(--success))' },
};

const PIE_COLORS = [
  'hsl(var(--muted-foreground))',
  'hsl(var(--primary))',
  'hsl(var(--success))',
];

export default function Analytics() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [totalMessages, setTotalMessages] = useState(0);
  const [totalConversations, setTotalConversations] = useState(0);
  const [totalTasks, setTotalTasks] = useState(0);
  const [completedTasks, setCompletedTasks] = useState(0);
  const [dailyMessages, setDailyMessages] = useState<DailyCount[]>([]);
  const [dailyConversations, setDailyConversations] = useState<DailyCount[]>([]);
  const [tasksByStatus, setTasksByStatus] = useState<TaskStatusCount[]>([]);

  useEffect(() => {
    if (!user) return;
    loadAnalytics();
  }, [user]);

  const loadAnalytics = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch conversations
      const { data: convos } = await supabase
        .from('conversations')
        .select('id, created_at')
        .eq('user_id', user.id);

      const convoIds = convos?.map((c) => c.id) || [];
      setTotalConversations(convoIds.length);

      // Fetch messages for user's conversations
      let allMessages: { created_at: string; role: string }[] = [];
      if (convoIds.length > 0) {
        const { data: msgs } = await supabase
          .from('messages')
          .select('created_at, role')
          .in('conversation_id', convoIds);
        allMessages = msgs || [];
      }
      setTotalMessages(allMessages.length);

      // Fetch tasks
      const { data: tasks } = await supabase
        .from('tasks')
        .select('status, created_at')
        .eq('user_id', user.id);

      const allTasks = tasks || [];
      setTotalTasks(allTasks.length);
      setCompletedTasks(allTasks.filter((t) => t.status === 'done').length);

      // Build daily message counts (last 14 days)
      const days = 14;
      const dailyMsgs: DailyCount[] = [];
      const dailyConvs: DailyCount[] = [];

      for (let i = days - 1; i >= 0; i--) {
        const day = startOfDay(subDays(new Date(), i));
        const dayStr = format(day, 'yyyy-MM-dd');
        const label = format(day, 'MMM d');

        const msgCount = allMessages.filter(
          (m) => format(new Date(m.created_at), 'yyyy-MM-dd') === dayStr
        ).length;

        const convCount = (convos || []).filter(
          (c) => format(new Date(c.created_at), 'yyyy-MM-dd') === dayStr
        ).length;

        dailyMsgs.push({ date: label, count: msgCount });
        dailyConvs.push({ date: label, count: convCount });
      }

      setDailyMessages(dailyMsgs);
      setDailyConversations(dailyConvs);

      // Task status breakdown
      const statusMap: Record<string, number> = {};
      allTasks.forEach((t) => {
        statusMap[t.status] = (statusMap[t.status] || 0) + 1;
      });
      setTasksByStatus(
        Object.entries(statusMap).map(([status, count]) => ({ status, count }))
      );
    } catch (err) {
      console.error('Analytics load error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container py-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground">Track your usage and productivity</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalMessages}</p>
              <p className="text-xs text-muted-foreground">Messages</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalConversations}</p>
              <p className="text-xs text-muted-foreground">Conversations</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalTasks}</p>
              <p className="text-xs text-muted-foreground">Tasks</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{completedTasks}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="messages">
        <TabsList className="mb-4">
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="conversations">Conversations</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
        </TabsList>

        <TabsContent value="messages">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Messages (Last 14 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <BarChart data={dailyMessages}>
                  <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" name="messages" fill="var(--color-messages)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversations">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Conversations (Last 14 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <LineChart data={dailyConversations}>
                  <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="count" name="conversations" stroke="var(--color-conversations)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Tasks by Status</CardTitle>
            </CardHeader>
            <CardContent>
              {tasksByStatus.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">No tasks yet</p>
              ) : (
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Pie
                      data={tasksByStatus}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ status, count }) => `${status}: ${count}`}
                    >
                      {tasksByStatus.map((entry, i) => (
                        <Cell key={entry.status} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
