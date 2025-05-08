'use client';

import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

const BG_COLOR = '#1a1a1a';
const RIPPLE_COLOR = '#666666';
const RIPPLE_DURATION = 3000; // ms

// 固定サイズの定義
const VIEWPORT_WIDTH = 1920;
const VIEWPORT_HEIGHT = 1080;
const MAX_RADIUS = Math.min(VIEWPORT_WIDTH, VIEWPORT_HEIGHT) * 0.75;

// イージング関数
const easeOutQuad = (t: number) => 1 - (1 - t) * (1 - t);

type Ripple = {
  id: number;
  start: number;
};

// アニメーションコンポーネント
const AnimationComponent = () => {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const rippleId = useRef(0);
  const animationRef = useRef<number | undefined>(undefined);
  const isInitialized = useRef(false);

  // 初期化
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;
  }, []);

  // 波紋の生成とアニメーション
  useEffect(() => {
    if (!isInitialized.current) return;

    const spawnRipple = () => {
      setRipples(prev => [
        ...prev,
        { id: rippleId.current++, start: Date.now() },
      ]);
    };

    const animate = () => {
      const now = Date.now();
      setRipples(prev => {
        const aliveRipples = prev.filter(r => now - r.start < RIPPLE_DURATION);
        if (aliveRipples.length === 0) {
          spawnRipple();
        }
        return aliveRipples;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    // 最初の波紋を生成
    spawnRipple();
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  if (!isInitialized.current) return null;

  return (
    <svg
      viewBox={`0 0 ${VIEWPORT_WIDTH} ${VIEWPORT_HEIGHT}`}
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100dvh',
        background: 'none',
        zIndex: 0,
      }}
    >
      {/* 波紋 */}
      {ripples.map(r => {
        const progress = Math.min(
          (Date.now() - r.start) / RIPPLE_DURATION,
          1
        );
        const eased = easeOutQuad(progress);
        const radius = 10 + eased * MAX_RADIUS;
        let opacity = 0.5;
        if (progress > 0.9) {
          opacity = 0.5 * (1 - (progress - 0.9) / 0.1);
        }
        return (
          <circle
            key={r.id}
            cx={VIEWPORT_WIDTH / 2}
            cy={VIEWPORT_HEIGHT / 2}
            r={radius}
            fill="none"
            stroke={RIPPLE_COLOR}
            strokeWidth={2.5 - 2 * progress}
            opacity={opacity}
          />
        );
      })}
    </svg>
  );
};

// メインコンポーネント
const Home = () => {
  return (
    <main
      style={{
        width: '100vw',
        height: '100dvh',
        background: BG_COLOR,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          color: '#666666',
          fontSize: '12px',
          fontFamily: 'sans-serif',
          zIndex: 1,
        }}
      >
        Next.js - Vercel - github test
      </div>
      <AnimationComponent />
    </main>
  );
};

// クライアントサイドのみでレンダリング
export default dynamic(() => Promise.resolve(Home), { ssr: false });
