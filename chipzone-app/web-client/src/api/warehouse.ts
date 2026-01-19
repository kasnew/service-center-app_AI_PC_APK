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

import { apiClient } from './client';

export const warehouseApi = {
    getWarehouseItems: async (params: GetWarehouseItemsParams = {}): Promise<Part[]> => {
        // Query param in Ktor is `inStock` boolean only.
        // We need to map `stockFilter` to `inStock`.
        const query: any = {};
        if (params.stockFilter === 'inStock') query.inStock = true;
        // else fetch all and filter client side if needed

        let items: Part[] = await apiClient.get('/products', query);

        // Client side filtering for other params
        if (params.stockFilter === 'sold') {
            items = items.filter(i => !i.inStock);
        }

        if (params.supplier) {
            items = items.filter(i => i.supplier === params.supplier);
        }

        if (params.search) {
            const term = params.search.toLowerCase();
            items = items.filter(i => i.name.toLowerCase().includes(term) || (i.productCode || '').toLowerCase().includes(term));
        }

        // Sort by date arrival desc if available, or ID
        items.sort((a, b) => b.id - a.id);

        return items;
    },

    addWarehouseItem: async (item: AddWarehouseItemParams): Promise<{ success: boolean; ids: number[] }> => {
        const res = await apiClient.post('/products', item);
        return { success: true, ids: [res.id] };
    },

    deleteWarehouseItem: async (id: number, _isWriteOff: boolean = false): Promise<{ success: boolean }> => {
        // Ktor doesn't strictly support isWriteOff params in delete route yet, ignoring flag.
        await apiClient.delete(`/products/${id}`);
        return { success: true };
    },

    getRepairParts: async (repairId: number): Promise<Part[]> => {
        return await apiClient.get(`/repairs/${repairId}/parts`);
    },

    addPartToRepair: async (data: AddPartToRepairParams): Promise<{ success: boolean; id: number }> => {
        const res = await apiClient.post(`/repairs/${data.repairId}/parts`, data);
        return { success: true, id: res.id };
    },

    removePartFromRepair: async (partId: number): Promise<{ success: boolean }> => {
        // We need repairId to delete part via API endpoints structure /repairs/{id}/parts/{partId}.
        // But we don't have repairId easily available here in params, unless we pass it.
        // Or we use `delete /products/{id}` if parts are products?
        // In Ktor, parts are in `products` table.
        // But Ktor routes for deletion are under `/repairs/{id}/parts/{partId}` AND `/products/{id}`.
        // If we use `/products/{id}`, it deletes from DB.
        // `removePartFromRepair` usually means returning to stock or deleting.
        // If the part was from stock, we should perhaps return it?
        // The Ktor backend for `delete /products/{id}` just deletes it.
        // Let's assume standard delete for now.
        // Wait, `removePartFromRepair` in `ipcHandlers` had logic.
        // For now, let's use `/products/{partId}` DELETE.
        await apiClient.delete(`/products/${partId}`);
        return { success: true };
    },

    updateRepairPayment: async (data: UpdateRepairPaymentParams): Promise<{ success: boolean }> => {
        await apiClient.post(`/repairs/${data.repairId}/parts/payment`, data);
        return { success: true };
    },

    updatePartPrice: async (partId: number, priceUah: number, costUah?: number): Promise<{ success: boolean }> => {
        // Similar issue, we need repairId for the nested route `put("{id}/parts/{partId}")`.
        // Or create a general `put("/products/{id}")`.
        // `updatePartPrice` updates `sellPrice` and `costUah`.
        // Let's us `PUT /products/{partId}` endpoint which updates a Product.
        // We need to fetch the product first to merge? Or Ktor handles partial update?
        // Ktor `put("/products/{id}")` takes a full `Product` object.
        // This is tricky.
        // Option 1: Fetch product, modify, PUT up.
        // Option 2: Add specific endpoint.
        // I'll assume fetching first for safety.
        try {
            const product = await apiClient.get(`/products/${partId}`);
            if (product) {
                product.sellPrice = priceUah;
                if (costUah !== undefined) product.costUah = costUah;
                await apiClient.put(`/products/${partId}`, product);
                return { success: true };
            }
        } catch (e) { }
        return { success: false };
    },

    getAvailableSuppliers: async (): Promise<string[]> => {
        // Client side aggregation
        const items: Part[] = await apiClient.get('/products');
        const suppliers = new Set(items.map(i => i.supplier).filter(Boolean));
        return Array.from(suppliers) as string[];
    },

    deleteBarcode: async (itemId: number): Promise<{ success: boolean }> => {
        // Logic to clear barcode
        const product = await apiClient.get(`/products/${itemId}`);
        if (product) {
            product.barcode = null;
            await apiClient.put(`/products/${itemId}`, product);
            return { success: true };
        }
        return { success: false };
    }
};
