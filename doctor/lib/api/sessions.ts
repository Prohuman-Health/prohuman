import { request } from "./core";

export interface Session {
    id: string;
    scheduled_at: string;
    duration_minutes: number;
    status: string;
    attendance: string | null;
    patient_name: string;
    patient_code: string;
    patient_id: string;
    doctor_name: string;
    doctor_id: string;
    session_type: string;
    session_type_id?: string;
    form_id?: string | null;
    branch_name: string;
    branch_id?: string;
    pre_session_notes?: string | null;
}

export interface SessionListResponse {
    sessions: Session[];
    total: number;
    page: number;
}

export const sessionsApi = {
    /** Doctor's own schedule for a given date (YYYY-MM-DD) */
    mySchedule: (date?: string) =>
        request<Session[]>(`/calendar/my-schedule${date ? `?date=${date}` : ""}`),

    /** General session list — supports doctor_id, status, from/to filters */
    list: (params?: Record<string, string>) =>
        request<SessionListResponse>(`/sessions?${new URLSearchParams(params)}`),

    get: (id: string) => request<Session>(`/sessions/${id}`),

    markAttendance: (id: string, attendance: string) =>
        request<null>(`/sessions/${id}/attendance`, {
            method: "PATCH",
            body: JSON.stringify({ attendance }),
        }),
};
