import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { warehouseApi } from '../api/warehouse';
import { Part } from '../types/db';
import { Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import { ConfirmationModal } from './ConfirmationModal';
import { normalizeMoneyInput, parseMoneyValue } from '../utils/formatters';
import { useTheme } from '../contexts/ThemeContext';

interface PartsManagerProps {
    repairId: number;
    receiptId: number;
    isPaid: boolean;
    dateEnd: string;
    onPartsChange?: () => void;
    onNeedSave?: () => Promise<number>;
}

export default function PartsManager({
    repairId,
    receiptId,
    isPaid,
    dateEnd,
    onPartsChange,
    onNeedSave,
}: PartsManagerProps) {
    const { currentTheme } = useTheme();
    const isLight = currentTheme.type === 'light';
    const queryClient = useQueryClient();
    const [showAddForm, setShowAddForm] = useState(false);
    const [isManualEntry, setIsManualEntry] = useState(false);
    const [partToDelete, setPartToDelete] = useState<Part | null>(null);
    const [editingPart, setEditingPart] = useState<Part | null>(null);
    const [editPrice, setEditPrice] = useState('');
    const [editCost, setEditCost] = useState('');
    const [currentRepairId, setCurrentRepairId] = useState(repairId);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [partSearch, setPartSearch] = useState('');

    // Form state
    const [formData, setFormData] = useState({
        partId: 0,
        supplier: '',
        name: '',
        priceUah: 0,
        costUah: 0,
    });

    // Fetch repair parts
    const { data: parts = [], isLoading, refetch: refetchParts } = useQuery({
        queryKey: ['repair-parts', currentRepairId],
        queryFn: () => warehouseApi.getRepairParts(currentRepairId),
        enabled: !!currentRepairId && currentRepairId !== 0,
    });

    // Fetch available suppliers
    const { data: availableSuppliers = [] } = useQuery({
        queryKey: ['available-suppliers'],
        queryFn: () => warehouseApi.getAvailableSuppliers(),
        enabled: showAddForm,
    });

    // Fetch warehouse items for selection
    const { data: warehouseItems = [] } = useQuery({
        queryKey: ['warehouse-items-for-repair', formData.supplier, partSearch],
        queryFn: () => warehouseApi.getWarehouseItems({
            inStock: true,
            groupByName: true,
            supplier: formData.supplier || undefined,
            search: partSearch || undefined
        }),
        enabled: showAddForm && !isManualEntry,
    });

    // Add part mutation
    const addPartMutation = useMutation({
        mutationFn: (data: typeof formData & { repairId: number }) => {
            return warehouseApi.addPartToRepair({
                partId: isManualEntry ? undefined : data.partId,
                repairId: data.repairId,
                receiptId,
                priceUah: data.priceUah,
                costUah: data.costUah,
                supplier: data.supplier,
                name: data.name,
                isPaid,
                dateEnd,
            });
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['repair-parts', variables.repairId] });
            queryClient.invalidateQueries({ queryKey: ['warehouse-items'] });
            queryClient.invalidateQueries({ queryKey: ['warehouse-items-for-repair'] });
            setShowAddForm(false);
            setIsManualEntry(false);
            setFormData({ partId: 0, supplier: '', name: '', priceUah: 0, costUah: 0 });
            onPartsChange?.();
        },
        onError: (error: any) => {
            setErrorMessage(`Помилка при додаванні товару: ${error.message || 'Невідома помилка'}`);
        },
    });

    // Remove part mutation
    const removePartMutation = useMutation({
        mutationFn: ({ partId }: { partId: number }) => {
            console.log('Removing part:', { partId });
            return warehouseApi.removePartFromRepair(partId);
        },
        onSuccess: async () => {
            console.log('Part removed successfully, invalidating queries...');
            await queryClient.invalidateQueries({ queryKey: ['repair-parts', repairId] });
            await queryClient.invalidateQueries({ queryKey: ['warehouse-items'] });
            await queryClient.invalidateQueries({ queryKey: ['warehouse-items-for-repair'] });
            if (onPartsChange) {
                console.log('Calling onPartsChange...');
                await onPartsChange();
            }
            console.log('Part deletion completed');
            setPartToDelete(null);
        },
        onError: (error: any) => {
            console.error('Error removing part:', error);
            setErrorMessage(`Помилка при видаленні товару: ${error.message || 'Невідома помилка'}`);
        },
    });

    // Update part price mutation
    const updatePartPriceMutation = useMutation({
        mutationFn: ({ partId, priceUah, costUah }: { partId: number; priceUah: number; costUah?: number }) => {
            return warehouseApi.updatePartPrice(partId, priceUah, costUah);
        },
        onSuccess: async (data) => {
            console.log('Part price updated successfully:', data);
            // Clear editing state first
            setEditingPart(null);
            setEditPrice('');
            setEditCost('');
            setErrorMessage(null);

            // Invalidate all related queries to refresh data
            await queryClient.invalidateQueries({ queryKey: ['repair-parts', repairId] });
            await queryClient.invalidateQueries({ queryKey: ['repair-parts', currentRepairId] });
            await queryClient.invalidateQueries({ queryKey: ['repair-parts'] });
            await queryClient.invalidateQueries({ queryKey: ['repair', repairId] });
            await queryClient.invalidateQueries({ queryKey: ['repairs'] });

            // Force refetch to ensure data is up to date
            await refetchParts();

            if (onPartsChange) {
                await onPartsChange();
            }
        },
        onError: (error: any) => {
            console.error('Error updating part price:', error);
            setErrorMessage(`Помилка при оновленні ціни: ${error.message || 'Невідома помилка'}`);
        },
    });

    const handleAddPart = async (e: React.FormEvent) => {
        e.preventDefault();

        // If this is a new repair (repairId === 0), auto-save first
        let actualRepairId = currentRepairId;
        if (currentRepairId === 0 && onNeedSave) {
            try {
                actualRepairId = await onNeedSave();
                setCurrentRepairId(actualRepairId);
            } catch (error) {
                console.error('Auto-save failed:', error);
                setErrorMessage('Помилка при збереженні ремонту');
                return;
            }
        }

        // Validate warehouse item selection
        if (!isManualEntry) {
            if (!formData.supplier) {
                setErrorMessage('Будь ласка, виберіть постачальника');
                return;
            }
            if (formData.partId === 0) {
                setErrorMessage('Будь ласка, виберіть товар зі складу');
                return;
            }
        }

        // Validate manual entry
        if (isManualEntry && (!formData.supplier || !formData.name)) {
            setErrorMessage('Будь ласка, заповніть всі обов\'язкові поля');
            return;
        }

        addPartMutation.mutate({ ...formData, repairId: actualRepairId });
    };

    const handleRemovePart = (part: Part) => {
        setPartToDelete(part);
    };

    const handleConfirmRemove = () => {
        if (partToDelete) {
            removePartMutation.mutate({ partId: partToDelete.id });
        }
    };

    const handleStartEdit = (part: Part) => {
        setEditingPart(part);
        // Format values with 2 decimal places for editing
        setEditPrice(part.priceUah?.toFixed(2) || '0.00');
        setEditCost(part.costUah?.toFixed(2) || '0.00');
    };

    const handleCancelEdit = () => {
        setEditingPart(null);
        setEditPrice('');
        setEditCost('');
    };

    const handleSaveEdit = () => {
        if (!editingPart) return;

        const priceValue = parseMoneyValue(normalizeMoneyInput(editPrice));
        const costValue = parseMoneyValue(normalizeMoneyInput(editCost));

        if (priceValue < 0) {
            setErrorMessage('Ціна не може бути від\'ємною');
            return;
        }

        if (costValue < 0) {
            setErrorMessage('Вхід не може бути від\'ємним');
            return;
        }

        // Round to 2 decimal places (kopiyky)
        const roundedPrice = Math.round(priceValue * 100) / 100;
        const roundedCost = Math.round(costValue * 100) / 100;

        console.log('Saving part price:', {
            partId: editingPart.id,
            priceUah: roundedPrice,
            costUah: roundedCost,
            originalPrice: editPrice,
            originalCost: editCost
        });

        updatePartPriceMutation.mutate({
            partId: editingPart.id,
            priceUah: roundedPrice,
            costUah: roundedCost
        });
    };

    const handleWarehouseItemSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const itemId = parseInt(e.target.value);
        const item = warehouseItems.find((i: Part) => i.id === itemId);
        if (item) {
            // Round to 2 decimal places (kopiyky)
            const roundedPrice = Math.round(item.costUah * 100) / 100;
            setFormData({
                partId: item.id,
                supplier: item.supplier,
                name: item.name,
                priceUah: roundedPrice,
                costUah: item.costUah,
            });
        }
    };

    const totalPartsPrice = parts.reduce((sum: number, part: Part) => sum + (part.priceUah || 0), 0);
    const totalPartsProfit = parts.reduce((sum: number, part: Part) => sum + (part.profit || 0), 0);

    return (
        <div className="p-3">
            <div className="flex items-center justify-end mb-4">
                <button
                    type="button"
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    <span className="text-base font-bold">Додати товар</span>
                </button>
            </div>

            {/* Add form */}
            {showAddForm && (
                <div className="mb-4 p-4 rounded-xl border-2 border-slate-600 bg-slate-700 shadow-lg">
                    <div className="mb-3">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isManualEntry}
                                onChange={(e) => {
                                    setIsManualEntry(e.target.checked);
                                    setFormData({ partId: 0, supplier: '', name: '', priceUah: 0, costUah: 0 });
                                }}
                                className="w-4 h-4 text-blue-600 rounded border-slate-600 bg-slate-800 focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="font-medium text-slate-300">Ручне введення (ЧипЗона/Послуга)</span>
                        </label>
                    </div>

                    <div className="space-y-3">
                        {!isManualEntry ? (
                            <>
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-slate-300">
                                        Постачальник *
                                    </label>
                                    <select
                                        value={formData.supplier}
                                        onChange={(e) => {
                                            setFormData({
                                                ...formData,
                                                supplier: e.target.value,
                                                partId: 0, // Reset part when supplier changes
                                                name: '',
                                                priceUah: 0,
                                                costUah: 0
                                            });
                                            setPartSearch(''); // Reset search when supplier changes
                                        }}
                                        className="w-full bg-slate-800 border-2 border-slate-600 rounded-lg px-4 py-2 text-base focus:outline-none focus:border-blue-500 shadow-sm text-slate-100"
                                    >
                                        <option value="" className="bg-slate-800">Виберіть постачальника...</option>
                                        {availableSuppliers.map(supplier => (
                                            <option key={supplier} value={supplier} className="bg-slate-800 text-slate-100">{supplier}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1 text-slate-300">
                                        Пошук товару (назва або код)
                                    </label>
                                    <input
                                        type="text"
                                        value={partSearch}
                                        onChange={(e) => setPartSearch(e.target.value)}
                                        disabled={!formData.supplier}
                                        placeholder={formData.supplier ? 'Введіть назву або код товару...' : 'Спочатку виберіть постачальника'}
                                        className="w-full bg-slate-800 border-2 border-slate-600 rounded-lg px-4 py-2 text-base focus:outline-none focus:border-blue-500 shadow-sm text-slate-100 placeholder-slate-500 disabled:opacity-50"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1 text-slate-300">
                                        Товар зі складу *
                                    </label>
                                    <select
                                        required
                                        value={formData.partId}
                                        onChange={handleWarehouseItemSelect}
                                        disabled={!formData.supplier}
                                        className="w-full bg-slate-800 border-2 border-slate-600 rounded-lg px-4 py-2 text-base focus:outline-none focus:border-blue-500 shadow-sm text-slate-100 disabled:opacity-50"
                                    >
                                        <option value="" className="bg-slate-800">
                                            {formData.supplier ? 'Виберіть товар...' : 'Спочатку виберіть постачальника'}
                                        </option>
                                        {warehouseItems.map((item: Part) => (
                                            <option key={item.id} value={item.id} className="bg-slate-800 text-slate-100">
                                                {item.productCode ? `[${item.productCode}] ` : ''}{item.name} - {item.costUah.toFixed(2)} грн
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </>
                        ) : (
                            <>
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-slate-300">
                                        Постачальник *
                                    </label>
                                    <select
                                        required
                                        value={formData.supplier}
                                        onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                                        className="w-full bg-slate-800 border-2 border-slate-600 rounded-lg px-4 py-2 text-base focus:outline-none focus:border-blue-500 shadow-sm text-slate-100"
                                    >
                                        <option value="" className="bg-slate-800">Виберіть...</option>
                                        <option value="ЧипЗона" className="bg-slate-800 text-slate-100">ЧипЗона</option>
                                        <option value="Послуга" className="bg-slate-800 text-slate-100">Послуга</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1 text-slate-300">
                                        Назва *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-slate-800 border-2 border-slate-600 rounded-lg px-4 py-2 text-base focus:outline-none focus:border-blue-500 shadow-sm text-slate-100"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1 text-slate-300">
                                        Вхід, грн
                                    </label>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={formData.costUah || ''}
                                        onChange={(e) => {
                                            const normalized = normalizeMoneyInput(e.target.value);
                                            const parsed = parseMoneyValue(normalized);
                                            setFormData({ ...formData, costUah: parsed });
                                        }}
                                        className="w-full bg-slate-800 border-2 border-slate-600 rounded-lg px-4 py-2 text-base focus:outline-none focus:border-blue-500 shadow-sm text-slate-100"
                                    />
                                </div>
                            </>
                        )}

                        <div>
                            <label className="block text-sm font-medium mb-1 text-slate-300">
                                Ціна продажу, грн *
                            </label>
                            <input
                                type="text"
                                inputMode="decimal"
                                required
                                value={formData.priceUah || ''}
                                onChange={(e) => {
                                    const normalized = normalizeMoneyInput(e.target.value);
                                    const parsed = parseMoneyValue(normalized);
                                    // Round to 2 decimal places (kopiyky)
                                    const rounded = Math.round(parsed * 100) / 100;
                                    setFormData({ ...formData, priceUah: rounded });
                                }}
                                className="w-full bg-slate-800 border-2 border-slate-600 rounded-lg px-4 py-2 text-base focus:outline-none focus:border-blue-500 shadow-sm text-slate-100 font-bold"
                            />
                        </div>

                        <div className="flex gap-2 justify-end">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowAddForm(false);
                                    setIsManualEntry(false);
                                    setFormData({ partId: 0, supplier: '', name: '', priceUah: 0, costUah: 0 });
                                    setPartSearch('');
                                }}
                                className="px-4 py-2 text-sm border-2 rounded-lg transition-colors border-slate-600 hover:bg-slate-700 text-slate-300"
                            >
                                Скасувати
                            </button>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleAddPart(e);
                                }}
                                disabled={addPartMutation.isPending}
                                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                {addPartMutation.isPending ? 'Додавання...' : 'Додати'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Parts list */}
            {isLoading ? (
                <p className="text-sm text-gray-500">Завантаження...</p>
            ) : parts.length === 0 ? (
                <p className="text-sm text-gray-500">Немає доданих товарів</p>
            ) : (
                <>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className={`border-b ${isLight ? 'bg-slate-200 border-slate-300' : 'bg-slate-800 border-slate-600'}`}>
                                <tr>
                                    <th className={`px-2 py-3 text-left text-sm font-bold uppercase tracking-wider w-16 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                                        Пост.
                                    </th>
                                    <th className={`px-3 py-3 text-left text-sm font-bold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                                        Назва
                                    </th>
                                    <th className={`px-3 py-3 text-right text-sm font-bold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                                        Ціна, грн
                                    </th>
                                    <th className={`px-3 py-3 text-right text-sm font-bold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                                        Вхід, грн
                                    </th>
                                    <th className={`px-3 py-3 text-right text-sm font-bold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                                        Дохід, грн
                                    </th>
                                    <th className={`px-3 py-3 text-center text-sm font-bold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>

                                        Дії
                                    </th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-700'}`}>
                                {parts.map((part: Part) => (
                                    <tr
                                        key={part.id}
                                        className={`hover:bg-gray-100/10 ${editingPart?.id === part.id ? 'bg-blue-500/10 border-l-4 border-l-blue-500' : ''}`}
                                    >
                                        <td className={`px-2 py-4 font-medium truncate max-w-[80px] ${isLight ? 'text-slate-800' : 'text-slate-100'}`} title={part.supplier}>{part.supplier}</td>
                                        <td className={`px-3 py-4 ${isLight ? 'text-slate-800' : 'text-slate-100'}`}>{part.name}</td>
                                        <td className={`px-3 py-4 text-right ${isLight ? 'text-slate-800' : 'text-slate-100'}`}>
                                            {editingPart?.id === part.id ? (
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    value={editPrice}
                                                    onChange={(e) => {
                                                        const normalized = normalizeMoneyInput(e.target.value);
                                                        setEditPrice(normalized);
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            handleSaveEdit();
                                                        } else if (e.key === 'Escape') {
                                                            handleCancelEdit();
                                                        }
                                                    }}
                                                    className={`w-28 px-2 py-1 text-right border-2 border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold ${isLight ? 'bg-white text-slate-900 border-blue-400' : 'bg-slate-700 text-slate-100 border-blue-500'
                                                        }`}
                                                    autoFocus
                                                    placeholder="0.00"
                                                />
                                            ) : (
                                                <span
                                                    className="cursor-pointer hover:text-blue-600 hover:underline font-medium"
                                                    onClick={() => handleStartEdit(part)}
                                                    title="Натисніть для редагування"
                                                >
                                                    {part.priceUah?.toFixed(2) || '0.00'}
                                                </span>
                                            )}
                                        </td>
                                        <td className={`px-3 py-4 text-right ${isLight ? 'text-slate-800' : 'text-slate-100'}`}>
                                            {editingPart?.id === part.id ? (
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    value={editCost}
                                                    onChange={(e) => {
                                                        const normalized = normalizeMoneyInput(e.target.value);
                                                        setEditCost(normalized);
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            handleSaveEdit();
                                                        } else if (e.key === 'Escape') {
                                                            handleCancelEdit();
                                                        }
                                                    }}
                                                    className={`w-28 px-2 py-1 text-right border-2 border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold ${isLight ? 'bg-white text-slate-900 border-blue-400' : 'bg-slate-700 text-slate-100 border-blue-500'
                                                        }`}
                                                    placeholder="0.00"
                                                />
                                            ) : (
                                                <span
                                                    className="cursor-pointer hover:text-blue-600 hover:underline font-medium"
                                                    onClick={() => handleStartEdit(part)}
                                                    title="Натисніть для редагування"
                                                >
                                                    {part.costUah?.toFixed(2) || '0.00'}
                                                </span>
                                            )}
                                        </td>
                                        <td className={`px-3 py-4 text-right font-medium ${isLight ? 'text-slate-800' : 'text-slate-100'}`}>
                                            {editingPart?.id === part.id ? (
                                                <span className={isLight ? 'text-green-800 font-bold' : 'text-green-400 font-semibold'}>
                                                    {((parseMoneyValue(normalizeMoneyInput(editPrice)) || 0) - (parseMoneyValue(normalizeMoneyInput(editCost)) || 0)).toFixed(2)}
                                                </span>
                                            ) : (
                                                <span className={part.profit && part.profit > 0 ? (isLight ? 'text-green-800 font-bold' : 'text-green-400 font-semibold') : ''}>
                                                    {part.profit?.toFixed(2) || '0.00'}
                                                </span>
                                            )}

                                        </td>
                                        <td className="px-3 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                {editingPart?.id === part.id ? (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={handleSaveEdit}
                                                            disabled={updatePartPriceMutation.isPending}
                                                            className="text-green-600 hover:text-green-800 disabled:opacity-50 transition-colors"
                                                            title="Зберегти (Enter)"
                                                        >
                                                            <Save className="w-5 h-5" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={handleCancelEdit}
                                                            disabled={updatePartPriceMutation.isPending}
                                                            className="text-gray-600 hover:text-gray-800 disabled:opacity-50 transition-colors"
                                                            title="Скасувати (Esc)"
                                                        >
                                                            <X className="w-5 h-5" />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleStartEdit(part)}
                                                            className="text-blue-600 hover:text-blue-800 transition-colors"
                                                            title="Редагувати ціну та вхід"
                                                        >
                                                            <Edit2 className="w-5 h-5" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemovePart(part)}
                                                            disabled={removePartMutation.isPending}
                                                            className="text-red-600 hover:text-red-800 disabled:opacity-50 transition-colors"
                                                            title="Видалити"
                                                        >
                                                            <Trash2 className="w-5 h-5" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Summary */}
                    <div className={`mt-4 pt-4 border-t ${isLight ? 'border-slate-300' : 'border-slate-700'}`}>
                        <div className="flex justify-end gap-8 text-sm">
                            <div className="text-base">
                                <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>Сума товарів:</span>
                                <span className={`ml-2 font-bold ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                                    {totalPartsPrice.toFixed(2)} грн
                                </span>
                            </div>
                            <div className="text-base">
                                <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>Дохід від товарів:</span>
                                <span className={`ml-2 font-bold ${isLight ? 'text-green-800' : 'text-green-400'}`}>
                                    {totalPartsProfit.toFixed(2)} грн
                                </span>
                            </div>
                        </div>
                    </div>

                </>
            )}

            <ConfirmationModal
                isOpen={!!partToDelete}
                onClose={() => setPartToDelete(null)}
                onConfirm={handleConfirmRemove}
                title="Видалення товару"
                message={`Ви впевнені, що хочете видалити товар "${partToDelete?.name}"?`}
                confirmLabel="Видалити"
                isDestructive={true}
                isLoading={removePartMutation.isPending}
            />

            <ConfirmationModal
                isOpen={!!errorMessage}
                onClose={() => setErrorMessage(null)}
                onConfirm={() => setErrorMessage(null)}
                title="Повідомлення"
                message={errorMessage || ''}
                confirmLabel="OK"
                isDestructive={false}
            />
        </div>
    );
}
