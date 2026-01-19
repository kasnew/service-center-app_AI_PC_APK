import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { repairApi } from '../api/repairs';
import { warehouseApi } from '../api/warehouse';
import { executorsApi } from '../api/executors';
import { RepairStatus } from '../types/db';
import { Save, X, Trash2, CheckCircle2, Calendar, User, Laptop, Package, DollarSign, FileText } from 'lucide-react';
import PartsManager from '../components/PartsManager';
import { formatPhoneNumber, normalizeMoneyInput, parseMoneyValue } from '../utils/formatters';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { useTheme } from '../contexts/ThemeContext';

export const RepairEditor: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { currentTheme } = useTheme();
    const isLightGray = currentTheme.id === 'light-gray';
    
    // Use darker colors for light gray theme
    const greenColor = isLightGray ? 'text-green-700' : 'text-green-400';
    const emeraldColor = isLightGray ? 'text-emerald-700' : 'text-emerald-400';
    const cyanColor = isLightGray ? 'text-cyan-700' : 'text-cyan-400';
    
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

    // Load existing repair
    const { data: repair, isLoading } = useQuery({
        queryKey: ['repair', id],
        queryFn: () => repairApi.getRepairDetails(Number(id)),
        enabled: !isNew
    });

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

    useEffect(() => {
        if (repair) {
            // Helper function to format date for input[type="datetime-local"]
            const formatDateForInput = (dateString: string | null | undefined): string => {
                if (!dateString) return '';
                try {
                    const date = new Date(dateString);
                    if (isNaN(date.getTime())) return '';
                    // Adjust to local time zone for input
                    const offset = date.getTimezoneOffset() * 60000;
                    const localDate = new Date(date.getTime() - offset);
                    return localDate.toISOString().slice(0, 16);
                } catch {
                    return '';
                }
            };

            setFormData({
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
            });
            setPreviousPaidStatus(repair.isPaid);
        } else if (copyFrom && isNew) {
            const mode = location.state?.copyMode || 'full';

            // Base data (Client only)
            const baseData = {
                clientName: copyFrom.clientName,
                clientPhone: formatPhoneNumber(copyFrom.clientPhone),
                // Reset everything else
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
                note: '', // Reset note by default
                shouldCall: false
            };

            if (mode === 'client_device') {
                baseData.deviceName = copyFrom.deviceName;
                // User requested ONLY name, phone, and device name. 
                // So we do NOT copy faultDesc or note.
            }

            setFormData(prev => ({
                ...prev,
                ...baseData
            }));

            if (nextReceiptId) {
                setFormData(prev => ({ ...prev, receiptId: nextReceiptId }));
            }
        } else if (nextReceiptId && isNew) {
            setFormData(prev => ({ ...prev, receiptId: nextReceiptId }));
        }
    }, [repair, nextReceiptId, isNew, copyFrom]);

    // Auto-focus on client name input
    useEffect(() => {
        if (clientNameInputRef.current) {
            clientNameInputRef.current.focus();
        }
    }, []);

    // Update payment status for parts when isPaid changes
    useEffect(() => {
        if (!isNew && formData.isPaid !== previousPaidStatus && Number(id)) {
            warehouseApi.updateRepairPayment({
                repairId: Number(id),
                receiptId: formData.receiptId,
                isPaid: formData.isPaid,
                dateEnd: formData.dateEnd || new Date().toISOString()
            }).then(() => {
                queryClient.invalidateQueries({ queryKey: ['repair-parts', id] });
            });
        }
    }, [formData.isPaid, previousPaidStatus, isNew, id, formData.receiptId, formData.dateEnd, queryClient]);

    const saveMutation = useMutation({
        mutationFn: (data: any) => repairApi.saveRepair(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['repairs'], exact: false });
            setAutoSavedId(null); // Clear auto-saved flag on successful save
            navigate(-1);
        }
    });

    // Auto-save mutation for creating draft repairs
    const autoSaveMutation = useMutation({
        mutationFn: (data: any) => repairApi.saveRepair(data),
        onSuccess: (response: any) => {
            const newId = response.id;
            setAutoSavedId(newId);
            queryClient.invalidateQueries({ queryKey: ['repairs'], exact: false });
            // Update URL to edit mode
            navigate(`/repair/${newId}`, { replace: true });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (repairId: number) => repairApi.deleteRepair(repairId),
        onSuccess: async () => {
            // Invalidate all related queries sequentially
            await queryClient.invalidateQueries({ queryKey: ['repairs'], exact: false });
            await queryClient.invalidateQueries({ queryKey: ['repair-parts'], exact: false });
            await queryClient.invalidateQueries({ queryKey: ['next-receipt-id'] });

            // Navigate to dashboard explicitly instead of navigate(-1)
            navigate('/');
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Get latest parts data directly from cache to ensure we have the most up-to-date list
        const currentParts = queryClient.getQueryData<any[]>(['repair-parts', Number(id)]) || parts;

        // Calculate totals including parts
        const partsTotal = currentParts.reduce((sum: number, part: any) => sum + (part.priceUah || 0), 0);
        const partsProfit = currentParts.reduce((sum: number, part: any) => sum + (part.profit || 0), 0);

        // Auto-set status to Issued if paid
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
    };

    // Auto-save handler for new repairs
    const handleAutoSave = async (): Promise<number> => {
        return new Promise((resolve, reject) => {
            // Calculate totals
            const partsTotal = parts.reduce((sum: number, part: any) => sum + (part.priceUah || 0), 0);
            const partsProfit = parts.reduce((sum: number, part: any) => sum + (part.profit || 0), 0);

            const dataToSave = {
                ...formData,
                totalCost: formData.costLabor + partsTotal,
                profit: partsProfit
            };

            autoSaveMutation.mutate(dataToSave, {
                onSuccess: (response: any) => {
                    resolve(response.id);
                },
                onError: (error) => {
                    reject(error);
                }
            });
        });
    };

    // Handle cancel with draft cleanup
    const handleCancel = async () => {
        if (autoSavedId) {
            // Delete the auto-saved draft
            await repairApi.deleteRepair(autoSavedId);
            queryClient.invalidateQueries({ queryKey: ['repairs'], exact: false });
        }
        navigate(-1);
    };

    const handlePaymentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const isChecked = e.target.checked;

        if (isChecked) {
            // Set current date/time when marking as paid
            setFormData(prev => ({
                ...prev,
                isPaid: true,
                dateEnd: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
            }));
            setIsPaymentDateModalOpen(true);
        } else {
            setFormData(prev => ({ ...prev, isPaid: false }));
        }
    };

    const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStatus = Number(e.target.value);
        
        // If status is changed to Ready, set dateEnd to current date
        if (newStatus === RepairStatus.Ready) {
            setFormData(prev => ({
                ...prev,
                status: newStatus,
                dateEnd: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
            }));
        } else {
            setFormData(prev => ({ ...prev, status: newStatus }));
        }

        // If status is changed to Issued, automatically check Paid and open date modal
        if (newStatus === RepairStatus.Issued && !formData.isPaid) {
            setFormData(prev => ({
                ...prev,
                isPaid: true,
                dateEnd: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
            }));
            setIsPaymentDateModalOpen(true);
        }
    };

    if (!isNew && isLoading) {
        return (
            <div className="p-8 flex items-center justify-center">
                <div className="text-slate-400">Завантаження...</div>
            </div>
        );
    }

    // Calculate totals
    const partsTotal = parts.reduce((sum: number, part: any) => sum + (part.priceUah || 0), 0);
    const partsProfit = parts.reduce((sum: number, part: any) => sum + (part.profit || 0), 0);
    const grandTotal = formData.costLabor + partsTotal;

    return (
        <div className="p-4 max-w-5xl mx-auto">
            <div className="mb-4">
                <h2 className="text-2xl font-bold text-slate-100">
                    {isNew ? 'Новий ремонт' : `Ремонт #${formData.receiptId}`}
                </h2>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Main Info */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Status & Executor */}
                    <div className="bg-blue-900/20 rounded-lg p-3 border-2 border-blue-700/50">
                        <h3 className="text-lg font-semibold text-slate-100 mb-2 flex items-center gap-2">
                            <CheckCircle2 className={`w-5 h-5 ${isLightGray ? 'text-blue-700' : 'text-blue-400'}`} />
                            Статус
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Статус
                                </label>
                                <select
                                    value={formData.status}
                                    onChange={handleStatusChange}
                                    className="w-full bg-slate-800 border border-slate-600 rounded-md px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
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
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Виконавець
                                </label>
                                <select
                                    value={formData.executor}
                                    onChange={(e) => setFormData({ ...formData, executor: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-600 rounded-md px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                                >
                                    {executors.map((executor: any) => (
                                        <option key={executor.ID} value={executor.Name}>
                                            {executor.Name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="bg-purple-900/20 rounded-lg p-3 border-2 border-purple-700/50">
                        <h3 className="text-lg font-semibold text-slate-100 mb-2 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-purple-400" />
                            Дати
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Дата прийому *
                                </label>
                                <input
                                    type="datetime-local"
                                    value={formData.dateStart}
                                    onChange={(e) => setFormData({ ...formData, dateStart: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-600 rounded-md px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Дата видачі
                                </label>
                                <input
                                    type="datetime-local"
                                    value={formData.dateEnd}
                                    onChange={(e) => setFormData({ ...formData, dateEnd: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-600 rounded-md px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Client Info */}
                    <div className="bg-green-900/20 rounded-lg p-3 border-2 border-green-700/50">
                        <h3 className="text-lg font-semibold text-slate-100 mb-2 flex items-center gap-2">
                            <User className={`w-5 h-5 ${greenColor}`} />
                            Інформація про клієнта
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Ім'я клієнта
                                </label>
                                <input
                                    ref={clientNameInputRef}
                                    type="text"
                                    value={formData.clientName}
                                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-600 rounded-md px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Телефон
                                </label>
                                <input
                                    type="text"
                                    value={formData.clientPhone}
                                    onChange={(e) => setFormData({ ...formData, clientPhone: formatPhoneNumber(e.target.value) })}
                                    className="w-full bg-slate-800 border border-slate-600 rounded-md px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Device Info */}
                    <div className="bg-orange-900/20 rounded-lg p-3 border-2 border-orange-700/50">
                        <h3 className="text-lg font-semibold text-slate-100 mb-2 flex items-center gap-2">
                            <Laptop className="w-5 h-5 text-orange-400" />
                            Інформація про техніку
                        </h3>
                        <div className="space-y-2">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Найменування техніки
                                </label>
                                <input
                                    type="text"
                                    value={formData.deviceName}
                                    onChange={(e) => setFormData({ ...formData, deviceName: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-600 rounded-md px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Опис несправності
                                </label>
                                <textarea
                                    rows={2}
                                    value={formData.faultDesc}
                                    onChange={(e) => setFormData({ ...formData, faultDesc: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-600 rounded-md px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Виконані роботи
                                </label>
                                <textarea
                                    rows={6}
                                    value={formData.workDone}
                                    onChange={(e) => setFormData({ ...formData, workDone: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-600 rounded-md px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Parts Manager */}
                    <div className="bg-cyan-900/20 rounded-lg border-2 border-cyan-700/50 overflow-hidden">
                        <div className="p-3 border-b-2 border-cyan-700/50">
                            <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                                <Package className={`w-5 h-5 ${cyanColor}`} />
                                Товари та запчастини
                            </h3>
                        </div>
                        <PartsManager
                            repairId={isNew ? 0 : Number(id)}
                            receiptId={formData.receiptId}
                            isPaid={formData.isPaid}
                            dateEnd={formData.dateEnd || new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                            onPartsChange={handlePartsChange}
                            onNeedSave={isNew ? handleAutoSave : undefined}
                        />
                    </div>
                </div>

                {/* Right Column - Sidebar (Pricing, Notes, Actions) */}
                <div className="space-y-4 sticky top-4 self-start">
                    {/* Pricing */}
                    <div className="bg-emerald-900/20 rounded-lg p-3 border-2 border-emerald-700/50">
                        <h3 className="text-lg font-semibold text-slate-100 mb-2 flex items-center gap-2">
                            <DollarSign className={`w-5 h-5 ${emeraldColor}`} />
                            Вартість
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Вартість роботи (₴)
                                </label>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={formData.costLabor || ''}
                                    onChange={(e) => {
                                        const normalized = normalizeMoneyInput(e.target.value);
                                        const parsed = parseMoneyValue(normalized);
                                        setFormData({ ...formData, costLabor: parsed });
                                    }}
                                    className="w-full bg-slate-800 border border-slate-600 rounded-md px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Загальна сума (₴)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={grandTotal}
                                    readOnly
                                    className="w-full bg-slate-800 border border-slate-600 rounded-md px-4 py-2 text-sm focus:outline-none focus:border-blue-500 text-slate-400"
                                />
                            </div>

                            <div className="pt-2 space-y-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.isPaid}
                                        onChange={handlePaymentChange}
                                        className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-slate-300">Оплачено</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.shouldCall}
                                        onChange={(e) => setFormData({ ...formData, shouldCall: e.target.checked })}
                                        className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-slate-300">Дзвінок</span>
                                </label>
                            </div>

                            {/* Payment Type Selection */}
                            {!!formData.isPaid && (
                                <div className="pt-2 pl-6 space-y-2 border-l-2 border-slate-600">
                                    <label className="block text-xs font-medium text-slate-400 mb-1">
                                        Тип оплати
                                    </label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="paymentType"
                                                value="Готівка"
                                                checked={formData.paymentType === 'Готівка'}
                                                onChange={(e) => setFormData({ ...formData, paymentType: e.target.value })}
                                                className="w-4 h-4 border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm text-slate-300">Готівка</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="paymentType"
                                                value="Картка"
                                                checked={formData.paymentType === 'Картка'}
                                                onChange={(e) => setFormData({ ...formData, paymentType: e.target.value })}
                                                className="w-4 h-4 border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm text-slate-300">Картка</span>
                                        </label>
                                    </div>
                                </div>
                            )}

                            {!isNew && partsTotal > 0 && (
                                <div className="mt-3 pt-3 border-t border-slate-600 text-sm text-slate-400 space-y-1">
                                    <div className="flex justify-between">
                                        <span>Вартість роботи:</span>
                                        <span>{formData.costLabor.toFixed(2)} ₴</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Вартість товарів:</span>
                                        <span>{partsTotal.toFixed(2)} ₴</span>
                                    </div>
                                    <div className="flex justify-between font-semibold text-slate-200 mt-2">
                                        <span>Всього:</span>
                                        <span>{grandTotal.toFixed(2)} ₴</span>
                                    </div>
                                    <div className={`flex justify-between ${greenColor} mt-1`}>
                                        <span>Дохід від товарів:</span>
                                        <span>{partsProfit.toFixed(2)} ₴</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="bg-indigo-900/20 rounded-lg p-3 border-2 border-indigo-700/50">
                        <h3 className="text-lg font-semibold text-slate-100 mb-2 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-indigo-400" />
                            Примітки
                        </h3>
                        <textarea
                            rows={5}
                            value={formData.note}
                            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                            className="w-full bg-slate-800 border border-slate-600 rounded-md px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                            placeholder="Додаткова інформація..."
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2">
                        {!isNew && (
                            <button
                                type="button"
                                onClick={handleDelete}
                                className="w-full px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                <Trash2 className="w-4 h-4" />
                                Видалити
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="w-full px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            <X className="w-4 h-4" />
                            Скасувати
                        </button>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={saveMutation.isPending}
                        className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white rounded-lg font-bold text-lg transition-colors flex items-center justify-center gap-2 shadow-lg"
                    >
                        <Save className="w-6 h-6" />
                        {saveMutation.isPending ? 'Збереження...' : 'Зберегти'}
                    </button>
                </div>
            </form >

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Видалення ремонту"
                message="Ви впевнені, що хочете видалити цей ремонт? Цю дію неможливо скасувати."
                confirmLabel="Видалити"
                isDestructive={true}
                isLoading={deleteMutation.isPending}
            />

            <ConfirmationModal
                isOpen={isPaymentDateModalOpen}
                onClose={() => {
                    // If user cancels, set dateEnd to dateStart (reception date)
                    setFormData(prev => ({
                        ...prev,
                        dateEnd: prev.dateStart || new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
                    }));
                    setIsPaymentDateModalOpen(false);
                }}
                onConfirm={() => {
                    // If user confirms, set dateEnd to today
                    setFormData(prev => ({
                        ...prev,
                        dateEnd: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
                    }));
                    setIsPaymentDateModalOpen(false);
                }}
                title="Дата оплати"
                message="Встановити дату оплати (видачі) сьогоднішнім числом?"
                confirmLabel="Так, сьогодні"
                cancelLabel="Ні, залишити як є"
            />
        </div >
    );
};
