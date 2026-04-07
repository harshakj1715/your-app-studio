import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SplashScreenProps {
  onComplete: () => void;
}

/* ─── Starfield ─── */
function StarField() {
  const stars = useMemo(
    () =>
      Array.from({ length: 120 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 1.8 + 0.4,
        opacity: Math.random() * 0.5 + 0.05,
        delay: Math.random() * 4,
      })),
    []
  );
  return (
    <div className="absolute inset-0 overflow-hidden">
      {stars.map((s) => (
        <motion.div
          key={s.id}
          className="absolute rounded-full"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            backgroundColor: `rgba(147, 197, 253, ${s.opacity})`,
          }}
          animate={{ opacity: [s.opacity, s.opacity * 0.2, s.opacity] }}
          transition={{ duration: 2.5 + s.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

/* ─── Concentric rings ─── */
function ConcentricRings({ assembled }: { assembled: boolean }) {
  const rings = [
    { r: 90, dash: '8 12', width: 1.5, delay: 0 },
    { r: 110, dash: '20 15', width: 1, delay: 0.1 },
    { r: 135, dash: '4 20', width: 0.8, delay: 0.2 },
    { r: 160, dash: '30 10', width: 0.5, delay: 0.3 },
  ];
  return (
    <g>
      {rings.map((ring, i) => (
        <motion.circle
          key={i}
          cx="0"
          cy="0"
          r={ring.r}
          fill="none"
          stroke="rgba(59,130,246,0.25)"
          strokeWidth={ring.width}
          strokeDasharray={ring.dash}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={assembled ? { opacity: 1, scale: 1, rotate: 360 } : { opacity: 0, scale: 0.5 }}
          transition={{
            opacity: { duration: 0.6, delay: ring.delay },
            scale: { duration: 0.8, delay: ring.delay, ease: 'easeOut' },
            rotate: { duration: 20 + i * 5, repeat: Infinity, ease: 'linear' },
          }}
        />
      ))}
    </g>
  );
}

/* ─── Flying segments: mix of arcs and geometric pieces ─── */
interface Segment {
  id: number;
  type: 'arc' | 'polygon';
  d?: string; // SVG path for arcs
  points?: string; // SVG polygon points
  fromX: number;
  fromY: number;
  fromRotate: number;
}

function createSegments(): Segment[] {
  const segs: Segment[] = [];
  // 6 hex edges (inner logo)
  const HEX = 40;
  for (let i = 0; i < 6; i++) {
    const a1 = (Math.PI / 3) * i - Math.PI / 2;
    const a2 = (Math.PI / 3) * (i + 1) - Math.PI / 2;
    const x1 = Math.cos(a1) * HEX;
    const y1 = Math.sin(a1) * HEX;
    const x2 = Math.cos(a2) * HEX;
    const y2 = Math.sin(a2) * HEX;
    const bisect = (a1 + a2) / 2;
    segs.push({
      id: i,
      type: 'polygon',
      points: `0,0 ${x1},${y1} ${x2},${y2}`,
      fromX: Math.cos(bisect) * 400,
      fromY: Math.sin(bisect) * 400,
      fromRotate: (Math.random() - 0.5) * 180,
    });
  }
  // 4 outer arc fragments
  const arcData = [
    { start: -40, end: 30, r: 70, flyAngle: -0.8 },
    { start: 100, end: 170, r: 75, flyAngle: 0.9 },
    { start: 200, end: 260, r: 68, flyAngle: 2.5 },
    { start: 310, end: 355, r: 72, flyAngle: -2.2 },
  ];
  arcData.forEach((arc, i) => {
    const sa = (arc.start * Math.PI) / 180;
    const ea = (arc.end * Math.PI) / 180;
    const sx = Math.cos(sa) * arc.r;
    const sy = Math.sin(sa) * arc.r;
    const ex = Math.cos(ea) * arc.r;
    const ey = Math.sin(ea) * arc.r;
    const large = arc.end - arc.start > 180 ? 1 : 0;
    segs.push({
      id: 6 + i,
      type: 'arc',
      d: `M ${sx} ${sy} A ${arc.r} ${arc.r} 0 ${large} 1 ${ex} ${ey}`,
      fromX: Math.cos(arc.flyAngle) * 450,
      fromY: Math.sin(arc.flyAngle) * 450,
      fromRotate: (Math.random() - 0.5) * 120,
    });
  });
  return segs;
}

/* ─── Light streaks ─── */
function LightStreaks({ show }: { show: boolean }) {
  const streaks = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => {
        const angle = (Math.PI / 4) * i + (Math.random() - 0.5) * 0.3;
        return {
          id: i,
          x1: Math.cos(angle) * 20,
          y1: Math.sin(angle) * 20,
          x2: Math.cos(angle) * (250 + Math.random() * 150),
          y2: Math.sin(angle) * (250 + Math.random() * 150),
          width: Math.random() * 2 + 0.5,
        };
      }),
    []
  );
  return (
    <g>
      {streaks.map((s) => (
        <motion.line
          key={s.id}
          x1={s.x1}
          y1={s.y1}
          x2={s.x2}
          y2={s.y2}
          stroke="rgba(96,165,250,0.3)"
          strokeWidth={s.width}
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={show ? { pathLength: 1, opacity: [0, 0.6, 0] } : {}}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      ))}
    </g>
  );
}

/* ─── Main Splash ─── */
export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [phase, setPhase] = useState<'assemble' | 'hold' | 'fade'>('assemble');
  const segments = useMemo(createSegments, []);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('hold'), 1500);
    const t2 = setTimeout(() => setPhase('fade'), 2500);
    const t3 = setTimeout(onComplete, 3200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  const assembled = phase !== 'assemble';

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
        style={{ backgroundColor: '#020617' }}
        animate={phase === 'fade' ? { opacity: 0 } : { opacity: 1 }}
        transition={{ duration: 0.7, ease: 'easeInOut' }}
      >
        <StarField />

        {/* Central glow */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 200,
            height: 200,
            background: 'radial-gradient(circle, rgba(59,130,246,0.25) 0%, transparent 70%)',
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={assembled ? { scale: 2.5, opacity: 1 } : { scale: 0, opacity: 0 }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />

        <svg
          width="400"
          height="400"
          viewBox="-200 -200 400 400"
          className="relative overflow-visible"
        >
          <defs>
            <linearGradient id="hex-fill" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1d4ed8" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#60a5fa" />
            </linearGradient>
            <filter id="neon-glow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="strong-glow">
              <feGaussianBlur stdDeviation="10" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <radialGradient id="core-glow">
              <stop offset="0%" stopColor="rgba(96,165,250,0.5)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>

          {/* Concentric rotating rings */}
          <ConcentricRings assembled={assembled} />

          {/* Light streaks on assembly */}
          <LightStreaks show={assembled} />

          {/* Flying segments */}
          {segments.map((seg) =>
            seg.type === 'polygon' ? (
              <motion.polygon
                key={seg.id}
                points={seg.points}
                fill="url(#hex-fill)"
                stroke="#60a5fa"
                strokeWidth="0.8"
                filter="url(#neon-glow)"
                initial={{
                  x: seg.fromX,
                  y: seg.fromY,
                  rotate: seg.fromRotate,
                  opacity: 0,
                  scale: 0.6,
                }}
                animate={{ x: 0, y: 0, rotate: 0, opacity: 1, scale: 1 }}
                transition={{
                  duration: 1.3,
                  delay: seg.id * 0.04,
                  ease: [0.16, 1, 0.3, 1],
                }}
              />
            ) : (
              <motion.path
                key={seg.id}
                d={seg.d}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="4"
                strokeLinecap="round"
                filter="url(#neon-glow)"
                initial={{
                  x: seg.fromX,
                  y: seg.fromY,
                  rotate: seg.fromRotate,
                  opacity: 0,
                }}
                animate={{ x: 0, y: 0, rotate: 0, opacity: 0.8 }}
                transition={{
                  duration: 1.3,
                  delay: (seg.id - 6) * 0.08 + 0.1,
                  ease: [0.16, 1, 0.3, 1],
                }}
              />
            )
          )}

          {/* Inner core glow */}
          <motion.circle
            cx="0"
            cy="0"
            r="25"
            fill="url(#core-glow)"
            initial={{ opacity: 0 }}
            animate={assembled ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.5 }}
          />

          {/* Inner hexagon outline */}
          <motion.polygon
            points={(() => {
              const r = 22;
              return Array.from({ length: 6 }, (_, i) => {
                const a = (Math.PI / 3) * i - Math.PI / 2;
                return `${Math.cos(a) * r},${Math.sin(a) * r}`;
              }).join(' ');
            })()}
            fill="none"
            stroke="#60a5fa"
            strokeWidth="1.5"
            filter="url(#strong-glow)"
            initial={{ opacity: 0, scale: 0 }}
            animate={assembled ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.4, delay: 0.2, ease: 'easeOut' }}
          />
        </svg>

        {/* Shockwave rings */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 160,
            height: 160,
            border: '2px solid rgba(59, 130, 246, 0.5)',
            boxShadow: '0 0 60px 20px rgba(59, 130, 246, 0.15), inset 0 0 30px 10px rgba(59, 130, 246, 0.1)',
          }}
          initial={{ scale: 0.3, opacity: 0 }}
          animate={assembled ? { scale: [1, 3.5], opacity: [0.7, 0] } : {}}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 160,
            height: 160,
            border: '1px solid rgba(147, 197, 253, 0.3)',
          }}
          initial={{ scale: 0.3, opacity: 0 }}
          animate={assembled ? { scale: [1, 4.5], opacity: [0.5, 0] } : {}}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.15 }}
        />

        {/* NexaBot title */}
        <motion.h1
          className="relative mt-4 text-4xl font-bold tracking-tight"
          style={{
            fontFamily: 'Inter, sans-serif',
            background: 'linear-gradient(135deg, #3b82f6 0%, #93c5fd 50%, #ffffff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={assembled ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
        >
          NexaBot
        </motion.h1>

        {/* Powered by AI */}
        <motion.p
          className="absolute bottom-10 text-sm font-light tracking-widest"
          style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(148, 163, 184, 0.4)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 1 }}
        >
          Powered by AI
        </motion.p>
      </motion.div>
    </AnimatePresence>
  );
}
