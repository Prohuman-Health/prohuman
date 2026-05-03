import { request } from "./core";

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

export const leaveApi = {
    list: (doctorId: string) =>
        request<DoctorLeavePeriod[]>(`/doctors/${doctorId}/leave-periods`),
};
