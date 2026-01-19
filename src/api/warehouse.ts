import { Part } from '../types/db';

export interface GetWarehouseItemsParams {
    inStock?: boolean; // Deprecated, use stockFilter instead
    stockFilter?: 'inStock' | 'sold' | 'all';
    supplier?: string;
    search?: string;
    groupByName?: boolean;
    dateArrivalStart?: string;
    dateArrivalEnd?: string;
}

export interface AddWarehouseItemParams {
    supplier: string;
    name: string;
    priceUsd: number;
    exchangeRate: number;
    costUah: number;
    dateArrival: string;
    invoice?: string;
    productCode?: string;
    quantity?: number;
    paymentType?: string;
}

export interface AddPartToRepairParams {
    partId?: number;
    repairId: number;
    receiptId: number;
    priceUah: number;
    costUah: number;
    supplier: string;
    name: string;
    isPaid: boolean;
    dateEnd: string;
}

export interface UpdateRepairPaymentParams {
    repairId: number;
    receiptId: number;
    isPaid: boolean;
    dateEnd: string;
}

export const warehouseApi = {
    getWarehouseItems: async (params: GetWarehouseItemsParams = {}): Promise<Part[]> => {
        return await window.ipcRenderer.invoke('get-warehouse-items', params);
    },

    addWarehouseItem: async (item: AddWarehouseItemParams): Promise<{ success: boolean; ids: number[] }> => {
        return await window.ipcRenderer.invoke('add-warehouse-item', item);
    },

    deleteWarehouseItem: async (id: number, isWriteOff: boolean = false): Promise<{ success: boolean }> => {
        return await window.ipcRenderer.invoke('delete-warehouse-item', id, isWriteOff);
    },

    getRepairParts: async (repairId: number): Promise<Part[]> => {
        return await window.ipcRenderer.invoke('get-repair-parts', repairId);
    },

    addPartToRepair: async (data: AddPartToRepairParams): Promise<{ success: boolean; id: number }> => {
        return await window.ipcRenderer.invoke('add-part-to-repair', data);
    },

    removePartFromRepair: async (partId: number): Promise<{ success: boolean }> => {
        return await window.ipcRenderer.invoke('remove-part-from-repair', { partId });
    },

    updateRepairPayment: async (data: UpdateRepairPaymentParams): Promise<{ success: boolean }> => {
        return await window.ipcRenderer.invoke('update-repair-payment', data);
    },

    updatePartPrice: async (partId: number, priceUah: number, costUah?: number): Promise<{ success: boolean }> => {
        return await window.ipcRenderer.invoke('update-part-price', { partId, priceUah, costUah });
    },

    getAvailableSuppliers: async (): Promise<string[]> => {
        return await window.ipcRenderer.invoke('get-available-suppliers');
    },

    deleteBarcode: async (itemId: number): Promise<{ success: boolean }> => {
        return await window.ipcRenderer.invoke('delete-warehouse-item-barcode', { itemId });
    },

    updateBarcode: async (itemId: number, barcode: string): Promise<{ success: boolean }> => {
        return await window.ipcRenderer.invoke('update-warehouse-item-barcode', { itemId, barcode });
    },

    getGroupItems: async (name: string, supplier: string, stockFilter: string): Promise<Part[]> => {
        return await window.ipcRenderer.invoke('get-warehouse-items', {
            search: name,
            supplier: supplier,
            stockFilter: stockFilter,
            groupByName: false,
            exactName: true
        });
    }
};
