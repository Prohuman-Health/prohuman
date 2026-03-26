"use client";

import { useState, useEffect } from "react";
import {
    Search, RefreshCw, CalendarDays, X, Loader2, FileText,
    CheckCircle2, XCircle, Clock, User, Stethoscope, AlertCircle,
    ClipboardList, UserX, ChevronDown,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useSessions } from "@/lib/contexts/sessions-context";
import { NewSessionModal } from "@/components/modals/new-session-modal";
import {
    sessionsApi, Session,
    SessionFormData, SessionFormAnswer,
} from "@/lib/api";

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
    completed: { label: "Completed", cls: "border-emerald-200 text-emerald-700 bg-emerald-50" },
    confirmed: { label: "Confirmed", cls: "border-blue-200 text-blue-700 bg-blue-50" },
    pending: { label: "Pending", cls: "border-amber-200 text-amber-700 bg-amber-50" },
    "no-show": { label: "No-Show", cls: "border-red-200 text-red-600 bg-red-50" },
    cancelled: { label: "Cancelled", cls: "border-muted-foreground/30 text-muted-foreground bg-muted/30" },
    "late-cancellation": { label: "Late Cancel", cls: "border-orange-200 text-orange-600 bg-orange-50" },
    rescheduled: { label: "Rescheduled", cls: "border-purple-200 text-purple-600 bg-purple-50" },
};
const FILTERS = ["all", "pending", "confirmed", "completed", "no-show", "cancelled"];

function Skeleton({ className }: { className?: string }) {
    return <div className={cn("animate-pulse bg-muted rounded-xl", className)} />;
}

// ── Session Form Modal ─────────────────────────────────────────────────────────
function SessionFormModal({ sessionId, sessionTitle, onClose }: {
    sessionId: string; sessionTitle: string; onClose: () => void;
}) {
    const [data, setData] = useState<SessionFormData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Answers keyed by question_id
    const [answers, setAnswers] = useState<Record<string, SessionFormAnswer>>({});

    useEffect(() => {
        sessionsApi.getForm(sessionId)
            .then(d => {
                setData(d);
                // Pre-fill existing responses
                const pre: Record<string, SessionFormAnswer> = {};
                for (const r of d.responses) {
                    pre[r.question_id] = {
                        question_id: r.question_id,
                        ...(r.answer_text != null ? { answer_text: r.answer_text } : {}),
                        ...(r.answer_value != null ? { answer_value: r.answer_value } : {}),
                        ...(r.answer_options != null ? { answer_options: r.answer_options } : {}),
                    };
                }
                setAnswers(pre);
            })
            .catch(() => setError("Failed to load form"))
            .finally(() => setLoading(false));
    }, [sessionId]);

    const hasExisting = (data?.responses?.length ?? 0) > 0;

    async function submit() {
        if (!data?.questions?.length) return;
        setSaving(true); setError(null);
        try {
            const payload = Object.values(answers).filter(a => a.question_id);
            if (hasExisting) {
                await sessionsApi.updateForm(sessionId, payload);
            } else {
                await sessionsApi.submitForm(sessionId, payload);
            }
            setSaved(true);
            setTimeout(() => { setSaved(false); onClose(); }, 1200);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to save");
        } finally { setSaving(false); }
    }

    function setAnswer(qid: string, patch: Partial<SessionFormAnswer>) {
        setAnswers(prev => ({ ...prev, [qid]: { ...prev[qid], question_id: qid, ...patch } }));
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                            <ClipboardList className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="font-bold text-base">Session Form</h2>
                            <p className="text-xs text-muted-foreground truncate max-w-[280px]">{sessionTitle}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                    {loading ? (
                        Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)
                    ) : error ? (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                            <AlertCircle className="w-4 h-4 shrink-0" />{error}
                        </div>
                    ) : !data?.form_id ? (
                        <div className="flex flex-col items-center gap-3 py-12 text-center">
                            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                                <FileText className="w-6 h-6 text-muted-foreground" />
                            </div>
                            <div>
                                <p className="font-semibold text-sm">No form linked</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    This session type has no form attached.<br />
                                    Go to <strong>Session Types</strong> and link a published form.
                                </p>
                            </div>
                        </div>
                    ) : data.questions.length === 0 ? (
                        <p className="text-center py-8 text-sm text-muted-foreground">The linked form has no questions yet.</p>
                    ) : (
                        <>
                            {hasExisting && (
                                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5 text-xs text-blue-700">
                                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                                    Responses already submitted. You can update them below.
                                </div>
                            )}
                            {saved && (
                                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5 text-xs text-emerald-700">
                                    <CheckCircle2 className="w-4 h-4 shrink-0" />Saved successfully!
                                </div>
                            )}
                            {error && (
                                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-xs text-red-700">
                                    <AlertCircle className="w-4 h-4 shrink-0" />{error}
                                </div>
                            )}
                            {data.questions.map((q, i) => {
                                const ans = answers[q.id] ?? { question_id: q.id };
                                return (
                                    <div key={q.id} className="space-y-1.5">
                                        <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                                            {i + 1}. {q.text}
                                            {q.is_required && <span className="text-red-500">*</span>}
                                        </label>

                                        {/* free_text */}
                                        {q.answer_type === "free_text" && (
                                            <textarea rows={2} value={ans.answer_text ?? ""}
                                                onChange={e => setAnswer(q.id, { answer_text: e.target.value })}
                                                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                                                placeholder="Type your answer…" />
                                        )}

                                        {/* yes_no */}
                                        {q.answer_type === "yes_no" && (
                                            <div className="flex items-center gap-3">
                                                {["Yes", "No"].map(opt => (
                                                    <button key={opt} type="button"
                                                        onClick={() => setAnswer(q.id, { answer_text: opt })}
                                                        className={cn("px-5 py-2 rounded-xl border text-sm font-medium transition-all",
                                                            ans.answer_text === opt
                                                                ? "bg-foreground text-white border-foreground"
                                                                : "bg-background text-muted-foreground border-input hover:border-foreground/40")}>
                                                        {opt}
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {/* scale */}
                                        {q.answer_type === "scale" && (
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1 flex-wrap">
                                                    {Array.from({ length: (q.scale_max ?? 10) - (q.scale_min ?? 0) + 1 }).map((_, n) => {
                                                        const val = (q.scale_min ?? 0) + n;
                                                        return (
                                                            <button key={n} type="button"
                                                                onClick={() => setAnswer(q.id, { answer_value: val })}
                                                                className={cn("w-9 h-9 rounded-xl border text-sm font-medium transition-all",
                                                                    ans.answer_value === val
                                                                        ? "bg-foreground text-white border-foreground"
                                                                        : "bg-background text-muted-foreground border-input hover:border-foreground/40")}>
                                                                {val}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                <div className="flex justify-between text-[10px] text-muted-foreground px-0.5">
                                                    <span>{q.scale_min ?? 0} — Low</span>
                                                    <span>High — {q.scale_max ?? 10}</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* multiple_choice */}
                                        {q.answer_type === "multiple_choice" && q.options && (
                                            <div className="space-y-1.5">
                                                {q.options.map(opt => {
                                                    const selected = (ans.answer_options ?? []).includes(opt);
                                                    return (
                                                        <button key={opt} type="button"
                                                            onClick={() => {
                                                                const cur = ans.answer_options ?? [];
                                                                setAnswer(q.id, {
                                                                    answer_options: selected
                                                                        ? cur.filter(o => o !== opt)
                                                                        : [...cur, opt],
                                                                });
                                                            }}
                                                            className={cn("w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border text-sm text-left transition-all",
                                                                selected
                                                                    ? "bg-foreground/5 border-foreground/30 font-medium"
                                                                    : "bg-background border-input text-muted-foreground hover:border-foreground/30")}>
                                                            <div className={cn("w-4 h-4 rounded border shrink-0 flex items-center justify-center",
                                                                selected ? "bg-foreground border-foreground" : "border-input")}>
                                                                {selected && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                                                            </div>
                                                            {opt}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </>
                    )}
                </div>

                {/* Footer */}
                {data?.form_id && data.questions.length > 0 && (
                    <div className="px-6 py-4 border-t border-border/60 flex justify-end gap-3">
                        <Button variant="outline" className="rounded-xl" onClick={onClose} disabled={saving}>Close</Button>
                        <Button className="rounded-xl gap-2" onClick={submit} disabled={saving || saved}>
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> :
                                saved ? <CheckCircle2 className="w-4 h-4" /> : null}
                            {hasExisting ? "Update Responses" : "Submit Form"}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Attendance Actions ────────────────────────────────────────────────────────
function AttendanceActions({ session, onDone }: { session: Session; onDone: () => void }) {
    const [open, setOpen] = useState(false);
    const [marking, setMarking] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const isTerminal = ["completed", "cancelled", "no-show", "late-cancellation"].includes(session.status);
    if (isTerminal) return null;

    const OPTIONS = [
        { value: "attended", label: "Mark Completed", icon: CheckCircle2, cls: "text-emerald-600 hover:bg-emerald-50" },
        { value: "no-show", label: "Mark No-Show", icon: UserX, cls: "text-red-500   hover:bg-red-50" },
        { value: "late-cancellation", label: "Late Cancellation", icon: XCircle, cls: "text-orange-500 hover:bg-orange-50" },
    ];

    async function mark(attendance: string) {
        setMarking(attendance); setError(null);
        try {
            await sessionsApi.markAttendance(session.id, attendance);
            setOpen(false);
            onDone();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed");
        } finally { setMarking(null); }
    }

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(v => !v)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-border bg-muted/30 text-xs font-medium hover:bg-muted transition-colors"
            >
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />Mark Attendance</span>
                <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
            </button>
            {open && (
                <div className="absolute bottom-full mb-1 left-0 right-0 bg-white rounded-xl border border-border shadow-lg overflow-hidden z-10">
                    {error && (
                        <p className="px-3 py-2 text-[11px] text-red-500 border-b border-border">{error}</p>
                    )}
                    {OPTIONS.map(o => {
                        const Icon = o.icon;
                        const busy = marking === o.value;
                        return (
                            <button key={o.value} onClick={() => mark(o.value)} disabled={!!marking}
                                className={cn("w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium transition-colors text-left",
                                    o.cls, !!marking && "opacity-60 cursor-wait")}>
                                {busy
                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    : <Icon className="w-3.5 h-3.5" />}
                                {o.label}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ── Session Detail Panel ───────────────────────────────────────────────────────
function SessionDetail({ session, onClose, onFormOpen, onAttended }: {
    session: Session; onClose: () => void; onFormOpen: () => void; onAttended: () => void;
}) {
    const cfg = STATUS_CONFIG[session.status] ?? STATUS_CONFIG.pending;
    const dt = new Date(session.scheduled_at);

    return (
        <div className="w-[280px] shrink-0 bg-white rounded-2xl border border-border/50 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
                <h2 className="font-semibold text-sm">Session Details</h2>
                <button onClick={onClose} className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
                    <X className="w-3 h-3" />
                </button>
            </div>

            <div className="p-5 space-y-4 flex-1 overflow-y-auto">
                {/* Status */}
                <Badge variant="outline" className={cn("text-[10px] rounded-full px-2.5 font-medium", cfg.cls)}>
                    {cfg.label}
                </Badge>

                {/* Date/time */}
                <div className="bg-muted/50 rounded-xl p-3 space-y-1">
                    <p className="font-semibold text-sm">{dt.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "long", year: "numeric" })}</p>
                    <p className="text-xs text-muted-foreground font-mono">{dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })} · {session.duration_minutes} min</p>
                </div>

                {/* Info rows */}
                {[
                    { icon: User, label: "Patient", val: `${session.patient_name} (${session.patient_code})` },
                    { icon: Stethoscope, label: "Doctor", val: `Dr. ${session.doctor_name}` },
                    { icon: FileText, label: "Session Type", val: session.session_type_name },
                    { icon: Clock, label: "Duration", val: `${session.duration_minutes} min` },
                ].map(({ icon: Icon, label, val }) => (
                    <div key={label} className="flex items-start gap-2.5">
                        <Icon className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="min-w-0">
                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
                            <p className="text-xs font-medium truncate">{val}</p>
                        </div>
                    </div>
                ))}

                {session.pre_session_notes && (
                    <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Notes</p>
                        <p className="text-xs text-muted-foreground bg-muted/50 rounded-xl p-3 leading-relaxed">{session.pre_session_notes}</p>
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-border/60 space-y-2">
                <AttendanceActions session={session} onDone={onAttended} />
                <Button size="sm" className="w-full rounded-xl gap-2" onClick={onFormOpen}>
                    <ClipboardList className="w-3.5 h-3.5" />
                    {session.status === "completed" ? "View Form Responses" : "Fill Session Form"}
                </Button>
            </div>
        </div>
    );
}

// ── Main Sessions Page ─────────────────────────────────────────────────────────
export default function SessionsPage() {
    const { sessions, total, loading, filter, page, setFilter, setPage, refresh } = useSessions();
    const [search, setSearch] = useState("");
    const [scheduleOpen, setScheduleOpen] = useState(false);
    const [selected, setSelected] = useState<Session | null>(null);
    const [formSession, setFormSession] = useState<Session | null>(null);
    const [activeOpen, setActiveOpen] = useState(true);
    const [completedOpen, setCompletedOpen] = useState(true);
    const LIMIT = 25;

    // After attendance is marked, refresh and update selected panel
    function handleAttended() {
        refresh();
        setSelected(null);
    }

    const filtered = sessions.filter(s =>
        !search ||
        s.patient_name.toLowerCase().includes(search.toLowerCase()) ||
        s.doctor_name.toLowerCase().includes(search.toLowerCase()) ||
        s.session_type_name.toLowerCase().includes(search.toLowerCase())
    );

    // ── Split into two groups ──────────────────────────────────────────────────
    const TERMINAL = new Set(["completed", "cancelled", "no-show", "late-cancellation"]);
    const activeSessions   = filtered.filter(s => !TERMINAL.has(s.status));
    const terminalSessions = filtered.filter(s => TERMINAL.has(s.status));

    // ── Shared table row renderer ──────────────────────────────────────────────
    function SessionRow({ s }: { s: Session }) {
        const cfg = STATUS_CONFIG[s.status] ?? STATUS_CONFIG.pending;
        const dt = new Date(s.scheduled_at);
        const isSelected = selected?.id === s.id;
        return (
            <tr
                onClick={() => setSelected(isSelected ? null : s)}
                className={cn("border-b border-border/60 cursor-pointer transition-colors hover:bg-muted/30",
                    isSelected && "bg-muted/50")}
            >
                <td className="px-5 py-3.5 font-medium whitespace-nowrap">
                    {s.patient_name}
                    <span className="ml-1.5 text-[10px] text-muted-foreground font-mono">{s.patient_code}</span>
                </td>
                <td className="px-5 py-3.5 text-muted-foreground whitespace-nowrap">Dr. {s.doctor_name}</td>
                <td className="px-5 py-3.5 text-muted-foreground whitespace-nowrap">{s.session_type_name}</td>
                <td className="px-5 py-3.5 whitespace-nowrap">
                    <p className="text-xs font-medium">{dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">{dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}</p>
                </td>
                <td className="px-5 py-3.5 text-muted-foreground text-xs">{s.duration_minutes} min</td>
                <td className="px-5 py-3.5">
                    <Badge variant="outline" className={cn("text-[10px] rounded-full px-2.5 font-medium whitespace-nowrap", cfg.cls)}>{cfg.label}</Badge>
                </td>
                <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={e => { e.stopPropagation(); setFormSession(s); }}
                            className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 font-medium transition-colors"
                            title="Open session form">
                            <ClipboardList className="w-3.5 h-3.5" /> Form
                        </button>
                        {!TERMINAL.has(s.status) && (
                            <button
                                onClick={async e => { e.stopPropagation(); await sessionsApi.markAttendance(s.id, "attended"); refresh(); }}
                                className="flex items-center gap-1 text-[11px] text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                                title="Mark as completed">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Done
                            </button>
                        )}
                    </div>
                </td>
            </tr>
        );
    }

    // ── Table wrapper ──────────────────────────────────────────────────────────
    function SessionTable({
        label, accent, icon: Icon, rows, open, onToggle, emptyText,
    }: {
        label: string; accent: string; icon: React.ElementType;
        rows: Session[]; open: boolean; onToggle: () => void; emptyText: string;
    }) {
        return (
            <div className="bg-white rounded-2xl border border-border/50 overflow-hidden">
                <button
                    onClick={onToggle}
                    className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors"
                >
                    <div className="flex items-center gap-2.5">
                        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", accent)}>
                            <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-semibold text-sm">{label}</span>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full tabular-nums">
                            {rows.length}
                        </span>
                    </div>
                    <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform duration-200", open && "rotate-180")} />
                </button>

                {open && (
                    <div className="overflow-x-auto border-t border-border/60">
                        <table className="w-full text-sm min-w-[700px]">
                            <thead className="border-b border-border/60 bg-muted/30">
                                <tr>
                                    {["Patient", "Doctor", "Session Type", "Date & Time", "Duration", "Status", "Actions"].map(h => (
                                        <th key={h} className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i} className="border-b border-border/60">
                                            {Array.from({ length: 7 }).map((_, j) => <td key={j} className="px-5 py-3.5"><Skeleton className="h-4 w-full" /></td>)}
                                        </tr>
                                    ))
                                ) : rows.length === 0 ? (
                                    <tr><td colSpan={7} className="text-center py-10 text-muted-foreground text-sm">{emptyText}</td></tr>
                                ) : (
                                    rows.map(s => <SessionRow key={s.id} s={s} />)
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="flex h-full gap-4 p-5 overflow-hidden">
            {/* Main column */}
            <div className="flex flex-col flex-1 min-w-0 gap-4 overflow-y-auto">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Sessions</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">{total} total sessions</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={refresh} className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
                            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                        </button>
                        <button onClick={() => setScheduleOpen(true)} className="flex items-center gap-1.5 px-3 py-2 bg-foreground text-white rounded-xl text-xs font-medium hover:bg-foreground/90 transition-colors">
                            <CalendarDays className="w-3.5 h-3.5" /> Schedule
                        </button>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input placeholder="Search patient, doctor, type…" className="pl-9 rounded-xl bg-white" value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <div className="flex items-center gap-1 bg-white rounded-xl p-1 overflow-x-auto">
                        {FILTERS.map(f => (
                            <button key={f} onClick={() => setFilter(f)}
                                className={cn("px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap capitalize",
                                    filter === f ? "bg-foreground text-white" : "text-muted-foreground hover:text-foreground")}>
                                {f === "all" ? "All" : (STATUS_CONFIG[f]?.label ?? f)}
                            </button>
                        ))}
                    </div>
                    <span className="text-xs text-muted-foreground sm:ml-auto">{filtered.length} shown</span>
                </div>

                {/* ── Active / In-Progress sessions ── */}
                <SessionTable
                    label="Active Sessions"
                    accent="bg-amber-100 text-amber-700"
                    icon={Clock}
                    rows={activeSessions}
                    open={activeOpen}
                    onToggle={() => setActiveOpen(v => !v)}
                    emptyText={search ? "No active sessions match your search" : "No active sessions"}
                />

                {/* ── Completed / Terminal sessions ── */}
                <SessionTable
                    label="Completed & Closed"
                    accent="bg-emerald-100 text-emerald-700"
                    icon={CheckCircle2}
                    rows={terminalSessions}
                    open={completedOpen}
                    onToggle={() => setCompletedOpen(v => !v)}
                    emptyText={search ? "No completed sessions match your search" : "No completed sessions yet"}
                />

                {total > LIMIT && (
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}</span>
                        <div className="flex gap-1">
                            <button disabled={page === 1} onClick={() => setPage(page - 1)} className="px-3 py-1.5 rounded-lg border border-border disabled:opacity-40 hover:bg-muted transition-colors">Prev</button>
                            <button disabled={page * LIMIT >= total} onClick={() => setPage(page + 1)} className="px-3 py-1.5 rounded-lg border border-border disabled:opacity-40 hover:bg-muted transition-colors">Next</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Detail panel */}
            {selected && (
                <SessionDetail
                    session={selected}
                    onClose={() => setSelected(null)}
                    onFormOpen={() => { setFormSession(selected); }}
                    onAttended={handleAttended}
                />
            )}

            <NewSessionModal open={scheduleOpen} onClose={() => setScheduleOpen(false)} />

            {formSession && (
                <SessionFormModal
                    sessionId={formSession.id}
                    sessionTitle={`${formSession.patient_name} · ${formSession.session_type_name}`}
                    onClose={() => setFormSession(null)}
                />
            )}
        </div>
    );
}
