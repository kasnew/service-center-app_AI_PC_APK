import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

export const StormySky: React.FC = () => {
    const { rainEnabled, lightningEnabled, lightningFrequency, lightningIntensity } = useTheme();

    const [isFlash, setIsFlash] = React.useState(false);

    React.useEffect(() => {
        if (!rainEnabled || !lightningEnabled) {
            setIsFlash(false);
            return;
        }

        let flashTimeout: NodeJS.Timeout;
        const triggerFlash = () => {
            if (Math.random() * 1000 < (lightningFrequency / 10)) {
                setIsFlash(true);
                // Flash duration: quick burst with occasional double flash
                const duration = Math.random() * 150 + 50;
                setTimeout(() => {
                    setIsFlash(false);
                    // 30% chance of double flash
                    if (Math.random() < 0.3) {
                        setTimeout(() => {
                            setIsFlash(true);
                            setTimeout(() => setIsFlash(false), 80);
                        }, 100);
                    }
                }, duration);
            }
            flashTimeout = setTimeout(triggerFlash, 100);
        };

        triggerFlash();
        return () => clearTimeout(flashTimeout);
    }, [rainEnabled, lightningEnabled, lightningFrequency]);

    if (!rainEnabled) return null;

    return (
        <>
            {/* BACKGROUND LAYER: Sky Gradient & Distant Glow */}
            <div
                className="fixed top-0 left-0 right-0 pointer-events-none no-print transition-opacity duration-1000"
                style={{
                    zIndex: 2,
                    height: '250px',
                }}
            >
                {/* Stormy Sky Gradient */}
                <div
                    className="absolute inset-0 transition-opacity duration-1000"
                    style={{
                        background: `linear-gradient(to bottom, 
                            rgba(71, 85, 105, 0.45) 0%,
                            rgba(71, 85, 105, 0.3) 50%,
                            rgba(71, 85, 105, 0.1) 80%,
                            transparent 100%
                        )`,
                    }}
                />

                {/* Distant Atmospheric Flash */}
                {isFlash && (
                    <div
                        className="absolute inset-0 transition-opacity duration-75"
                        style={{
                            background: `linear-gradient(to bottom, 
                                rgba(255, 255, 255, ${lightningIntensity * 0.4}) 0%,
                                rgba(224, 231, 255, ${lightningIntensity * 0.25}) 40%,
                                transparent 100%
                            )`,
                            opacity: 0.8
                        }}
                    />
                )}
            </div>

            {/* FOREGROUND LAYER: Electrical Discharges (SVG Bolts) */}
            {isFlash && (
                <div
                    className="fixed inset-0 pointer-events-none no-print"
                    style={{ zIndex: 70 }} // Higher than rain foreground (50) and sky (2)
                >
                    <svg className="w-full h-full overflow-visible">
                        <defs>
                            <filter id="lightning-glow">
                                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                                <feMerge>
                                    <feMergeNode in="coloredBlur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>

                        {/* Main Bolt */}
                        {(() => {
                            const x = 20 + Math.random() * 60; // 20-80% of width
                            const segments = 8;
                            let points = ` ${x}%,0`;
                            let currentX = x;
                            for (let i = 1; i <= segments; i++) {
                                currentX += (Math.random() * 10 - 5);
                                points += ` ${currentX}%,${(i / segments) * 100}%`;
                            }
                            return (
                                <polyline
                                    points={points}
                                    fill="none"
                                    stroke="white"
                                    strokeWidth="3.5"
                                    filter="url(#lightning-glow)"
                                    style={{
                                        opacity: lightningIntensity + 0.3,
                                        strokeDasharray: '0',
                                        strokeLinecap: 'round',
                                        strokeLinejoin: 'round'
                                    }}
                                />
                            );
                        })()}

                        {/* Secondary Branch */}
                        {Math.random() > 0.4 && (() => {
                            const startX = 30 + Math.random() * 40;
                            const startY = 20 + Math.random() * 30;
                            let points = ` ${startX}%,${startY}%`;
                            let currentX = startX;
                            for (let i = 1; i <= 4; i++) {
                                currentX += (Math.random() * 15 - 7.5);
                                points += ` ${currentX}%,${startY + (i * 10)}%`;
                            }
                            return (
                                <polyline
                                    points={points}
                                    fill="none"
                                    stroke="rgba(199, 210, 254, 0.8)"
                                    strokeWidth="1.5"
                                    filter="url(#lightning-glow)"
                                    style={{ opacity: lightningIntensity }}
                                />
                            );
                        })()}
                    </svg>

                    {/* Screening Flash */}
                    <div
                        className="absolute inset-0 bg-white/5 mix-blend-overlay pointer-events-none"
                        style={{ opacity: lightningIntensity * 0.4 }}
                    />
                </div>
            )}
        </>
    );
};
