export interface GoogleDriveFile {
  id: string;
  name: string;
  size: number;
  createdTime: string;
  modifiedTime: string;
}

export const googleDriveApi = {
  authenticate: async () => { },
  checkCredentials: async () => ({ configured: false }),
  checkAuth: async () => ({ authenticated: false }),
  listBackups: async () => ({ backups: [] as GoogleDriveFile[] }),
  uploadBackup: async (_backupFileName: string) => { },
  listFiles: async () => [],
  deleteFile: async () => { },
  isAuthenticated: async () => false,
  logout: async () => { },
  getUserInfo: async () => ({ name: 'Mock User', email: 'mock@example.com', picture: '' }), // Updated implementation
  disconnect: async () => { }, // New method
  downloadBackup: async (_fileId: string, _fileName: string) => { }, // New method
  deleteBackup: async (_fileId: string) => { }, // New method
};
