import { request } from "./core";

export interface CashDebit {
    id: string;
    date: string;
    amount: number;
    description: string;
    created_by: string | null;
    created_by_name: string | null;
    created_at: string;
}

export interface CashDay {
    date: string;
    collected: number;
    pending: number;
    debit_total: number;
    net: number;
    debits: CashDebit[];
}

export interface CashSummary {
    days: CashDay[];
    total_collected: number;
    total_pending: number;
    total_debits: number;
    total_net: number;
}

export const cashApi = {
    summary: (from: string, to: string) =>
        request<CashSummary>(`/cash/summary?from=${from}&to=${to}`),
    createDebit: (data: { date: string; amount: number; description: string }) =>
        request<CashDebit>("/cash/debits", { method: "POST", body: JSON.stringify(data) }),
    deleteDebit: (id: string) =>
        request<null>(`/cash/debits/${id}`, { method: "DELETE" }),
};
