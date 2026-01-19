import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface DeleteItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (isWriteOff: boolean) => void;
    itemName: string;
    isLoading?: boolean;
}

export const DeleteItemModal: React.FC<DeleteItemModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    itemName,
    isLoading = false,
}) => {
    const [isWriteOff, setIsWriteOff] = useState(false);
    const confirmButtonRef = useRef<HTMLButtonElement>(null);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setIsWriteOff(false);
            const timer = setTimeout(() => {
                confirmButtonRef.current?.focus();
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div
                className="bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
            >
                <div className="p-6">
                    <div className="flex items-start gap-4">
                        <div className="p-2 rounded-full bg-red-900/30 text-red-500">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <h3 id="modal-title" className="text-lg font-semibold text-slate-100 mb-2">
                                Видалення товару
                            </h3>
                            <p className="text-slate-300 text-sm leading-relaxed mb-4">
                                Ви впевнені, що хочете видалити товар <span className="font-semibold">"{itemName}"</span>?
                            </p>
                            
                            <div className="space-y-3 mt-4">
                                <label className="flex items-start gap-3 p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
                                    <input
                                        type="radio"
                                        name="deleteType"
                                        checked={!isWriteOff}
                                        onChange={() => setIsWriteOff(false)}
                                        className="mt-1 w-4 h-4 border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500"
                                    />
                                    <div className="flex-1">
                                        <div className="text-sm font-medium text-slate-200">Видалення</div>
                                        <div className="text-xs text-slate-400 mt-1">
                                            Товар буде видалено, кошти повернуться на баланс
                                        </div>
                                    </div>
                                </label>
                                
                                <label className="flex items-start gap-3 p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
                                    <input
                                        type="radio"
                                        name="deleteType"
                                        checked={isWriteOff}
                                        onChange={() => setIsWriteOff(true)}
                                        className="mt-1 w-4 h-4 border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500"
                                    />
                                    <div className="flex-1">
                                        <div className="text-sm font-medium text-slate-200">Списання коштів</div>
                                        <div className="text-xs text-slate-400 mt-1">
                                            Товар буде видалено, кошти НЕ повернуться на баланс (наприклад, коробка, упаковка)
                                        </div>
                                    </div>
                                </label>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            disabled={isLoading}
                            className="text-slate-400 hover:text-slate-200 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
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
                        ref={confirmButtonRef}
                        type="button"
                        onClick={() => onConfirm(isWriteOff)}
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Обробка...' : 'Підтвердити'}
                    </button>
                </div>
            </div>
        </div>
    );
};






