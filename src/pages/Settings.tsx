import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Bell, BellOff, Webhook, ExternalLink, Loader2, CheckCircle2, XCircle
} from 'lucide-react';
import {
  isPushSupported,
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  showLocalNotification,
} from '@/lib/push-notifications';

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Push notification state
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const [pushEnabled, setPushEnabled] = useState(false);
  const [loadingPush, setLoadingPush] = useState(false);

  // Zapier state
  const [zapierUrl, setZapierUrl] = useState(() => localStorage.getItem('zapier_webhook_url') || '');
  const [testingZapier, setTestingZapier] = useState(false);
  const [zapierStatus, setZapierStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    (async () => {
      const supported = await isPushSupported();
      setPushSupported(supported);
      if (supported) {
        const perm = await getNotificationPermission();
        setPushPermission(perm);
        setPushEnabled(perm === 'granted');
      }
    })();
  }, []);

  const handleTogglePush = async (enabled: boolean) => {
    if (!user) return;
    setLoadingPush(true);

    try {
      if (enabled) {
        const perm = await requestNotificationPermission();
        setPushPermission(perm);
        if (perm === 'granted') {
          const success = await subscribeToPush(user.id);
          setPushEnabled(success);
          if (success) {
            showLocalNotification('Notifications Enabled', 'You will receive task reminders and updates.');
            toast({ title: 'Push notifications enabled' });
          }
        } else {
          toast({ title: 'Permission denied', description: 'Please allow notifications in your browser settings.', variant: 'destructive' });
        }
      } else {
        await unsubscribeFromPush(user.id);
        setPushEnabled(false);
        toast({ title: 'Push notifications disabled' });
      }
    } catch {
      toast({ title: 'Failed to update notification settings', variant: 'destructive' });
    } finally {
      setLoadingPush(false);
    }
  };

  const handleSaveZapier = () => {
    localStorage.setItem('zapier_webhook_url', zapierUrl);
    toast({ title: 'Zapier webhook URL saved' });
  };

  const handleTestZapier = async () => {
    if (!zapierUrl) {
      toast({ title: 'Enter a webhook URL first', variant: 'destructive' });
      return;
    }

    setTestingZapier(true);
    setZapierStatus('idle');

    try {
      await fetch(zapierUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'no-cors',
        body: JSON.stringify({
          event: 'test',
          timestamp: new Date().toISOString(),
          source: 'NexaBot',
          user_email: user?.email,
        }),
      });
      setZapierStatus('success');
      toast({ title: 'Test sent', description: 'Check your Zap history to confirm it was received.' });
    } catch {
      setZapierStatus('error');
      toast({ title: 'Test failed', description: 'Check the webhook URL.', variant: 'destructive' });
    } finally {
      setTestingZapier(false);
    }
  };

  return (
    <div className="container py-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-foreground mb-6">Settings</h1>

      {/* Push Notifications */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" /> Push Notifications
          </CardTitle>
          <CardDescription>
            Get notified about upcoming tasks and reminders
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pushSupported ? (
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable push notifications</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {pushPermission === 'denied'
                    ? 'Blocked by browser — update in browser settings'
                    : 'Receive alerts for upcoming tasks'}
                </p>
              </div>
              <Switch
                checked={pushEnabled}
                onCheckedChange={handleTogglePush}
                disabled={loadingPush || pushPermission === 'denied'}
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BellOff className="h-4 w-4" />
              Push notifications are not supported in this browser
            </div>
          )}
        </CardContent>
      </Card>

      {/* Zapier Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Webhook className="h-4 w-4" /> Zapier Integration
          </CardTitle>
          <CardDescription>
            Connect to Google Calendar, Outlook, or other services via Zapier
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Webhook URL</Label>
            <div className="flex gap-2">
              <Input
                placeholder="https://hooks.zapier.com/hooks/catch/..."
                value={zapierUrl}
                onChange={e => setZapierUrl(e.target.value)}
              />
              <Button variant="outline" size="sm" onClick={handleSaveZapier}>
                Save
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Create a Zap with a "Webhooks by Zapier" trigger, then paste the webhook URL here.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestZapier}
              disabled={testingZapier || !zapierUrl}
            >
              {testingZapier ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
              Send Test
            </Button>
            {zapierStatus === 'success' && (
              <Badge variant="outline" className="text-success border-success/20 bg-success/10 gap-1">
                <CheckCircle2 className="h-3 w-3" /> Sent
              </Badge>
            )}
            {zapierStatus === 'error' && (
              <Badge variant="outline" className="text-destructive border-destructive/20 bg-destructive/10 gap-1">
                <XCircle className="h-3 w-3" /> Failed
              </Badge>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">How to set up:</p>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Go to <a href="https://zapier.com" target="_blank" rel="noopener" className="text-primary underline">zapier.com</a> and create a new Zap</li>
              <li>Choose "Webhooks by Zapier" as the trigger</li>
              <li>Select "Catch Hook" as the event</li>
              <li>Copy the webhook URL and paste it above</li>
              <li>Add an action (e.g., Google Calendar → Create Event)</li>
              <li>Map the fields: title, due_date, description</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
