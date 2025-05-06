'use client';

import React, { useEffect, useRef, useState } from 'react';

const BG_COLOR = '#222831';
const RIPPLE_COLOR = '#6EC1E4';
const RIPPLE_MAX_RADIUS = 120;
const RIPPLE_DURATION = 1800; // ms

type Ripple = {
  id: number;
  cx: number;
  cy: number;
  start: number;
};

export default function Home() {
  const [windowSize, setWindowSize] = useState({ width: 800, height: 600 });
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const rippleId = useRef(0);

  // ウィンドウサイズ取得
  useEffect(() => {
    const updateSize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // 波紋を画面内のランダムな位置に発生
  useEffect(() => {
    const interval = setInterval(() => {
      const cx = Math.random() * windowSize.width;
      const cy = Math.random() * windowSize.height;
      setRipples(prev => [
        ...prev,
        { id: rippleId.current++, cx, cy, start: Date.now() },
      ]);
    }, 300); // 出現頻度
    return () => clearInterval(interval);
  }, [windowSize]);

  // 波紋のアニメーション
  useEffect(() => {
    let raf: number;
    const animate = () => {
      setRipples(prev =>
        prev.filter(r => Date.now() - r.start < RIPPLE_DURATION)
      );
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <main
      style={{
        width: '100vw',
        height: '100vh',
        background: BG_COLOR,
        overflow: 'hidden',
      }}
    >
      <svg
        width="100vw"
        height="100vh"
        viewBox={`0 0 ${windowSize.width} ${windowSize.height}`}
        style={{ display: 'block', width: '100vw', height: '100vh' }}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* 波紋のみ */}
        {ripples.map(r => {
          const progress = Math.min(
            (Date.now() - r.start) / RIPPLE_DURATION,
            1
          );
          const radius = 10 + progress * RIPPLE_MAX_RADIUS;
          return (
            <circle
              key={r.id}
              cx={r.cx}
              cy={r.cy}
              r={radius}
              fill="none"
              stroke={RIPPLE_COLOR}
              strokeWidth={2.5 - 2 * progress}
              opacity={0.5 * (1 - progress)}
            />
          );
        })}
      </svg>
    </main>
  );
}