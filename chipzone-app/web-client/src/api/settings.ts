/**
 * API client for Settings functionality
 */

export interface BackupInfo {
    fileName: string;
    size: number;
    date: string;
    encrypted?: boolean;
}

import { apiClient } from './client';

export interface BackupInfo {
    fileName: string;
    size: number;
    date: string;
    encrypted?: boolean;
}

export const settingsApi = {
    createBackup: async (): Promise<BackupInfo> => {
        return await apiClient.post('/backups', {});
    },

    clearDatabase: async (): Promise<{ success: boolean }> => {
        // Not implemented in Android Server yet via API for safety
        console.warn("clearDatabase not supported in web client yet");
        return { success: false };
    },

    restoreBackup: async (fileName: string): Promise<{ success: boolean }> => {
        return await apiClient.post('/backups/restore', { fileName });
    },

    listBackups: async (): Promise<BackupInfo[]> => {
        return await apiClient.get('/backups');
    },

    deleteBackup: async (fileName: string): Promise<{ success: boolean }> => {
        await apiClient.delete(`/backups/${fileName}`);
        return { success: true };
    },

    createBackupWithName: async (customName: string): Promise<BackupInfo> => {
        return await apiClient.post('/backups', { customName });
    },

    renameBackup: async (oldFileName: string, newFileName: string): Promise<BackupInfo> => {
        return await apiClient.put(`/backups/${oldFileName}`, { newFileName });
    },

    getSuppliers: async (): Promise<{ ID: number; Name: string }[]> => {
        // Mapping Counterparties to expected Supplier format
        const res: any[] = await apiClient.get('/counterparties');
        return res.map(c => ({ ID: c.id, Name: c.name }));
    },

    addSupplier: async (name: string): Promise<{ success: boolean; id: number }> => {
        const res = await apiClient.post('/counterparties', { name, type: 'Supplier' }); // Assuming Type field exists or generic
        return { success: true, id: res.id };
    },

    deleteSupplier: async (id: number): Promise<{ success: boolean }> => {
        await apiClient.delete(`/counterparties/${id}`);
        return { success: true };
    },
};
