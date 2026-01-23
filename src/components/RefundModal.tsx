import React, { useState, useEffect, useRef } from 'react';
import { X, RotateCcw, CreditCard, Banknote, Package } from 'lucide-react';

interface RefundModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: RefundData) => void;
    receiptId: number;
    totalCost: number;
    originalPaymentType: string;
    hasParts: boolean;
    isLoading?: boolean;
}

export interface RefundData {
    refundAmount: number;
    refundType: 'Готівка' | 'Картка';
    returnPartsToWarehouse: boolean;
    note: string;
}

export const RefundModal: React.FC<RefundModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    receiptId,
    totalCost,
    originalPaymentType,
    hasParts,
    isLoading = false,
}) => {
    const [refundAmount, setRefundAmount] = useState(totalCost);
    const [refundType, setRefundType] = useState<'Готівка' | 'Картка'>(
        originalPaymentType === 'Картка' ? 'Картка' : 'Готівка'
    );
    const [returnPartsToWarehouse, setReturnPartsToWarehouse] = useState(true);
    const [note, setNote] = useState('');
    const amountInputRef = useRef<HTMLInputElement>(null);

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setRefundAmount(totalCost);
            setRefundType(originalPaymentType === 'Картка' ? 'Картка' : 'Готівка');
            setReturnPartsToWarehouse(true);
            setNote('');
            setTimeout(() => amountInputRef.current?.focus(), 50);
        }
    }, [isOpen, totalCost, originalPaymentType]);

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen && !isLoading) {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose, isLoading]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm({
            refundAmount,
            refundType,
            returnPartsToWarehouse,
            note,
        });
    };

    if (!isOpen) return null;

    const isPartialRefund = refundAmount !== totalCost;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div
                className="bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
            >
                <form onSubmit={handleSubmit}>
                    <div className="p-6">
                        <div className="flex items-start gap-4 mb-6">
                            <div className="p-2 rounded-full bg-amber-900/30 text-amber-500">
                                <RotateCcw className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <h3 id="modal-title" className="text-lg font-semibold text-slate-100 mb-1">
                                    Повернення коштів
                                </h3>
                                <p className="text-slate-400 text-sm">
                                    Квитанція #{receiptId}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isLoading}
                                className="text-slate-400 hover:text-slate-200 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Original payment info */}
                            <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-400">Оплачено:</span>
                                    <span className="text-slate-200 font-medium">{totalCost.toFixed(2)} ₴</span>
                                </div>
                                <div className="flex justify-between items-center text-sm mt-1">
                                    <span className="text-slate-400">Спосіб оплати:</span>
                                    <span className="text-slate-200 font-medium">{originalPaymentType}</span>
                                </div>
                            </div>

                            {/* Refund amount */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Сума повернення (₴)
                                </label>
                                <input
                                    ref={amountInputRef}
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max={totalCost}
                                    value={refundAmount}
                                    onChange={(e) => setRefundAmount(Number(e.target.value))}
                                    className="w-full bg-slate-900 border-2 border-slate-600 rounded-lg px-4 py-3 text-lg font-semibold focus:outline-none focus:border-amber-500 shadow-sm"
                                    disabled={isLoading}
                                />
                                {isPartialRefund && (
                                    <p className="text-amber-400 text-xs mt-1.5">
                                        ⚠️ Часткове повернення: {(totalCost - refundAmount).toFixed(2)} ₴ залишається
                                    </p>
                                )}
                            </div>

                            {/* Refund type */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Спосіб повернення
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setRefundType('Готівка')}
                                        disabled={isLoading}
                                        className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${refundType === 'Готівка'
                                                ? 'border-green-500 bg-green-900/30 text-green-400'
                                                : 'border-slate-600 bg-slate-900/50 text-slate-400 hover:border-slate-500'
                                            }`}
                                    >
                                        <Banknote className="w-5 h-5" />
                                        <span className="font-medium">Готівка</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setRefundType('Картка')}
                                        disabled={isLoading}
                                        className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${refundType === 'Картка'
                                                ? 'border-blue-500 bg-blue-900/30 text-blue-400'
                                                : 'border-slate-600 bg-slate-900/50 text-slate-400 hover:border-slate-500'
                                            }`}
                                    >
                                        <CreditCard className="w-5 h-5" />
                                        <span className="font-medium">Картка</span>
                                    </button>
                                </div>
                                {refundType !== originalPaymentType && (
                                    <p className="text-blue-400 text-xs mt-1.5">
                                        ℹ️ Повернення іншим способом: оригінал {originalPaymentType}
                                    </p>
                                )}
                            </div>

                            {/* Return parts to warehouse */}
                            {hasParts && (
                                <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                                    <label className="flex items-start gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={returnPartsToWarehouse}
                                            onChange={(e) => setReturnPartsToWarehouse(e.target.checked)}
                                            className="w-5 h-5 mt-0.5 rounded border-slate-600 bg-slate-800 text-cyan-600 focus:ring-cyan-500"
                                            disabled={isLoading}
                                        />
                                        <div>
                                            <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
                                                <Package className="w-4 h-4 text-cyan-400" />
                                                Повернути товари на склад
                                            </div>
                                            <p className="text-xs text-slate-400 mt-1">
                                                Товари з квитанції будуть повернені на склад та знову стануть доступними для продажу
                                            </p>
                                        </div>
                                    </label>
                                </div>
                            )}

                            {/* Note */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Примітка (необов'язково)
                                </label>
                                <textarea
                                    rows={2}
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder="Причина повернення..."
                                    className="w-full bg-slate-900 border-2 border-slate-600 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-amber-500 shadow-sm"
                                    disabled={isLoading}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900/50 px-6 py-4 flex justify-end gap-3 border-t border-slate-700">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500"
                        >
                            Скасувати
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || refundAmount <= 0 || refundAmount > totalCost}
                            className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <RotateCcw className="w-4 h-4" />
                            {isLoading ? 'Обробка...' : `Повернути ${refundAmount.toFixed(2)} ₴`}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
