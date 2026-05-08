"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft, User, Stethoscope, FileText, Clock, MapPin,
    CalendarDays, CheckCircle2, XCircle, UserX, Loader2,
    AlertCircle, RefreshCw, ClipboardList, Paperclip, Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
    sessionsApi,
    type Session, type SessionFormData, type SessionFormAnswer,
} from "@/lib/api";
import Link from "next/link";

// ── Helpers ───────────────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
    return <div className={cn("animate-pulse bg-muted rounded-xl", className)} />;
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
    completed:           { label: "Completed",   cls: "border-emerald-200 text-emerald-700 bg-emerald-50" },
    confirmed:           { label: "Confirmed",   cls: "border-blue-200 text-blue-700 bg-blue-50" },
    pending:             { label: "Pending",     cls: "border-amber-200 text-amber-700 bg-amber-50" },
    "no-show":           { label: "No-Show",     cls: "border-red-200 text-red-600 bg-red-50" },
    cancelled:           { label: "Cancelled",   cls: "border-muted-foreground/30 text-muted-foreground bg-muted/30" },
    "late-cancellation": { label: "Late Cancel", cls: "border-orange-200 text-orange-600 bg-orange-50" },
    rescheduled:         { label: "Rescheduled", cls: "border-purple-200 text-purple-600 bg-purple-50" },
};

// ── Body Map Pad ──────────────────────────────────────────────────────────────
const BODY_MAP_COLORS_FD = [{hex:"#ef4444",label:"Pain"},{hex:"#f97316",label:"Tension"},{hex:"#3b82f6",label:"Swelling"},{hex:"#22c55e",label:"Other"},{hex:"#111827",label:"Note"}];
function BodyMapPad({ value, onChange, readonly }: { value: string; onChange?: (v: string) => void; readonly?: boolean }) {
    const bgRef = useRef<HTMLCanvasElement>(null);
    const drawRef = useRef<HTMLCanvasElement>(null);
    const drawing = useRef(false);
    const [color, setColor] = useState("#ef4444");
    const [lw, setLw] = useState(4);
    const [tool, setTool] = useState<"pen"|"eraser">("pen");
    const bgUrl = useRef("/marker.jpg");
    const W = 900, H = 360;
    function loadBg(url: string) {
        const bg = bgRef.current; if (!bg) return;
        const ctx = bg.getContext("2d")!; ctx.fillStyle="#fff"; ctx.fillRect(0,0,W,H);
        const img = new Image(); img.onload=()=>{const s=Math.min(W/img.width,H/img.height);const dw=img.width*s,dh=img.height*s;ctx.drawImage(img,(W-dw)/2,(H-dh)/2,dw,dh);}; img.src=url;
    }
    useEffect(()=>{
        if(value?.startsWith("data:image")){const bg=bgRef.current;if(!bg)return;const ctx=bg.getContext("2d")!;const img=new Image();img.onload=()=>ctx.drawImage(img,0,0,W,H);img.src=value;}
        else loadBg(bgUrl.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    },[]);
    function composite(){const off=document.createElement("canvas");off.width=W;off.height=H;const ctx=off.getContext("2d")!;if(bgRef.current)ctx.drawImage(bgRef.current,0,0);if(drawRef.current)ctx.drawImage(drawRef.current,0,0);return off.toDataURL("image/png");}
    function pt(e:React.PointerEvent<HTMLCanvasElement>){const c=drawRef.current!;const r=c.getBoundingClientRect();return{x:(e.clientX-r.left)*(W/r.width),y:(e.clientY-r.top)*(H/r.height)};}
    function clear(){const d=drawRef.current;if(d)d.getContext("2d")!.clearRect(0,0,W,H);loadBg(bgUrl.current);if(onChange)onChange("");}
    if(readonly){
        return value?.startsWith("data:image")
            ?<img src={value} alt="Body map" className="w-full rounded-xl border border-border"/>
            :<div className="relative rounded-xl border border-border overflow-hidden"><img src="/marker.jpg" alt="Body diagram" className="w-full opacity-50"/><div className="absolute inset-0 flex items-center justify-center"><p className="text-xs text-muted-foreground italic bg-white/80 px-3 py-1 rounded-lg">No markings submitted</p></div></div>;
    }
    return(
        <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap text-[11px]">
                <span className="font-semibold text-muted-foreground">Mark:</span>
                {BODY_MAP_COLORS_FD.map(({hex,label})=>(<button key={hex} title={label} onClick={()=>{setColor(hex);setTool("pen");}} className={cn("w-5 h-5 rounded-full border-2 transition-all shrink-0",color===hex&&tool==="pen"?"border-foreground scale-125":"border-white hover:border-foreground/40 shadow-sm")} style={{background:hex}}/>))}
                <select value={lw} onChange={e=>setLw(Number(e.target.value))} className="h-6 rounded-lg border border-border bg-background px-1 text-[11px]">
                    <option value={2}>Thin</option><option value={4}>Medium</option><option value={8}>Thick</option>
                </select>
                <button onClick={()=>setTool(t=>t==="eraser"?"pen":"eraser")} className={cn("px-2 h-6 rounded-lg border text-[11px] font-medium transition-colors",tool==="eraser"?"bg-foreground text-white border-foreground":"border-border text-muted-foreground hover:text-foreground")}>Eraser</button>
                <div className="flex-1"/>
                <label className="flex items-center gap-1 px-2 h-6 rounded-lg border border-border text-muted-foreground hover:text-foreground cursor-pointer">
                    <Upload className="w-3 h-3"/>Custom BG
                    <input type="file" className="hidden" accept="image/*" onChange={e=>{const f=e.target.files?.[0];if(!f)return;const url=URL.createObjectURL(f);bgUrl.current=url;loadBg(url);const d=drawRef.current;if(d)d.getContext("2d")!.clearRect(0,0,W,H);if(onChange)onChange("");e.currentTarget.value="";}}/>
                </label>
                <button onClick={clear} className="text-muted-foreground hover:text-red-500 underline">Clear</button>
            </div>
            <div className="relative w-full rounded-xl border border-input overflow-hidden bg-white" style={{aspectRatio:`${W}/${H}`}}>
                <canvas ref={bgRef} width={W} height={H} className="absolute inset-0 w-full h-full pointer-events-none"/>
                <canvas ref={drawRef} width={W} height={H} className="absolute inset-0 w-full h-full touch-none" style={{touchAction:"none"}}
                    onPointerDown={e=>{const c=drawRef.current;if(!c)return;const ctx=c.getContext("2d")!;const p=pt(e);drawing.current=true;c.setPointerCapture(e.pointerId);ctx.globalCompositeOperation=tool==="eraser"?"destination-out":"source-over";ctx.strokeStyle=color;ctx.lineWidth=tool==="eraser"?24:lw;ctx.lineCap="round";ctx.lineJoin="round";ctx.beginPath();ctx.moveTo(p.x,p.y);}}
                    onPointerMove={e=>{if(!drawing.current)return;const c=drawRef.current;if(!c)return;const ctx=c.getContext("2d")!;const p=pt(e);ctx.lineTo(p.x,p.y);ctx.stroke();}}
                    onPointerUp={()=>{drawing.current=false;if(onChange)onChange(composite());}}
                    onPointerCancel={()=>{drawing.current=false;}}
                />
            </div>
            <p className="text-[10px] text-muted-foreground">Red = Pain · Orange = Tension · Blue = Swelling · Green = Other</p>
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
    const [uploadingQid, setUploadingQid] = useState<string | null>(null);
    const [answers, setAnswers] = useState<Record<string, SessionFormAnswer>>({});

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
        } catch { setError("Failed to load form."); }
        finally { setLoading(false); }
    }, [sessionId]);

    useEffect(() => { load(); }, [load]);

    function setAnswer(qid: string, patch: Partial<SessionFormAnswer>) {
        setAnswers(prev => ({ ...prev, [qid]: { ...prev[qid], question_id: qid, ...patch } }));
    }

    async function uploadFiles(qid: string, files: FileList | null) {
        if (!files?.length) return;
        setUploadingQid(qid); setError(null);
        try {
            const urls: string[] = [];
            for (const f of Array.from(files)) {
                const r = await sessionsApi.uploadFormFile(sessionId, f);
                urls.push(r.file_url);
            }
            const cur = answers[qid]?.answer_options ?? [];
            setAnswer(qid, { answer_options: [...cur, ...urls.filter(u => !cur.includes(u))] });
        } catch (e) { setError(e instanceof Error ? e.message : "Upload failed"); }
        finally { setUploadingQid(null); }
    }

    async function submit() {
        if (!data?.questions?.length) return;
        setSaving(true); setError(null);
        try {
            const payload = Object.values(answers).filter(a => a.question_id);
            if ((data.responses.length ?? 0) > 0) await sessionsApi.updateForm(sessionId, payload);
            else await sessionsApi.submitForm(sessionId, payload);
            setSaved(true); setTimeout(() => setSaved(false), 2500);
            await load();
        } catch (e) { setError(e instanceof Error ? e.message : "Failed to save."); }
        finally { setSaving(false); }
    }

    if (loading) return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>;

    if (!data?.form_id) return (
        <div className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
            <FileText className="w-10 h-10 opacity-30" />
            <div>
                <p className="font-semibold text-sm text-foreground">No form linked</p>
                <p className="text-xs mt-1">This session type has no form attached.</p>
            </div>
        </div>
    );

    if (!data.questions.length) return <p className="text-sm text-muted-foreground py-8 text-center">No questions in this form.</p>;

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
                    <CheckCircle2 className="w-4 h-4 shrink-0" /> Responses already submitted — you can update them below.
                </div>
            )}

            {data.questions.map((q, i) => {
                const ans = answers[q.id] ?? { question_id: q.id };
                return (
                    <div key={q.id} className="space-y-1.5">
                        <label className="text-xs font-semibold flex items-center gap-1">
                            <span className="text-muted-foreground font-normal">{i + 1}.</span> {q.text}
                            {q.is_required && <span className="text-red-500">*</span>}
                        </label>

                        {q.answer_type === "free_text" && (
                            readonly
                                ? <div className="bg-muted/40 rounded-xl px-3 py-2.5 text-sm min-h-[40px]">
                                    {ans.answer_text || <span className="text-muted-foreground italic">No answer</span>}
                                  </div>
                                : <textarea rows={2} value={ans.answer_text ?? ""}
                                    onChange={e => setAnswer(q.id, { answer_text: e.target.value })}
                                    className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                                    placeholder="Type answer…" />
                        )}

                        {q.answer_type === "yes_no" && (
                            readonly
                                ? <div className="bg-muted/40 rounded-xl px-3 py-2.5 text-sm">
                                    {ans.answer_text || <span className="text-muted-foreground italic">No answer</span>}
                                  </div>
                                : <div className="flex gap-3">
                                    {["Yes", "No"].map(opt => (
                                        <button key={opt} type="button" onClick={() => setAnswer(q.id, { answer_text: opt })}
                                            className={cn("px-5 py-2 rounded-xl border text-sm font-medium transition-all",
                                                ans.answer_text === opt
                                                    ? "bg-foreground text-white border-foreground"
                                                    : "bg-background text-muted-foreground border-input hover:border-foreground/40")}>
                                            {opt}
                                        </button>
                                    ))}
                                  </div>
                        )}

                        {q.answer_type === "scale" && (
                            readonly
                                ? <div className="bg-muted/40 rounded-xl px-3 py-2.5 text-sm">
                                    {ans.answer_value != null
                                        ? <><span className="font-bold text-lg">{ans.answer_value}</span><span className="text-muted-foreground text-xs ml-1">/ {q.scale_max ?? 10}</span></>
                                        : <span className="text-muted-foreground italic">No answer</span>}
                                  </div>
                                : <div className="space-y-1">
                                    <div className="flex flex-wrap gap-1">
                                        {Array.from({ length: (q.scale_max ?? 10) - (q.scale_min ?? 0) + 1 }).map((_, n) => {
                                            const val = (q.scale_min ?? 0) + n;
                                            return (
                                                <button key={n} type="button" onClick={() => setAnswer(q.id, { answer_value: val })}
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
                                        <span>{q.scale_min ?? 0} — Low</span><span>High — {q.scale_max ?? 10}</span>
                                    </div>
                                  </div>
                        )}

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
                                                onClick={() => setAnswer(q.id, {
                                                    answer_options: sel
                                                        ? (ans.answer_options ?? []).filter(o => o !== opt)
                                                        : [...(ans.answer_options ?? []), opt],
                                                })}
                                                className={cn("w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border text-sm text-left transition-all",
                                                    sel ? "bg-foreground/5 border-foreground/30 font-medium" : "bg-background border-input text-muted-foreground hover:border-foreground/30")}>
                                                <div className={cn("w-4 h-4 rounded border shrink-0 flex items-center justify-center",
                                                    sel ? "bg-foreground border-foreground" : "border-input")}>
                                                    {sel && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                                                </div>
                                                {opt}
                                            </button>
                                        );
                                    })}
                                  </div>
                        )}

                        {q.answer_type === "file_upload" && (
                            <div className="space-y-2">
                                {!readonly && (
                                    <label className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-input hover:border-foreground/40 cursor-pointer text-sm text-muted-foreground">
                                        <Upload className="w-4 h-4" />
                                        {uploadingQid === q.id ? "Uploading…" : "Upload files"}
                                        <input type="file" className="hidden" multiple
                                            accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                                            disabled={uploadingQid === q.id}
                                            onChange={e => { uploadFiles(q.id, e.target.files); e.currentTarget.value = ""; }} />
                                    </label>
                                )}
                                {(ans.answer_options ?? []).map(url => {
                                    const name = decodeURIComponent(url.split("/").pop() ?? "file");
                                    return (
                                        <div key={url} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-input">
                                            <a href={url} target="_blank" rel="noreferrer"
                                                className="text-xs text-blue-600 hover:underline truncate flex items-center gap-1.5">
                                                <Paperclip className="w-3 h-3 shrink-0" />{name}
                                            </a>
                                            {!readonly && (
                                                <button type="button" onClick={() => setAnswer(q.id, { answer_options: (ans.answer_options ?? []).filter(u => u !== url) })}
                                                    className="text-[11px] text-red-500 hover:text-red-600 shrink-0">Remove</button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {q.answer_type === "medical_media" && (
                            <div className="space-y-2">
                                {!readonly && (
                                    <label className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-teal-300 bg-teal-50/40 hover:border-teal-400 cursor-pointer text-sm text-teal-700">
                                        <Upload className="w-4 h-4" />
                                        {uploadingQid === q.id ? "Uploading…" : "Upload X-rays, MRI scans, or movement videos"}
                                        <input type="file" className="hidden" multiple
                                            accept="image/*,video/*"
                                            disabled={uploadingQid === q.id}
                                            onChange={e => { uploadFiles(q.id, e.target.files); e.currentTarget.value = ""; }} />
                                    </label>
                                )}
                                {(ans.answer_options ?? []).map(url => {
                                    const name = decodeURIComponent(url.split("/").pop() ?? "file");
                                    const isVideo = /\.(mp4|mov|avi|webm|mkv)(\?|$)/i.test(url);
                                    const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|tiff?)(\?|$)/i.test(url);
                                    return (
                                        <div key={url} className="rounded-xl border border-teal-200 overflow-hidden">
                                            {isImage && <img src={url} alt={name} className="w-full max-h-48 object-contain bg-black/5" />}
                                            {isVideo && <video src={url} controls className="w-full max-h-48 bg-black" />}
                                            <div className="flex items-center justify-between gap-2 px-3 py-2 bg-teal-50/30">
                                                <a href={url} target="_blank" rel="noreferrer"
                                                    className="text-xs text-teal-700 hover:underline truncate">{name}</a>
                                                {!readonly && (
                                                    <button type="button" onClick={() => setAnswer(q.id, { answer_options: (ans.answer_options ?? []).filter(u => u !== url) })}
                                                        className="text-[11px] text-red-500 hover:text-red-600 shrink-0">Remove</button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {q.answer_type === "body_map" && (
                            <BodyMapPad
                                value={ans.answer_text ?? ""}
                                onChange={readonly ? undefined : v => setAnswer(q.id, { answer_text: v })}
                                readonly={readonly}
                            />
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

// ── Attendance ────────────────────────────────────────────────────────────────
function AttendanceActions({ session, onDone }: { session: Session; onDone: () => void }) {
    const [marking, setMarking] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const TERMINAL = new Set(["completed", "cancelled", "no-show", "late-cancellation"]);
    if (TERMINAL.has(session.status)) return null;

    const OPTIONS = [
        { value: "attended",          label: "Mark Completed",    icon: CheckCircle2, cls: "border-emerald-200 text-emerald-700 hover:bg-emerald-50" },
        { value: "no-show",           label: "No-Show",           icon: UserX,        cls: "border-red-200 text-red-500 hover:bg-red-50" },
        { value: "late-cancellation", label: "Late Cancellation", icon: XCircle,      cls: "border-orange-200 text-orange-500 hover:bg-orange-50" },
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
                    return (
                        <button key={o.value} onClick={() => mark(o.value)} disabled={!!marking}
                            className={cn("flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-colors",
                                o.cls, !!marking && "opacity-60 cursor-wait")}>
                            {marking === o.value ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
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

    const load = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try { const s = await sessionsApi.get(id); setSession(s); }
        catch { setError("Session not found."); }
        finally { setLoading(false); }
    }, [id]);

    useEffect(() => { load(); }, [load]);

    if (loading) return (
        <div className="p-5 space-y-4">
            <Skeleton className="h-8 w-48" />
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
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {session.session_type_name} · {dt.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long", year: "numeric" })}
                    </p>
                </div>
                <button onClick={load} className="w-8 h-8 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors shrink-0">
                    <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                </button>
            </div>

            {/* Body */}
            <div className="flex gap-4 flex-1 min-h-0 flex-col lg:flex-row">
                {/* Left sidebar */}
                <div className="lg:w-72 shrink-0 flex flex-col gap-3">
                    <div className="bg-white rounded-2xl p-4 border border-border/50">
                        <div className="flex items-center gap-2 mb-2">
                            <CalendarDays className="w-4 h-4 text-muted-foreground" />
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date & Time</p>
                        </div>
                        <p className="font-bold text-base">
                            {dt.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                        </p>
                        <p className="text-sm text-muted-foreground mt-0.5 font-mono">
                            {dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })} · {session.duration_minutes} min
                        </p>
                    </div>

                    <div className="bg-white rounded-2xl p-4 border border-border/50 space-y-3.5">
                        {[
                            { icon: User,        label: "Patient",      value: `${session.patient_name} (${session.patient_code})`, href: `/patients/${session.patient_id}` },
                            { icon: Stethoscope, label: "Doctor",       value: `Dr. ${session.doctor_name}`, href: undefined },
                            { icon: FileText,    label: "Session Type", value: session.session_type_name, href: undefined },
                            { icon: Clock,       label: "Duration",     value: `${session.duration_minutes} min`, href: undefined },
                            { icon: MapPin,      label: "Branch",       value: session.branch_name, href: undefined },
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
                    </div>

                    {session.pre_session_notes && (
                        <div className="bg-white rounded-2xl p-4 border border-border/50">
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Pre-Session Notes</p>
                            <p className="text-xs text-muted-foreground leading-relaxed">{session.pre_session_notes}</p>
                        </div>
                    )}

                    {!isTerminal && (
                        <div className="bg-white rounded-2xl p-4 border border-border/50">
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Mark Attendance</p>
                            <AttendanceActions session={session} onDone={load} />
                        </div>
                    )}
                </div>

                {/* Right: form panel */}
                <div className="flex-1 min-w-0 min-h-0 bg-white rounded-2xl border border-border/50 flex flex-col overflow-hidden">
                    <div className="px-5 pt-4 pb-0 border-b border-border/60">
                        <div className="inline-flex items-center gap-1 bg-muted rounded-xl p-1 mb-4">
                            <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-white shadow-sm text-foreground">
                                <ClipboardList className="w-3 h-3" />
                                {isTerminal ? "Form Responses" : "Session Form"}
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-5">
                        <SessionFormPanel sessionId={id} readonly={isTerminal} />
                    </div>
                </div>
            </div>
        </div>
    );
}
