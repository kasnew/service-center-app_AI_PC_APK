import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cashRegisterApi } from '../api/cashRegister';
import { Wallet } from 'lucide-react';
import { ConfirmationModal } from './ConfirmationModal';
import { normalizeMoneyInput, parseMoneyValue } from '../utils/formatters';

export function CashRegisterSettings() {
    const queryClient = useQueryClient();
    const [cardCommission, setCardCommission] = useState<number | null>(null);
    const [initialCash, setInitialCash] = useState<number | null>(null);
    const [initialCard, setInitialCard] = useState<number | null>(null);
    const [showActivationConfirm, setShowActivationConfirm] = useState(false);

    const { data: settings } = useQuery({
        queryKey: ['cash-register-settings'],
        queryFn: () => cashRegisterApi.getSettings(),
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

            <ConfirmationModal
                isOpen={showActivationConfirm}
                onClose={() => setShowActivationConfirm(false)}
                onConfirm={handleActivate}
                title="Активація каси"
                message={`Ви впевнені, що хочете активувати касу з початковим балансом: Готівка - ${initialCash || 0}₴, Картка - ${initialCard || 0}₴?`}
            />
        </div>
    );
}
