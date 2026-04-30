import { request } from "./core";

export interface GCalStatus {
    connected: boolean;
    calendar_id?: string;
    connected_at?: string;
}

export interface GCalEvent {
    id: string;
    title: string;
    start: string;
    end: string;
    all_day: boolean;
}

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

export const gcalApi = {
    /** Check if the doctor has connected their Google Calendar */
    status: () => request<GCalStatus>("/gcal/status"),

    /** Fetch personal Google Calendar busy events for a given date (YYYY-MM-DD) */
    events: (date: string) => request<GCalEvent[]>(`/gcal/events?date=${date}`),

    /** Returns the URL to start the Google Calendar OAuth connect flow */
    connectUrl: (returnTo: string): string => {
        const url = new URL(`${BASE}/gcal/connect`);
        url.searchParams.set("return_to", returnTo);
        return url.toString();
    },

    /** Disconnect / remove stored tokens */
    disconnect: () => request<null>("/gcal/disconnect", { method: "DELETE" }),
};
