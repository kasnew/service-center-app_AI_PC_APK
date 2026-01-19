import { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi, BackupInfo } from '../api/settings';
import { executorsApi, Executor } from '../api/executors';
import { Database, Download, Trash2, RotateCcw, AlertTriangle, HardDrive, Users, Plus, UserCog, Wifi, WifiOff, Copy, ChevronDown, ChevronRight, Check, X, Edit2 } from 'lucide-react';
import { clsx } from 'clsx';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { normalizeMoneyInput, parseMoneyValue } from '../utils/formatters';
import { CashRegisterSettings } from '../components/CashRegisterSettings';

import { ThemeSettings } from '../components/ThemeSettings';
import { syncApi } from '../api/sync';
// import { GoogleDriveSettings } from '../components/GoogleDriveSettings';

type MainCategory = 'database' | 'business' | 'appearance' | 'sync';

export default function Settings() {
    const queryClient = useQueryClient();
    const { currentTheme } = useTheme();
    const isLight = currentTheme.type === 'light';

    const [activeCategory, setActiveCategory] = useState<MainCategory>('database');

    const [syncPort, setSyncPort] = useState(3000);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
    const [newSupplierName, setNewSupplierName] = useState('');
    const [newExecutorName, setNewExecutorName] = useState('');
    const [newExecutorPercent, setNewExecutorPercent] = useState(50);
    const [newExecutorProductsPercent, setNewExecutorProductsPercent] = useState(0);
    const [editingExecutor, setEditingExecutor] = useState<Executor | null>(null);

    // New modal states
    const [backupToDelete, setBackupToDelete] = useState<{ name: string, type: 'manual' | 'auto' } | null>(null);
    const [supplierToDelete, setSupplierToDelete] = useState<{ id: number; name: string } | null>(null);
    const [executorToDelete, setExecutorToDelete] = useState<{ id: number; name: string } | null>(null);

    // Backup rename state
    const [renamingBackup, setRenamingBackup] = useState<{ name: string, type: 'manual' | 'auto' } | null>(null);
    const [newBackupName, setNewBackupName] = useState('');
    const [showRestoreConfirm, setShowRestoreConfirm] = useState<{ name: string, type: 'manual' | 'auto' } | null>(null);
    const [manualBackupsExpanded, setManualBackupsExpanded] = useState(false);
    const [autoBackupsExpanded, setAutoBackupsExpanded] = useState(false);

    // Fetch backups list
    const { data: backups = [], isLoading: isLoadingBackups } = useQuery({
        queryKey: ['backups'],
        queryFn: () => settingsApi.listBackups(),
    });

    // Fetch suppliers list
    const { data: suppliers = [], isLoading: isLoadingSuppliers } = useQuery({
        queryKey: ['manage-suppliers'],
        queryFn: () => settingsApi.getSuppliers(),
    });

    // Fetch executors list
    const { data: executors = [], isLoading: isLoadingExecutors } = useQuery({
        queryKey: ['executors'],
        queryFn: () => executorsApi.getExecutors(),
    });

    // Fetch sync server status
    const { data: syncStatus, refetch: refetchSyncStatus } = useQuery({
        queryKey: ['sync-server-status'],
        queryFn: () => syncApi.getStatus(),
        refetchInterval: 2000, // Poll every 2 seconds
    });

    // Create backup mutation
    const createBackupMutation = useMutation({
        mutationFn: () => settingsApi.createBackup(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['backups'] });
            // Success - backup created
        },
        onError: (error: any) => {
            console.error('Backup error:', error);
        },
    });

    // Clear database mutation
    const clearDatabaseMutation = useMutation({
        mutationFn: () => settingsApi.clearDatabase(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['backups'] });
            setShowClearConfirm(false);
            // Reload the page to refresh all data
            window.location.reload();
        },
        onError: (error: any) => {
            console.error('Clear database error:', error);
            setShowClearConfirm(false);
        },
    });

    // Restore backup mutation
    const restoreBackupMutation = useMutation({
        mutationFn: ({ fileName, type }: { fileName: string, type: 'manual' | 'auto' }) =>
            settingsApi.restoreBackup(fileName, type),
        onSuccess: () => {
            setShowRestoreConfirm(null);
            // Reload the page to refresh all data
            window.location.reload();
        },
        onError: (error: any) => {
            console.error('Restore backup error:', error);
            setShowRestoreConfirm(null);
        },
    });

    // Delete backup mutation
    const deleteBackupMutation = useMutation({
        mutationFn: ({ fileName, type }: { fileName: string, type: 'manual' | 'auto' }) =>
            settingsApi.deleteBackup(fileName, type),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['backups'] });
            setBackupToDelete(null);
        },
        onError: (error: any) => {
            console.error('Delete backup error:', error);
            setBackupToDelete(null);
        },
    });

    // Rename backup mutation
    const renameBackupMutation = useMutation({
        mutationFn: ({ oldName, newName, type }: { oldName: string; newName: string, type: 'manual' | 'auto' }) =>
            settingsApi.renameBackup(oldName, newName, type),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['backups'] });
            setRenamingBackup(null);
            setNewBackupName('');
        },
        onError: (error: any) => {
            console.error('Rename backup error:', error);
            setRenamingBackup(null);
        },
    });

    // Delete all backups mutation
    const deleteAllBackupsMutation = useMutation({
        mutationFn: () => settingsApi.deleteAllBackups(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['backups'] });
            setShowDeleteAllConfirm(false);
        },
        onError: (error: any) => {
            console.error('Delete all backups error:', error);
            setShowDeleteAllConfirm(false);
        },
    });

    // Backup settings queries and mutations
    const { data: backupSettings } = useQuery({
        queryKey: ['backup-settings'],
        queryFn: () => settingsApi.getBackupSettings(),
    });

    const updateBackupSettingsMutation = useMutation({
        mutationFn: (updates: Partial<{ autoBackupEnabled: boolean; backupOnExit: boolean }>) =>
            settingsApi.updateBackupSettings(updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['backup-settings'] });
        },
    });

    // Add supplier mutation
    const addSupplierMutation = useMutation({
        mutationFn: (name: string) => settingsApi.addSupplier(name),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['manage-suppliers'] });
            queryClient.invalidateQueries({ queryKey: ['available-suppliers'] }); // Also invalidate warehouse list
            setNewSupplierName('');
        },
        onError: (error: any) => {
            console.error('Add supplier error:', error);
        },
    });

    // Delete supplier mutation
    const deleteSupplierMutation = useMutation({
        mutationFn: (id: number) => settingsApi.deleteSupplier(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['manage-suppliers'] });
            queryClient.invalidateQueries({ queryKey: ['available-suppliers'] }); // Also invalidate warehouse list
            setSupplierToDelete(null);
        },
        onError: (error: any) => {
            console.error('Delete supplier error:', error);
            setSupplierToDelete(null);
        },
    });

    // Add executor mutation
    const addExecutorMutation = useMutation({
        mutationFn: (data: { name: string; salaryPercent: number; productsPercent: number }) => executorsApi.addExecutor(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['executors'] });
            setNewExecutorName('');
            setNewExecutorPercent(50);
            setNewExecutorProductsPercent(0);
        },
        onError: (error: any) => {
            console.error('Add executor error:', error);
        },
    });

    // Update executor mutation
    const updateExecutorMutation = useMutation({
        mutationFn: (data: { id: number; name: string; salaryPercent: number; productsPercent: number }) => executorsApi.updateExecutor(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['executors'] });
            setEditingExecutor(null);
        },
        onError: (error: any) => {
            console.error('Update executor error:', error);
        },
    });

    // Delete executor mutation
    const deleteExecutorMutation = useMutation({
        mutationFn: (id: number) => executorsApi.deleteExecutor(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['executors'] });
            setExecutorToDelete(null);
        },
        onError: (error: any) => {
            console.error('Delete executor error:', error);
            setExecutorToDelete(null);
        },
    });

    // Sync server mutations
    const startSyncServerMutation = useMutation({
        mutationFn: (port: number) => syncApi.start(port),
        onSuccess: () => {
            refetchSyncStatus();
        },
        onError: (error: any) => {
            console.error('Start sync server error:', error);
        },
    });

    const stopSyncServerMutation = useMutation({
        mutationFn: () => syncApi.stop(),
        onSuccess: () => {
            refetchSyncStatus();
        },
        onError: (error: any) => {
            console.error('Stop sync server error:', error);
        },
    });

    const handleAddSupplier = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSupplierName.trim()) return;
        addSupplierMutation.mutate(newSupplierName.trim());
    };

    const handleAddExecutor = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newExecutorName.trim()) return;
        addExecutorMutation.mutate({
            name: newExecutorName.trim(),
            salaryPercent: newExecutorPercent,
            productsPercent: newExecutorProductsPercent
        });
    };

    const handleUpdateExecutor = (executor: Executor) => {
        if (!editingExecutor) return;
        updateExecutorMutation.mutate({
            id: executor.ID,
            name: editingExecutor.Name,
            salaryPercent: editingExecutor.SalaryPercent,
            productsPercent: editingExecutor.ProductsPercent
        });
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    const formatDate = (dateStr: string): string => {
        return new Date(dateStr).toLocaleString('uk-UA', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const renderBackupList = (list: BackupInfo[], type: 'manual' | 'auto') => {
        if (isLoadingBackups) return <div className="text-center py-4 text-slate-400">Завантаження...</div>;
        if (list.length === 0) return (
            <div className="text-center py-4 text-slate-500 bg-slate-800/30 rounded border border-dashed border-slate-600 text-sm">
                Копії відсутні
            </div>
        );

        return (
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                {list.map((backup) => (
                    <div key={backup.fileName} className="bg-slate-800/50 rounded p-3 border border-slate-600 hover:border-slate-500 transition-colors">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                                {renamingBackup?.name === backup.fileName && renamingBackup?.type === type ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={newBackupName}
                                            onChange={(e) => setNewBackupName(e.target.value)}
                                            className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-slate-100 text-xs"
                                            autoFocus
                                        />
                                        <button
                                            onClick={() => renameBackupMutation.mutate({
                                                oldName: backup.fileName,
                                                newName: newBackupName,
                                                type
                                            })}
                                            className={isLight ? 'text-green-800 hover:text-green-900' : 'text-green-400 hover:text-green-300'}
                                        >✓</button>
                                        <button onClick={() => setRenamingBackup(null)} className="text-slate-400">✗</button>
                                    </div>
                                ) : (
                                    <>
                                        <p className="font-medium text-slate-200 text-sm truncate" title={backup.fileName}>
                                            {backup.fileName}
                                        </p>
                                        <p className="text-[10px] text-slate-400">
                                            {formatFileSize(backup.size)} | {formatDate(backup.date)}
                                            {backup.encrypted && ' | 🔐'}
                                        </p>
                                    </>
                                )}
                            </div>

                            {!renamingBackup && (
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => {
                                            setRenamingBackup({ name: backup.fileName, type });
                                            setNewBackupName(backup.fileName.split('.')[0]);
                                        }}
                                        className="p-1.5 text-blue-400 hover:bg-slate-700 rounded transition-colors"
                                        title="Перейменувати"
                                    >
                                        <Copy className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => setShowRestoreConfirm({ name: backup.fileName, type })}
                                        className={`p-1.5 ${isLight ? 'text-green-800 hover:bg-slate-200' : 'text-green-400 hover:bg-slate-700'} rounded transition-colors`}
                                        title="Відновити"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => setBackupToDelete({ name: backup.fileName, type })}
                                        className="p-1.5 text-red-400 hover:bg-slate-700 rounded transition-colors"
                                        title="Видалити"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="p-6 h-full overflow-auto">
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                    <Database className="w-8 h-8 text-blue-500" />
                    <h1 className="text-2xl font-bold text-slate-100">Налаштування</h1>
                </div>

                {/* Main Category Tabs */}
                <div className="flex gap-4 border-b border-slate-600 mb-4">
                    <button
                        onClick={() => setActiveCategory('database')}
                        className={clsx(
                            'px-4 py-2 font-medium text-sm transition-colors border-b-2',
                            activeCategory === 'database'
                                ? 'border-blue-500 text-blue-400'
                                : 'border-transparent text-slate-400 hover:text-slate-200'
                        )}
                    >
                        База даних
                    </button>
                    <button
                        onClick={() => setActiveCategory('business')}
                        className={clsx(
                            'px-4 py-2 font-medium text-sm transition-colors border-b-2',
                            activeCategory === 'business'
                                ? 'border-blue-500 text-blue-400'
                                : 'border-transparent text-slate-400 hover:text-slate-200'
                        )}
                    >
                        Бізнес
                    </button>
                    <button
                        onClick={() => setActiveCategory('appearance')}
                        className={clsx(
                            'px-4 py-2 font-medium text-sm transition-colors border-b-2',
                            activeCategory === 'appearance'
                                ? 'border-blue-500 text-blue-400'
                                : 'border-transparent text-slate-400 hover:text-slate-200'
                        )}
                    >
                        Зовнішній вигляд
                    </button>
                    <button
                        onClick={() => setActiveCategory('sync')}
                        className={clsx(
                            'px-4 py-2 font-medium text-sm transition-colors border-b-2',
                            activeCategory === 'sync'
                                ? 'border-blue-500 text-blue-400'
                                : 'border-transparent text-slate-400 hover:text-slate-200'
                        )}
                    >
                        Синхронізація
                    </button>
                </div>




            </div>

            {activeCategory === 'database' && (
                <div className="bg-slate-700 rounded-lg shadow-sm p-6 mb-6 border border-slate-600 rainbow-groupbox">
                    <h2 className="text-xl font-semibold text-slate-100 mb-4 flex items-center gap-2">
                        <HardDrive className="w-6 h-6" />
                        Управління базою даних
                    </h2>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-3 mb-6">
                        <button
                            onClick={() => createBackupMutation.mutate()}
                            disabled={createBackupMutation.isPending}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                            <Download className="w-4 h-4" />
                            {createBackupMutation.isPending ? 'Створення...' : 'Створити резервну копію'}
                        </button>

                        <button
                            onClick={() => setShowClearConfirm(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                            Очистити базу даних
                        </button>

                        <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg border border-slate-600">
                            <span className="text-sm font-medium">Загальний розмір:</span>
                            <span className="text-sm font-bold text-blue-400">
                                {formatFileSize(backups.reduce((acc: number, curr: BackupInfo) => acc + curr.size, 0))}
                            </span>
                        </div>
                    </div>

                    {/* Backup Preferences */}
                    <div className="flex flex-wrap gap-6 mb-6 p-4 bg-slate-800/40 rounded-lg border border-slate-600/50">
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    checked={backupSettings?.autoBackupEnabled ?? true}
                                    onChange={(e) => updateBackupSettingsMutation.mutate({ autoBackupEnabled: e.target.checked })}
                                    className="peer sr-only"
                                />
                                <div className="w-10 h-5 bg-slate-600 rounded-full peer peer-checked:bg-blue-600 transition-colors"></div>
                                <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
                            </div>
                            <span className="text-sm font-medium text-slate-300 group-hover:text-slate-100 transition-colors">
                                Автоматичне створення копій при змінах
                            </span>
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer group border-l border-slate-600 pl-6">
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    checked={backupSettings?.backupOnExit ?? false}
                                    onChange={(e) => updateBackupSettingsMutation.mutate({ backupOnExit: e.target.checked })}
                                    className="peer sr-only"
                                />
                                <div className="w-10 h-5 bg-slate-600 rounded-full peer peer-checked:bg-blue-600 transition-colors"></div>
                                <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
                            </div>
                            <span className="text-sm font-medium text-slate-300 group-hover:text-slate-100 transition-colors">
                                Створювати копію при виході з програми
                            </span>
                        </label>
                    </div>

                    {/* Warning Message */}
                    <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 mb-6">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-yellow-200">
                                <p className="font-semibold mb-1">Увага!</p>
                                <p>Перед очисткою бази даних автоматично створюється резервна копія. Рекомендується регулярно створювати резервні копії вручну.</p>
                            </div>
                        </div>
                    </div>

                    {/* Backup Lists */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Manual Backups */}
                        <div>
                            <button
                                onClick={() => setManualBackupsExpanded(!manualBackupsExpanded)}
                                className="w-full flex items-center justify-between text-lg font-semibold text-slate-200 mb-3 p-2 hover:bg-slate-800/50 rounded-lg transition-colors group"
                            >
                                <div className="flex items-center gap-2">
                                    <HardDrive className="w-5 h-5 text-blue-400" />
                                    Ручні резервні копії ({backups.filter(b => b.type !== 'auto').length})
                                </div>
                                {manualBackupsExpanded ? <ChevronDown className="w-5 h-5 text-slate-400 group-hover:text-blue-400" /> : <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-400" />}
                            </button>
                            {manualBackupsExpanded && renderBackupList(backups.filter(b => b.type !== 'auto'), 'manual')}
                        </div>

                        {/* Auto Backups */}
                        <div>
                            <button
                                onClick={() => setAutoBackupsExpanded(!autoBackupsExpanded)}
                                className="w-full flex items-center justify-between text-lg font-semibold text-slate-200 mb-3 p-2 hover:bg-slate-800/50 rounded-lg transition-colors group"
                            >
                                <div className="flex items-center gap-2">
                                    <RotateCcw className={`w-5 h-5 ${isLight ? 'text-green-800' : 'text-green-400'}`} />
                                    Автоматичні копії ({backups.filter(b => b.type === 'auto').length})
                                </div>
                                {autoBackupsExpanded ? <ChevronDown className={`w-5 h-5 text-slate-400 group-hover:${isLight ? 'text-green-800' : 'text-green-400'}`} /> : <ChevronRight className={`w-5 h-5 text-slate-400 group-hover:${isLight ? 'text-green-800' : 'text-green-400'}`} />}
                            </button>
                            {autoBackupsExpanded && renderBackupList(backups.filter(b => b.type === 'auto'), 'auto')}
                        </div>
                    </div>
                </div>
            )}

            {activeCategory === 'business' && (
                <>
                    {/* Cash Register Status and Commission - Top Row */}
                    <CashRegisterSettings />

                    {/* Grid for Suppliers, Executors, Income and Expense Categories */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                        {/* Suppliers */}
                        <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                            <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                                <Users className="w-5 h-5" />
                                Контрагенти
                            </h3>
                            <form onSubmit={handleAddSupplier} className="mb-3 flex gap-2">
                                <input
                                    type="text"
                                    value={newSupplierName}
                                    onChange={(e) => setNewSupplierName(e.target.value)}
                                    placeholder="Новий контрагент"
                                    className="flex-1 bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                                />
                                <button
                                    type="submit"
                                    disabled={!newSupplierName.trim() || addSupplierMutation.isPending}
                                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </form>
                            <div className="max-h-60 overflow-y-auto space-y-1.5">
                                {isLoadingSuppliers ? (
                                    <div className="text-center py-4 text-slate-400 text-sm">Завантаження...</div>
                                ) : suppliers.length === 0 ? (
                                    <div className="text-center py-4 text-slate-500 text-xs">Немає контрагентів</div>
                                ) : (
                                    suppliers.map((supplier: { ID: number; Name: string }) => (
                                        <div key={supplier.ID} className="bg-slate-800/50 rounded p-2 border border-slate-600 flex items-center justify-between group">
                                            <span className="text-sm text-slate-200">{supplier.Name}</span>
                                            <button
                                                onClick={() => setSupplierToDelete({ id: supplier.ID, name: supplier.Name })}
                                                className="p-1 text-slate-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Executors */}
                        <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                            <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                                <UserCog className="w-5 h-5" />
                                Виконавці
                            </h3>
                            <form onSubmit={handleAddExecutor} className="mb-3 grid grid-cols-[1fr_60px_60px_auto] gap-2">
                                <input
                                    type="text"
                                    value={newExecutorName}
                                    onChange={(e) => setNewExecutorName(e.target.value)}
                                    placeholder="Ім'я"
                                    className="bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                                />
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={newExecutorPercent || ''}
                                    onChange={(e) => {
                                        const normalized = normalizeMoneyInput(e.target.value);
                                        const parsed = parseMoneyValue(normalized);
                                        setNewExecutorPercent(parsed);
                                    }}
                                    placeholder="% поcл"
                                    title="Відсоток від послуг"
                                    className="bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                                />
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={newExecutorProductsPercent || ''}
                                    onChange={(e) => {
                                        const normalized = normalizeMoneyInput(e.target.value);
                                        const parsed = parseMoneyValue(normalized);
                                        setNewExecutorProductsPercent(parsed);
                                    }}
                                    placeholder="% тов"
                                    title="Відсоток від товарів"
                                    className="bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                                />
                                <button
                                    type="submit"
                                    disabled={!newExecutorName.trim() || addExecutorMutation.isPending}
                                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </form>
                            <div className="max-h-60 overflow-y-auto space-y-1.5">
                                {isLoadingExecutors ? (
                                    <div className="text-center py-4 text-slate-400 text-sm">Завантаження...</div>
                                ) : executors.length === 0 ? (
                                    <div className="text-center py-4 text-slate-500 text-xs">Немає виконавців</div>
                                ) : (
                                    executors.map((executor: Executor) => (
                                        <div key={executor.ID} className="bg-slate-800/50 rounded p-2 border border-slate-600">
                                            {editingExecutor?.ID === executor.ID ? (
                                                <div className="flex items-center gap-1.5">
                                                    <input
                                                        type="text"
                                                        value={editingExecutor.Name}
                                                        onChange={(e) => setEditingExecutor({ ...editingExecutor, Name: e.target.value })}
                                                        className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-slate-100"
                                                    />
                                                    <input
                                                        type="text"
                                                        inputMode="decimal"
                                                        value={editingExecutor.SalaryPercent || ''}
                                                        onChange={(e) => {
                                                            const normalized = normalizeMoneyInput(e.target.value);
                                                            const parsed = parseMoneyValue(normalized);
                                                            setEditingExecutor({ ...editingExecutor, SalaryPercent: parsed });
                                                        }}
                                                        className="w-14 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-slate-100"
                                                        placeholder="Посл"
                                                    />
                                                    <input
                                                        type="text"
                                                        inputMode="decimal"
                                                        value={editingExecutor.ProductsPercent || ''}
                                                        onChange={(e) => {
                                                            const normalized = normalizeMoneyInput(e.target.value);
                                                            const parsed = parseMoneyValue(normalized);
                                                            setEditingExecutor({ ...editingExecutor, ProductsPercent: parsed });
                                                        }}
                                                        className="w-14 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-slate-100"
                                                        placeholder="Тов"
                                                    />
                                                    <button onClick={() => handleUpdateExecutor(executor)} className="p-1 text-green-400"><Check className="w-3.5 h-3.5" /></button>
                                                    <button onClick={() => setEditingExecutor(null)} className="p-1 text-slate-400"><X className="w-3.5 h-3.5" /></button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between group">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm text-slate-200">{executor.Name}</span>
                                                        <span className="text-xs text-slate-400" title="Відсоток від послуг">{executor.SalaryPercent}%п</span>
                                                        <span className="text-xs text-slate-400" title="Відсоток від товарів">{executor.ProductsPercent}%т</span>
                                                    </div>
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => setEditingExecutor(executor)} className="p-1 text-slate-400 hover:text-blue-400"><Edit2 className="w-3.5 h-3.5" /></button>
                                                        <button onClick={() => setExecutorToDelete({ id: executor.ID, name: executor.Name })} className="p-1 text-slate-400 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}



            {activeCategory === 'appearance' && (
                <ThemeSettings />
            )}

            {/* Google Drive integration temporarily disabled */}
            {/* {activeTab === 'googleDrive' && (
                <GoogleDriveSettings />
            )} */}

            {/* Clear Database Confirmation Dialog */}
            {showClearConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4 border border-slate-600">
                        <div className="flex items-start gap-3 mb-4">
                            <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" />
                            <div>
                                <h3 className="text-lg font-semibold text-slate-100 mb-2">Очистити базу даних?</h3>
                                <p className="text-sm text-slate-300 mb-3">
                                    Це видалить <strong>ВСІ</strong> дані з бази:
                                </p>
                                <ul className="text-sm text-slate-300 list-disc list-inside space-y-1 mb-3">
                                    <li>Всі ремонти</li>
                                    <li>Всі товари на складі</li>
                                    <li>Всю історію</li>
                                </ul>
                                <p className="text-sm text-yellow-300">
                                    Перед очисткою буде автоматично створено резервну копію.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowClearConfirm(false)}
                                className="px-4 py-2 border border-slate-600 rounded-lg hover:bg-slate-700 text-slate-300 transition-colors"
                            >
                                Скасувати
                            </button>
                            <button
                                onClick={() => clearDatabaseMutation.mutate()}
                                disabled={clearDatabaseMutation.isPending}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                                {clearDatabaseMutation.isPending ? 'Очищення...' : 'Очистити базу даних'}
                            </button>
                        </div>
                    </div>
                </div>
            )}



            {activeCategory === 'sync' && (
                <div className="bg-slate-700 rounded-lg shadow-sm p-6 mb-6 border border-slate-600">
                    <h2 className="text-xl font-semibold text-slate-100 mb-4 flex items-center gap-2">
                        <Wifi className="w-6 h-6" />
                        Синхронізація з мобільним додатком
                    </h2>

                    <div className="bg-slate-800 rounded-lg p-4 border border-slate-600">
                        {/* Status and Controls Combined */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                {syncStatus?.running ? (
                                    <>
                                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                                        <span className="text-green-400 font-semibold">Сервер запущено</span>
                                        {syncStatus.port && (
                                            <span className="text-slate-400 text-sm">| Порт: {syncStatus.port}</span>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                        <span className="text-red-400 font-semibold">Сервер зупинено</span>
                                    </>
                                )}
                            </div>

                            {/* Control Button */}
                            {!syncStatus?.running ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        value={syncPort}
                                        onChange={(e) => setSyncPort(parseInt(e.target.value, 10) || 3000)}
                                        min="1024"
                                        max="65535"
                                        placeholder="Порт"
                                        className="w-24 px-2 py-1 text-sm bg-slate-900 border border-slate-600 rounded text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <button
                                        onClick={() => startSyncServerMutation.mutate(syncPort)}
                                        disabled={startSyncServerMutation.isPending}
                                        className="flex items-center gap-2 px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                                    >
                                        <Wifi className="w-4 h-4" />
                                        {startSyncServerMutation.isPending ? 'Запуск...' : 'Запустити'}
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => stopSyncServerMutation.mutate()}
                                    disabled={stopSyncServerMutation.isPending}
                                    className="flex items-center gap-2 px-3 py-1 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                                >
                                    <WifiOff className="w-4 h-4" />
                                    {stopSyncServerMutation.isPending ? 'Зупинка...' : 'Зупинити'}
                                </button>
                            )}
                        </div>

                        {/* IP Addresses */}
                        {syncStatus?.running && syncStatus.ipAddresses && syncStatus.ipAddresses.length > 0 && (
                            <div className="border-t border-slate-700 pt-3">
                                <p className="text-xs text-slate-400 mb-2">IP адреси для підключення:</p>
                                <div className="flex flex-wrap gap-2">
                                    {syncStatus.ipAddresses.map((ip, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center gap-2 bg-slate-900 rounded px-2 py-1 border border-slate-600"
                                        >
                                            <code className="text-blue-400 font-mono text-xs">
                                                http://{ip}:{syncStatus.port}
                                            </code>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(`http://${ip}:${syncStatus.port}`);
                                                }}
                                                className="text-slate-400 hover:text-slate-200 transition-colors"
                                                title="Копіювати"
                                            >
                                                <Copy className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* API Documentation */}
                    <div className="bg-slate-800 rounded-lg p-4 border border-slate-600">
                        <h3 className="text-lg font-semibold text-slate-200 mb-4">Доступні API endpoints</h3>
                        <div className="space-y-2 text-sm font-mono">
                            <div className="text-slate-400">
                                <span className="text-green-400">GET</span> /api/health
                            </div>
                            <div className="text-slate-400">
                                <span className="text-blue-400">GET</span> /api/repairs
                            </div>
                            <div className="text-slate-400">
                                <span className="text-blue-400">GET</span> /api/repairs/:id
                            </div>
                            <div className="text-slate-400">
                                <span className="text-yellow-400">POST</span> /api/repairs
                            </div>
                            <div className="text-slate-400">
                                <span className="text-purple-400">PUT</span> /api/repairs/:id
                            </div>
                            <div className="text-slate-400">
                                <span className="text-red-400">DELETE</span> /api/repairs/:id
                            </div>
                            <div className="text-slate-400">
                                <span className="text-blue-400">GET</span> /api/warehouse
                            </div>
                            <div className="text-slate-400">
                                <span className="text-blue-400">GET</span> /api/transactions
                            </div>
                            <div className="text-slate-400">
                                <span className="text-blue-400">GET</span> /api/executors
                            </div>
                            <div className="text-slate-400">
                                <span className="text-blue-400">GET</span> /api/suppliers
                            </div>
                            <div className="text-slate-400">
                                <span className="text-blue-400">GET</span> /api/status-counts
                            </div>
                            <div className="text-slate-400">
                                <span className="text-blue-400">GET</span> /api/balances
                            </div>
                        </div>
                    </div>

                    {/* Info */}
                    <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-blue-200">
                                <p className="font-semibold mb-1">Важливо!</p>
                                <ul className="list-disc list-inside space-y-1">
                                    <li>Сервер працює тільки в локальній мережі (WiFi)</li>
                                    <li>Комп'ютер та мобільний пристрій мають бути в одній мережі</li>
                                    <li>Переконайтеся, що брандмауер дозволяє з'єднання на вибраному порту</li>
                                    <li>Для безпеки рекомендується додати автентифікацію в майбутньому</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}




            <ConfirmationModal
                isOpen={!!showRestoreConfirm}
                onClose={() => setShowRestoreConfirm(null)}
                onConfirm={() => showRestoreConfirm && restoreBackupMutation.mutate({ fileName: showRestoreConfirm.name, type: showRestoreConfirm.type })}
                title="Відновити з резервної копії?"
                message={`Ви впевнені, що хочете відновити базу з файлу "${showRestoreConfirm?.name}"? Поточні дані будуть замінені.`}
                confirmLabel="Відновити"
                isLoading={restoreBackupMutation.isPending}
            />

            <ConfirmationModal
                isOpen={!!backupToDelete}
                onClose={() => setBackupToDelete(null)}
                onConfirm={() => backupToDelete && deleteBackupMutation.mutate({ fileName: backupToDelete.name, type: backupToDelete.type })}
                title="Видалення резервної копії"
                message={`Ви впевнені, що хочете видалити резервну копію "${backupToDelete?.name}"?`}
                confirmLabel="Видалити"
                isDestructive={true}
                isLoading={deleteBackupMutation.isPending}
            />

            <ConfirmationModal
                isOpen={!!supplierToDelete}
                onClose={() => setSupplierToDelete(null)}
                onConfirm={() => supplierToDelete && deleteSupplierMutation.mutate(supplierToDelete.id)}
                title="Видалення контрагента"
                message={`Ви впевнені, що хочете видалити контрагента "${supplierToDelete?.name}"?`}
                confirmLabel="Видалити"
                isDestructive={true}
                isLoading={deleteSupplierMutation.isPending}
            />

            <ConfirmationModal
                isOpen={!!executorToDelete}
                onClose={() => setExecutorToDelete(null)}
                onConfirm={() => executorToDelete && deleteExecutorMutation.mutate(executorToDelete.id)}
                title="Видалення виконавця"
                message={`Ви впевнені, що хочете видалити виконавця "${executorToDelete?.name}"?`}
                confirmLabel="Видалити"
                isDestructive={true}
                isLoading={deleteExecutorMutation.isPending}
            />

            <ConfirmationModal
                isOpen={showDeleteAllConfirm}
                onClose={() => setShowDeleteAllConfirm(false)}
                onConfirm={() => deleteAllBackupsMutation.mutate()}
                title="Видалити всі резервні копії?"
                message="Ви впевнені, що хочете остаточно видалити ВСІ резервні копії (і ручні, і автоматичні)? Цю дію неможливо скасувати."
                confirmLabel="Видалити все"
                isDestructive={true}
                isLoading={deleteAllBackupsMutation.isPending}
            />
        </div >
    );
}

