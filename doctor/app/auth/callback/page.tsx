"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setToken, authApi, clearToken } from "@/lib/api";
import { Loader2 } from "lucide-react";

const ALLOWED_ROLES = ["doctor", "physiotherapist", "massager", "fitness_trainer", "admin", "super_admin"];

function Spinner() {
    return (
        <div className="h-screen flex items-center justify-center bg-[#0A0E28]">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 rounded-full border-4 border-[#2493A2] border-t-transparent animate-spin" />
                <p className="text-[#57BDA2] text-sm font-medium">Signing you in…</p>
            </div>
        </div>
    );
}

function AuthCallbackInner() {
    const router = useRouter();
    const params = useSearchParams();

    useEffect(() => {
        const token = params.get("token");
        if (!token) {
            router.replace("/login?error=google_failed");
            return;
        }

        setToken(token);

        authApi.me()
            .then((user) => {
                if (!ALLOWED_ROLES.includes(user.role)) {
                    clearToken();
                    router.replace("/login?error=access_denied");
                    return;
                }
                router.replace("/dashboard");
            })
            .catch(() => router.replace("/login?error=google_failed"));
    }, [params, router]);

    return <Spinner />;
}

export default function AuthCallbackPage() {
    return (
        <Suspense fallback={<Spinner />}>
            <AuthCallbackInner />
        </Suspense>
    );
}
