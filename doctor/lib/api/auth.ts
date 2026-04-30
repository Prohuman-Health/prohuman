import { request } from "./core";

export interface StaffUser {
    id: string;
    email: string;
    full_name: string;
    role: string;
    branch_id: string | null;
    avatar_url: string | null;
    doctor_id?: string;
    specialty?: string;
}

export interface LoginResponse {
    token: string;
    user: StaffUser;
}

export const authApi = {
    login: (email: string, password: string) =>
        request<LoginResponse>("/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password }),
        }),
    me: () => request<StaffUser>("/auth/me"),
    googleUrl: (redirectOrigin?: string): string => {
        const base = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1"}/auth/google`;
        if (!redirectOrigin) return base;
        const url = new URL(base);
        url.searchParams.set("redirect_uri", redirectOrigin);
        return url.toString();
    },
};
