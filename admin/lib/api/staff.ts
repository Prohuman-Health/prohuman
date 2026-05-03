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
    /** Admin-set password for another staff member (no current password required). */
    setPassword: (id: string, password: string) =>
        request<null>(`/staff/${id}/password`, { method: "PATCH", body: JSON.stringify({ password }) }),
    /** Hard-delete the user account and revoke all active sessions immediately. */
    deleteAndRevoke: (id: string) =>
        request<null>(`/staff/${id}/revoke`, { method: "DELETE" }),
};

export interface Doctor {
    id: string; staff_id: string; full_name: string; email: string;
    phone: string | null; specialty: string | null; bio: string | null; is_active: boolean;
    branch_id: string | null;
    // Leave / inactive period fields (present on getDoctor / listDoctors responses)
    on_leave?: boolean;
    leave_id?: string | null;
    leave_from?: string | null;
    leave_to?: string | null;
    leave_reason?: string | null;
}

export interface DoctorLeavePeriod {
    id: string;
    doctor_id: string;
    from_date: string;
    to_date: string;
    reason: string | null;
    created_by: string | null;
    created_by_name: string | null;
    created_at: string;
}

export interface DoctorAvailabilitySlot {
    id: string;
    doctor_id: string;
    branch_id: string;
    day_of_week: number;  // 0=Sun … 6=Sat
    start_time: string;   // "HH:MM"
    end_time: string;     // "HH:MM"
    label: string | null; // e.g. "Morning", "Afternoon"
    is_active: boolean;
}

export const doctorsApi = {
    list: (params?: Record<string, string>) =>
        request<Doctor[]>(`/doctors?${new URLSearchParams(params)}`),
    get: (id: string) => request<Doctor>(`/doctors/${id}`),
    update: (id: string, data: Partial<Doctor>) =>
        request<Doctor>(`/doctors/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    getAvailability: (id: string) =>
        request<DoctorAvailabilitySlot[]>(`/doctors/${id}/availability`),
    addSlot: (id: string, data: Omit<DoctorAvailabilitySlot, "id" | "doctor_id">) =>
        request<DoctorAvailabilitySlot>(`/doctors/${id}/availability`, { method: "POST", body: JSON.stringify(data) }),
    updateSlot: (id: string, slotId: string, data: Partial<Omit<DoctorAvailabilitySlot, "id" | "doctor_id">>) =>
        request<DoctorAvailabilitySlot>(`/doctors/${id}/availability/${slotId}`, { method: "PATCH", body: JSON.stringify(data) }),
    deleteSlot: (id: string, slotId: string) =>
        request<null>(`/doctors/${id}/availability/${slotId}`, { method: "DELETE" }),
    setAvailability: (id: string, slots: Omit<DoctorAvailabilitySlot, "id" | "doctor_id">[]) =>
        request<DoctorAvailabilitySlot[]>(`/doctors/${id}/availability`, { method: "PUT", body: JSON.stringify(slots) }),
    // Leave / inactive period management
    listLeave: (id: string) =>
        request<DoctorLeavePeriod[]>(`/doctors/${id}/leave-periods`),
    addLeave: (id: string, data: { from_date: string; to_date: string; reason?: string }) =>
        request<DoctorLeavePeriod>(`/doctors/${id}/leave-periods`, { method: "POST", body: JSON.stringify(data) }),
    deleteLeave: (id: string, leaveId: string) =>
        request<null>(`/doctors/${id}/leave-periods/${leaveId}`, { method: "DELETE" }),
};
