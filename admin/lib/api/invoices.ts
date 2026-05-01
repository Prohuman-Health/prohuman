import { request } from "./core";

export interface Invoice {
    id: string;
    patient_id: string;
    session_id: string;
    amount: number;
    status: "pending" | "paid" | "waived";
    notes: string | null;
    paid_at: string | null;
    created_at: string;
    updated_at: string;
    // Joined
    patient_name: string;
    patient_code: string;
    session_type: string;
}

export const invoicesApi = {
    list: (params?: Record<string, string>) =>
        request<Invoice[]>(`/invoices?${new URLSearchParams(params)}`),
    get: (id: string) => request<Invoice>(`/invoices/${id}`),
    update: (id: string, data: { status: "pending" | "paid" | "waived"; notes?: string }) =>
        request<Invoice>(`/invoices/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
};
