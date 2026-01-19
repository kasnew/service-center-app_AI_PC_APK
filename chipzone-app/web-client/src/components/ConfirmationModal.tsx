import React, { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isDestructive?: boolean;
    isLoading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel = 'Підтвердити',
    cancelLabel = 'Скасувати',
    isDestructive = false,
    isLoading = false,
}) => {
    const confirmButtonRef = useRef<HTMLButtonElement>(null);

    // Focus management
    useEffect(() => {
        if (isOpen) {
            // Small timeout to ensure the modal is rendered before focusing
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
                        <div className={`p-2 rounded-full ${isDestructive ? 'bg-red-900/30 text-red-500' : 'bg-blue-900/30 text-blue-500'}`}>
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <h3 id="modal-title" className="text-lg font-semibold text-slate-100 mb-2">
                                {title}
                            </h3>
                            <p className="text-slate-300 text-sm leading-relaxed">
                                {message}
                            </p>
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
                        {cancelLabel}
                    </button>
                    <button
                        ref={confirmButtonRef}
                        type="button"
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 ${isDestructive
                                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                                : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {isLoading ? 'Обробка...' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};
