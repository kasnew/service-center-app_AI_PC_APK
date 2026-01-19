import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi, BackupInfo } from '../api/settings';
import { executorsApi, Executor } from '../api/executors';
import { Database, Download, Trash2, RotateCcw, AlertTriangle, HardDrive, Users, Plus, UserCog, Wifi, WifiOff, Copy } from 'lucide-react';
import { clsx } from 'clsx';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { normalizeMoneyInput, parseMoneyValue } from '../utils/formatters';
import { CashRegisterSettings } from '../components/CashRegisterSettings';
import { LegacyImportTab } from '../components/LegacyImportTab';
import { ThemeSettings } from '../components/ThemeSettings';
import { syncApi } from '../api/sync';
// import { GoogleDriveSettings } from '../components/GoogleDriveSettings';

type MainCategory = 'database' | 'business' | 'appearance' | 'sync';
type DatabaseSubTab = 'database' | 'legacyImport';
type BusinessSubTab = 'suppliers' | 'executors' | 'cashRegister';

export default function Settings() {
    const queryClient = useQueryClient();
    const [activeCategory, setActiveCategory] = useState<MainCategory>('database');
    const [activeDatabaseTab, setActiveDatabaseTab] = useState<DatabaseSubTab>('database');
    const [activeBusinessTab, setActiveBusinessTab] = useState<BusinessSubTab>('suppliers');

    // Helper to get current active tab based on category
    /*
    const getActiveTab = (): string => {
        switch (activeCategory) {
            case 'database':
                return activeDatabaseTab;
            case 'business':
                return activeBusinessTab;
            case 'appearance':
                return 'themes';
            case 'sync':
                return 'sync';
            default:
                return 'database';
        }
    };
    */

    // const activeTab = getActiveTab();
    const [syncPort, setSyncPort] = useState(3000);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [showRestoreConfirm, setShowRestoreConfirm] = useState<string | null>(null);
    const [newSupplierName, setNewSupplierName] = useState('');
    const [newExecutorName, setNewExecutorName] = useState('');
    const [newExecutorPercent, setNewExecutorPercent] = useState(50);
    const [editingExecutor, setEditingExecutor] = useState<Executor | null>(null);

    // New modal states
    const [backupToDelete, setBackupToDelete] = useState<string | null>(null);
    const [supplierToDelete, setSupplierToDelete] = useState<{ id: number; name: string } | null>(null);
    const [executorToDelete, setExecutorToDelete] = useState<{ id: number; name: string } | null>(null);

    // Backup rename state
    const [renamingBackup, setRenamingBackup] = useState<string | null>(null);
    const [newBackupName, setNewBackupName] = useState('');

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
        mutationFn: (fileName: string) => settingsApi.restoreBackup(fileName),
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
        mutationFn: (fileName: string) => settingsApi.deleteBackup(fileName),
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
        mutationFn: ({ oldName, newName }: { oldName: string; newName: string }) =>
            settingsApi.renameBackup(oldName, newName),
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
        mutationFn: (data: { name: string; salaryPercent: number }) => executorsApi.addExecutor(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['executors'] });
            setNewExecutorName('');
            setNewExecutorPercent(50);
        },
        onError: (error: any) => {
            console.error('Add executor error:', error);
        },
    });

    // Update executor mutation
    const updateExecutorMutation = useMutation({
        mutationFn: (data: { id: number; name: string; salaryPercent: number }) => executorsApi.updateExecutor(data),
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
        addExecutorMutation.mutate({ name: newExecutorName.trim(), salaryPercent: newExecutorPercent });
    };

    const handleUpdateExecutor = (executor: Executor) => {
        if (!editingExecutor) return;
        updateExecutorMutation.mutate({
            id: executor.ID,
            name: editingExecutor.Name,
            salaryPercent: editingExecutor.SalaryPercent
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

    return (
        <div className="p-6">
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                    <Database className="w-8 h-8 text-blue-500" />
                    <h1 className="text-2xl font-bold text-slate-100">Налаштування</h1>
                </div>

                {/* Main Category Tabs */}
                <div className="flex gap-4 border-b border-slate-600 mb-4">
                    <button
                        onClick={() => {
                            setActiveCategory('database');
                            setActiveDatabaseTab('database');
                        }}
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
                        onClick={() => {
                            setActiveCategory('business');
                            setActiveBusinessTab('suppliers');
                        }}
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

                {/* Sub-tabs for Database category */}
                {activeCategory === 'database' && (
                    <div className="flex gap-4 border-b border-slate-600 mb-4">
                        <button
                            onClick={() => setActiveDatabaseTab('database')}
                            className={clsx(
                                'px-4 py-2 font-medium text-sm transition-colors border-b-2',
                                activeDatabaseTab === 'database'
                                    ? 'border-blue-500 text-blue-400'
                                    : 'border-transparent text-slate-400 hover:text-slate-200'
                            )}
                        >
                            Управління БД
                        </button>
                        <button
                            onClick={() => setActiveDatabaseTab('legacyImport')}
                            className={clsx(
                                'px-4 py-2 font-medium text-sm transition-colors border-b-2',
                                activeDatabaseTab === 'legacyImport'
                                    ? 'border-blue-500 text-blue-400'
                                    : 'border-transparent text-slate-400 hover:text-slate-200'
                            )}
                        >
                            Legacy Імпорт
                        </button>
                    </div>
                )}

                {/* Sub-tabs for Business category */}
                {activeCategory === 'business' && (
                    <div className="flex gap-4 border-b border-slate-600 mb-4">
                        <button
                            onClick={() => setActiveBusinessTab('suppliers')}
                            className={clsx(
                                'px-4 py-2 font-medium text-sm transition-colors border-b-2',
                                activeBusinessTab === 'suppliers'
                                    ? 'border-blue-500 text-blue-400'
                                    : 'border-transparent text-slate-400 hover:text-slate-200'
                            )}
                        >
                            Контрагенти
                        </button>
                        <button
                            onClick={() => setActiveBusinessTab('executors')}
                            className={clsx(
                                'px-4 py-2 font-medium text-sm transition-colors border-b-2',
                                activeBusinessTab === 'executors'
                                    ? 'border-blue-500 text-blue-400'
                                    : 'border-transparent text-slate-400 hover:text-slate-200'
                            )}
                        >
                            Виконавці
                        </button>
                        <button
                            onClick={() => setActiveBusinessTab('cashRegister')}
                            className={clsx(
                                'px-4 py-2 font-medium text-sm transition-colors border-b-2',
                                activeBusinessTab === 'cashRegister'
                                    ? 'border-blue-500 text-blue-400'
                                    : 'border-transparent text-slate-400 hover:text-slate-200'
                            )}
                        >
                            Каса
                        </button>
                    </div>
                )}
            </div>

            {activeCategory === 'database' && activeDatabaseTab === 'database' && (
                <div className="bg-slate-700 rounded-lg shadow-sm p-6 mb-6 border border-slate-600">
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

                    {/* Backups List */}
                    <div>
                        <h3 className="text-lg font-semibold text-slate-200 mb-3">
                            Доступні резервні копії ({backups.length})
                        </h3>

                        {isLoadingBackups ? (
                            <div className="text-center py-8 text-slate-400">Завантаження...</div>
                        ) : backups.length === 0 ? (
                            <div className="text-center py-8 text-slate-400 bg-slate-800/50 rounded-lg border border-slate-600">
                                Резервних копій поки немає
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {backups.map((backup: BackupInfo) => (
                                    <div
                                        key={backup.fileName}
                                        className="bg-slate-800/50 rounded-lg p-4 border border-slate-600 hover:border-slate-500 transition-colors"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                {renamingBackup === backup.fileName ? (
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="text"
                                                            value={newBackupName}
                                                            onChange={(e) => setNewBackupName(e.target.value)}
                                                            className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-slate-100 text-sm"
                                                            placeholder="Нова назва бекапу"
                                                            autoFocus
                                                        />
                                                        <button
                                                            onClick={() => {
                                                                if (newBackupName.trim()) {
                                                                    renameBackupMutation.mutate({
                                                                        oldName: backup.fileName,
                                                                        newName: newBackupName.trim()
                                                                    });
                                                                }
                                                            }}
                                                            disabled={!newBackupName.trim() || renameBackupMutation.isPending}
                                                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm disabled:opacity-50"
                                                        >
                                                            ✓
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setRenamingBackup(null);
                                                                setNewBackupName('');
                                                            }}
                                                            className="px-3 py-1 bg-slate-600 text-white rounded hover:bg-slate-500 text-sm"
                                                        >
                                                            ✗
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <p className="font-medium text-slate-200 mb-1">{backup.fileName}</p>
                                                        <p className="text-sm text-slate-400">
                                                            Розмір: {formatFileSize(backup.size)} | Дата: {formatDate(backup.date)}
                                                        </p>
                                                    </>
                                                )}
                                            </div>
                                            {renamingBackup !== backup.fileName && (
                                                <div className="flex gap-2 ml-4">
                                                    <button
                                                        onClick={() => {
                                                            setRenamingBackup(backup.fileName);
                                                            setNewBackupName(backup.fileName.replace('.sqlite', ''));
                                                        }}
                                                        className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                                                    >
                                                        <UserCog className="w-4 h-4" />
                                                        Перейменувати
                                                    </button>
                                                    <button
                                                        onClick={() => setShowRestoreConfirm(backup.fileName)}
                                                        disabled={restoreBackupMutation.isPending}
                                                        className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-sm"
                                                    >
                                                        <RotateCcw className="w-4 h-4" />
                                                        Відновити
                                                    </button>
                                                    <button
                                                        onClick={() => setBackupToDelete(backup.fileName)}
                                                        disabled={deleteBackupMutation.isPending}
                                                        className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 text-sm"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                        Видалити
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeCategory === 'business' && activeBusinessTab === 'suppliers' && (
                <div className="bg-slate-700 rounded-lg shadow-sm p-6 mb-6 border border-slate-600">
                    <h2 className="text-xl font-semibold text-slate-100 mb-4 flex items-center gap-2">
                        <Users className="w-6 h-6" />
                        Управління контрагентами
                    </h2>

                    {/* Add Supplier Form */}
                    <form onSubmit={handleAddSupplier} className="mb-6 flex gap-2">
                        <input
                            type="text"
                            value={newSupplierName}
                            onChange={(e) => setNewSupplierName(e.target.value)}
                            placeholder="Назва нового контрагента"
                            className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                        />
                        <button
                            type="submit"
                            disabled={!newSupplierName.trim() || addSupplierMutation.isPending}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Plus className="w-4 h-4" />
                            Додати
                        </button>
                    </form>

                    {/* Suppliers List */}
                    <div>
                        <h3 className="text-lg font-semibold text-slate-200 mb-3">
                            Список контрагентів ({suppliers.length})
                        </h3>

                        {isLoadingSuppliers ? (
                            <div className="text-center py-8 text-slate-400">Завантаження...</div>
                        ) : suppliers.length === 0 ? (
                            <div className="text-center py-8 text-slate-400 bg-slate-800/50 rounded-lg border border-slate-600">
                                Контрагентів немає
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {suppliers.map((supplier: { ID: number; Name: string }) => (
                                    <div
                                        key={supplier.ID}
                                        className="bg-slate-800/50 rounded-lg p-3 border border-slate-600 flex items-center justify-between group hover:border-slate-500 transition-colors"
                                    >
                                        <span className="font-medium text-slate-200">{supplier.Name}</span>
                                        <button
                                            onClick={() => setSupplierToDelete({ id: supplier.ID, name: supplier.Name })}
                                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                            title="Видалити"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeCategory === 'business' && activeBusinessTab === 'executors' && (
                <div className="bg-slate-700 rounded-lg shadow-sm p-6 mb-6 border border-slate-600">
                    <h2 className="text-xl font-semibold text-slate-100 mb-4 flex items-center gap-2">
                        <UserCog className="w-6 h-6" />
                        Управління виконавцями
                    </h2>

                    {/* Add Executor Form */}
                    <form onSubmit={handleAddExecutor} className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-2">
                        <input
                            type="text"
                            value={newExecutorName}
                            onChange={(e) => setNewExecutorName(e.target.value)}
                            placeholder="Ім'я виконавця"
                            className="bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                        />
                        <input
                            type="text"
                            inputMode="decimal"
                            min="0"
                            max="100"
                            value={newExecutorPercent || ''}
                            onChange={(e) => {
                                const normalized = normalizeMoneyInput(e.target.value);
                                const parsed = parseMoneyValue(normalized);
                                setNewExecutorPercent(parsed);
                            }}
                            placeholder="Коефіцієнт (%)"
                            className="bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                        />
                        <button
                            type="submit"
                            disabled={!newExecutorName.trim() || addExecutorMutation.isPending}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Plus className="w-4 h-4" />
                            Додати
                        </button>
                    </form>

                    {/* Executors List */}
                    <div>
                        <h3 className="text-lg font-semibold text-slate-200 mb-3">
                            Список виконавців ({executors.length})
                        </h3>

                        {isLoadingExecutors ? (
                            <div className="text-center py-8 text-slate-400">Завантаження...</div>
                        ) : executors.length === 0 ? (
                            <div className="text-center py-8 text-slate-400 bg-slate-800/50 rounded-lg border border-slate-600">
                                Виконавців немає
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {executors.map((executor: Executor) => (
                                    <div
                                        key={executor.ID}
                                        className="bg-slate-800/50 rounded-lg p-3 border border-slate-600 hover:border-slate-500 transition-colors"
                                    >
                                        {editingExecutor?.ID === executor.ID ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={editingExecutor.Name}
                                                    onChange={(e) => setEditingExecutor({ ...editingExecutor, Name: e.target.value })}
                                                    className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-slate-100"
                                                />
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    min="0"
                                                    max="100"
                                                    value={editingExecutor.SalaryPercent || ''}
                                                    onChange={(e) => {
                                                        const normalized = normalizeMoneyInput(e.target.value);
                                                        const parsed = parseMoneyValue(normalized);
                                                        setEditingExecutor({ ...editingExecutor, SalaryPercent: parsed });
                                                    }}
                                                    className="w-24 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-slate-100"
                                                />
                                                <span className="text-slate-400">%</span>
                                                <button
                                                    onClick={() => handleUpdateExecutor(executor)}
                                                    className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                                                >
                                                    Зберегти
                                                </button>
                                                <button
                                                    onClick={() => setEditingExecutor(null)}
                                                    className="px-3 py-1 bg-slate-600 text-white rounded hover:bg-slate-500 text-sm"
                                                >
                                                    Скасувати
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between group">
                                                <div className="flex items-center gap-3">
                                                    <span className="font-medium text-slate-200">{executor.Name}</span>
                                                    <span className="text-sm text-slate-400">
                                                        Коефіцієнт: <span className="text-blue-400 font-semibold">{executor.SalaryPercent}%</span>
                                                    </span>
                                                </div>
                                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => setEditingExecutor(executor)}
                                                        className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded-lg transition-colors"
                                                        title="Редагувати"
                                                    >
                                                        <UserCog className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setExecutorToDelete({ id: executor.ID, name: executor.Name })}
                                                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                                                        title="Видалити"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeCategory === 'business' && activeBusinessTab === 'cashRegister' && (
                <CashRegisterSettings />
            )}

            {activeCategory === 'database' && activeDatabaseTab === 'legacyImport' && (
                <LegacyImportTab />
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

            {/* Restore Confirmation Dialog */}
            {showRestoreConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4 border border-slate-600">
                        <div className="flex items-start gap-3 mb-4">
                            <AlertTriangle className="w-6 h-6 text-yellow-500 flex-shrink-0" />
                            <div>
                                <h3 className="text-lg font-semibold text-slate-100 mb-2">Відновити з резервної копії?</h3>
                                <p className="text-sm text-slate-300 mb-2">
                                    <strong>Файл:</strong> {showRestoreConfirm}
                                </p>
                                <p className="text-sm text-slate-300 mb-3">
                                    Поточні дані будуть замінені даними з бекапу.
                                </p>
                                <p className="text-sm text-yellow-300">
                                    Рекомендується створити резервну копію поточного стану перед відновленням.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowRestoreConfirm(null)}
                                className="px-4 py-2 border border-slate-600 rounded-lg hover:bg-slate-700 text-slate-300 transition-colors"
                            >
                                Скасувати
                            </button>
                            <button
                                onClick={() => restoreBackupMutation.mutate(showRestoreConfirm)}
                                disabled={restoreBackupMutation.isPending}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
                                {restoreBackupMutation.isPending ? 'Відновлення...' : 'Відновити'}
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

                    <div className="space-y-6">
                        {/* Server Status */}
                        <div className="bg-slate-800 rounded-lg p-4 border border-slate-600">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    {syncStatus?.running ? (
                                        <>
                                            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                                            <span className="text-green-400 font-semibold">Сервер запущено</span>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                            <span className="text-red-400 font-semibold">Сервер зупинено</span>
                                        </>
                                    )}
                                </div>
                                {syncStatus?.running && syncStatus.port && (
                                    <span className="text-slate-400 text-sm">Порт: {syncStatus.port}</span>
                                )}
                            </div>

                            {syncStatus?.running && syncStatus.ipAddresses && syncStatus.ipAddresses.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-sm text-slate-300 font-medium">IP адреси для підключення:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {syncStatus.ipAddresses.map((ip, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center gap-2 bg-slate-900 rounded-lg px-3 py-2 border border-slate-600"
                                            >
                                                <code className="text-blue-400 font-mono text-sm">
                                                    http://{ip}:{syncStatus.port}
                                                </code>
                                                <button
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(`http://${ip}:${syncStatus.port}`);
                                                    }}
                                                    className="text-slate-400 hover:text-slate-200 transition-colors"
                                                    title="Копіювати"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2">
                                        Використовуйте цю адресу в Android додатку для підключення
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Server Controls */}
                        <div className="bg-slate-800 rounded-lg p-4 border border-slate-600">
                            <h3 className="text-lg font-semibold text-slate-200 mb-4">Керування сервером</h3>

                            {!syncStatus?.running ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">
                                            Порт сервера
                                        </label>
                                        <input
                                            type="number"
                                            value={syncPort}
                                            onChange={(e) => setSyncPort(parseInt(e.target.value, 10) || 3000)}
                                            min="1024"
                                            max="65535"
                                            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <p className="text-xs text-slate-500 mt-1">
                                            За замовчуванням: 3000
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => startSyncServerMutation.mutate(syncPort)}
                                        disabled={startSyncServerMutation.isPending}
                                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                                    >
                                        <Wifi className="w-4 h-4" />
                                        {startSyncServerMutation.isPending ? 'Запуск...' : 'Запустити сервер'}
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => stopSyncServerMutation.mutate()}
                                    disabled={stopSyncServerMutation.isPending}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                                >
                                    <WifiOff className="w-4 h-4" />
                                    {stopSyncServerMutation.isPending ? 'Зупинка...' : 'Зупинити сервер'}
                                </button>
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
                </div>
            )}

            <ConfirmationModal
                isOpen={!!backupToDelete}
                onClose={() => setBackupToDelete(null)}
                onConfirm={() => backupToDelete && deleteBackupMutation.mutate(backupToDelete)}
                title="Видалення резервної копії"
                message={`Ви впевнені, що хочете видалити резервну копію "${backupToDelete}"?`}
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
        </div>
    );
}

