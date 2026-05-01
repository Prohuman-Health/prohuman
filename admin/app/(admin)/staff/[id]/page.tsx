"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft, Mail, Phone, Calendar, Shield, Stethoscope,
    KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle,
    Loader2, RefreshCw, User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { staffApi, sessionsApi, type StaffMember, type Session } from "@/lib/api";
import Link from "next/link";

// ── Helpers ───────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
    return <div className={cn("animate-pulse bg-muted rounded-xl", className)} />;
}

const ROLE_COLORS: Record<string, string> = {
    admin:            "bg-violet-100 text-violet-700",
    receptionist:     "bg-blue-100 text-blue-700",
    physiotherapist:  "bg-emerald-100 text-emerald-700",
    massager:         "bg-amber-100 text-amber-700",
    fitness_trainer:  "bg-orange-100 text-orange-700",
    doctor:           "bg-teal-100 text-teal-700",
};

const AVATAR_COLORS = [
    "bg-violet-100 text-violet-700", "bg-blue-100 text-blue-700",
    "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-700",
    "bg-teal-100 text-teal-700", "bg-orange-100 text-orange-700",
];

const initials = (name: string) =>
    name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
    completed:           { label: "Completed",    cls: "border-emerald-200 text-emerald-700 bg-emerald-50" },
    confirmed:           { label: "Confirmed",    cls: "border-blue-200 text-blue-700 bg-blue-50" },
    pending:             { label: "Pending",      cls: "border-amber-200 text-amber-700 bg-amber-50" },
    "no-show":           { label: "No-Show",      cls: "border-red-200 text-red-600 bg-red-50" },
    cancelled:           { label: "Cancelled",    cls: "border-muted-foreground/30 text-muted-foreground bg-muted/30" },
    "late-cancellation": { label: "Late Cancel",  cls: "border-orange-200 text-orange-600 bg-orange-50" },
    rescheduled:         { label: "Rescheduled",  cls: "border-purple-200 text-purple-600 bg-purple-50" },
};

// ── Sessions Tab ──────────────────────────────────────────────────────────────
function SessionsTab({ doctorId }: { doctorId: string | undefined }) {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!doctorId) return;
        setLoading(true);
        sessionsApi.list({ doctor_id: doctorId })
            .then(d => setSessions(d.sessions ?? []))
            .catch(() => setError("Failed to load sessions."))
            .finally(() => setLoading(false));
    }, [doctorId]);

    if (!doctorId) return (
        <div className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
            <Stethoscope className="w-9 h-9 opacity-30" />
            <div>
                <p className="text-sm font-semibold text-foreground">Not a doctor</p>
                <p className="text-xs mt-1">This staff member's role does not have associated sessions.</p>
            </div>
        </div>
    );

    if (loading) return <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>;

    if (error) return (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
    );

    if (sessions.length === 0) return (
        <div className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
            <Calendar className="w-9 h-9 opacity-30" />
            <p className="text-sm">No sessions found for this doctor.</p>
        </div>
    );

    return (
        <div className="space-y-2">
            {sessions.map(s => {
                const cfg = STATUS_CONFIG[s.status] ?? STATUS_CONFIG.pending;
                const dt = new Date(s.scheduled_at);
                return (
                    <Link href={`/sessions/${s.id}`} key={s.id}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border/60 bg-background hover:bg-muted/40 transition-colors block">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold truncate">{s.patient_name}</p>
                                <Badge variant="outline" className={cn("text-[10px] rounded-full px-2 font-medium shrink-0", cfg.cls)}>{cfg.label}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                {s.session_type_name} · {dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} {dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                            </p>
                        </div>
                    </Link>
                );
            })}
        </div>
    );
}

// ── Security Tab ──────────────────────────────────────────────────────────────
function SecurityTab({ staffId }: { staffId: string }) {
    const [newPwd, setNewPwd] = useState("");
    const [confirmPwd, setConfirmPwd] = useState("");
    const [showPwd, setShowPwd] = useState(false);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mismatch = confirmPwd.length > 0 && newPwd !== confirmPwd;
    const tooShort = newPwd.length > 0 && newPwd.length < 8;
    const canSubmit = newPwd.length >= 8 && newPwd === confirmPwd && !saving;

    async function changePassword(e: React.FormEvent) {
        e.preventDefault();
        if (!canSubmit) return;
        setSaving(true); setError(null); setSuccess(false);
        try {
            await staffApi.setPassword(staffId, newPwd);
            setSuccess(true);
            setNewPwd("");
            setConfirmPwd("");
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update password.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <form onSubmit={changePassword} className="max-w-sm space-y-4">
            <div>
                <p className="text-sm font-semibold mb-1">Set New Password</p>
                <p className="text-xs text-muted-foreground">Admin override — the user will not receive a notification.</p>
            </div>

            {success && (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5 text-xs text-emerald-700">
                    <CheckCircle2 className="w-4 h-4 shrink-0" /> Password updated successfully.
                </div>
            )}
            {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-xs text-red-700">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
            )}

            <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">New Password</label>
                <div className="relative">
                    <Input
                        type={showPwd ? "text" : "password"}
                        value={newPwd}
                        onChange={e => setNewPwd(e.target.value)}
                        placeholder="At least 8 characters"
                        className={cn("rounded-xl pr-10", tooShort && "border-red-400 focus-visible:ring-red-400")}
                        autoComplete="new-password"
                    />
                    <button type="button" onClick={() => setShowPwd(p => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                </div>
                {tooShort && <p className="text-[11px] text-red-500">Password must be at least 8 characters.</p>}
            </div>

            <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Confirm Password</label>
                <Input
                    type={showPwd ? "text" : "password"}
                    value={confirmPwd}
                    onChange={e => setConfirmPwd(e.target.value)}
                    placeholder="Repeat new password"
                    className={cn("rounded-xl", mismatch && "border-red-400 focus-visible:ring-red-400")}
                    autoComplete="new-password"
                />
                {mismatch && <p className="text-[11px] text-red-500">Passwords do not match.</p>}
            </div>

            <Button type="submit" disabled={!canSubmit} className="rounded-xl gap-2 w-full">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                {saving ? "Updating…" : "Update Password"}
            </Button>
        </form>
    );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function StaffDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();

    const [staff, setStaff] = useState<StaffMember | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tab, setTab] = useState<"sessions" | "security">("sessions");

    const load = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const s = await staffApi.get(id);
            setStaff(s);
        } catch {
            setError("Staff member not found.");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { load(); }, [load]);

    if (loading) return (
        <div className="p-5 space-y-4">
            <div className="flex items-center gap-3"><Skeleton className="w-8 h-8 rounded-xl" /><Skeleton className="w-48 h-6" /></div>
            <div className="flex gap-4"><Skeleton className="w-64 h-72 rounded-2xl" /><Skeleton className="flex-1 h-72 rounded-2xl" /></div>
        </div>
    );

    if (error || !staff) return (
        <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <AlertCircle className="w-8 h-8" />
            <p className="text-sm">{error ?? "Not found."}</p>
            <Button size="sm" variant="outline" onClick={() => router.back()}>Go back</Button>
        </div>
    );

    const avatarColor = AVATAR_COLORS[(staff.full_name.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];
    const roleColor = ROLE_COLORS[staff.role] ?? "bg-muted text-muted-foreground";
    const roleLabel = staff.role.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

    return (
        <div className="flex flex-col h-full overflow-hidden gap-4 p-4 md:p-5">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button onClick={() => router.back()}
                    className="w-8 h-8 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors shrink-0">
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex-1 min-w-0">
                    <h1 className="text-xl font-bold tracking-tight">{staff.full_name}</h1>
                    <p className="text-xs text-muted-foreground mt-0.5">{staff.email}</p>
                </div>
                <button onClick={load} className="w-8 h-8 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors shrink-0">
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>

            {/* Body */}
            <div className="flex gap-4 flex-1 min-h-0 flex-col lg:flex-row">
                {/* Left sidebar */}
                <div className="lg:w-64 shrink-0 flex flex-col gap-3">
                    {/* Avatar + identity */}
                    <div className="bg-white rounded-2xl p-5 border border-border/50 flex flex-col items-center text-center gap-3">
                        <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold", avatarColor)}>
                            {initials(staff.full_name)}
                        </div>
                        <div>
                            <p className="font-bold text-base">{staff.full_name}</p>
                            <Badge className={cn("text-[11px] rounded-full px-2.5 mt-1", roleColor)}>{roleLabel}</Badge>
                        </div>
                        <span className={cn("px-2.5 py-0.5 rounded-full text-[11px] font-medium border",
                            staff.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-muted text-muted-foreground border-border")}>
                            {staff.is_active ? "Active" : "Inactive"}
                        </span>
                    </div>

                    {/* Contact info */}
                    <div className="bg-white rounded-2xl p-4 border border-border/50 space-y-3">
                        {[
                            { icon: Mail, label: "Email", value: staff.email },
                            { icon: Phone, label: "Phone", value: staff.phone ?? "—" },
                            { icon: Calendar, label: "Joined", value: fmtDate(staff.created_at) },
                            ...(staff.specialty ? [{ icon: Stethoscope, label: "Specialty", value: staff.specialty }] : []),
                            ...(staff.doctor_id ? [{ icon: User, label: "Doctor ID", value: staff.doctor_id.slice(0, 8) + "…" }] : []),
                        ].map(({ icon: Icon, label, value }) => (
                            <div key={label} className="flex items-start gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">{label}</p>
                                    <p className="text-xs font-medium truncate">{value}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Role badge detail */}
                    <div className="bg-white rounded-2xl p-4 border border-border/50">
                        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mb-1.5">Role</p>
                        <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-muted-foreground" />
                            <span className={cn("px-2.5 py-1 rounded-xl text-xs font-semibold", roleColor)}>{roleLabel}</span>
                        </div>
                    </div>
                </div>

                {/* Right: tabs */}
                <div className="flex-1 min-w-0 min-h-0 bg-white rounded-2xl border border-border/50 flex flex-col overflow-hidden">
                    <div className="px-4 pt-4 pb-0 border-b border-border/60">
                        <div className="inline-flex items-center gap-1 bg-muted rounded-xl p-1 mb-4">
                            {(["sessions", "security"] as const).map(t => (
                                <button key={t} onClick={() => setTab(t)}
                                    className={cn("flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize",
                                        tab === t ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
                                    {t === "sessions" ? <Calendar className="w-3 h-3" /> : <KeyRound className="w-3 h-3" />}
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5">
                        {tab === "sessions" && <SessionsTab doctorId={staff.doctor_id} />}
                        {tab === "security" && <SecurityTab staffId={staff.id} />}
                    </div>
                </div>
            </div>
        </div>
    );
}
