import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { warehouseApi } from '../api/warehouse';
import { settingsApi } from '../api/settings';
import { Part } from '../types/db';
import { Package, Plus, Trash2, Search, Filter, X, ScanLine } from 'lucide-react';
import { parseDFI, parseARC } from '../utils/parsers';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { DeleteItemModal } from '../components/DeleteItemModal';
import { normalizeMoneyInput, parseMoneyValue, limitDecimalPlaces } from '../utils/formatters';

export default function Warehouse() {
    const queryClient = useQueryClient();
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
    const [barcodeToDelete, setBarcodeToDelete] = useState<{ id: number; name: string } | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

    // Delete barcode mutation
    const deleteBarcodeMutation = useMutation({
        mutationFn: (itemId: number) => warehouseApi.deleteBarcode(itemId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['warehouse-items'] });
            setBarcodeToDelete(null);
            setSuccessMessage('Штрих-код успішно видалено');
        },
        onError: (error: any) => {
            setErrorMessage(error.message || 'Помилка при видаленні штрих-коду');
            setBarcodeToDelete(null);
        },
    });

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

    const handleDeleteBarcode = (id: number, name: string) => {
        setBarcodeToDelete({ id, name });
    };

    const handleConfirmDeleteBarcode = () => {
        if (barcodeToDelete) {
            deleteBarcodeMutation.mutate(barcodeToDelete.id);
        }
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('uk-UA');
    };

    return (
        <div className="p-6">
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
                <div className="bg-slate-700 rounded-lg shadow-sm p-4 mb-4 border border-slate-600">
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
                                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-100 placeholder-slate-400 text-sm"
                            />
                        </div>

                        {/* Supplier filter - reduced width */}
                        <div className="relative w-[198px]">
                            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <select
                                value={selectedSupplier}
                                onChange={(e) => setSelectedSupplier(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none text-slate-100 text-sm"
                            >
                                <option value="">Всі постачальники</option>
                                {existingSuppliers.map((supplier) => (
                                    <option key={supplier} value={supplier}>
                                        {supplier}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Stock filter */}
                        <div className="flex items-center gap-2">
                            <label htmlFor="stockFilter" className="text-sm font-medium text-slate-300">
                                Стан:
                            </label>
                            <select
                                id="stockFilter"
                                value={stockFilter}
                                onChange={(e) => setStockFilter(e.target.value as 'inStock' | 'sold' | 'all')}
                                className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-100 text-sm"
                            >
                                <option value="inStock">В наявності</option>
                                <option value="sold">Продано</option>
                                <option value="all">Усі</option>
                            </select>
                        </div>

                        {/* Date arrival filters */}
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-slate-400">Дата приходу:</label>
                            <input
                                type="date"
                                value={dateArrivalStart}
                                onChange={(e) => setDateArrivalStart(e.target.value)}
                                className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-slate-100"
                            />
                            <span className="text-slate-400">-</span>
                            <input
                                type="date"
                                value={dateArrivalEnd}
                                onChange={(e) => setDateArrivalEnd(e.target.value)}
                                className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-slate-100"
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
                    <div className="bg-slate-700 rounded-lg shadow-sm p-6 mb-4 border border-slate-600">
                        <h2 className="text-lg font-semibold mb-4 text-slate-100">Додати новий товар</h2>
                        <form onSubmit={handleAddItem} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
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
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-100"
                                >
                                    <option value="">Оберіть постачальника</option>
                                    {counterparties.map((supplier: { ID: number; Name: string }) => (
                                        <option key={supplier.ID} value={supplier.Name}>
                                            {supplier.Name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Накладна
                                </label>
                                <input
                                    type="text"
                                    value={formData.invoice}
                                    onChange={(e) => setFormData({ ...formData, invoice: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-100"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
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
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-100"
                                />
                            </div>

                            <div className="md:col-span-1">
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Назва товару *
                                </label>
                                <input
                                    type="text"
                                    required={!smartImportMode}
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    disabled={smartImportMode}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
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
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
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
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-100"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
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

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Дата приходу
                                </label>
                                <input
                                    type="date"
                                    value={formData.dateArrival}
                                    onChange={(e) => setFormData({ ...formData, dateArrival: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-100"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Код товару
                                </label>
                                <input
                                    type="text"
                                    value={formData.productCode}
                                    onChange={(e) => setFormData({ ...formData, productCode: e.target.value })}
                                    disabled={smartImportMode}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Кількість
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={formData.quantity}
                                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                                    disabled={smartImportMode}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                            </div>

                            {/* Smart import mode toggle */}
                            {['DFI', 'ИНТЕХ', 'ARC'].some(s => formData.supplier.toUpperCase().includes(s)) && (
                                <div className="md:col-span-2 flex flex-col gap-3">
                                    <div className="flex flex-col gap-2 p-3 bg-slate-800/50 rounded-lg border border-slate-600">
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
                                                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                            />
                                            <label htmlFor="smartImport" className="text-sm font-medium text-slate-300 cursor-pointer">
                                                Розумний імпорт
                                            </label>
                                        </div>
                                        <p className="text-xs text-slate-400 ml-6">
                                            Підтримується для постачальників: DFI (Интех) та ARC
                                        </p>
                                    </div>

                                    {smartImportMode && (
                                        <div className="flex flex-col gap-3">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                                    Дані для імпорту
                                                </label>
                                                <textarea
                                                    value={importText}
                                                    onChange={(e) => setImportText(e.target.value)}
                                                    placeholder="Вставте дані з накладної..."
                                                    rows={6}
                                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-100 placeholder-slate-400 font-mono text-sm"
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
                                                <div className="border border-slate-600 rounded-lg overflow-hidden">
                                                    <div className="bg-slate-800/50 px-3 py-2 border-b border-slate-600">
                                                        <p className="text-sm font-medium text-slate-300">
                                                            Знайдено товарів: {parsedItems.length}
                                                        </p>
                                                    </div>
                                                    <div className="max-h-64 overflow-y-auto">
                                                        <table className="w-full text-sm">
                                                            <thead className="bg-slate-800/30 sticky top-0">
                                                                <tr>
                                                                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">Код</th>
                                                                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">Назва</th>
                                                                    <th className="px-3 py-2 text-center text-xs font-medium text-slate-400">Кількість</th>
                                                                    <th className="px-3 py-2 text-right text-xs font-medium text-slate-400">Ціна, $</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-600">
                                                                {parsedItems.map((item, index) => (
                                                                    <tr key={index} className="hover:bg-slate-800/30">
                                                                        <td className="px-3 py-2 text-slate-300">{item.productCode}</td>
                                                                        <td className="px-3 py-2 text-slate-300">{item.name}</td>
                                                                        <td className="px-3 py-2 text-center text-slate-300">{item.quantity}</td>
                                                                        <td className="px-3 py-2 text-right text-slate-300">{item.priceUsd.toFixed(2)}</td>
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

                            <div className="md:col-span-2 flex gap-2 justify-end">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAddForm(false);
                                        setSmartImportMode(false);
                                        setImportText('');
                                        setParsedItems([]);
                                    }}
                                    className="px-4 py-2 border border-slate-600 rounded-lg hover:bg-slate-600 text-slate-300 transition-colors"
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

            {/* Items table */}
            <div className="bg-slate-700 rounded-lg shadow-sm overflow-hidden border border-slate-600 flex flex-col">
                {/* Fixed Header */}
                <div className="overflow-x-auto border-b border-slate-600 flex-shrink-0" style={{ borderColor: 'var(--theme-border)' }}>
                    <table className="w-full">
                        <colgroup>
                            <col style={{ width: '120px' }} />
                            <col style={{ width: '150px' }} />
                            <col style={{ width: '120px' }} />
                            <col style={{ width: '120px' }} />
                            {stockFilter === 'sold' && <col style={{ width: '100px' }} />}
                            <col />
                            <col style={{ width: '100px' }} />
                            <col style={{ width: '100px' }} />
                            <col style={{ width: '100px' }} />
                            <col style={{ width: '120px' }} />
                            <col style={{ width: '80px' }} />
                        </colgroup>
                        <thead 
                            className="font-medium"
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
                    </table>
                </div>
                {/* Scrollable Body */}
                <div className="overflow-x-auto overflow-y-auto flex-1" style={{ maxHeight: 'calc(100vh - 400px)' }}>
                    <table className="w-full">
                        <colgroup>
                            <col style={{ width: '120px' }} />
                            <col style={{ width: '150px' }} />
                            <col style={{ width: '120px' }} />
                            <col style={{ width: '120px' }} />
                            {stockFilter === 'sold' && <col style={{ width: '100px' }} />}
                            <col />
                            <col style={{ width: '100px' }} />
                            <col style={{ width: '100px' }} />
                            <col style={{ width: '100px' }} />
                            <col style={{ width: '120px' }} />
                            <col style={{ width: '80px' }} />
                        </colgroup>
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
                                items.map((item: Part, index: number) => (
                                    <tr
                                        key={item.id}
                                        className={index % 2 === 0 ? 'bg-slate-700/50' : 'bg-slate-700'}
                                    >
                                        <td className="px-4 py-3 text-sm text-slate-200">
                                            {formatDate(item.dateArrival)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-200">
                                            {item.supplier}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-200">
                                            {item.invoice || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-200">
                                            <div className="flex items-center gap-2">
                                                <span>{item.productCode || '-'}</span>
                                                {item.barcode && (
                                                    <span className="text-xs text-slate-400">/ {item.barcode}</span>
                                                )}
                                            </div>
                                        </td>
                                        {stockFilter === 'sold' && (
                                            <td className="px-4 py-3 text-sm text-slate-200">
                                                {item.receiptId ? `#${item.receiptId}` : '-'}
                                            </td>
                                        )}
                                        <td className="px-4 py-3 text-sm text-slate-200">
                                            {item.name}
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
                                                {item.barcode && item.inStock && (
                                                    <button
                                                        onClick={() => handleDeleteBarcode(item.id, item.name)}
                                                        disabled={deleteBarcodeMutation.isPending || deleteItemMutation.isPending}
                                                        className="text-orange-400 hover:text-orange-300 disabled:opacity-50"
                                                        title="Видалити штрих-код"
                                                    >
                                                        <ScanLine className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {item.inStock && (
                                                    <button
                                                        onClick={() => handleDelete(item.id, item.name)}
                                                        disabled={deleteItemMutation.isPending || deleteBarcodeMutation.isPending}
                                                        className="text-red-400 hover:text-red-300 disabled:opacity-50"
                                                        title="Видалити"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
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
                isOpen={!!barcodeToDelete}
                onClose={() => setBarcodeToDelete(null)}
                onConfirm={handleConfirmDeleteBarcode}
                title="Видалити штрих-код"
                message={`Ви впевнені, що хочете видалити штрих-код для товару "${barcodeToDelete?.name}"?`}
                confirmLabel="Видалити"
                isDestructive={true}
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
