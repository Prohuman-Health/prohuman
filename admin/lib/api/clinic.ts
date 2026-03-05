import { request } from "./core";

export interface SessionType {
    id: string; name: string; description: string | null;
    default_duration_minutes: number; fee: number;
    form_id: string | null; form_title?: string | null; is_active: boolean;
}

export const sessionTypesApi = {
    list: (params?: Record<string, string>) =>
        request<SessionType[]>(`/session-types?${new URLSearchParams(params)}`),
    get: (id: string) => request<SessionType>(`/session-types/${id}`),
    create: (data: Partial<SessionType>) =>
        request<SessionType>("/session-types", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<SessionType>) =>
        request<SessionType>(`/session-types/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) =>
        request<null>(`/session-types/${id}`, { method: "DELETE" }),
};

export interface Setting { key: string; value: unknown; branch_id: string | null; }

export const settingsApi = {
    list: () => request<Setting[]>("/settings"),
    get: (key: string) => request<Setting>(`/settings/${key}`),
    upsert: (key: string, value: unknown, branch_id?: string) =>
        request<Setting>("/settings", { method: "PUT", body: JSON.stringify({ key, value, branch_id }) }),
};

// ── Questions (reusable question bank) ────────────────────────────────────────
// Must match backend Zod enum exactly
export type QuestionAnswerType = "free_text" | "yes_no" | "scale" | "multiple_choice";

export interface Question {
    id: string;
    text: string;
    answer_type: QuestionAnswerType;
    options: string[] | undefined;   // only for multiple_choice
    scale_min: number | undefined;   // only for scale
    scale_max: number | undefined;   // only for scale
    tags: string[];
    is_active: boolean;
    created_at: string;
}

export const questionsApi = {
    list: (params?: Record<string, string>) =>
        request<Question[]>(`/questions?${new URLSearchParams(params)}`),
    get: (id: string) => request<Question>(`/questions/${id}`),
    create: (data: Partial<Question>) =>
        request<Question>("/questions", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Question>) =>
        request<Question>(`/questions/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    retire: (id: string) =>
        request<null>(`/questions/${id}`, { method: "DELETE" }),
};

// ── Forms ─────────────────────────────────────────────────────────────────────
export interface FormQuestion {
    id: string;           // question id (from form_questions join)
    text: string;
    answer_type: QuestionAnswerType;
    options: string[] | undefined;
    scale_min: number | undefined;
    scale_max: number | undefined;
    is_required: boolean;
    order_index: number;
}

export interface Form {
    id: string;
    title: string;
    description: string | null;
    is_published: boolean;
    created_at: string;
    updated_at: string;
    questions?: FormQuestion[];
}

export const formsApi = {
    list: () => request<Form[]>("/forms"),
    get: (id: string) => request<Form>(`/forms/${id}`),
    create: (data: { title: string; description?: string }) =>
        request<Form>("/forms", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: { title?: string; description?: string }) =>
        request<Form>(`/forms/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) =>
        request<null>(`/forms/${id}`, { method: "DELETE" }),
    publish: (id: string) =>
        request<Form>(`/forms/${id}/publish`, { method: "PUT" }),
    setQuestions: (id: string, questions: { question_id: string; order_index: number; is_required: boolean }[]) =>
        request<FormQuestion[]>(`/forms/${id}/questions`, { method: "PUT", body: JSON.stringify(questions) }),
};

