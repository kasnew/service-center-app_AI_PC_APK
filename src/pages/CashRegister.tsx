import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { cashRegisterApi, expenseCategoriesApi, incomeCategoriesApi } from '../api/cashRegister';
import { Wallet, Filter, Search, Plus, Trash2, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';
import { normalizeMoneyInput, parseMoneyValue } from '../utils/formatters';
import { ConfirmationModal } from '../components/ConfirmationModal';
import ProfitsTab from '../components/ProfitsTab';
import { useTheme } from '../contexts/ThemeContext';

export default function CashRegister() {
    const queryClient = useQueryClient();
    const location = useLocation();
    const { currentTheme } = useTheme();
    const isLight = currentTheme.type === 'light';

    // Use darker colors for light themes
    const greenColor = isLight ? 'text-green-800' : 'text-green-400';
    const blueColor = isLight ? 'text-blue-800' : 'text-blue-400';
    const blueBorderColor = isLight ? 'border-blue-800' : 'border-blue-400';


    // Check if we're returning from a repair editor
    const returnToProfits = (location.state as any)?.returnToProfits;

    const [activeTab, setActiveTab] = useState<'transactions' | 'profits'>(returnToProfits ? 'profits' : 'transactions');

    // Switch to profits tab if returning from repair
    useEffect(() => {
        if (returnToProfits) {
            setActiveTab('profits');
            // Clear the state to avoid re-switching on next render
            window.history.replaceState({}, '');
        }
    }, [returnToProfits]);
    const [search, setSearch] = useState('');
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedPaymentType, setSelectedPaymentType] = useState('');

    // Modal states
    const [showAddTransaction, setShowAddTransaction] = useState(false);
    const [showReconcile, setShowReconcile] = useState(false);
    const [transactionToDelete, setTransactionToDelete] = useState<{ id: number; description: string } | null>(null);

    // Form states
    const [transactionForm, setTransactionForm] = useState({
        type: 'income', // income | expense
        category: '',
        description: '',
        amount: 0,
        paymentType: 'Готівка',
        dateExecuted: new Date().toISOString().slice(0, 16)
    });

    const [reconcileForm, setReconcileForm] = useState({
        actualCash: 0,
        actualCard: 0,
        description: ''
    });
    const [reconcileDisplay, setReconcileDisplay] = useState({
        actualCash: '',
        actualCard: ''
    });

    // Fetch settings to check if enabled
    const { data: settings } = useQuery({
        queryKey: ['cash-register-settings'],
        queryFn: () => cashRegisterApi.getSettings(),
    });

    // Fetch balances
    const { data: balances } = useQuery({
        queryKey: ['cash-balances'],
        queryFn: () => cashRegisterApi.getBalances(),
        enabled: settings?.cashRegisterEnabled
    });

    // Fetch expense categories
    const { data: expenseCategories = [] } = useQuery({
        queryKey: ['expense-categories'],
        queryFn: () => expenseCategoriesApi.getCategories(),
    });

    // Fetch income categories
    const { data: incomeCategories = [] } = useQuery({
        queryKey: ['income-categories'],
        queryFn: () => incomeCategoriesApi.getCategories(),
    });

    // Get categories based on transaction type
    const categories = transactionForm.type === 'income' ? incomeCategories : expenseCategories;

    // Reset category when transaction type changes
    useEffect(() => {
        setTransactionForm(prev => ({ ...prev, category: '' }));
    }, [transactionForm.type]);

    // Fetch transactions
    const { data: transactions = [], isLoading } = useQuery({
        queryKey: ['transactions', { ...dateRange, category: selectedCategory, paymentType: selectedPaymentType, search }],
        queryFn: () => window.ipcRenderer.invoke('get-transactions', {
            startDate: dateRange.start,
            endDate: dateRange.end,
            category: selectedCategory,
            paymentType: selectedPaymentType,
            search
        }),
        enabled: settings?.cashRegisterEnabled && activeTab === 'transactions'
    });

    // Mutations
    const addTransactionMutation = useMutation({
        mutationFn: (data: any) => window.ipcRenderer.invoke('create-manual-transaction', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['cash-balances'] });
            setShowAddTransaction(false);
            setTransactionForm({
                type: 'income',
                category: '',
                description: '',
                amount: 0,
                paymentType: 'Готівка',
                dateExecuted: new Date().toISOString().slice(0, 16)
            });
        }
    });

    const reconcileMutation = useMutation({
        mutationFn: (data: any) => window.ipcRenderer.invoke('reconcile-balances', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['cash-balances'] });
            setShowReconcile(false);
        }
    });

    const deleteTransactionMutation = useMutation({
        mutationFn: (id: number) => window.ipcRenderer.invoke('delete-transaction', id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['cash-balances'] });
            setTransactionToDelete(null);
        }
    });

    const handleAddTransaction = (e: React.FormEvent) => {
        e.preventDefault();
        addTransactionMutation.mutate(transactionForm);
    };

    const handleReconcile = (e: React.FormEvent) => {
        e.preventDefault();
        // Ensure values are rounded to 2 decimal places before submitting
        const roundedForm = {
            ...reconcileForm,
            actualCash: Math.round(reconcileForm.actualCash * 100) / 100,
            actualCard: Math.round(reconcileForm.actualCard * 100) / 100
        };
        reconcileMutation.mutate(roundedForm);
    };

    if (!settings?.cashRegisterEnabled) {
        return (
            <div className="p-8 flex flex-col items-center justify-center h-full text-slate-400">
                <Wallet className="w-16 h-16 mb-4 opacity-50" />
                <h2 className="text-xl font-semibold mb-2">Каса не активована</h2>
                <p>Перейдіть в налаштування, щоб активувати касу.</p>
            </div>
        );
    }

    return (
        <div className="p-6 h-full flex flex-col">
            {/* Header & Balances */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div className="md:col-span-2">
                    <h1 className="text-2xl font-bold text-slate-100 mb-1">Каса</h1>
                    <p className="text-slate-400 text-sm">Управління фінансами та транзакціями</p>
                </div>

                {balances && (
                    <>
                        <div className="bg-slate-700 rounded-lg p-4 border border-slate-600 shadow-sm rainbow-groupbox">
                            <p className="text-sm text-slate-400 mb-1">Готівка</p>
                            <p className={`text-2xl font-bold ${greenColor}`}>{balances.cash.toFixed(2)} ₴</p>
                        </div>
                        <div className="bg-slate-700 rounded-lg p-4 border border-slate-600 shadow-sm rainbow-groupbox">
                            <p className="text-sm text-slate-400 mb-1">Картка</p>
                            <p className={`text-2xl font-bold ${blueColor}`}>{balances.card.toFixed(2)} ₴</p>
                        </div>
                    </>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-slate-600">
                <button
                    onClick={() => setActiveTab('transactions')}
                    className={clsx(
                        "px-6 py-3 font-medium text-sm transition-colors border-b-2",
                        activeTab === 'transactions'
                            ? `${blueColor} ${blueBorderColor}`
                            : "text-slate-400 border-transparent hover:text-slate-300"
                    )}
                >
                    Транзакції
                </button>
                <button
                    onClick={() => setActiveTab('profits')}
                    className={clsx(
                        "px-6 py-3 font-medium text-sm transition-colors border-b-2",
                        activeTab === 'profits'
                            ? `${blueColor} ${blueBorderColor}`
                            : "text-slate-400 border-transparent hover:text-slate-300"
                    )}
                >
                    Прибутки
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'transactions' ? (
                <>
                    {/* Actions & Filters */}
                    <div className="bg-slate-700 rounded-lg p-4 mb-6 border border-slate-600 space-y-4 rainbow-groupbox">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowAddTransaction(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                    Додати транзакцію
                                </button>
                                <button
                                    onClick={() => {
                                        const cash = balances?.cash || 0;
                                        const card = balances?.card || 0;
                                        setReconcileForm({
                                            actualCash: cash,
                                            actualCard: card,
                                            description: ''
                                        });
                                        setReconcileDisplay({
                                            actualCash: cash.toFixed(2),
                                            actualCard: card.toFixed(2)
                                        });
                                        setShowReconcile(true);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition-colors"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Звірка балансів
                                </button>
                            </div>

                            <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2 border border-slate-600">
                                <Search className="w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Пошук..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="bg-transparent border-none focus:ring-0 text-sm text-slate-100 placeholder-slate-500 w-48"
                                />
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-slate-600">
                            <div className="flex items-center gap-2">
                                <Filter className="w-4 h-4 text-slate-400" />
                                <span className="text-sm font-medium text-slate-300">Фільтри:</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="date"
                                    value={dateRange.start}
                                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                    className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-slate-100"
                                />
                                <span className="text-slate-400">-</span>
                                <input
                                    type="date"
                                    value={dateRange.end}
                                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                    className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-slate-100"
                                />
                            </div>

                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="bg-slate-800 border border-slate-600 rounded px-3 py-1 text-sm text-slate-100"
                            >
                                <option value="">Всі категорії</option>
                                <option value="Прибуток">Прибуток</option>
                                <option value="Покупка">Покупка</option>
                                <option value="Скасування">Скасування</option>
                                <option value="Списання">Списання</option>
                                <option value="Коригування">Коригування</option>
                                {expenseCategories.filter((c: any) => c.active).map((c: any) => (
                                    <option key={c.id} value={c.name}>{c.name}</option>
                                ))}
                                {incomeCategories.filter((c: any) => c.active).map((c: any) => (
                                    <option key={c.id} value={c.name}>{c.name}</option>
                                ))}
                            </select>

                            <select
                                value={selectedPaymentType}
                                onChange={(e) => setSelectedPaymentType(e.target.value)}
                                className="bg-slate-800 border border-slate-600 rounded px-3 py-1 text-sm text-slate-100"
                            >
                                <option value="">Всі типи оплати</option>
                                <option value="Готівка">Готівка</option>
                                <option value="Картка">Картка</option>
                                <option value="Змішано">Змішано</option>
                            </select>

                            {(search || selectedCategory || selectedPaymentType) && (
                                <button
                                    onClick={() => {
                                        setSearch('');
                                        setSelectedCategory('');
                                        setSelectedPaymentType('');
                                    }}
                                    className="px-3 py-1 rounded-full text-xs font-medium border border-slate-600 text-slate-500 hover:text-slate-300 hover:border-slate-500 transition-all"
                                >
                                    Скинути фільтри
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Transactions Table */}
                    <div className="flex-1 bg-slate-700 rounded-lg shadow-sm border border-slate-600 overflow-hidden flex flex-col rainbow-groupbox mb-2">
                        <div className="overflow-auto flex-1">
                            <table className="w-full">
                                <thead className="bg-slate-800/50 border-b border-slate-600 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Дата</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Категорія</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Опис</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Виконавець</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Сума</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Готівка</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Картка</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">Дії</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-600">
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan={8} className="px-4 py-8 text-center text-slate-400">Завантаження...</td>
                                        </tr>
                                    ) : transactions.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="px-4 py-8 text-center text-slate-400">Транзакцій не знайдено</td>
                                        </tr>
                                    ) : (
                                        transactions.map((tx: any) => (
                                            <tr key={tx.id} className="hover:bg-slate-600/30 transition-colors">
                                                <td className="px-4 py-3 text-sm text-slate-300">
                                                    {new Date(tx.dateExecuted).toLocaleString('uk-UA')}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    <span className={clsx(
                                                        "px-2 py-1 rounded-full text-xs font-medium",
                                                        tx.category === 'Прибуток' ? `${isLight ? 'bg-green-100' : 'bg-green-900/50'} ${greenColor} ${isLight ? 'border-green-300' : 'border-green-800'} border` :
                                                            tx.category === 'Покупка' ? `${isLight ? 'bg-blue-100' : 'bg-blue-900/50'} ${blueColor} ${isLight ? 'border-blue-300' : 'border-blue-800'} border` :
                                                                tx.category === 'Скасування' ? `${isLight ? 'bg-red-100' : 'bg-red-900/50'} ${isLight ? 'text-red-800' : 'text-red-400'} ${isLight ? 'border-red-300' : 'border-red-800'} border` :
                                                                    tx.category === 'Списання' ? `${isLight ? 'bg-orange-100' : 'bg-orange-900/50'} ${isLight ? 'text-orange-800' : 'text-orange-400'} ${isLight ? 'border-orange-300' : 'border-orange-800'} border` :
                                                                        tx.category === 'Коригування' ? `${isLight ? 'bg-purple-100' : 'bg-purple-900/50'} ${isLight ? 'text-purple-800' : 'text-purple-400'} ${isLight ? 'border-purple-300' : 'border-purple-800'} border` :
                                                                            "bg-slate-800 text-slate-300 border border-slate-600"

                                                    )}>
                                                        {tx.category}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-200">{tx.description}</td>
                                                <td className="px-4 py-3 text-sm text-slate-300">{tx.executorName || '-'}</td>
                                                <td className={clsx(
                                                    tx.amount > 0 ? (isLight ? 'text-green-800' : 'text-green-400') : (isLight ? 'text-red-800' : 'text-red-400')
                                                )}>
                                                    {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)}

                                                </td>
                                                <td className="px-4 py-3 text-sm text-right text-slate-400">{tx.cash.toFixed(2)}</td>
                                                <td className="px-4 py-3 text-sm text-right text-slate-400">{tx.card.toFixed(2)}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <button
                                                        onClick={() => setTransactionToDelete({ id: tx.id, description: tx.description })}
                                                        className="text-slate-500 hover:text-red-400 transition-colors"
                                                        title="Видалити"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar pb-8">
                    <ProfitsTab />
                </div>
            )}

            {/* Add Transaction Modal */}
            {showAddTransaction && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4 border border-slate-600">
                        <h3 className="text-xl font-semibold text-slate-100 mb-4">Нова транзакція</h3>
                        <form onSubmit={handleAddTransaction} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Тип</label>
                                    <select
                                        value={transactionForm.type}
                                        onChange={(e) => setTransactionForm({ ...transactionForm, type: e.target.value })}
                                        className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-slate-100"
                                    >
                                        <option value="income">Дохід</option>
                                        <option value="expense">Витрата</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Дата</label>
                                    <input
                                        type="datetime-local"
                                        value={transactionForm.dateExecuted}
                                        onChange={(e) => setTransactionForm({ ...transactionForm, dateExecuted: e.target.value })}
                                        className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-slate-100"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Категорія</label>
                                <select
                                    value={transactionForm.category}
                                    onChange={(e) => setTransactionForm({ ...transactionForm, category: e.target.value })}
                                    required
                                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-slate-100"
                                >
                                    <option value="">Оберіть категорію</option>
                                    {categories.filter((c: any) => c.active).map((c: any) => (
                                        <option key={c.id} value={c.name}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Опис</label>
                                <input
                                    type="text"
                                    value={transactionForm.description}
                                    onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
                                    required
                                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-slate-100"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Сума</label>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        min="0"
                                        value={transactionForm.amount || ''}
                                        onChange={(e) => {
                                            const normalized = normalizeMoneyInput(e.target.value);
                                            const parsed = parseMoneyValue(normalized);
                                            setTransactionForm({ ...transactionForm, amount: parsed });
                                        }}
                                        required
                                        className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-slate-100"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Оплата</label>
                                    <select
                                        value={transactionForm.paymentType}
                                        onChange={(e) => setTransactionForm({ ...transactionForm, paymentType: e.target.value })}
                                        className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-slate-100"
                                    >
                                        <option value="Готівка">Готівка</option>
                                        <option value="Картка">Картка</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowAddTransaction(false)}
                                    className="px-4 py-2 text-slate-300 hover:bg-slate-700 rounded-lg transition-colors"
                                >
                                    Скасувати
                                </button>
                                <button
                                    type="submit"
                                    disabled={addTransactionMutation.isPending}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                >
                                    {addTransactionMutation.isPending ? 'Збереження...' : 'Зберегти'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Reconcile Modal */}
            {showReconcile && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4 border border-slate-600">
                        <h3 className="text-xl font-semibold text-slate-100 mb-4">Звірка балансів</h3>
                        <p className="text-sm text-slate-400 mb-4">
                            Введіть фактичні суми в касі. Система створить коригуючу транзакцію.
                        </p>
                        <form onSubmit={handleReconcile} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Фактична готівка</label>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={reconcileDisplay.actualCash}
                                    onChange={(e) => {
                                        const normalized = normalizeMoneyInput(e.target.value);
                                        setReconcileDisplay({ ...reconcileDisplay, actualCash: normalized });
                                        const parsed = parseMoneyValue(normalized);
                                        setReconcileForm({ ...reconcileForm, actualCash: parsed });
                                    }}
                                    onBlur={(e) => {
                                        // Round to 2 decimal places on blur
                                        const normalized = normalizeMoneyInput(e.target.value);
                                        const parsed = parseMoneyValue(normalized);
                                        const rounded = Math.round(parsed * 100) / 100;
                                        setReconcileForm({ ...reconcileForm, actualCash: rounded });
                                        setReconcileDisplay({ ...reconcileDisplay, actualCash: rounded.toFixed(2) });
                                    }}
                                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-slate-100"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Фактично на картці</label>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={reconcileDisplay.actualCard}
                                    onChange={(e) => {
                                        const normalized = normalizeMoneyInput(e.target.value);
                                        setReconcileDisplay({ ...reconcileDisplay, actualCard: normalized });
                                        const parsed = parseMoneyValue(normalized);
                                        setReconcileForm({ ...reconcileForm, actualCard: parsed });
                                    }}
                                    onBlur={(e) => {
                                        // Round to 2 decimal places on blur
                                        const normalized = normalizeMoneyInput(e.target.value);
                                        const parsed = parseMoneyValue(normalized);
                                        const rounded = Math.round(parsed * 100) / 100;
                                        setReconcileForm({ ...reconcileForm, actualCard: rounded });
                                        setReconcileDisplay({ ...reconcileDisplay, actualCard: rounded.toFixed(2) });
                                    }}
                                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-slate-100"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Коментар</label>
                                <input
                                    type="text"
                                    value={reconcileForm.description}
                                    onChange={(e) => setReconcileForm({ ...reconcileForm, description: e.target.value })}
                                    placeholder="Причина коригування..."
                                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-slate-100"
                                />
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowReconcile(false)}
                                    className="px-4 py-2 text-slate-300 hover:bg-slate-700 rounded-lg transition-colors"
                                >
                                    Скасувати
                                </button>
                                <button
                                    type="submit"
                                    disabled={reconcileMutation.isPending}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                >
                                    {reconcileMutation.isPending ? 'Збереження...' : 'Підтвердити'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            <ConfirmationModal
                isOpen={!!transactionToDelete}
                onClose={() => setTransactionToDelete(null)}
                onConfirm={() => transactionToDelete && deleteTransactionMutation.mutate(transactionToDelete.id)}
                title="Видалення транзакції"
                message={`Ви впевнені, що хочете видалити транзакцію "${transactionToDelete?.description}"? Це спричинить перерахунок всіх наступних балансів.`}
                confirmLabel="Видалити"
                isDestructive={true}
                isLoading={deleteTransactionMutation.isPending}
            />
        </div>
    );
}
