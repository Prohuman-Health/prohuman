"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
    CalendarDays, Clock, CheckCircle2, XCircle, AlertTriangle,
    RefreshCw, ChevronRight, User, Stethoscope,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { sessionsApi, Session } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

// ── Helpers ───────────────────────────────────────────────────────────────────
function today(): string {
    return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr + "T00:00:00");
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
}

/** Week Mon–Sun containing dateStr */
function weekRange(dateStr: string): { start: string; end: string } {
    const d = new Date(dateStr + "T00:00:00");
    const start = new Date(d);
    start.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

function monthRange(dateStr: string): { start: string; end: string; label: string } {
    const d = new Date(dateStr + "T00:00:00");
    const y = d.getFullYear(), m = d.getMonth();
    const start = `${y}-${String(m + 1).padStart(2, "0")}-01`;
    const last  = new Date(y, m + 1, 0).getDate();
    const end   = `${y}-${String(m + 1).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    return { start, end, label };
}


function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}


// ── Status helpers ─────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
    pending:   "bg-blue-50 text-blue-600 border-blue-100",
    scheduled: "bg-blue-50 text-blue-600 border-blue-100",
    completed: "bg-emerald-50 text-emerald-600 border-emerald-100",
    cancelled: "bg-red-50 text-red-500 border-red-100",
    no_show:   "bg-amber-50 text-amber-600 border-amber-100",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
    pending:   <Clock className="w-3 h-3" />,
    scheduled: <Clock className="w-3 h-3" />,
    completed: <CheckCircle2 className="w-3 h-3" />,
    cancelled: <XCircle className="w-3 h-3" />,
    no_show:   <AlertTriangle className="w-3 h-3" />,
};

function StatusBadge({ status }: { status: string }) {
    return (
        <span className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
            STATUS_STYLES[status] ?? "bg-gray-50 text-gray-500 border-gray-200"
        )}>
            {STATUS_ICONS[status] ?? <Clock className="w-3 h-3" />}
            {status.replace("_", " ")}
        </span>
    );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
    return <div className={cn("animate-pulse bg-gray-100 rounded-xl", className)} />;
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color }: {
    label: string; value: number | string; icon: React.ElementType; color: string;
}) {
    return (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
            <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", color)}>
                <Icon className="w-5 h-5" />
            </div>
            <div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
        </div>
    );
}

// ── Session card ──────────────────────────────────────────────────────────────
function SessionCard({ session }: { session: Session }) {
    const isUpcoming = session.status === "pending" || session.status === "scheduled";
    const timeNow = Date.now();
    const sessionTime = new Date(session.scheduled_at).getTime();
    const isNow = isUpcoming && sessionTime <= timeNow + 15 * 60_000 && sessionTime >= timeNow - 5 * 60_000;

    return (
        <div className={cn(
            "flex items-start gap-4 p-4 rounded-2xl border transition-all",
            isNow
                ? "bg-[#2493A2]/5 border-[#2493A2]/30 shadow-sm"
                : "bg-white border-gray-100 hover:border-gray-200"
        )}>
            {/* Time */}
            <div className="text-center shrink-0 min-w-[52px]">
                <p className={cn("text-base font-bold", isNow ? "text-[#2493A2]" : "text-gray-800")}>
                    {formatTime(session.scheduled_at)}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">{session.duration_minutes}m</p>
            </div>

            {/* Divider */}
            <div className={cn("w-0.5 self-stretch rounded-full shrink-0", isNow ? "bg-[#2493A2]" : "bg-gray-100")} />

            {/* Details */}
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{session.patient_name}</p>
                        <p className="text-xs text-gray-400 font-mono mt-0.5">{session.patient_code}</p>
                    </div>
                    <StatusBadge status={session.status} />
                </div>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                        <Stethoscope className="w-3 h-3" />
                        {session.session_type}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                        <CalendarDays className="w-3 h-3" />
                        {session.branch_name}
                    </span>
                </div>
            </div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
type ViewMode = "day" | "week" | "month";

export default function DashboardPage() {
    const { user } = useAuth();

    const [viewMode, setViewMode]     = useState<ViewMode>("day");
    const [selectedDate, setSelectedDate] = useState(today());
    const [sessions, setSessions]     = useState<Session[]>([]);
    const [loading, setLoading]       = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError]           = useState<string | null>(null);

    // ── Fetch ─────────────────────────────────────────────────────────────────
    const loadSessions = useCallback(async (from: string, to: string, silent = false) => {
        const doctorId = user?.doctor_id;
        if (!doctorId) return;
        if (!silent) setLoading(true); else setRefreshing(true);
        setError(null);
        try {
            if (from === to) {
                // single day — use mySchedule (more accurate for the doctor's own schedule)
                const data = await sessionsApi.mySchedule(from);
                setSessions(data);
            } else {
                const data = await sessionsApi.list({ doctor_id: doctorId, from, to });
                setSessions(data.sessions);
            }
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to load sessions");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.doctor_id]);

    // Range for the current view
    const range = useMemo((): { from: string; to: string } => {
        if (viewMode === "day")  return { from: selectedDate, to: selectedDate };
        if (viewMode === "week") { const { start, end } = weekRange(selectedDate); return { from: start, to: end }; }
        const { start, end } = monthRange(selectedDate);
        return { from: start, to: end };
    }, [viewMode, selectedDate]);

    useEffect(() => {
        loadSessions(range.from, range.to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [range.from, range.to]);

    // ── Computed stats (always on sessions in range) ──────────────────────────
    const total     = sessions.length;
    const completed = sessions.filter(s => s.status === "completed").length;
    const upcoming  = sessions.filter(s => s.status === "pending" || s.status === "scheduled").length;
    const noShows   = sessions.filter(s => s.status === "no_show").length;

    // Week / month: sessions grouped by date
    const sessionsByDate = useMemo(() => {
        const map: Record<string, Session[]> = {};
        sessions.forEach(s => {
            const k = s.scheduled_at.slice(0, 10);
            if (!map[k]) map[k] = [];
            map[k].push(s);
        });
        return map;
    }, [sessions]);

    // Week dates Mon–Sun
    const weekDates = useMemo(() => {
        const { start } = weekRange(selectedDate);
        return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }, [selectedDate]);

    // Day view: sessions for the selected day
    const daySessions = viewMode === "day" ? sessions : (sessionsByDate[selectedDate] ?? []);

    // ── Navigation ────────────────────────────────────────────────────────────
    // (navigation removed — view toggles between Day/Week/Month on the same date)
    const isToday = selectedDate === today();

    return (
        <div className="p-4 md:p-6 space-y-5 max-w-3xl mx-auto">

            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
                        {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {user?.full_name}
                        {user?.specialty ? ` · ${user.specialty}` : ""}
                    </p>
                </div>
                <button
                    onClick={() => loadSessions(range.from, range.to, true)}
                    disabled={refreshing}
                    className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors"
                >
                    <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
                </button>
            </div>

            {/* ── View toggle ──────────────────────────────────────────────── */}
            <div className="flex items-center gap-0.5 bg-white rounded-xl p-1 border border-gray-200 shadow-sm w-fit">
                {(["day", "week", "month"] as ViewMode[]).map(v => (
                    <button key={v} onClick={() => setViewMode(v)}
                        className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all",
                            viewMode === v
                                ? "bg-[#2493A2] text-white shadow-sm"
                                : "text-gray-500 hover:text-gray-800"
                        )}>
                        {v}
                    </button>
                ))}
            </div>

            {/* ── Week strip (week view) ───────────────────────────────────── */}
            {viewMode === "week" && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-3 py-3">
                    <div className="flex gap-1 overflow-x-auto">
                        {weekDates.map(date => {
                            const count = sessionsByDate[date]?.length ?? 0;
                            const isDayToday = date === today();
                            const isSelected = date === selectedDate;
                            const d = new Date(date + "T00:00:00");
                            return (
                                <button key={date} onClick={() => setSelectedDate(date)}
                                    className={cn(
                                        "flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl flex-1 min-w-[44px] transition-all",
                                        isSelected
                                            ? "bg-[#2493A2] text-white shadow-sm"
                                            : isDayToday
                                            ? "bg-[#2493A2]/10 text-[#2493A2]"
                                            : "hover:bg-gray-100 text-gray-600"
                                    )}>
                                    <span className="text-[10px] font-semibold uppercase tracking-wider opacity-75">
                                        {d.toLocaleDateString("en-IN", { weekday: "short" })}
                                    </span>
                                    <span className="text-lg font-bold leading-none">{d.getDate()}</span>
                                    {count > 0
                                        ? <span className={cn("text-[10px] font-semibold", isSelected ? "text-white/80" : "text-[#2493A2]")}>{count}</span>
                                        : <span className="h-3.5" />
                                    }
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── Stats ───────────────────────────────────────────────────── */}
            {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatCard label="Total" value={total} icon={CalendarDays}
                        color="bg-blue-50 text-blue-600" />
                    <StatCard label="Upcoming" value={upcoming} icon={Clock}
                        color="bg-amber-50 text-amber-600" />
                    <StatCard label="Completed" value={completed} icon={CheckCircle2}
                        color="bg-emerald-50 text-emerald-600" />
                    <StatCard label="No-Shows" value={noShows} icon={AlertTriangle}
                        color="bg-red-50 text-red-500" />
                </div>
            )}

            {/* ── Error ───────────────────────────────────────────────────── */}
            {error && (
                <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
                    {error}
                </div>
            )}

            {/* ── Sessions list ────────────────────────────────────────────── */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-widest">
                        {viewMode === "day" && (isToday ? "Today's Sessions" : "Sessions")}
                        {viewMode === "week" && `${new Date(selectedDate + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long" })}'s Sessions`}
                        {viewMode === "month" && "All Sessions"}
                        {!loading && <span className="ml-2 text-gray-400 font-normal normal-case tracking-normal">{viewMode === "day" ? daySessions.length : total} total</span>}
                    </h2>
                    <Link href="/schedule" className="text-xs text-[#2493A2] hover:underline flex items-center gap-0.5">
                        View all <ChevronRight className="w-3 h-3" />
                    </Link>
                </div>

                {loading ? (
                    <div className="space-y-3">
                        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
                    </div>
                ) : viewMode === "month" ? (
                    // Month: group by day
                    Object.keys(sessionsByDate).length === 0 ? (
                        <EmptyState message="No sessions this month." />
                    ) : (
                        <div className="space-y-4">
                            {Object.entries(sessionsByDate)
                                .sort(([a], [b]) => a.localeCompare(b))
                                .map(([date, daySess]) => (
                                    <div key={date}>
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 px-1">
                                            {new Date(date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                                        </p>
                                        <div className="space-y-2">
                                            {daySess.map(s => <SessionCard key={s.id} session={s} />)}
                                        </div>
                                    </div>
                                ))}
                        </div>
                    )
                ) : daySessions.length === 0 ? (
                    <EmptyState message={isToday && viewMode === "day" ? "You have no sessions today." : "No sessions on this date."} />
                ) : (
                    <div className="space-y-2.5">
                        {daySessions
                            .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
                            .map(session => (
                                <SessionCard key={session.id} session={session} />
                            ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                <User className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">No sessions scheduled</p>
            <p className="text-sm text-gray-400 mt-1">{message}</p>
        </div>
    );
}
