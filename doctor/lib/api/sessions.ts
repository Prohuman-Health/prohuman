import { request } from "./core";

// ── Session Form ─────────────────────────────────────────────────────────────
export interface SessionFormQuestion {
    id: string; text: string; answer_type: string;
    options: string[] | null; scale_min: number | null; scale_max: number | null;
    is_required: boolean; order_index: number;
}
export interface SessionFormResponse {
    question_id: string;
    answer_text: string | null;
    answer_value: number | null;
    answer_options: string[] | null;
}
export interface SessionFormData {
    form_id: string | null;
    questions: SessionFormQuestion[];
    responses: SessionFormResponse[];
}
export type SessionFormAnswer = {
    question_id: string;
    answer_text?: string;
    answer_value?: number;
    answer_options?: string[];
};

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
    form_response_count?: number;
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
    getForm: (id: string) => request<SessionFormData>(`/sessions/${id}/form`),
    submitForm: (id: string, answers: SessionFormAnswer[]) =>
        request<null>(`/sessions/${id}/form`, { method: "POST", body: JSON.stringify(answers) }),
    updateForm: (id: string, answers: SessionFormAnswer[]) =>
        request<null>(`/sessions/${id}/form`, { method: "PATCH", body: JSON.stringify(answers) }),
};
