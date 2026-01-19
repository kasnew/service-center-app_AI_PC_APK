/**
 * API client for Google Drive integration
 */

export interface GoogleDriveFile {
    id: string;
    name: string;
    size: number;
    createdTime: string;
    modifiedTime: string;
}

export interface GoogleDriveAuthResult {
    success: boolean;
    tokens?: any;
    error?: string;
}

export interface GoogleDriveUploadResult {
    success: boolean;
    fileId?: string;
    fileName?: string;
    size?: number;
    error?: string;
}

export interface GoogleDriveDownloadResult {
    success: boolean;
    filePath?: string;
    error?: string;
}

export interface GoogleDriveListResult {
    success: boolean;
    backups?: GoogleDriveFile[];
    error?: string;
}

export const googleDriveApi = {
    /**
     * Check if Google Drive credentials are configured
     */
    checkCredentials: async (): Promise<{ configured: boolean; error?: string }> => {
        return await window.ipcRenderer.invoke('google-drive-check-credentials');
    },

    /**
     * Check if user is authenticated with Google Drive
     */
    checkAuth: async (): Promise<{ authenticated: boolean; error?: string }> => {
        return await window.ipcRenderer.invoke('google-drive-check-auth');
    },

    /**
     * Authenticate with Google Drive
     */
    authenticate: async (): Promise<GoogleDriveAuthResult> => {
        return await window.ipcRenderer.invoke('google-drive-auth');
    },

    /**
     * Disconnect from Google Drive
     */
    disconnect: async (): Promise<{ success: boolean; error?: string }> => {
        return await window.ipcRenderer.invoke('google-drive-disconnect');
    },

    /**
     * Upload backup to Google Drive
     */
    uploadBackup: async (backupFileName: string): Promise<GoogleDriveUploadResult> => {
        return await window.ipcRenderer.invoke('google-drive-upload-backup', backupFileName);
    },

    /**
     * Download backup from Google Drive
     */
    downloadBackup: async (fileId: string, fileName: string): Promise<GoogleDriveDownloadResult> => {
        return await window.ipcRenderer.invoke('google-drive-download-backup', fileId, fileName);
    },

    /**
     * List all backups in Google Drive
     */
    listBackups: async (): Promise<GoogleDriveListResult> => {
        return await window.ipcRenderer.invoke('google-drive-list-backups');
    },

    /**
     * Delete backup from Google Drive
     */
    deleteBackup: async (fileId: string): Promise<{ success: boolean; error?: string }> => {
        return await window.ipcRenderer.invoke('google-drive-delete-backup', fileId);
    },

    /**
     * Get file info from Google Drive
     */
    getFileInfo: async (fileId: string): Promise<{ success: boolean; info?: GoogleDriveFile; error?: string }> => {
        return await window.ipcRenderer.invoke('google-drive-get-file-info', fileId);
    },
};

