import { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi, BackupInfo } from '../api/settings';
import { executorsApi, Executor } from '../api/executors';
import { expenseCategoriesApi, incomeCategoriesApi } from '../api/cashRegister';
// import { warehouseApi } from '../api/warehouse';
import { Part, ExpenseCategory, IncomeCategory } from '../types/db';
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

    // Categories State
    const [newCategoryName, setNewCategoryName] = useState('');
    const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
    const [categoryToDelete, setCategoryToDelete] = useState<{ id: number; name: string } | null>(null);

    const [newIncomeCategoryName, setNewIncomeCategoryName] = useState('');
    const [editingIncomeCategory, setEditingIncomeCategory] = useState<IncomeCategory | null>(null);
    const [incomeCategoryToDelete, setIncomeCategoryToDelete] = useState<{ id: number; name: string } | null>(null);

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
        mutationFn: (updates: Partial<{ autoBackupEnabled: boolean; backupOnExit: boolean; autoBackupLimit: number }>) =>
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

    // --- Category Mutations ---

    const { data: categories = [], isLoading: isLoadingCategories } = useQuery({
        queryKey: ['expense-categories'],
        queryFn: () => expenseCategoriesApi.getCategories(),
    });

    const { data: incomeCategories = [], isLoading: isLoadingIncomeCategories } = useQuery({
        queryKey: ['income-categories'],
        queryFn: () => incomeCategoriesApi.getCategories(),
    });

    const addCategoryMutation = useMutation({
        mutationFn: (name: string) => expenseCategoriesApi.addCategory(name),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
            setNewCategoryName('');
        },
    });

    const updateCategoryMutation = useMutation({
        mutationFn: (data: { id: number; name: string }) => expenseCategoriesApi.updateCategory(data.id, data.name),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
            setEditingCategory(null);
        },
    });

    const toggleCategoryMutation = useMutation({
        mutationFn: (data: { id: number; active: boolean }) => expenseCategoriesApi.toggleCategory(data.id, data.active),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
        },
    });

    const deleteCategoryMutation = useMutation({
        mutationFn: (id: number) => expenseCategoriesApi.deleteCategory(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
            setCategoryToDelete(null);
        },
    });

    const addIncomeCategoryMutation = useMutation({
        mutationFn: (name: string) => incomeCategoriesApi.addCategory(name),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['income-categories'] });
            setNewIncomeCategoryName('');
        },
    });

    const updateIncomeCategoryMutation = useMutation({
        mutationFn: (data: { id: number; name: string }) => incomeCategoriesApi.updateCategory(data.id, data.name),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['income-categories'] });
            setEditingIncomeCategory(null);
        },
    });

    const toggleIncomeCategoryMutation = useMutation({
        mutationFn: (data: { id: number; active: boolean }) => incomeCategoriesApi.toggleCategory(data.id, data.active),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['income-categories'] });
        },
    });

    const deleteIncomeCategoryMutation = useMutation({
        mutationFn: (id: number) => incomeCategoriesApi.deleteCategory(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['income-categories'] });
            setIncomeCategoryToDelete(null);
        },
    });

    // --- Category Handlers ---

    const handleAddCategory = (e: React.FormEvent) => {
        e.preventDefault();
        if (newCategoryName.trim()) {
            addCategoryMutation.mutate(newCategoryName.trim());
        }
    };

    const handleAddIncomeCategory = (e: React.FormEvent) => {
        e.preventDefault();
        if (newIncomeCategoryName.trim()) {
            addIncomeCategoryMutation.mutate(newIncomeCategoryName.trim());
        }
    };

    const handleSaveCategory = (category: ExpenseCategory) => {
        if (editingCategory) {
            updateCategoryMutation.mutate({ id: category.id, name: editingCategory.name });
        }
    };

    const handleSaveIncomeCategory = (category: IncomeCategory) => {
        if (editingIncomeCategory) {
            updateIncomeCategoryMutation.mutate({ id: category.id, name: editingIncomeCategory.name });
        }
    };

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
                    <div className="flex flex-wrap items-center gap-6 mb-6 p-4 bg-slate-800/40 rounded-lg border border-slate-600/50">
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

                        <div className="flex items-center gap-3 border-l border-slate-600 pl-6">
                            <span className="text-sm font-medium text-slate-400">Ліміт копій:</span>
                            <input
                                type="number"
                                min="1"
                                max="100"
                                value={backupSettings?.autoBackupLimit ?? 30}
                                onChange={(e) => updateBackupSettingsMutation.mutate({ autoBackupLimit: parseInt(e.target.value) || 30 })}
                                className="w-16 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                            />
                        </div>

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

                    {/* Grid for Categories, Suppliers, Executors */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6 items-start">
                        {/* Income Categories */}
                        <div className="bg-slate-700 rounded-lg p-4 border border-slate-600 h-full flex flex-col">
                            <h3 className="text-lg font-semibold text-slate-100 mb-3 text-center">Категорії прибутків</h3>
                            <form onSubmit={handleAddIncomeCategory} className="mb-3 flex gap-2">
                                <input
                                    type="text"
                                    value={newIncomeCategoryName}
                                    onChange={(e) => setNewIncomeCategoryName(e.target.value)}
                                    placeholder="Нова категорія"
                                    className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500 w-full"
                                />
                                <button
                                    type="submit"
                                    disabled={!newIncomeCategoryName.trim() || addIncomeCategoryMutation.isPending}
                                    className="px-2 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </form>
                            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar min-h-[200px] max-h-[400px]">
                                {isLoadingIncomeCategories ? (
                                    <div className="text-center py-4 text-slate-400 text-sm">Завантаження...</div>
                                ) : incomeCategories.length === 0 ? (
                                    <div className="text-center py-4 text-slate-500 text-xs">Немає категорій</div>
                                ) : (
                                    incomeCategories.map((category: IncomeCategory) => (
                                        <div key={category.id} className="bg-slate-800/50 rounded p-2 border border-slate-600">
                                            {editingIncomeCategory?.id === category.id ? (
                                                <div className="flex items-center gap-1.5">
                                                    <input
                                                        type="text"
                                                        value={editingIncomeCategory.name}
                                                        onChange={(e) => setEditingIncomeCategory({ ...editingIncomeCategory, name: e.target.value })}
                                                        className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-slate-100 min-w-0"
                                                        autoFocus
                                                    />
                                                    <button onClick={() => handleSaveIncomeCategory(category)} className="p-1 text-green-400 flex-shrink-0"><Check className="w-3.5 h-3.5" /></button>
                                                    <button onClick={() => setEditingIncomeCategory(null)} className="p-1 text-slate-400 flex-shrink-0"><X className="w-3.5 h-3.5" /></button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between group gap-2">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <input
                                                            type="checkbox"
                                                            checked={category.active}
                                                            onChange={(e) => toggleIncomeCategoryMutation.mutate({ id: category.id, active: e.target.checked })}
                                                            className="w-3.5 h-3.5 flex-shrink-0 cursor-pointer"
                                                        />
                                                        <span className={clsx("text-sm truncate", category.active ? "text-slate-200" : "text-slate-500")}>{category.name}</span>
                                                    </div>
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                                        <button onClick={() => setEditingIncomeCategory(category)} className="p-1 text-slate-400 hover:text-blue-400"><Edit2 className="w-3.5 h-3.5" /></button>
                                                        <button onClick={() => setIncomeCategoryToDelete({ id: category.id, name: category.name })} className="p-1 text-slate-400 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Expense Categories */}
                        <div className="bg-slate-700 rounded-lg p-4 border border-slate-600 h-full flex flex-col">
                            <h3 className="text-lg font-semibold text-slate-100 mb-3 text-center">Категорії витрат</h3>
                            <form onSubmit={handleAddCategory} className="mb-3 flex gap-2">
                                <input
                                    type="text"
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    placeholder="Нова категорія"
                                    className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500 w-full"
                                />
                                <button
                                    type="submit"
                                    disabled={!newCategoryName.trim() || addCategoryMutation.isPending}
                                    className="px-2 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </form>
                            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar min-h-[200px] max-h-[400px]">
                                {isLoadingCategories ? (
                                    <div className="text-center py-4 text-slate-400 text-sm">Завантаження...</div>
                                ) : categories.length === 0 ? (
                                    <div className="text-center py-4 text-slate-500 text-xs">Немає категорій</div>
                                ) : (
                                    categories.map((category: ExpenseCategory) => (
                                        <div key={category.id} className="bg-slate-800/50 rounded p-2 border border-slate-600">
                                            {editingCategory?.id === category.id ? (
                                                <div className="flex items-center gap-1.5">
                                                    <input
                                                        type="text"
                                                        value={editingCategory.name}
                                                        onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                                                        className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-slate-100 min-w-0"
                                                        autoFocus
                                                    />
                                                    <button onClick={() => handleSaveCategory(category)} className="p-1 text-green-400 flex-shrink-0"><Check className="w-3.5 h-3.5" /></button>
                                                    <button onClick={() => setEditingCategory(null)} className="p-1 text-slate-400 flex-shrink-0"><X className="w-3.5 h-3.5" /></button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between group gap-2">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <input
                                                            type="checkbox"
                                                            checked={category.active}
                                                            onChange={(e) => toggleCategoryMutation.mutate({ id: category.id, active: e.target.checked })}
                                                            className="w-3.5 h-3.5 flex-shrink-0 cursor-pointer"
                                                        />
                                                        <span className={clsx("text-sm truncate", category.active ? "text-slate-200" : "text-slate-500")}>{category.name}</span>
                                                    </div>
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                                        <button onClick={() => setEditingCategory(category)} className="p-1 text-slate-400 hover:text-blue-400"><Edit2 className="w-3.5 h-3.5" /></button>
                                                        <button onClick={() => setCategoryToDelete({ id: category.id, name: category.name })} className="p-1 text-slate-400 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Suppliers */}
                        <div className="bg-slate-700 rounded-lg p-4 border border-slate-600 h-full flex flex-col">
                            <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2 justify-center">
                                <Users className="w-5 h-5 flex-shrink-0" />
                                <span className="truncate">Контрагенти</span>
                            </h3>
                            <form onSubmit={handleAddSupplier} className="mb-3 flex gap-2">
                                <input
                                    type="text"
                                    value={newSupplierName}
                                    onChange={(e) => setNewSupplierName(e.target.value)}
                                    placeholder="Новий"
                                    className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500 w-full"
                                />
                                <button
                                    type="submit"
                                    disabled={!newSupplierName.trim() || addSupplierMutation.isPending}
                                    className="px-2 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </form>
                            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar min-h-[200px] max-h-[400px]">
                                {isLoadingSuppliers ? (
                                    <div className="text-center py-4 text-slate-400 text-sm">Зав...</div>
                                ) : suppliers.length === 0 ? (
                                    <div className="text-center py-4 text-slate-500 text-xs">Немає</div>
                                ) : (
                                    suppliers.map((supplier: { ID: number; Name: string }) => (
                                        <div key={supplier.ID} className="bg-slate-800/50 rounded p-2 border border-slate-600 flex items-center justify-between group gap-2">
                                            <span className="text-sm text-slate-200 truncate">{supplier.Name}</span>
                                            <button
                                                onClick={() => setSupplierToDelete({ id: supplier.ID, name: supplier.Name })}
                                                className="p-1 text-slate-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Executors */}
                        <div className="bg-slate-700 rounded-lg p-4 border border-slate-600 h-full flex flex-col">
                            <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2 justify-center">
                                <UserCog className="w-5 h-5 flex-shrink-0" />
                                <span className="truncate">Виконавці</span>
                            </h3>
                            <form onSubmit={handleAddExecutor} className="mb-3 grid grid-cols-[1fr_auto] gap-2">
                                <div className="grid grid-cols-2 gap-1.5">
                                    <input
                                        type="text"
                                        value={newExecutorName}
                                        onChange={(e) => setNewExecutorName(e.target.value)}
                                        placeholder="Ім'я"
                                        className="bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500 min-w-0 col-span-2"
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
                                        placeholder="%п"
                                        title="% послуг"
                                        className="bg-slate-800 border border-slate-600 rounded px-1 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500 text-center"
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
                                        placeholder="%т"
                                        title="% товарів"
                                        className="bg-slate-800 border border-slate-600 rounded px-1 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500 text-center"
                                    />
                                </div>
                                <div className="flex items-center">
                                    <button
                                        type="submit"
                                        disabled={!newExecutorName.trim() || addExecutorMutation.isPending}
                                        className="px-2 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 h-full"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                            </form>
                            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar min-h-[200px] max-h-[400px]">
                                {isLoadingExecutors ? (
                                    <div className="text-center py-4 text-slate-400 text-sm">Зав...</div>
                                ) : executors.length === 0 ? (
                                    <div className="text-center py-4 text-slate-500 text-xs">Немає</div>
                                ) : (
                                    executors.map((executor: Executor) => (
                                        <div key={executor.ID} className="bg-slate-800/50 rounded p-2 border border-slate-600">
                                            {editingExecutor?.ID === executor.ID ? (
                                                <div className="flex items-center gap-1.5">
                                                    <input
                                                        type="text"
                                                        value={editingExecutor.Name}
                                                        onChange={(e) => setEditingExecutor({ ...editingExecutor, Name: e.target.value })}
                                                        className="flex-1 bg-slate-700 border border-slate-600 rounded px-1 py-1 text-xs text-slate-100 min-w-0"
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
                                                        className="w-8 bg-slate-700 border border-slate-600 rounded px-1 py-1 text-xs text-slate-100 text-center"
                                                        placeholder="П"
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
                                                        className="w-8 bg-slate-700 border border-slate-600 rounded px-1 py-1 text-xs text-slate-100 text-center"
                                                        placeholder="Т"
                                                    />
                                                    <button onClick={() => handleUpdateExecutor(executor)} className="p-0.5 text-green-400 flex-shrink-0"><Check className="w-3 h-3" /></button>
                                                    <button onClick={() => setEditingExecutor(null)} className="p-0.5 text-slate-400 flex-shrink-0"><X className="w-3 h-3" /></button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between group gap-2">
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-sm text-slate-200 truncate font-medium">{executor.Name}</span>
                                                        <div className="flex gap-2">
                                                            <span className="text-[10px] text-slate-400" title="Відсоток від послуг">{executor.SalaryPercent}%п</span>
                                                            <span className="text-[10px] text-slate-400" title="Відсоток від товарів">{executor.ProductsPercent}%т</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 items-center">
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



            {
                activeCategory === 'sync' && (
                    <div
                        className="rounded-lg shadow-sm p-6 mb-6 border rainbow-groupbox"
                        style={{
                            backgroundColor: 'var(--theme-surface)',
                            borderColor: 'var(--theme-border)',
                            color: 'var(--theme-text)'
                        }}
                    >
                        <h2
                            className="text-xl font-semibold mb-6 flex items-center gap-2"
                            style={{ color: 'var(--theme-text)' }}
                        >
                            <Wifi className="w-6 h-6" />
                            Синхронізація з мобільним додатком
                        </h2>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Left Column: Controls & Status */}
                            <div className="space-y-6">
                                {/* Server Control Card */}
                                <div
                                    className="rounded-lg p-5 border"
                                    style={{
                                        backgroundColor: 'var(--theme-surface-secondary)',
                                        borderColor: 'var(--theme-border)'
                                    }}
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            {syncStatus?.running ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="relative flex h-3 w-3">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                                    </div>
                                                    <span className="text-green-600 dark:text-green-400 font-medium">Сервер працює</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                                    <span className="text-slate-500 dark:text-slate-400 font-medium">Сервер зупинено</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Control Button & Port */}
                                        <div className="flex items-center gap-2">
                                            {!syncStatus?.running && (
                                                <input
                                                    type="number"
                                                    value={syncPort}
                                                    onChange={(e) => setSyncPort(parseInt(e.target.value, 10) || 3000)}
                                                    min="1024"
                                                    max="65535"
                                                    placeholder="Порт"
                                                    className="w-20 px-2 py-1.5 text-sm rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-center border"
                                                    style={{
                                                        backgroundColor: 'var(--theme-surface)',
                                                        borderColor: 'var(--theme-border)',
                                                        color: 'var(--theme-text)'
                                                    }}
                                                />
                                            )}
                                            {syncStatus?.running ? (
                                                <button
                                                    onClick={() => stopSyncServerMutation.mutate()}
                                                    disabled={stopSyncServerMutation.isPending}
                                                    className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/50 rounded hover:bg-red-200 dark:hover:bg-red-500/20 transition-all disabled:opacity-50"
                                                >
                                                    <WifiOff className="w-4 h-4" />
                                                    {stopSyncServerMutation.isPending ? 'Зупинка...' : 'Зупинити'}
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => startSyncServerMutation.mutate(syncPort)}
                                                    disabled={startSyncServerMutation.isPending}
                                                    className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/50 rounded hover:bg-green-200 dark:hover:bg-green-500/20 transition-all disabled:opacity-50"
                                                >
                                                    <Wifi className="w-4 h-4" />
                                                    {startSyncServerMutation.isPending ? 'Запуск...' : 'Запустити'}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Connection Info */}
                                    {syncStatus?.running && syncStatus.ipAddresses && (
                                        <div
                                            className="mt-4 p-3 rounded border"
                                            style={{
                                                backgroundColor: 'var(--theme-surface)',
                                                borderColor: 'var(--theme-border)'
                                            }}
                                        >
                                            <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider font-semibold">Адреси для підключення</p>
                                            <div className="space-y-2">
                                                {syncStatus.ipAddresses.map((ip, index) => (
                                                    <div key={index} className="flex items-center justify-between group">
                                                        <code className="text-blue-600 dark:text-blue-400 font-mono text-sm">
                                                            http://{ip}:{syncStatus.port}
                                                        </code>
                                                        <button
                                                            onClick={() => navigator.clipboard.writeText(`http://${ip}:${syncStatus.port}`)}
                                                            className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors opacity-0 group-hover:opacity-100"
                                                            title="Копіювати адресу"
                                                        >
                                                            <Copy className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Info Alert */}
                                <div
                                    className="border rounded-lg p-4"
                                    style={{
                                        backgroundColor: 'var(--theme-surface)',
                                        borderColor: 'var(--theme-primary)',
                                        opacity: 0.9
                                    }}
                                >
                                    <div className="flex gap-3">
                                        <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--theme-primary)' }} />
                                        <div className="text-sm space-y-1">
                                            <p className="font-medium" style={{ color: 'var(--theme-text)' }}>Важливо</p>
                                            <ul className="list-disc list-inside space-y-0.5 text-xs" style={{ color: 'var(--theme-text-secondary)' }}>
                                                <li>Пристрої мають бути в одній WiFi мережі</li>
                                                <li>Брандмауер не повинен блокувати порт {syncPort}</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: API Documentation */}
                            <div
                                className="rounded-lg p-5 border h-full"
                                style={{
                                    backgroundColor: 'var(--theme-surface-secondary)',
                                    borderColor: 'var(--theme-border)'
                                }}
                            >
                                <h3
                                    className="text-sm font-semibold uppercase tracking-wider mb-4"
                                    style={{ color: 'var(--theme-text-secondary)' }}
                                >API Endpoints</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs font-mono">
                                    {[
                                        { method: 'GET', path: '/api/health', color: 'text-green-500' },
                                        { method: 'GET', path: '/api/repairs', color: 'text-blue-400' },
                                        { method: 'GET', path: '/api/repairs/:id', color: 'text-blue-400' },
                                        { method: 'POST', path: '/api/repairs', color: 'text-yellow-500' },
                                        { method: 'PUT', path: '/api/repairs/:id', color: 'text-purple-400' },
                                        { method: 'DEL', path: '/api/repairs/:id', color: 'text-red-400' },
                                        { method: 'GET', path: '/api/warehouse', color: 'text-blue-400' },
                                        { method: 'GET', path: '/api/transactions', color: 'text-blue-400' },
                                        { method: 'GET', path: '/api/executors', color: 'text-blue-400' },
                                        { method: 'GET', path: '/api/suppliers', color: 'text-blue-400' },
                                        { method: 'GET', path: '/api/status-counts', color: 'text-blue-400' },
                                        { method: 'GET', path: '/api/balances', color: 'text-blue-400' },
                                    ].map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-2 py-1 border-b" style={{ borderColor: 'var(--theme-border)' }}>
                                            <span className={`font-bold w-12 ${item.color}`}>{item.method}</span>
                                            <span style={{ color: 'var(--theme-text)' }}>{item.path}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }




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
                isOpen={!!categoryToDelete}
                onClose={() => setCategoryToDelete(null)}
                onConfirm={() => categoryToDelete && deleteCategoryMutation.mutate(categoryToDelete.id)}
                title="Видалення категорії"
                message={`Ви впевнені, що хочете видалити категорію витрат "${categoryToDelete?.name}"?`}
                isDestructive={true}
                isLoading={deleteCategoryMutation.isPending}
            />

            <ConfirmationModal
                isOpen={!!incomeCategoryToDelete}
                onClose={() => setIncomeCategoryToDelete(null)}
                onConfirm={() => incomeCategoryToDelete && deleteIncomeCategoryMutation.mutate(incomeCategoryToDelete.id)}
                title="Видалення категорії"
                message={`Ви впевнені, що хочете видалити категорію прибутків "${incomeCategoryToDelete?.name}"?`}
                isDestructive={true}
                isLoading={deleteIncomeCategoryMutation.isPending}
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

