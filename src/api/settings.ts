/**
 * API client for Settings functionality
 */

export interface BackupInfo {
    fileName: string;
    size: number;
    date: string;
    encrypted?: boolean;
    type?: 'manual' | 'auto';
}

export interface BackupSettings {
    autoBackupEnabled: boolean;
    backupOnExit: boolean;
    autoBackupLimit: number;
}

export interface ShutdownSettings {
    enabled: boolean;
    time: string; // HH:mm format
}

export const settingsApi = {
    /**
     * Create a new backup of the database
     */
    createBackup: async (): Promise<BackupInfo> => {
        return window.ipcRenderer.invoke('create-backup');
    },

    /**
     * Clear all data from the database (creates automatic backup first)
     */
    clearDatabase: async (): Promise<{ success: boolean }> => {
        return window.ipcRenderer.invoke('clear-database');
    },

    /**
     * Restore database from a backup file
     */
    restoreBackup: async (fileName: string, type: 'manual' | 'auto' = 'manual'): Promise<{ success: boolean }> => {
        return window.ipcRenderer.invoke('restore-backup', fileName, type);
    },

    /**
     * Get list of available backups
     */
    listBackups: async (): Promise<BackupInfo[]> => {
        return window.ipcRenderer.invoke('list-backups');
    },

    /**
     * Delete a backup file
     */
    deleteBackup: async (fileName: string, type: 'manual' | 'auto' = 'manual'): Promise<{ success: boolean }> => {
        return window.ipcRenderer.invoke('delete-backup', fileName, type);
    },

    /**
     * Delete all backup files
     */
    deleteAllBackups: async (): Promise<{ success: boolean }> => {
        return window.ipcRenderer.invoke('delete-all-backups');
    },

    /**
     * Create a backup with a custom name
     */
    createBackupWithName: async (customName: string): Promise<BackupInfo> => {
        return window.ipcRenderer.invoke('create-backup-with-name', customName);
    },

    /**
     * Rename an existing backup file
     */
    renameBackup: async (oldFileName: string, newFileName: string, type: 'manual' | 'auto' = 'manual'): Promise<BackupInfo> => {
        return window.ipcRenderer.invoke('rename-backup', oldFileName, newFileName, type);
    },


    /**
     * Get list of suppliers
     */
    getSuppliers: async (): Promise<{ ID: number; Name: string }[]> => {
        return window.ipcRenderer.invoke('get-suppliers');
    },

    /**
     * Add a new supplier
     */
    addSupplier: async (name: string): Promise<{ success: boolean; id: number }> => {
        return window.ipcRenderer.invoke('add-supplier', name);
    },

    /**
     * Delete a supplier
     */
    deleteSupplier: async (id: number): Promise<{ success: boolean }> => {
        return window.ipcRenderer.invoke('delete-supplier', id);
    },

    /**
     * Get backup configuration
     */
    getBackupSettings: async (): Promise<BackupSettings> => {
        return window.ipcRenderer.invoke('get-backup-settings');
    },

    /**
     * Update backup configuration
     */
    updateBackupSettings: async (updates: Partial<BackupSettings>): Promise<{ success: boolean }> => {
        return window.ipcRenderer.invoke('update-backup-settings', updates);
    },

    /**
     * Get scheduled shutdown settings
     */
    getShutdownSettings: async (): Promise<ShutdownSettings> => {
        return window.ipcRenderer.invoke('get-shutdown-settings');
    },

    /**
     * Update scheduled shutdown settings
     */
    updateShutdownSettings: async (updates: Partial<ShutdownSettings>): Promise<{ success: boolean }> => {
        return window.ipcRenderer.invoke('update-shutdown-settings', updates);
    },

    /**
     * Manually trigger shutdown with backup
     */
    performShutdown: async (): Promise<{ success: boolean }> => {
        return window.ipcRenderer.invoke('perform-shutdown');
    },
};
