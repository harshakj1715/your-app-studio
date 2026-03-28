import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getTasks, createTask, updateTask, deleteTask, Task, TaskInsert } from '@/lib/tasks';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Plus, CalendarIcon, Loader2, Trash2, Edit2, ListTodo, CalendarDays,
  AlertCircle, ArrowUp, Minus
} from 'lucide-react';
import { format, isSameDay, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameMonth } from 'date-fns';
import { cn } from '@/lib/utils';

const priorityConfig = {
  high: { label: 'High', icon: ArrowUp, className: 'bg-destructive/10 text-destructive border-destructive/20' },
  medium: { label: 'Medium', icon: Minus, className: 'bg-warning/10 text-warning border-warning/20' },
  low: { label: 'Low', icon: AlertCircle, className: 'bg-muted text-muted-foreground border-border' },
};

const statusConfig = {
  todo: { label: 'To Do', className: 'bg-secondary text-secondary-foreground' },
  in_progress: { label: 'In Progress', className: 'bg-primary/10 text-primary' },
  done: { label: 'Done', className: 'bg-success/10 text-success' },
};

export default function Tasks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [filter, setFilter] = useState<'all' | 'todo' | 'in_progress' | 'done'>('all');

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [status, setStatus] = useState<'todo' | 'in_progress' | 'done'>('todo');

  const loadTasks = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getTasks(user.id);
      setTasks(data);
    } catch {
      toast({ title: 'Failed to load tasks', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const resetForm = () => {
    setTitle(''); setDescription(''); setPriority('medium'); setDueDate(undefined); setStatus('todo'); setEditingTask(null);
  };

  const openCreate = () => { resetForm(); setDialogOpen(true); };
  const openEdit = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description || '');
    setPriority(task.priority);
    setStatus(task.status);
    setDueDate(task.due_date ? parseISO(task.due_date) : undefined);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user || !title.trim()) return;
    try {
      if (editingTask) {
        await updateTask(editingTask.id, {
          title: title.trim(),
          description: description.trim(),
          priority,
          status,
          due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
          completed_at: status === 'done' ? new Date().toISOString() : null,
        });
        toast({ title: 'Task updated' });
      } else {
        await createTask({
          user_id: user.id,
          title: title.trim(),
          description: description.trim(),
          priority,
          due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
        });
        toast({ title: 'Task created' });
      }
      setDialogOpen(false);
      resetForm();
      loadTasks();
    } catch {
      toast({ title: 'Failed to save task', variant: 'destructive' });
    }
  };

  const handleToggleComplete = async (task: Task) => {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    try {
      await updateTask(task.id, {
        status: newStatus,
        completed_at: newStatus === 'done' ? new Date().toISOString() : null,
      });
      loadTasks();
    } catch {
      toast({ title: 'Failed to update task', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTask(id);
      toast({ title: 'Task deleted' });
      loadTasks();
    } catch {
      toast({ title: 'Failed to delete task', variant: 'destructive' });
    }
  };

  const filteredTasks = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);

  // Calendar helpers
  const monthStart = startOfMonth(calendarMonth);
  const monthEnd = endOfMonth(calendarMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getTasksForDay = (day: Date) =>
    tasks.filter(t => t.due_date && isSameDay(parseISO(t.due_date), day));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container py-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tasks</h1>
          <p className="text-sm text-muted-foreground">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-1" /> New Task
        </Button>
      </div>

      <Tabs defaultValue="list">
        <TabsList className="mb-4">
          <TabsTrigger value="list" className="gap-1.5"><ListTodo className="h-4 w-4" />List</TabsTrigger>
          <TabsTrigger value="calendar" className="gap-1.5"><CalendarDays className="h-4 w-4" />Calendar</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          {/* Filter */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {(['all', 'todo', 'in_progress', 'done'] as const).map(f => (
              <Button
                key={f}
                variant={filter === f ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'All' : statusConfig[f].label}
              </Button>
            ))}
          </div>

          {filteredTasks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-12 text-center">
                <ListTodo className="h-12 w-12 text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground">No tasks yet. Create one to get started!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredTasks.map(task => {
                const pConfig = priorityConfig[task.priority];
                return (
                  <Card key={task.id} className={cn('transition-all', task.status === 'done' && 'opacity-60')}>
                    <CardContent className="flex items-start gap-3 py-3 px-4">
                      <Checkbox
                        checked={task.status === 'done'}
                        onCheckedChange={() => handleToggleComplete(task)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <p className={cn('font-medium text-sm text-foreground', task.status === 'done' && 'line-through')}>
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', pConfig.className)}>
                            {pConfig.label}
                          </Badge>
                          <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', statusConfig[task.status].className)}>
                            {statusConfig[task.status].label}
                          </Badge>
                          {task.due_date && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <CalendarIcon className="h-3 w-3" />
                              {format(parseISO(task.due_date), 'MMM d')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(task)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(task.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="calendar">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="sm" onClick={() => setCalendarMonth(d => new Date(d.getFullYear(), d.getMonth() - 1))}>
                  ←
                </Button>
                <h3 className="font-semibold text-foreground">{format(calendarMonth, 'MMMM yyyy')}</h3>
                <Button variant="ghost" size="sm" onClick={() => setCalendarMonth(d => new Date(d.getFullYear(), d.getMonth() + 1))}>
                  →
                </Button>
              </div>
              <div className="grid grid-cols-7 gap-px text-center text-xs text-muted-foreground mb-1">
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="py-1 font-medium">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-px">
                {/* Offset for first day of month */}
                {Array.from({ length: monthStart.getDay() }).map((_, i) => <div key={`e-${i}`} />)}
                {daysInMonth.map(day => {
                  const dayTasks = getTasksForDay(day);
                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        'min-h-[72px] p-1 rounded-md border border-transparent',
                        isToday(day) && 'bg-primary/5 border-primary/20',
                        !isSameMonth(day, calendarMonth) && 'opacity-40'
                      )}
                    >
                      <span className={cn('text-xs font-medium', isToday(day) ? 'text-primary' : 'text-foreground')}>
                        {format(day, 'd')}
                      </span>
                      <div className="space-y-0.5 mt-0.5">
                        {dayTasks.slice(0, 2).map(t => (
                          <div
                            key={t.id}
                            className={cn(
                              'text-[9px] leading-tight px-1 py-0.5 rounded truncate cursor-pointer',
                              t.status === 'done' ? 'bg-success/10 text-success line-through' : 'bg-primary/10 text-primary'
                            )}
                            onClick={() => openEdit(t)}
                          >
                            {t.title}
                          </div>
                        ))}
                        {dayTasks.length > 2 && (
                          <span className="text-[9px] text-muted-foreground">+{dayTasks.length - 2} more</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Edit Task' : 'New Task'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input placeholder="Task title" value={title} onChange={e => setTitle(e.target.value)} />
            <Textarea placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} rows={3} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Priority</label>
                <Select value={priority} onValueChange={v => setPriority(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editingTask && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
                  <Select value={status} onValueChange={v => setStatus(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Due Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !dueDate && 'text-muted-foreground')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!title.trim()}>
              {editingTask ? 'Save Changes' : 'Create Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
