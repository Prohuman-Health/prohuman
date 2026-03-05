"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setToken } from "@/lib/api";
import { onboarding } from "@/lib/api";

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
        setToken(token);

        // Check if they need onboarding first
        onboarding.status()
            .then((s) => router.replace(s.completed ? "/dashboard" : "/onboarding"))
            .catch(() => router.replace("/dashboard"));
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
