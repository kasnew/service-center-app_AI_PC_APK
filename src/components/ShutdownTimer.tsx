import React, { useEffect, useState, useMemo } from 'react';
import { Power, Clock, Timer } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi, ShutdownSettings } from '../api/settings';
import { clsx } from 'clsx';

export const ShutdownTimer: React.FC = () => {
    const queryClient = useQueryClient();
    const [now, setNow] = useState(new Date());

    // Fetch shutdown settings
    const { data: settings } = useQuery({
        queryKey: ['shutdown-settings'],
        queryFn: () => settingsApi.getShutdownSettings(),
    });

    const updateMutation = useMutation({
        mutationFn: (updates: Partial<ShutdownSettings>) => settingsApi.updateShutdownSettings(updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shutdown-settings'] });
        },
    });

    const performShutdownMutation = useMutation({
        mutationFn: () => settingsApi.performShutdown(),
    });

    // Calculate time remaining
    const timeRemaining = useMemo(() => {
        if (!settings?.enabled || !settings.time) return null;

        const [targetH, targetM] = settings.time.split(':').map(Number);
        const targetDate = new Date(now);
        targetDate.setHours(targetH, targetM, 0, 0);

        // If target time is earlier today, it's for tomorrow (though we only care about today's run)
        if (targetDate.getTime() < now.getTime()) {
            targetDate.setDate(targetDate.getDate() + 1);
        }

        const diffRoot = targetDate.getTime() - now.getTime();
        const diffHours = Math.floor(diffRoot / (1000 * 60 * 60));
        const diffMins = Math.floor((diffRoot % (1000 * 60 * 60)) / (1000 * 60));
        const diffSecs = Math.floor((diffRoot % (1000 * 60)) / 1000);

        return { hours: diffHours, mins: diffMins, secs: diffSecs, totalMs: diffRoot };
    }, [settings, now]);

    // Clock effect
    useEffect(() => {
        const timer = setInterval(() => {
            const currentNow = new Date();
            setNow(currentNow);

            // Check if it's shutdown time (exactly zero seconds)
            if (settings?.enabled && settings.time) {
                const [targetHours, targetMinutes] = settings.time.split(':').map(Number);
                if (currentNow.getHours() === targetHours && currentNow.getMinutes() === targetMinutes && currentNow.getSeconds() === 0) {
                    console.log('Shutdown time reached!');
                    performShutdownMutation.mutate();
                }
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [settings]);

    if (!settings) return null;

    return (
        <div className={clsx(
            "flex items-center gap-4 px-4 py-2 rounded-xl transition-all duration-300 border shadow-sm",
            settings.enabled
                ? "bg-slate-800/60 border-blue-500/30 shadow-blue-900/10"
                : "bg-slate-800/30 border-slate-700/50 grayscale opacity-70"
        )}>
            {/* Status & Toggle */}
            <div className="flex items-center gap-3">
                <button
                    onClick={() => updateMutation.mutate({ enabled: !settings.enabled })}
                    className={clsx(
                        "p-2 rounded-lg transition-all duration-300 transform hover:scale-105 active:scale-95",
                        settings.enabled
                            ? "bg-gradient-to-br from-red-500/20 to-orange-500/20 text-red-400 border border-red-500/30 shadow-lg shadow-red-900/20"
                            : "bg-slate-700/50 text-slate-500 border border-slate-600/50"
                    )}
                    title={settings.enabled ? "Вимкнути автозавершення" : "Увімкнути автозавершення"}
                >
                    <Power className={clsx("w-5 h-5", settings.enabled && "animate-pulse")} />
                </button>

                <div className="flex flex-col">
                    <span className={clsx(
                        "text-[10px] font-bold uppercase tracking-widest leading-none mb-1",
                        settings.enabled ? "text-blue-400" : "text-slate-500"
                    )}>
                        Авто-вимкнення
                    </span>
                    <div className="flex items-center gap-2">
                        <Clock className={clsx("w-4 h-4", settings.enabled ? "text-slate-200" : "text-slate-500")} />
                        <input
                            type="time"
                            value={settings.time || '21:00'}
                            onChange={(e) => updateMutation.mutate({ time: e.target.value })}
                            disabled={!settings.enabled}
                            className={clsx(
                                "bg-transparent border-none p-0 text-lg font-bold focus:ring-0 w-24 transition-colors leading-none",
                                settings.enabled ? "text-white" : "text-slate-500 cursor-not-allowed"
                            )}
                        />
                    </div>
                </div>
            </div>

            {/* Time Remaining Indicator */}
            {settings.enabled && timeRemaining && (
                <div className="hidden lg:flex flex-col border-l border-slate-700/50 pl-4 min-w-[100px]">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-1">
                        <Timer className="w-3 h-3" /> залишилось
                    </span>
                    <div className="text-sm font-mono font-medium text-blue-400 flex items-baseline gap-1">
                        {timeRemaining.totalMs < 3600000 ? (
                            <>
                                <span className="text-lg font-bold">{timeRemaining.mins}</span>
                                <span className="text-[10px] text-slate-500 uppercase">хв</span>
                                <span className="text-lg font-bold ml-1">{timeRemaining.secs.toString().padStart(2, '0')}</span>
                                <span className="text-[10px] text-slate-500 uppercase">с</span>
                            </>
                        ) : (
                            <>
                                <span className="text-lg font-bold">{timeRemaining.hours}</span>
                                <span className="text-[10px] text-slate-500 uppercase">год</span>
                                <span className="text-lg font-bold ml-1">{timeRemaining.mins.toString().padStart(2, '0')}</span>
                                <span className="text-[10px] text-slate-500 uppercase">хв</span>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

