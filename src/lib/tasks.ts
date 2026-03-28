import { supabase } from '@/integrations/supabase/client';

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type TaskInsert = {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  due_date?: string | null;
  user_id: string;
};

export async function getTasks(userId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as unknown as Task[]) ?? [];
}

export async function createTask(task: TaskInsert): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .insert(task)
    .select()
    .single();
  if (error) throw error;
  
  const created = data as unknown as Task;
  
  // Send to Zapier if webhook is configured
  triggerZapierWebhook('task_created', created);
  
  return created;
}

export async function updateTask(id: string, updates: Partial<TaskInsert> & { status?: string; completed_at?: string | null }): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  
  const updated = data as unknown as Task;
  triggerZapierWebhook('task_updated', updated);
  
  return updated;
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id);
  if (error) throw error;
  
  triggerZapierWebhook('task_deleted', { id });
}

function triggerZapierWebhook(event: string, data: unknown) {
  const webhookUrl = localStorage.getItem('zapier_webhook_url');
  if (!webhookUrl) return;
  
  // Fire-and-forget
  fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    mode: 'no-cors',
    body: JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      source: 'NexaBot',
      data,
    }),
  }).catch(console.error);
}
