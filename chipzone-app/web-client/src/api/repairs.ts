import { Repair, RepairStatus } from '../types/db';
import { apiClient } from './client';

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
}

export interface GetRepairsResponse {
    repairs: Repair[];
    total: number;
    page: number;
    totalPages: number;
}

export const repairApi = {
    getRepairs: async (params: GetRepairsParams = {}): Promise<GetRepairsResponse> => {
        // Fetch all and filter client-side
        const allRepairs: Repair[] = await apiClient.get('/repairs');

        let filtered = allRepairs;

        if (params.search) {
            const term = params.search.toLowerCase();
            filtered = filtered.filter(r =>
                (r.deviceName || '').toLowerCase().includes(term) ||
                (r.clientName || '').toLowerCase().includes(term) || // clientName might need joining or be present
                // Note: Repair model in web might expect client info joined, but Ktor returns flat Repair.
                // We might need to fetch clients too or use what's available.
                // The Repair model in android has clientId, but not client details.
                // The web app might rely on joined data.
                // For now, let's filter on available fields.
                (r.id.toString().includes(term)) ||
                (r.receiptId?.toString().includes(term))
            );
        }

        if (params.status) {
            const statuses = Array.isArray(params.status) ? params.status : [params.status];
            filtered = filtered.filter(r => statuses.includes(r.status as RepairStatus));
        }

        // Sort by ID desc by default
        filtered.sort((a, b) => b.id - a.id);

        const page = params.page || 1;
        const limit = params.limit || 50;
        const start = (page - 1) * limit;
        const paged = filtered.slice(start, start + limit);

        return {
            repairs: paged,
            total: filtered.length,
            page,
            totalPages: Math.ceil(filtered.length / limit)
        };
    },

    getRepairDetails: async (id: number): Promise<Repair | null> => {
        try {
            return await apiClient.get(`/repairs/${id}`);
        } catch (e) {
            return null;
        }
    },

    saveRepair: async (repair: Partial<Repair>): Promise<{ id: number; receiptId: number }> => {
        if (repair.id) {
            await apiClient.put(`/repairs/${repair.id}`, repair);
            return { id: repair.id, receiptId: repair.receiptId || 0 };
        } else {
            const res = await apiClient.post('/repairs', repair);
            return { id: res.id, receiptId: 0 }; // Ktor doesn't return receiptId on create currently
        }
    },

    deleteRepair: async (id: number): Promise<{ success: boolean }> => {
        await apiClient.delete(`/repairs/${id}`);
        return { success: true };
    },

    getNextReceiptId: async (): Promise<number> => {
        const res = await apiClient.get('/repairs/next-receipt-id');
        return res.nextReceiptId;
    },

    getStatusCounts: async (): Promise<Record<number, number>> => {
        // const allRepairs: Repair[] = await apiClient.get('/repairs');
        // TODO: Implement calculation
        return {};
    }
};
