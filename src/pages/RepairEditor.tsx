import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { repairApi } from '../api/repairs';
import { RepairStatus } from '../types/db';
import { Save, X, Trash2 } from 'lucide-react';

export const RepairEditor: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const isNew = !id || id === 'new';

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
        dateStart: new Date().toISOString().split('T')[0],
        dateEnd: '',
        note: '',
        shouldCall: false
    });

    // Load existing repair
    const { data: repair, isLoading, isFetching } = useQuery({
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

    useEffect(() => {
        if (repair) {
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
                clientPhone: repair.clientPhone,
                profit: repair.profit,
                dateStart: repair.dateStart,
                dateEnd: repair.dateEnd || '',
                note: repair.note,
                shouldCall: repair.shouldCall
            });
        } else if (nextReceiptId && isNew) {
            setFormData(prev => ({ ...prev, receiptId: nextReceiptId }));
        }
    }, [repair, nextReceiptId, isNew]);

    const saveMutation = useMutation({
        mutationFn: (data: any) => repairApi.saveRepair(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['repairs'] });
            navigate(-1);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (repairId: number) => repairApi.deleteRepair(repairId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['repairs'] });
            navigate(-1);
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        saveMutation.mutate({
            ...(isNew ? {} : { id: Number(id) }),
            ...formData
        });
    };

    const handleDelete = () => {
        if (window.confirm('Ви впевнені, що хочете видалити цей ремонт?')) {
            deleteMutation.mutate(Number(id));
        }
    };

    if (!isNew && isLoading) {
        return (
            <div className="p-8 flex items-center justify-center">
                <div className="text-slate-400">Завантаження...</div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-100">
                    {isNew ? 'Новий ремонт' : `Ремонт #${formData.receiptId}`}
                </h2>
                <div className="flex gap-2">
                    {!isNew && (
                        <button
                            type="button"
                            onClick={handleDelete}
                            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            Видалити
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                        <X className="w-4 h-4" />
                        Скасувати
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Client Info */}
                <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                    <h3 className="text-lg font-semibold text-slate-100 mb-4">Інформація про клієнта</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Ім'я клієнта
                            </label>
                            <input
                                type="text"
                                value={formData.clientName}
                                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-md px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Телефон
                            </label>
                            <input
                                type="text"
                                value={formData.clientPhone}
                                onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-md px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Device Info */}
                <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                    <h3 className="text-lg font-semibold text-slate-100 mb-4">Інформація про техніку</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Найменування техніки
                            </label>
                            <input
                                type="text"
                                value={formData.deviceName}
                                onChange={(e) => setFormData({ ...formData, deviceName: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-md px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Опис несправності
                            </label>
                            <textarea
                                rows={3}
                                value={formData.faultDesc}
                                onChange={(e) => setFormData({ ...formData, faultDesc: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-md px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Виконані роботи
                            </label>
                            <textarea
                                rows={3}
                                value={formData.workDone}
                                onChange={(e) => setFormData({ ...formData, workDone: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-md px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Status & Dates */}
                <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                    <h3 className="text-lg font-semibold text-slate-100 mb-4">Статус і дати</h3>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Статус
                            </label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: Number(e.target.value) })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-md px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                            >
                                <option value={RepairStatus.Queue}>У черзі</option>
                                <option value={RepairStatus.InProgress}>У роботі</option>
                                <option value={RepairStatus.Waiting}>Очікування</option>
                                <option value={RepairStatus.Ready}>Готовий</option>
                                <option value={RepairStatus.NoAnswer}>Не додзвонились</option>
                                <option value={RepairStatus.Odessa}>Одеса</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Дата прийому *
                            </label>
                            <input
                                type="date"
                                value={formData.dateStart}
                                onChange={(e) => setFormData({ ...formData, dateStart: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-md px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Дата видачі
                            </label>
                            <input
                                type="date"
                                value={formData.dateEnd}
                                onChange={(e) => setFormData({ ...formData, dateEnd: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-md px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Pricing */}
                <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                    <h3 className="text-lg font-semibold text-slate-100 mb-4">Вартість</h3>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Вартість роботи (₴)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.costLabor}
                                onChange={(e) => setFormData({ ...formData, costLabor: parseFloat(e.target.value) || 0 })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-md px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Загальна сума (₴)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.totalCost}
                                onChange={(e) => setFormData({ ...formData, totalCost: parseFloat(e.target.value) || 0 })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-md px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                            />
                        </div>
                        <div className="flex items-center gap-4 pt-7">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.isPaid}
                                    onChange={(e) => setFormData({ ...formData, isPaid: e.target.checked })}
                                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-slate-300">Оплачено</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.shouldCall}
                                    onChange={(e) => setFormData({ ...formData, shouldCall: e.target.checked })}
                                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-slate-300">Перезвонити</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Notes */}
                <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                    <h3 className="text-lg font-semibold text-slate-100 mb-4">Примітки</h3>
                    <textarea
                        rows={3}
                        value={formData.note}
                        onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-md px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                        placeholder="Додаткова інформація..."
                    />
                </div>

                {/* Submit */}
                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={saveMutation.isPending}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                        <Save className="w-5 h-5" />
                        {saveMutation.isPending ? 'Збереження...' : 'Зберегти'}
                    </button>
                </div>
            </form>
        </div>
    );
};
