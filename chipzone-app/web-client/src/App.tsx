import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './contexts/ThemeContext';
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
  const [isConnected, setIsConnected] = React.useState(false);

  React.useEffect(() => {
    // Initialize API client
    import('./api/client').then(({ apiClient }) => {
      apiClient.init().then(success => {
        setIsConnected(success);
      });
    });
  }, []);

  if (!isConnected) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#121212', color: '#fff' }}>
        <h2>Connecting to Server...</h2>
      </div>
    );
  }

  return (
    <ThemeProvider>
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
    </ThemeProvider>
  );
};

export default App;
