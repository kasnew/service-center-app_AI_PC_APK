import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { checkForUpdates, UpdateCheckResult } from '../utils/updateChecker';

interface UpdateContextType {
    updateResult: UpdateCheckResult | null;
    isChecking: boolean;
    checkUpdates: (showNoUpdateMessage?: boolean) => Promise<UpdateCheckResult | null>;
    lastChecked: Date | null;
    manualCheckResult: 'no-update' | 'error' | null;
    clearManualCheckResult: () => void;
}

const UpdateContext = createContext<UpdateContextType | undefined>(undefined);

export const UpdateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(null);
    const [isChecking, setIsChecking] = useState(false);
    const [lastChecked, setLastChecked] = useState<Date | null>(null);
    const [manualCheckResult, setManualCheckResult] = useState<'no-update' | 'error' | null>(null);

    const clearManualCheckResult = useCallback(() => {
        setManualCheckResult(null);
    }, []);

    const checkUpdates = useCallback(async (showNoUpdateMessage: boolean = false): Promise<UpdateCheckResult | null> => {
        setIsChecking(true);
        setManualCheckResult(null);
        try {
            const result = await checkForUpdates();
            setUpdateResult(result);
            setLastChecked(new Date());
            localStorage.setItem('lastUpdateCheck', new Date().toISOString());

            // If this is a manual check and no update available, set the result
            if (showNoUpdateMessage) {
                if (result.error) {
                    setManualCheckResult('error');
                } else if (!result.hasUpdate) {
                    setManualCheckResult('no-update');
                }
                // Auto-clear after 3 seconds
                setTimeout(() => {
                    setManualCheckResult(null);
                }, 3000);
            }

            return result;
        } catch (error) {
            console.error('Update check failed:', error);
            if (showNoUpdateMessage) {
                setManualCheckResult('error');
                setTimeout(() => {
                    setManualCheckResult(null);
                }, 3000);
            }
            return null;
        } finally {
            setIsChecking(false);
        }
    }, []);

    // Initial check
    useEffect(() => {
        const lastCheck = localStorage.getItem('lastUpdateCheck');
        const hoursSinceLastCheck = lastCheck
            ? (Date.now() - new Date(lastCheck).getTime()) / (1000 * 60 * 60)
            : 24;

        if (hoursSinceLastCheck >= 6) {
            checkUpdates(false);
        }
    }, [checkUpdates]);

    return (
        <UpdateContext.Provider value={{
            updateResult,
            isChecking,
            checkUpdates,
            lastChecked,
            manualCheckResult,
            clearManualCheckResult
        }}>
            {children}
        </UpdateContext.Provider>
    );
};

export const useUpdate = () => {
    const context = useContext(UpdateContext);
    if (!context) {
        throw new Error('useUpdate must be used within an UpdateProvider');
    }
    return context;
};
