import { useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface Firefly {
    x: number;
    y: number;
    vx: number;
    vy: number;
    brightness: number;
    brightnessSpeed: number;
    size: number;
}

export function FirefliesBackground() {
    const { firefliesEnabled, firefliesCount } = useTheme();
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!firefliesEnabled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let width = window.innerWidth;
        let height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;

        const fireflies: Firefly[] = [];

        // Initialize fireflies
        for (let i = 0; i < firefliesCount; i++) {
            fireflies.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                brightness: Math.random(),
                brightnessSpeed: 0.01 + Math.random() * 0.02,
                size: Math.random() * 2 + 1.5
            });
        }

        const animate = () => {
            // Dark background
            ctx.fillStyle = 'rgba(5, 10, 20, 0.1)';
            ctx.fillRect(0, 0, width, height);

            fireflies.forEach((firefly) => {
                // Update position with gentle floating
                firefly.x += firefly.vx;
                firefly.y += firefly.vy;

                // Random direction changes
                if (Math.random() > 0.98) {
                    firefly.vx += (Math.random() - 0.5) * 0.1;
                    firefly.vy += (Math.random() - 0.5) * 0.1;

                    // Limit speed
                    const speed = Math.sqrt(firefly.vx ** 2 + firefly.vy ** 2);
                    if (speed > 0.5) {
                        firefly.vx = (firefly.vx / speed) * 0.5;
                        firefly.vy = (firefly.vy / speed) * 0.5;
                    }
                }

                // Wrap around edges
                if (firefly.x < 0) firefly.x = width;
                if (firefly.x > width) firefly.x = 0;
                if (firefly.y < 0) firefly.y = height;
                if (firefly.y > height) firefly.y = 0;

                // Update brightness (pulsating)
                firefly.brightness += firefly.brightnessSpeed;
                if (firefly.brightness > 1 || firefly.brightness < 0) {
                    firefly.brightnessSpeed *= -1;
                }

                // Calculate opacity with smooth pulsing
                const opacity = Math.sin(firefly.brightness * Math.PI) * 0.8 + 0.2;

                // Draw glow
                ctx.save();
                ctx.globalAlpha = opacity * 0.4;

                const glowGradient = ctx.createRadialGradient(
                    firefly.x, firefly.y, 0,
                    firefly.x, firefly.y, firefly.size * 8
                );
                glowGradient.addColorStop(0, 'rgba(255, 220, 100, 1)');
                glowGradient.addColorStop(0.3, 'rgba(255, 180, 50, 0.6)');
                glowGradient.addColorStop(1, 'rgba(255, 160, 0, 0)');

                ctx.fillStyle = glowGradient;
                ctx.beginPath();
                ctx.arc(firefly.x, firefly.y, firefly.size * 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();

                // Draw core
                ctx.save();
                ctx.globalAlpha = opacity;

                const coreGradient = ctx.createRadialGradient(
                    firefly.x, firefly.y, 0,
                    firefly.x, firefly.y, firefly.size * 2
                );
                coreGradient.addColorStop(0, 'rgba(255, 255, 200, 1)');
                coreGradient.addColorStop(0.5, 'rgba(255, 220, 100, 0.8)');
                coreGradient.addColorStop(1, 'rgba(255, 180, 50, 0)');

                ctx.fillStyle = coreGradient;
                ctx.beginPath();
                ctx.arc(firefly.x, firefly.y, firefly.size * 2, 0, Math.PI * 2);
                ctx.fill();

                // Bright center
                ctx.fillStyle = 'rgba(255, 255, 255, ' + opacity + ')';
                ctx.beginPath();
                ctx.arc(firefly.x, firefly.y, firefly.size, 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();
            });

            animationFrameId = requestAnimationFrame(animate);
        };

        const handleResize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
        };

        window.addEventListener('resize', handleResize);
        animate();

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
        };
    }, [firefliesEnabled, firefliesCount]);

    if (!firefliesEnabled) return null;

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none"
            style={{ zIndex: 1 }}
        />
    );
}
