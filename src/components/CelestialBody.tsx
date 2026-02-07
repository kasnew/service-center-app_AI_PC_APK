import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import fullMoonImg from '../assets/images/full_moon.png';
import crescentMoonImg from '../assets/images/crescent_moon.png';

export const CelestialBody: React.FC = () => {
    const {
        currentTheme, celestialEnabled, moonType, celestialSize,
        rainEnabled
    } = useTheme();

    if (!celestialEnabled) return null;

    const isDark = currentTheme.type === 'dark';
    const scale = (celestialSize / 100);

    return (
        <div
            className="fixed top-16 right-16 pointer-events-none transition-all duration-1000 ease-in-out no-print"
            style={{
                zIndex: 0,
                overflow: 'visible',
                opacity: celestialEnabled ? 1 : 0,
                filter: rainEnabled ? 'blur(15px) brightness(0.6)' : 'none',
                transform: celestialEnabled
                    ? `scale(${scale})`
                    : 'scale(0.5) translate(50%, -50%)',
                transformOrigin: 'top right',
                willChange: 'transform',
            }}
        >
            {isDark ? (
                /* Photographic Moon (Realism) */
                <div className="relative w-40 h-40 flex items-center justify-center">
                    {/* SVG Filter to perfectly isolate the moon from its black background */}
                    <svg className="absolute w-0 h-0 invisible">
                        <defs>
                            <filter id="remove-black-bg-moon" colorInterpolationFilters="sRGB">
                                <feColorMatrix type="matrix" values="
                                    1 0 0 0 0
                                    0 1 0 0 0
                                    0 0 1 0 0
                                    1.5 1.5 1.5 0 -0.4
                                " />
                                <feComponentTransfer>
                                    <feFuncA type="linear" slope="2" intercept="0" />
                                </feComponentTransfer>
                            </filter>
                        </defs>
                    </svg>

                    <img
                        src={moonType === 'full' ? fullMoonImg : crescentMoonImg}
                        alt="Moon"
                        className="w-full h-full object-contain"
                        style={{ filter: 'url(#remove-black-bg-moon) brightness(1.1) contrast(1.1)' }}
                    />

                    {/* Subtle Lunar Glow */}
                    <div className="absolute inset-8 rounded-full blur-[40px] bg-white/10 -z-10" />
                </div>
            ) : (
                /* Programmatic "Earth Style" Sun (as requested - liked the original) */
                <div className="relative w-32 h-32 group" style={{ overflow: 'visible' }}>
                    {/* Large Atmospheric Scattering (Lens Flare effect) */}
                    <div
                        className="absolute inset-[-80px] rounded-full blur-[100px] opacity-40 transition-all duration-1000"
                        style={{ backgroundColor: '#fef3c7' }}
                    />

                    {/* Main Corona Glow */}
                    <div
                        className="absolute inset-[-30px] rounded-full blur-3xl opacity-60 animate-pulse transition-all duration-1000"
                        style={{ backgroundColor: '#fbbf24' }}
                    />

                    {/* Inner Brilliance */}
                    <div
                        className="absolute inset-[-10px] rounded-full blur-xl opacity-90"
                        style={{ backgroundColor: '#fff7ed' }}
                    />

                    {/* Outer Shadow Wrapper (to keep shadow from being clipped by inner overflow-hidden) */}
                    <div className="absolute inset-0 rounded-full shadow-[0_0_80px_rgba(251,191,36,0.5)] border border-white/20" />

                    {/* Sun Disc with clipped contents */}
                    <div
                        className="relative w-full h-full rounded-full bg-gradient-to-tr from-[#fff7ed] via-[#fde68a] to-[#fbbf24] transition-all duration-1000 overflow-hidden"
                    >
                        {/* Brighter Core */}
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,#ffffff_0%,transparent_70%)] opacity-80" />

                        {/* Subtle Surface shimmering */}
                        <div className="absolute inset-0 opacity-10 mix-blend-soft-light animate-[spin_60s_linear_infinite]"
                            style={{ background: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'2\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }}
                        />
                    </div>

                    {/* Elegant Solar Rays */}
                    <div className="absolute inset-[-40%] animate-[spin_120s_linear_infinite] opacity-30" style={{ overflow: 'visible' }}>
                        {[...Array(12)].map((_, i) => (
                            <div
                                key={i}
                                className="absolute top-1/2 left-1/2 w-[1px] h-[160%] bg-gradient-to-b from-transparent via-yellow-200 to-transparent -translate-x-1/2 -translate-y-1/2 blur-[2px]"
                                style={{ transform: `translate(-50%, -50%) rotate(${i * 30}deg)` }}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
