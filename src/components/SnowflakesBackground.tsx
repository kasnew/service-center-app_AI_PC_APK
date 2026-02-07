import React, { useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface Snowflake {
    x: number;
    y: number;
    size: number;
    speed: number;
    opacity: number;
    wind: number;
}

export const SnowflakesBackground: React.FC = () => {
    const { snowflakesEnabled, snowflakesSpeed, snowflakesCount, snowflakesBrightness } = useTheme();
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!snowflakesEnabled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let flakes: Snowflake[] = [];

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            initFlakes();
        };

        const initFlakes = () => {
            flakes = [];
            for (let i = 0; i < snowflakesCount; i++) {
                flakes.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    size: Math.random() * 3 + 1,
                    speed: (Math.random() * 1 + 0.5) * (snowflakesSpeed / 5),
                    opacity: Math.random() * 0.5 + 0.3,
                    wind: Math.random() * 0.5 - 0.25
                });
            }
        };

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = `rgba(255, 255, 255, ${snowflakesBrightness})`;

            flakes.forEach(flake => {
                ctx.beginPath();
                ctx.arc(flake.x, flake.y, flake.size, 0, Math.PI * 2);
                ctx.globalAlpha = flake.opacity;
                ctx.fill();

                flake.y += flake.speed;
                flake.x += flake.wind;

                if (flake.y > canvas.height) {
                    flake.y = -flake.size;
                    flake.x = Math.random() * canvas.width;
                }
                if (flake.x > canvas.width) flake.x = 0;
                if (flake.x < 0) flake.x = canvas.width;
            });

            animationFrameId = requestAnimationFrame(draw);
        };

        window.addEventListener('resize', resize);
        resize();
        draw();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, [snowflakesEnabled, snowflakesSpeed, snowflakesCount, snowflakesBrightness]);

    if (!snowflakesEnabled) return null;

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none no-print"
            style={{ zIndex: 2 }}
        />
    );
};
