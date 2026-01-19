export interface LegacyValidationResult {
    isValid: boolean;
    error?: string;
    stats?: {
        repairs: number;
        parts: number;
        transactions: number;
        notes: number;
    };
}

export interface ImportResult {
    success: boolean;
    error?: string;
    imported?: {
        repairs: number;
        parts: number;
        transactions: number;
        notes: number;
    };
    backupCreated?: boolean;
}

export const legacyImportApi = {
    validateLegacyDatabase: (legacyDbPath: string): Promise<LegacyValidationResult> => {
        return window.ipcRenderer.invoke('validate-legacy-database', legacyDbPath);
    },

    importLegacyDatabase: (legacyDbPath: string, backupName?: string): Promise<ImportResult> => {
        return window.ipcRenderer.invoke('import-legacy-database', { legacyDbPath, backupName });
    },

    // Listen to import progress events
    onImportProgress: (callback: (progress: { stage: string; current: number; total: number }) => void) => {
        const listener = (_event: any, progress: any) => callback(progress);
        window.ipcRenderer.on('import-progress', listener);

        // Return cleanup function
        return () => {
            window.ipcRenderer.removeListener('import-progress', listener);
        };
    },
};
