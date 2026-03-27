import { Outlet } from 'react-router-dom';
import { AppHeader } from '@/components/AppHeader';
import { BottomNav } from '@/components/BottomNav';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <AppHeader />
      <Outlet />
      <BottomNav />
    </div>
  );
}
