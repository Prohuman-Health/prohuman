"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { authApi } from "@/lib/api";
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";

const ALLOWED_ROLES = ["doctor", "physiotherapist", "massager", "fitness_trainer", "admin", "super_admin"];

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
        const err = params.get("error");
        if (err === "google_failed") setError("Google sign-in failed. Please try again.");
        if (err === "access_denied") setError("Your account does not have access to the Doctor portal.");
    }, [params]);

    useEffect(() => {
        if (loading || !user) return;
        if (ALLOWED_ROLES.includes(user.role)) {
            router.replace("/dashboard");
        } else {
            setError(`Your role (${user.role}) cannot access the Doctor portal.`);
        }
    }, [user, loading, router]);

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSubmitting(true);
        try {
            await login(email, password);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Login failed");
        } finally {
            setSubmitting(false);
        }
    };

    const handleGoogleLogin = () => {
        window.location.href = authApi.googleUrl(window.location.origin);
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
            {/* Left panel */}
            <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#2C3259] via-[#1a2040] to-[#0A0E28]" />
                <div className="absolute inset-0 opacity-30" style={{
                    backgroundImage: `radial-gradient(ellipse 60% 50% at 30% 60%, #2493A240 0%, transparent 70%),
                            radial-gradient(ellipse 40% 60% at 80% 20%, #57BDA215 0%, transparent 70%)`
                }} />
                <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-[#2493A2] opacity-5" />
                <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-[#DCB13C] opacity-5" />

                <div className="relative z-10">
                    <Image src="/logo-t.png" alt="ProHuman Health" width={260} height={80}
                        className="object-contain" priority
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                </div>

                <div className="relative z-10 space-y-6">
                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#2493A2]/15 border border-[#2493A2]/30 mb-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#57BDA2] animate-pulse" />
                            <span className="text-[#57BDA2] text-xs font-semibold tracking-wide uppercase">Doctor Portal</span>
                        </div>
                        <h1 className="text-4xl font-bold text-white leading-tight">
                            Your Schedule,<br />
                            <span className="text-[#2493A2]">At a Glance.</span>
                        </h1>
                        <p className="text-[#57BDA2] text-lg leading-relaxed">
                            View your daily appointments, manage patient sessions, and track your workload — all in one place.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {["Today&apos;s Schedule", "Patient Sessions", "Session Notes", "Attendance Tracking"].map(f => (
                            <span key={f} className="px-3 py-1 rounded-full text-xs font-medium bg-white/5 text-[#57BDA2] border border-[#2493A2]/20"
                                dangerouslySetInnerHTML={{ __html: f }} />
                        ))}
                    </div>
                </div>

                <div className="relative z-10 text-xs text-white/20">
                    © {new Date().getFullYear()} ProHuman Health
                </div>
            </div>

            {/* Right panel — login form */}
            <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
                <div className="w-full max-w-sm space-y-7">
                    <div className="lg:hidden mb-2">
                        <Image src="/logo-t.png" alt="ProHuman Health" width={160} height={48}
                            className="object-contain" priority
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    </div>

                    <div>
                        <h2 className="text-2xl font-bold text-white">Doctor Sign In</h2>
                        <p className="text-sm text-white/50 mt-1">Sign in to access your dashboard</p>
                    </div>

                    {error && (
                        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleEmailLogin} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-white/60 uppercase tracking-wider">Email</label>
                            <input
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="you@prohuman.in"
                                className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#2493A2] focus:ring-1 focus:ring-[#2493A2]/30 transition-all"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-white/60 uppercase tracking-wider">Password</label>
                            <div className="relative">
                                <input
                                    type={showPass ? "text" : "password"}
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full h-11 pl-4 pr-11 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#2493A2] focus:ring-1 focus:ring-[#2493A2]/30 transition-all"
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
                            className="w-full h-11 rounded-xl bg-[#2493A2] hover:bg-[#1d7a87] text-white text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            {submitting ? "Signing in…" : "Sign In"}
                        </button>
                    </form>

                    <div className="relative flex items-center gap-3">
                        <div className="flex-1 h-px bg-white/10" />
                        <span className="text-xs text-white/30">or</span>
                        <div className="flex-1 h-px bg-white/10" />
                    </div>

                    <button
                        onClick={handleGoogleLogin}
                        className="w-full h-11 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-sm font-medium flex items-center justify-center gap-3 transition-all"
                    >
                        <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Continue with Google
                    </button>
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
