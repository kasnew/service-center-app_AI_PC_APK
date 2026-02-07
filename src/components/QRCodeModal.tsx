import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { X, Smartphone, Copy, Check } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

import { useHotkeys } from '../hooks/useHotkeys';

interface QRCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    phoneNumber: string;
    clientName?: string;
    workDone?: string;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ isOpen, onClose, phoneNumber, clientName, workDone }) => {
    const { currentTheme } = useTheme();
    const isLight = currentTheme.type === 'light';
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [qrError, setQrError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(phoneNumber);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    useHotkeys('escape', () => {
        if (isOpen) onClose();
    });

    useEffect(() => {
        if (isOpen && canvasRef.current && phoneNumber) {
            // Clean up phone number (remove spaces, parentheses, etc.)
            const cleanPhone = phoneNumber.replace(/\D/g, '');
            // Simple tel: link
            // Use vCard format for better compatibility with Android/Xiaomi scanners
            // and to include identifying information
            const telLink = `tel:+${cleanPhone.startsWith('38') ? cleanPhone : '38' + cleanPhone}`;

            QRCode.toCanvas(
                canvasRef.current,
                telLink,
                {
                    width: 256,
                    margin: 4, // Increased margin for better detection
                    errorCorrectionLevel: 'H', // Use highest error correction
                    color: {
                        dark: '#000000',  // Always black modules
                        light: '#ffffff', // Always white background
                    },
                },
                (error) => {
                    if (error) {
                        console.error('QR Code error:', error);
                        setQrError('Помилка генерації QR-коду');
                    } else {
                        setQrError(null);
                    }
                }
            );
        }
    }, [isOpen, phoneNumber, isLight]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className={`relative w-full max-w-sm rounded-2xl shadow-2xl p-6 overflow-hidden 
                ${isLight ? 'bg-white' : 'bg-slate-800 border border-slate-700'} 
                rainbow-groupbox animate-in zoom-in-95 duration-200`}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isLight ? 'bg-blue-100' : 'bg-blue-900/30'}`}>
                            <Smartphone className={`w-5 h-5 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
                        </div>
                        <h3 className={`text-lg font-bold ${isLight ? 'text-slate-800' : 'text-slate-100'}`}>
                            Зателефонувати клієнту
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-full transition-colors ${isLight ? 'hover:bg-slate-100 text-slate-400' : 'hover:bg-slate-700 text-slate-500'}`}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex flex-col items-center">
                    <div className={`p-4 rounded-xl mb-4 ${isLight ? 'bg-slate-50' : 'bg-slate-900/50'}`}>
                        {qrError ? (
                            <div className="w-64 h-64 flex items-center justify-center text-red-500 text-center px-4">
                                {qrError}
                            </div>
                        ) : (
                            <div
                                className="relative cursor-pointer group"
                                onClick={handleCopy}
                                title="Натисніть, щоб скопіювати номер"
                            >
                                <canvas ref={canvasRef} className="w-64 h-64 rounded-lg transition-opacity group-hover:opacity-75" />
                                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-lg">
                                    {copied ? (
                                        <div className="bg-green-600 text-white px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg animate-in zoom-in-95">
                                            <Check className="w-4 h-4" />
                                            <span className="text-xs font-bold">Скопійовано!</span>
                                        </div>
                                    ) : (
                                        <div className="bg-blue-600 text-white px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg">
                                            <Copy className="w-4 h-4" />
                                            <span className="text-xs font-bold">Копіювати</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="text-center space-y-2 mb-6">
                        <div
                            className="flex flex-col items-center cursor-pointer group"
                            onClick={handleCopy}
                            title="Натисніть, щоб скопіювати номер"
                        >
                            <p className={`text-xl font-bold transition-colors ${isLight ? 'text-slate-900 group-hover:text-blue-600' : 'text-slate-100 group-hover:text-blue-400'}`}>
                                {phoneNumber}
                            </p>
                            {copied && !qrError && (
                                <span className="text-[10px] text-green-500 font-bold animate-in fade-in slide-in-from-top-1">
                                    Скопійовано
                                </span>
                            )}
                        </div>
                        {clientName && (
                            <p className="text-sm font-medium text-slate-400 uppercase tracking-wide">
                                {clientName}
                            </p>
                        )}
                        {workDone ? (
                            <div className={`mt-4 p-3 rounded-lg text-sm max-w-[280px] mx-auto text-left border ${isLight ? 'bg-blue-50 border-blue-100 text-blue-800' : 'bg-blue-900/20 border-blue-800/50 text-blue-200'}`}>
                                <div className="font-bold mb-1 flex items-center gap-1.5 opacity-80 uppercase text-[10px] tracking-wider">
                                    <Smartphone className="w-3 h-3" />
                                    Виконана робота:
                                </div>
                                <div className="line-clamp-6 leading-relaxed">
                                    {workDone}
                                </div>
                            </div>
                        ) : (
                            <p className="text-xs text-slate-500 max-w-[240px] mx-auto mt-4 leading-relaxed">
                                Відскануйте QR-код камерою телефону, щоб миттєво розпочати дзвінок
                            </p>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};
