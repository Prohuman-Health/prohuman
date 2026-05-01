"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft, Phone, Mail, Calendar, Hash, User, Tag,
    CalendarDays, Receipt, Activity, Stethoscope, AlertCircle,
    Pencil, Plus, X, Clock, FileText, Trash2, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
    patientsApi, patientLabelsApi,
    Patient, PatientSession, PatientInvoice, TimelineItem, PatientLabel,
} from "@/lib/api";
import { EditPatientModal } from "@/components/modals/edit-patient-modal";
import { NewSessionModal } from "@/components/modals/new-session-modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
    paid: "border-emerald-200 text-emerald-700 bg-emerald-50",
    unpaid: "border-red-200 text-red-600 bg-red-50",
    waived: "border-muted-foreground/30 text-muted-foreground bg-muted/30",
};

function PatientAvatar({ name }: { name: string }) {
    const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
    return (
        <div className="w-20 h-20 rounded-2xl bg-[#2493A2]/10 text-[#2493A2] flex items-center justify-center text-3xl font-bold shrink-0">
            {initials}
        </div>
    );
}

// ── Sessions tab ───────────────────────────────────────────────────────────────

function SessionsTab({ patientId, onSchedule }: { patientId: string; onSchedule: () => void }) {
    const [sessions, setSessions] = useState<PatientSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
        <div className="space-y-1">
            <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-muted-foreground">{sessions.length} session{sessions.length !== 1 ? "s" : ""} total</p>
                <Button size="sm" className="gap-1.5 rounded-xl text-xs h-7" onClick={onSchedule}>
                    <Plus className="w-3 h-3" /> Schedule
                </Button>
            </div>
            {sessions.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-14 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                        <CalendarDays className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div>
                        <p className="text-sm font-medium">No sessions yet</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Schedule the first session for this patient</p>
                    </div>
                    <Button size="sm" className="gap-1.5 rounded-xl text-xs mt-1" onClick={onSchedule}>
                        <Plus className="w-3 h-3" /> Schedule Session
                    </Button>
                </div>
            ) : (
                <div className="space-y-2">
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
                                        <Badge variant="outline" className={cn("text-[10px] rounded-full px-2 font-medium shrink-0", STATUS_STYLES[s.status] ?? STATUS_STYLES.pending)}>
                                            {s.status.replace(/-/g, " ")}
                                        </Badge>
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
                </div>
            )}
        </div>
    );
}

// ── Invoices tab ───────────────────────────────────────────────────────────────

function InvoicesTab({ patientId }: { patientId: string }) {
    const [invoices, setInvoices] = useState<PatientInvoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        patientsApi.invoices(patientId)
            .then(d => setInvoices(d))
            .catch(() => setError("Failed to load invoices"))
            .finally(() => setLoading(false));
    }, [patientId]);

    if (loading) return <div className="space-y-3 p-1">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>;
    if (error) return (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-3 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
    );

    const total = invoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
    const unpaid = invoices.filter(i => i.status === "unpaid").reduce((s, i) => s + Number(i.amount), 0);

    return (
        <div className="space-y-3">
            {invoices.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-xl border border-border/50 p-4">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Total Billed</p>
                        <p className="text-xl font-bold mt-1">₹{total.toLocaleString("en-IN")}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{invoices.length} invoice{invoices.length !== 1 ? "s" : ""}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-border/50 p-4">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Outstanding</p>
                        <p className={cn("text-xl font-bold mt-1", unpaid > 0 ? "text-red-600" : "text-emerald-600")}>
                            ₹{unpaid.toLocaleString("en-IN")}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{unpaid > 0 ? "pending payment" : "all clear"}</p>
                    </div>
                </div>
            )}
            {invoices.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-14 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                        <Receipt className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium">No invoices yet</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {invoices.map(inv => (
                        <div key={inv.id} className="flex items-center gap-3 bg-white rounded-xl border border-border/50 p-4 hover:border-border transition-colors">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                                <Receipt className="w-4 h-4 text-amber-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-sm font-bold">₹{Number(inv.amount).toLocaleString("en-IN")}</p>
                                    <Badge variant="outline" className={cn("text-[10px] rounded-full px-2 font-medium", STATUS_STYLES[inv.status] ?? "")}>
                                        {inv.status}
                                    </Badge>
                                </div>
                                {inv.notes && <p className="text-xs text-muted-foreground mt-0.5 truncate">{inv.notes}</p>}
                                <p className="text-[11px] text-muted-foreground mt-1 font-mono">
                                    {new Date(inv.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
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
                            {" · "}
                            <span className="capitalize">{item.type}</span>
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ── Delete confirm modal ───────────────────────────────────────────────────────

function DeleteModal({ patientName, onConfirm, onClose, deleting, error }: {
    patientName: string; onConfirm: () => void; onClose: () => void;
    deleting: boolean; error: string | null;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                        <h2 className="font-bold text-base">Delete Patient</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">This action cannot be undone</p>
                    </div>
                </div>
                <p className="text-sm text-muted-foreground">
                    Are you sure you want to permanently delete <span className="font-semibold text-foreground">{patientName}</span>?
                    All their sessions and invoices will also be removed.
                </p>
                {error && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-sm text-red-700">
                        <AlertCircle className="w-4 h-4 shrink-0" />{error}
                    </div>
                )}
                <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose} disabled={deleting}>Cancel</Button>
                    <Button variant="destructive" className="flex-1 rounded-xl gap-2" onClick={onConfirm} disabled={deleting}>
                        {deleting ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Deleting…</> : <><Trash2 className="w-4 h-4" />Delete</>}
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

const TABS = [
    { key: "sessions", label: "Sessions", icon: CalendarDays },
    { key: "invoices", label: "Invoices", icon: Receipt },
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
    const [editOpen, setEditOpen] = useState(false);
    const [scheduleOpen, setScheduleOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [labelDefs, setLabelDefs] = useState<PatientLabel[]>([]);
    const [patientLabels, setPatientLabels] = useState<PatientLabel[]>([]);
    const [assigningLabel, setAssigningLabel] = useState(false);

    const loadPatient = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const p = await patientsApi.get(patientId);
            setPatient(p);
        } catch {
            setError("Patient not found");
        } finally { setLoading(false); }
    }, [patientId]);

    const loadLabels = useCallback(async () => {
        try {
            const [defs, mine] = await Promise.all([
                patientLabelsApi.listDefinitions(),
                patientLabelsApi.getForPatient(patientId),
            ]);
            setLabelDefs(defs);
            setPatientLabels(mine);
        } catch { /* silent */ }
    }, [patientId]);

    useEffect(() => { loadPatient(); loadLabels(); }, [loadPatient, loadLabels]);

    async function assignLabel(labelId: string) {
        setAssigningLabel(true);
        try {
            await patientLabelsApi.assign(patientId, labelId);
            await loadLabels();
        } catch { /* ignore */ } finally { setAssigningLabel(false); }
    }

    async function removeLabel(labelId: string) {
        try {
            await patientLabelsApi.remove(patientId, labelId);
            await loadLabels();
        } catch { /* ignore */ }
    }

    async function handleDelete() {
        setDeleting(true); setDeleteError(null);
        try {
            await patientsApi.deactivate(patientId);
            router.push("/patients");
        } catch (e: unknown) {
            setDeleteError(e instanceof Error ? e.message : "Failed to delete patient");
        } finally { setDeleting(false); }
    }

    if (loading) return (
        <div className="p-6 max-w-5xl mx-auto space-y-5">
            <Skeleton className="h-8 w-40" />
            <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5">
                <Skeleton className="h-[420px]" />
                <Skeleton className="h-[420px]" />
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

    const unassignedLabels = labelDefs.filter(l => !patientLabels.some(pl => pl.id === l.id));
    const registeredDate = new Date(patient.created_at).toLocaleDateString("en-IN", {
        day: "2-digit", month: "long", year: "numeric",
    });

    return (
        <div className="p-5 lg:p-6 max-w-5xl mx-auto space-y-5">
            {/* Back nav */}
            <button onClick={() => router.back()}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                Back to Patients
            </button>

            {/* Main layout */}
            <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5 items-start">

                {/* ── LEFT: Profile card ─────────────────────────────────── */}
                <div className="space-y-4">

                    {/* Identity */}
                    <div className="bg-white rounded-2xl border border-border/50 p-5 space-y-4">
                        <div className="flex items-center gap-4">
                            <PatientAvatar name={patient.full_name} />
                            <div className="min-w-0">
                                <h1 className="text-lg font-bold leading-tight truncate">{patient.full_name}</h1>
                                <p className="text-xs text-muted-foreground font-mono mt-0.5">{patient.patient_code}</p>
                                <div className="flex items-center gap-1.5 mt-2">
                                    <Badge variant="outline" className={cn("text-[10px] rounded-full px-2.5 font-medium",
                                        patient.is_active ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-muted-foreground/20 text-muted-foreground")}>
                                        {patient.is_active ? "Active" : "Discharged"}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">{patient.age} yrs · {patient.gender}</span>
                                </div>
                            </div>
                        </div>

                        {/* Contact info */}
                        <div className="space-y-3 pt-1">
                            <InfoRow icon={Phone} label="Phone" value={patient.phone} />
                            <InfoRow icon={Mail} label="Email" value={patient.email ?? "Not provided"} />
                            <InfoRow icon={Hash} label="Patient Code" value={patient.patient_code} />
                            <InfoRow icon={Calendar} label="Registered" value={registeredDate} />
                            {patient.date_of_birth && (
                                <InfoRow icon={User} label="Date of Birth" value={new Date(patient.date_of_birth).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })} />
                            )}
                            {patient.reference && (
                                <InfoRow icon={Tag} label="Reference" value={patient.reference} />
                            )}
                        </div>

                        {/* Actions */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                            <Button size="sm" className="rounded-xl gap-1.5 text-xs" onClick={() => setScheduleOpen(true)}>
                                <Plus className="w-3 h-3" /> Schedule
                            </Button>
                            <Button variant="outline" size="sm" className="rounded-xl gap-1.5 text-xs" onClick={() => setEditOpen(true)}>
                                <Pencil className="w-3 h-3" /> Edit
                            </Button>
                        </div>
                        <Button variant="outline" size="sm"
                            className="w-full rounded-xl gap-1.5 text-xs border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                            onClick={() => { setDeleteOpen(true); setDeleteError(null); }}>
                            <Trash2 className="w-3 h-3" /> Delete Patient
                        </Button>
                    </div>

                    {/* Complaints */}
                    {patient.complaints && (
                        <div className="bg-white rounded-2xl border border-border/50 p-5">
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">Chief Complaints</p>
                            <p className="text-sm leading-relaxed text-muted-foreground">{patient.complaints}</p>
                        </div>
                    )}

                    {/* Labels */}
                    <div className="bg-white rounded-2xl border border-border/50 p-5">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <Tag className="w-3 h-3" /> Labels
                        </p>
                        <div className="flex flex-wrap gap-1.5 mb-3">
                            {patientLabels.length === 0 && (
                                <p className="text-xs text-muted-foreground">No labels assigned</p>
                            )}
                            {patientLabels.map(lbl => (
                                <span key={lbl.id} className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
                                    style={{ backgroundColor: lbl.color + "20", color: lbl.color, border: `1px solid ${lbl.color}40` }}>
                                    {lbl.name}
                                    <button onClick={() => removeLabel(lbl.id)} className="opacity-60 hover:opacity-100 transition-opacity ml-0.5">
                                        <X className="w-2.5 h-2.5" />
                                    </button>
                                </span>
                            ))}
                        </div>
                        {unassignedLabels.length > 0 && (
                            <Select onValueChange={v => { if (v) assignLabel(v); }} disabled={assigningLabel}>
                                <SelectTrigger className="w-full h-8 rounded-xl text-xs text-muted-foreground">
                                    <SelectValue placeholder={assigningLabel ? "Assigning…" : "+ Add label…"} />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    {unassignedLabels.map(l => <SelectItem key={l.id} value={l.id} className="rounded-lg text-xs">{l.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                </div>

                {/* ── RIGHT: Tabs ────────────────────────────────────────── */}
                <div className="bg-white rounded-2xl border border-border/50 flex flex-col overflow-hidden min-h-[500px]">
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
                        {tab === "sessions" && <SessionsTab patientId={patient.id} onSchedule={() => setScheduleOpen(true)} />}
                        {tab === "invoices" && <InvoicesTab patientId={patient.id} />}
                        {tab === "timeline" && <TimelineTab patientId={patient.id} />}
                    </div>
                </div>
            </div>

            {/* Modals */}
            <EditPatientModal
                patient={editOpen ? patient : null}
                onClose={(updated) => {
                    setEditOpen(false);
                    if (updated) setPatient(updated);
                }}
            />
            <NewSessionModal
                open={scheduleOpen}
                onClose={() => setScheduleOpen(false)}
                prefill={{ patientId: patient.id }}
            />
            {deleteOpen && (
                <DeleteModal
                    patientName={patient.full_name}
                    onConfirm={handleDelete}
                    onClose={() => setDeleteOpen(false)}
                    deleting={deleting}
                    error={deleteError}
                />
            )}
        </div>
    );
}
