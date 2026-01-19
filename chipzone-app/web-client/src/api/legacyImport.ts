export const legacyImportApi = {
    importJson: async () => ({ success: false, message: "Not supported" }),
    processDbfFile: async () => ({ success: false, message: "Not supported" }),
    importDbf: async () => ({ success: false, message: "Not supported" }),
    validateLegacyDatabase: async (_path: string) => ({ success: false, message: 'Not supported in web' }),
    importLegacyDatabase: async (_path: string, _backupName?: string) => ({ success: false, message: 'Not supported in web', imported: { repairs: 0, parts: 0, transactions: 0, notes: 0 } }),
    onImportProgress: (_callback: (progress: any) => void) => { return () => { }; },
};
