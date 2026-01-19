import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { repairApi } from '../api/repairs';
import { warehouseApi } from '../api/warehouse';
import { executorsApi } from '../api/executors';
import { RepairStatus } from '../types/db';
import { Save, X, Trash2, Calendar, User, Laptop, Package, DollarSign, FileText, Cpu, Zap, Settings as SettingsIcon, Phone, Smartphone } from 'lucide-react';
import PartsManager from '../components/PartsManager';
import { formatPhoneNumber, normalizeMoneyInput, parseMoneyValue } from '../utils/formatters';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { QRCodeModal } from '../components/QRCodeModal';
import { useTheme } from '../contexts/ThemeContext';

export const RepairEditor: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { currentTheme } = useTheme();
    const isLight = currentTheme.type === 'light';

    // Use darker colors for light themes
    const greenColor = isLight ? 'text-green-800' : 'text-green-400';
    const emeraldColor = isLight ? 'text-emerald-800' : 'text-emerald-400';
    const cyanColor = isLight ? 'text-cyan-800' : 'text-cyan-400';
    const orangeColor = isLight ? 'text-orange-800' : 'text-orange-400';
    const indigoColor = isLight ? 'text-indigo-800' : 'text-indigo-400';
    const purpleColor = isLight ? 'text-purple-800' : 'text-purple-400';

    const isNew = !id || id === 'new';
    const clientNameInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        receiptId: 0,
        deviceName: '',
        faultDesc: '',
        workDone: '',
        costLabor: 0,
        totalCost: 0,
        isPaid: false,
        status: RepairStatus.Queue,
        clientName: '',
        clientPhone: '',
        profit: 0,
        dateStart: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
        dateEnd: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
        note: '',
        shouldCall: false,
        executor: 'Андрій',
        paymentType: 'Готівка'
    });

    const [previousPaidStatus, setPreviousPaidStatus] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isPaymentDateModalOpen, setIsPaymentDateModalOpen] = useState(false);
    const [autoSavedId, setAutoSavedId] = useState<number | null>(null);
    const [initialData, setInitialData] = useState<any>(null);
    const [hasPartsChanged, setHasPartsChanged] = useState(false);
    const [isSaveOnExitModalOpen, setIsSaveOnExitModalOpen] = useState(false);
    const [isQRModalOpen, setIsQRModalOpen] = useState(false);

    // Load existing repair
    const { data: repair, isLoading } = useQuery({
        queryKey: ['repair', id],
        queryFn: () => repairApi.getRepairDetails(Number(id)),
        enabled: !isNew
    });

    const [lockInfo, setLockInfo] = useState<{ locked: boolean; device?: string; time?: string } | null>(null);

    // Lock/Unlock logic
    useEffect(() => {
        if (!isNew && id) {
            const repairId = Number(id);

            // Check for existing locks and set our lock
            const setupLock = async () => {
                try {
                    // Check if already locked by someone else
                    const status = await (window as any).ipcRenderer.invoke('check-repair-lock', repairId);
                    if (status.locked && status.device !== 'PC') {
                        setLockInfo(status);
                    }

                    // Set our lock
                    await (window as any).ipcRenderer.invoke('lock-repair', repairId);
                } catch (err) {
                    console.error('Failed to manage lock:', err);
                }
            };

            setupLock();

            // Unlock on unmount
            return () => {
                (window as any).ipcRenderer.invoke('unlock-repair', repairId).catch(console.error);
            };
        }
    }, [id, isNew]);

    // Load next receipt ID for new repairs
    const { data: nextReceiptId } = useQuery({
        queryKey: ['next-receipt-id'],
        queryFn: () => repairApi.getNextReceiptId(),
        enabled: isNew
    });

    // Load repair parts
    const { data: parts = [] } = useQuery({
        queryKey: ['repair-parts', Number(id)],
        queryFn: () => warehouseApi.getRepairParts(Number(id)),
        enabled: !isNew
    });

    // Load executors list
    const { data: executors = [] } = useQuery({
        queryKey: ['executors'],
        queryFn: () => executorsApi.getExecutors(),
    });

    const location = useLocation();
    const copyFrom = location.state?.copyFrom;
    const returnToProfits = location.state?.returnToProfits;
    const returnExecutorName = location.state?.executorName;
    const returnDateRange = location.state?.dateRange;

    useEffect(() => {
        if (repair) {
            const formatDateForInput = (dateString: string | null | undefined): string => {
                if (!dateString) return '';
                try {
                    const date = new Date(dateString);
                    if (isNaN(date.getTime())) return '';
                    const offset = date.getTimezoneOffset() * 60000;
                    const localDate = new Date(date.getTime() - offset);
                    return localDate.toISOString().slice(0, 16);
                } catch {
                    return '';
                }
            };

            const freshData = {
                receiptId: repair.receiptId,
                deviceName: repair.deviceName,
                faultDesc: repair.faultDesc,
                workDone: repair.workDone,
                costLabor: repair.costLabor,
                totalCost: repair.totalCost,
                isPaid: repair.isPaid,
                status: repair.status,
                clientName: repair.clientName,
                clientPhone: formatPhoneNumber(repair.clientPhone),
                profit: repair.profit,
                dateStart: formatDateForInput(repair.dateStart),
                dateEnd: formatDateForInput(repair.dateEnd),
                note: repair.note || '',
                shouldCall: repair.shouldCall,
                executor: repair.executor || 'Андрій',
                paymentType: repair.paymentType || 'Готівка'
            };
            setFormData(freshData);
            setInitialData(freshData);
            setPreviousPaidStatus(repair.isPaid);
        } else if (copyFrom && isNew) {
            const mode = location.state?.copyMode || 'full';

            const baseData = {
                clientName: copyFrom.clientName,
                clientPhone: formatPhoneNumber(copyFrom.clientPhone),
                deviceName: '',
                faultDesc: '',
                workDone: '',
                costLabor: 0,
                totalCost: 0,
                isPaid: false,
                status: RepairStatus.Queue,
                profit: 0,
                dateStart: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
                dateEnd: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
                note: '',
                shouldCall: false,
                executor: 'Андрій',
                paymentType: 'Готівка'
            };

            if (mode === 'client_device') {
                baseData.deviceName = copyFrom.deviceName;
            }

            const mergedData = { ...formData, ...baseData };
            if (nextReceiptId) mergedData.receiptId = nextReceiptId;

            setFormData(mergedData);
            setInitialData(mergedData);
        } else if (nextReceiptId && isNew) {
            const newData = { ...formData, receiptId: nextReceiptId };
            setFormData(newData);
            setInitialData(newData);
        }
    }, [repair, nextReceiptId, isNew, copyFrom]);

    const isDirty = initialData && (hasPartsChanged || JSON.stringify(formData) !== JSON.stringify(initialData));

    useEffect(() => {
        if (clientNameInputRef.current) {
            clientNameInputRef.current.focus();
        }
    }, []);

    useEffect(() => {
        if (!isNew && formData.isPaid !== previousPaidStatus && Number(id)) {
            warehouseApi.updateRepairPayment({
                repairId: Number(id),
                receiptId: formData.receiptId,
                isPaid: formData.isPaid,
                dateEnd: formData.dateEnd || new Date().toISOString()
            }).then(() => {
                queryClient.invalidateQueries({ queryKey: ['repair-parts', Number(id)] });
            });
        }
    }, [formData.isPaid, previousPaidStatus, isNew, id, formData.receiptId, formData.dateEnd, queryClient]);

    const deleteMutation = useMutation({
        mutationFn: (repairId: number) => repairApi.deleteRepair(repairId),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['repairs'], exact: false });
            await queryClient.invalidateQueries({ queryKey: ['repair-parts'], exact: false });
            await queryClient.invalidateQueries({ queryKey: ['next-receipt-id'] });
            await queryClient.invalidateQueries({ queryKey: ['executor-profits'], exact: false });
            await queryClient.invalidateQueries({ queryKey: ['executor-receipts'], exact: false });

            if (returnToProfits) {
                navigate('/cash-register', {
                    state: {
                        returnToProfits: true,
                        executorName: returnExecutorName,
                        dateRange: returnDateRange
                    }
                });
            } else {
                navigate('/');
            }
        }
    });

    const saveMutation = useMutation({
        mutationFn: (data: any) => repairApi.saveRepair(data),
        onSuccess: (data: { id: number }) => {
            queryClient.invalidateQueries({ queryKey: ['repairs'], exact: false });
            queryClient.invalidateQueries({ queryKey: ['executor-profits'], exact: false });
            queryClient.invalidateQueries({ queryKey: ['executor-receipts'], exact: false });
            setAutoSavedId(null);

            if (returnToProfits) {
                navigate('/cash-register', {
                    state: {
                        returnToProfits: true,
                        executorName: returnExecutorName,
                        dateRange: returnDateRange
                    }
                });
            } else {
                navigate('/', { state: { lastRepairId: data.id } });
            }
        }
    });

    const autoSaveMutation = useMutation({
        mutationFn: (data: any) => repairApi.saveRepair(data),
        onSuccess: (response: any) => {
            const newId = response.id;
            setAutoSavedId(newId);
            queryClient.invalidateQueries({ queryKey: ['repairs'], exact: false });
            navigate(`/repair/${newId}`, { replace: true });
        }
    });

    const handleSave = () => {
        const currentParts = queryClient.getQueryData<any[]>(['repair-parts', Number(id)]) || parts;
        const partsTotal = currentParts.reduce((sum: number, part: any) => sum + (part.priceUah || 0), 0);
        const partsProfit = currentParts.reduce((sum: number, part: any) => sum + (part.profit || 0), 0);

        let statusToSave = formData.status;
        if (formData.isPaid) {
            statusToSave = RepairStatus.Issued;
        }

        saveMutation.mutate({
            ...(isNew ? {} : { id: Number(id) }),
            ...formData,
            status: statusToSave,
            totalCost: formData.costLabor + partsTotal,
            profit: partsProfit
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleSave();
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') {
                e.preventDefault();
                if (isDirty && !saveMutation.isPending) {
                    handleSave();
                }
            } else if (e.code === 'Escape') {
                e.preventDefault();
                // First priority: close QR modal if it's open
                if (isQRModalOpen) {
                    setIsQRModalOpen(false);
                } else if (isDirty) {
                    setIsSaveOnExitModalOpen(true);
                } else {
                    navigate('/');
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isDirty, formData, saveMutation.isPending, id, parts, isQRModalOpen]);

    const handleDelete = () => {
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = () => {
        deleteMutation.mutate(Number(id));
        setIsDeleteModalOpen(false);
    };

    const handlePartsChange = async () => {
        await queryClient.invalidateQueries({ queryKey: ['repair-parts', Number(id)] });
        await queryClient.refetchQueries({ queryKey: ['repair-parts', Number(id)] });
        setHasPartsChanged(true);
    };

    const handleAutoSave = async (): Promise<number> => {
        return new Promise((resolve, reject) => {
            const partsTotal = parts.reduce((sum: number, part: any) => sum + (part.priceUah || 0), 0);
            const partsProfit = parts.reduce((sum: number, part: any) => sum + (part.profit || 0), 0);

            const dataToSave = {
                ...formData,
                totalCost: formData.costLabor + partsTotal,
                profit: partsProfit
            };

            autoSaveMutation.mutate(dataToSave, {
                onSuccess: (response: any) => resolve(response.id),
                onError: (error) => reject(error)
            });
        });
    };

    const handleCancel = async () => {
        if (autoSavedId) {
            await repairApi.deleteRepair(autoSavedId);
            queryClient.invalidateQueries({ queryKey: ['repairs'], exact: false });
        }

        if (returnToProfits) {
            navigate('/cash-register', {
                state: {
                    returnToProfits: true,
                    executorName: returnExecutorName,
                    dateRange: returnDateRange
                }
            });
        } else {
            navigate(-1);
        }
    };

    const handlePaymentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const isChecked = e.target.checked;
        if (isChecked) {
            setFormData(prev => ({
                ...prev,
                isPaid: true,
                status: RepairStatus.Issued,
                dateEnd: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
            }));
            setIsPaymentDateModalOpen(true);
        } else {
            setFormData(prev => ({ ...prev, isPaid: false }));
        }
    };

    const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStatus = Number(e.target.value);
        if (newStatus === RepairStatus.Ready) {
            setFormData(prev => ({
                ...prev,
                status: newStatus,
                dateEnd: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
            }));
        } else if (newStatus === RepairStatus.Issued && !formData.isPaid) {
            setFormData(prev => ({
                ...prev,
                isPaid: true,
                status: newStatus,
                dateEnd: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
            }));
            setIsPaymentDateModalOpen(true);
        } else {
            setFormData(prev => ({ ...prev, status: newStatus }));
        }
    };

    if (!isNew && isLoading) {
        return (
            <div className="p-8 flex items-center justify-center">
                <div className="text-slate-400">Завантаження...</div>
            </div>
        );
    }

    const partsTotal = parts.reduce((sum: number, part: any) => sum + (part.priceUah || 0), 0);
    const grandTotal = formData.costLabor + partsTotal;

    return (
        <div className="p-6 max-w-full mx-auto h-full overflow-auto">
            <div className="mb-4">
                <h2 className="text-2xl font-bold text-slate-100">
                    {isNew ? `Новий ремонт #${formData.receiptId}` : `Ремонт #${formData.receiptId}`}
                </h2>
                {lockInfo?.locked && (
                    <div className="mt-2 p-3 bg-amber-900/40 border-2 border-amber-600/50 rounded-lg text-amber-200 flex items-center gap-2 animate-pulse">
                        <span className="text-xl">⚠️</span>
                        <span>
                            <b>Увага!</b> Ця квитанція зараз редагується на пристрої: <b>{lockInfo.device}</b>.
                            Зміни можуть бути втрачені при одночасному збереженні.
                        </span>
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[0.8fr_1.2fr_1fr] gap-8">
                {/* Column 1: Dates, Client Info & Status */}
                <div className="space-y-4">
                    <div className="bg-purple-900/20 rounded-lg p-5 border-2 border-purple-700/50 rainbow-groupbox">
                        <h3 className="text-xl font-bold text-slate-100 mb-4 flex items-center gap-2">
                            <Calendar className={`w-5 h-5 ${purpleColor}`} />
                            Дати
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Дата прийому *</label>
                                <input
                                    type="datetime-local"
                                    value={formData.dateStart}
                                    onChange={(e) => setFormData({ ...formData, dateStart: e.target.value })}
                                    className="w-full bg-slate-800 border-2 border-slate-600 rounded-lg px-4 py-2.5 text-base focus:outline-none focus:border-blue-500 shadow-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Дата видачі</label>
                                <input
                                    type="datetime-local"
                                    value={formData.dateEnd}
                                    onChange={(e) => setFormData({ ...formData, dateEnd: e.target.value })}
                                    className="w-full bg-slate-800 border-2 border-slate-600 rounded-lg px-4 py-2.5 text-base focus:outline-none focus:border-blue-500 shadow-sm"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-green-900/20 rounded-lg p-5 border-2 border-green-700/50 rainbow-groupbox">
                        <h3 className="text-xl font-bold text-slate-100 mb-4 flex items-center gap-2">
                            <User className={`w-5 h-5 ${greenColor}`} />
                            Клієнт та Статус
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Ім'я клієнта</label>
                                <input
                                    ref={clientNameInputRef}
                                    type="text"
                                    value={formData.clientName}
                                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                                    className="w-full bg-slate-800 border-2 border-slate-600 rounded-lg px-4 py-2.5 text-base focus:outline-none focus:border-blue-500 shadow-sm"
                                    tabIndex={1}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Телефон</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={formData.clientPhone}
                                        onChange={(e) => setFormData({ ...formData, clientPhone: formatPhoneNumber(e.target.value) })}
                                        className="w-full bg-slate-800 border-2 border-slate-600 rounded-lg px-4 py-2.5 text-base focus:outline-none focus:border-blue-500 shadow-sm"
                                        tabIndex={2}
                                        placeholder="+38 (0XX) XXX-XX-XX"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setIsQRModalOpen(true)}
                                        disabled={!formData.clientPhone}
                                        className="p-2.5 rounded-lg bg-slate-800 border-2 border-slate-600 text-slate-400 hover:text-blue-400 hover:border-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Показати QR-код для дзвінка"
                                    >
                                        <Smartphone className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Статус</label>
                                    <select
                                        value={formData.status}
                                        onChange={handleStatusChange}
                                        className="w-full bg-slate-800 border-2 border-slate-600 rounded-lg px-4 py-2.5 text-base focus:outline-none focus:border-blue-500 shadow-sm"
                                        tabIndex={5}
                                    >
                                        <option value={RepairStatus.Queue}>У черзі</option>
                                        <option value={RepairStatus.InProgress}>У роботі</option>
                                        <option value={RepairStatus.Waiting}>Очікування</option>
                                        <option value={RepairStatus.Ready}>Готовий</option>
                                        <option value={RepairStatus.NoAnswer}>Не додзвонились</option>
                                        <option value={RepairStatus.Odessa}>Одеса</option>
                                        <option value={RepairStatus.Issued}>Видано</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Виконавець</label>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-shrink-0 mt-1">
                                            {(() => {
                                                const name = formData.executor?.toLowerCase() || '';
                                                if (name.includes('андрій')) return <Cpu className={`w-5 h-5 ${isLight ? 'text-blue-700' : 'text-blue-500'}`} />;
                                                if (name.includes('юрій')) return <Zap className={`w-5 h-5 ${isLight ? 'text-amber-700' : 'text-amber-500'}`} />;
                                                return <SettingsIcon className={`w-5 h-5 ${isLight ? 'text-slate-700' : 'text-slate-500'}`} />;
                                            })()}
                                        </div>
                                        <select
                                            value={formData.executor}
                                            onChange={(e) => setFormData({ ...formData, executor: e.target.value })}
                                            className="w-full bg-slate-800 border-2 border-slate-600 rounded-lg px-4 py-2.5 text-base focus:outline-none focus:border-blue-500 shadow-sm"
                                            tabIndex={6}
                                        >
                                            {executors.map((executor: any) => (
                                                <option key={executor.ID} value={executor.Name}>{executor.Name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2 flex gap-6">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={formData.isPaid}
                                        onChange={handlePaymentChange}
                                        className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500"
                                        tabIndex={7}
                                    />
                                    <div className="flex items-center gap-1.5">
                                        <DollarSign className={`w-4 h-4 ${greenColor}`} />
                                        <span className="text-sm font-medium text-slate-200">Оплачено</span>
                                    </div>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={formData.shouldCall}
                                        onChange={(e) => setFormData({ ...formData, shouldCall: e.target.checked })}
                                        className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500"
                                        tabIndex={8}
                                    />
                                    <div className="flex items-center gap-1.5">
                                        <Phone className={`w-4 h-4 ${isLight ? 'text-pink-700' : 'text-pink-400'}`} />
                                        <span className="text-sm font-medium text-slate-200">Дзвінок</span>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3 pt-2">
                        <button
                            type="submit"
                            disabled={saveMutation.isPending || !isDirty}
                            className={`w-full px-6 py-4 rounded-lg font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-lg ${!isDirty
                                ? 'bg-slate-700 text-slate-500 cursor-not-allowed border-2 border-slate-600'
                                : 'bg-blue-600 hover:bg-blue-500 text-white border-2 border-blue-400/30'
                                }`}
                        >
                            <Save className={`w-6 h-6 ${isDirty ? 'animate-pulse' : ''}`} />
                            {saveMutation.isPending ? 'Збереження...' : 'Зберегти (Ctrl + S)'}
                        </button>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm"
                            >
                                <X className="w-4 h-4" />
                                Скасувати
                            </button>
                            {!isNew && (
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Видалити
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Column 2: Device Info & Notes */}
                <div className="space-y-4">
                    <div className="bg-orange-900/20 rounded-lg p-5 border-2 border-orange-700/50 rainbow-groupbox">
                        <h3 className="text-xl font-bold text-slate-100 mb-4 flex items-center gap-2">
                            <Laptop className={`w-5 h-5 ${orangeColor}`} />
                            Техніка
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Найменування техники</label>
                                <input
                                    type="text"
                                    value={formData.deviceName}
                                    onChange={(e) => setFormData({ ...formData, deviceName: e.target.value })}
                                    className="w-full bg-slate-800 border-2 border-slate-600 rounded-lg px-4 py-2.5 text-base focus:outline-none focus:border-blue-500 shadow-sm"
                                    tabIndex={3}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Опис несправності</label>
                                <textarea
                                    rows={2}
                                    value={formData.faultDesc}
                                    onChange={(e) => setFormData({ ...formData, faultDesc: e.target.value })}
                                    className="w-full bg-slate-800 border-2 border-slate-600 rounded-lg px-4 py-2 text-base focus:outline-none focus:border-blue-500 shadow-sm"
                                    tabIndex={4}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Виконані роботи</label>
                                <textarea
                                    rows={8}
                                    value={formData.workDone}
                                    onChange={(e) => setFormData({ ...formData, workDone: e.target.value })}
                                    className="w-full bg-slate-800 border-2 border-slate-600 rounded-lg px-4 py-2 text-base focus:outline-none focus:border-blue-500 shadow-sm"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-indigo-900/20 rounded-lg p-5 border-2 border-indigo-700/50 rainbow-groupbox">
                        <h3 className="text-xl font-bold text-slate-100 mb-4 flex items-center gap-2">
                            <FileText className={`w-5 h-5 ${indigoColor}`} />
                            Примітки
                        </h3>
                        <textarea
                            rows={3}
                            value={formData.note}
                            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                            className="w-full bg-slate-800 border-2 border-slate-600 rounded-lg px-4 py-2 text-base focus:outline-none focus:border-blue-500 shadow-sm"
                        />
                    </div>
                </div>

                {/* Column 3: Parts & Pricing */}
                <div className="space-y-4">
                    <div className="bg-emerald-900/20 rounded-lg p-5 border-2 border-emerald-700/50 rainbow-groupbox">
                        <h3 className="text-xl font-bold text-slate-100 mb-4 flex items-center gap-2">
                            <DollarSign className={`w-5 h-5 ${emeraldColor}`} />
                            Вартість
                        </h3>
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Робота (₴)</label>
                                    <input
                                        type="text"
                                        value={formData.costLabor ?? ''}
                                        onChange={(e) => {
                                            const normalized = normalizeMoneyInput(e.target.value);
                                            const parsed = parseMoneyValue(normalized);
                                            setFormData({ ...formData, costLabor: parsed });
                                        }}
                                        className="w-full bg-slate-800 border-2 border-slate-600 rounded-lg px-4 py-2.5 text-base focus:outline-none focus:border-blue-500 shadow-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Всього (₴)</label>
                                    <input
                                        type="number"
                                        value={grandTotal}
                                        readOnly
                                        className="w-full bg-slate-800 border-2 border-slate-600 rounded-lg px-4 py-2.5 text-base text-slate-400"
                                    />
                                </div>
                            </div>

                            {!!formData.isPaid && (
                                <div className="pt-1 flex items-center gap-4 border-t border-slate-700">
                                    <span className="text-xs text-slate-400">Тип:</span>
                                    <div className="flex gap-4">
                                        {['Готівка', 'Картка'].map(type => (
                                            <label key={type} className="flex items-center gap-1.5 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="paymentType"
                                                    value={type}
                                                    checked={formData.paymentType === type}
                                                    onChange={(e) => setFormData({ ...formData, paymentType: e.target.value })}
                                                />
                                                <span className="text-xs text-slate-300">{type}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {!isNew && partsTotal > 0 && (
                                <div className="mt-2 pt-2 border-t border-slate-700 text-xs space-y-1">
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Робота:</span>
                                        <span className="text-slate-200">{formData.costLabor} ₴</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Товари:</span>
                                        <span className="text-slate-200">{partsTotal} ₴</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-slate-100 pt-1 border-t border-slate-700">
                                        <span>Всього:</span>
                                        <span>{grandTotal} ₴</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-cyan-900/20 rounded-lg border-2 border-cyan-700/50 overflow-hidden rainbow-groupbox">
                        <div className="p-3 border-b-2 border-cyan-700/50">
                            <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                                <Package className={`w-5 h-5 ${cyanColor}`} />
                                Запчастини
                            </h3>
                        </div>
                        <PartsManager
                            repairId={isNew ? 0 : Number(id)}
                            receiptId={formData.receiptId}
                            isPaid={formData.isPaid}
                            dateEnd={formData.dateEnd || new Date().toISOString()}
                            onPartsChange={handlePartsChange}
                            onNeedSave={isNew ? handleAutoSave : undefined}
                        />
                    </div>
                </div>
            </form>

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Видалення ремонту"
                message="Ви впевнені, що хочете видалити цей ремонт?"
                isDestructive
                isLoading={deleteMutation.isPending}
            />

            <QRCodeModal
                isOpen={isQRModalOpen}
                onClose={() => setIsQRModalOpen(false)}
                phoneNumber={formData.clientPhone}
                clientName={formData.clientName}
            />

            <ConfirmationModal
                isOpen={isPaymentDateModalOpen}
                onClose={() => {
                    setFormData(prev => ({
                        ...prev,
                        dateEnd: prev.dateStart || new Date().toISOString()
                    }));
                    setIsPaymentDateModalOpen(false);
                }}
                onConfirm={() => {
                    setFormData(prev => ({
                        ...prev,
                        dateEnd: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
                    }));
                    setIsPaymentDateModalOpen(false);
                }}
                title="Дата оплати"
                message="Встановити дату оплати сьогодні?"
                confirmLabel="Так"
                cancelLabel="Ні"
            />

            <ConfirmationModal
                isOpen={isSaveOnExitModalOpen}
                onClose={() => setIsSaveOnExitModalOpen(false)}
                onConfirm={() => {
                    handleSave();
                    setIsSaveOnExitModalOpen(false);
                }}
                onCancel={() => {
                    navigate('/');
                    setIsSaveOnExitModalOpen(false);
                }}
                title="Зберегти зміни?"
                message="Бажаєте зберегти зміни перед виходом?"
                confirmLabel="Зберегти"
                cancelLabel="Вийти без збереження"
            />
        </div>
    );
};
