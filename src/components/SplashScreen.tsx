import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SplashScreenProps {
  onComplete: () => void;
}

// Star field background
function StarField() {
  const stars = useMemo(
    () =>
      Array.from({ length: 80 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.6 + 0.1,
        delay: Math.random() * 3,
      })),
    []
  );

  return (
    <div className="absolute inset-0 overflow-hidden">
      {stars.map((star) => (
        <motion.div
          key={star.id}
          className="absolute rounded-full"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
            backgroundColor: `rgba(147, 197, 253, ${star.opacity})`,
          }}
          animate={{ opacity: [star.opacity, star.opacity * 0.3, star.opacity] }}
          transition={{ duration: 2 + star.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

// Hex shield segments — 6 triangular slices of a hexagon
const HEX_SIZE = 48;
const segments = Array.from({ length: 6 }, (_, i) => {
  const angle = (Math.PI / 3) * i - Math.PI / 2;
  const nextAngle = (Math.PI / 3) * (i + 1) - Math.PI / 2;
  const cx = 0,
    cy = 0;
  const x1 = Math.cos(angle) * HEX_SIZE;
  const y1 = Math.sin(angle) * HEX_SIZE;
  const x2 = Math.cos(nextAngle) * HEX_SIZE;
  const y2 = Math.sin(nextAngle) * HEX_SIZE;

  // fly-in origin: far out along the bisector of the segment
  const bisect = (angle + nextAngle) / 2;
  const flyDist = 300;

  return {
    id: i,
    points: `${cx},${cy} ${x1},${y1} ${x2},${y2}`,
    fromX: Math.cos(bisect) * flyDist,
    fromY: Math.sin(bisect) * flyDist,
  };
});

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [phase, setPhase] = useState<'assemble' | 'hold' | 'fade'>('assemble');

  useEffect(() => {
    // assemble 1.5s → hold 1s → fade 0.6s
    const t1 = setTimeout(() => setPhase('hold'), 1500);
    const t2 = setTimeout(() => setPhase('fade'), 2500);
    const t3 = setTimeout(onComplete, 3100);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {phase !== 'fade' ? null : null}
      <motion.div
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
        style={{ backgroundColor: '#020617' }}
        animate={phase === 'fade' ? { opacity: 0, scale: 1.05 } : { opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
      >
        <StarField />

        {/* Logo assembly area */}
        <div className="relative flex items-center justify-center" style={{ width: 140, height: 140 }}>
          <svg
            width="140"
            height="140"
            viewBox="-60 -60 120 120"
            className="overflow-visible"
          >
            <defs>
              <linearGradient id="hex-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#60a5fa" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {segments.map((seg) => (
              <motion.polygon
                key={seg.id}
                points={seg.points}
                fill="url(#hex-gradient)"
                stroke="#93c5fd"
                strokeWidth="1"
                filter="url(#glow)"
                initial={{ x: seg.fromX, y: seg.fromY, opacity: 0, scale: 0.5 }}
                animate={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                transition={{
                  duration: 1.2,
                  delay: seg.id * 0.05,
                  ease: [0.22, 1, 0.36, 1],
                }}
              />
            ))}

            {/* N letter in center */}
            <motion.text
              x="0"
              y="6"
              textAnchor="middle"
              fill="white"
              fontSize="32"
              fontWeight="bold"
              fontFamily="Inter, sans-serif"
              initial={{ opacity: 0 }}
              animate={{ opacity: phase === 'assemble' ? 0 : 1 }}
              transition={{ duration: 0.3 }}
            >
              N
            </motion.text>
          </svg>

          {/* Shockwave pulse */}
          <motion.div
            className="absolute rounded-full"
            style={{
              width: 140,
              height: 140,
              border: '2px solid rgba(59, 130, 246, 0.6)',
              boxShadow: '0 0 40px 10px rgba(59, 130, 246, 0.3)',
            }}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={
              phase !== 'assemble'
                ? { scale: [1, 2.5], opacity: [0.8, 0] }
                : { scale: 0.5, opacity: 0 }
            }
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />

          {/* Secondary shockwave */}
          <motion.div
            className="absolute rounded-full"
            style={{
              width: 140,
              height: 140,
              border: '1px solid rgba(147, 197, 253, 0.4)',
            }}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={
              phase !== 'assemble'
                ? { scale: [1, 3], opacity: [0.6, 0] }
                : { scale: 0.5, opacity: 0 }
            }
            transition={{ duration: 1, ease: 'easeOut', delay: 0.1 }}
          />
        </div>

        {/* NexaBot text */}
        <motion.h1
          className="mt-8 text-4xl font-bold tracking-tight"
          style={{
            fontFamily: 'Inter, sans-serif',
            background: 'linear-gradient(135deg, #3b82f6, #93c5fd, #ffffff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
          initial={{ opacity: 0, y: 12 }}
          animate={
            phase !== 'assemble'
              ? { opacity: 1, y: 0 }
              : { opacity: 0, y: 12 }
          }
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          NexaBot
        </motion.h1>

        {/* Powered by AI */}
        <motion.p
          className="absolute bottom-10 text-sm font-light tracking-wide"
          style={{
            fontFamily: 'Inter, sans-serif',
            color: 'rgba(148, 163, 184, 0.5)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          Powered by AI
        </motion.p>
      </motion.div>
    </AnimatePresence>
  );
}
