"use client";

import { useState, useEffect } from "react";
import {
    X, Loader2, CalendarDays, FileText, Receipt,
    CheckCircle2, XCircle, Clock, Stethoscope, AlertCircle,
    Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { patientsApi, Patient, PatientSession, PatientInvoice, TimelineItem } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

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
    waived: "border-muted-foreground/30 text-muted-foreground",
};

function Skeleton({ className }: { className?: string }) {
    return <div className={cn("animate-pulse bg-muted rounded-xl", className)} />;
}

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
    return (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                <Icon className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">{message}</p>
        </div>
    );
}

// ── Sub-tab: Sessions ──────────────────────────────────────────────────────────
function SessionsTab({ patientId }: { patientId: string }) {
    const [sessions, setSessions] = useState<PatientSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        patientsApi.sessions(patientId)
            .then(d => setSessions(d as PatientSession[]))
            .catch(() => setError("Failed to load sessions"))
            .finally(() => setLoading(false));
    }, [patientId]);

    if (loading) return <div className="space-y-2 p-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>;
    if (error) return <div className="flex items-center gap-2 m-4 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-sm text-red-700"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>;
    if (!sessions.length) return <EmptyState icon={CalendarDays} message="No sessions recorded yet" />;

    return (
        <div className="divide-y divide-border/60">
            {sessions.map(s => {
                const dt = new Date(s.scheduled_at);
                return (
                    <div key={s.id} className="flex items-start gap-3 px-5 py-3.5">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                            <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold truncate">{s.session_type}</p>
                                <Badge variant="outline" className={cn("text-[10px] rounded-full px-2 font-medium shrink-0", STATUS_STYLES[s.status] ?? STATUS_STYLES.pending)}>
                                    {s.status.replace(/-/g, " ")}
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">Dr. {s.doctor_name} · {s.branch}</p>
                            <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                                {dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                {" "}at{" "}
                                {dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                                {" "}· {s.duration_minutes} min
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ── Sub-tab: Invoices ──────────────────────────────────────────────────────────
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

    if (loading) return <div className="space-y-2 p-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>;
    if (error) return <div className="flex items-center gap-2 m-4 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-sm text-red-700"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>;
    if (!invoices.length) return <EmptyState icon={Receipt} message="No invoices found" />;

    const total = invoices.reduce((sum, inv) => sum + Number(inv.amount), 0);

    return (
        <div>
            <div className="px-5 py-3 bg-muted/40 border-b border-border/60 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{invoices.length} invoice{invoices.length !== 1 ? "s" : ""}</span>
                <span className="text-xs font-semibold">Total: ₹{total.toLocaleString("en-IN")}</span>
            </div>
            <div className="divide-y divide-border/60">
                {invoices.map(inv => (
                    <div key={inv.id} className="flex items-center gap-3 px-5 py-3.5">
                        <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                            <Receipt className="w-3.5 h-3.5 text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold">₹{Number(inv.amount).toLocaleString("en-IN")}</p>
                                <Badge variant="outline" className={cn("text-[10px] rounded-full px-2 font-medium", STATUS_STYLES[inv.status] ?? "")}>
                                    {inv.status}
                                </Badge>
                            </div>
                            {inv.notes && <p className="text-xs text-muted-foreground mt-0.5 truncate">{inv.notes}</p>}
                            <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                                {new Date(inv.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Sub-tab: Timeline ──────────────────────────────────────────────────────────
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
        return <FileText className="w-3.5 h-3.5 text-muted-foreground" />;
    };
    const typeBg = (type: string) => {
        if (type === "session") return "bg-blue-50";
        if (type === "invoice") return "bg-amber-50";
        return "bg-muted";
    };

    if (loading) return <div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>;
    if (error) return <div className="flex items-center gap-2 m-4 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-sm text-red-700"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>;
    if (!items.length) return <EmptyState icon={Activity} message="No activity recorded yet" />;

    return (
        <div className="px-5 py-4 space-y-1">
            {items.map((item, idx) => (
                <div key={item.id + idx} className="flex items-start gap-3">
                    {/* Timeline bar */}
                    <div className="flex flex-col items-center shrink-0">
                        <div className={cn("w-7 h-7 rounded-xl flex items-center justify-center mt-0.5", typeBg(item.type))}>
                            {typeIcon(item.type)}
                        </div>
                        {idx < items.length - 1 && <div className="w-px h-4 bg-border/60 mt-0.5" />}
                    </div>
                    <div className="pb-3 min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold capitalize truncate">{item.label}</p>
                            {item.status && (
                                <Badge variant="outline" className={cn("text-[10px] rounded-full px-2 font-medium shrink-0", STATUS_STYLES[item.status] ?? "")}>
                                    {item.status.replace(/-/g, " ")}
                                </Badge>
                            )}
                            {item.amount !== undefined && (
                                <span className="text-xs font-semibold text-amber-700 shrink-0">₹{Number(item.amount).toLocaleString("en-IN")}</span>
                            )}
                        </div>
                        <p className="text-[11px] text-muted-foreground font-mono">
                            {new Date(item.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                            {" "}·{" "}
                            <span className="capitalize">{item.type}</span>
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ── Main Modal ─────────────────────────────────────────────────────────────────
const TABS = [
    { key: "sessions", label: "Sessions", icon: CalendarDays },
    { key: "invoices", label: "Invoices", icon: Receipt },
    { key: "timeline", label: "Timeline", icon: Activity },
] as const;

type TabKey = typeof TABS[number]["key"];

interface Props { patient: Patient | null; onClose: () => void; }

export function PatientHistoryModal({ patient, onClose }: Props) {
    const [tab, setTab] = useState<TabKey>("sessions");

    if (!patient) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#2493A2]/10 text-[#2493A2] flex items-center justify-center text-lg font-bold shrink-0">
                            {patient.full_name.charAt(0)}
                        </div>
                        <div>
                            <h2 className="font-bold text-base">{patient.full_name}</h2>
                            <p className="text-xs text-muted-foreground font-mono">{patient.patient_code} · {patient.age} yrs · {patient.gender}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 px-5 py-2 border-b border-border/60 bg-muted/20 shrink-0">
                    {TABS.map(({ key, label, icon: Icon }) => (
                        <button key={key} onClick={() => setTab(key)}
                            className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                                tab === key ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
                            <Icon className="w-3.5 h-3.5" />{label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {tab === "sessions" && <SessionsTab patientId={patient.id} />}
                    {tab === "invoices" && <InvoicesTab patientId={patient.id} />}
                    {tab === "timeline" && <TimelineTab patientId={patient.id} />}
                </div>
            </div>
        </div>
    );
}
