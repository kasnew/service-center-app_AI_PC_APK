export interface SystemStats {
    cpuLoad: number;
    memPercent: number;
    cpuTemp: number;
    diskPercent: number;
    timestamp: number;
}

export const systemApi = {
    getStats: async (): Promise<SystemStats | null> => {
        return window.ipcRenderer.invoke('get-system-stats');
    },
};
