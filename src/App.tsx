import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './contexts/ThemeContext';
import { UpdateProvider } from './contexts/UpdateContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { RepairEditor } from './pages/RepairEditor';
import Warehouse from './pages/Warehouse';
import Settings from './pages/Settings';
import CashRegister from './pages/CashRegister';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            staleTime: 0,
            gcTime: 0,
            retry: false,
        },
        mutations: {
            onSettled: async () => {
                // Force clear all cache after any mutation
                queryClient.clear();
            },
        },
    },
});

const App: React.FC = () => {
    return (
        <ThemeProvider>
            <UpdateProvider>
                <QueryClientProvider client={queryClient}>
                    <HashRouter>
                        <Routes>
                            <Route path="/" element={<Layout />}>
                                <Route index element={<Dashboard />} />
                                <Route path="repair/:id" element={<RepairEditor />} />
                                <Route path="inventory" element={<Warehouse />} />
                                <Route path="cash-register" element={<CashRegister />} />
                                <Route path="settings" element={<Settings />} />
                            </Route>
                        </Routes>
                    </HashRouter>
                </QueryClientProvider>
            </UpdateProvider>
        </ThemeProvider>
    );
};

export default App;
