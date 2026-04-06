import { useEffect, useState } from 'react';
import { Bot } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const duration = 2500;
    const interval = 30;
    const step = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return Math.min(prev + step, 100);
      });
    }, interval);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (progress >= 100) {
      const timeout = setTimeout(() => setFadeOut(true), 300);
      return () => clearTimeout(timeout);
    }
  }, [progress]);

  useEffect(() => {
    if (fadeOut) {
      const timeout = setTimeout(onComplete, 600);
      return () => clearTimeout(timeout);
    }
  }, [fadeOut, onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center transition-all duration-600 ${
        fadeOut ? 'opacity-0 scale-105' : 'opacity-100 scale-100'
      }`}
      style={{ backgroundColor: 'hsl(221, 83%, 40%)' }}
    >
      {/* Logo */}
      <div className="flex flex-col items-center gap-6 animate-fade-in">
        <div className="relative">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm animate-pulse">
            <Bot className="h-10 w-10 text-white" />
          </div>
          {/* Glow ring */}
          <div className="absolute -inset-3 rounded-3xl bg-white/5 animate-ping" style={{ animationDuration: '2s' }} />
        </div>

        <h1
          className="text-3xl font-bold tracking-tight text-white"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          NexaBot
        </h1>
      </div>

      {/* Progress bar */}
      <div className="mt-10 w-56">
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full rounded-full transition-all duration-100 ease-linear"
            style={{
              width: `${progress}%`,
              backgroundColor: 'hsl(160, 84%, 39%)',
            }}
          />
        </div>
      </div>

      {/* Caption */}
      <p
        className="absolute bottom-10 text-sm font-light tracking-wide text-white/50"
        style={{ fontFamily: 'Inter, sans-serif' }}
      >
        Powered by AI
      </p>
    </div>
  );
}
