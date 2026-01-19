import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHotkeys } from '../hooks/useHotkeys';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { warehouseApi } from '../api/warehouse';
import { settingsApi } from '../api/settings';
import { Part } from '../types/db';
import { Package, Plus, Trash2, Search, Filter, X, ChevronDown, ChevronRight, Edit3, Check, RotateCcw } from 'lucide-react';
import { parseDFI, parseARC } from '../utils/parsers';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { DeleteItemModal } from '../components/DeleteItemModal';
import { normalizeMoneyInput, parseMoneyValue, limitDecimalPlaces } from '../utils/formatters';
import { useTheme } from '../contexts/ThemeContext';

export default function Warehouse() {
    const { currentTheme } = useTheme();
    const isLightGray = currentTheme.id === 'light-gray';
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    useHotkeys('escape', () => {
        if (showAddForm) {
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
                        <button
                            onClick={() => setShowAddForm(!showAddForm)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                            Додати товар
                        </button>
                    </div>

                    {/* Filters */}
                    <div className={`rounded-lg shadow-sm p-4 mb-4 border rainbow-groupbox ${isLightGray ? 'bg-gray-100 border-gray-300' : 'bg-slate-700 border-slate-600'}`}>
                        <div className="flex flex-wrap items-center gap-4">
                            {/* Search - reduced width */}
                            <div className="relative w-[180px]">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Пошук... (Enter)"
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            setSearch(searchInput);
                                        }
                                    }}
                                    className={`w-full pl-10 pr-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm border ${isLightGray ? 'bg-white border-gray-300 text-gray-900' : 'bg-slate-800 border-slate-600 text-slate-100 placeholder-slate-400'}`}
                                />
                            </div>

                            {/* Supplier filter - reduced width */}
                            <div className="relative w-[198px]">
                                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <select
                                    value={selectedSupplier}
                                    onChange={(e) => setSelectedSupplier(e.target.value)}
                                    className={`w-full pl-10 pr-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none text-sm border ${isLightGray ? 'bg-white border-gray-300 text-gray-900' : 'bg-slate-800 border-slate-600 text-slate-100'}`}
                                >
                                    <option value="" className={isLightGray ? '' : 'bg-slate-800'}>Всі постачальники</option>
                                    {existingSuppliers.map((supplier) => (
                                        <option key={supplier} value={supplier} className={isLightGray ? '' : 'bg-slate-800'}>
                                            {supplier}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Stock filter */}
                            <div className="flex items-center gap-2">
                                <label htmlFor="stockFilter" className={`text-sm font-medium ${isLightGray ? 'text-gray-700' : 'text-slate-300'}`}>
                                    Стан:
                                </label>
                                <select
                                    id="stockFilter"
                                    value={stockFilter}
                                    onChange={(e) => setStockFilter(e.target.value as 'inStock' | 'sold' | 'all')}
                                    className={`px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm border ${isLightGray ? 'bg-white border-gray-300 text-gray-900' : 'bg-slate-800 border-slate-600 text-slate-100'}`}
                                >
                                    <option value="inStock" className={isLightGray ? '' : 'bg-slate-800'}>В наявності</option>
                                    <option value="sold" className={isLightGray ? '' : 'bg-slate-800'}>Продано</option>
                                    <option value="all" className={isLightGray ? '' : 'bg-slate-800'}>Усі</option>
                                </select>
                            </div>

                            {/* Date arrival filters */}
                            <div className="flex items-center gap-2">
                                <label className="text-sm text-slate-400">Дата приходу:</label>
                                <input
                                    type="date"
                                    value={dateArrivalStart}
                                    onChange={(e) => setDateArrivalStart(e.target.value)}
                                    className={`border rounded px-2 py-1 text-sm ${isLightGray ? 'bg-white border-gray-300 text-gray-900' : 'bg-slate-800 border-slate-600 text-slate-100'}`}
                                />
                                <span className="text-slate-400">-</span>
                                <input
                                    type="date"
                                    value={dateArrivalEnd}
                                    onChange={(e) => setDateArrivalEnd(e.target.value)}
                                    className={`border rounded px-2 py-1 text-sm ${isLightGray ? 'bg-white border-gray-300 text-gray-900' : 'bg-slate-800 border-slate-600 text-slate-100'}`}
                                />
                            </div>
                        </div>
                        {/* Reset filters button */}
                        {(search || selectedSupplier || stockFilter !== 'inStock' || dateArrivalStart || dateArrivalEnd) && (
                            <div className="mt-4 pt-4 border-t border-slate-600">
                                <button
                                    onClick={handleReset}
                                    className="px-4 py-2 rounded-lg text-sm font-semibold border-2 border-red-500/70 bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:border-red-500 hover:text-red-300 transition-all flex items-center gap-2 shadow-lg shadow-red-500/20"
                                >
                                    <X className="w-4 h-4" />
                                    Скинути фільтри
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Add form */}
                    {showAddForm && (
                        <div className={`rounded-lg shadow-sm p-6 mb-6 border rainbow-groupbox ${isLightGray ? 'bg-gray-100 border-gray-300' : 'bg-slate-700 border-slate-600'}`}>
                            <h2 className={`text-lg font-semibold mb-4 ${isLightGray ? 'text-gray-900' : 'text-slate-100'}`}>Додати новий товар</h2>
                            <form onSubmit={handleAddItem} className="grid grid-cols-1 md:grid-cols-8 gap-4">
                                <div className="md:col-span-1">
                                    <label className={`block text-sm font-medium mb-1 ${isLightGray ? 'text-gray-700' : 'text-slate-300'}`}>
                                        Постачальник *
                                    </label>
                                    <select
                                        required
                                        value={formData.supplier}
                                        onChange={(e) => {
                                            const newSupplier = e.target.value;
                                            setFormData({ ...formData, supplier: newSupplier });
                                            // Reset smart import mode if supplier is not supported
                                            if (!['DFI', 'ИНТЕХ', 'ARC'].some(s => newSupplier.toUpperCase().includes(s))) {
                                                setSmartImportMode(false);
                                                setImportText('');
                                                setParsedItems([]);
                                            }
                                        }}
                                        className={`w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent border ${isLightGray ? 'bg-white border-gray-300 text-gray-900' : 'bg-slate-800 border-slate-600 text-slate-100'}`}
                                    >
                                        <option value="" className={isLightGray ? '' : 'bg-slate-800'}>Оберіть постачальника</option>
                                        {counterparties.map((supplier: { ID: number; Name: string }) => (
                                            <option key={supplier.ID} value={supplier.Name} className={isLightGray ? '' : 'bg-slate-800'}>
                                                {supplier.Name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="md:col-span-1">
                                    <label className={`block text-sm font-medium mb-1 ${isLightGray ? 'text-gray-700' : 'text-slate-300'}`}>
                                        Накладна
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.invoice}
                                        onChange={(e) => setFormData({ ...formData, invoice: e.target.value })}
                                        className={`w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent border ${isLightGray ? 'bg-white border-gray-300 text-gray-900' : 'bg-slate-800 border-slate-600 text-slate-100'}`}
                                    />
                                </div>

                                <div className="md:col-span-1">
                                    <label className={`block text-sm font-medium mb-1 ${isLightGray ? 'text-gray-700' : 'text-slate-300'}`}>
                                        Курс *
                                    </label>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        required
                                        value={exchangeRateDisplay}
                                        onChange={(e) => {
                                            // Фільтруємо введення - тільки цифри, крапка та кома
                                            const filtered = limitDecimalPlaces(e.target.value, 2);
                                            setExchangeRateDisplay(filtered);
                                            const rate = parseMoneyValue(filtered);
                                            const newCostUah = formData.priceUsd * rate;
                                            setFormData({
                                                ...formData,
                                                exchangeRate: rate,
                                                costUah: newCostUah,
                                            });
                                            setCostUahDisplay(newCostUah > 0 ? newCostUah.toFixed(2) : '');
                                        }}
                                        onBlur={(e) => {
                                            // Round to 2 decimal places on blur
                                            const normalized = normalizeMoneyInput(e.target.value);
                                            const rate = parseMoneyValue(normalized);
                                            const rounded = Math.round(rate * 100) / 100;
                                            const newCostUah = formData.priceUsd * rounded;
                                            setFormData({
                                                ...formData,
                                                exchangeRate: rounded,
                                                costUah: newCostUah,
                                            });
                                            setExchangeRateDisplay(rounded > 0 ? rounded.toFixed(2) : '');
                                            setCostUahDisplay(newCostUah > 0 ? newCostUah.toFixed(2) : '');
                                        }}
                                        className={`w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent border ${isLightGray ? 'bg-white border-gray-300 text-gray-900' : 'bg-slate-800 border-slate-600 text-slate-100 font-medium'}`}
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className={`block text-sm font-medium mb-1 ${isLightGray ? 'text-gray-700' : 'text-slate-300'}`}>
                                        Назва товару *
                                    </label>
                                    <input
                                        type="text"
                                        required={!smartImportMode}
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        disabled={smartImportMode}
                                        className={`w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent border ${isLightGray ? 'bg-white border-gray-300 text-gray-900' : 'bg-slate-800 border-slate-600 text-slate-100'} disabled:opacity-50`}
                                    />
                                </div>

                                <div className="md:col-span-1">
                                    <label className={`block text-sm font-medium mb-1 ${isLightGray ? 'text-gray-700' : 'text-slate-300'}`}>
                                        Ціна, $
                                    </label>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={priceUsdDisplay}
                                        onChange={(e) => {
                                            // Фільтруємо введення - тільки цифри, крапка та кома
                                            const filtered = limitDecimalPlaces(e.target.value, 2);
                                            setPriceUsdDisplay(filtered);
                                            const parsed = parseMoneyValue(filtered);
                                            setFormData({
                                                ...formData,
                                                priceUsd: parsed,
                                                costUah: parsed * formData.exchangeRate
                                            });
                                        }}
                                        onBlur={(e) => {
                                            // Round to 2 decimal places on blur
                                            const normalized = normalizeMoneyInput(e.target.value);
                                            const parsed = parseMoneyValue(normalized);
                                            const rounded = Math.round(parsed * 100) / 100;
                                            setFormData({
                                                ...formData,
                                                priceUsd: rounded,
                                                costUah: rounded * formData.exchangeRate
                                            });
                                            setPriceUsdDisplay(rounded > 0 ? rounded.toFixed(2) : '');
                                        }}
                                        disabled={smartImportMode}
                                        className={`w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent border ${isLightGray ? 'bg-white border-gray-300 text-gray-900' : 'bg-slate-800 border-slate-600 text-slate-100'} disabled:opacity-50`}
                                    />
                                </div>

                                <div className="md:col-span-1">
                                    <label className={`block text-sm font-medium mb-1 ${isLightGray ? 'text-gray-700' : 'text-slate-300'}`}>
                                        Вхід, грн
                                    </label>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={costUahDisplay}
                                        onChange={(e) => {
                                            // Фільтруємо введення - тільки цифри, крапка та кома
                                            const filtered = limitDecimalPlaces(e.target.value, 2);
                                            setCostUahDisplay(filtered);
                                            const parsed = parseMoneyValue(filtered);
                                            setFormData({ ...formData, costUah: parsed });
                                        }}
                                        onBlur={(e) => {
                                            // Round to 2 decimal places on blur
                                            const normalized = normalizeMoneyInput(e.target.value);
                                            const parsed = parseMoneyValue(normalized);
                                            const rounded = Math.round(parsed * 100) / 100;
                                            setFormData({ ...formData, costUah: rounded });
                                            setCostUahDisplay(rounded > 0 ? rounded.toFixed(2) : '');
                                        }}
                                        className={`w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent border ${isLightGray ? 'bg-white border-gray-300 text-gray-900' : 'bg-slate-800 border-slate-600 text-slate-100 font-bold'}`}
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className={`block text-sm font-medium mb-1 ${isLightGray ? 'text-gray-700' : 'text-slate-300'}`}>
                                        Тип оплати
                                    </label>
                                    <div className="flex gap-4 h-[42px] items-center">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="paymentType"
                                                value="Готівка"
                                                checked={formData.paymentType === 'Готівка'}
                                                onChange={(e) => setFormData({ ...formData, paymentType: e.target.value })}
                                                className={`w-4 h-4 border-slate-600 text-blue-600 focus:ring-blue-500 ${isLightGray ? 'bg-white' : 'bg-slate-800'}`}
                                            />
                                            <span className={`text-sm ${isLightGray ? 'text-gray-700' : 'text-slate-300'}`}>Готівка</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="paymentType"
                                                value="Картка"
                                                checked={formData.paymentType === 'Картка'}
                                                onChange={(e) => setFormData({ ...formData, paymentType: e.target.value })}
                                                className={`w-4 h-4 border-slate-600 text-blue-600 focus:ring-blue-500 ${isLightGray ? 'bg-white' : 'bg-slate-800'}`}
                                            />
                                            <span className={`text-sm ${isLightGray ? 'text-gray-700' : 'text-slate-300'}`}>Картка</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="md:col-span-1">
                                    <label className={`block text-sm font-medium mb-1 ${isLightGray ? 'text-gray-700' : 'text-slate-300'}`}>
                                        Дата приходу
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.dateArrival}
                                        onChange={(e) => setFormData({ ...formData, dateArrival: e.target.value })}
                                        className={`w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent border ${isLightGray ? 'bg-white border-gray-300 text-gray-900' : 'bg-slate-800 border-slate-600 text-slate-100'}`}
                                    />
                                </div>

                                <div className="md:col-span-1">
                                    <label className={`block text-sm font-medium mb-1 ${isLightGray ? 'text-gray-700' : 'text-slate-300'}`}>
                                        Код товару
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.productCode}
                                        onChange={(e) => setFormData({ ...formData, productCode: e.target.value })}
                                        disabled={smartImportMode}
                                        className={`w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent border ${isLightGray ? 'bg-white border-gray-300 text-gray-900' : 'bg-slate-800 border-slate-600 text-slate-100'} disabled:opacity-50`}
                                    />
                                </div>

                                <div className="md:col-span-1">
                                    <label className={`block text-sm font-medium mb-1 ${isLightGray ? 'text-gray-700' : 'text-slate-300'}`}>
                                        Кількість
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={formData.quantity}
                                        onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                                        disabled={smartImportMode}
                                        className={`w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent border ${isLightGray ? 'bg-white border-gray-300 text-gray-900' : 'bg-slate-800 border-slate-600 text-slate-100'} disabled:opacity-50`}
                                    />
                                </div>

                                {/* Smart import mode toggle */}
                                {['DFI', 'ИНТЕХ', 'ARC'].some(s => formData.supplier.toUpperCase().includes(s)) && (
                                    <div className="md:col-span-4 flex flex-col gap-3">
                                        <div className={`space-y-4 p-4 rounded-lg border rainbow-groupbox ${isLightGray ? 'bg-gray-200 border-gray-300' : 'bg-slate-700 border-slate-600'}`}>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    id="smartImport"
                                                    checked={smartImportMode}
                                                    onChange={(e) => {
                                                        setSmartImportMode(e.target.checked);
                                                        if (!e.target.checked) {
                                                            setImportText('');
                                                            setParsedItems([]);
                                                        }
                                                    }}
                                                    className={`w-4 h-4 text-blue-600 rounded border-slate-600 focus:ring-2 focus:ring-blue-500 ${isLightGray ? 'bg-white' : 'bg-slate-800'}`}
                                                />
                                                <label htmlFor="smartImport" className={`text-sm font-medium cursor-pointer ${isLightGray ? 'text-gray-700' : 'text-slate-300'}`}>
                                                    Розумний імпорт
                                                </label>
                                            </div>
                                            <p className={`text-xs ml-6 ${isLightGray ? 'text-gray-500' : 'text-slate-400'}`}>
                                                Підтримується для постачальників: DFI (Интех) та ARC
                                            </p>
                                        </div>

                                        {smartImportMode && (
                                            <div className="flex flex-col gap-3">
                                                <div>
                                                    <label className={`block text-sm font-medium mb-1 ${isLightGray ? 'text-gray-700' : 'text-slate-300'}`}>
                                                        Дані для імпорту
                                                    </label>
                                                    <textarea
                                                        value={importText}
                                                        onChange={(e) => setImportText(e.target.value)}
                                                        placeholder="Вставте дані з накладної..."
                                                        rows={6}
                                                        className={`w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm border ${isLightGray ? 'bg-white border-gray-300 text-gray-900 placeholder-gray-400' : 'bg-slate-800 border-slate-600 text-slate-100 placeholder-slate-400'}`}
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={handleParseImportText}
                                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                                                >
                                                    Розпізнати
                                                </button>

                                                {parsedItems.length > 0 && (
                                                    <div className={`border rounded-lg overflow-hidden ${isLightGray ? 'border-gray-300' : 'border-slate-600'}`}>
                                                        <div className={`px-3 py-2 border-b ${isLightGray ? 'bg-gray-200 border-gray-300' : 'bg-slate-800/50 border-slate-600'}`}>
                                                            <p className={`text-sm font-medium ${isLightGray ? 'text-gray-700' : 'text-slate-300'}`}>
                                                                Знайдено товарів: {parsedItems.length}
                                                            </p>
                                                        </div>
                                                        <div className="max-h-64 overflow-y-auto">
                                                            <table className="w-full text-sm">
                                                                <thead className={`sticky top-0 ${isLightGray ? 'bg-gray-200' : 'bg-slate-800/30'}`}>
                                                                    <tr>
                                                                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">Код</th>
                                                                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">Назва</th>
                                                                        <th className="px-3 py-2 text-center text-xs font-medium text-slate-400">Кількість</th>
                                                                        <th className="px-3 py-2 text-right text-xs font-medium text-slate-400">Ціна, $</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className={`divide-y ${isLightGray ? 'divide-gray-300' : 'divide-slate-600'}`}>
                                                                    {parsedItems.map((item, index) => (
                                                                        <tr key={index} className={`hover:bg-slate-800/30 ${isLightGray ? 'text-gray-900 px-3 py-2' : 'text-slate-300 px-3 py-2'}`}>
                                                                            <td className="px-3 py-2">{item.productCode}</td>
                                                                            <td className="px-3 py-2">{item.name}</td>
                                                                            <td className="px-3 py-2 text-center">{item.quantity}</td>
                                                                            <td className="px-3 py-2 text-right">{item.priceUsd.toFixed(2)}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="md:col-span-4 flex gap-2 justify-end">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowAddForm(false);
                                            setSmartImportMode(false);
                                            setImportText('');
                                            setParsedItems([]);
                                        }}
                                        className={`px-4 py-2 border rounded-lg transition-colors ${isLightGray ? 'border-gray-300 hover:bg-gray-200 text-gray-700' : 'border-slate-600 hover:bg-slate-600 text-slate-300'}`}
                                    >
                                        Скасувати
                                    </button>
                                    {smartImportMode && parsedItems.length > 0 ? (
                                        <button
                                            type="button"
                                            onClick={handleAddParsedItems}
                                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                        >
                                            Додати на склад
                                        </button>
                                    ) : !smartImportMode ? (
                                        <button
                                            type="submit"
                                            disabled={addItemMutation.isPending}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                        >
                                            {addItemMutation.isPending ? 'Додавання...' : 'Додати'}
                                        </button>
                                    ) : null}
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
                                                    {item.quantity || 1}
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
