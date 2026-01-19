export interface Executor {
    ID: number;
    Name: string;
    SalaryPercent: number;
    ProductsPercent: number;
}

export const executorsApi = {
    getExecutors: async (): Promise<Executor[]> => {
        return await window.ipcRenderer.invoke('get-executors');
    },

    addExecutor: async (data: { name: string; salaryPercent: number; productsPercent: number }): Promise<{ success: boolean; id: number }> => {
        return await window.ipcRenderer.invoke('add-executor', data);
    },

    updateExecutor: async (data: { id: number; name: string; salaryPercent: number; productsPercent: number }): Promise<{ success: boolean }> => {
        return await window.ipcRenderer.invoke('update-executor', data);
    },

    deleteExecutor: async (id: number): Promise<{ success: boolean }> => {
        return await window.ipcRenderer.invoke('delete-executor', id);
    },
};
