import { ExpenseCategory, IncomeCategory, CashRegisterSettings, Transaction } from '../types/db';
import { apiClient } from './client';

export const cashRegisterApi = {
    getSettings: async (): Promise<CashRegisterSettings> => {
        // Stub: Default settings
        return {
            cardCommissionPercent: 0,
            cashRegisterEnabled: false,
            cashRegisterStartDate: new Date().toISOString()
        };
    },

    updateSettings: async (_settings: Partial<CashRegisterSettings>): Promise<{ success: boolean }> => {
        console.warn('updateSettings not implemented');
        return { success: false };
    },

    activateCashRegister: async (_initialCash: number, _initialCard: number): Promise<{ success: boolean }> => {
        console.warn('activateCashRegister not implemented');
        return { success: false };
    },

    getBalances: async (): Promise<{ cash: number; card: number }> => {
        // Use client-side calculation or fetch specific balance endpoint
        // For now, let's assume getTransactions returns balances or we calculate them?
        // Actually, let's try to fetch balances if endpoint exists, otherwise 0
        try {
            return await apiClient.get('/cash-register/balances');
        } catch (e) {
            console.warn('Failed to fetch balances, returning 0', e);
            return { cash: 0, card: 0 };
        }
    },

    getTransactions: async (params: { startDate: string, endDate: string, category?: string, paymentType?: string, search?: string }): Promise<Transaction[]> => {
        const queryParams = new URLSearchParams({
            startDate: params.startDate,
            endDate: params.endDate,
        });
        if (params.category) queryParams.append('category', params.category);
        if (params.paymentType) queryParams.append('paymentType', params.paymentType);
        if (params.search) queryParams.append('search', params.search);

        return await apiClient.get(`/transactions?${queryParams.toString()}`);
    },

    createManualTransaction: async (data: any): Promise<{ success: boolean; id?: number }> => {
        const result = await apiClient.post('/transactions', data);
        return { success: true, id: result.id };
    },

    reconcileBalances: async (data: { actualCash: number; actualCard: number; description?: string }): Promise<{ success: boolean }> => {
        await apiClient.post('/transactions/reconcile', data);
        return { success: true };
    },

    deleteTransaction: async (id: number): Promise<{ success: boolean }> => {
        await apiClient.delete(`/transactions/${id}`);
        return { success: true };
    },
};

export const expenseCategoriesApi = {
    getCategories: async (): Promise<ExpenseCategory[]> => {
        return [];
    },

    addCategory: async (_name: string): Promise<{ success: boolean; id: number }> => {
        return { success: false, id: 0 };
    },

    updateCategory: async (_id: number, _name: string): Promise<{ success: boolean }> => {
        return { success: false };
    },

    toggleCategory: async (_id: number, _active: boolean): Promise<{ success: boolean }> => {
        return { success: false };
    },

    deleteCategory: async (_id: number): Promise<{ success: boolean }> => {
        return { success: false };
    },
};

export const incomeCategoriesApi = {
    getCategories: async (): Promise<IncomeCategory[]> => {
        return [];
    },

    addCategory: async (_name: string): Promise<{ success: boolean; id: number }> => {
        return { success: false, id: 0 };
    },

    updateCategory: async (_id: number, _name: string): Promise<{ success: boolean }> => {
        return { success: false };
    },

    toggleCategory: async (_id: number, _active: boolean): Promise<{ success: boolean }> => {
        return { success: false };
    },

    deleteCategory: async (_id: number): Promise<{ success: boolean }> => {
        return { success: false };
    },
};

export const profitsApi = {
    // Get executor profits for a date range
    getExecutorProfits: async (_startDate: string, _endDate: string) => {
        return [];
    },

    // Get products statistics
    getProductsStats: async (_startDate: string, _endDate: string) => {
        return {
            profit: 0, cost: 0, revenue: 0,
            totalExpenses: 0, totalRevenue: 0, unsoldValue: 0
        };
    },

    // Get unpaid ready orders
    getUnpaidReadyOrders: async (_startDate?: string, _endDate?: string) => {
        return {
            products: 0, services: 0,
            servicesTotal: 0, productsTotal: 0, grandTotal: 0,
            orders: []
        };
    },
};
