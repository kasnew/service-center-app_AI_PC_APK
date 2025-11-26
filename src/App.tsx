import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { RepairEditor } from './pages/RepairEditor';

const queryClient = new QueryClient();

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="repair/:id" element={<RepairEditor />} />
            <Route path="inventory" element={<div className="p-8">Склад (Скоро)</div>} />
            <Route path="cash-register" element={<div className="p-8">Каса (Скоро)</div>} />
            <Route path="settings" element={<div className="p-8">Налаштування (Скоро)</div>} />
          </Route>
        </Routes>
      </HashRouter>
    </QueryClientProvider>
  );
};

export default App;
