'use client';

import React, { useEffect, useRef, useState } from 'react';

const BG_COLOR = '#1a1a1a';
const RIPPLE_COLOR = '#666666';
const RIPPLE_DURATION = 4200; // ms
const DOT_SPEED = 4; // ドットの移動速度
const DOT_LIFETIME = 120; // フレーム数（2秒程度）

// 固定サイズの定義
const VIEWPORT_WIDTH = 1920;
const VIEWPORT_HEIGHT = 1080;
const MAX_RADIUS = Math.min(VIEWPORT_WIDTH, VIEWPORT_HEIGHT) * 0.75;

// 乱数生成のためのユーティリティ関数
const getRandomPosition = () => {
  // より均一な分布を得るために、中心からの距離を考慮
  const angle = Math.random() * Math.PI * 2;
  const distance = Math.sqrt(Math.random()) * (MAX_RADIUS * 0.8);
  const x = VIEWPORT_WIDTH / 2 + Math.cos(angle) * distance;
  const y = VIEWPORT_HEIGHT / 2 + Math.sin(angle) * distance;
  return { x, y };
};

type Ripple = {
  id: number;
  cx: number;
  cy: number;
  start: number;
};

type Dot = { x: number; y: number; vx: number; vy: number; life: number };

type MovingLine = {
  id: number;
  x: number;
  y: number;
  direction: 1 | -1;
  speed: number;
  hitCircles: Set<number>;
};

const ClientComponent = () => {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [dots, setDots] = useState<Dot[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [fadeOpacity, setFadeOpacity] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const rippleId = useRef(0);
  const crossedPairs = useRef<Set<string>>(new Set());
  const [lines, setLines] = useState<MovingLine[]>([]);
  const lineId = useRef(0);
  const animationRef = useRef<number | undefined>(undefined);

  // 0〜1のprogressを、easeOutQuadで変換
  const easeOutQuad = (t: number) => 1 - (1 - t) * (1 - t);
  const easeInOutQuad = (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

  // コンポーネントの初期化
  useEffect(() => {
    setIsInitialized(true);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // 表示/非表示の切り替え
  useEffect(() => {
    if (!isInitialized) return;

    let timeoutId: NodeJS.Timeout;
    let fadeAnimationFrameId: number;
    let startTime: number;

    const fadeOut = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / 6000, 1);
      const easedProgress = easeInOutQuad(progress);
      const newOpacity = 1 - easedProgress;

      if (progress < 1) {
        setFadeOpacity(newOpacity);
        fadeAnimationFrameId = requestAnimationFrame(fadeOut);
      } else {
        setFadeOpacity(0);
        setIsVisible(false);
      }
    };

    const fadeIn = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / 6000, 1);
      const easedProgress = easeInOutQuad(progress);
      const newOpacity = easedProgress;

      if (progress < 1) {
        setFadeOpacity(newOpacity);
        fadeAnimationFrameId = requestAnimationFrame(fadeIn);
      } else {
        setFadeOpacity(1);
      }
    };

    const toggleVisibility = () => {
      if (isVisible) {
        startTime = Date.now();
        fadeOut();
        timeoutId = setTimeout(toggleVisibility, 10000);
      } else {
        setIsVisible(true);
        startTime = Date.now();
        fadeIn();
        timeoutId = setTimeout(toggleVisibility, 10000);
      }
    };

    timeoutId = setTimeout(() => {
      setIsVisible(true);
      startTime = Date.now();
      fadeIn();
      timeoutId = setTimeout(toggleVisibility, 10000);
    }, 3000);

    return () => {
      clearTimeout(timeoutId);
      cancelAnimationFrame(fadeAnimationFrameId);
    };
  }, [isVisible, isInitialized]);

  // 波紋の生成
  useEffect(() => {
    if (!isInitialized) return;

    let timeoutId: NodeJS.Timeout;

    const spawnRipple = () => {
      const { x, y } = getRandomPosition();
      setRipples(prev => [
        ...prev,
        { id: rippleId.current++, cx: x, cy: y, start: Date.now() },
      ]);
      const nextInterval = 167 + Math.random() * 833;
      timeoutId = setTimeout(spawnRipple, nextInterval);
    };

    spawnRipple();
    return () => clearTimeout(timeoutId);
  }, [isInitialized]);

  // 波紋のアニメーション＋交差判定
  useEffect(() => {
    if (!isInitialized) return;
    crossedPairs.current = new Set();

    const animate = () => {
      setRipples(prevRipples => {
        const now = Date.now();
        const aliveRipples = prevRipples.filter(r => now - r.start < RIPPLE_DURATION);

        const newDots: Dot[] = [];
        const newRipples: Ripple[] = [];
        for (let i = 0; i < aliveRipples.length; i++) {
          for (let j = i + 1; j < aliveRipples.length; j++) {
            const a = aliveRipples[i];
            const b = aliveRipples[j];
            const progressA = Math.min((now - a.start) / RIPPLE_DURATION, 1);
            const progressB = Math.min((now - b.start) / RIPPLE_DURATION, 1);
            const rA = 10 + easeOutQuad(progressA) * MAX_RADIUS;
            const rB = 10 + easeOutQuad(progressB) * MAX_RADIUS;
            const dx = b.cx - a.cx;
            const dy = b.cy - a.cy;
            const d = Math.hypot(dx, dy);

            if (d > 0 && d < rA + rB && d > Math.abs(rA - rB)) {
              const pairId = [a.id, b.id].sort().join('-');
              if (!crossedPairs.current.has(pairId)) {
                crossedPairs.current.add(pairId);

                const a_ = (rA * rA - rB * rB + d * d) / (2 * d);
                const h = Math.sqrt(Math.max(0, rA * rA - a_ * a_));
                const xm = a.cx + (a_ * dx) / d;
                const ym = a.cy + (a_ * dy) / d;
                const rx = -(dy * (h / d));
                const ry = dx * (h / d);

                const centerX = VIEWPORT_WIDTH / 2;
                const centerY = VIEWPORT_HEIGHT / 2;
                [ { x: xm + rx, y: ym + ry }, { x: xm - rx, y: ym - ry } ].forEach(dot => {
                  const dirX = dot.x - centerX;
                  const dirY = dot.y - centerY;
                  const len = Math.hypot(dirX, dirY) || 1;
                  const vx = (dirX / len) * DOT_SPEED;
                  const vy = (dirY / len) * DOT_SPEED;
                  newDots.push({ x: dot.x, y: dot.y, vx, vy, life: DOT_LIFETIME });
                });

                newRipples.push(
                  { id: rippleId.current++, cx: xm + rx, cy: ym + ry, start: now },
                  { id: rippleId.current++, cx: xm - rx, cy: ym - ry, start: now }
                );
              }
            }
          }
        }
        setDots(prev => [...prev, ...newDots].slice(-300));
        return [...aliveRipples, ...newRipples].slice(-50);
      });

      setDots(prev =>
        prev
          .map(dot => ({
            ...dot,
            x: dot.x + dot.vx,
            y: dot.y + dot.vy,
            life: dot.life - 1,
          }))
          .filter(
            dot =>
              dot.life > 0 &&
              dot.x >= -10 &&
              dot.x <= VIEWPORT_WIDTH + 10 &&
              dot.y >= -10 &&
              dot.y <= VIEWPORT_HEIGHT + 10
          )
      );

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isInitialized]);

  // 直線の生成
  useEffect(() => {
    if (!isInitialized) return;

    let timeoutId: NodeJS.Timeout;
    const spawnLine = () => {
      const x = Math.random() * VIEWPORT_WIDTH;
      const direction = Math.random() < 0.5 ? 1 : -1;
      const y = direction === 1 ? -10 : VIEWPORT_HEIGHT + 10;
      const speed = 1 + Math.random() * 2;
      setLines(prev => [
        ...prev,
        { id: lineId.current++, x, y, direction, speed, hitCircles: new Set() },
      ]);
      timeoutId = setTimeout(spawnLine, (1500 + Math.random() * 2000) / 3);
    };
    spawnLine();
    return () => clearTimeout(timeoutId);
  }, [isInitialized]);

  // 直線のアニメーション
  useEffect(() => {
    if (!isInitialized) return;

    let raf: number;
    const animate = () => {
      setLines(prev =>
        prev
          .map(line => {
            const newY = line.y + line.speed * line.direction;
            if (line.direction === 1 && newY > VIEWPORT_HEIGHT + 10) return null;
            if (line.direction === -1 && newY < -10) return null;

            const now = Date.now();
            ripples.forEach(r => {
              const progress = Math.min((now - r.start) / RIPPLE_DURATION, 1);
              const eased = easeOutQuad(progress);
              const radius = 10 + eased * MAX_RADIUS;
              
              const lineHeadY = line.direction === 1 ? newY + 200 : newY;
              const dx = line.x - r.cx;
              const dy = lineHeadY - r.cy;
              const distance = Math.sqrt(dx * dx + dy * dy);
              
              if (distance <= radius && !line.hitCircles.has(r.id)) {
                const centerX = VIEWPORT_WIDTH / 2;
                const centerY = VIEWPORT_HEIGHT / 2;
                const dirX = line.x - centerX;
                const dirY = lineHeadY - centerY;
                const len = Math.hypot(dirX, dirY) || 1;
                const vx = (dirX / len) * DOT_SPEED;
                const vy = (dirY / len) * DOT_SPEED;
                
                setDots(prev => [
                  ...prev,
                  { x: line.x, y: lineHeadY, vx, vy, life: DOT_LIFETIME }
                ].slice(-300));

                line.hitCircles.add(r.id);
              }
            });

            return { ...line, y: newY };
          })
          .filter(Boolean) as MovingLine[]
      );
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [ripples, isInitialized]);

  if (!isInitialized) {
    return null;
  }

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
        {isVisible && lines.map(line => (
          <g key={line.id}>
            <line
              x1={line.x}
              y1={line.y}
              x2={line.x}
              y2={line.y + 200}
              stroke="#666666"
              strokeWidth={2}
              opacity={0.5 * fadeOpacity}
            />
          </g>
        ))}
        {isVisible && ripples.map(r => {
          const progress = Math.min(
            (Date.now() - r.start) / RIPPLE_DURATION,
            1
          );
          const eased = 1 - (1 - progress) * (1 - progress);
          const radius = 10 + eased * MAX_RADIUS;
          let opacity = 0.5;
          if (progress > 0.9) {
            opacity = 0.5 * (1 - (progress - 0.9) / 0.1);
          }
          return (
            <circle
              key={r.id}
              cx={r.cx}
              cy={r.cy}
              r={radius}
              fill="none"
              stroke={RIPPLE_COLOR}
              strokeWidth={2.5 - 2 * progress}
              opacity={opacity * fadeOpacity}
            />
          );
        })}
        {dots.map((dot, i) => (
          <circle
            key={i}
            cx={dot.x}
            cy={dot.y}
            r={1.5}
            fill="#ffffff"
            opacity={0.7}
          />
        ))}
      </svg>
    </main>
  );
};

export default ClientComponent; 