import { ApiError, clearToken, getToken, request } from "./core";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

export interface Session {
    id: string; scheduled_at: string; duration_minutes: number; status: string;
    patient_name: string; patient_code: string; patient_id: string;
    doctor_name: string; doctor_id: string;
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

export interface SessionFormUploadResult {
    file_name: string;
    file_type: string;
    file_size: number;
    file_url: string;
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
    markAttendance: (id: string, attendance: string) =>
        request<null>(`/sessions/${id}/attendance`, { method: "PATCH", body: JSON.stringify({ attendance }) }),
    // Form
    getForm: (id: string) => request<SessionFormData>(`/sessions/${id}/form`),
    uploadFormFile: async (id: string, file: File) => {
        const token = getToken();
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch(`${BASE}/sessions/${id}/form-upload`, {
            method: "POST",
            headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: formData,
        });

        if (res.status === 401) {
            clearToken();
            throw new ApiError(401, "Unauthorized");
        }

        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new ApiError(res.status, body?.message ?? "Upload failed");
        return (body?.data ?? body) as SessionFormUploadResult;
    },
    submitForm: (id: string, answers: SessionFormAnswer[]) =>
        request<null>(`/sessions/${id}/form`, { method: "POST", body: JSON.stringify(answers) }),
    updateForm: (id: string, answers: SessionFormAnswer[]) =>
        request<null>(`/sessions/${id}/form`, { method: "PATCH", body: JSON.stringify(answers) }),
};
