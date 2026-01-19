import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Wrench, ShoppingCart, Banknote, Settings } from 'lucide-react';
import { clsx } from 'clsx';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { syncApi } from '../api/sync';

export const Layout: React.FC = () => {
    const queryClient = useQueryClient();
    const [isToggling, setIsToggling] = useState(false);

    // Check sync server status
    const { data: syncStatus } = useQuery({
        queryKey: ['sync-server-status'],
        queryFn: () => syncApi.getStatus(),
        refetchInterval: 2000, // Check every 2 seconds
    });

    const isServerRunning = syncStatus?.running ?? false;
    const activeConnections = syncStatus?.activeConnections ?? 0;

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
            className="flex h-screen"
            style={{
                backgroundColor: 'var(--theme-bg)',
                color: 'var(--theme-text)',
            }}
        >
            {/* Sidebar */}
            <aside 
                className="w-64 border-r flex flex-col"
                style={{
                    backgroundColor: 'var(--theme-surface)',
                    borderColor: 'var(--theme-border)',
                }}
            >
                <div className="p-6">
                    <div className="flex items-center">
                        <h1 
                            className="text-xl font-bold flex items-center gap-2"
                            style={{ color: 'var(--theme-accent)' }}
                        >
                            <Wrench className="w-6 h-6" />
                            Service Center
                        </h1>
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-2">
                    <NavLink
                        to="/"
                        className={() =>
                            clsx(
                                'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors'
                            )
                        }
                        style={({ isActive }) => ({
                            backgroundColor: isActive ? 'var(--theme-primary)' : 'transparent',
                            color: isActive ? '#ffffff' : 'var(--theme-text-secondary)',
                        })}
                        onMouseEnter={(e) => {
                            if (!e.currentTarget.classList.contains('bg-blue-600')) {
                                e.currentTarget.style.backgroundColor = 'var(--theme-surface-secondary)';
                                e.currentTarget.style.color = 'var(--theme-text)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!e.currentTarget.classList.contains('bg-blue-600')) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.color = 'var(--theme-text-secondary)';
                            }
                        }}
                    >
                        <LayoutDashboard className="w-5 h-5" />
                        Головна
                    </NavLink>
                    <NavLink
                        to="/inventory"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors"
                        style={({ isActive }) => ({
                            backgroundColor: isActive ? 'var(--theme-primary)' : 'transparent',
                            color: isActive ? '#ffffff' : 'var(--theme-text-secondary)',
                        })}
                        onMouseEnter={(e) => {
                            if (!e.currentTarget.classList.contains('bg-blue-600')) {
                                e.currentTarget.style.backgroundColor = 'var(--theme-surface-secondary)';
                                e.currentTarget.style.color = 'var(--theme-text)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!e.currentTarget.classList.contains('bg-blue-600')) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.color = 'var(--theme-text-secondary)';
                            }
                        }}
                    >
                        <ShoppingCart className="w-5 h-5" />
                        Склад
                    </NavLink>
                    <NavLink
                        to="/cash-register"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors"
                        style={({ isActive }) => ({
                            backgroundColor: isActive ? 'var(--theme-primary)' : 'transparent',
                            color: isActive ? '#ffffff' : 'var(--theme-text-secondary)',
                        })}
                        onMouseEnter={(e) => {
                            if (!e.currentTarget.classList.contains('bg-blue-600')) {
                                e.currentTarget.style.backgroundColor = 'var(--theme-surface-secondary)';
                                e.currentTarget.style.color = 'var(--theme-text)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!e.currentTarget.classList.contains('bg-blue-600')) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.color = 'var(--theme-text-secondary)';
                            }
                        }}
                    >
                        <Banknote className="w-5 h-5" />
                        Каса
                    </NavLink>
                    <NavLink
                        to="/settings"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors"
                        style={({ isActive }) => ({
                            backgroundColor: isActive ? 'var(--theme-primary)' : 'transparent',
                            color: isActive ? '#ffffff' : 'var(--theme-text-secondary)',
                        })}
                        onMouseEnter={(e) => {
                            if (!e.currentTarget.classList.contains('bg-blue-600')) {
                                e.currentTarget.style.backgroundColor = 'var(--theme-surface-secondary)';
                                e.currentTarget.style.color = 'var(--theme-text)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!e.currentTarget.classList.contains('bg-blue-600')) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.color = 'var(--theme-text-secondary)';
                            }
                        }}
                    >
                        <Settings className="w-5 h-5" />
                        Налаштування
                    </NavLink>
                    <button
                        onClick={() => window.close()}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors mt-auto"
                        style={{
                            color: '#f87171',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--theme-surface-secondary)';
                            e.currentTarget.style.color = '#fca5a5';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = '#f87171';
                        }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                        Вихід
                    </button>
                </nav>

                <div 
                    className="p-4 border-t text-xs text-center"
                    style={{
                        borderColor: 'var(--theme-border)',
                        color: 'var(--theme-text-secondary)',
                    }}
                >
                    v{import.meta.env.VITE_APP_VERSION || '1.0.0'}
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto flex flex-col">
                {/* Navigation Tabs Bar with Connection Status */}
                <div 
                    className="flex items-center justify-between px-6 py-3 border-b gap-4"
                    style={{
                        backgroundColor: 'var(--theme-surface)',
                        borderColor: 'var(--theme-border)',
                    }}
                >
                    <nav className="flex items-center gap-1 flex-1">
                        <NavLink
                            to="/"
                            className={({ isActive }) =>
                                clsx(
                                    'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium',
                                    isActive
                                        ? 'bg-blue-600 text-white'
                                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                                )
                            }
                        >
                            <LayoutDashboard className="w-4 h-4" />
                            Ремонти
                        </NavLink>
                        <NavLink
                            to="/inventory"
                            className={({ isActive }) =>
                                clsx(
                                    'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium',
                                    isActive
                                        ? 'bg-blue-600 text-white'
                                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                                )
                            }
                        >
                            <ShoppingCart className="w-4 h-4" />
                            Товари
                        </NavLink>
                        <NavLink
                            to="/cash-register"
                            className={({ isActive }) =>
                                clsx(
                                    'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium',
                                    isActive
                                        ? 'bg-blue-600 text-white'
                                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                                )
                            }
                        >
                            <Banknote className="w-4 h-4" />
                            Каса
                        </NavLink>
                        <NavLink
                            to="/settings"
                            className={({ isActive }) =>
                                clsx(
                                    'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium',
                                    isActive
                                        ? 'bg-blue-600 text-white'
                                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                                )
                            }
                        >
                            <Settings className="w-4 h-4" />
                            Налаштування
                        </NavLink>
                    </nav>
                    {/* Connection status toggle with active connections count */}
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
                </div>
                <div className="flex-1 overflow-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};
