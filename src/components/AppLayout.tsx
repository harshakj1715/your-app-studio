import { Outlet } from 'react-router-dom';
import { AppHeader } from '@/components/AppHeader';
import { BottomNav } from '@/components/BottomNav';
import { SplashScreen } from '@/components/SplashScreen';
import { useAuth } from '@/contexts/AuthContext';

export function AppLayout() {
  const { showSplash, dismissSplash } = useAuth();

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      {showSplash && <SplashScreen onComplete={dismissSplash} />}
      <AppHeader />
      <Outlet />
      <BottomNav />
    </div>
  );
}
