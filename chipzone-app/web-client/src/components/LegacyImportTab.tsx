import { useState, useEffect } from 'react';
import { legacyImportApi } from '../api/legacyImport';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, FileCheck, AlertTriangle, Download, Loader2 } from 'lucide-react';

export function LegacyImportTab() {
    const queryClient = useQueryClient();
    // const [legacyDbPath, setLegacyDbPath] = useState(''); // Unused until file upload is implemented
    const legacyDbPath = ''; // Placeholder
    const [validationResult, setValidationResult] = useState<any>(null);
    const [importBackupName, setImportBackupName] = useState('');
    const [importProgress, setImportProgress] = useState<any>(null);
    const [showImportConfirm, setShowImportConfirm] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // Fix focus issue removed (not needed for web)

    // Listen to import progress
    useEffect(() => {
        const cleanup = legacyImportApi.onImportProgress((progress) => {
            setImportProgress(progress);
        });
        return cleanup;
    }, []);

    // Validate legacy database mutation
    const validateMutation = useMutation({
        mutationFn: () => legacyImportApi.validateLegacyDatabase(legacyDbPath),
        onSuccess: (result) => {
            setValidationResult(result);
        },
        onError: (error: any) => {
            console.error('Validation error:', error);
            setValidationResult({ isValid: false, error: error.message });
        },
    });

    // Import legacy database mutation
    const importMutation = useMutation({
        mutationFn: () => legacyImportApi.importLegacyDatabase(legacyDbPath, importBackupName || undefined),
        onSuccess: (result) => {
            setShowImportConfirm(false);
            setImportProgress(null);
            queryClient.invalidateQueries({ queryKey: ['backups'] });

            if (result.success) {
                setSuccessMessage(`Імпорт успішно завершено!\n\nІмпортовано:\n- Ремонтів: ${result.imported?.repairs}\n- Запчастин: ${result.imported?.parts}\n- Транзакцій: ${result.imported?.transactions}\n- Заміток: ${result.imported?.notes}`);
                setShowSuccessModal(true);
            }
        },
        onError: (error: any) => {
            console.error('Import error:', error);
            setShowImportConfirm(false);
            setImportProgress(null);
            setErrorMessage(`Помилка імпорту: ${error.message}`);
            setShowErrorModal(true);
        },
    });

    const handleSelectFile = async () => {
        alert('Ця функція недоступна у веб-версії. Будь ласка, завантажте файл DB вручну на сервер (feature in progress).');
        // Web version cannot access local filesystem paths like Electron
        // Implement file upload logic later
    };

    const handleValidate = () => {
        if (!legacyDbPath) return;
        validateMutation.mutate();
    };

    const handleImport = () => {
        if (!validationResult?.isValid) return;
        setShowImportConfirm(true);
    };

    return (
        <div className="bg-slate-700 rounded-lg shadow-sm p-6 mb-6 border border-slate-600">
            <h2 className="text-xl font-semibold text-slate-100 mb-4 flex items-center gap-2">
                <Upload className="w-6 h-6" />
                Імпорт Legacy БД
            </h2>

            {/* Warning Message */}
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-red-200">
                        <p className="font-semibold mb-1">Увага! Повна заміна даних</p>
                        <p className="mb-2">Цей імпорт повністю замінить всі поточні дані даними з legacy бази даних. Це незворотня операція (окрім відновлення з резервної копії).</p>
                        <p>Перед імпортом буде автоматично створено резервну копію поточної БД.</p>
                    </div>
                </div>
            </div>

            {/* File Selection */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                    Крок 1: Оберіть legacy базу даних
                </label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={legacyDbPath}
                        readOnly
                        placeholder="Шлях до файлу 1.sqlite"
                        className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-slate-100 focus:outline-none"
                    />
                    <button
                        onClick={handleSelectFile}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <FileCheck className="w-4 h-4" />
                        Обрати файл
                    </button>
                </div>
            </div>

            {/* Validation */}
            {legacyDbPath && (
                <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Крок 2: Перевірте базу даних
                    </label>
                    <button
                        onClick={handleValidate}
                        disabled={validateMutation.isPending}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                        {validateMutation.isPending ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Перевірка...
                            </>
                        ) : (
                            <>
                                <FileCheck className="w-4 h-4" />
                                Перевірити БД
                            </>
                        )}
                    </button>

                    {validationResult && (
                        <div className={`mt-4 p-4 rounded-lg border ${validationResult.isValid
                            ? 'bg-green-900/30 border-green-700'
                            : 'bg-red-900/30 border-red-700'
                            }`}>
                            {validationResult.isValid ? (
                                <div>
                                    <p className="text-green-200 font-semibold mb-2">✓ База даних валідна</p>
                                    <div className="text-sm text-green-100">
                                        <p>Знайдено записів:</p>
                                        <ul className="list-disc list-inside mt-1 ml-2">
                                            <li>Ремонтів: {validationResult.stats.repairs}</li>
                                            <li>Запчастин: {validationResult.stats.parts}</li>
                                            <li>Транзакцій: {validationResult.stats.transactions}</li>
                                            <li>Заміток: {validationResult.stats.notes}</li>
                                        </ul>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-red-200 font-semibold mb-1">✗ Помилка валідації</p>
                                    <p className="text-sm text-red-100">{validationResult.error}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Backup Name Input */}
            {validationResult?.isValid && (
                <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Крок 3: Назва резервної копії (опціонально)
                    </label>
                    <input
                        type="text"
                        value={importBackupName}
                        onChange={(e) => setImportBackupName(e.target.value)}
                        placeholder="Наприклад: before_legacy_import"
                        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                    <p className="text-xs text-slate-400 mt-1">
                        Якщо не вказано, буде створено автоматичну назву з timestamp
                    </p>
                </div>
            )}

            {/* Import Button */}
            {validationResult?.isValid && (
                <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Крок 4: Запустіть імпорт
                    </label>
                    <button
                        onClick={handleImport}
                        disabled={importMutation.isPending}
                        className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 font-semibold"
                    >
                        {importMutation.isPending ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Імпорт...
                            </>
                        ) : (
                            <>
                                <Download className="w-5 h-5" />
                                Розпочати імпорт
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Import Progress */}
            {importProgress && (
                <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
                    <p className="text-blue-200 font-semibold mb-2">
                        {importProgress.stage} ({importProgress.current}/{importProgress.total})
                    </p>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                        <div
                            className="bg-blue-500 h-2 rounded-full transition-all"
                            style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Import Confirmation Modal */}
            {showImportConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4 border border-slate-600">
                        <div className="flex items-start gap-3 mb-4">
                            <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" />
                            <div>
                                <h3 className="text-lg font-semibold text-slate-100 mb-2">Підтвердження імпорту</h3>
                                <p className="text-sm text-slate-300 mb-3">
                                    Ви збираєтесь імпортувати дані з legacy БД. Всі поточні дані будуть ВИДАЛЕНІ та ЗАМІНЕНІ.
                                </p>
                                <div className="bg-yellow-900/30 border border-yellow-700 rounded p-2 mt-2">
                                    <p className="text text-xs text-yellow-200">
                                        Перед імпортом буде створено резервну копію поточної БД{importBackupName && `: "${importBackupName}"`}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowImportConfirm(false)}
                                className="px-4 py-2 border border-slate-600 rounded-lg hover:bg-slate-700 text-slate-300 transition-colors"
                            >
                                Скасувати
                            </button>
                            <button
                                onClick={() => importMutation.mutate()}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                                Підтверджую, імпортувати
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4 border border-slate-600">
                        <h3 className="text-lg font-semibold text-green-400 mb-3">✓ Успішно!</h3>
                        <p className="text-sm text-slate-300 whitespace-pre-line mb-4">{successMessage}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Перезавантажити додаток
                        </button>
                    </div>
                </div>
            )}

            {/* Error Modal */}
            {showErrorModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4 border border-slate-600">
                        <h3 className="text-lg font-semibold text-red-400 mb-3">✗ Помилка</h3>
                        <p className="text-sm text-slate-300 mb-4">{errorMessage}</p>
                        <button
                            onClick={() => setShowErrorModal(false)}
                            className="w-full px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition-colors"
                        >
                            Закрити
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
