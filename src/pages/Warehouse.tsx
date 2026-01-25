import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { useHotkeys } from '../hooks/useHotkeys';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { warehouseApi } from '../api/warehouse';
import { settingsApi } from '../api/settings';
import { Part, WarehouseLimit } from '../types/db';
import { Package, Plus, Trash2, Search, Filter, ChevronDown, ChevronRight, Edit3, Check, RotateCcw, Save, PackageSearch } from 'lucide-react';
import { parseDFI, parseARC } from '../utils/parsers';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { DeleteItemModal } from '../components/DeleteItemModal';
import { parseMoneyValue, limitDecimalPlaces } from '../utils/formatters';
import { useTheme } from '../contexts/ThemeContext';

export default function Warehouse() {
    const { currentTheme } = useTheme();
    const isLightGray = currentTheme.id === 'light-gray';
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    useHotkeys('escape', () => {
        if (showLimitsManager) {
            setShowLimitsManager(false);
            setLimitToEdit(null);
            setNewLimitProductCode('');
            setNewLimitMinQty(1);
        } else if (showAddForm) {
            setShowAddForm(false);
            setSmartImportMode(false);
            setImportText('');
            setParsedItems([]);
        } else {
            navigate('/');
        }
    });
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [selectedSupplier, setSelectedSupplier] = useState<string>('');
    const [stockFilter, setStockFilter] = useState<'inStock' | 'sold' | 'all'>('inStock');
    const [dateArrivalStart, setDateArrivalStart] = useState<string>('');
    const [dateArrivalEnd, setDateArrivalEnd] = useState<string>('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [smartImportMode, setSmartImportMode] = useState(false);
    const [importText, setImportText] = useState('');
    const [parsedItems, setParsedItems] = useState<any[]>([]);
    const [itemToDelete, setItemToDelete] = useState<{ id: number; name: string } | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [groupItemsCache, setGroupItemsCache] = useState<Record<string, Part[]>>({});
    const [editingBarcodeId, setEditingBarcodeId] = useState<number | null>(null);
    const [barcodeValue, setBarcodeValue] = useState('');

    // Limits Management state
    const [showLimitsManager, setShowLimitsManager] = useState(false);
    const [limitToEdit, setLimitToEdit] = useState<WarehouseLimit | null>(null);
    const [newLimitProductCode, setNewLimitProductCode] = useState('');
    const [newLimitMinQty, setNewLimitMinQty] = useState(1);
    const [limitToDelete, setLimitToDelete] = useState<{ id: number; productCode: string } | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        supplier: '',
        name: '',
        priceUsd: 0,
        exchangeRate: 0,
        costUah: 0,
        dateArrival: new Date().toISOString().split('T')[0],
        invoice: '',
        productCode: '',
        quantity: 1,
        paymentType: 'Картка', // Default to Card for purchases
    });
    // Display states for money fields (to allow typing decimals)
    const [exchangeRateDisplay, setExchangeRateDisplay] = useState('');
    const [priceUsdDisplay, setPriceUsdDisplay] = useState('');
    const [costUahDisplay, setCostUahDisplay] = useState('');

    // Sync search input with search state
    useEffect(() => {
        setSearchInput(search);
    }, [search]);

    // Reset all filters
    const handleReset = () => {
        setSearch('');
        setSearchInput('');
        setSelectedSupplier('');
        setStockFilter('inStock');
        setDateArrivalStart('');
        setDateArrivalEnd('');
    };

    // Fetch warehouse items
    const { data: items = [], isLoading } = useQuery({
        queryKey: ['warehouse-items', { search, supplier: selectedSupplier, stockFilter, dateArrivalStart, dateArrivalEnd }],
        queryFn: () => warehouseApi.getWarehouseItems({
            search,
            supplier: selectedSupplier || undefined,
            stockFilter: stockFilter,
            groupByName: stockFilter === 'sold' ? false : true, // Don't group sold items to show receipt details
            dateArrivalStart: dateArrivalStart || undefined,
            dateArrivalEnd: dateArrivalEnd || undefined,
        }),
    });

    // Fetch available suppliers for filter (existing items)
    const { data: existingSuppliers = [] } = useQuery({
        queryKey: ['available-suppliers'],
        queryFn: () => warehouseApi.getAvailableSuppliers(),
    });

    // Fetch all counterparties for dropdown (from settings)
    const { data: counterparties = [] } = useQuery({
        queryKey: ['manage-suppliers'],
        queryFn: () => settingsApi.getSuppliers(),
    });

    // Add item mutation
    const addItemMutation = useMutation({
        mutationFn: (data: typeof formData) => warehouseApi.addWarehouseItem(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['warehouse-items'] });
            queryClient.invalidateQueries({ queryKey: ['warehouse-deficit-count'] });
            setShowAddForm(false);
            setFormData({
                supplier: '',
                name: '',
                priceUsd: 0,
                exchangeRate: 0,
                costUah: 0,
                dateArrival: new Date().toISOString().split('T')[0],
                invoice: '',
                productCode: '',
                quantity: 1,
                paymentType: 'Картка',
            });
            setExchangeRateDisplay('');
            setPriceUsdDisplay('');
            setCostUahDisplay('');
        },
        onError: (error: any) => {
            console.error('Error adding item:', error);
            setErrorMessage(`Помилка при додаванні товару: ${error.message}`);
        },
    });

    // Delete item mutation
    const deleteItemMutation = useMutation({
        mutationFn: ({ id, isWriteOff }: { id: number; isWriteOff: boolean }) =>
            warehouseApi.deleteWarehouseItem(id, isWriteOff),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['warehouse-items'] });
            queryClient.invalidateQueries({ queryKey: ['warehouse-deficit-count'] });
            setItemToDelete(null);
        },
        onError: (error: any) => {
            setErrorMessage(error.message || 'Помилка при видаленні товару');
        },
    });

    // Update barcode mutation
    const updateBarcodeMutation = useMutation({
        mutationFn: ({ id, barcode }: { id: number; barcode: string }) =>
            warehouseApi.updateBarcode(id, barcode),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['warehouse-items'] });
            setEditingBarcodeId(null);
            setBarcodeValue('');
            setSuccessMessage('Штрих-код успішно оновлено');
            // Also invalidate cache for any expanded group this item might belong to
            setGroupItemsCache({});
        },
        onError: (error: any) => {
            setErrorMessage(error.message || 'Помилка при оновленні штрих-коду');
        },
    });

    // Warehouse limits mutations
    const { data: warehouseLimits = [], isLoading: isLoadingLimits } = useQuery({
        queryKey: ['warehouse-limits'],
        queryFn: () => warehouseApi.getWarehouseLimits(),
    });

    const saveLimitMutation = useMutation({
        mutationFn: (data: Partial<WarehouseLimit>) => warehouseApi.saveWarehouseLimit(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['warehouse-limits'] });
            queryClient.invalidateQueries({ queryKey: ['warehouse-deficit-count'] });
            queryClient.invalidateQueries({ queryKey: ['warehouse-items'] });
            setNewLimitProductCode('');
            setNewLimitMinQty(1);
            setLimitToEdit(null);
            setSuccessMessage('Ліміт успішно збережено');
        },
    });

    const deleteLimitMutation = useMutation({
        mutationFn: (id: number) => warehouseApi.deleteWarehouseLimit(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['warehouse-limits'] });
            queryClient.invalidateQueries({ queryKey: ['warehouse-deficit-count'] });
            queryClient.invalidateQueries({ queryKey: ['warehouse-items'] });
            setLimitToDelete(null);
            setSuccessMessage('Ліміт видалено');
        },
    });

    const toggleRow = async (item: Part) => {
        const key = `${item.name}-${item.supplier}`;
        const newExpanded = new Set(expandedRows);

        if (newExpanded.has(key)) {
            newExpanded.delete(key);
        } else {
            newExpanded.add(key);
            // Fetch items for this group if not in cache or to refresh
            try {
                const items = await warehouseApi.getGroupItems(item.name, item.supplier, stockFilter);
                setGroupItemsCache(prev => ({ ...prev, [key]: items }));
            } catch (error) {
                console.error('Error fetching group items:', error);
            }
        }
        setExpandedRows(newExpanded);
    };

    const handleEditBarcode = (id: number, currentBarcode: string) => {
        setEditingBarcodeId(id);
        setBarcodeValue(currentBarcode || '');
    };

    const handleSaveBarcode = (id: number) => {
        updateBarcodeMutation.mutate({ id, barcode: barcodeValue });
    };

    const handleAddItem = (e: React.FormEvent) => {
        e.preventDefault();
        // Ensure exchange rate is parsed from display value
        const exchangeRateValue = parseMoneyValue(exchangeRateDisplay || formData.exchangeRate.toString());
        addItemMutation.mutate({
            ...formData,
            exchangeRate: exchangeRateValue
        });
    };

    const handleParseImportText = () => {
        try {
            if (!formData.supplier) {
                setErrorMessage('Будь ласка, оберіть постачальника перед розпізнаванням');
                return;
            }

            if (!importText.trim()) {
                setErrorMessage('Будь ласка, вставте дані для імпорту');
                return;
            }

            // Вибираємо парсер на основі постачальника
            let items;
            const supplierUpper = formData.supplier.toUpperCase();

            if (supplierUpper === 'DFI' || supplierUpper.includes('ИНТЕХ')) {
                console.log('Використовується парсер DFI для постачальника:', formData.supplier);
                items = parseDFI(importText);
            } else if (supplierUpper === 'ARC') {
                console.log('Використовується парсер ARC для постачальника:', formData.supplier);
                items = parseARC(importText);
            } else {
                setErrorMessage(`Розумний імпорт підтримується тільки для постачальників DFI (Интех) та ARC.\nОбраний постачальник: ${formData.supplier}`);
                return;
            }

            if (items.length === 0) {
                setErrorMessage('Не знайдено товарів для імпорту. Перевірте формат даних.');
                return;
            }

            setParsedItems(items);
        } catch (error: any) {
            console.error('Помилка розпізнавання:', error);
            setErrorMessage(`Помилка розпізнавання: ${error.message}`);
        }
    };

    const handleAddParsedItems = async () => {
        try {
            if (parsedItems.length === 0) {
                setErrorMessage('Немає товарів для додавання');
                return;
            }

            // Валідація курсу долара
            const exchangeRateValue = parseMoneyValue(exchangeRateDisplay || formData.exchangeRate.toString());
            if (!exchangeRateValue || exchangeRateValue <= 0) {
                setErrorMessage('Курс долара не може бути 0 або порожнім. Введіть коректний курс.');
                return;
            }

            // Створюємо записи для кожного товару
            const itemsToAdd = [];
            for (const item of parsedItems) {
                // Для кожного товару створюємо quantity записів
                for (let i = 0; i < item.quantity; i++) {
                    itemsToAdd.push({
                        supplier: formData.supplier,
                        name: item.name,
                        priceUsd: item.priceUsd,
                        exchangeRate: exchangeRateValue,
                        costUah: item.priceUsd * exchangeRateValue,
                        dateArrival: formData.dateArrival,
                        invoice: formData.invoice,
                        productCode: item.productCode,
                        quantity: 1, // Кожен запис - це 1 одиниця
                    });
                }
            }

            // Додаємо всі товари
            for (const itemData of itemsToAdd) {
                await warehouseApi.addWarehouseItem(itemData);
            }

            // Оновлюємо список
            queryClient.invalidateQueries({ queryKey: ['warehouse-items'] });

            setSuccessMessage(`Успішно додано ${parsedItems.length} товарів (${itemsToAdd.length} записів)`);
            setShowAddForm(false);
            setSmartImportMode(false);
            setImportText('');
            setParsedItems([]);
        } catch (error: any) {
            console.error('Помилка додавання:', error);
            setErrorMessage(`Помилка додавання: ${error.message}`);
        }
    };

    const handleDelete = (id: number, name: string) => {
        setItemToDelete({ id, name });
    };

    const handleConfirmDelete = (isWriteOff: boolean) => {
        if (itemToDelete) {
            deleteItemMutation.mutate({ id: itemToDelete.id, isWriteOff });
        }
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('uk-UA');
    };

    return (
        <div className="p-6 h-full flex flex-col overflow-hidden">
            <div className="flex-shrink-0 overflow-y-auto max-h-full mb-4 pr-2 custom-scrollbar">
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <Package className="w-8 h-8 text-blue-500" />
                            <h1 className="text-2xl font-bold text-slate-100">Склад</h1>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowLimitsManager(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors border border-slate-500/30"
                            >
                                <PackageSearch className="w-5 h-5" />
                                Ліміти складу
                            </button>
                            <button
                                onClick={() => setShowAddForm(!showAddForm)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-900/40"
                            >
                                <Plus className="w-5 h-5" />
                                Додати товар
                            </button>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className={`rounded-xl shadow-lg p-3 mb-4 border transition-all duration-300 ${isLightGray ? 'bg-gray-100 border-gray-300' : 'bg-slate-700/50 border-slate-600/50'} rainbow-groupbox`}>
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Search */}
                            <div className="relative min-w-[200px] flex-1 max-w-[300px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Пошук... (Enter)"
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && setSearch(searchInput)}
                                    className={`w-full pl-10 pr-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all border ${isLightGray ? 'bg-white border-gray-300 text-gray-900' : 'bg-slate-800/50 border-slate-600 text-slate-100'}`}
                                />
                            </div>

                            {/* Supplier filter */}
                            <div className="relative w-[210px]">
                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <select
                                    value={selectedSupplier}
                                    onChange={(e) => setSelectedSupplier(e.target.value)}
                                    className={`w-full pl-10 pr-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none text-sm border ${isLightGray ? 'bg-white border-gray-300 text-gray-900' : 'bg-slate-800/50 border-slate-600 text-slate-100'}`}
                                >
                                    <option value="">Всі постачальники</option>
                                    {existingSuppliers.map((s) => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>

                            {/* Stock filter */}
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-600/50 bg-slate-800/30">
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-tight">Стан:</span>
                                <select
                                    value={stockFilter}
                                    onChange={(e) => setStockFilter(e.target.value as any)}
                                    className="bg-transparent text-sm font-medium outline-none text-slate-100 cursor-pointer"
                                >
                                    <option value="inStock">В наявності</option>
                                    <option value="sold">Продано</option>
                                    <option value="all">Усі</option>
                                </select>
                            </div>

                            {/* Date filters */}
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-600/50 bg-slate-800/30">
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-tight">Прихід:</span>
                                <input
                                    type="date"
                                    value={dateArrivalStart}
                                    onChange={(e) => setDateArrivalStart(e.target.value)}
                                    className="bg-transparent text-sm outline-none text-slate-100 cursor-pointer w-[120px]"
                                />
                                <span className="text-slate-600">—</span>
                                <input
                                    type="date"
                                    value={dateArrivalEnd}
                                    onChange={(e) => setDateArrivalEnd(e.target.value)}
                                    className="bg-transparent text-sm outline-none text-slate-100 cursor-pointer w-[120px]"
                                />
                            </div>

                            {/* Reset button */}
                            {(search || selectedSupplier || stockFilter !== 'inStock' || dateArrivalStart || dateArrivalEnd) && (
                                <button
                                    onClick={handleReset}
                                    className="p-2 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors border border-red-400/30"
                                    title="Скинути фільтри"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Add form - Optimized Compact Layout */}
                    {showAddForm && (
                        <div className={`rounded-xl shadow-2xl p-5 mb-6 border-2 transition-all duration-500 animate-in fade-in slide-in-from-top-4 ${isLightGray ? 'bg-gray-100 border-gray-300' : 'bg-slate-700/80 border-blue-500/20 shadow-blue-500/5'}`}>
                            <div className="flex items-center justify-between mb-5">
                                <h2 className={`text-xl font-bold flex items-center gap-2 ${isLightGray ? 'text-gray-900' : 'text-slate-100'}`}>
                                    <Plus className="w-5 h-5 text-blue-500" />
                                    Додати новий захід
                                </h2>

                                {['DFI', 'ИНТЕХ', 'ARC'].some(s => formData.supplier.toUpperCase().includes(s)) && (
                                    <label className="flex items-center gap-2 cursor-pointer group bg-purple-500/10 px-3 py-1.5 rounded-lg border border-purple-500/30">
                                        <input
                                            type="checkbox"
                                            checked={smartImportMode}
                                            onChange={(e) => {
                                                setSmartImportMode(e.target.checked);
                                                if (!e.target.checked) {
                                                    setImportText('');
                                                    setParsedItems([]);
                                                }
                                            }}
                                            className="w-4 h-4 text-purple-500 rounded border-purple-500/50 bg-slate-800"
                                        />
                                        <span className="text-sm font-semibold text-purple-400">Розумний імпорт</span>
                                    </label>
                                )}
                            </div>

                            <form onSubmit={handleAddItem} className="space-y-6">
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-10 gap-x-4 gap-y-3">
                                    <div className="lg:col-span-2">
                                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Постачальник *</label>
                                        <select
                                            required
                                            value={formData.supplier}
                                            onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                                            className={`w-full px-3 py-2 rounded-lg border outline-none text-sm font-medium ${isLightGray ? 'bg-white border-gray-300 text-gray-900' : 'bg-slate-800 border-slate-600 text-slate-100 focus:border-blue-500'}`}
                                        >
                                            <option value="">Оберіть...</option>
                                            {counterparties.map((s: any) => <option key={s.ID} value={s.Name}>{s.Name}</option>)}
                                        </select>
                                    </div>

                                    <div className="lg:col-span-1">
                                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Накладна</label>
                                        <input
                                            type="text"
                                            value={formData.invoice}
                                            onChange={(e) => setFormData({ ...formData, invoice: e.target.value })}
                                            className={`w-full px-3 py-2 rounded-lg border outline-none text-sm ${isLightGray ? 'bg-white border-gray-300 text-gray-900' : 'bg-slate-800 border-slate-600 text-slate-100 focus:border-blue-500'}`}
                                        />
                                    </div>

                                    <div className="lg:col-span-1">
                                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Курс *</label>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            required
                                            value={exchangeRateDisplay}
                                            onChange={(e) => {
                                                const filtered = limitDecimalPlaces(e.target.value, 2);
                                                setExchangeRateDisplay(filtered);
                                                const rate = parseMoneyValue(filtered);
                                                const newCostUah = formData.priceUsd * rate;
                                                setFormData({ ...formData, exchangeRate: rate, costUah: newCostUah });
                                                setCostUahDisplay(newCostUah > 0 ? newCostUah.toFixed(2) : '');
                                            }}
                                            className={`w-full px-3 py-2 rounded-lg border outline-none text-sm font-bold ${isLightGray ? 'bg-white border-gray-300 text-gray-900' : 'bg-slate-800 border-slate-600 text-blue-400 focus:border-blue-500'}`}
                                        />
                                    </div>

                                    <div className="lg:col-span-3">
                                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Назва товару *</label>
                                        <input
                                            type="text"
                                            required={!smartImportMode}
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            disabled={smartImportMode}
                                            className={`w-full px-3 py-2 rounded-lg border outline-none text-sm ${isLightGray ? 'bg-white border-gray-300 text-gray-900' : 'bg-slate-800 border-slate-600 text-slate-100 focus:border-blue-500 disabled:opacity-40'}`}
                                        />
                                    </div>

                                    <div className="lg:col-span-1">
                                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Ціна, $</label>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            value={priceUsdDisplay}
                                            onChange={(e) => {
                                                const filtered = limitDecimalPlaces(e.target.value, 2);
                                                setPriceUsdDisplay(filtered);
                                                const parsed = parseMoneyValue(filtered);
                                                setFormData({ ...formData, priceUsd: parsed, costUah: parsed * formData.exchangeRate });
                                            }}
                                            disabled={smartImportMode}
                                            className={`w-full px-3 py-2 rounded-lg border outline-none text-sm ${isLightGray ? 'bg-white border-gray-300 text-gray-900' : 'bg-slate-800 border-slate-600 text-slate-100 focus:border-blue-500 disabled:opacity-40'}`}
                                        />
                                    </div>

                                    <div className="lg:col-span-1">
                                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Вхід, грн</label>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            value={costUahDisplay}
                                            onChange={(e) => {
                                                const filtered = limitDecimalPlaces(e.target.value, 2);
                                                setCostUahDisplay(filtered);
                                                const parsed = parseMoneyValue(filtered);
                                                setFormData({ ...formData, costUah: parsed });
                                            }}
                                            className={`w-full px-3 py-2 rounded-lg border outline-none text-sm font-bold ${isLightGray ? 'bg-white border-gray-300 text-gray-900' : 'bg-slate-800 border-slate-600 text-green-400 focus:border-blue-500'}`}
                                        />
                                    </div>

                                    <div className="lg:col-span-1">
                                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">К-сть</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={formData.quantity}
                                            onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                                            disabled={smartImportMode}
                                            className={`w-full px-3 py-2 rounded-lg border outline-none text-sm ${isLightGray ? 'bg-white border-gray-300 text-gray-900' : 'bg-slate-800 border-slate-600 text-slate-100 focus:border-blue-500 disabled:opacity-40'}`}
                                        />
                                    </div>
                                </div>

                                {smartImportMode && (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4 rounded-xl border-2 border-purple-500/20 bg-purple-500/5">
                                        <div className="space-y-3">
                                            <label className="block text-[11px] font-bold text-purple-400 uppercase tracking-widest">Текст для імпорту</label>
                                            <textarea
                                                value={importText}
                                                onChange={(e) => setImportText(e.target.value)}
                                                placeholder="Вставте дані з накладної тут..."
                                                className="w-full h-48 bg-slate-800/80 border border-purple-500/30 rounded-lg p-3 text-sm font-mono text-slate-200 outline-none focus:border-purple-500/50"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleParseImportText}
                                                className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold shadow-lg shadow-purple-900/40 transition-all flex items-center justify-center gap-2"
                                            >
                                                Розпізнати вміст
                                            </button>
                                        </div>

                                        <div className="flex flex-col h-full">
                                            <label className="block text-[11px] font-bold text-purple-400 uppercase tracking-widest mb-3">Результати парсингу</label>
                                            <div className="flex-1 min-h-[240px] border border-purple-500/30 rounded-lg bg-slate-800/80 overflow-hidden flex flex-col">
                                                {parsedItems.length > 0 ? (
                                                    <div className="overflow-auto flex-1 text-xs">
                                                        <table className="w-full text-left">
                                                            <thead className="sticky top-0 bg-slate-900 text-slate-400 shadow-sm">
                                                                <tr>
                                                                    <th className="p-2 border-b border-white/5">Код</th>
                                                                    <th className="p-2 border-b border-white/5">Назва</th>
                                                                    <th className="p-2 border-b border-white/5 text-center">К-сть</th>
                                                                    <th className="p-2 border-b border-white/5 text-right">Ціна $</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-white/5">
                                                                {parsedItems.map((item, i) => (
                                                                    <tr key={i} className="hover:bg-white/5 text-slate-300">
                                                                        <td className="p-2">{item.productCode}</td>
                                                                        <td className="p-2 truncate max-w-[200px]">{item.name}</td>
                                                                        <td className="p-2 text-center font-bold">{item.quantity}</td>
                                                                        <td className="p-2 text-right text-blue-400">{item.priceUsd.toFixed(2)}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                ) : (
                                                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500 italic p-4 text-center">
                                                        Вставте текст зліва та натисніть "Розпізнати", щоб побачити список товарів тут
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center justify-between pt-4 border-t border-slate-600/30">
                                    <div className="flex items-center gap-6">
                                        <div className="flex items-center gap-4 bg-slate-800/40 px-4 py-2 rounded-xl border border-slate-600/50">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-tight">Оплата:</span>
                                            <div className="flex gap-4">
                                                {['Готівка', 'Картка'].map(type => (
                                                    <label key={type} className="flex items-center gap-2 cursor-pointer group">
                                                        <input
                                                            type="radio"
                                                            name="paymentType"
                                                            value={type}
                                                            checked={formData.paymentType === type}
                                                            onChange={(e) => setFormData({ ...formData, paymentType: e.target.value })}
                                                            className="w-4 h-4 text-blue-500 border-slate-600 bg-slate-800"
                                                        />
                                                        <span className={`text-sm font-medium ${formData.paymentType === type ? 'text-slate-100' : 'text-slate-400 group-hover:text-slate-200'} transition-all`}>{type}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 bg-slate-800/40 px-4 py-2 rounded-xl border border-slate-600/50">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-tight">Дата:</span>
                                            <input
                                                type="date"
                                                value={formData.dateArrival}
                                                onChange={(e) => setFormData({ ...formData, dateArrival: e.target.value })}
                                                className="bg-transparent text-sm outline-none text-slate-100 font-medium cursor-pointer"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowAddForm(false);
                                                setSmartImportMode(false);
                                                setImportText('');
                                                setParsedItems([]);
                                            }}
                                            className={`px-6 py-2.5 rounded-xl font-bold transition-all border-2 ${isLightGray ? 'border-gray-300 hover:bg-gray-200 text-gray-700' : 'border-slate-600 hover:bg-slate-600 text-slate-300'}`}
                                        >
                                            Скасувати
                                        </button>
                                        {smartImportMode && parsedItems.length > 0 ? (
                                            <button
                                                type="button"
                                                onClick={handleAddParsedItems}
                                                className="px-8 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold shadow-lg shadow-green-900/40 transition-all flex items-center gap-2"
                                            >
                                                <Check className="w-5 h-5" />
                                                Додати все на склад ({parsedItems.length})
                                            </button>
                                        ) : !smartImportMode ? (
                                            <button
                                                type="submit"
                                                disabled={addItemMutation.isPending}
                                                className="px-8 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-900/40 transition-all disabled:opacity-50 flex items-center gap-2"
                                            >
                                                {addItemMutation.isPending ? <RotateCcw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                                {addItemMutation.isPending ? 'Додавання...' : 'Додати на склад'}
                                            </button>
                                        ) : null}
                                    </div>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </div>

            {/* Items table */}
            <div className="bg-slate-700 rounded-lg shadow-sm border border-slate-600 flex flex-col flex-1 overflow-hidden rainbow-groupbox">
                <div className="overflow-auto flex-1 relative">
                    <table className="w-full border-collapse">
                        <colgroup>
                            <col style={{ width: '120px' }} />
                            <col style={{ width: '150px' }} />
                            <col style={{ width: '120px' }} />
                            <col style={{ width: '180px' }} />
                            {stockFilter === 'sold' && <col style={{ width: '100px' }} />}
                            <col />
                            <col style={{ width: '100px' }} />
                            <col style={{ width: '100px' }} />
                            <col style={{ width: '100px' }} />
                            <col style={{ width: '120px' }} />
                            <col style={{ width: '100px' }} />
                        </colgroup>
                        <thead
                            className="sticky top-0 z-20 font-medium shadow-sm"
                            style={{
                                backgroundColor: 'var(--theme-surface-secondary)',
                                color: 'var(--theme-text-secondary)',
                            }}
                        >
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                                    Дата приходу
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                                    Постачальник
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                                    Накладна
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                                    Код товару / Штрих-код
                                </th>
                                {stockFilter === 'sold' && (
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                                        Квитанція
                                    </th>
                                )}
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                                    Назва товару
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">
                                    Кількість
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">
                                    Ціна, $
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">
                                    Курс
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">
                                    Вхід, грн
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">
                                    Дії
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-600">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={stockFilter === 'sold' ? 11 : 10} className="px-4 py-8 text-center text-slate-400">
                                        Завантаження...
                                    </td>
                                </tr>
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan={stockFilter === 'sold' ? 11 : 10} className="px-4 py-8 text-center text-slate-400">
                                        Товари не знайдено
                                    </td>
                                </tr>
                            ) : (
                                items.map((itemValue: Part, index: number) => {
                                    const item = itemValue as any; // Using any for extended properties from backend grouping
                                    const groupKey = `${item.name}-${item.supplier}`;
                                    const isExpanded = expandedRows.has(groupKey);
                                    const subItems = groupItemsCache[groupKey] || [];
                                    const hasQuantity = item.quantity > 1;

                                    return (
                                        <React.Fragment key={item.id}>
                                            <tr className={index % 2 === 0 ? 'bg-slate-700/50' : 'bg-slate-700'}>
                                                <td className="px-4 py-3 text-sm text-slate-200">
                                                    {formatDate(item.dateArrival)}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-200">
                                                    {item.supplier}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-200">
                                                    {(!hasQuantity && item.invoice) ? item.invoice : '-'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-200">
                                                    <div className="flex items-center gap-2">
                                                        <span>{item.productCode || '-'}</span>
                                                        {!hasQuantity && (
                                                            editingBarcodeId === item.id ? (
                                                                <div className="flex items-center gap-1">
                                                                    <input
                                                                        autoFocus
                                                                        type="text"
                                                                        value={barcodeValue}
                                                                        onChange={(e) => setBarcodeValue(e.target.value)}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') handleSaveBarcode(item.id);
                                                                            if (e.key === 'Escape') setEditingBarcodeId(null);
                                                                        }}
                                                                        className="bg-slate-900 border border-blue-500 rounded px-2 py-0.5 text-xs text-white w-24"
                                                                    />
                                                                    <button onClick={() => handleSaveBarcode(item.id)} className="text-green-400 hover:text-green-300">
                                                                        <Check className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    <button onClick={() => setEditingBarcodeId(null)} className="text-red-400 hover:text-red-300">
                                                                        <RotateCcw className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-1">
                                                                    {item.barcode && <span className="text-xs text-slate-400">/ {item.barcode}</span>}
                                                                    <button
                                                                        onClick={() => handleEditBarcode(item.id, item.barcode || '')}
                                                                        className="text-slate-500 hover:text-blue-400 transition-colors ml-1"
                                                                        title="Змінити штрих-код"
                                                                    >
                                                                        <Edit3 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            )
                                                        )}
                                                        {hasQuantity && (
                                                            <span className="text-xs text-blue-400 italic">(Група)</span>
                                                        )}
                                                    </div>
                                                </td>
                                                {stockFilter === 'sold' && (
                                                    <td className="px-4 py-3 text-sm text-slate-200">
                                                        {item.receiptId ? `#${item.receiptId}` : '-'}
                                                    </td>
                                                )}
                                                <td className="px-4 py-3 text-sm text-slate-200">
                                                    <div className="flex items-center gap-2">
                                                        {hasQuantity && (
                                                            <button
                                                                onClick={() => toggleRow(item)}
                                                                className="p-0.5 hover:bg-slate-600 rounded transition-colors"
                                                            >
                                                                {isExpanded ? (
                                                                    <ChevronDown className="w-4 h-4 text-blue-400" />
                                                                ) : (
                                                                    <ChevronRight className="w-4 h-4 text-slate-400" />
                                                                )}
                                                            </button>
                                                        )}
                                                        {item.name}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-200 text-center font-medium">
                                                    <div className="flex flex-col items-center gap-0.5">
                                                        <span className={clsx(
                                                            item.minQuantity > 0 && item.quantity < item.minQuantity && "text-red-400 font-bold"
                                                        )}>
                                                            {item.quantity || 1}
                                                        </span>
                                                        {item.minQuantity > 0 && item.quantity < item.minQuantity && (
                                                            <span className="text-[10px] text-red-500/80 font-semibold leading-none" title={`Мінімально потрібно: ${item.minQuantity}`}>
                                                                (мін {item.minQuantity})
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-200 text-right">
                                                    {item.priceUsd?.toFixed(2) || '0.00'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-200 text-right">
                                                    {item.exchangeRate?.toFixed(2) || '0.00'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-200 text-right">
                                                    {item.costUah?.toFixed(2) || '0.00'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        {item.productCode && (
                                                            <button
                                                                onClick={() => {
                                                                    setNewLimitProductCode(item.productCode);
                                                                    setNewLimitMinQty(item.minQuantity || 1);
                                                                    setShowLimitsManager(true);
                                                                }}
                                                                className="text-blue-400 hover:text-blue-300"
                                                                title="Встановити ліміт"
                                                            >
                                                                <PackageSearch className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        {item.inStock && !hasQuantity && (
                                                            <button
                                                                onClick={() => handleDelete(item.id, item.name)}
                                                                disabled={deleteItemMutation.isPending}
                                                                className="text-red-400 hover:text-red-300 disabled:opacity-50"
                                                                title="Видалити"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                            {isExpanded && subItems.map((subItem: Part) => (
                                                <tr key={`sub-${subItem.id}`} className="bg-slate-800/40 border-l-4 border-blue-500/70">
                                                    <td className="px-4 py-2 text-[11px] text-slate-400 italic">
                                                        {formatDate(subItem.dateArrival)}
                                                    </td>
                                                    <td className="px-4 py-2 text-[11px] text-slate-500">
                                                        {subItem.supplier}
                                                    </td>
                                                    <td className="px-4 py-2 text-[11px] text-slate-300">
                                                        {subItem.invoice || '-'}
                                                    </td>
                                                    <td className="px-4 py-2 text-[11px] text-slate-300">
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-slate-500 font-mono">{subItem.productCode || '-'}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {editingBarcodeId === subItem.id ? (
                                                                    <div className="flex items-center gap-1">
                                                                        <input
                                                                            autoFocus
                                                                            type="text"
                                                                            value={barcodeValue}
                                                                            onChange={(e) => setBarcodeValue(e.target.value)}
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === 'Enter') handleSaveBarcode(subItem.id);
                                                                                if (e.key === 'Escape') setEditingBarcodeId(null);
                                                                            }}
                                                                            className="bg-slate-900 border border-blue-500 rounded px-2 py-0.5 text-[11px] text-white w-28"
                                                                        />
                                                                        <button onClick={() => handleSaveBarcode(subItem.id)} className="text-green-400 hover:text-green-300">
                                                                            <Check className="w-3 h-3" />
                                                                        </button>
                                                                        <button onClick={() => setEditingBarcodeId(null)} className="text-red-400 hover:text-red-300">
                                                                            <RotateCcw className="w-3 h-3" />
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center gap-1">
                                                                        <span className="font-mono text-slate-400">{subItem.barcode || <span className="text-slate-600 italic">немає</span>}</span>
                                                                        <button
                                                                            onClick={() => handleEditBarcode(subItem.id, subItem.barcode || '')}
                                                                            className="text-slate-500 hover:text-blue-400 transition-colors ml-1"
                                                                            title="Змінити штрих-код"
                                                                        >
                                                                            <Edit3 className="w-3 h-3" />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    {stockFilter === 'sold' && (
                                                        <td className="px-4 py-2 text-[11px] text-slate-300">
                                                            {subItem.receiptId ? `#${subItem.receiptId}` : '-'}
                                                        </td>
                                                    )}
                                                    <td className="px-4 py-2 text-[11px] text-slate-300 italic">
                                                        {subItem.name}
                                                    </td>
                                                    <td className="px-4 py-2 text-center text-[11px] text-slate-500">
                                                        1
                                                    </td>
                                                    <td className="px-4 py-2 text-right text-[11px] text-slate-400">
                                                        {subItem.priceUsd?.toFixed(2)}
                                                    </td>
                                                    <td className="px-4 py-2 text-right text-[11px] text-slate-400">
                                                        {subItem.exchangeRate?.toFixed(2)}
                                                    </td>
                                                    <td className="px-4 py-2 text-right text-[11px] text-slate-400 font-medium">
                                                        {subItem.costUah?.toFixed(2)}
                                                    </td>
                                                    <td className="px-4 py-2 text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            {subItem.inStock && (
                                                                <button
                                                                    onClick={() => handleDelete(subItem.id, subItem.name)}
                                                                    className="text-red-500/50 hover:text-red-400 p-1"
                                                                    title="Видалити одиницю"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Summary */}
                <div className="bg-slate-700/50 px-4 py-3 border-t border-slate-600">
                    <p className="text-sm text-slate-400">
                        Всього товарів: <span className="font-semibold text-slate-200">{items.length}</span>
                    </p>
                </div>
            </div>

            {/* Warehouse Limits Manager Modal */}
            {showLimitsManager && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-in fade-in duration-200">
                    <div className="bg-slate-800 rounded-2xl p-6 max-w-2xl w-full mx-4 border border-slate-600 shadow-2xl flex flex-col max-h-[85vh]">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                                <PackageSearch className="w-6 h-6 text-blue-400" />
                                Управління лімітами складу
                            </h2>
                            <button onClick={() => {
                                setShowLimitsManager(false);
                                setLimitToEdit(null);
                                setNewLimitProductCode('');
                                setNewLimitMinQty(1);
                            }} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
                                <RotateCcw className="w-6 h-6 text-slate-400" />
                            </button>
                        </div>

                        <div className="bg-slate-700/50 rounded-xl p-4 border border-slate-600 mb-6">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">
                                {limitToEdit ? 'Редагувати ліміт' : 'Додати новий ліміт'}
                            </h3>
                            <div className="flex flex-wrap gap-3">
                                <div className="flex-1 min-w-[200px]">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Артикул (Код товару)</label>
                                    <input
                                        type="text"
                                        value={newLimitProductCode}
                                        onChange={(e) => setNewLimitProductCode(e.target.value)}
                                        placeholder="Наприклад: 12345"
                                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                                    />
                                </div>
                                <div className="w-32">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Мін. к-сть</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={newLimitMinQty}
                                        onChange={(e) => setNewLimitMinQty(parseInt(e.target.value) || 1)}
                                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                                    />
                                </div>
                                <div className="flex items-end">
                                    <button
                                        onClick={() => {
                                            if (!newLimitProductCode.trim()) return;
                                            saveLimitMutation.mutate({
                                                id: limitToEdit?.id,
                                                productCode: newLimitProductCode.trim(),
                                                minQuantity: newLimitMinQty
                                            });
                                        }}
                                        disabled={saveLimitMutation.isPending || !newLimitProductCode.trim()}
                                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-all disabled:opacity-50"
                                    >
                                        {limitToEdit ? 'Оновити' : 'Додати'}
                                    </button>
                                    {limitToEdit && (
                                        <button
                                            onClick={() => {
                                                setLimitToEdit(null);
                                                setNewLimitProductCode('');
                                                setNewLimitMinQty(1);
                                            }}
                                            className="ml-2 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg font-bold transition-all"
                                        >
                                            Скасувати
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto custom-scrollbar">
                            <table className="w-full text-left">
                                <thead className="sticky top-0 bg-slate-800 text-slate-400 text-xs font-bold uppercase tracking-widest border-b border-slate-700">
                                    <tr>
                                        <th className="px-4 py-3">Артикул</th>
                                        <th className="px-4 py-3 text-center">Мін. кількість</th>
                                        <th className="px-4 py-3 text-right">Дії</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700">
                                    {isLoadingLimits ? (
                                        <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-500">Завантаження...</td></tr>
                                    ) : warehouseLimits.length === 0 ? (
                                        <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-500">Ліміти не встановлено</td></tr>
                                    ) : (
                                        warehouseLimits.map((limit: WarehouseLimit) => (
                                            <tr key={limit.id} className="hover:bg-slate-700/30 group">
                                                <td className="px-4 py-3 text-slate-200 font-medium">{limit.productCode}</td>
                                                <td className="px-4 py-3 text-center text-blue-400 font-bold">{limit.minQuantity} од.</td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => {
                                                                setLimitToEdit(limit);
                                                                setNewLimitProductCode(limit.productCode);
                                                                setNewLimitMinQty(limit.minQuantity);
                                                            }}
                                                            className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-600 rounded transition-all"
                                                        >
                                                            <Edit3 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => setLimitToDelete({ id: limit.id, productCode: limit.productCode })}
                                                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-600 rounded transition-all"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={!!limitToDelete}
                onClose={() => setLimitToDelete(null)}
                onConfirm={() => limitToDelete && deleteLimitMutation.mutate(limitToDelete.id)}
                title="Видалити ліміт?"
                message={`Ви впевнені, що хочете видалити ліміт для артикулу "${limitToDelete?.productCode}"?`}
                confirmLabel="Видалити"
                isDestructive={true}
                isLoading={deleteLimitMutation.isPending}
            />

            <DeleteItemModal
                isOpen={!!itemToDelete}
                onClose={() => setItemToDelete(null)}
                onConfirm={handleConfirmDelete}
                itemName={itemToDelete?.name || ''}
                isLoading={deleteItemMutation.isPending}
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

            <ConfirmationModal
                isOpen={!!successMessage}
                onClose={() => setSuccessMessage(null)}
                onConfirm={() => setSuccessMessage(null)}
                title="Успіх"
                message={successMessage || ''}
                confirmLabel="OK"
                isDestructive={false}
            />
        </div>
    );
}
