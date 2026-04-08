"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setToken, auth as authApi } from "@/lib/api";

const ALLOWED_ROLES = ["receptionist", "admin", "super_admin"];

// Spinner shown while Suspense is resolving or during the redirect
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

/**
 * Inner component — must be inside <Suspense> because it calls useSearchParams().
 * Next.js requires this for static page generation.
 */
function AuthCallbackInner() {
    const router = useRouter();
    const params = useSearchParams();

    useEffect(() => {
        const token = params.get("token");
        if (!token) {
            router.replace("/login?error=google_failed");
            return;
        }

        // Store the token first, then verify role before allowing access
        setToken(token);

        authApi.me()
            .then((user) => {
                if (!ALLOWED_ROLES.includes(user.role)) {
                    // Wrong role — clear the token and redirect back to login with error
                    import("@/lib/api/core").then(({ clearToken }) => clearToken());
                    router.replace("/login?error=access_denied");
                    return;
                }
                router.replace("/dashboard");
            })
            .catch(() => router.replace("/login?error=google_failed"));
    }, [params, router]);

    return <Spinner />;
}

/**
 * /auth/callback?token=<jwt>
 * Wrapped in Suspense so Next.js can statically generate this page.
 */
export default function AuthCallbackPage() {
    return (
        <Suspense fallback={<Spinner />}>
            <AuthCallbackInner />
        </Suspense>
    );
}
