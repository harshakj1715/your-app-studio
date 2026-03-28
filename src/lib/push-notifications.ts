import { supabase } from '@/integrations/supabase/client';

// VAPID public key - in production this should be generated and stored securely
// For now we use a placeholder that can be replaced with real VAPID keys
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkOs-qy62wipO3i3KlB_bwEU0q9r-owUJ7n5cRBGVg';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function isPushSupported(): Promise<boolean> {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export async function getNotificationPermission(): Promise<NotificationPermission> {
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  return await Notification.requestPermission();
}

export async function subscribeToPush(userId: string): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    const subJson = subscription.toJSON();
    
    // Save subscription to backend
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const { data: { session } } = await supabase.auth.getSession();
    
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/push-notifications`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          action: 'subscribe',
          userId,
          subscription: subJson,
        }),
      }
    );

    return response.ok;
  } catch (err) {
    console.error('Push subscription failed:', err);
    return false;
  }
}

export async function unsubscribeFromPush(userId: string): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      const subJson = subscription.toJSON();
      await subscription.unsubscribe();
      
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const { data: { session } } = await supabase.auth.getSession();
      
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/push-notifications`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            action: 'unsubscribe',
            userId,
            subscription: subJson,
          }),
        }
      );
    }
    return true;
  } catch (err) {
    console.error('Push unsubscribe failed:', err);
    return false;
  }
}

export function showLocalNotification(title: string, body: string) {
  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
    });
  }
}
