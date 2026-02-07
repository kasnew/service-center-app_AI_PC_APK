import { useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';

export function SpaceBackground() {
    const { cosmosEnabled, cosmosSpeed } = useTheme();
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!cosmosEnabled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let width: number;
        let height: number;

        const stars: Star[] = [];
        const starCount = 500;
        // Adjusted speed: 100% slider = old 10% speed (much slower)
        const speed = 0.001 + (cosmosSpeed / 100) * 0.009; // 0.001 to 0.01 (10x slower)

        // Star colors inspired by No Man's Sky
        const starColors = [
            'rgba(135, 206, 250, 1)',  // Sky blue
            'rgba(173, 216, 230, 1)',  // Light blue
            'rgba(147, 112, 219, 1)',  // Purple
            'rgba(255, 182, 193, 1)',  // Light pink
            'rgba(138, 43, 226, 1)',   // Blue violet
            'rgba(100, 149, 237, 1)',  // Cornflower blue
            'rgba(255, 255, 255, 1)',  // White
            'rgba(240, 248, 255, 1)',  // Alice blue
            'rgba(255, 218, 185, 1)',  // Peach
            'rgba(176, 224, 230, 1)',  // Powder blue
        ];

        class Star {
            x: number = 0;
            y: number = 0;
            z: number = 0;
            prevZ: number = 0;
            color: string;

            constructor() {
                this.color = starColors[Math.floor(Math.random() * starColors.length)];
                this.reset();
                this.z = Math.random() * width;
                this.prevZ = this.z;
            }

            reset() {
                this.x = (Math.random() - 0.5) * width * 2;
                this.y = (Math.random() - 0.5) * height * 2;
                this.z = width;
                this.prevZ = this.z;
            }

            update() {
                this.prevZ = this.z;
                this.z -= width * speed;
                if (this.z <= 0) {
                    this.reset();
                }
            }

            draw(ctx: CanvasRenderingContext2D) {
                const sx = (this.x / this.z) * width + width / 2;
                const sy = (this.y / this.z) * height + height / 2;

                const px = (this.x / this.prevZ) * width + width / 2;
                const py = (this.y / this.prevZ) * height + height / 2;

                const size = Math.max(1, (1 - this.z / width) * 3);
                const opacity = Math.min(1, (1 - this.z / width) * 1.5);

                // Trail line (shortened)
                ctx.beginPath();
                const trailColor = this.color.replace('1)', `${opacity * 0.3})`);
                ctx.strokeStyle = trailColor;
                ctx.lineWidth = size * 0.5;
                ctx.lineCap = 'round';
                ctx.moveTo(px, py);
                ctx.lineTo(sx, sy);
                ctx.stroke();

                // Main star point
                const starColor = this.color.replace('1)', `${opacity})`);
                ctx.fillStyle = starColor;
                ctx.beginPath();
                ctx.arc(sx, sy, size, 0, Math.PI * 2);
                ctx.fill();

                // Glow effect
                if (this.z < width * 0.3) {
                    ctx.fillStyle = this.color.replace('1)', `${opacity * 0.3})`);
                    ctx.beginPath();
                    ctx.arc(sx, sy, size * 2.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        const resize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;

            stars.length = 0;
            for (let i = 0; i < starCount; i++) {
                stars.push(new Star());
            }
        };

        const animate = () => {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'; // Trail effect
            ctx.fillRect(0, 0, width, height);

            stars.forEach(star => {
                star.update();
                star.draw(ctx);
            });

            animationFrameId = requestAnimationFrame(animate);
        };

        window.addEventListener('resize', resize);
        resize();
        animate();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, [cosmosEnabled, cosmosSpeed]);

    if (!cosmosEnabled) return null;

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none"
            style={{ filter: 'blur(0.5px)', zIndex: 1 }}
        />
    );
}
