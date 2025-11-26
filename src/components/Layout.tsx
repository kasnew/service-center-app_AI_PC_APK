import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Wrench, ShoppingCart, Banknote, Settings } from 'lucide-react';
import { clsx } from 'clsx';

export const Layout: React.FC = () => {
    return (
        <div className="flex h-screen bg-slate-900 text-slate-100">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
                <div className="p-6">
                    <h1 className="text-xl font-bold text-blue-400 flex items-center gap-2">
                        <Wrench className="w-6 h-6" />
                        Service Center
                    </h1>
                </div>

                <nav className="flex-1 px-4 space-y-2">
                    <NavLink
                        to="/"
                        className={({ isActive }) =>
                            clsx(
                                'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                                isActive
                                    ? 'bg-blue-600 text-white'
                                    : 'text-slate-400 hover:bg-slate-700 hover:text-slate-100'
                            )
                        }
                    >
                        <LayoutDashboard className="w-5 h-5" />
                        Головна
                    </NavLink>
                    <NavLink
                        to="/inventory"
                        className={({ isActive }) =>
                            clsx(
                                'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                                isActive
                                    ? 'bg-blue-600 text-white'
                                    : 'text-slate-400 hover:bg-slate-700 hover:text-slate-100'
                            )
                        }
                    >
                        <ShoppingCart className="w-5 h-5" />
                        Склад
                    </NavLink>
                    <NavLink
                        to="/cash-register"
                        className={({ isActive }) =>
                            clsx(
                                'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                                isActive
                                    ? 'bg-blue-600 text-white'
                                    : 'text-slate-400 hover:bg-slate-700 hover:text-slate-100'
                            )
                        }
                    >
                        <Banknote className="w-5 h-5" />
                        Каса
                    </NavLink>
                    <NavLink
                        to="/settings"
                        className={({ isActive }) =>
                            clsx(
                                'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                                isActive
                                    ? 'bg-blue-600 text-white'
                                    : 'text-slate-400 hover:bg-slate-700 hover:text-slate-100'
                            )
                        }
                    >
                        <Settings className="w-5 h-5" />
                        Налаштування
                    </NavLink>
                </nav>

                <div className="p-4 border-t border-slate-700 text-xs text-slate-500 text-center">
                    v1.0.0
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                <Outlet />
            </main>
        </div>
    );
};
