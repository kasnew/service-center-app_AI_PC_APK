import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { googleDriveApi, GoogleDriveFile } from '../api/googleDrive';
import { settingsApi } from '../api/settings';
import { Cloud, CloudOff, Upload, Download, Trash2, RefreshCw, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

export function GoogleDriveSettings() {
    const queryClient = useQueryClient();
    const [uploadingBackup, setUploadingBackup] = useState<string | null>(null);
    const [downloadingBackup, setDownloadingBackup] = useState<string | null>(null);

    // Check credentials
    const { data: credentialsStatus } = useQuery({
        queryKey: ['google-drive-credentials'],
        queryFn: () => googleDriveApi.checkCredentials(),
    });

    // Check authentication
    const { data: authStatus, refetch: refetchAuth } = useQuery({
        queryKey: ['google-drive-auth'],
        queryFn: () => googleDriveApi.checkAuth(),
        enabled: credentialsStatus?.configured === true,
    });

    // List backups in Google Drive
    const { data: driveBackups, isLoading: isLoadingDriveBackups, refetch: refetchDriveBackups } = useQuery({
        queryKey: ['google-drive-backups'],
        queryFn: () => googleDriveApi.listBackups(),
        enabled: authStatus?.authenticated === true,
        select: (data) => data.backups || [],
    });

    // List local backups
    const { data: localBackups = [] } = useQuery({
        queryKey: ['backups'],
        queryFn: () => settingsApi.listBackups(),
    });

    // Authenticate mutation
    const authMutation = useMutation({
        mutationFn: () => googleDriveApi.authenticate(),
        onSuccess: () => {
            refetchAuth();
            refetchDriveBackups();
        },
    });

    // Disconnect mutation
    const disconnectMutation = useMutation({
        mutationFn: () => googleDriveApi.disconnect(),
        onSuccess: () => {
            refetchAuth();
            queryClient.setQueryData(['google-drive-backups'], { success: true, backups: [] });
        },
    });

    // Upload backup mutation
    const uploadMutation = useMutation({
        mutationFn: (backupFileName: string) => googleDriveApi.uploadBackup(backupFileName),
        onSuccess: () => {
            refetchDriveBackups();
            setUploadingBackup(null);
        },
        onError: () => {
            setUploadingBackup(null);
        },
    });

    // Download backup mutation
    const downloadMutation = useMutation({
        mutationFn: ({ fileId, fileName }: { fileId: string; fileName: string }) =>
            googleDriveApi.downloadBackup(fileId, fileName),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['backups'] });
            setDownloadingBackup(null);
        },
        onError: () => {
            setDownloadingBackup(null);
        },
    });

    // Delete backup mutation
    const deleteDriveBackupMutation = useMutation({
        mutationFn: (fileId: string) => googleDriveApi.deleteBackup(fileId),
        onSuccess: () => {
            refetchDriveBackups();
        },
    });

    const handleUpload = (backupFileName: string) => {
        setUploadingBackup(backupFileName);
        uploadMutation.mutate(backupFileName);
    };

    const handleDownload = (file: GoogleDriveFile) => {
        setDownloadingBackup(file.id);
        downloadMutation.mutate({ fileId: file.id, fileName: file.name });
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    const formatDate = (dateString: string): string => {
        try {
            return new Date(dateString).toLocaleString('uk-UA');
        } catch {
            return dateString;
        }
    };

    // Check if backup is already in Drive
    const isBackupInDrive = (backupFileName: string): boolean => {
        if (!driveBackups) return false;
        return driveBackups.some((file) => file.name === backupFileName);
    };

    return (
        <div className="space-y-6">
            {/* Status Section */}
            <div className="bg-slate-700 rounded-lg p-6 border border-slate-600">
                <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                    <Cloud className="w-5 h-5" />
                    Статус підключення
                </h3>

                {!credentialsStatus?.configured ? (
                    <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-yellow-400 font-medium mb-2">Credentials не налаштовано</p>
                                <div className="text-slate-300 text-sm space-y-2">
                                    <p>Для налаштування Google Drive виконайте наступні кроки:</p>
                                    <ol className="list-decimal list-inside space-y-1 ml-2">
                                        <li>Створіть проект у <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Google Cloud Console</a></li>
                                        <li>Увімкніть Google Drive API</li>
                                        <li>Створіть OAuth 2.0 credentials (Desktop app)</li>
                                        <li>Завантажте <code className="bg-slate-800 px-2 py-1 rounded text-xs">credentials.json</code></li>
                                        <li>Покладіть файл в папку з програмою (корінь проекту або папка electron/)</li>
                                    </ol>
                                    <p className="mt-2">
                                        📖 Детальна інструкція: <code className="bg-slate-800 px-2 py-1 rounded text-xs">GOOGLE_DRIVE_SETUP.md</code>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : !authStatus?.authenticated ? (
                    <div className="space-y-4">
                        <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-4">
                            <p className="text-slate-300 mb-4">Підключіть свій Google Drive акаунт для синхронізації бекапів.</p>
                            <button
                                onClick={() => authMutation.mutate()}
                                disabled={authMutation.isPending}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {authMutation.isPending ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Авторизація...
                                    </>
                                ) : (
                                    <>
                                        <Cloud className="w-4 h-4" />
                                        Підключити Google Drive
                                    </>
                                )}
                            </button>
                        </div>
                        {authMutation.isError && (
                            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
                                <p className="text-red-400 text-sm">
                                    Помилка авторизації: {(authMutation.error as any)?.error || 'Невідома помилка'}
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4">
                            <div className="flex items-center gap-3">
                                <CheckCircle2 className="w-5 h-5 text-green-400" />
                                <div className="flex-1">
                                    <p className="text-green-400 font-medium">Підключено до Google Drive</p>
                                    <p className="text-slate-300 text-sm">Бекапи будуть синхронізуватися автоматично</p>
                                </div>
                                <button
                                    onClick={() => disconnectMutation.mutate()}
                                    disabled={disconnectMutation.isPending}
                                    className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 text-sm flex items-center gap-2"
                                >
                                    <CloudOff className="w-4 h-4" />
                                    Відключити
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Upload Local Backups */}
            {authStatus?.authenticated && (
                <div className="bg-slate-700 rounded-lg p-6 border border-slate-600">
                    <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                        <Upload className="w-5 h-5" />
                        Завантажити локальні бекапи
                    </h3>

                    {localBackups.length === 0 ? (
                        <p className="text-slate-400 text-sm">Немає локальних бекапів для завантаження</p>
                    ) : (
                        <div className="space-y-2">
                            {localBackups.map((backup) => (
                                <div
                                    key={backup.fileName}
                                    className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-600"
                                >
                                    <div className="flex-1">
                                        <p className="text-slate-100 font-medium">{backup.fileName}</p>
                                        <p className="text-slate-400 text-sm">
                                            {formatFileSize(backup.size)} • {formatDate(backup.date)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {isBackupInDrive(backup.fileName) && (
                                            <span className="text-xs text-green-400 bg-green-500/20 px-2 py-1 rounded">
                                                В Drive
                                            </span>
                                        )}
                                        <button
                                            onClick={() => handleUpload(backup.fileName)}
                                            disabled={uploadingBackup === backup.fileName || uploadMutation.isPending}
                                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm flex items-center gap-2"
                                        >
                                            {uploadingBackup === backup.fileName ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Завантаження...
                                                </>
                                            ) : (
                                                <>
                                                    <Upload className="w-4 h-4" />
                                                    Завантажити
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Drive Backups List */}
            {authStatus?.authenticated && (
                <div className="bg-slate-700 rounded-lg p-6 border border-slate-600">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                            <Cloud className="w-5 h-5" />
                            Бекапи в Google Drive
                        </h3>
                        <button
                            onClick={() => refetchDriveBackups()}
                            disabled={isLoadingDriveBackups}
                            className="p-2 text-slate-400 hover:text-slate-100 transition-colors"
                        >
                            <RefreshCw className={clsx('w-5 h-5', isLoadingDriveBackups && 'animate-spin')} />
                        </button>
                    </div>

                    {isLoadingDriveBackups ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                        </div>
                    ) : !driveBackups || driveBackups.length === 0 ? (
                        <p className="text-slate-400 text-sm">Немає бекапів в Google Drive</p>
                    ) : (
                        <div className="space-y-2">
                            {driveBackups.map((file) => (
                                <div
                                    key={file.id}
                                    className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-600"
                                >
                                    <div className="flex-1">
                                        <p className="text-slate-100 font-medium">{file.name}</p>
                                        <p className="text-slate-400 text-sm">
                                            {formatFileSize(file.size)} • {formatDate(file.modifiedTime)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleDownload(file)}
                                            disabled={downloadingBackup === file.id || downloadMutation.isPending}
                                            className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-sm flex items-center gap-2"
                                        >
                                            {downloadingBackup === file.id ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Завантаження...
                                                </>
                                            ) : (
                                                <>
                                                    <Download className="w-4 h-4" />
                                                    Завантажити
                                                </>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => deleteDriveBackupMutation.mutate(file.id)}
                                            disabled={deleteDriveBackupMutation.isPending}
                                            className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 text-sm flex items-center gap-2"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

