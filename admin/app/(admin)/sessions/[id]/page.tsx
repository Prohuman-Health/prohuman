"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft, User, Stethoscope, FileText, Clock, MapPin,
    ClipboardList, CheckCircle2, XCircle, UserX, Loader2,
    AlertCircle, CalendarDays, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
    sessionsApi,
    type Session, type SessionFormData, type SessionFormAnswer,
} from "@/lib/api";
import Link from "next/link";

// ── Helpers ────────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
    return <div className={cn("animate-pulse bg-muted rounded-xl", className)} />;
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
    completed:          { label: "Completed",        cls: "border-emerald-200 text-emerald-700 bg-emerald-50" },
    confirmed:          { label: "Confirmed",         cls: "border-blue-200 text-blue-700 bg-blue-50" },
    pending:            { label: "Pending",           cls: "border-amber-200 text-amber-700 bg-amber-50" },
    "no-show":          { label: "No-Show",           cls: "border-red-200 text-red-600 bg-red-50" },
    cancelled:          { label: "Cancelled",         cls: "border-muted-foreground/30 text-muted-foreground bg-muted/30" },
    "late-cancellation":{ label: "Late Cancel",       cls: "border-orange-200 text-orange-600 bg-orange-50" },
    rescheduled:        { label: "Rescheduled",       cls: "border-purple-200 text-purple-600 bg-purple-50" },
};

// ── Drawing Pad (read/write) ──────────────────────────────────────────────────
function DrawingPad({ value, onChange, readonly }: { value: string; onChange?: (v: string) => void; readonly?: boolean }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawingRef = useRef(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (!value || !value.startsWith("data:image")) return;
        const img = new Image();
        img.onload = () => {
            const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
            const dw = img.width * scale, dh = img.height * scale;
            ctx.drawImage(img, (canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh);
        };
        img.src = value;
    }, [value]);

    function pt(e: React.PointerEvent<HTMLCanvasElement>) {
        const c = canvasRef.current!;
        const r = c.getBoundingClientRect();
        return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) };
    }

    if (readonly) {
        return value && value.startsWith("data:image")
            ? <img src={value} alt="Drawing response" className="w-full rounded-xl border border-border" />
            : <p className="text-xs text-muted-foreground italic">No drawing submitted</p>;
    }

    return (
        <div className="space-y-2">
            <canvas ref={canvasRef} width={900} height={320}
                onPointerDown={e => {
                    if (!canvasRef.current) return;
                    const ctx = canvasRef.current.getContext("2d")!;
                    const p = pt(e); drawingRef.current = true;
                    canvasRef.current.setPointerCapture(e.pointerId);
                    ctx.strokeStyle = "#111827"; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.lineJoin = "round";
                    ctx.beginPath(); ctx.moveTo(p.x, p.y);
                }}
                onPointerMove={e => {
                    if (!drawingRef.current || !canvasRef.current) return;
                    const ctx = canvasRef.current.getContext("2d")!;
                    const p = pt(e); ctx.lineTo(p.x, p.y); ctx.stroke();
                }}
                onPointerUp={() => {
                    drawingRef.current = false;
                    if (canvasRef.current && onChange) onChange(canvasRef.current.toDataURL("image/png"));
                }}
                onPointerCancel={() => { drawingRef.current = false; }}
                className="w-full h-44 rounded-xl border border-input bg-white touch-none" style={{ touchAction: "none" }}
            />
            <div className="flex items-center justify-between">
                <p className="text-[11px] text-muted-foreground">Use finger or stylus to draw.</p>
                <button type="button" onClick={() => {
                    if (!canvasRef.current) return;
                    const ctx = canvasRef.current.getContext("2d")!;
                    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                    if (onChange) onChange("");
                }} className="text-xs text-muted-foreground hover:text-foreground underline">Clear</button>
            </div>
        </div>
    );
}

// ── Session Form Panel ────────────────────────────────────────────────────────
function SessionFormPanel({ sessionId, readonly }: { sessionId: string; readonly: boolean }) {
    const [data, setData] = useState<SessionFormData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [answers, setAnswers] = useState<Record<string, SessionFormAnswer>>({});

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const d = await sessionsApi.getForm(sessionId);
            setData(d);
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
        } catch {
            setError("Failed to load form.");
        } finally {
            setLoading(false);
        }
    }, [sessionId]);

    useEffect(() => { load(); }, [load]);

    function setAnswer(qid: string, patch: Partial<SessionFormAnswer>) {
        setAnswers(prev => ({ ...prev, [qid]: { ...prev[qid], question_id: qid, ...patch } }));
    }

    async function submit() {
        if (!data?.questions?.length) return;
        setSaving(true); setError(null);
        try {
            const payload = Object.values(answers).filter(a => a.question_id);
            if ((data.responses.length ?? 0) > 0) await sessionsApi.updateForm(sessionId, payload);
            else await sessionsApi.submitForm(sessionId, payload);
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
            await load();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to save.");
        } finally { setSaving(false); }
    }

    if (loading) return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>;

    if (!data?.form_id) return (
        <div className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
            <FileText className="w-10 h-10 opacity-30" />
            <div>
                <p className="font-semibold text-sm text-foreground">No form linked</p>
                <p className="text-xs mt-1">This session type has no form attached.<br />Go to <strong>Session Types</strong> to link a form.</p>
            </div>
        </div>
    );

    if (data.questions.length === 0) return <p className="text-sm text-muted-foreground py-8 text-center">The linked form has no questions yet.</p>;

    const hasExisting = data.responses.length > 0;

    return (
        <div className="space-y-5">
            {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-xs text-red-700">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
            )}
            {saved && (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5 text-xs text-emerald-700">
                    <CheckCircle2 className="w-4 h-4 shrink-0" /> Saved successfully!
                </div>
            )}
            {hasExisting && !readonly && (
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5 text-xs text-blue-700">
                    <CheckCircle2 className="w-4 h-4 shrink-0" /> Responses already submitted. You can update them below.
                </div>
            )}

            {data.questions.map((q, i) => {
                const ans = answers[q.id] ?? { question_id: q.id };
                return (
                    <div key={q.id} className="space-y-2">
                        <label className="text-sm font-semibold flex items-center gap-1">
                            <span className="text-muted-foreground font-normal">{i + 1}.</span> {q.text}
                            {q.is_required && <span className="text-red-500">*</span>}
                        </label>

                        {/* free_text */}
                        {q.answer_type === "free_text" && (
                            readonly
                                ? <div className="bg-muted/40 rounded-xl px-3 py-2.5 text-sm min-h-[40px]">{ans.answer_text || <span className="text-muted-foreground italic">No answer</span>}</div>
                                : <textarea rows={2} value={ans.answer_text ?? ""} onChange={e => setAnswer(q.id, { answer_text: e.target.value })}
                                    className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                                    placeholder="Type answer…" />
                        )}

                        {/* drawing_pad */}
                        {q.answer_type === "drawing_pad" && (
                            <DrawingPad value={ans.answer_text ?? ""} onChange={readonly ? undefined : v => setAnswer(q.id, { answer_text: v })} readonly={readonly} />
                        )}

                        {/* yes_no */}
                        {q.answer_type === "yes_no" && (
                            readonly
                                ? <div className="bg-muted/40 rounded-xl px-3 py-2.5 text-sm">{ans.answer_text || <span className="text-muted-foreground italic">No answer</span>}</div>
                                : <div className="flex items-center gap-3">
                                    {["Yes", "No"].map(opt => (
                                        <button key={opt} type="button" onClick={() => setAnswer(q.id, { answer_text: opt })}
                                            className={cn("px-5 py-2 rounded-xl border text-sm font-medium transition-all",
                                                ans.answer_text === opt ? "bg-foreground text-white border-foreground" : "bg-background text-muted-foreground border-input hover:border-foreground/40")}>
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                        )}

                        {/* scale */}
                        {q.answer_type === "scale" && (
                            readonly
                                ? <div className="bg-muted/40 rounded-xl px-3 py-2.5 text-sm">
                                    {ans.answer_value != null ? <span className="font-bold text-lg">{ans.answer_value}</span> : <span className="text-muted-foreground italic">No answer</span>}
                                    {ans.answer_value != null && <span className="text-muted-foreground text-xs ml-1">/ {q.scale_max ?? 10}</span>}
                                  </div>
                                : <div className="space-y-1">
                                    <div className="flex items-center gap-1 flex-wrap">
                                        {Array.from({ length: (q.scale_max ?? 10) - (q.scale_min ?? 0) + 1 }).map((_, n) => {
                                            const val = (q.scale_min ?? 0) + n;
                                            return (
                                                <button key={n} type="button" onClick={() => setAnswer(q.id, { answer_value: val })}
                                                    className={cn("w-9 h-9 rounded-xl border text-sm font-medium transition-all",
                                                        ans.answer_value === val ? "bg-foreground text-white border-foreground" : "bg-background text-muted-foreground border-input hover:border-foreground/40")}>
                                                    {val}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="flex justify-between text-[10px] text-muted-foreground px-0.5">
                                        <span>{q.scale_min ?? 0} — Low</span><span>High — {q.scale_max ?? 10}</span>
                                    </div>
                                  </div>
                        )}

                        {/* multiple_choice */}
                        {q.answer_type === "multiple_choice" && q.options && (
                            readonly
                                ? <div className="flex flex-wrap gap-2">
                                    {q.options.map(opt => (
                                        <span key={opt} className={cn("px-3 py-1 rounded-xl border text-xs font-medium",
                                            (ans.answer_options ?? []).includes(opt)
                                                ? "bg-foreground/5 border-foreground/30 text-foreground"
                                                : "bg-muted/30 border-border text-muted-foreground")}>
                                            {opt}
                                        </span>
                                    ))}
                                  </div>
                                : <div className="space-y-1.5">
                                    {q.options.map(opt => {
                                        const sel = (ans.answer_options ?? []).includes(opt);
                                        return (
                                            <button key={opt} type="button"
                                                onClick={() => setAnswer(q.id, { answer_options: sel ? (ans.answer_options ?? []).filter(o => o !== opt) : [...(ans.answer_options ?? []), opt] })}
                                                className={cn("w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border text-sm text-left transition-all",
                                                    sel ? "bg-foreground/5 border-foreground/30 font-medium" : "bg-background border-input text-muted-foreground hover:border-foreground/30")}>
                                                <div className={cn("w-4 h-4 rounded border shrink-0 flex items-center justify-center", sel ? "bg-foreground border-foreground" : "border-input")}>
                                                    {sel && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
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

            {!readonly && (
                <div className="pt-2 flex justify-end">
                    <Button className="rounded-xl gap-2" onClick={submit} disabled={saving || saved}>
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : null}
                        {hasExisting ? "Update Responses" : "Submit Form"}
                    </Button>
                </div>
            )}
        </div>
    );
}

// ── Attendance Actions ────────────────────────────────────────────────────────
function AttendanceActions({ session, onDone }: { session: Session; onDone: () => void }) {
    const [marking, setMarking] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const TERMINAL = new Set(["completed", "cancelled", "no-show", "late-cancellation"]);
    if (TERMINAL.has(session.status)) return null;

    const OPTIONS = [
        { value: "attended",          label: "Mark Completed",     icon: CheckCircle2, cls: "border-emerald-200 text-emerald-700 hover:bg-emerald-50" },
        { value: "no-show",           label: "Mark No-Show",       icon: UserX,        cls: "border-red-200 text-red-500 hover:bg-red-50" },
        { value: "late-cancellation", label: "Late Cancellation",  icon: XCircle,      cls: "border-orange-200 text-orange-500 hover:bg-orange-50" },
    ];

    async function mark(attendance: string) {
        setMarking(attendance); setError(null);
        try { await sessionsApi.markAttendance(session.id, attendance); onDone(); }
        catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
        finally { setMarking(null); }
    }

    return (
        <div className="space-y-2">
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex flex-wrap gap-2">
                {OPTIONS.map(o => {
                    const Icon = o.icon;
                    const busy = marking === o.value;
                    return (
                        <button key={o.value} onClick={() => mark(o.value)} disabled={!!marking}
                            className={cn("flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-colors", o.cls, !!marking && "opacity-60 cursor-wait")}>
                            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
                            {o.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function SessionDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();

    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tab, setTab] = useState<"details" | "form">("details");

    const load = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const s = await sessionsApi.get(id);
            setSession(s);
        } catch {
            setError("Session not found.");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { load(); }, [load]);

    if (loading) return (
        <div className="p-5 space-y-4">
            <div className="flex items-center gap-3"><Skeleton className="w-8 h-8 rounded-xl" /><Skeleton className="w-56 h-6" /></div>
            <div className="flex gap-4"><Skeleton className="w-72 h-64 rounded-2xl" /><Skeleton className="flex-1 h-64 rounded-2xl" /></div>
        </div>
    );

    if (error || !session) return (
        <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <AlertCircle className="w-8 h-8" />
            <p className="text-sm">{error ?? "Session not found."}</p>
            <Button size="sm" variant="outline" onClick={() => router.back()}>Go back</Button>
        </div>
    );

    const cfg = STATUS_CONFIG[session.status] ?? STATUS_CONFIG.pending;
    const dt = new Date(session.scheduled_at);
    const TERMINAL = new Set(["completed", "cancelled", "no-show", "late-cancellation"]);
    const isTerminal = TERMINAL.has(session.status);

    return (
        <div className="flex flex-col h-full overflow-hidden gap-4 p-4 md:p-5">
            {/* Header */}
            <div className="flex items-center gap-3 flex-wrap">
                <button onClick={() => router.back()}
                    className="w-8 h-8 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors shrink-0">
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="text-xl font-bold tracking-tight">{session.patient_name}</h1>
                        <Badge variant="outline" className={cn("text-[10px] rounded-full px-2.5 font-medium", cfg.cls)}>{cfg.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{session.session_type_name} · {dt.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long", year: "numeric" })}</p>
                </div>
                <button onClick={load} className="w-8 h-8 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors shrink-0">
                    <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                </button>
            </div>

            {/* Body */}
            <div className="flex gap-4 flex-1 min-h-0 flex-col lg:flex-row">
                {/* Left: info sidebar */}
                <div className="lg:w-72 shrink-0 flex flex-col gap-3">
                    {/* Date card */}
                    <div className="bg-white rounded-2xl p-4 border border-border/50">
                        <div className="flex items-center gap-2 mb-3">
                            <CalendarDays className="w-4 h-4 text-muted-foreground" />
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date & Time</p>
                        </div>
                        <p className="font-bold text-base">{dt.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
                        <p className="text-sm text-muted-foreground mt-0.5 font-mono">{dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })} · {session.duration_minutes} min</p>
                    </div>

                    {/* Info card */}
                    <div className="bg-white rounded-2xl p-4 border border-border/50 space-y-3.5">
                        {[
                            { icon: User, label: "Patient", value: `${session.patient_name} (${session.patient_code})`, href: `/patients/${session.patient_id}` },
                            { icon: Stethoscope, label: "Doctor", value: `Dr. ${session.doctor_name}`, href: undefined },
                            { icon: FileText, label: "Session Type", value: session.session_type_name, href: undefined },
                            { icon: Clock, label: "Duration", value: `${session.duration_minutes} min`, href: undefined },
                            { icon: MapPin, label: "Branch", value: session.branch_name, href: undefined },
                        ].map(({ icon: Icon, label, value, href }) => (
                            <div key={label} className="flex items-start gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">{label}</p>
                                    {href
                                        ? <Link href={href} className="text-xs font-medium text-[#2493A2] hover:underline truncate block">{value}</Link>
                                        : <p className="text-xs font-medium truncate">{value}</p>}
                                </div>
                            </div>
                        ))}
                        {session.assisting_doctor_name && (
                            <div className="flex items-start gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                    <Stethoscope className="w-3.5 h-3.5 text-muted-foreground" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Assisting Doctor</p>
                                    <p className="text-xs font-medium">Dr. {session.assisting_doctor_name}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Notes card */}
                    {session.pre_session_notes && (
                        <div className="bg-white rounded-2xl p-4 border border-border/50">
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Pre-Session Notes</p>
                            <p className="text-xs text-muted-foreground leading-relaxed">{session.pre_session_notes}</p>
                        </div>
                    )}

                    {/* Attendance actions */}
                    {!isTerminal && (
                        <div className="bg-white rounded-2xl p-4 border border-border/50">
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Mark Attendance</p>
                            <AttendanceActions session={session} onDone={load} />
                        </div>
                    )}
                </div>

                {/* Right: tabs — form */}
                <div className="flex-1 min-w-0 min-h-0 bg-white rounded-2xl border border-border/50 flex flex-col overflow-hidden">
                    <div className="px-4 pt-4 pb-0 border-b border-border/60">
                        <div className="inline-flex items-center gap-1 bg-muted rounded-xl p-1 mb-4">
                            {([
                                ["form", <ClipboardList key="f" className="w-3 h-3" />, isTerminal ? "Form Responses" : "Session Form"],
                            ] as const).map(([t, icon, label]) => (
                                <button key={t} onClick={() => setTab(t)}
                                    className={cn("flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                                        tab === t ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
                                    {icon} {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5">
                        {tab === "form" && (
                            <SessionFormPanel sessionId={id} readonly={isTerminal} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
