'use client';

import React, { useEffect, useRef, useState } from 'react';

const BALL_SIZE = 40;
const BALL_COLOR = '#FF3333';
const BG_COLOR = '#000000';
const INIT_VX = 4; // x方向の初期速度
const INIT_VY = 3; // y方向の初期速度

export default function Home() {
    // ウィンドウサイズ
    const [windowSize, setWindowSize] = useState({ width: 1920, height: 1080 });
    // ボールの状態
    const [ball, setBall] = useState({
        x: 960,
        y: 540,
        vx: INIT_VX,
        vy: INIT_VY,
    });

    // ウィンドウリサイズ監視
    useEffect(() => {
        const handleResize = () => {
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // ウィンドウサイズが変わったらボールが壁の外に出ないように補正
    useEffect(() => {
        setBall(prev => ({
            ...prev,
            x: Math.min(Math.max(prev.x, 0), windowSize.width - BALL_SIZE),
            y: Math.min(Math.max(prev.y, 0), windowSize.height - BALL_SIZE),
        }));
    }, [windowSize]);

    // アニメーション
    useEffect(() => {
        let animationId: number;

        const animate = () => {
            setBall(prev => {
                let { x, y, vx, vy } = prev;

                x += vx;
                y += vy;

                // 壁で跳ね返る
                if (x <= 0) {
                    x = 0;
                    vx = Math.abs(vx);
                } else if (x + BALL_SIZE >= windowSize.width) {
                    x = windowSize.width - BALL_SIZE;
                    vx = -Math.abs(vx);
                }
                if (y <= 0) {
                    y = 0;
                    vy = Math.abs(vy);
                } else if (y + BALL_SIZE >= windowSize.height) {
                    y = windowSize.height - BALL_SIZE;
                    vy = -Math.abs(vy);
                }

                return { x, y, vx, vy };
            });
            animationId = requestAnimationFrame(animate);
        };

        animationId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationId);
    }, [windowSize]);

    return (
        <main
            style={{
                width: '100vw',
                height: '100vh',
                background: BG_COLOR,
                overflow: 'hidden',
                position: 'fixed',
                top: 0,
                left: 0,
            }}
        >
            <div
                style={{
                    position: 'absolute',
                    left: ball.x,
                    top: ball.y,
                    width: BALL_SIZE,
                    height: BALL_SIZE,
                    borderRadius: '50%',
                    background: BALL_COLOR,
                    boxShadow: '0 0 16px 4px #ff333388',
                }}
            />
        </main>
    );
}