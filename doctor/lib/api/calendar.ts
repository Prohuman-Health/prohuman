import { request } from "./core";

export interface ClinicClosure {
    id: string;
    closure_date: string; // YYYY-MM-DD
    reason: string | null;
}

export const calendarApi = {
    listClosures: (params?: { from?: string; to?: string }) =>
        request<ClinicClosure[]>(`/calendar/closures?${new URLSearchParams(params as Record<string, string>)}`),
};
