import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cashRegisterApi, expenseCategoriesApi, incomeCategoriesApi } from '../api/cashRegister';
import { ExpenseCategory, IncomeCategory } from '../types/db';
import { Wallet, AlertTriangle, Edit2, Check, X, Plus, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { ConfirmationModal } from './ConfirmationModal';
import { normalizeMoneyInput, parseMoneyValue } from '../utils/formatters';

export function CashRegisterSettings() {
    const queryClient = useQueryClient();

    // Cash register states
    const [cardCommission, setCardCommission] = useState(1.5);
    const [initialCash, setInitialCash] = useState(0);
    const [initialCard, setInitialCard] = useState(0);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newIncomeCategoryName, setNewIncomeCategoryName] = useState('');
    const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
    const [editingIncomeCategory, setEditingIncomeCategory] = useState<IncomeCategory | null>(null);
    const [categoryToDelete, setCategoryToDelete] = useState<{ id: number; name: string } | null>(null);
    const [incomeCategoryToDelete, setIncomeCategoryToDelete] = useState<{ id: number; name: string } | null>(null);
    const [showActivationConfirm, setShowActivationConfirm] = useState(false);

    // Fetch cash register settings
    const { data: settings, isLoading: isLoadingSettings } = useQuery({
        queryKey: ['cash-register-settings'],
        queryFn: () => cashRegisterApi.getSettings(),
    });

    // Fetch expense categories
    const { data: categories = [], isLoading: isLoadingCategories } = useQuery({
        queryKey: ['expense-categories'],
        queryFn: () => expenseCategoriesApi.getCategories(),
    });

    // Fetch income categories
    const { data: incomeCategories = [], isLoading: isLoadingIncomeCategories } = useQuery({
        queryKey: ['income-categories'],
        queryFn: () => incomeCategoriesApi.getCategories(),
    });

    // Fetch current balances
    const { data: balances } = useQuery({
        queryKey: ['cash-balances'],
        queryFn: () => cashRegisterApi.getBalances(),
        enabled: settings?.cashRegisterEnabled || false,
    });

    // Update commission mutation
    const updateCommissionMutation = useMutation({
        mutationFn: (percent: number) => cashRegisterApi.updateSettings({ cardCommissionPercent: percent }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cash-register-settings'] });
        },
    });

    // Activate cash register mutation
    const activateMutation = useMutation({
        mutationFn: (data: { initialCash: number; initialCard: number }) => cashRegisterApi.activateCashRegister(data.initialCash, data.initialCard),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cash-register-settings'] });
            queryClient.invalidateQueries({ queryKey: ['cash-balances'] });
            setShowActivationConfirm(false);
            setInitialCash(0);
            setInitialCard(0);
        },
    });

    // Add category mutation
    const addCategoryMutation = useMutation({
        mutationFn: (name: string) => expenseCategoriesApi.addCategory(name),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
            setNewCategoryName('');
        },
    });

    // Update category mutation
    const updateCategoryMutation = useMutation({
        mutationFn: (data: { id: number; name: string }) => expenseCategoriesApi.updateCategory(data.id, data.name),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
            setEditingCategory(null);
        },
    });

    // Toggle category mutation
    const toggleCategoryMutation = useMutation({
        mutationFn: (data: { id: number; active: boolean }) => expenseCategoriesApi.toggleCategory(data.id, data.active),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
        },
    });

    // Delete category mutation
    const deleteCategoryMutation = useMutation({
        mutationFn: (id: number) => expenseCategoriesApi.deleteCategory(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
            setCategoryToDelete(null);
        },
    });

    // Add income category mutation
    const addIncomeCategoryMutation = useMutation({
        mutationFn: (name: string) => incomeCategoriesApi.addCategory(name),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['income-categories'] });
            setNewIncomeCategoryName('');
        },
    });

    // Update income category mutation
    const updateIncomeCategoryMutation = useMutation({
        mutationFn: (data: { id: number; name: string }) => incomeCategoriesApi.updateCategory(data.id, data.name),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['income-categories'] });
            setEditingIncomeCategory(null);
        },
    });

    // Toggle income category mutation
    const toggleIncomeCategoryMutation = useMutation({
        mutationFn: (data: { id: number; active: boolean }) => incomeCategoriesApi.toggleCategory(data.id, data.active),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['income-categories'] });
        },
    });

    // Delete income category mutation
    const deleteIncomeCategoryMutation = useMutation({
        mutationFn: (id: number) => incomeCategoriesApi.deleteCategory(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['income-categories'] });
            setIncomeCategoryToDelete(null);
        },
    });

    // Sync commission with settings
    useEffect(() => {
        if (settings) {
            setCardCommission(settings.cardCommissionPercent);
        }
    }, [settings]);

    const handleAddCategory = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;
        addCategoryMutation.mutate(newCategoryName.trim());
    };

    const handleAddIncomeCategory = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newIncomeCategoryName.trim()) return;
        addIncomeCategoryMutation.mutate(newIncomeCategoryName.trim());
    };

    const handleSaveCategory = (category: ExpenseCategory) => {
        if (!editingCategory) return;
        updateCategoryMutation.mutate({ id: category.id, name: editingCategory.name });
    };

    const handleSaveIncomeCategory = (category: IncomeCategory) => {
        if (!editingIncomeCategory) return;
        updateIncomeCategoryMutation.mutate({ id: category.id, name: editingIncomeCategory.name });
    };

    const handleCommissionSave = () => {
        updateCommissionMutation.mutate(cardCommission);
    };

    const handleActivate = () => {
        activateMutation.mutate({ initialCash, initialCard });
    };

    if (isLoadingSettings) {
        return <div className="text-center py-8 text-slate-400">Завантаження...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Activation Section */}
            {!settings?.cashRegisterEnabled ? (
                <div className="bg-slate-700 rounded-lg shadow-sm p-6 border border-slate-600">
                    <h2 className="text-xl font-semibold text-slate-100 mb-4 flex items-center gap-2">
                        <Wallet className="w-6 h-6" />
                        Активація каси
                    </h2>

                    <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 mb-6">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-yellow-200">
                                <p className="font-semibold mb-1">Увага!</p>
                                <p>Облік в касі почнеться з цього моменту. Старі ремонти НЕ будуть враховані.</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Початковий баланс готівки (₴)
                            </label>
                            <input
                                type="text"
                                inputMode="decimal"
                                value={initialCash || ''}
                                onChange={(e) => {
                                    const normalized = normalizeMoneyInput(e.target.value);
                                    const parsed = parseMoneyValue(normalized);
                                    setInitialCash(parsed);
                                }}
                                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Початковий баланс картки (₴)
                            </label>
                            <input
                                type="text"
                                inputMode="decimal"
                                value={initialCard || ''}
                                onChange={(e) => {
                                    const normalized = normalizeMoneyInput(e.target.value);
                                    const parsed = parseMoneyValue(normalized);
                                    setInitialCard(parsed);
                                }}
                                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <button
                        onClick={() => setShowActivationConfirm(true)}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                        Активувати касу
                    </button>
                </div>
            ) : (
                <div className="bg-slate-700 rounded-lg shadow-sm p-6 border border-slate-600">
                    <h2 className="text-xl font-semibold text-slate-100 mb-4 flex items-center gap-2">
                        <Wallet className="w-6 h-6" />
                        Каса активована
                    </h2>

                    <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 mb-4">
                        <p className="text-sm text-green-200">
                            Каса була активована {new Date(settings.cashRegisterStartDate).toLocaleString('uk-UA')}
                        </p>
                    </div>

                    {balances && (
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600">
                                <p className="text-sm text-slate-400 mb-1">Готівка</p>
                                <p className="text-2xl font-bold text-green-400">{balances.cash.toFixed(2)} ₴</p>
                            </div>
                            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600">
                                <p className="text-sm text-slate-400 mb-1">Картка</p>
                                <p className="text-2xl font-bold text-blue-400">{balances.card.toFixed(2)} ₴</p>
                            </div>
                            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600">
                                <p className="text-sm text-slate-400 mb-1">Всього</p>
                                <p className="text-2xl font-bold text-slate-100">{(balances.cash + balances.card).toFixed(2)} ₴</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Commission Settings */}
            <div className="bg-slate-700 rounded-lg shadow-sm p-6 border border-slate-600">
                <h2 className="text-xl font-semibold text-slate-100 mb-4">Комісія банку</h2>

                <div className="flex items-end gap-4">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Комісія за операції карткою (%)
                        </label>
                        <input
                            type="text"
                            inputMode="decimal"
                            min="0"
                            max="100"
                            value={cardCommission || ''}
                            onChange={(e) => {
                                const normalized = normalizeMoneyInput(e.target.value);
                                const parsed = parseMoneyValue(normalized);
                                setCardCommission(parsed);
                            }}
                            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    <button
                        onClick={handleCommissionSave}
                        disabled={updateCommissionMutation.isPending}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                        {updateCommissionMutation.isPending ? 'Збереження...' : 'Зберегти'}
                    </button>
                </div>
            </div>

            {/* Income Categories */}
            <div className="bg-slate-700 rounded-lg shadow-sm p-6 border border-slate-600">
                <h2 className="text-xl font-semibold text-slate-100 mb-4">Категорії прибутків</h2>

                {/* Add Income Category Form */}
                <form onSubmit={handleAddIncomeCategory} className="mb-6 flex gap-2">
                    <input
                        type="text"
                        value={newIncomeCategoryName}
                        onChange={(e) => setNewIncomeCategoryName(e.target.value)}
                        placeholder="Назва нової категорії"
                        className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                    <button
                        type="submit"
                        disabled={!newIncomeCategoryName.trim() || addIncomeCategoryMutation.isPending}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Plus className="w-4 h-4" />
                        Додати
                    </button>
                </form>

                {/* Income Categories List */}
                <div>
                    <h3 className="text-lg font-semibold text-slate-200 mb-3">
                        Список категорій ({incomeCategories.length})
                    </h3>

                    {isLoadingIncomeCategories ? (
                        <div className="text-center py-8 text-slate-400">Завантаження...</div>
                    ) : incomeCategories.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 bg-slate-800/50 rounded-lg border border-slate-600">
                            Категорій немає
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {incomeCategories.map((category: IncomeCategory) => (
                                <div
                                    key={category.id}
                                    className="bg-slate-800/50 rounded-lg p-3 border border-slate-600 hover:border-slate-500 transition-colors"
                                >
                                    {editingIncomeCategory?.id === category.id ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={editingIncomeCategory.name}
                                                onChange={(e) => setEditingIncomeCategory({ ...editingIncomeCategory, name: e.target.value })}
                                                className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-slate-100"
                                            />
                                            <button
                                                onClick={() => handleSaveIncomeCategory(category)}
                                                className="p-1.5 text-green-400 hover:bg-slate-700 rounded transition-colors"
                                                title="Зберегти"
                                            >
                                                <Check className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setEditingIncomeCategory(null)}
                                                className="p-1.5 text-slate-400 hover:bg-slate-700 rounded transition-colors"
                                                title="Скасувати"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between group">
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={category.active}
                                                    onChange={(e) => toggleIncomeCategoryMutation.mutate({ id: category.id, active: e.target.checked })}
                                                    className="w-4 h-4"
                                                />
                                                <span className={clsx(
                                                    "font-medium",
                                                    category.active ? "text-slate-200" : "text-slate-500"
                                                )}>
                                                    {category.name}
                                                </span>
                                            </div>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => setEditingIncomeCategory(category)}
                                                    className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded-lg transition-colors"
                                                    title="Редагувати"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setIncomeCategoryToDelete({ id: category.id, name: category.name })}
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

            {/* Expense Categories */}
            <div className="bg-slate-700 rounded-lg shadow-sm p-6 border border-slate-600">
                <h2 className="text-xl font-semibold text-slate-100 mb-4">Категорії витрат</h2>

                {/* Add Category Form */}
                <form onSubmit={handleAddCategory} className="mb-6 flex gap-2">
                    <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Назва нової категорії"
                        className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                    <button
                        type="submit"
                        disabled={!newCategoryName.trim() || addCategoryMutation.isPending}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Plus className="w-4 h-4" />
                        Додати
                    </button>
                </form>

                {/* Categories List */}
                <div>
                    <h3 className="text-lg font-semibold text-slate-200 mb-3">
                        Список категорій ({categories.length})
                    </h3>

                    {isLoadingCategories ? (
                        <div className="text-center py-8 text-slate-400">Завантаження...</div>
                    ) : categories.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 bg-slate-800/50 rounded-lg border border-slate-600">
                            Категорій немає
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {categories.map((category: ExpenseCategory) => (
                                <div
                                    key={category.id}
                                    className="bg-slate-800/50 rounded-lg p-3 border border-slate-600 hover:border-slate-500 transition-colors"
                                >
                                    {editingCategory?.id === category.id ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={editingCategory.name}
                                                onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                                                className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-slate-100"
                                            />
                                            <button
                                                onClick={() => handleSaveCategory(category)}
                                                className="p-1.5 text-green-400 hover:bg-slate-700 rounded transition-colors"
                                                title="Зберегти"
                                            >
                                                <Check className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setEditingCategory(null)}
                                                className="p-1.5 text-slate-400 hover:bg-slate-700 rounded transition-colors"
                                                title="Скасувати"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between group">
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={category.active}
                                                    onChange={(e) => toggleCategoryMutation.mutate({ id: category.id, active: e.target.checked })}
                                                    className="w-4 h-4"
                                                />
                                                <span className={clsx(
                                                    "font-medium",
                                                    category.active ? "text-slate-200" : "text-slate-500"
                                                )}>
                                                    {category.name}
                                                </span>
                                            </div>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => setEditingCategory(category)}
                                                    className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded-lg transition-colors"
                                                    title="Редагувати"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setCategoryToDelete({ id: category.id, name: category.name })}
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

            {/* Activation Confirmation Modal */}
            <ConfirmationModal
                isOpen={showActivationConfirm}
                onClose={() => setShowActivationConfirm(false)}
                onConfirm={handleActivate}
                title="Активувати касу?"
                message={`Ви збираєтесь активувати касу з початковими балансами:\nГотівка: ${initialCash.toFixed(2)} ₴\nКартка: ${initialCard.toFixed(2)} ₴\n\nОблік почнеться з цього моменту. Старі ремонти НЕ будуть враховані.`}
                confirmLabel="Активувати"
                isLoading={activateMutation.isPending}
            />

            {/* Delete Category Confirmation Modal */}
            <ConfirmationModal
                isOpen={!!categoryToDelete}
                onClose={() => setCategoryToDelete(null)}
                onConfirm={() => categoryToDelete && deleteCategoryMutation.mutate(categoryToDelete.id)}
                title="Видалення категорії"
                message={`Ви впевнені, що хочете видалити категорію "${categoryToDelete?.name}"?`}
                confirmLabel="Видалити"
                isDestructive={true}
                isLoading={deleteCategoryMutation.isPending}
            />

            {/* Delete Income Category Confirmation Modal */}
            <ConfirmationModal
                isOpen={!!incomeCategoryToDelete}
                onClose={() => setIncomeCategoryToDelete(null)}
                onConfirm={() => incomeCategoryToDelete && deleteIncomeCategoryMutation.mutate(incomeCategoryToDelete.id)}
                title="Видалення категорії"
                message={`Ви впевнені, що хочете видалити категорію "${incomeCategoryToDelete?.name}"?`}
                confirmLabel="Видалити"
                isDestructive={true}
                isLoading={deleteIncomeCategoryMutation.isPending}
            />
        </div>
    );
}
