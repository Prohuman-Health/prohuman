import { request } from "./core";

export interface ClinicClosure {
    id: string;
    closure_date: string; // YYYY-MM-DD
    reason: string | null;
    created_at: string;
    updated_at: string;
}

export const calendarApi = {
    listClosures: (params?: { from?: string; to?: string }) =>
        request<ClinicClosure[]>(`/calendar/closures?${new URLSearchParams(params as Record<string, string>)}`),
    createClosure: (data: { closure_date: string; reason?: string }) =>
        request<ClinicClosure>("/calendar/closures", { method: "POST", body: JSON.stringify(data) }),
    updateClosure: (id: string, data: Partial<{ closure_date: string; reason: string; is_active: boolean }>) =>
        request<ClinicClosure>(`/calendar/closures/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    deleteClosure: (id: string) =>
        request<null>(`/calendar/closures/${id}`, { method: "DELETE" }),
};
