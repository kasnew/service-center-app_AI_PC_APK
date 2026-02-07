import { useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';

export function DNAHelixBackground() {
    const { dnaEnabled, dnaSpeed } = useTheme();
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!dnaEnabled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let width = window.innerWidth;
        let height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;

        let rotation = 0;

        const centerX = width / 2;
        const radius = 150;
        const helixHeight = height;
        const pointsPerStrand = 100;

        const animate = () => {
            ctx.fillStyle = 'rgba(0, 0, 10, 0.1)';
            ctx.fillRect(0, 0, width, height);

            rotation += 0.005 * (dnaSpeed / 100);

            // Draw DNA double helix
            for (let i = 0; i < pointsPerStrand; i++) {
                const y = (i / pointsPerStrand) * helixHeight;
                const angle = (i / pointsPerStrand) * Math.PI * 8 + rotation;

                // First strand
                const x1 = centerX + Math.cos(angle) * radius;
                const z1 = Math.sin(angle) * radius;

                // Second strand (opposite side)
                const x2 = centerX + Math.cos(angle + Math.PI) * radius;
                const z2 = Math.sin(angle + Math.PI) * radius;

                // Calculate size based on depth (z position)
                const size1 = 3 + z1 / radius * 2;
                const size2 = 3 + z2 / radius * 2;

                // Draw strand 1
                ctx.save();
                ctx.globalAlpha = 0.7 + z1 / radius * 0.3;
                const gradient1 = ctx.createRadialGradient(x1, y, 0, x1, y, size1 * 3);
                gradient1.addColorStop(0, '#00ffff');
                gradient1.addColorStop(0.5, '#0088ff');
                gradient1.addColorStop(1, 'rgba(0, 136, 255, 0)');
                ctx.fillStyle = gradient1;
                ctx.beginPath();
                ctx.arc(x1, y, size1 * 3, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#00ffff';
                ctx.beginPath();
                ctx.arc(x1, y, size1, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();

                // Draw strand 2
                ctx.save();
                ctx.globalAlpha = 0.7 + z2 / radius * 0.3;
                const gradient2 = ctx.createRadialGradient(x2, y, 0, x2, y, size2 * 3);
                gradient2.addColorStop(0, '#ff00ff');
                gradient2.addColorStop(0.5, '#ff0088');
                gradient2.addColorStop(1, 'rgba(255, 0, 136, 0)');
                ctx.fillStyle = gradient2;
                ctx.beginPath();
                ctx.arc(x2, y, size2 * 3, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#ff00ff';
                ctx.beginPath();
                ctx.arc(x2, y, size2, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();

                // Draw base pairs (connections)
                if (i % 5 === 0) {
                    ctx.save();
                    ctx.globalAlpha = 0.3;
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(x1, y);
                    ctx.lineTo(x2, y);
                    ctx.stroke();
                    ctx.restore();
                }
            }

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
    }, [dnaEnabled, dnaSpeed]);

    if (!dnaEnabled) return null;

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none"
            style={{ zIndex: 1 }}
        />
    );
}
