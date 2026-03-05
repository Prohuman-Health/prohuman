"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { auth as api, onboarding } from "@/lib/api";
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";

// Inner component — uses useSearchParams so must live inside <Suspense>
function LoginInner() {
    const router = useRouter();
    const params = useSearchParams();
    const { user, loading, login } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (params.get("error") === "google_failed") {
            setError("Google sign-in failed. Please try again.");
        }
    }, [params]);

    // Single source of truth for post-login redirect.
    // When login() resolves it sets user in context → this effect fires → redirect.
    useEffect(() => {
        if (loading) return;
        if (!user) return;
        // Check onboarding status before deciding where to go
        onboarding.status()
            .then(s => router.replace(s.completed ? "/dashboard" : "/onboarding"))
            .catch(() => router.replace("/dashboard")); // if status check fails, go to dashboard
    }, [user, loading, router]);

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSubmitting(true);
        try {
            await login(email, password);
            // Don't redirect here — the useEffect above watches user and will do it.
            // Calling router.replace here AND in the effect caused the double-login race.
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Login failed");
        } finally {
            setSubmitting(false);
        }
    };

    const handleGoogleLogin = () => {
        window.location.href = api.googleUrl();
    };

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-[#0A0E28]">
                <Loader2 className="w-8 h-8 text-[#2493A2] animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0A0E28] flex">

            {/* ── Left panel — branding ─────────────────────────────────────────── */}
            <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden">
                {/* Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#2C3259] via-[#1a2040] to-[#0A0E28]" />
                <div className="absolute inset-0 opacity-30" style={{
                    backgroundImage: `radial-gradient(ellipse 60% 50% at 30% 60%, #2493A240 0%, transparent 70%),
                            radial-gradient(ellipse 40% 60% at 80% 20%, #57BDA215 0%, transparent 70%)`
                }} />
                <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-[#2493A2] opacity-5" />
                <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-[#DCB13C] opacity-5" />

                {/* Logo */}
                <div className="relative z-10">
                    <Image
                        src="/logo-t.png"
                        alt="ProHuman Health"
                        width={260}
                        height={80}
                        className="object-contain"
                        priority
                    />
                </div>

                {/* Hero copy */}
                <div className="relative z-10 space-y-6">
                    <div className="space-y-3">
                        <h1 className="text-4xl font-bold text-white leading-tight">
                            Clinic Management,<br />
                            <span className="text-[#2493A2]">Elevated.</span>
                        </h1>
                        <p className="text-[#57BDA2] text-lg leading-relaxed">
                            Everything your clinic needs — patients, sessions, exercises, algorithms, and more.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {["Patient Management", "Session Tracking", "WhatsApp Automation", "Algorithm Library", "Points & Rewards"].map(f => (
                            <span key={f} className="px-3 py-1 rounded-full text-xs font-medium bg-white/5 text-[#57BDA2] border border-[#2493A2]/20">
                                {f}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="relative z-10">
                    <p className="text-white/20 text-xs">© 2026 ProHuman Health. All rights reserved.</p>
                </div>
            </div>

            {/* ── Right panel — login form ──────────────────────────────────────── */}
            <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
                <div className="w-full max-w-md space-y-8">

                    {/* Mobile logo */}
                    <div className="lg:hidden">
                        <Image
                            src="/logo.png"
                            alt="ProHuman Health"
                            width={180}
                            height={55}
                            className="object-contain"
                            priority
                        />
                    </div>

                    <div>
                        <h2 className="text-2xl font-bold text-white">Welcome back</h2>
                        <p className="text-white/40 mt-1 text-sm">Sign in to your admin account</p>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Google */}
                    <button
                        onClick={handleGoogleLogin}
                        className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl
                       bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20
                       text-white text-sm font-medium transition-all duration-200"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Continue with Google
                    </button>

                    {/* Divider */}
                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-white/10" />
                        <span className="text-white/30 text-xs font-medium">or email & password</span>
                        <div className="flex-1 h-px bg-white/10" />
                    </div>

                    {/* Form */}
                    <form onSubmit={handleEmailLogin} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-white/60 text-xs font-medium uppercase tracking-wider">Email address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                placeholder="you@prohuman.com"
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10
                           text-white placeholder:text-white/20 text-sm
                           focus:outline-none focus:border-[#2493A2] transition-all duration-200"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-white/60 text-xs font-medium uppercase tracking-wider">Password</label>
                            <div className="relative">
                                <input
                                    type={showPass ? "text" : "password"}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    placeholder="••••••••"
                                    className="w-full px-4 py-3 pr-11 rounded-xl bg-white/5 border border-white/10
                             text-white placeholder:text-white/20 text-sm
                             focus:outline-none focus:border-[#2493A2] transition-all duration-200"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPass(v => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                                >
                                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                         bg-[#2493A2] hover:bg-[#1d7a87] text-white text-sm font-semibold
                         transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                         shadow-lg shadow-[#2493A2]/20 hover:shadow-[#2493A2]/30"
                        >
                            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            {submitting ? "Signing in…" : "Sign in"}
                        </button>
                    </form>

                    <p className="text-center text-white/20 text-xs">
                        Only authorised staff members can access this panel.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="h-screen flex items-center justify-center bg-[#0A0E28]">
                <Loader2 className="w-8 h-8 text-[#2493A2] animate-spin" />
            </div>
        }>
            <LoginInner />
        </Suspense>
    );
}
