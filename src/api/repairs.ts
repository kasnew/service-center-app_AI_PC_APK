import { Repair, RepairStatus } from '../types/db';

export interface GetRepairsParams {
    page?: number;
    limit?: number;
    search?: string;
    status?: RepairStatus | RepairStatus[];
    shouldCall?: boolean;
    executor?: string;
    dateStart?: string;
    dateEnd?: string;
    paymentDateStart?: string;
    paymentDateEnd?: string;
    advancedFilters?: any[];
}

export interface GetRepairsResponse {
    repairs: Repair[];
    total: number;
    page: number;
    totalPages: number;
}

export const repairApi = {
    getRepairs: async (params: GetRepairsParams = {}): Promise<GetRepairsResponse> => {
        return await window.ipcRenderer.invoke('get-repairs', params);
    },

    getRepairDetails: async (id: number): Promise<Repair | null> => {
        return await window.ipcRenderer.invoke('get-repair-details', id);
    },

    saveRepair: async (repair: Partial<Repair>): Promise<{ id: number; receiptId: number }> => {
        return await window.ipcRenderer.invoke('save-repair', repair);
    },

    deleteRepair: async (id: number): Promise<{ success: boolean }> => {
        return await window.ipcRenderer.invoke('delete-repair', id);
    },

    getNextReceiptId: async (): Promise<number> => {
        return await window.ipcRenderer.invoke('get-next-receipt-id');
    },

    getStatusCounts: async (): Promise<Record<number, number>> => {
        return await window.ipcRenderer.invoke('get-status-counts');
    },

    processRefund: async (data: {
        repairId: number;
        receiptId: number;
        refundAmount: number;
        refundType: 'Готівка' | 'Картка';
        returnPartsToWarehouse: boolean;
        note?: string;
    }): Promise<{ success: boolean; error?: string }> => {
        return await window.ipcRenderer.invoke('process-refund', data);
    }
};
