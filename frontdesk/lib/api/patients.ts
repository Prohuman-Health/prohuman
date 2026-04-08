import { request } from "./core";

export interface Patient {
    id: string; patient_code: string; full_name: string;
    age: number; gender: string; phone: string; email: string | null;
    complaints: string; is_active: boolean; created_at: string;
    branch_id: string | null;
}
export interface PatientListResponse { patients: Patient[]; total: number; page: number; limit: number; }

export interface PatientSession {
    id: string; scheduled_at: string; duration_minutes: number;
    status: string; attendance: string | null;
    session_type: string; doctor_name: string; branch: string;
}
export interface PatientInvoice {
    id: string; created_at: string; amount: number; status: string; notes: string | null;
}
export interface TimelineItem {
    type: "session" | "invoice" | "document";
    id: string; date: string; label: string;
    status?: string; amount?: number; category?: string;
}

export const patientsApi = {
    list: (params?: Record<string, string>) =>
        request<PatientListResponse>(`/patients?${new URLSearchParams(params)}`),
    search: (q: string) =>
        request<Patient[]>(`/patients/search?q=${encodeURIComponent(q)}`),
    get: (id: string) => request<Patient>(`/patients/${id}`),
    create: (data: Partial<Patient> & { branch_id?: string | null }) =>
        request<Patient>("/patients", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Patient>) =>
        request<Patient>(`/patients/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    deactivate: (id: string) =>
        request<null>(`/patients/${id}`, { method: "DELETE" }),
    sessions: (id: string) => request<PatientSession[]>(`/patients/${id}/sessions`),
    invoices: (id: string) => request<PatientInvoice[]>(`/patients/${id}/invoices`),
    timeline: (id: string) => request<TimelineItem[]>(`/patients/${id}/timeline`),

};
