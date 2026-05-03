"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft, User, Stethoscope, Clock, MapPin, CalendarDays,
    FileText, CheckCircle2, XCircle, UserX, Loader2, AlertTriangle,
    RefreshCw, ClipboardList, Save, Paperclip,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    sessionsApi, Session, SessionFormData, SessionFormAnswer,
} from "@/lib/api";
import Link from "next/link";

// ── Helpers ───────────────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
    return <div className={cn("animate-pulse bg-gray-100 rounded-xl", className)} />;
}

const STATUS_STYLES: Record<string, string> = {
    pending:             "bg-blue-50 text-blue-700 border-blue-200",
    confirmed:           "bg-blue-50 text-blue-700 border-blue-200",
    completed:           "bg-emerald-50 text-emerald-700 border-emerald-200",
    cancelled:           "bg-gray-100 text-gray-500 border-gray-200",
    "no-show":           "bg-amber-50 text-amber-600 border-amber-200",
    "late-cancellation": "bg-orange-50 text-orange-600 border-orange-200",
};
const STATUS_LABELS: Record<string, string> = {
    pending: "Pending", confirmed: "Confirmed", completed: "Completed",
    cancelled: "Cancelled", "no-show": "No-Show", "late-cancellation": "Late Cancel",
};

// ── Drawing Pad ───────────────────────────────────────────────────────────────
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
        return value?.startsWith("data:image")
            ? <img src={value} alt="Drawing" className="w-full rounded-xl border border-gray-200" />
            : <p className="text-xs text-gray-400 italic">No drawing submitted</p>;
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
                className="w-full h-44 rounded-xl border border-gray-200 bg-white touch-none" style={{ touchAction: "none" }}
            />
            <div className="flex justify-end">
                <button type="button" onClick={() => {
                    if (!canvasRef.current) return;
                    const ctx = canvasRef.current.getContext("2d")!;
                    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                    if (onChange) onChange("");
                }} className="text-xs text-gray-400 hover:text-gray-700 underline">Clear</button>
            </div>
        </div>
    );
}

// ── Session Form ──────────────────────────────────────────────────────────────
function SessionFormPanel({ sessionId, readonly }: { sessionId: string; readonly: boolean }) {
    const [data, setData] = useState<SessionFormData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [answers, setAnswers] = useState<Record<string, SessionFormAnswer>>({});
    // Track whether answers have changed since last save (for autosave)
    const isDirtyRef = useRef(false);
    const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const load = useCallback(async () => {
        setLoading(true); setError(null);
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
            isDirtyRef.current = false;
        } catch { setError("Failed to load form."); }
        finally { setLoading(false); }
    }, [sessionId]);

    useEffect(() => { load(); }, [load]);

    // Autosave: 1.5s after last change
    useEffect(() => {
        if (!isDirtyRef.current || readonly || !data?.form_id) return;
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = setTimeout(() => { doSave(false); }, 1500);
        return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [answers]);

    function setAnswer(qid: string, patch: Partial<SessionFormAnswer>) {
        isDirtyRef.current = true;
        setAnswers(prev => ({ ...prev, [qid]: { ...prev[qid], question_id: qid, ...patch } }));
    }

    async function doSave(explicit = true) {
        if (!data?.questions?.length || saving) return;
        setSaving(true); setError(null); isDirtyRef.current = false;
        try {
            const payload = Object.values(answers).filter(a => a.question_id);
            const hasResponses = (data.responses.length ?? 0) > 0 || !explicit; // treat autosave as update if there's anything
            if (hasResponses) await sessionsApi.updateForm(sessionId, payload);
            else await sessionsApi.submitForm(sessionId, payload);
            setSaved(true); setTimeout(() => setSaved(false), 2000);
            // Refresh to get server-confirmed responses
            const d = await sessionsApi.getForm(sessionId);
            setData(d);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to save.");
            isDirtyRef.current = true; // allow retry
        }
        finally { setSaving(false); }
    }

    if (loading) return (
        <div className="space-y-4 p-1">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
        </div>
    );

    if (!data?.form_id) return (
        <div className="flex flex-col items-center gap-3 py-16 text-center text-gray-400">
            <FileText className="w-10 h-10 opacity-30" />
            <div>
                <p className="text-sm font-medium text-gray-600">No form linked</p>
                <p className="text-xs mt-1">This session type has no form attached.</p>
            </div>
        </div>
    );

    if (!data.questions.length) return (
        <p className="text-sm text-gray-400 py-10 text-center">The linked form has no questions yet.</p>
    );

    const hasExisting = data.responses.length > 0;

    // Progress calculation
    const answered = data.questions.filter(q => {
        const a = answers[q.id];
        if (!a) return false;
        if (q.answer_type === "scale") return a.answer_value != null;
        if (q.answer_type === "multiple_choice") return (a.answer_options?.length ?? 0) > 0;
        if (q.answer_type === "drawing_pad") return !!a.answer_text;
        return !!a.answer_text?.trim();
    }).length;
    const total = data.questions.length;
    const pct = Math.round((answered / total) * 100);

    return (
        <div className="space-y-5">
            {/* Progress bar */}
            {!readonly && (
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-gray-700">{answered} / {total} answered</span>
                        {saving && (
                            <span className="flex items-center gap-1 text-gray-400">
                                <Loader2 className="w-3 h-3 animate-spin" /> Saving…
                            </span>
                        )}
                        {saved && !saving && (
                            <span className="flex items-center gap-1 text-emerald-600">
                                <CheckCircle2 className="w-3 h-3" /> Saved
                            </span>
                        )}
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className={cn(
                                "h-full rounded-full transition-all duration-500",
                                pct === 100 ? "bg-emerald-500" : "bg-[#2493A2]"
                            )}
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                </div>
            )}

            {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 text-xs text-red-600">
                    <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
                </div>
            )}

            {hasExisting && readonly && (
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5 text-xs text-blue-600">
                    <CheckCircle2 className="w-4 h-4 shrink-0" /> Form has been submitted for this session.
                </div>
            )}

            {/* Questions */}
            {data.questions.map((q, i) => {
                const ans = answers[q.id] ?? { question_id: q.id };
                const isAnswered = (() => {
                    if (q.answer_type === "scale") return ans.answer_value != null;
                    if (q.answer_type === "multiple_choice") return (ans.answer_options?.length ?? 0) > 0;
                    if (q.answer_type === "drawing_pad") return !!ans.answer_text;
                    return !!ans.answer_text?.trim();
                })();

                return (
                    <div key={q.id} className={cn(
                        "rounded-2xl border p-4 space-y-3 transition-colors",
                        !readonly && isAnswered ? "border-[#2493A2]/20 bg-[#2493A2]/[0.02]" : "border-gray-100 bg-white"
                    )}>
                        <div className="flex items-start gap-2.5">
                            <span className="shrink-0 w-6 h-6 rounded-lg bg-gray-100 text-[10px] font-bold text-gray-400 flex items-center justify-center mt-0.5">
                                {i + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 leading-snug">
                                    {q.text}
                                    {q.is_required && <span className="text-red-500 ml-0.5">*</span>}
                                </p>
                                {!readonly && isAnswered && (
                                    <span className="inline-flex items-center gap-0.5 text-[10px] text-[#2493A2] font-medium mt-0.5">
                                        <CheckCircle2 className="w-2.5 h-2.5" /> Answered
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Free text */}
                        {q.answer_type === "free_text" && (
                            readonly
                                ? <div className="bg-gray-50 rounded-xl px-3 py-2.5 text-sm min-h-[40px] text-gray-800 whitespace-pre-wrap">
                                    {ans.answer_text || <span className="text-gray-400 italic">No answer</span>}
                                  </div>
                                : <textarea rows={3} value={ans.answer_text ?? ""}
                                    onChange={e => setAnswer(q.id, { answer_text: e.target.value })}
                                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm resize-none outline-none focus:ring-2 focus:ring-[#2493A2]/30 focus:border-[#2493A2] transition-colors"
                                    placeholder="Type answer…" />
                        )}

                        {/* Yes / No */}
                        {q.answer_type === "yes_no" && (
                            readonly
                                ? <div className="bg-gray-50 rounded-xl px-3 py-2.5 text-sm text-gray-800">
                                    {ans.answer_text || <span className="text-gray-400 italic">No answer</span>}
                                  </div>
                                : <div className="flex gap-3">
                                    {["Yes", "No"].map(opt => (
                                        <button key={opt} type="button" onClick={() => setAnswer(q.id, { answer_text: opt })}
                                            className={cn(
                                                "px-6 py-2.5 rounded-xl border text-sm font-semibold transition-all",
                                                ans.answer_text === opt
                                                    ? opt === "Yes"
                                                        ? "bg-emerald-500 text-white border-emerald-500"
                                                        : "bg-red-500 text-white border-red-500"
                                                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                                            )}>
                                            {opt}
                                        </button>
                                    ))}
                                  </div>
                        )}

                        {/* Scale */}
                        {q.answer_type === "scale" && (
                            readonly
                                ? <div className="bg-gray-50 rounded-xl px-3 py-2.5 text-sm text-gray-800">
                                    {ans.answer_value != null
                                        ? <><span className="font-bold text-xl text-gray-900">{ans.answer_value}</span><span className="text-gray-400 text-xs ml-1.5">/ {q.scale_max ?? 10}</span></>
                                        : <span className="text-gray-400 italic">No answer</span>}
                                  </div>
                                : <div className="space-y-2">
                                    <div className="flex flex-wrap gap-1.5">
                                        {Array.from({ length: (q.scale_max ?? 10) - (q.scale_min ?? 0) + 1 }).map((_, n) => {
                                            const val = (q.scale_min ?? 0) + n;
                                            const sel = ans.answer_value === val;
                                            return (
                                                <button key={n} type="button" onClick={() => setAnswer(q.id, { answer_value: val })}
                                                    className={cn(
                                                        "w-10 h-10 rounded-xl border text-sm font-bold transition-all",
                                                        sel ? "bg-[#2493A2] text-white border-[#2493A2] scale-110 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-[#2493A2]/50"
                                                    )}>
                                                    {val}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="flex justify-between text-[10px] text-gray-400 px-0.5">
                                        <span>{q.scale_min ?? 0} — Low</span><span>High — {q.scale_max ?? 10}</span>
                                    </div>
                                  </div>
                        )}

                        {/* Multiple choice */}
                        {q.answer_type === "multiple_choice" && q.options && (
                            readonly
                                ? <div className="flex flex-wrap gap-2">
                                    {q.options.map(opt => (
                                        <span key={opt} className={cn(
                                            "px-3 py-1 rounded-xl border text-xs font-medium",
                                            (ans.answer_options ?? []).includes(opt)
                                                ? "bg-[#2493A2]/10 border-[#2493A2]/30 text-[#2493A2]"
                                                : "bg-gray-50 border-gray-200 text-gray-400")}>
                                            {opt}
                                        </span>
                                    ))}
                                  </div>
                                : <div className="space-y-2">
                                    {q.options.map(opt => {
                                        const sel = (ans.answer_options ?? []).includes(opt);
                                        return (
                                            <button key={opt} type="button"
                                                onClick={() => setAnswer(q.id, {
                                                    answer_options: sel
                                                        ? (ans.answer_options ?? []).filter(o => o !== opt)
                                                        : [...(ans.answer_options ?? []), opt],
                                                })}
                                                className={cn(
                                                    "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-sm text-left transition-all",
                                                    sel ? "bg-[#2493A2]/5 border-[#2493A2]/40 text-gray-900" : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                                                )}>
                                                <div className={cn(
                                                    "w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors",
                                                    sel ? "bg-[#2493A2] border-[#2493A2]" : "border-gray-300"
                                                )}>
                                                    {sel && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                                                </div>
                                                {opt}
                                            </button>
                                        );
                                    })}
                                  </div>
                        )}

                        {/* Drawing pad */}
                        {q.answer_type === "drawing_pad" && (
                            <DrawingPad
                                value={ans.answer_text ?? ""}
                                onChange={readonly ? undefined : v => setAnswer(q.id, { answer_text: v })}
                                readonly={readonly}
                            />
                        )}

                        {/* File upload — not supported in portal, show note */}
                        {q.answer_type === "file_upload" && (
                            readonly
                                ? <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5 text-sm text-gray-500">
                                    <Paperclip className="w-3.5 h-3.5 shrink-0" />
                                    {ans.answer_text
                                        ? <a href={ans.answer_text} target="_blank" rel="noopener noreferrer" className="text-[#2493A2] underline text-xs truncate">{ans.answer_text}</a>
                                        : <span className="text-gray-400 italic text-xs">No file submitted</span>}
                                  </div>
                                : <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 text-xs text-amber-600">
                                    <Paperclip className="w-3.5 h-3.5 shrink-0" />
                                    File uploads are handled from the admin / front-desk portal.
                                  </div>
                        )}
                    </div>
                );
            })}

            {/* Save button — only shown when not autosaving and there are changes, or as explicit submit */}
            {!readonly && (
                <div className="sticky bottom-0 pt-2 pb-1 bg-white/90 backdrop-blur-sm border-t border-gray-100 -mx-5 px-5 mt-2">
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-[11px] text-gray-400">
                            {answered === total && total > 0 ? "All questions answered ✓" : `${total - answered} question${total - answered !== 1 ? "s" : ""} remaining`}
                        </p>
                        <button
                            onClick={() => doSave(true)}
                            disabled={saving || saved}
                            className={cn(
                                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all",
                                saved
                                    ? "bg-emerald-500 text-white"
                                    : "bg-[#2493A2] text-white hover:bg-[#1d7a87] disabled:opacity-60"
                            )}>
                            {saving
                                ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</>
                                : saved
                                ? <><CheckCircle2 className="w-4 h-4" />Saved!</>
                                : <><Save className="w-4 h-4" />{hasExisting ? "Update" : "Submit"}</>}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Attendance actions ────────────────────────────────────────────────────────
function AttendanceActions({ session, onDone }: { session: Session; onDone: () => void }) {
    const [marking, setMarking] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const TERMINAL = new Set(["completed", "cancelled", "no-show", "late-cancellation"]);
    if (TERMINAL.has(session.status)) return null;

    const OPTIONS = [
        { value: "attended",          label: "Mark Completed",    icon: CheckCircle2, cls: "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100" },
        { value: "no-show",           label: "No-Show",           icon: UserX,        cls: "bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100" },
        { value: "late-cancellation", label: "Late Cancellation", icon: XCircle,      cls: "bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-100" },
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
    const [tab, setTab] = useState<"form">("form");

    const load = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try { const s = await sessionsApi.get(id); setSession(s); }
        catch { setError("Session not found."); }
        finally { setLoading(false); }
    }, [id]);

    useEffect(() => { load(); }, [load]);

    if (loading) return (
        <div className="p-5 space-y-4 max-w-4xl mx-auto">
            <Skeleton className="h-8 w-48" />
            <div className="flex gap-4"><Skeleton className="w-64 h-64 rounded-2xl" /><Skeleton className="flex-1 h-64 rounded-2xl" /></div>
        </div>
    );

    if (error || !session) return (
        <div className="flex flex-col items-center justify-center h-full gap-3 pt-24 text-gray-400">
            <AlertTriangle className="w-8 h-8" />
            <p className="text-sm">{error ?? "Session not found."}</p>
            <button onClick={() => router.back()} className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors">Go back</button>
        </div>
    );

    const st = STATUS_STYLES[session.status] ?? STATUS_STYLES.pending;
    const sl = STATUS_LABELS[session.status] ?? session.status;
    const dt = new Date(session.scheduled_at);
    const TERMINAL = new Set(["completed", "cancelled", "no-show", "late-cancellation"]);
    const isTerminal = TERMINAL.has(session.status);
    // Doctors can still fill/update forms on completed sessions
    const isFormReadonly = new Set(["cancelled", "no-show", "late-cancellation"]).has(session.status);

    return (
        <div className="flex flex-col h-full overflow-hidden gap-4 p-4 md:p-5">
            {/* Header */}
            <div className="flex items-center gap-3 flex-wrap">
                <button onClick={() => router.back()}
                    className="w-8 h-8 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors shrink-0">
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="text-xl font-bold text-gray-900">{session.patient_name}</h1>
                        <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", st)}>{sl}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                        {session.session_type} · {dt.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long", year: "numeric" })}
                    </p>
                </div>
                <button onClick={load} className="w-8 h-8 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors shrink-0">
                    <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                </button>
            </div>

            {/* Body */}
            <div className="flex gap-4 flex-1 min-h-0 flex-col lg:flex-row">
                {/* Left sidebar */}
                <div className="lg:w-68 shrink-0 flex flex-col gap-3" style={{ width: "272px" }}>
                    {/* Date/time */}
                    <div className="bg-white rounded-2xl p-4 border border-gray-100">
                        <div className="flex items-center gap-2 mb-2">
                            <CalendarDays className="w-4 h-4 text-gray-400" />
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Date & Time</p>
                        </div>
                        <p className="font-bold text-base text-gray-900">
                            {dt.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                        </p>
                        <p className="text-sm text-gray-500 mt-0.5 font-mono">
                            {dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })} · {session.duration_minutes} min
                        </p>
                    </div>

                    {/* Info */}
                    <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
                        {[
                            { icon: User,        label: "Patient",      value: `${session.patient_name} (${session.patient_code})`, href: `/patients/${session.patient_id}` },
                            { icon: Stethoscope, label: "Session Type", value: session.session_type, href: undefined },
                            { icon: Clock,       label: "Duration",     value: `${session.duration_minutes} min`, href: undefined },
                            { icon: MapPin,      label: "Branch",       value: session.branch_name, href: undefined },
                        ].map(({ icon: Icon, label, value, href }) => (
                            <div key={label} className="flex items-start gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                                    <Icon className="w-3.5 h-3.5 text-gray-400" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">{label}</p>
                                    {href
                                        ? <Link href={href} className="text-xs font-medium text-[#2493A2] hover:underline truncate block">{value}</Link>
                                        : <p className="text-xs font-medium text-gray-800 truncate">{value}</p>}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Notes */}
                    {session.pre_session_notes && (
                        <div className="bg-white rounded-2xl p-4 border border-gray-100">
                            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-2">Pre-Session Notes</p>
                            <p className="text-xs text-gray-600 leading-relaxed">{session.pre_session_notes}</p>
                        </div>
                    )}

                    {/* Attendance actions */}
                    {!isTerminal && (
                        <div className="bg-white rounded-2xl p-4 border border-gray-100">
                            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-3">Mark Attendance</p>
                            <AttendanceActions session={session} onDone={load} />
                        </div>
                    )}
                </div>

                {/* Right: form panel */}
                <div className="flex-1 min-w-0 min-h-0 bg-white rounded-2xl border border-gray-100 flex flex-col overflow-hidden">
                    <div className="px-5 pt-4 pb-0 border-b border-gray-100">
                        <div className="inline-flex items-center gap-1 bg-gray-100 rounded-xl p-1 mb-4">
                            <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-white shadow-sm text-gray-800">
                                <ClipboardList className="w-3 h-3" />
                                {isTerminal ? "Form Responses" : "Session Form"}
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-5">
                        <SessionFormPanel sessionId={id} readonly={isFormReadonly} />
                    </div>
                </div>
            </div>
        </div>
    );
}
