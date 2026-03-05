import { request } from "./core";

export interface Patient {
    id: string; patient_code: string; full_name: string;
    age: number; gender: string; phone: string; email: string | null;
    complaints: string; is_active: boolean; created_at: string;
    branch_id: string | null;
}
export interface PatientListResponse { patients: Patient[]; total: number; page: number; limit: number; }

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
    sessions: (id: string) => request<unknown[]>(`/patients/${id}/sessions`),
    timeline: (id: string) => request<unknown[]>(`/patients/${id}/timeline`),
};
