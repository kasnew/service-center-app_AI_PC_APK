import React, { useEffect, useState } from 'react';
import { Cpu, HardDrive, Thermometer, Activity } from 'lucide-react';
import { systemApi, SystemStats as ISystemStats } from '../api/system';
import { useTheme } from '../contexts/ThemeContext';

const MAX_HISTORY = 10;

const Sparkline: React.FC<{ data: number[]; color: string; max: number }> = ({ data, color, max }) => {
    const displayData = new Array(MAX_HISTORY).fill(0);
    const startIdx = MAX_HISTORY - data.length;
    for (let i = 0; i < data.length; i++) {
        displayData[startIdx + i] = data[i];
    }

    const width = 60;
    const height = 16;
    const points = displayData.map((v, i) => {
        const x = (i / (MAX_HISTORY - 1)) * width;
        const y = height - (v / (max || 100)) * height;
        return `${x},${y}`;
    }).join(' ');

    return (
        <div className="flex items-center">
            <svg width={width} height={height} className="overflow-visible">
                <polyline
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={points}
                    style={{ transition: 'all 0.4s ease-in-out' }}
                />
            </svg>
        </div>
    );
};

export const SystemStats: React.FC = () => {
    const { currentTheme } = useTheme();
    const [history, setHistory] = useState<ISystemStats[]>([]);
    const [current, setCurrent] = useState<ISystemStats | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            const stats = await systemApi.getStats();
            if (stats) {
                setCurrent(stats);
                setHistory(prev => {
                    const newHistory = [...prev, stats];
                    if (newHistory.length > MAX_HISTORY) return newHistory.slice(1);
                    return newHistory;
                });
            }
        };

        fetchStats();
        const interval = setInterval(fetchStats, 2000);
        return () => clearInterval(interval);
    }, []);

    if (!current) return null;

    const cpuHistory = history.map(h => h.cpuLoad);
    const memHistory = history.map(h => h.memPercent);

    const isLight = currentTheme.type === 'light';

    // Dynamic colors based on value and theme
    const getLoadColor = (l: number, defaultColor: string) => {
        if (l > 85) return '#ef4444';
        if (l > 60) return '#f59e0b';
        return defaultColor;
    };

    const labelStyle = { color: 'var(--theme-text-secondary)' };
    const containerStyle = {
        backgroundColor: isLight ? 'rgba(255, 255, 255, 0.5)' : 'rgba(15, 23, 42, 0.4)',
        borderColor: 'var(--theme-border)',
    };

    return (
        <div
            className="flex items-center gap-4 px-3 py-1 rounded-lg border backdrop-blur-md shadow-sm"
            style={containerStyle}
        >
            {/* CPU */}
            <div className="flex flex-col">
                <div className="flex items-center justify-between gap-2 px-0.5">
                    <div className="flex items-center gap-1 text-[9px] font-bold uppercase" style={labelStyle}>
                        <Cpu className="w-2.5 h-2.5" />
                        CPU
                    </div>
                    <span className="text-[10px] font-mono font-bold" style={{ color: isLight ? '#2563eb' : '#60a5fa' }}>
                        {current.cpuLoad}%
                    </span>
                </div>
                <Sparkline data={cpuHistory} color={getLoadColor(current.cpuLoad, isLight ? '#2563eb' : '#60a5fa')} max={100} />
            </div>

            <div className="w-px h-6 bg-slate-700/20" />

            {/* RAM */}
            <div className="flex flex-col">
                <div className="flex items-center justify-between gap-2 px-0.5">
                    <div className="flex items-center gap-1 text-[9px] font-bold uppercase" style={labelStyle}>
                        <Activity className="w-2.5 h-2.5" />
                        RAM
                    </div>
                    <span className="text-[10px] font-mono font-bold" style={{ color: isLight ? '#7c3aed' : '#c084fc' }}>
                        {current.memPercent}%
                    </span>
                </div>
                <Sparkline data={memHistory} color={isLight ? '#7c3aed' : '#c084fc'} max={100} />
            </div>

            <div className="w-px h-6 bg-slate-700/20" />

            {/* TEMP */}
            <div className="flex flex-col items-center justify-center min-w-[40px]">
                <div className="flex items-center gap-1 text-[9px] font-bold uppercase" style={labelStyle}>
                    <Thermometer className="w-2.5 h-2.5" />
                    TEMP
                </div>
                <span className="text-[10px] font-mono font-bold leading-tight" style={{ color: isLight ? '#d97706' : '#fb923c' }}>
                    {current.cpuTemp}°C
                </span>
            </div>

            <div className="w-px h-6 bg-slate-700/20" />

            {/* DISK */}
            <div className="flex flex-col items-center justify-center min-w-[40px]">
                <div className="flex items-center gap-1 text-[9px] font-bold uppercase" style={labelStyle}>
                    <HardDrive className="w-2.5 h-2.5" />
                    DISK
                </div>
                <span className="text-[10px] font-mono font-bold leading-tight" style={{ color: isLight ? '#065f46' : '#34d399' }}>
                    {current.diskPercent}%
                </span>

            </div>
        </div>
    );
};
