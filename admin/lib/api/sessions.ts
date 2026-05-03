import { request } from "./core";

export interface Session {
    id: string; scheduled_at: string; duration_minutes: number; status: string;
    patient_name: string; patient_code: string; patient_id: string;
    doctor_name: string; doctor_id: string;
    assisting_doctor_id?: string | null; assisting_doctor_name?: string | null;
    session_type_name: string; session_type_id: string;
    form_id?: string | null;
    branch_name: string; branch_id: string;
    pre_session_notes?: string | null;
}

export interface SessionListResponse { sessions: Session[]; total: number; page: number; }

// ── Session Form ──────────────────────────────────────────────────────────────
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

export const sessionsApi = {
    list: (params?: Record<string, string>) =>
        request<SessionListResponse>(`/sessions?${new URLSearchParams(params)}`),
    get: (id: string) => request<Session>(`/sessions/${id}`),
    create: (data: Partial<Session> & { patient_id: string; doctor_id: string; session_type_id: string; branch_id: string }) =>
        request<Session>("/sessions", { method: "POST", body: JSON.stringify(data) }),
    cancel: (id: string, reason: string) =>
        request<null>(`/sessions/${id}/cancel`, { method: "PATCH", body: JSON.stringify({ reason }) }),
    reschedule: (id: string, data: { scheduled_at: string; doctor_id?: string; reason?: string }) =>
        request<Session>(`/sessions/${id}/reschedule`, { method: "PATCH", body: JSON.stringify(data) }),
    markAttendance: (id: string, attendance: string) =>
        request<null>(`/sessions/${id}/attendance`, { method: "PATCH", body: JSON.stringify({ attendance }) }),
    // Form
    getForm: (id: string) => request<SessionFormData>(`/sessions/${id}/form`),
    submitForm: (id: string, answers: SessionFormAnswer[]) =>
        request<null>(`/sessions/${id}/form`, { method: "POST", body: JSON.stringify(answers) }),
    updateForm: (id: string, answers: SessionFormAnswer[]) =>
        request<null>(`/sessions/${id}/form`, { method: "PATCH", body: JSON.stringify(answers) }),
};
