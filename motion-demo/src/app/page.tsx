'use client';

import React, { useEffect, useRef, useState } from 'react';

const BG_COLOR = '#1a1a1a';
const RIPPLE_COLOR = '#666666';
const RIPPLE_DURATION = 4200; // ms

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
  direction: 1 | -1; // 1: 下向き, -1: 上向き
  speed: number;
  hitCircles: Set<number>; // 衝突済みの波紋IDを記録
};

const DOT_SPEED = 4; // ドットの移動速度
const DOT_LIFETIME = 120; // フレーム数（2秒程度）

export default function Home() {
  // svgSizeの初期値はHDサイズ
  const [svgSize, setSvgSize] = useState({ width: 1920, height: 1080 });
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [dots, setDots] = useState<Dot[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [fadeOpacity, setFadeOpacity] = useState(0);
  const rippleId = useRef(0);
  const maxRadius = Math.min(svgSize.width, svgSize.height) * 0.75;
  const crossedPairs = useRef<Set<string>>(new Set());
  const [lines, setLines] = useState<MovingLine[]>([]);
  const lineId = useRef(0);

  // クライアントマウント後のみwindow参照
  useEffect(() => {
    const updateSize = () => {
      setSvgSize({
        width: Math.min(window.innerWidth, 1920),
        height: Math.min(window.innerHeight, 1080),
      });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // 0〜1のprogressを、easeOutQuadで変換
  const easeOutQuad = (t: number) => 1 - (1 - t) * (1 - t);
  const easeInOutQuad = (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

  // 表示/非表示の切り替え
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let fadeAnimationFrameId: number;
    let startTime: number;

    // フェードアウト
    const fadeOut = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / 6000, 1); // 6秒
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

    // フェードイン
    const fadeIn = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / 6000, 1); // 6秒
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
        timeoutId = setTimeout(toggleVisibility, 10000); // 10秒後に表示
      } else {
        setIsVisible(true);
        startTime = Date.now();
        fadeIn();
        timeoutId = setTimeout(toggleVisibility, 10000); // 10秒後に非表示
      }
    };

    // 3秒後に最初の表示を開始
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
  }, [isVisible]);

  // 波紋を画面内のランダムな位置に発生（間隔もランダム）
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const spawnRipple = () => {
      const cx = Math.random() * svgSize.width;
      const cy = Math.random() * svgSize.height;
      setRipples(prev => [
        ...prev,
        { id: rippleId.current++, cx, cy, start: Date.now() },
      ]);
      const nextInterval = 167 + Math.random() * 833;
      timeoutId = setTimeout(spawnRipple, nextInterval);
    };

    spawnRipple();
    return () => clearTimeout(timeoutId);
  }, [svgSize.width, svgSize.height]);

  // 波紋のアニメーション＋交差判定
  useEffect(() => {
    let raf: number;
    crossedPairs.current = new Set();

    const animate = () => {
      setRipples(prevRipples => {
        const now = Date.now();
        const aliveRipples = prevRipples.filter(r => now - r.start < RIPPLE_DURATION);

        // 交差判定とドット・波紋生成
        const newDots: Dot[] = [];
        const newRipples: Ripple[] = [];
        for (let i = 0; i < aliveRipples.length; i++) {
          for (let j = i + 1; j < aliveRipples.length; j++) {
            const a = aliveRipples[i];
            const b = aliveRipples[j];
            const progressA = Math.min((now - a.start) / RIPPLE_DURATION, 1);
            const progressB = Math.min((now - b.start) / RIPPLE_DURATION, 1);
            const rA = 10 + easeOutQuad(progressA) * maxRadius;
            const rB = 10 + easeOutQuad(progressB) * maxRadius;
            const dx = b.cx - a.cx;
            const dy = b.cy - a.cy;
            const d = Math.hypot(dx, dy);

            if (d > 0 && d < rA + rB && d > Math.abs(rA - rB)) {
              const pairId = [a.id, b.id].sort().join('-');
              if (!crossedPairs.current.has(pairId)) {
                crossedPairs.current.add(pairId);

                // 交点計算
                const a_ = (rA * rA - rB * rB + d * d) / (2 * d);
                const h = Math.sqrt(Math.max(0, rA * rA - a_ * a_));
                const xm = a.cx + (a_ * dx) / d;
                const ym = a.cy + (a_ * dy) / d;
                const rx = -(dy * (h / d));
                const ry = dx * (h / d);

                // 2つの交点
                const centerX = svgSize.width / 2;
                const centerY = svgSize.height / 2;
                [ { x: xm + rx, y: ym + ry }, { x: xm - rx, y: ym - ry } ].forEach(dot => {
                  // 方向ベクトルを正規化
                  const dirX = dot.x - centerX;
                  const dirY = dot.y - centerY;
                  const len = Math.hypot(dirX, dirY) || 1;
                  const vx = (dirX / len) * DOT_SPEED;
                  const vy = (dirY / len) * DOT_SPEED;
                  newDots.push({ x: dot.x, y: dot.y, vx, vy, life: DOT_LIFETIME });
                });

                // 交点から新しい波紋を発生
                newRipples.push(
                  { id: rippleId.current++, cx: xm + rx, cy: ym + ry, start: now },
                  { id: rippleId.current++, cx: xm - rx, cy: ym - ry, start: now }
                );
              }
            }
          }
        }
        // ドットを追加
        setDots(prev => [...prev, ...newDots].slice(-300));
        // 新しい波紋も追加（最大50個まで）
        return [...aliveRipples, ...newRipples].slice(-50);
      });

      // ドットの移動・寿命管理
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
              dot.x <= svgSize.width + 10 &&
              dot.y >= -10 &&
              dot.y <= svgSize.height + 10
          )
      );

      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [maxRadius]);

  // 直線を一定間隔で追加
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const spawnLine = () => {
      const x = Math.random() * svgSize.width;
      const direction = Math.random() < 0.5 ? 1 : -1;
      const y = direction === 1 ? -10 : svgSize.height + 10;
      const speed = 1 + Math.random() * 2;
      setLines(prev => [
        ...prev,
        { id: lineId.current++, x, y, direction, speed, hitCircles: new Set() },
      ]);
      timeoutId = setTimeout(spawnLine, 1500 + Math.random() * 2000);
    };
    spawnLine();
    return () => clearTimeout(timeoutId);
  }, [svgSize.width, svgSize.height]);

  // 直線のアニメーション
  useEffect(() => {
    let raf: number;
    const animate = () => {
      setLines(prev =>
        prev
          .map(line => {
            const newY = line.y + line.speed * line.direction;
            // 画面を横切ったら消す
            if (line.direction === 1 && newY > svgSize.height + 10) return null;
            if (line.direction === -1 && newY < -10) return null;

            // 波紋との衝突判定
            const now = Date.now();
            ripples.forEach(r => {
              const progress = Math.min((now - r.start) / RIPPLE_DURATION, 1);
              const eased = easeOutQuad(progress);
              const radius = 10 + eased * maxRadius;
              
              // ラインの先頭の座標
              const lineHeadY = line.direction === 1 ? newY + 200 : newY;
              
              // 衝突判定（円と点の距離）
              const dx = line.x - r.cx;
              const dy = lineHeadY - r.cy;
              const distance = Math.sqrt(dx * dx + dy * dy);
              
              if (distance <= radius && !line.hitCircles.has(r.id)) {
                // 初回衝突時にドットを生成
                const centerX = svgSize.width / 2;
                const centerY = svgSize.height / 2;
                
                // 方向ベクトルを正規化
                const dirX = line.x - centerX;
                const dirY = lineHeadY - centerY;
                const len = Math.hypot(dirX, dirY) || 1;
                const vx = (dirX / len) * DOT_SPEED;
                const vy = (dirY / len) * DOT_SPEED;
                
                setDots(prev => [
                  ...prev,
                  { x: line.x, y: lineHeadY, vx, vy, life: DOT_LIFETIME }
                ].slice(-300));

                // 衝突済みとして記録
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
  }, [ripples, maxRadius]);

  return (
    <main
      style={{
        width: '100vw',
        height: '100vh',
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
        width={svgSize.width}
        height={svgSize.height}
        viewBox={`0 0 ${svgSize.width} ${svgSize.height}`}
        style={{
          display: 'block',
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'none',
        }}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* 垂直移動する直線 */}
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
        {/* 波紋のみ */}
        {isVisible && ripples.map(r => {
          const progress = Math.min(
            (Date.now() - r.start) / RIPPLE_DURATION,
            1
          );
          const eased = 1 - (1 - progress) * (1 - progress);
          const radius = 10 + eased * maxRadius;
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
        {/* 交点ドット */}
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
}