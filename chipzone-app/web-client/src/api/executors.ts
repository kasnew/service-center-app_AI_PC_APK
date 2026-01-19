export interface Executor {
    ID: number;
    Name: string;
    SalaryPercent: number;
}

import { apiClient } from './client';

export const executorsApi = {
    getExecutors: async (): Promise<Executor[]> => {
        // Map backend model (lowercase) to frontend model (Capitalized as per interface)
        // Backend: id, name, profitPercentage
        // Frontend expects: ID, Name, SalaryPercent
        const res: any[] = await apiClient.get('/executors');
        return res.map(e => ({
            ID: e.id,
            Name: e.name,
            SalaryPercent: e.profitPercentage || 0
        }));
    },

    addExecutor: async (data: { name: string; salaryPercent: number }): Promise<{ success: boolean; id: number }> => {
        const res = await apiClient.post('/executors', { name: data.name, profitPercentage: data.salaryPercent });
        return { success: true, id: res.id };
    },

    updateExecutor: async (data: { id: number; name: string; salaryPercent: number }): Promise<{ success: boolean }> => {
        await apiClient.put(`/executors/${data.id}`, { name: data.name, profitPercentage: data.salaryPercent });
        return { success: true };
    },

    deleteExecutor: async (id: number): Promise<{ success: boolean }> => {
        await apiClient.delete(`/executors/${id}`);
        return { success: true };
    },
};
