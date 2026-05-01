"use client";

import { useState, useEffect } from "react";
import {
    User, Mail, Phone, Stethoscope, Briefcase, Save, Loader2,
    CheckCircle2, AlertTriangle, KeyRound, Eye, EyeOff, ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { authApi, request, StaffUser } from "@/lib/api";

// ── Helpers ───────────────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
    return <div className={cn("animate-pulse bg-gray-100 rounded-xl", className)} />;
}

function Avatar({ name }: { name: string }) {
    const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
    return (
        <div className="w-20 h-20 rounded-2xl bg-[#2493A2]/10 text-[#2493A2] text-3xl font-bold flex items-center justify-center shrink-0">
            {initials}
        </div>
    );
}

const ROLE_LABEL: Record<string, string> = {
    doctor:           "Doctor",
    physiotherapist:  "Physiotherapist",
    massager:         "Massager",
    fitness_trainer:  "Fitness Trainer",
    admin:            "Admin",
    receptionist:     "Receptionist",
};

// ── Profile form ──────────────────────────────────────────────────────────────
function ProfileForm({ user, onUpdated }: { user: StaffUser; onUpdated: (u: StaffUser) => void }) {
    const [form, setForm] = useState({
        full_name: user.full_name ?? "",
        phone: "",          // StaffUser may not expose phone — keep optional
        specialty: user.specialty ?? "",
    });
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function save(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true); setError(null); setSaved(false);
        try {
            const updated = await request<StaffUser>(`/staff/${user.id}`, {
                method: "PATCH",
                body: JSON.stringify({
                    full_name: form.full_name.trim() || undefined,
                    specialty: form.specialty.trim() || undefined,
                    ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
                }),
            });
            setSaved(true);
            onUpdated(updated);
            setTimeout(() => setSaved(false), 2500);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save.");
        } finally { setSaving(false); }
    }

    return (
        <form onSubmit={save} className="space-y-4">
            {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 text-xs text-red-600">
                    <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
                </div>
            )}
            {saved && (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5 text-xs text-emerald-700">
                    <CheckCircle2 className="w-4 h-4 shrink-0" /> Profile updated!
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Full name */}
                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-500">Full Name</label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input
                            value={form.full_name}
                            onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-[#2493A2]/30 focus:border-[#2493A2]"
                            placeholder="Your full name"
                        />
                    </div>
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-500">Phone</label>
                    <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input
                            value={form.phone}
                            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-[#2493A2]/30 focus:border-[#2493A2]"
                            placeholder="+91 …"
                            type="tel"
                        />
                    </div>
                </div>

                {/* Specialty */}
                <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-medium text-gray-500">Specialty / Designation</label>
                    <div className="relative">
                        <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input
                            value={form.specialty}
                            onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))}
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-[#2493A2]/30 focus:border-[#2493A2]"
                            placeholder="e.g. Sports Physiotherapy"
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-end">
                <button type="submit" disabled={saving}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2493A2] text-white text-sm font-semibold hover:bg-[#1d7a87] disabled:opacity-60 transition-colors">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? "Saving…" : "Save Changes"}
                </button>
            </div>
        </form>
    );
}

// ── Password form ─────────────────────────────────────────────────────────────
function PasswordForm({ userId }: { userId: string }) {
    const [form, setForm] = useState({ current: "", next: "", confirm: "" });
    const [show, setShow] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mismatch = form.confirm.length > 0 && form.next !== form.confirm;
    const tooShort = form.next.length > 0 && form.next.length < 8;
    const canSubmit = form.current.length > 0 && form.next.length >= 8 && form.next === form.confirm && !saving;

    async function changePassword(e: React.FormEvent) {
        e.preventDefault();
        if (!canSubmit) return;
        setSaving(true); setError(null); setSaved(false);
        try {
            // Use the staff password endpoint (doctor's own staff id)
            await request<null>(`/staff/${userId}/password`, {
                method: "PATCH",
                body: JSON.stringify({ password: form.next, current_password: form.current }),
            });
            setSaved(true);
            setForm({ current: "", next: "", confirm: "" });
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update password.");
        } finally { setSaving(false); }
    }

    return (
        <form onSubmit={changePassword} className="max-w-sm space-y-4">
            {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 text-xs text-red-600">
                    <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
                </div>
            )}
            {saved && (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5 text-xs text-emerald-700">
                    <CheckCircle2 className="w-4 h-4 shrink-0" /> Password updated successfully.
                </div>
            )}

            {[
                { key: "current" as const, label: "Current Password", placeholder: "Your current password" },
                { key: "next" as const,    label: "New Password",     placeholder: "At least 8 characters" },
                { key: "confirm" as const, label: "Confirm Password", placeholder: "Repeat new password" },
            ].map(({ key, label, placeholder }) => (
                <div key={key} className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-500">{label}</label>
                    <div className="relative">
                        <input
                            type={show ? "text" : "password"}
                            value={form[key]}
                            onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                            placeholder={placeholder}
                            autoComplete={key === "current" ? "current-password" : "new-password"}
                            className={cn(
                                "w-full pl-3 pr-10 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-[#2493A2]/30 focus:border-[#2493A2]",
                                (key === "next" && tooShort) || (key === "confirm" && mismatch)
                                    ? "border-red-300 focus:ring-red-200"
                                    : "border-gray-200"
                            )}
                        />
                        {key === "next" && (
                            <button type="button" onClick={() => setShow(s => !s)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        )}
                    </div>
                    {key === "next" && tooShort && <p className="text-[11px] text-red-500">Min 8 characters</p>}
                    {key === "confirm" && mismatch && <p className="text-[11px] text-red-500">Passwords do not match</p>}
                </div>
            ))}

            <button type="submit" disabled={!canSubmit}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2493A2] text-white text-sm font-semibold hover:bg-[#1d7a87] disabled:opacity-60 transition-colors w-full justify-center">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                {saving ? "Updating…" : "Update Password"}
            </button>
        </form>
    );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ProfilePage() {
    const { user: ctxUser } = useAuth();
    const [user, setUser] = useState<StaffUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<"profile" | "security">("profile");

    useEffect(() => {
        authApi.me()
            .then(u => { setUser(u); })
            .catch(() => { if (ctxUser) setUser(ctxUser); })
            .finally(() => setLoading(false));
    }, [ctxUser]);

    if (loading) return (
        <div className="p-5 max-w-3xl mx-auto space-y-4">
            <Skeleton className="h-8 w-40" />
            <div className="flex gap-5"><Skeleton className="w-56 h-48 rounded-2xl" /><Skeleton className="flex-1 h-48 rounded-2xl" /></div>
        </div>
    );

    const u = user ?? ctxUser;
    if (!u) return null;

    const roleLabel = ROLE_LABEL[u.role] ?? u.role.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

    return (
        <div className="p-5 max-w-3xl mx-auto space-y-5">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">My Profile</h1>
                <p className="text-sm text-gray-400 mt-0.5">View and update your account details</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-5">
                {/* Identity card */}
                <div className="lg:w-56 shrink-0 bg-white rounded-2xl p-5 border border-gray-100 flex flex-col items-center text-center gap-3">
                    <Avatar name={u.full_name} />
                    <div>
                        <p className="font-bold text-gray-900">{u.full_name}</p>
                        <p className="text-xs text-gray-400 mt-0.5 capitalize">{roleLabel}</p>
                    </div>
                    {u.specialty && (
                        <div className="flex items-center gap-1.5 text-xs text-[#2493A2] bg-[#2493A2]/10 px-3 py-1 rounded-full">
                            <Stethoscope className="w-3 h-3" /> {u.specialty}
                        </div>
                    )}
                    <div className="w-full border-t border-gray-100 pt-3 space-y-2 text-left">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="truncate">{u.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Briefcase className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="capitalize">{roleLabel}</span>
                        </div>
                    </div>
                </div>

                {/* Tabs panel */}
                <div className="flex-1 bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="px-5 pt-4 pb-0 border-b border-gray-100">
                        <div className="inline-flex items-center gap-1 bg-gray-100 rounded-xl p-1 mb-4">
                            {(["profile", "security"] as const).map(t => (
                                <button key={t} onClick={() => setTab(t)}
                                    className={cn("flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize",
                                        tab === t ? "bg-white shadow-sm text-gray-900" : "text-gray-400 hover:text-gray-700")}>
                                    {t === "profile" ? <User className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="p-5">
                        {tab === "profile" && <ProfileForm user={u} onUpdated={setUser} />}
                        {tab === "security" && <PasswordForm userId={u.id} />}
                    </div>
                </div>
            </div>
        </div>
    );
}
