import { useState, useEffect } from 'react';
import { Download, X, ExternalLink, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { checkForUpdates, UpdateCheckResult, getDownloadUrlForPlatform, formatFileSize } from '../utils/updateChecker';
import { useTheme } from '../contexts/ThemeContext';

interface UpdateNotificationProps {
    onClose?: () => void;
}

export function UpdateNotification({ onClose }: UpdateNotificationProps) {
    const { currentTheme } = useTheme();
    const isLight = currentTheme.type === 'light';
    const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(null);
    const [isDismissed, setIsDismissed] = useState(false);

    const performCheck = async () => {
        try {
            const result = await checkForUpdates();
            setUpdateResult(result);

            // Store in localStorage to avoid checking too frequently
            localStorage.setItem('lastUpdateCheck', new Date().toISOString());
            if (!result.hasUpdate) {
                localStorage.setItem('lastKnownVersion', result.latestVersion || result.currentVersion);
            }
        } catch (error) {
            console.error('Update check failed:', error);
        }
    };

    useEffect(() => {
        // Check if we should run an update check
        const lastCheck = localStorage.getItem('lastUpdateCheck');
        const hoursSinceLastCheck = lastCheck
            ? (Date.now() - new Date(lastCheck).getTime()) / (1000 * 60 * 60)
            : 24;

        // Only check once every 6 hours
        if (hoursSinceLastCheck >= 6) {
            performCheck();
        }
    }, []);

    const handleDismiss = () => {
        setIsDismissed(true);
        if (updateResult?.latestVersion) {
            localStorage.setItem('dismissedVersion', updateResult.latestVersion);
        }
        onClose?.();
    };

    const handleDownload = () => {
        if (updateResult?.releaseInfo) {
            // Detect platform - for Electron app, it's Linux
            const downloadUrl = getDownloadUrlForPlatform(updateResult.releaseInfo, 'linux');
            if (downloadUrl) {
                window.open(downloadUrl, '_blank');
            } else {
                // Fallback to release page
                window.open(updateResult.releaseInfo.htmlUrl, '_blank');
            }
        }
    };

    // Don't show if dismissed or no update
    if (isDismissed) return null;
    if (!updateResult?.hasUpdate) return null;

    // Check if this version was already dismissed
    const dismissedVersion = localStorage.getItem('dismissedVersion');
    if (dismissedVersion === updateResult.latestVersion) return null;

    const releaseInfo = updateResult.releaseInfo;
    const appImageAsset = releaseInfo?.assets.find(a => a.name.endsWith('.AppImage'));

    return (
        <div className={`fixed bottom-4 right-4 z-50 max-w-md animate-in slide-in-from-bottom-4 fade-in duration-500 
            ${isLight ? 'bg-white border-green-200 shadow-xl' : 'bg-slate-800 border-green-500/30 shadow-2xl shadow-green-500/10'}
            border-2 rounded-2xl overflow-hidden`}
        >
            {/* Header */}
            <div className={`px-4 py-3 flex items-center justify-between 
                ${isLight ? 'bg-green-50 border-b border-green-100' : 'bg-green-500/10 border-b border-green-500/20'}`}
            >
                <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-full ${isLight ? 'bg-green-100' : 'bg-green-500/20'}`}>
                        <Download className="w-4 h-4 text-green-500" />
                    </div>
                    <span className={`font-bold ${isLight ? 'text-green-800' : 'text-green-400'}`}>
                        Доступне оновлення!
                    </span>
                </div>
                <button
                    onClick={handleDismiss}
                    className={`p-1 rounded-lg transition-colors ${isLight ? 'hover:bg-green-100 text-slate-400' : 'hover:bg-white/10 text-slate-500'}`}
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
                <div className="flex items-baseline justify-between">
                    <div>
                        <span className={`text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Поточна версія: </span>
                        <span className={`font-mono font-semibold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                            {updateResult.currentVersion}
                        </span>
                    </div>
                    <div className={`text-2xl font-black ${isLight ? 'text-green-600' : 'text-green-400'}`}>
                        →
                    </div>
                    <div>
                        <span className={`text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Нова: </span>
                        <span className={`font-mono font-bold text-lg ${isLight ? 'text-green-700' : 'text-green-400'}`}>
                            {updateResult.latestVersion}
                        </span>
                    </div>
                </div>

                {appImageAsset && (
                    <div className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                        Розмір: {formatFileSize(appImageAsset.size)}
                    </div>
                )}

                {releaseInfo?.body && (
                    <div className={`text-sm p-3 rounded-lg max-h-24 overflow-y-auto 
                        ${isLight ? 'bg-slate-50 text-slate-700' : 'bg-slate-900/50 text-slate-300'}`}
                    >
                        {releaseInfo.body.slice(0, 200)}
                        {releaseInfo.body.length > 200 && '...'}
                    </div>
                )}

                <div className="flex gap-2 pt-2">
                    <button
                        onClick={handleDownload}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 
                            bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold 
                            shadow-lg shadow-green-900/30 transition-all"
                    >
                        <Download className="w-4 h-4" />
                        Завантажити
                    </button>
                    <a
                        href={releaseInfo?.htmlUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`px-4 py-2.5 rounded-xl font-semibold flex items-center gap-1.5 transition-all
                            ${isLight
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}
                    >
                        <ExternalLink className="w-4 h-4" />
                        Деталі
                    </a>
                </div>
            </div>
        </div>
    );
}

// Compact version for settings page
export function UpdateChecker() {
    const { currentTheme } = useTheme();
    const isLight = currentTheme.type === 'light';
    const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(null);
    const [isChecking, setIsChecking] = useState(false);

    const performCheck = async () => {
        setIsChecking(true);
        try {
            const result = await checkForUpdates();
            setUpdateResult(result);
            localStorage.setItem('lastUpdateCheck', new Date().toISOString());
        } catch (error) {
            console.error('Update check failed:', error);
        } finally {
            setIsChecking(false);
        }
    };

    return (
        <div className={`p-4 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/50 border-slate-700'}`}>
            <div className="flex items-center justify-between mb-3">
                <h3 className={`font-semibold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                    Перевірка оновлень
                </h3>
                <button
                    onClick={performCheck}
                    disabled={isChecking}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                        ${isLight
                            ? 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                            : 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400'}
                        disabled:opacity-50`}
                >
                    <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
                    {isChecking ? 'Перевірка...' : 'Перевірити'}
                </button>
            </div>

            {updateResult && (
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        {updateResult.hasUpdate ? (
                            <>
                                <AlertCircle className="w-5 h-5 text-orange-500" />
                                <span className={`text-sm ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                                    Доступна нова версія: <strong className="text-green-500">{updateResult.latestVersion}</strong>
                                </span>
                            </>
                        ) : (
                            <>
                                <CheckCircle className="w-5 h-5 text-green-500" />
                                <span className={`text-sm ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                                    У вас остання версія ({updateResult.currentVersion})
                                </span>
                            </>
                        )}
                    </div>

                    {updateResult.hasUpdate && updateResult.releaseInfo && (
                        <div className="flex gap-2 mt-3">
                            <a
                                href={getDownloadUrlForPlatform(updateResult.releaseInfo, 'linux') || updateResult.releaseInfo.htmlUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium text-sm transition-all"
                            >
                                <Download className="w-4 h-4" />
                                Завантажити
                            </a>
                            <a
                                href={updateResult.releaseInfo.htmlUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all
                                    ${isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-700' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}
                            >
                                <ExternalLink className="w-4 h-4" />
                                Примітки до релізу
                            </a>
                        </div>
                    )}

                    {updateResult.error && (
                        <div className="text-sm text-red-500 mt-2">
                            Помилка: {updateResult.error}
                        </div>
                    )}
                </div>
            )}

            {!updateResult && !isChecking && (
                <p className={`text-sm ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                    Натисніть "Перевірити" для пошуку оновлень
                </p>
            )}
        </div>
    );
}
