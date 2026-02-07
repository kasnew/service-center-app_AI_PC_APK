import { useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    opacity: number;
    color: string;
}

export function ParticlesBackground() {
    const { particlesEnabled, particlesCount } = useTheme();
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!particlesEnabled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let width = window.innerWidth;
        let height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;

        const particles: Particle[] = [];

        const colors = [
            'rgba(147, 197, 253, ',  // Blue
            'rgba(196, 181, 253, ',  // Purple
            'rgba(252, 165, 165, ',  // Pink
            'rgba(134, 239, 172, ',  // Green
            'rgba(253, 224, 71, ',   // Yellow
        ];

        // Initialize particles
        for (let i = 0; i < particlesCount; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                size: Math.random() * 4 + 2,
                opacity: Math.random() * 0.5 + 0.3,
                color: colors[Math.floor(Math.random() * colors.length)]
            });
        }

        const animate = () => {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.fillRect(0, 0, width, height);

            particles.forEach((particle, i) => {
                // Update position
                particle.x += particle.vx;
                particle.y += particle.vy;

                // Wrap around edges
                if (particle.x < 0) particle.x = width;
                if (particle.x > width) particle.x = 0;
                if (particle.y < 0) particle.y = height;
                if (particle.y > height) particle.y = 0;

                // Pulsating effect
                const pulse = Math.sin(Date.now() * 0.001 + i) * 0.2 + 0.8;

                // Draw particle with glow
                ctx.save();
                ctx.globalAlpha = particle.opacity * pulse;

                // Glow
                const gradient = ctx.createRadialGradient(
                    particle.x, particle.y, 0,
                    particle.x, particle.y, particle.size * 3
                );
                gradient.addColorStop(0, particle.color + '0.8)');
                gradient.addColorStop(0.5, particle.color + '0.3)');
                gradient.addColorStop(1, particle.color + '0)');

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size * 3, 0, Math.PI * 2);
                ctx.fill();

                // Core
                ctx.fillStyle = particle.color + '1)';
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();

                // Draw connections to nearby particles
                particles.forEach((otherParticle, j) => {
                    if (i >= j) return;

                    const dx = particle.x - otherParticle.x;
                    const dy = particle.y - otherParticle.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < 150) {
                        ctx.save();
                        ctx.globalAlpha = (1 - distance / 150) * 0.2;
                        ctx.strokeStyle = particle.color + '0.5)';
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(particle.x, particle.y);
                        ctx.lineTo(otherParticle.x, otherParticle.y);
                        ctx.stroke();
                        ctx.restore();
                    }
                });
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
    }, [particlesEnabled, particlesCount]);

    if (!particlesEnabled) return null;

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none"
            style={{ zIndex: 1 }}
        />
    );
}
