import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { X, Phone, Smartphone } from 'lucide-react';
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

    useHotkeys('escape', () => {
        if (isOpen) onClose();
    });

    useEffect(() => {
        if (isOpen && canvasRef.current && phoneNumber) {
            // Clean up phone number (remove spaces, parentheses, etc.)
            const cleanPhone = phoneNumber.replace(/\D/g, '');
            // Simple tel: link
            const telLink = `tel:+${cleanPhone.startsWith('38') ? cleanPhone : '38' + cleanPhone}`;

            QRCode.toCanvas(
                canvasRef.current,
                telLink,
                {
                    width: 256,
                    margin: 2,
                    color: {
                        dark: isLight ? '#1e293b' : '#f8fafc',
                        light: isLight ? '#f8fafc' : '#1e293b',
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
                            <canvas ref={canvasRef} className="w-64 h-64 rounded-lg" />
                        )}
                    </div>

                    <div className="text-center space-y-2 mb-6">
                        <p className={`text-xl font-bold ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                            {phoneNumber}
                        </p>
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

                    <div className="w-full flex gap-3">
                        <a
                            href={`tel:${phoneNumber.replace(/\D/g, '')}`}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all
                            ${isLight ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200' : 'bg-blue-500 hover:bg-blue-600 text-white shadow-blue-900/40'}
                            shadow-lg active:scale-[0.98]`}
                        >
                            <Phone className="w-4 h-4" />
                            ОК
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};
