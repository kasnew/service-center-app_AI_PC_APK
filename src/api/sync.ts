export interface SyncServerStatus {
  running: boolean;
  port?: number;
  ipAddresses?: string[];
  activeConnections?: number;
}

export const syncApi = {
  start: async (port: number = 3000): Promise<{ success: boolean; port?: number; error?: string }> => {
    return window.ipcRenderer.invoke('sync-server-start', port);
  },

  stop: async (): Promise<{ success: boolean; error?: string }> => {
    return window.ipcRenderer.invoke('sync-server-stop');
  },

  getStatus: async (): Promise<SyncServerStatus> => {
    return window.ipcRenderer.invoke('sync-server-status');
  },

  getIPAddresses: async (): Promise<{ addresses: string[] }> => {
    return window.ipcRenderer.invoke('sync-server-get-ip');
  },
};

