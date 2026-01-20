import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { checkForUpdates, UpdateCheckResult } from '../utils/updateChecker';

interface UpdateContextType {
    updateResult: UpdateCheckResult | null;
    isChecking: boolean;
    checkUpdates: () => Promise<void>;
    lastChecked: Date | null;
}

const UpdateContext = createContext<UpdateContextType | undefined>(undefined);

export const UpdateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(null);
    const [isChecking, setIsChecking] = useState(false);
    const [lastChecked, setLastChecked] = useState<Date | null>(null);

    const checkUpdates = useCallback(async () => {
        setIsChecking(true);
        try {
            const result = await checkForUpdates();
            setUpdateResult(result);
            setLastChecked(new Date());
            localStorage.setItem('lastUpdateCheck', new Date().toISOString());
        } catch (error) {
            console.error('Update check failed:', error);
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
            checkUpdates();
        }
    }, [checkUpdates]);

    return (
        <UpdateContext.Provider value={{ updateResult, isChecking, checkUpdates, lastChecked }}>
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
