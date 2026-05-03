"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft, Phone, Mail, Calendar, Hash, User,
    CalendarDays, Activity, Stethoscope, AlertCircle,
    Clock, FileText, Receipt, X, ChevronDown, ChevronUp, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { patientsApi, Patient, PatientSession, TimelineItem, sessionsApi, SessionFormData } from "@/lib/api";

// ── Helpers ────────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
    return <div className={cn("animate-pulse bg-muted rounded-xl", className)} />;
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
    return (
        <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <Icon className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
                <p className="text-sm font-medium mt-0.5 break-words">{value}</p>
            </div>
        </div>
    );
}

const STATUS_STYLES: Record<string, string> = {
    completed: "border-emerald-200 text-emerald-700 bg-emerald-50",
    confirmed: "border-blue-200 text-blue-700 bg-blue-50",
    pending: "border-amber-200 text-amber-700 bg-amber-50",
    "no-show": "border-red-200 text-red-600 bg-red-50",
    cancelled: "border-muted-foreground/30 text-muted-foreground bg-muted/30",
    "late-cancellation": "border-orange-200 text-orange-600 bg-orange-50",
    rescheduled: "border-purple-200 text-purple-600 bg-purple-50",
};

function PatientAvatar({ name }: { name: string }) {
    const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
    return (
        <div className="w-20 h-20 rounded-2xl bg-[#2493A2]/10 text-[#2493A2] flex items-center justify-center text-3xl font-bold shrink-0">
            {initials}
        </div>
    );
}

// ── Session Form Modal ────────────────────────────────────────────────────────

function SessionFormModal({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
    const [form, setForm] = useState<SessionFormData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    useEffect(() => {
        sessionsApi.getForm(sessionId)
            .then(setForm)
            .catch(() => setError("Could not load form responses."))
            .finally(() => setLoading(false));
    }, [sessionId]);

    const hasResponses = form && form.responses.length > 0;

    function getAnswer(q: SessionFormData["questions"][0]) {
        const r = form?.responses.find(r => r.question_id === q.id);
        if (!r) return null;
        if (r.answer_options?.length) return r.answer_options.join(", ");
        if (r.answer_value !== null && r.answer_value !== undefined) return String(r.answer_value);
        return r.answer_text ?? null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
                    <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <p className="font-semibold text-sm">Session Form Responses</p>
                    </div>
                    <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="overflow-y-auto flex-1 px-5 py-4">
                    {loading && (
                        <div className="flex justify-center py-10">
                            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        </div>
                    )}
                    {error && (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-3 text-sm text-red-700">
                            <AlertCircle className="w-4 h-4 shrink-0" />{error}
                        </div>
                    )}
                    {!loading && !error && !hasResponses && (
                        <div className="flex flex-col items-center gap-3 py-10 text-center">
                            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                                <FileText className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <p className="text-sm text-muted-foreground">No form responses recorded for this session.</p>
                        </div>
                    )}
                    {!loading && !error && hasResponses && (
                        <div className="space-y-3">
                            {form!.questions.map((q, idx) => {
                                const answer = getAnswer(q);
                                const isLong = (answer?.length ?? 0) > 120;
                                const isExpanded = expanded[q.id];
                                return (
                                    <div key={q.id} className="bg-muted/40 rounded-xl p-3.5">
                                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                                            {idx + 1}. {q.text}
                                        </p>
                                        {answer !== null ? (
                                            <div>
                                                <p className={cn(
                                                    "text-sm font-medium leading-relaxed",
                                                    !isExpanded && isLong ? "line-clamp-3" : ""
                                                )}>{answer}</p>
                                                {isLong && (
                                                    <button
                                                        onClick={() => setExpanded(e => ({ ...e, [q.id]: !e[q.id] }))}
                                                        className="flex items-center gap-1 text-[11px] text-[#2493A2] mt-1 font-medium">
                                                        {isExpanded ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> Show more</>}
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground italic">Not answered</p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Sessions tab ───────────────────────────────────────────────────────────────

function SessionsTab({ patientId }: { patientId: string }) {
    const [sessions, setSessions] = useState<PatientSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [formSessionId, setFormSessionId] = useState<string | null>(null);

    useEffect(() => {
        patientsApi.sessions(patientId)
            .then(d => setSessions(d as PatientSession[]))
            .catch(() => setError("Failed to load sessions"))
            .finally(() => setLoading(false));
    }, [patientId]);

    if (loading) return <div className="space-y-3 p-1">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>;
    if (error) return (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-3 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
    );

    return (
        <div className="space-y-2">
            {sessions.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-14 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                        <CalendarDays className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium">No sessions recorded</p>
                </div>
            ) : (
                <>
                    <p className="text-xs text-muted-foreground mb-3">{sessions.length} session{sessions.length !== 1 ? "s" : ""} total</p>
                    {sessions.map(s => {
                        const dt = new Date(s.scheduled_at);
                        return (
                            <div key={s.id} className="flex items-start gap-3 bg-white rounded-xl border border-border/50 p-4 hover:border-border transition-colors">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                                    <Stethoscope className="w-4 h-4 text-blue-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className="text-sm font-semibold">{s.session_type}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">Dr. {s.doctor_name}</p>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <button
                                                onClick={() => setFormSessionId(s.id)}
                                                title="View form responses"
                                                className="w-7 h-7 rounded-lg border border-border/60 flex items-center justify-center text-muted-foreground hover:text-[#2493A2] hover:border-[#2493A2]/40 hover:bg-[#2493A2]/5 transition-colors">
                                                <FileText className="w-3.5 h-3.5" />
                                            </button>
                                            <Badge variant="outline" className={cn("text-[10px] rounded-full px-2 font-medium", STATUS_STYLES[s.status] ?? STATUS_STYLES.pending)}>
                                                {s.status.replace(/-/g, " ")}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />
                                            {dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                        </span>
                                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />
                                            {dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                                        </span>
                                        <span>{s.duration_minutes} min</span>
                                        <span className="text-muted-foreground/70">· {s.branch}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </>
            )}
            {formSessionId && (
                <SessionFormModal sessionId={formSessionId} onClose={() => setFormSessionId(null)} />
            )}
        </div>
    );
}

// ── Timeline tab ───────────────────────────────────────────────────────────────

function TimelineTab({ patientId }: { patientId: string }) {
    const [items, setItems] = useState<TimelineItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        patientsApi.timeline(patientId)
            .then(d => setItems(d as TimelineItem[]))
            .catch(() => setError("Failed to load timeline"))
            .finally(() => setLoading(false));
    }, [patientId]);

    const typeIcon = (type: string) => {
        if (type === "session") return <CalendarDays className="w-3.5 h-3.5 text-blue-600" />;
        if (type === "invoice") return <Receipt className="w-3.5 h-3.5 text-amber-600" />;
        return <FileText className="w-3.5 h-3.5 text-violet-500" />;
    };
    const typeBg = (type: string) => {
        if (type === "session") return "bg-blue-50 border-blue-100";
        if (type === "invoice") return "bg-amber-50 border-amber-100";
        return "bg-violet-50 border-violet-100";
    };

    if (loading) return <div className="space-y-3 p-1">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>;
    if (error) return (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-3 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
    );
    if (!items.length) return (
        <div className="flex flex-col items-center gap-3 py-14 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                <Activity className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No activity yet</p>
        </div>
    );

    return (
        <div className="space-y-1">
            {items.map((item, idx) => (
                <div key={item.id + idx} className="flex items-start gap-3">
                    <div className="flex flex-col items-center shrink-0 pt-1">
                        <div className={cn("w-8 h-8 rounded-xl border flex items-center justify-center", typeBg(item.type))}>
                            {typeIcon(item.type)}
                        </div>
                        {idx < items.length - 1 && <div className="w-px flex-1 min-h-[20px] bg-border/60 my-0.5" />}
                    </div>
                    <div className="pb-4 min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold capitalize truncate">{item.label}</p>
                            <div className="flex items-center gap-1.5 shrink-0">
                                {item.status && (
                                    <Badge variant="outline" className={cn("text-[10px] rounded-full px-2 font-medium", STATUS_STYLES[item.status] ?? "")}>
                                        {item.status.replace(/-/g, " ")}
                                    </Badge>
                                )}
                                {item.amount !== undefined && (
                                    <span className="text-xs font-semibold text-amber-700">₹{Number(item.amount).toLocaleString("en-IN")}</span>
                                )}
                            </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                            {new Date(item.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                            {" · "}<span className="capitalize">{item.type}</span>
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

const TABS = [
    { key: "sessions", label: "Sessions", icon: CalendarDays },
    { key: "timeline", label: "Timeline", icon: Activity },
] as const;
type TabKey = typeof TABS[number]["key"];

export default function PatientDetailPage() {
    const params = useParams();
    const router = useRouter();
    const patientId = params.id as string;

    const [patient, setPatient] = useState<Patient | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tab, setTab] = useState<TabKey>("sessions");

    const loadPatient = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const p = await patientsApi.get(patientId);
            setPatient(p);
        } catch {
            setError("Patient not found");
        } finally { setLoading(false); }
    }, [patientId]);

    useEffect(() => { loadPatient(); }, [loadPatient]);

    if (loading) return (
        <div className="p-6 max-w-5xl mx-auto space-y-5">
            <Skeleton className="h-8 w-40" />
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
                <Skeleton className="h-[360px]" />
                <Skeleton className="h-[360px]" />
            </div>
        </div>
    );

    if (error || !patient) return (
        <div className="p-6 flex flex-col items-center gap-4 pt-24">
            <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">
                <AlertCircle className="w-7 h-7 text-red-500" />
            </div>
            <p className="text-base font-semibold">{error ?? "Patient not found"}</p>
            <Button variant="outline" className="rounded-xl gap-2" onClick={() => router.back()}>
                <ArrowLeft className="w-4 h-4" /> Go Back
            </Button>
        </div>
    );

    const registeredDate = new Date(patient.created_at).toLocaleDateString("en-IN", {
        day: "2-digit", month: "long", year: "numeric",
    });

    return (
        <div className="p-5 lg:p-6 max-w-5xl mx-auto space-y-5">
            {/* Back nav */}
            <button onClick={() => router.back()}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                Back
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5 items-start">

                {/* ── LEFT: Profile card ─────────────────────────────────── */}
                <div className="space-y-4">
                    <div className="bg-white rounded-2xl border border-border/50 p-5 space-y-4">
                        <div className="flex items-center gap-4">
                            <PatientAvatar name={patient.full_name} />
                            <div className="min-w-0">
                                <h1 className="text-lg font-bold leading-tight truncate">{patient.full_name}</h1>
                                <p className="text-xs text-muted-foreground font-mono mt-0.5">{patient.patient_code}</p>
                                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                    <Badge variant="outline" className={cn("text-[10px] rounded-full px-2.5 font-medium",
                                        patient.is_active ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-muted-foreground/20 text-muted-foreground")}>
                                        {patient.is_active ? "Active" : "Discharged"}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">{patient.age} yrs · {patient.gender}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 pt-1">
                            <InfoRow icon={Phone} label="Phone" value={patient.phone} />
                            <InfoRow icon={Mail} label="Email" value={patient.email ?? "Not provided"} />
                            <InfoRow icon={Hash} label="Patient Code" value={patient.patient_code} />
                            <InfoRow icon={Calendar} label="Registered" value={registeredDate} />
                            {patient.date_of_birth && (
                                <InfoRow icon={User} label="Date of Birth" value={new Date(patient.date_of_birth).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })} />
                            )}
                        </div>
                    </div>

                    {patient.complaints && (
                        <div className="bg-white rounded-2xl border border-border/50 p-5">
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">Chief Complaints</p>
                            <p className="text-sm leading-relaxed text-muted-foreground">{patient.complaints}</p>
                        </div>
                    )}
                </div>

                {/* ── RIGHT: Tabs ────────────────────────────────────────── */}
                <div className="bg-white rounded-2xl border border-border/50 flex flex-col overflow-hidden min-h-[400px]">
                    <div className="flex items-center gap-1 px-5 py-3 border-b border-border/60 bg-muted/20 shrink-0">
                        {TABS.map(({ key, label, icon: Icon }) => (
                            <button key={key} onClick={() => setTab(key)}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                                    tab === key ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                                )}>
                                <Icon className="w-3.5 h-3.5" />{label}
                            </button>
                        ))}
                    </div>
                    <div className="flex-1 p-5 overflow-y-auto">
                        {tab === "sessions" && <SessionsTab patientId={patient.id} />}
                        {tab === "timeline" && <TimelineTab patientId={patient.id} />}
                    </div>
                </div>
            </div>
        </div>
    );
}
