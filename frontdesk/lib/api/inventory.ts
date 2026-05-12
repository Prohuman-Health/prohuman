import { request } from "./core";

export type InventoryCategory = "consumable" | "equipment" | "medication" | "linen" | "stationery" | "other";
export type InventoryTxType = "restock" | "use" | "adjustment" | "wastage";

export interface InventoryItem {
    id: string;
    name: string;
    category: InventoryCategory;
    unit: string;
    current_stock: number;
    min_stock: number;
    notes: string | null;
    is_active: boolean;
    is_low_stock: boolean;
    created_at: string;
    updated_at: string;
}

export interface InventoryTransaction {
    id: string;
    item_id: string;
    type: InventoryTxType;
    quantity: number;
    stock_after: number;
    notes: string | null;
    created_by: string | null;
    created_by_name: string | null;
    created_at: string;
}

export const inventoryApi = {
    listItems: (params?: { category?: string; search?: string; low_stock?: boolean }) => {
        const qs = new URLSearchParams();
        if (params?.category) qs.set("category", params.category);
        if (params?.search) qs.set("search", params.search);
        if (params?.low_stock) qs.set("low_stock", "true");
        const q = qs.toString();
        return request<InventoryItem[]>(`/inventory/items${q ? `?${q}` : ""}`);
    },
    getItem: (id: string) =>
        request<InventoryItem>(`/inventory/items/${id}`),
    recordTransaction: (itemId: string, data: { type: InventoryTxType; quantity: number; notes?: string }) =>
        request<{ transaction: InventoryTransaction; stock_after: number }>(`/inventory/items/${itemId}/transactions`, { method: "POST", body: JSON.stringify(data) }),
    listTransactions: (itemId: string, limit?: number) =>
        request<InventoryTransaction[]>(`/inventory/items/${itemId}/transactions${limit ? `?limit=${limit}` : ""}`),
    getLowStock: () =>
        request<(InventoryItem & { deficit: number })[]>("/inventory/low-stock"),
};
