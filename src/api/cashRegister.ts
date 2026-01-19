import { ExpenseCategory, IncomeCategory, CashRegisterSettings } from '../types/db';

export const cashRegisterApi = {
    // Get cash register settings
    getSettings: async (): Promise<CashRegisterSettings> => {
        return await window.ipcRenderer.invoke('get-cash-register-settings');
    },

    // Update cash register settings
    updateSettings: async (settings: Partial<CashRegisterSettings>): Promise<{ success: boolean }> => {
        return await window.ipcRenderer.invoke('update-cash-register-settings', settings);
    },

    // Activate cash register
    activateCashRegister: async (initialCash: number, initialCard: number): Promise<{ success: boolean }> => {
        return await window.ipcRenderer.invoke('activate-cash-register', { initialCash, initialCard });
    },

    // Get current balances
    getBalances: async (): Promise<{ cash: number; card: number }> => {
        return await window.ipcRenderer.invoke('get-cash-balances');
    },
};

export const expenseCategoriesApi = {
    // Get all expense categories
    getCategories: async (): Promise<ExpenseCategory[]> => {
        return await window.ipcRenderer.invoke('get-expense-categories');
    },

    // Add expense category
    addCategory: async (name: string): Promise<{ success: boolean; id: number }> => {
        return await window.ipcRenderer.invoke('add-expense-category', name);
    },

    // Update expense category
    updateCategory: async (id: number, name: string): Promise<{ success: boolean }> => {
        return await window.ipcRenderer.invoke('update-expense-category', { id, name });
    },

    // Toggle category active status
    toggleCategory: async (id: number, active: boolean): Promise<{ success: boolean }> => {
        return await window.ipcRenderer.invoke('toggle-expense-category', { id, active });
    },

    // Delete expense category
    deleteCategory: async (id: number): Promise<{ success: boolean }> => {
        return await window.ipcRenderer.invoke('delete-expense-category', id);
    },
};

export const incomeCategoriesApi = {
    // Get all income categories
    getCategories: async (): Promise<IncomeCategory[]> => {
        return await window.ipcRenderer.invoke('get-income-categories');
    },

    // Add income category
    addCategory: async (name: string): Promise<{ success: boolean; id: number }> => {
        return await window.ipcRenderer.invoke('add-income-category', name);
    },

    // Update income category
    updateCategory: async (id: number, name: string): Promise<{ success: boolean }> => {
        return await window.ipcRenderer.invoke('update-income-category', { id, name });
    },

    // Toggle category active status
    toggleCategory: async (id: number, active: boolean): Promise<{ success: boolean }> => {
        return await window.ipcRenderer.invoke('toggle-income-category', { id, active });
    },

    // Delete income category
    deleteCategory: async (id: number): Promise<{ success: boolean }> => {
        return await window.ipcRenderer.invoke('delete-income-category', id);
    },
};

export const profitsApi = {
    // Get executor profits for a date range
    getExecutorProfits: async (startDate: string, endDate: string) => {
        return await window.ipcRenderer.invoke('get-executor-profits', { startDate, endDate });
    },

    // Get executor receipts with financial details
    getExecutorReceipts: async (executorName: string, startDate: string, endDate: string) => {
        return await window.ipcRenderer.invoke('get-executor-receipts', { executorName, startDate, endDate });
    },

    // Get products statistics
    getProductsStats: async (startDate: string, endDate: string) => {
        return await window.ipcRenderer.invoke('get-products-stats', { startDate, endDate });
    },

    // Get unpaid ready orders
    getUnpaidReadyOrders: async (startDate?: string, endDate?: string) => {
        return await window.ipcRenderer.invoke('get-unpaid-ready-orders', { startDate, endDate });
    },
};
