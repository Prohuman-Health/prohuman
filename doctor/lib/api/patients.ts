import { request } from "./core";

export interface Patient {
    id: string; patient_code: string; full_name: string;
    age: number; date_of_birth?: string | null; gender: string;
    phone: string; email: string | null;
    complaints: string; reference?: string | null;
    is_active: boolean; created_at: string;
    branch_id: string | null;
}

export interface PatientSession {
    id: string; scheduled_at: string; duration_minutes: number;
    status: string; attendance: string | null;
    session_type: string; doctor_name: string; branch: string;
}

export interface TimelineItem {
    type: "session" | "invoice" | "document";
    id: string; date: string; label: string;
    status?: string; amount?: number; category?: string;
}

export interface PatientListResponse {
    patients: Patient[];
    total: number;
    page: number;
}

export const patientsApi = {
    list: (params?: Record<string, string>) =>
        request<PatientListResponse>(`/patients?${new URLSearchParams(params)}`),
    get: (id: string) => request<Patient>(`/patients/${id}`),
    sessions: (id: string) => request<PatientSession[]>(`/patients/${id}/sessions`),
    timeline: (id: string) => request<TimelineItem[]>(`/patients/${id}/timeline`),
};
