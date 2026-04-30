import { request } from "./core";

export interface StaffUser {
    id: string; email: string; full_name: string;
    role: string; branch_id: string | null; avatar_url: string | null;
    doctor_id?: string; specialty?: string;
}
export interface LoginResponse { token: string; user: StaffUser; }

export const authApi = {
    login: (email: string, password: string) =>
        request<LoginResponse>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
    me: () => request<StaffUser>("/auth/me"),
    /** Browser navigates here directly to start Google OAuth */
    googleUrl: (redirectOrigin?: string): string => {
        const baseUrl = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1"}/auth/google`;
        if (!redirectOrigin) return baseUrl;

        const url = new URL(baseUrl);
        url.searchParams.set("redirect_uri", redirectOrigin);
        return url.toString();
    },
};
