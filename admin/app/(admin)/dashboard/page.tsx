"use client";

import { useEffect, useState, useMemo } from "react";
import {
    Plus, ArrowUpRight, CalendarDays,
    Users, Stethoscope, AlertTriangle,
    RefreshCw, CheckCircle2, XCircle, Clock, FileText, FileX,
    ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { dashboard, DashboardStats, sessionsApi as sessions, Session } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { NewSessionModal } from "@/components/modals/new-session-modal";

// ── Helpers ────────────────────────────────────────────────────────────────────
function initials(name: string) {
    return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}
function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}
function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}
function formatFullDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

// ── Skeleton shimmer ───────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
    return <div className={cn("animate-pulse bg-muted rounded-xl", className)} />;
}

// ── Status badge ───────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
    pending:    "bg-blue-50 text-blue-600 border-blue-100",
    scheduled:  "bg-blue-50 text-blue-600 border-blue-100",
    completed:  "bg-emerald-50 text-emerald-600 border-emerald-100",
    cancelled:  "bg-red-50 text-red-500 border-red-100",
    no_show:    "bg-amber-50 text-amber-600 border-amber-100",
};
const STATUS_ICONS: Record<string, React.ReactNode> = {
    pending:    <Clock className="w-3 h-3" />,
    scheduled:  <Clock className="w-3 h-3" />,
    completed:  <CheckCircle2 className="w-3 h-3" />,
    cancelled:  <XCircle className="w-3 h-3" />,
    no_show:    <AlertTriangle className="w-3 h-3" />,
};

type Period = "daily" | "weekly" | "monthly";

// ── Session-type colour palette ────────────────────────────────────────────────
const TYPE_COLORS = [
    "#2493A2", "#7C3AED", "#F59E0B", "#10B981",
    "#EF4444", "#3B82F6", "#EC4899", "#6366F1",
];

export default function DashboardPage() {
    const { user } = useAuth();
    const [data, setData] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [sessionOpen, setSessionOpen] = useState(false);
    const [period, setPeriod] = useState<Period>("daily");

    // Upcoming sessions
    const [upcoming, setUpcoming] = useState<Session[]>([]);
    const [upLoading, setUpLoading] = useState(true);

    // ── Load dashboard stats ───────────────────────────────────────────────────
    const load = async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);
        setError(null);
        try {
            const res = await dashboard.stats();
            setData(res);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to load dashboard");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // ── Load upcoming sessions ─────────────────────────────────────────────────
    const loadUpcoming = async (p: Period) => {
        setUpLoading(true);
        try {
            const now = new Date();
            const from = now.toISOString();
            let to: Date;
            if (p === "daily")   { to = new Date(now); to.setDate(to.getDate() + 1); }
            else if (p === "weekly") { to = new Date(now); to.setDate(to.getDate() + 7); }
            else                 { to = new Date(now); to.setMonth(to.getMonth() + 1); }

            const res = await sessions.list({
                status: "pending",
                from,
                to: to.toISOString(),
                limit: "50",
                sort: "asc",
            });
            setUpcoming(res.sessions ?? []);
        } catch {
            setUpcoming([]);
        } finally {
            setUpLoading(false);
        }
    };

    useEffect(() => { load(); }, []);
    useEffect(() => { loadUpcoming(period); }, [period]);

    // ── Derived: patient breakdown (new vs repeat, from recent_patients proxy) ─
    // We derive a split from session_status as a proxy:
    // new patients = total_patients - (sessions with repeat patients, approximated)
    // Real breakdown would need a dedicated endpoint; we show new/active split here.
    const totalPatients = data?.stats.total_patients ?? 0;
    const totalSessions = data?.stats.sessions_this_month ?? 0;

    // Session type breakdown from session_status
    const sessionBreakdown = useMemo(() => {
        if (!data) return [];
        const { completed, scheduled, cancelled, no_show } = data.session_status;
        return [
            { label: "Completed", count: completed, color: TYPE_COLORS[1] },
            { label: "Scheduled", count: scheduled, color: TYPE_COLORS[0] },
            { label: "Cancelled", count: cancelled, color: TYPE_COLORS[4] },
            { label: "No-Show",   count: no_show,   color: TYPE_COLORS[3] },
        ].filter(i => i.count > 0);
    }, [data]);

    const sessionTotal = sessionBreakdown.reduce((s, i) => s + i.count, 0) || 1;

    // Real new/repeat split from backend
    const newPatients = data?.stats.new_patients ?? 0;
    const repeatPatients = data?.stats.repeat_patients ?? 0;

    // ── Donut helpers ──────────────────────────────────────────────────────────
    const circumference = 2 * Math.PI * 40;
    function buildDonut(items: { count: number; color: string }[]) {
        let offset = 0;
        const total = items.reduce((s, i) => s + i.count, 0) || 1;
        return items.map(item => {
            const dash = (item.count / total) * circumference;
            const gap = circumference - dash;
            const seg = { ...item, dash, gap, offset };
            offset += dash;
            return seg;
        });
    }

    const sessionDonut = buildDonut(sessionBreakdown);
    const patientDonut = buildDonut(
        totalPatients > 0
            ? [
                { count: newPatients,    color: TYPE_COLORS[0] },
                { count: repeatPatients, color: TYPE_COLORS[2] },
              ]
            : []
    );

    return (
        <>
            <div className="p-4 md:p-6 space-y-5">

                {/* ── Header ────────────────────────────────────────────────── */}
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
                        </h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {user?.full_name}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={() => { load(true); loadUpcoming(period); }}
                            disabled={refreshing}
                            className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
                        >
                            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
                        </button>
                        <Button size="sm" className="gap-1.5 rounded-xl text-xs md:text-sm" onClick={() => setSessionOpen(true)}>
                            <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            <span className="hidden sm:inline">Add Session</span>
                            <span className="sm:hidden">Add</span>
                        </Button>
                    </div>
                </div>

                {/* ── Period Toggle ─────────────────────────────────────────── */}
                <div className="flex items-center gap-1 p-1 bg-muted rounded-xl w-fit">
                    {(["daily", "weekly", "monthly"] as Period[]).map(p => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={cn(
                                "px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 capitalize",
                                period === p
                                    ? "bg-white text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {p}
                        </button>
                    ))}
                </div>

                {/* ── Error banner ──────────────────────────────────────────── */}
                {error && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        {error} — <button className="underline" onClick={() => load()}>Retry</button>
                    </div>
                )}

                {/* ── Two-Column Stat Cards ─────────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    {/* ── Patients Card ──────────────────────────────────────── */}
                    <a
                        href="/patients"
                        className="group bg-white rounded-2xl border border-border p-5 flex flex-col gap-4 hover:shadow-md transition-shadow cursor-pointer"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-[#2493A2]/10 flex items-center justify-center">
                                    <Users className="w-4 h-4 text-[#2493A2]" />
                                </div>
                                <span className="text-sm font-medium text-muted-foreground">Total Patients</span>
                            </div>
                            <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>

                        {loading ? (
                            <Skeleton className="h-24" />
                        ) : (
                            <div className="flex items-center gap-5">
                                {/* Donut */}
                                <div className="relative w-24 h-24 shrink-0">
                                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                        {totalPatients === 0 ? (
                                            <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="12" className="text-muted" />
                                        ) : (
                                            patientDonut.map((seg, i) => (
                                                <circle
                                                    key={i}
                                                    cx="50" cy="50" r="40"
                                                    fill="none"
                                                    stroke={seg.color}
                                                    strokeWidth="12"
                                                    strokeDasharray={`${seg.dash} ${seg.gap}`}
                                                    strokeDashoffset={-seg.offset}
                                                    strokeLinecap="butt"
                                                    className="transition-all duration-700"
                                                />
                                            ))
                                        )}
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-2xl font-bold">{totalPatients}</span>
                                        <span className="text-[10px] text-muted-foreground">total</span>
                                    </div>
                                </div>
                                {/* Legend */}
                                <div className="flex flex-col gap-2 flex-1">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="flex items-center gap-1.5">
                                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: TYPE_COLORS[0] }} />
                                            <span className="text-muted-foreground text-xs">New</span>
                                        </span>
                                        <span className="font-semibold">{newPatients}</span>
                                    </div>
                                    <div className="w-full bg-muted rounded-full h-1.5">
                                        <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${totalPatients ? (newPatients / totalPatients) * 100 : 0}%`, background: TYPE_COLORS[0] }} />
                                    </div>
                                    <div className="flex items-center justify-between text-sm mt-1">
                                        <span className="flex items-center gap-1.5">
                                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: TYPE_COLORS[2] }} />
                                            <span className="text-muted-foreground text-xs">Repeat</span>
                                        </span>
                                        <span className="font-semibold">{repeatPatients}</span>
                                    </div>
                                    <div className="w-full bg-muted rounded-full h-1.5">
                                        <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${totalPatients ? (repeatPatients / totalPatients) * 100 : 0}%`, background: TYPE_COLORS[2] }} />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-1 text-xs text-[#2493A2] font-medium pt-1 border-t border-border">
                            View all patients <ChevronRight className="w-3 h-3" />
                        </div>
                    </a>

                    {/* ── Sessions Card ──────────────────────────────────────── */}
                    <a
                        href="/sessions"
                        className="group bg-white rounded-2xl border border-border p-5 flex flex-col gap-4 hover:shadow-md transition-shadow cursor-pointer"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center">
                                    <Stethoscope className="w-4 h-4 text-violet-600" />
                                </div>
                                <span className="text-sm font-medium text-muted-foreground">Total Sessions</span>
                            </div>
                            <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>

                        {loading ? (
                            <Skeleton className="h-24" />
                        ) : (
                            <div className="flex items-center gap-5">
                                {/* Donut */}
                                <div className="relative w-24 h-24 shrink-0">
                                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                        {sessionBreakdown.length === 0 ? (
                                            <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="12" className="text-muted" />
                                        ) : (
                                            sessionDonut.map((seg, i) => (
                                                <circle
                                                    key={i}
                                                    cx="50" cy="50" r="40"
                                                    fill="none"
                                                    stroke={seg.color}
                                                    strokeWidth="12"
                                                    strokeDasharray={`${seg.dash} ${seg.gap}`}
                                                    strokeDashoffset={-seg.offset}
                                                    strokeLinecap="butt"
                                                    className="transition-all duration-700"
                                                />
                                            ))
                                        )}
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-2xl font-bold">{data?.session_status.total ?? 0}</span>
                                        <span className="text-[10px] text-muted-foreground">total</span>
                                    </div>
                                </div>
                                {/* Legend */}
                                <div className="flex flex-col gap-1.5 flex-1 text-xs">
                                    {sessionBreakdown.map(item => (
                                        <div key={item.label} className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.color }} />
                                            <span className="text-muted-foreground flex-1">{item.label}</span>
                                            <span className="font-semibold tabular-nums">{item.count}</span>
                                            <span className="text-muted-foreground w-8 text-right">{Math.round((item.count / sessionTotal) * 100)}%</span>
                                        </div>
                                    ))}
                                    {sessionBreakdown.length === 0 && (
                                        <p className="text-muted-foreground text-center py-2">No sessions yet</p>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-1 text-xs text-violet-600 font-medium pt-1 border-t border-border">
                            View sessions dashboard <ChevronRight className="w-3 h-3" />
                        </div>
                    </a>
                </div>

                {/* ── Upcoming Appointments ─────────────────────────────────── */}
                <div className="bg-white rounded-2xl border border-border overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                        <div className="flex items-center gap-2">
                            <CalendarDays className="w-4 h-4 text-[#2493A2]" />
                            <h2 className="font-semibold text-base">Upcoming Appointments</h2>
                            {!upLoading && (
                                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-lg">
                                    {upcoming.length} scheduled
                                </span>
                            )}
                        </div>
                        <span className="text-xs text-muted-foreground capitalize">{period}</span>
                    </div>

                    {upLoading ? (
                        <div className="p-4 space-y-2">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Skeleton key={i} className="h-12" />
                            ))}
                        </div>
                    ) : upcoming.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-14 text-center gap-2">
                            <CalendarDays className="w-10 h-10 text-muted-foreground/25" />
                            <p className="text-sm font-medium text-muted-foreground">No upcoming appointments</p>
                            <p className="text-xs text-muted-foreground/60">Switch period or add a new session</p>
                        </div>
                    ) : (
                        /* ── Desktop table ── */
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-muted/40 text-xs text-muted-foreground">
                                        <th className="text-left font-medium px-5 py-2.5">Date & Time</th>
                                        <th className="text-left font-medium px-4 py-2.5">Patient</th>
                                        <th className="text-left font-medium px-4 py-2.5">Session Type</th>
                                        <th className="text-left font-medium px-4 py-2.5">Doctor</th>
                                        <th className="text-left font-medium px-4 py-2.5">Status</th>
                                        <th className="text-left font-medium px-4 py-2.5">Form</th>
                                        <th className="px-4 py-2.5" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {upcoming.map(s => (
                                        <tr key={s.id} className="hover:bg-muted/30 transition-colors group cursor-pointer" onClick={() => window.location.href = `/calendar?date=${s.scheduled_at.slice(0, 10)}`}>
                                            {/* Date & Time */}
                                            <td className="px-5 py-3 whitespace-nowrap">
                                                <p className="font-medium text-foreground">{formatDate(s.scheduled_at)}</p>
                                                <p className="text-xs text-muted-foreground">{formatTime(s.scheduled_at)}</p>
                                            </td>
                                            {/* Patient */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-full bg-[#2493A2]/10 text-[#2493A2] flex items-center justify-center text-[10px] font-bold shrink-0">
                                                        {initials(s.patient_name)}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium truncate max-w-[130px]">{s.patient_name}</p>
                                                        <p className="text-[10px] text-muted-foreground">{s.patient_code}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            {/* Session type */}
                                            <td className="px-4 py-3">
                                                <span className="text-xs bg-muted px-2 py-1 rounded-lg font-medium truncate max-w-[120px] block">
                                                    {s.session_type_name}
                                                </span>
                                            </td>
                                            {/* Doctor */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1.5">
                                                    <Stethoscope className="w-3 h-3 text-muted-foreground shrink-0" />
                                                    <span className="text-xs truncate max-w-[110px]">{s.doctor_name}</span>
                                                </div>
                                            </td>
                                            {/* Status */}
                                            <td className="px-4 py-3">
                                                <span className={cn(
                                                    "inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full border capitalize",
                                                    STATUS_STYLES[s.status] ?? "bg-muted text-muted-foreground border-border"
                                                )}>
                                                    {STATUS_ICONS[s.status]}
                                                    {s.status.replace("_", "-")}
                                                </span>
                                            </td>
                                            {/* Form */}
                                            <td className="px-4 py-3">
                                                {s.form_id ? (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                                                        <FileText className="w-3 h-3" /> Submitted
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-100">
                                                        <FileX className="w-3 h-3" /> Incomplete
                                                    </span>
                                                )}
                                            </td>
                                            {/* Arrow */}
                                            <td className="px-4 py-3">
                                                <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {upcoming.length > 0 && (
                        <div className="px-5 py-3 border-t border-border flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">Showing {upcoming.length} appointment{upcoming.length !== 1 ? "s" : ""}</p>
                            <a href="/calendar" className="text-xs text-[#2493A2] font-medium flex items-center gap-1 hover:underline">
                                Open calendar <ChevronRight className="w-3 h-3" />
                            </a>
                        </div>
                    )}
                </div>

            </div>

            <NewSessionModal open={sessionOpen} onClose={() => setSessionOpen(false)} />
        </>
    );
}

// Isolated clock to avoid re-rendering the whole page every second
function LiveClock() {
    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const t = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(t);
    }, []);
    return (
        <p className="text-3xl font-bold tracking-tight tabular-nums">
            {time.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
        </p>
    );
}
