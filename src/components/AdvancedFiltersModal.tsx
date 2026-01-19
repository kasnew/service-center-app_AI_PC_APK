import React, { useState } from 'react';
import { X, Plus, Trash2, Filter } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export interface AdvancedFilterRule {
    logic: 'AND' | 'OR';
    field: string;
    operator: 'eq' | 'neq' | 'cont' | 'ncont' | 'gt' | 'lt' | 'gte' | 'lte';
    value: string;
}

interface AdvancedFiltersModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (rules: AdvancedFilterRule[]) => void;
    initialRules: AdvancedFilterRule[];
}

const FIELDS = [
    { id: 'receiptId', label: 'Квитанція' },
    { id: 'deviceName', label: 'Техніка' },
    { id: 'faultDesc', label: 'Несправність' },
    { id: 'workDone', label: 'Виконані роботи' },
    { id: 'costLabor', label: 'Вартість робіт' },
    { id: 'totalCost', label: 'Загальна сума' },
    { id: 'clientName', label: 'Ім\'я клієнта' },
    { id: 'clientPhone', label: 'Телефон' },
    { id: 'profit', label: 'Дохід' },
    { id: 'note', label: 'Примітка' },
    { id: 'executor', label: 'Виконавець' },
    { id: 'isPaid', label: 'Оплачено (true/false)' },
];

const OPERATORS = [
    { id: 'cont', label: 'Містить' },
    { id: 'ncont', label: 'Не містить' },
    { id: 'eq', label: 'Дорівнює' },
    { id: 'neq', label: 'Не дорівнює' },
    { id: 'gt', label: 'Більше ніж' },
    { id: 'lt', label: 'Менше ніж' },
    { id: 'gte', label: 'Більше або дорівнює' },
    { id: 'lte', label: 'Менше або дорівнює' },
];

export const AdvancedFiltersModal: React.FC<AdvancedFiltersModalProps> = ({
    isOpen, onClose, onApply, initialRules
}) => {
    const { currentTheme } = useTheme();
    const isLight = currentTheme.type === 'light';
    const [rules, setRules] = useState<AdvancedFilterRule[]>(
        initialRules.length > 0 ? initialRules : [{ logic: 'AND', field: 'deviceName', operator: 'cont', value: '' }]
    );

    const addRule = () => {
        setRules([...rules, { logic: 'AND', field: 'deviceName', operator: 'cont', value: '' }]);
    };

    const removeRule = (index: number) => {
        const newRules = rules.filter((_, i) => i !== index);
        if (newRules.length === 0) {
            newRules.push({ logic: 'AND', field: 'deviceName', operator: 'cont', value: '' });
        }
        setRules(newRules);
    };

    const updateRule = (index: number, updates: Partial<AdvancedFilterRule>) => {
        const newRules = [...rules];
        newRules[index] = { ...newRules[index], ...updates };
        setRules(newRules);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={`relative w-full max-w-4xl rounded-xl shadow-2xl flex flex-col max-h-[90vh] 
                ${isLight ? 'bg-white' : 'bg-slate-800 border border-slate-700'}`}>

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-600/20">
                    <div className="flex items-center gap-3">
                        <Filter className="w-5 h-5 text-blue-500" />
                        <h3 className={`text-xl font-bold ${isLight ? 'text-slate-800' : 'text-slate-100'}`}>
                            Розширені фільтри
                        </h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {rules.map((rule, index) => (
                        <div key={index} className="flex items-center gap-3 animate-in slide-in-from-left-2 duration-200">
                            {index > 0 ? (
                                <select
                                    value={rule.logic}
                                    onChange={(e) => updateRule(index, { logic: e.target.value as 'AND' | 'OR' })}
                                    className={`w-20 px-2 py-2 rounded-lg text-sm font-bold border-2 transition-all focus:outline-none
                                        ${isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-slate-900 border-slate-700 text-slate-300'}`}
                                >
                                    <option value="AND">ТА (AND)</option>
                                    <option value="OR">АБО (OR)</option>
                                </select>
                            ) : (
                                <div className="w-20 text-center text-xs font-bold text-slate-500 uppercase">Пошук</div>
                            )}

                            <select
                                value={rule.field}
                                onChange={(e) => updateRule(index, { field: e.target.value })}
                                className={`flex-1 px-3 py-2 rounded-lg text-sm border-2 transition-all focus:outline-none
                                    ${isLight ? 'bg-white border-slate-200 focus:border-blue-500' : 'bg-slate-900 border-slate-700 focus:border-blue-500 text-slate-200'}`}
                            >
                                {FIELDS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                            </select>

                            <select
                                value={rule.operator}
                                onChange={(e) => updateRule(index, { operator: e.target.value as any })}
                                className={`w-40 px-3 py-2 rounded-lg text-sm border-2 transition-all focus:outline-none
                                    ${isLight ? 'bg-white border-slate-200 focus:border-blue-500' : 'bg-slate-900 border-slate-700 focus:border-blue-500 text-slate-200'}`}
                            >
                                {OPERATORS.map(op => <option key={op.id} value={op.id}>{op.label}</option>)}
                            </select>

                            <input
                                type="text"
                                value={rule.value}
                                onChange={(e) => updateRule(index, { value: e.target.value })}
                                placeholder="Значення..."
                                className={`flex-[1.5] px-3 py-2 rounded-lg text-sm border-2 transition-all focus:outline-none
                                    ${isLight ? 'bg-white border-slate-200 focus:border-blue-500' : 'bg-slate-900 border-slate-700 focus:border-blue-500 text-slate-200'}`}
                            />

                            <button
                                onClick={() => removeRule(index)}
                                className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                title="Видалити умову"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}

                    <button
                        onClick={addRule}
                        className="flex items-center gap-2 px-4 py-2 mt-4 text-sm font-medium text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Додати умову
                    </button>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-600/20 flex justify-between bg-slate-900/10">
                    <button
                        onClick={() => {
                            setRules([{ logic: 'AND', field: 'deviceName', operator: 'cont', value: '' }]);
                            onApply([]);
                        }}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors
                            ${isLight ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-400 hover:bg-slate-700'}`}
                    >
                        Скинути
                    </button>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className={`px-6 py-2 text-sm font-medium rounded-lg transition-colors
                                ${isLight ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                        >
                            Скасувати
                        </button>
                        <button
                            onClick={() => onApply(rules.filter(r => r.value.trim() !== ''))}
                            className="px-8 py-2 text-sm font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                        >
                            Застосувати фільтри
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
