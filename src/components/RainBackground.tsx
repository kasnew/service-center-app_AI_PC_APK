import React, { useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface Drop {
    x: number;
    y: number;
    len: number;
    speed: number;
    opacity: number;
}

interface RainBackgroundProps {
    showForeground?: boolean;
}

export const RainBackground: React.FC<RainBackgroundProps> = ({ showForeground = false }) => {
    const { rainEnabled, rainIntensity, rainSpeed, currentTheme } = useTheme();
    const bgCanvasRef = useRef<HTMLCanvasElement>(null);
    const fgCanvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!rainEnabled) return;

        const bgCanvas = bgCanvasRef.current;
        const fgCanvas = fgCanvasRef.current;
        if (!bgCanvas) return;

        const bgCtx = bgCanvas.getContext('2d');
        const fgCtx = fgCanvas?.getContext('2d');
        if (!bgCtx) return;

        let animationFrameId: number;
        let bgDrops: Drop[] = [];
        let fgDrops: Drop[] = [];

        const resize = () => {
            bgCanvas.width = window.innerWidth;
            bgCanvas.height = window.innerHeight;
            if (fgCanvas) {
                fgCanvas.width = window.innerWidth;
                fgCanvas.height = window.innerHeight;
            }
            initDrops();
        };

        const initDrops = () => {
            bgDrops = [];
            fgDrops = [];

            // Background drops (85% of total)
            const bgCount = Math.floor(rainIntensity * 1.7);
            for (let i = 0; i < bgCount; i++) {
                bgDrops.push({
                    x: Math.random() * bgCanvas.width,
                    y: Math.random() * bgCanvas.height,
                    len: Math.random() * 20 + 10,
                    speed: (Math.random() * 10 + 15) * (rainSpeed / 10),
                    opacity: Math.random() * 0.25 + 0.05
                });
            }

            // Foreground drops (15% of total, larger and faster)
            if (showForeground) {
                const fgCount = Math.floor(rainIntensity * 0.3);
                for (let i = 0; i < fgCount; i++) {
                    fgDrops.push({
                        x: Math.random() * bgCanvas.width,
                        y: Math.random() * bgCanvas.height,
                        len: Math.random() * 30 + 30, // Much longer
                        speed: (Math.random() * 15 + 25) * (rainSpeed / 10), // Faster
                        opacity: Math.random() * 0.15 + 0.05 // More subtle since they are big
                    });
                }
            }
        };

        const draw = () => {
            bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
            if (fgCtx && fgCanvas) fgCtx.clearRect(0, 0, fgCanvas.width, fgCanvas.height);

            const isDark = currentTheme.type === 'dark';
            const baseColor = isDark ? '174, 194, 224' : '71, 85, 105';

            // Draw Background
            bgCtx.lineWidth = 1;
            bgCtx.lineCap = 'round';
            bgDrops.forEach(drop => {
                bgCtx.beginPath();
                bgCtx.strokeStyle = `rgba(${baseColor}, ${drop.opacity * 2})`;
                bgCtx.moveTo(drop.x, drop.y);
                bgCtx.lineTo(drop.x + (drop.speed * 0.08), drop.y + drop.len);
                bgCtx.stroke();
                drop.y += drop.speed;
                drop.x += (drop.speed * 0.08);
                if (drop.y > bgCanvas.height) {
                    drop.y = -drop.len;
                    drop.x = Math.random() * (bgCanvas.width + 50) - 25;
                }
            });

            // Draw Foreground
            if (fgCtx && fgCanvas) {
                fgCtx.lineWidth = 2.5; // Thicker
                fgCtx.lineCap = 'round';
                fgDrops.forEach(drop => {
                    fgCtx.beginPath();
                    fgCtx.strokeStyle = `rgba(${baseColor}, ${drop.opacity})`;
                    fgCtx.moveTo(drop.x, drop.y);
                    fgCtx.lineTo(drop.x + (drop.speed * 0.12), drop.y + drop.len);
                    fgCtx.stroke();
                    drop.y += drop.speed;
                    drop.x += (drop.speed * 0.12);
                    if (drop.y > fgCanvas.height) {
                        drop.y = -drop.len;
                        drop.x = Math.random() * (fgCanvas.width + 100) - 50;
                    }
                });
            }

            animationFrameId = requestAnimationFrame(draw);
        };

        window.addEventListener('resize', resize);
        resize();
        draw();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, [rainEnabled, rainIntensity, rainSpeed, currentTheme, showForeground]);

    if (!rainEnabled) return null;

    return (
        <>
            {/* Background Layer */}
            <canvas
                ref={bgCanvasRef}
                className="fixed inset-0 pointer-events-none no-print"
                style={{ zIndex: 3 }}
            />
            {/* Foreground Layer */}
            {showForeground && (
                <canvas
                    ref={fgCanvasRef}
                    className="fixed inset-0 pointer-events-none no-print"
                    style={{ zIndex: 50 }}
                />
            )}
        </>
    );
};
