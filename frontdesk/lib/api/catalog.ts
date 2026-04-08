import { request } from "./core";

export interface Exercise {
    id: string; name: string; category: string | null; description: string | null;
    instructions: string | null; video_url: string | null; image_url: string | null;
    tags: string[] | null; is_active: boolean; created_at: string; created_by_name?: string;
}
export interface ExerciseListResponse { exercises: Exercise[]; total: number; page: number; }

export const exercisesApi = {
    list: (params?: Record<string, string>) =>
        request<ExerciseListResponse>(`/exercises?${new URLSearchParams(params)}`),
    categories: () => request<string[]>("/exercises/categories"),
    get: (id: string) => request<Exercise>(`/exercises/${id}`),
    create: (data: Partial<Exercise>) =>
        request<Exercise>("/exercises", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Exercise>) =>
        request<Exercise>(`/exercises/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) =>
        request<null>(`/exercises/${id}`, { method: "DELETE" }),
};

export interface Algorithm {
    id: string; name: string; diagnosis: string | null; description: string | null;
    estimated_sessions: number | null; is_active: boolean; created_at: string;
    created_by_name?: string; evaluation_steps?: unknown; treatment_steps?: unknown;
    red_flags?: unknown; exercises?: unknown[];
}
export interface AlgorithmListResponse { algorithms: Algorithm[]; total: number; page: number; }

export const algorithmsApi = {
    list: (params?: Record<string, string>) =>
        request<AlgorithmListResponse>(`/algorithms?${new URLSearchParams(params)}`),
    get: (id: string) => request<Algorithm>(`/algorithms/${id}`),
    create: (data: Partial<Algorithm>) =>
        request<Algorithm>("/algorithms", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Algorithm>) =>
        request<Algorithm>(`/algorithms/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) =>
        request<null>(`/algorithms/${id}`, { method: "DELETE" }),
    applyToPatient: (id: string, payload: { patient_id: string; session_id?: string; notes?: string }) =>
        request<unknown>(`/algorithms/${id}/apply`, { method: "POST", body: JSON.stringify(payload) }),
};
