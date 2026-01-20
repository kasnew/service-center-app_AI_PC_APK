import React, { useState, useEffect } from 'react';
import { useNavigate, NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Banknote, Settings } from 'lucide-react';
import { clsx } from 'clsx';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { syncApi } from '../api/sync';
import { useTheme } from '../contexts/ThemeContext';
import { SystemStats } from './SystemStats';
import { ShutdownTimer } from './ShutdownTimer';
import { useHotkeys } from '../hooks/useHotkeys';
import { UpdateNotification } from './UpdateNotification';
import { useUpdate } from '../contexts/UpdateContext';
import { RefreshCw, AlertCircle } from 'lucide-react';

export const Layout: React.FC = () => {
    const { currentTheme } = useTheme();
    const { updateResult, isChecking, checkUpdates } = useUpdate();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [isToggling, setIsToggling] = useState(false);

    // Global drag and drop prevention
    useEffect(() => {
        const preventDefault = (e: Event) => e.preventDefault();
        const handleDragStart = (e: DragEvent) => {
            const target = e.target as HTMLElement;
            if (target && target.closest && !target.closest('[draggable="true"]')) {
                e.preventDefault();
                e.stopPropagation();
            }
        };

        window.addEventListener('dragover', preventDefault, false);
        window.addEventListener('dragenter', preventDefault, false);
        window.addEventListener('drop', preventDefault, false);
        window.addEventListener('dragstart', handleDragStart, false);

        // Prevent ghosting images
        const preventImageDrag = (e: MouseEvent) => {
            if ((e.target as HTMLElement).tagName === 'IMG') {
                e.preventDefault();
            }
        };
        window.addEventListener('mousedown', preventImageDrag, false);

        return () => {
            window.removeEventListener('dragover', preventDefault);
            window.removeEventListener('dragenter', preventDefault);
            window.removeEventListener('drop', preventDefault);
            window.removeEventListener('dragstart', handleDragStart);
            window.removeEventListener('mousedown', preventImageDrag);
        };
    }, []);

    // Listen for executor web changes for instant refresh
    useEffect(() => {
        const handleExecutorDataChanged = (_event: any, data: any) => {
            console.log('Executor data changed:', data);
            // Instantly invalidate repairs cache when executor makes a change
            queryClient.invalidateQueries({ queryKey: ['repairs'] });
            queryClient.invalidateQueries({ queryKey: ['status-counts'] });
        };

        window.ipcRenderer.on('executor-data-changed', handleExecutorDataChanged);

        return () => {
            window.ipcRenderer.off('executor-data-changed', handleExecutorDataChanged);
        };
    }, [queryClient]);

    // Global Hotkeys
    useHotkeys('ctrl+n', () => {
        navigate('/repair/new');
    });

    useHotkeys('ctrl+f', () => {
        navigate('/');
        // The Dashboard component's own useHotkeys('ctrl+f') will handle the focus
    });

    // Check sync server status
    const { data: syncStatus } = useQuery({
        queryKey: ['sync-server-status'],
        queryFn: () => syncApi.getStatus(),
        refetchInterval: 2000, // Check every 2 seconds
    });

    // Check executor web server status
    const { data: executorWebStatus } = useQuery({
        queryKey: ['executor-web-server-status'],
        queryFn: () => window.ipcRenderer.invoke('executor-web-server-status'),
        refetchInterval: 5000,
    });

    const isServerRunning = syncStatus?.running ?? false;
    const activeConnections = syncStatus?.activeConnections ?? 0;
    const executorWebRunning = executorWebStatus?.running ?? false;
    const executorWebPort = executorWebStatus?.port ?? 3001;
    const executorWebIp = executorWebStatus?.ipAddresses?.[0] ?? 'localhost';

    // Mutation for starting server
    const startMutation = useMutation({
        mutationFn: () => syncApi.start(3000),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sync-server-status'] });
            setIsToggling(false);
        },
        onError: () => {
            setIsToggling(false);
        },
    });

    // Mutation for stopping server
    const stopMutation = useMutation({
        mutationFn: () => syncApi.stop(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sync-server-status'] });
            setIsToggling(false);
        },
        onError: () => {
            setIsToggling(false);
        },
    });

    const handleToggleServer = async () => {
        if (isToggling) return;

        setIsToggling(true);
        if (isServerRunning) {
            stopMutation.mutate();
        } else {
            startMutation.mutate();
        }
    };

    return (
        <div
            className="flex flex-col h-screen"
            style={{
                backgroundColor: 'var(--theme-bg)',
                color: 'var(--theme-text)',
            }}
        >
            {/* Main Content */}
            <main className={clsx(
                "flex-1 overflow-hidden flex flex-col transition-all duration-500",
                currentTheme.id === 'cyberpunk' && "rgb-border"
            )}>
                {/* Navigation Tabs Bar with Connection Status */}
                <div
                    className="flex items-center justify-between px-6 py-3 border-b gap-4"
                    style={{
                        backgroundColor: 'var(--theme-surface)',
                        borderColor: 'var(--theme-border)',
                    }}
                >
                    <div className="flex items-center gap-6">
                        <nav className="flex items-center gap-2">
                            <NavLink
                                to="/"
                                draggable="false"
                                className={({ isActive }) =>
                                    clsx(
                                        'flex items-center gap-3 px-5 py-2.5 rounded-xl transition-all duration-300 text-sm font-semibold tracking-wide',
                                        isActive
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 translate-y-[-1px]'
                                            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-700/40 hover:translate-y-[-1px]'
                                    )
                                }
                            >
                                <LayoutDashboard className="w-5 h-5" />
                                Ремонти
                            </NavLink>
                            <NavLink
                                to="/inventory"
                                draggable="false"
                                className={({ isActive }) =>
                                    clsx(
                                        'flex items-center gap-3 px-5 py-2.5 rounded-xl transition-all duration-300 text-sm font-semibold tracking-wide',
                                        isActive
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 translate-y-[-1px]'
                                            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-700/40 hover:translate-y-[-1px]'
                                    )
                                }
                            >
                                <ShoppingCart className="w-5 h-5" />
                                Товари
                            </NavLink>
                            <NavLink
                                to="/cash-register"
                                draggable="false"
                                className={({ isActive }) =>
                                    clsx(
                                        'flex items-center gap-3 px-5 py-2.5 rounded-xl transition-all duration-300 text-sm font-semibold tracking-wide',
                                        isActive
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 translate-y-[-1px]'
                                            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-700/40 hover:translate-y-[-1px]'
                                    )
                                }
                            >
                                <Banknote className="w-5 h-5" />
                                Каса
                            </NavLink>
                            <NavLink
                                to="/settings"
                                draggable="false"
                                className={({ isActive }) =>
                                    clsx(
                                        'flex items-center gap-3 px-5 py-2.5 rounded-xl transition-all duration-300 text-sm font-semibold tracking-wide',
                                        isActive
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 translate-y-[-1px]'
                                            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-700/40 hover:translate-y-[-1px]'
                                    )
                                }
                            >
                                <Settings className="w-5 h-5" />
                                Налаштування
                            </NavLink>
                        </nav>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Shutdown Timer */}
                        <ShutdownTimer />

                        {/* System Stats Indicators */}
                        <div className="hidden lg:block">
                            <SystemStats />
                        </div>

                        {/* Connection status toggle */}
                        <button
                            onClick={handleToggleServer}
                            disabled={isToggling}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all duration-200 disabled:opacity-50"
                            style={{
                                backgroundColor: isServerRunning ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                border: `1px solid ${isServerRunning ? '#10b981' : '#ef4444'}`,
                                cursor: isToggling ? 'wait' : 'pointer',
                            }}
                            onMouseEnter={(e) => {
                                if (!isToggling) {
                                    e.currentTarget.style.backgroundColor = isServerRunning
                                        ? 'rgba(16, 185, 129, 0.2)'
                                        : 'rgba(239, 68, 68, 0.2)';
                                    e.currentTarget.style.transform = 'scale(1.05)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = isServerRunning
                                    ? 'rgba(16, 185, 129, 0.1)'
                                    : 'rgba(239, 68, 68, 0.1)';
                                e.currentTarget.style.transform = 'scale(1)';
                            }}
                            title={
                                isToggling
                                    ? 'Перемикання...'
                                    : isServerRunning
                                        ? `Натисніть, щоб зупинити сервер синхронізації. Активних підключень: ${activeConnections}`
                                        : 'Натисніть, щоб запустити сервер синхронізації'
                            }
                        >
                            <div
                                className="w-2 h-2 rounded-full"
                                style={{
                                    backgroundColor: isServerRunning ? '#10b981' : '#ef4444',
                                    boxShadow: isServerRunning
                                        ? '0 0 6px rgba(16, 185, 129, 0.6)'
                                        : '0 0 6px rgba(239, 68, 68, 0.6)',
                                }}
                            />
                            {isServerRunning && (
                                <span
                                    className="text-xs font-semibold"
                                    style={{
                                        color: isServerRunning ? '#10b981' : '#ef4444',
                                    }}
                                >
                                    {activeConnections}
                                </span>
                            )}
                        </button>

                        {/* Executor Web Link */}
                        {executorWebRunning && (
                            <button
                                onClick={() => {
                                    const url = `http://${executorWebIp}:${executorWebPort}`;
                                    navigator.clipboard.writeText(url);
                                }}
                                className="flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors cursor-pointer"
                                style={{
                                    color: '#818cf8',
                                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                                    border: '1px solid rgba(99, 102, 241, 0.3)',
                                }}
                                title="Натисніть щоб скопіювати адресу"
                            >
                                🌐 {executorWebIp}:{executorWebPort}
                            </button>
                        )}

                        <div className="h-6 w-px bg-slate-700 mx-2" />

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => checkUpdates()}
                                disabled={isChecking}
                                className={`group relative flex items-center gap-2 px-2 py-1 rounded-md transition-all
                                    ${updateResult?.hasUpdate
                                        ? 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20'
                                        : 'text-slate-500 hover:bg-slate-700/50 hover:text-slate-300'}`}
                                title={updateResult?.hasUpdate ? `Доступна версія ${updateResult.latestVersion}! Натисніть для перевірки.` : "Перевірити оновлення"}
                            >
                                <span className="text-[10px] font-mono leading-none">
                                    {(() => {
                                        const now = new Date();
                                        const start = new Date(now.getFullYear(), 0, 0);
                                        const diff = (now.getTime() - start.getTime()) + ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000);
                                        const oneDay = 1000 * 60 * 60 * 24;
                                        const dayOfYear = Math.floor(diff / oneDay);
                                        const minutesSinceStartOfDay = now.getHours() * 60 + now.getMinutes();
                                        return `v.${now.getFullYear()}.${dayOfYear}.${minutesSinceStartOfDay}`;
                                    })()}
                                </span>

                                {isChecking ? (
                                    <RefreshCw className="w-3 h-3 animate-spin opacity-50" />
                                ) : updateResult?.hasUpdate ? (
                                    <div className="relative">
                                        <AlertCircle className="w-3 h-3 text-orange-400 animate-pulse" />
                                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-slate-900 shadow-sm shadow-red-500/50" />
                                    </div>
                                ) : null}
                            </button>
                            <button
                                onClick={() => window.close()}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium"
                                style={{
                                    color: '#f87171',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                                    e.currentTarget.style.color = '#fca5a5';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    e.currentTarget.style.color = '#f87171';
                                }}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                                Вихід
                            </button>
                        </div>
                    </div>
                </div>
                <div className="flex-1 overflow-hidden">
                    <Outlet />
                </div>
            </main>

            {/* Update notification toast */}
            <UpdateNotification />
        </div>
    );
};
