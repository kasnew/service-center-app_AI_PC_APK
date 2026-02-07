import { useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface Fish {
    x: number;
    y: number;
    size: number;
    speed: number;
    ySpeed: number;
    color: string;
    flip: boolean;
    tailPhase: number;
    type: 'small' | 'medium' | 'large';
}

export function AquariumBackground() {
    const { aquariumEnabled, aquariumFishCount } = useTheme();
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!aquariumEnabled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let width = window.innerWidth;
        let height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;

        const fishes: Fish[] = [];

        // Fish colors inspired by real aquarium fish
        const fishColors = [
            'rgba(255, 140, 0, 0.9)',     // Orange (Clownfish)
            'rgba(65, 105, 225, 0.9)',    // Royal Blue (Tang)
            'rgba(255, 215, 0, 0.9)',     // Golden (Butterflyfish)
            'rgba(30, 144, 255, 0.9)',    // Dodger Blue
            'rgba(255, 69, 0, 0.9)',      // Red Orange (Goldfish)
            'rgba(72, 209, 204, 0.9)',    // Turquoise
            'rgba(138, 43, 226, 0.9)',    // Blue Violet
            'rgba(255, 182, 193, 0.9)',   // Light Pink
        ];

        // Initialize fish
        for (let i = 0; i < aquariumFishCount; i++) {
            const type = Math.random() > 0.7 ? 'large' : Math.random() > 0.4 ? 'medium' : 'small';
            const baseSize = type === 'large' ? 60 : type === 'medium' ? 35 : 20;

            fishes.push({
                x: Math.random() * width,
                y: Math.random() * (height - 100) + 50,
                size: baseSize + Math.random() * 20,
                speed: (Math.random() * 1.5 + 0.5) * (type === 'large' ? 0.6 : type === 'medium' ? 0.8 : 1),
                ySpeed: (Math.random() - 0.5) * 0.3,
                color: fishColors[Math.floor(Math.random() * fishColors.length)],
                flip: Math.random() > 0.5,
                tailPhase: Math.random() * Math.PI * 2,
                type
            });
        }

        // Draw a fish
        const drawFish = (fish: Fish) => {
            ctx.save();

            // Move to fish position
            ctx.translate(fish.x, fish.y);

            // Flip if needed
            if (fish.flip) {
                ctx.scale(-1, 1);
            }

            // Tail animation
            fish.tailPhase += 0.1;
            const tailWag = Math.sin(fish.tailPhase) * 5;

            // Body
            ctx.fillStyle = fish.color;
            ctx.beginPath();
            ctx.ellipse(0, 0, fish.size * 0.7, fish.size * 0.4, 0, 0, Math.PI * 2);
            ctx.fill();

            // Tail
            ctx.beginPath();
            ctx.moveTo(-fish.size * 0.7, 0);
            ctx.quadraticCurveTo(
                -fish.size * 0.9 + tailWag,
                -fish.size * 0.3,
                -fish.size * 1.1 + tailWag,
                0
            );
            ctx.quadraticCurveTo(
                -fish.size * 0.9 + tailWag,
                fish.size * 0.3,
                -fish.size * 0.7,
                0
            );
            ctx.fill();

            // Eye
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.beginPath();
            ctx.arc(fish.size * 0.4, -fish.size * 0.1, fish.size * 0.08, 0, Math.PI * 2);
            ctx.fill();

            // Eye highlight
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.beginPath();
            ctx.arc(fish.size * 0.42, -fish.size * 0.12, fish.size * 0.03, 0, Math.PI * 2);
            ctx.fill();

            // Fins
            ctx.fillStyle = fish.color.replace('0.9)', '0.7)');
            ctx.beginPath();
            ctx.ellipse(0, fish.size * 0.25, fish.size * 0.3, fish.size * 0.15, Math.PI / 4, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        };

        // Animation loop
        const animate = () => {
            // Semi-transparent background for trail effect
            ctx.fillStyle = 'rgba(0, 20, 40, 0.1)';
            ctx.fillRect(0, 0, width, height);

            // Draw bubbles occasionally
            if (Math.random() > 0.97) {
                const bubbleX = Math.random() * width;
                const bubbleY = height - 20;
                let bubbleSize = Math.random() * 3 + 2;
                let bubbleOpacity = 0.3;

                const drawBubble = () => {
                    ctx.fillStyle = `rgba(255, 255, 255, ${bubbleOpacity})`;
                    ctx.beginPath();
                    ctx.arc(bubbleX, bubbleY - (height - bubbleY), bubbleSize, 0, Math.PI * 2);
                    ctx.fill();
                };

                drawBubble();
            }

            // Update and draw fish
            fishes.forEach(fish => {
                // Move fish
                if (fish.flip) {
                    fish.x -= fish.speed;
                } else {
                    fish.x += fish.speed;
                }

                fish.y += fish.ySpeed;

                // Bounce off edges
                if (fish.x > width + fish.size) {
                    fish.x = -fish.size;
                } else if (fish.x < -fish.size) {
                    fish.x = width + fish.size;
                }

                // Bounce off top/bottom with some margin
                if (fish.y > height - 50 || fish.y < 50) {
                    fish.ySpeed *= -1;
                }

                // Random direction changes
                if (Math.random() > 0.995) {
                    fish.flip = !fish.flip;
                }

                if (Math.random() > 0.99) {
                    fish.ySpeed = (Math.random() - 0.5) * 0.5;
                }

                drawFish(fish);
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
    }, [aquariumEnabled, aquariumFishCount]);

    if (!aquariumEnabled) return null;

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none"
            style={{ zIndex: 1 }}
        />
    );
}
