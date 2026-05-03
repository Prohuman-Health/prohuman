import { request } from "./core";
import type { Doctor } from "./staff";
import type { SessionType } from "./clinic";
import type { Branch } from "./branches";

export interface BookingDateInfo {
    available_doctors: Doctor[];
    is_closed: boolean;
    closure_reason: string | null;
    session_types: SessionType[];
    branches: Branch[];
}

export interface ClinicClosure {
    id: string;
    closure_date: string; // YYYY-MM-DD
    reason: string | null;
}

export const calendarApi = {
    /** Single call for booking modal: available doctors + closure check + session types + branches. */
    dateInfo: (date: string, branch_id?: string) =>
        request<BookingDateInfo>(`/calendar/date-info?${new URLSearchParams({ date, ...(branch_id ? { branch_id } : {}) })}`),

    listClosures: (params?: { from?: string; to?: string }) =>
        request<ClinicClosure[]>(`/calendar/closures?${new URLSearchParams(params as Record<string, string>)}`),
};
