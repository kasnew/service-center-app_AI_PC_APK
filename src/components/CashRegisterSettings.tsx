import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cashRegisterApi, expenseCategoriesApi, incomeCategoriesApi } from '../api/cashRegister';
import { ExpenseCategory, IncomeCategory } from '../types/db';
import { Wallet, Edit2, Check, X, Plus, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { ConfirmationModal } from './ConfirmationModal';
import { normalizeMoneyInput, parseMoneyValue } from '../utils/formatters';

export function CashRegisterSettings() {
    const queryClient = useQueryClient();
    const [cardCommission, setCardCommission] = useState<number | null>(null);
    const [initialCash, setInitialCash] = useState<number | null>(null);
    const [initialCard, setInitialCard] = useState<number | null>(null);
    const [showActivationConfirm, setShowActivationConfirm] = useState(false);

    const [newCategoryName, setNewCategoryName] = useState('');
    const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
    const [categoryToDelete, setCategoryToDelete] = useState<{ id: number; name: string } | null>(null);

    const [newIncomeCategoryName, setNewIncomeCategoryName] = useState('');
    const [editingIncomeCategory, setEditingIncomeCategory] = useState<IncomeCategory | null>(null);
    const [incomeCategoryToDelete, setIncomeCategoryToDelete] = useState<{ id: number; name: string } | null>(null);

    const { data: settings } = useQuery({
        queryKey: ['cash-register-settings'],
        queryFn: () => cashRegisterApi.getSettings(),
    });

    const { data: categories = [], isLoading: isLoadingCategories } = useQuery({
        queryKey: ['expense-categories'],
        queryFn: () => expenseCategoriesApi.getCategories(),
    });

    const { data: incomeCategories = [], isLoading: isLoadingIncomeCategories } = useQuery({
        queryKey: ['income-categories'],
        queryFn: () => incomeCategoriesApi.getCategories(),
    });

    useEffect(() => {
        if (settings) {
            setCardCommission(settings.cardCommissionPercent);
        }
    }, [settings]);

    const updateCommissionMutation = useMutation({
        mutationFn: (commission: number) => cashRegisterApi.updateSettings({ cardCommissionPercent: commission }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cash-register-settings'] });
        },
    });

    const activateMutation = useMutation({
        mutationFn: (data: { initialCash: number; initialCard: number }) => cashRegisterApi.activateCashRegister(data.initialCash, data.initialCard),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cash-register-settings'] });
            setShowActivationConfirm(false);
        },
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

    const handleCommissionSave = () => {
        if (cardCommission !== null) {
            updateCommissionMutation.mutate(cardCommission);
        }
    };

    const handleActivate = () => {
        activateMutation.mutate({
            initialCash: initialCash || 0,
            initialCard: initialCard || 0,
        });
    };

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

    return (
        <div className="space-y-4">
            {/* Activation/Status and Commission - Single Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Activation Section */}
                {!settings?.cashRegisterEnabled ? (
                    <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                        <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                            <Wallet className="w-5 h-5" />
                            Каса
                        </h3>
                        <div className="bg-yellow-900/30 border border-yellow-700 rounded p-3 mb-3">
                            <p className="text-xs text-yellow-200">
                                Облік в касі почнеться з цього моменту. Старі ремонти НЕ будуть враховані.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                            <input
                                type="text"
                                inputMode="decimal"
                                value={initialCash || ''}
                                onChange={(e) => {
                                    const normalized = normalizeMoneyInput(e.target.value);
                                    const parsed = parseMoneyValue(normalized);
                                    setInitialCash(parsed);
                                }}
                                placeholder="Готівка (₴)"
                                className="bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                            />
                            <input
                                type="text"
                                inputMode="decimal"
                                value={initialCard || ''}
                                onChange={(e) => {
                                    const normalized = normalizeMoneyInput(e.target.value);
                                    const parsed = parseMoneyValue(normalized);
                                    setInitialCard(parsed);
                                }}
                                placeholder="Картка (₴)"
                                className="bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                            />
                        </div>
                        <button
                            onClick={() => setShowActivationConfirm(true)}
                            className="w-full px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                        >
                            Активувати касу
                        </button>
                    </div>
                ) : (
                    <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                        <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                            <Wallet className="w-5 h-5" />
                            Каса
                        </h3>
                        <div className="bg-green-900/30 border border-green-700 rounded p-3">
                            <p className="text-xs text-green-200">
                                Активовано {settings && new Date(settings.cashRegisterStartDate).toLocaleString('uk-UA')}. Баланси в розділі "Каса".
                            </p>
                        </div>
                    </div>
                )}

                {/* Commission Settings */}
                <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                    <h3 className="text-lg font-semibold text-slate-100 mb-3">Комісія банку</h3>
                    <div className="flex items-end gap-2">
                        <div className="flex-1">
                            <input
                                type="text"
                                inputMode="decimal"
                                value={cardCommission || ''}
                                onChange={(e) => {
                                    const normalized = normalizeMoneyInput(e.target.value);
                                    const parsed = parseMoneyValue(normalized);
                                    setCardCommission(parsed);
                                }}
                                placeholder="Комісія (%)"
                                className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                            />
                        </div>
                        <button
                            onClick={handleCommissionSave}
                            disabled={updateCommissionMutation.isPending}
                            className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                            Зберегти
                        </button>
                    </div>
                </div>
            </div>

            {/* Income and Expense Categories - Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Income Categories */}
                <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                    <h3 className="text-lg font-semibold text-slate-100 mb-3">Категорії прибутків</h3>
                    <form onSubmit={handleAddIncomeCategory} className="mb-3 flex gap-2">
                        <input
                            type="text"
                            value={newIncomeCategoryName}
                            onChange={(e) => setNewIncomeCategoryName(e.target.value)}
                            placeholder="Нова категорія"
                            className="flex-1 bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                        />
                        <button
                            type="submit"
                            disabled={!newIncomeCategoryName.trim() || addIncomeCategoryMutation.isPending}
                            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </form>
                    <div className="max-h-60 overflow-y-auto space-y-1.5">
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
                                                className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-slate-100"
                                            />
                                            <button onClick={() => handleSaveIncomeCategory(category)} className="p-1 text-green-400"><Check className="w-3.5 h-3.5" /></button>
                                            <button onClick={() => setEditingIncomeCategory(null)} className="p-1 text-slate-400"><X className="w-3.5 h-3.5" /></button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between group">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={category.active}
                                                    onChange={(e) => toggleIncomeCategoryMutation.mutate({ id: category.id, active: e.target.checked })}
                                                    className="w-3.5 h-3.5"
                                                />
                                                <span className={clsx("text-sm", category.active ? "text-slate-200" : "text-slate-500")}>{category.name}</span>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                    <h3 className="text-lg font-semibold text-slate-100 mb-3">Категорії витрат</h3>
                    <form onSubmit={handleAddCategory} className="mb-3 flex gap-2">
                        <input
                            type="text"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder="Нова категорія"
                            className="flex-1 bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                        />
                        <button
                            type="submit"
                            disabled={!newCategoryName.trim() || addCategoryMutation.isPending}
                            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </form>
                    <div className="max-h-60 overflow-y-auto space-y-1.5">
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
                                                className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-slate-100"
                                            />
                                            <button onClick={() => handleSaveCategory(category)} className="p-1 text-green-400"><Check className="w-3.5 h-3.5" /></button>
                                            <button onClick={() => setEditingCategory(null)} className="p-1 text-slate-400"><X className="w-3.5 h-3.5" /></button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between group">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={category.active}
                                                    onChange={(e) => toggleCategoryMutation.mutate({ id: category.id, active: e.target.checked })}
                                                    className="w-3.5 h-3.5"
                                                />
                                                <span className={clsx("text-sm", category.active ? "text-slate-200" : "text-slate-500")}>{category.name}</span>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
            </div>

            <ConfirmationModal
                isOpen={showActivationConfirm}
                onClose={() => setShowActivationConfirm(false)}
                onConfirm={handleActivate}
                title="Активація каси"
                message={`Ви впевнені, що хочете активувати касу з початковим балансом: Готівка - ${initialCash || 0}₴, Картка - ${initialCard || 0}₴?`}
            />

            <ConfirmationModal
                isOpen={!!categoryToDelete}
                onClose={() => setCategoryToDelete(null)}
                onConfirm={() => categoryToDelete && deleteCategoryMutation.mutate(categoryToDelete.id)}
                title="Видалення категорії"
                message={`Ви впевнені, що хочете видалити категорію витрат "${categoryToDelete?.name}"?`}
            />

            <ConfirmationModal
                isOpen={!!incomeCategoryToDelete}
                onClose={() => setIncomeCategoryToDelete(null)}
                onConfirm={() => incomeCategoryToDelete && deleteIncomeCategoryMutation.mutate(incomeCategoryToDelete.id)}
                title="Видалення категорії"
                message={`Ви впевнені, що хочете видалити категорію прибутків "${incomeCategoryToDelete?.name}"?`}
            />
        </div>
    );
}
