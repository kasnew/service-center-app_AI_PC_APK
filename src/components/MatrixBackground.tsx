import React, { useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';

export const MatrixBackground: React.FC = () => {
    const { matrixEnabled, matrixSpeed, matrixBrightness } = useTheme();
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!matrixEnabled || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = canvas.width = window.innerWidth;
        let height = canvas.height = window.innerHeight;

        const characters = 'ｦｱｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const fontSize = 16;
        const columns = Math.floor(width / fontSize);
        const drops: number[] = new Array(columns).fill(1);

        const draw = () => {
            // Semi-transparent fade effect
            // We use a small alpha to keep previous frames visible for a moment
            ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.fillRect(0, 0, width, height);

            ctx.fillStyle = '#00ff41'; // Pure matrix green
            ctx.font = `${fontSize}px monospace`;

            for (let i = 0; i < drops.length; i++) {
                const text = characters.charAt(Math.floor(Math.random() * characters.length));
                ctx.fillText(text, i * fontSize, drops[i] * fontSize);

                if (drops[i] * fontSize > height && Math.random() > 0.975) {
                    drops[i] = 0;
                }
                drops[i]++;
            }
        };

        const interval = setInterval(draw, matrixSpeed);

        const handleResize = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            // Recalculate columns if needed on resize
            const newColumns = Math.floor(width / fontSize);
            if (newColumns > drops.length) {
                const add = newColumns - drops.length;
                for (let i = 0; i < add; i++) drops.push(Math.random() * height / fontSize);
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            clearInterval(interval);
            window.removeEventListener('resize', handleResize);
        };
    }, [matrixEnabled, matrixSpeed]);

    if (!matrixEnabled) return null;

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none no-print"
            style={{
                zIndex: 1, // Above celestial body, below content
                opacity: matrixBrightness,
                backgroundColor: 'transparent'
            }}
        />
    );
};
