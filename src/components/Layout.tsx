import React, { useState, useEffect } from 'react';
import { useNavigate, NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Banknote, Settings, X, AlertTriangle, Globe } from 'lucide-react';
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
import { warehouseApi } from '../api/warehouse';

export const Layout: React.FC = () => {
    const { currentTheme } = useTheme();
    const { updateResult, isChecking, checkUpdates, manualCheckResult } = useUpdate();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [isToggling, setIsToggling] = useState(false);
    const [showDeficitModal, setShowDeficitModal] = useState(false);

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

    useHotkeys('escape', () => {
        if (showDeficitModal) {
            setShowDeficitModal(false);
        }
    });

    // Fetch warehouse deficit count
    const { data: deficitCount = 0 } = useQuery({
        queryKey: ['warehouse-deficit-count'],
        queryFn: () => warehouseApi.getWarehouseDeficitCount(),
        refetchInterval: 30000, // Refresh every 30 seconds
    });

    // Fetch warehouse deficit list (only when modal is open)
    const { data: deficitList = [] } = useQuery({
        queryKey: ['warehouse-deficit-list'],
        queryFn: () => warehouseApi.getWarehouseDeficitList(),
        enabled: showDeficitModal,
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
        <div className="flex flex-col h-screen bg-main-layout">
            {/* Main Content */}
            <main className={clsx(
                "flex-1 overflow-hidden flex flex-col transition-all duration-500",
                currentTheme.id === 'cyberpunk' && "rgb-border"
            )}>
                {/* Navigation Tabs Bar with Connection Status */}
                <div
                    className="flex items-center justify-between px-6 py-3 border-b gap-4 no-print"
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
                                <span className="flex-1">Товари</span>
                            </NavLink>
                            {deficitCount > 0 && (
                                <button
                                    onClick={() => setShowDeficitModal(true)}
                                    className="flex items-center justify-center min-w-[20px] h-6 px-2 text-[11px] font-black text-white bg-red-500 rounded-full animate-pulse shadow-lg shadow-red-500/50 hover:bg-red-400 hover:scale-110 transition-all cursor-pointer -ml-2"
                                    title="Показати товари для дозамовлення"
                                >
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    {deficitCount}
                                </button>
                            )}
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
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-200 disabled:opacity-50 h-10"
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
                                className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs transition-colors cursor-pointer h-10"
                                style={{
                                    color: '#818cf8',
                                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                                    border: '1px solid rgba(99, 102, 241, 0.3)',
                                }}
                                title="Натисніть щоб скопіювати адресу"
                            >
                                <Globe className="w-3.5 h-3.5" />
                                {executorWebIp}:{executorWebPort}
                            </button>
                        )}

                        <div className="h-8 w-px bg-slate-700/50 mx-1" />

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => checkUpdates(true)}
                                disabled={isChecking}
                                className={`group relative flex items-center gap-2 px-3 py-1 rounded-lg transition-all h-10
                                    ${updateResult?.hasUpdate
                                        ? 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20'
                                        : manualCheckResult === 'no-update'
                                            ? 'bg-green-500/10 text-green-400'
                                            : manualCheckResult === 'error'
                                                ? 'bg-red-500/10 text-red-400'
                                                : 'text-slate-500 hover:bg-slate-700/50 hover:text-slate-300'}`}
                                title={
                                    updateResult?.hasUpdate
                                        ? `Доступна версія ${updateResult.latestVersion}! Натисніть для перевірки.`
                                        : manualCheckResult === 'no-update'
                                            ? 'У вас найновіша версія!'
                                            : manualCheckResult === 'error'
                                                ? `Помилка перевірки: ${updateResult?.error || 'Не вдалося з\'єднатися з сервером'}`
                                                : "Перевірити оновлення"
                                }
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
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin opacity-50" />
                                ) : updateResult?.hasUpdate ? (
                                    <div className="relative">
                                        <AlertCircle className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
                                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-slate-900 shadow-sm shadow-red-500/50" />
                                    </div>
                                ) : manualCheckResult === 'no-update' ? (
                                    <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                ) : manualCheckResult === 'error' ? (
                                    <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                                ) : null}
                            </button>
                            <button
                                onClick={() => window.close()}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium h-10 text-red-400 hover:bg-red-500/10"
                                title="Завершити роботу"
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

            {/* Deficit Modal */}
            {showDeficitModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-600/50 w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-4 border-b border-slate-600/50 bg-gradient-to-r from-red-900/30 to-orange-900/20">
                            <div className="flex items-center gap-3">
                                <AlertTriangle className="w-6 h-6 text-red-400" />
                                <h2 className="text-lg font-bold text-slate-100">Товари для дозамовлення</h2>
                                <span className="px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">
                                    {deficitList.length}
                                </span>
                            </div>
                            <button
                                onClick={() => setShowDeficitModal(false)}
                                className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-100 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-4">
                            {deficitList.length === 0 ? (
                                <div className="text-center text-slate-400 py-8">
                                    Усі товари в достатній кількості
                                </div>
                            ) : (
                                <table className="w-full">
                                    <thead className="text-xs text-slate-400 uppercase tracking-wider sticky top-0 bg-slate-800">
                                        <tr>
                                            <th className="text-left py-2 px-3">Код</th>
                                            <th className="text-left py-2 px-3">Назва</th>
                                            <th className="text-center py-2 px-3">Є</th>
                                            <th className="text-center py-2 px-3">Мін.</th>
                                            <th className="text-center py-2 px-3">Дозамовити</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700/50">
                                        {deficitList.map((item, index) => (
                                            <tr
                                                key={item.productCode}
                                                className={clsx(
                                                    "hover:bg-slate-700/30 transition-colors",
                                                    index % 2 === 0 ? "bg-slate-800/50" : ""
                                                )}
                                            >
                                                <td className="py-3 px-3 text-sm font-mono text-blue-400">
                                                    {item.productCode}
                                                </td>
                                                <td className="py-3 px-3 text-sm text-slate-200 max-w-[300px] truncate" title={item.name}>
                                                    {item.name}
                                                </td>
                                                <td className="py-3 px-3 text-sm text-center text-red-400 font-bold">
                                                    {item.currentQty}
                                                </td>
                                                <td className="py-3 px-3 text-sm text-center text-slate-400">
                                                    {item.minQty}
                                                </td>
                                                <td className="py-3 px-3 text-center">
                                                    <span className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-bold bg-red-500/20 text-red-400 rounded-full border border-red-500/30">
                                                        +{item.deficit}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        <div className="p-4 border-t border-slate-600/50 flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setShowDeficitModal(false);
                                    navigate('/inventory');
                                }}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
                            >
                                Перейти на склад
                            </button>
                            <button
                                onClick={() => setShowDeficitModal(false)}
                                className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg font-medium transition-colors"
                            >
                                Закрити
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
