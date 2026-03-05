import { request } from "./core";

export interface StaffMember {
    id: string; email: string; full_name: string;
    role: string; phone: string | null;
    branch_id: string | null; is_active: boolean; created_at: string;
    doctor_id?: string; specialty?: string;
}

export const staffApi = {
    list: (params?: Record<string, string>) =>
        request<StaffMember[]>(`/staff?${new URLSearchParams(params)}`),
    get: (id: string) => request<StaffMember>(`/staff/${id}`),
    create: (data: Partial<StaffMember> & { email: string; password: string; full_name: string; role: string }) =>
        request<StaffMember>("/staff", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<StaffMember>) =>
        request<StaffMember>(`/staff/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    deactivate: (id: string) =>
        request<null>(`/staff/${id}`, { method: "DELETE" }),
};

export interface Doctor {
    id: string; staff_id: string; full_name: string; email: string;
    phone: string | null; specialty: string | null; bio: string | null; is_active: boolean;
}

export const doctorsApi = {
    list: (params?: Record<string, string>) =>
        request<Doctor[]>(`/doctors?${new URLSearchParams(params)}`),
    get: (id: string) => request<Doctor>(`/doctors/${id}`),
    update: (id: string, data: Partial<Doctor>) =>
        request<Doctor>(`/doctors/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
};
