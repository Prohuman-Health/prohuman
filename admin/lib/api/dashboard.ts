import { request } from "./core";

export interface DashboardStats {
    stats: {
        total_patients: number; active_doctors: number; session_types: number;
        sessions_this_month: number; sessions_today: number;
        waitlist_count: number; unassigned_forms: number;
        new_patients: number; repeat_patients: number;
    };
    weekly_sessions: { dow: number; count: number }[];
    session_status: {
        completed: number; scheduled: number; cancelled: number; no_show: number; total: number;
    };
    recent_patients: { id: string; full_name: string; patient_code: string; created_at: string }[];
    upcoming_session: {
        id: string; scheduled_at: string; patient_name: string;
        doctor_name: string; session_type_name: string; status: string;
    } | null;
    staff: { id: string; full_name: string; role: string; avatar_url: string | null; is_active: boolean }[];
}

export const dashboardApi = {
    stats: () => request<DashboardStats>("/dashboard/stats"),
};
