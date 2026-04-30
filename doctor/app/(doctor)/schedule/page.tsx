"use client";

import { useEffect, useState, useCallback } from "react";
import {
    CalendarDays, Clock, CheckCircle2, XCircle, AlertTriangle,
    RefreshCw, ChevronLeft, ChevronRight, Stethoscope, Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { sessionsApi, Session } from "@/lib/api";

// ── Helpers ───────────────────────────────────────────────────────────────────
function today(): string {
    return new Date().toISOString().slice(0, 10);
}

function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr + "T00:00:00");
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
}

function weekRange(dateStr: string): { start: string; end: string } {
    const d = new Date(dateStr + "T00:00:00");
    const day = d.getDay(); // 0=Sun
    const start = new Date(d);
    start.setDate(d.getDate() - day);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

function formatDisplayDate(iso: string) {
    return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });
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

function Skeleton({ className }: { className?: string }) {
    return <div className={cn("animate-pulse bg-gray-100 rounded-xl", className)} />;
}

// ── Session row ───────────────────────────────────────────────────────────────
function SessionRow({ session }: { session: Session }) {
    return (
        <div className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 hover:border-gray-200 transition-all">
            <div className="text-center shrink-0 min-w-[52px]">
                <p className="text-sm font-bold text-gray-800">{formatTime(session.scheduled_at)}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{session.duration_minutes}m</p>
            </div>
            <div className="w-0.5 self-stretch bg-gray-100 rounded-full shrink-0" />
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{session.patient_name}</p>
                        <p className="text-xs text-gray-400 font-mono">{session.patient_code}</p>
                    </div>
                    <StatusBadge status={session.status} />
                </div>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                        <Stethoscope className="w-3 h-3" />{session.session_type}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                        <CalendarDays className="w-3 h-3" />{session.branch_name}
                    </span>
                </div>
            </div>
        </div>
    );
}

// ── Day column (week view) ─────────────────────────────────────────────────────
function DayColumn({
    date,
    sessions,
    isToday,
    isSelected,
    onClick,
}: {
    date: string;
    sessions: Session[];
    isToday: boolean;
    isSelected: boolean;
    onClick: () => void;
}) {
    const d = new Date(date + "T00:00:00");
    const dayName = d.toLocaleDateString("en-IN", { weekday: "short" });
    const dayNum  = d.getDate();
    const counts  = {
        upcoming:  sessions.filter(s => s.status === "pending" || s.status === "scheduled").length,
        completed: sessions.filter(s => s.status === "completed").length,
        other:     sessions.filter(s => s.status !== "pending" && s.status !== "scheduled" && s.status !== "completed").length,
    };

    return (
        <button
            onClick={onClick}
            className={cn(
                "flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl transition-all text-center min-w-[52px]",
                isSelected
                    ? "bg-[#2493A2] text-white shadow-sm"
                    : isToday
                    ? "bg-[#2493A2]/10 text-[#2493A2]"
                    : "hover:bg-gray-100 text-gray-600"
            )}
        >
            <span className="text-[10px] font-medium uppercase tracking-wider opacity-70">{dayName}</span>
            <span className={cn("text-lg font-bold leading-none", isSelected ? "text-white" : "")}>{dayNum}</span>
            {sessions.length > 0 && (
                <div className="flex gap-0.5">
                    {counts.upcoming > 0 && <span className={cn("w-1.5 h-1.5 rounded-full", isSelected ? "bg-white/70" : "bg-blue-400")} />}
                    {counts.completed > 0 && <span className={cn("w-1.5 h-1.5 rounded-full", isSelected ? "bg-white/70" : "bg-emerald-400")} />}
                    {counts.other > 0 && <span className={cn("w-1.5 h-1.5 rounded-full", isSelected ? "bg-white/70" : "bg-amber-400")} />}
                </div>
            )}
        </button>
    );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function SchedulePage() {
    const [selectedDate, setSelectedDate] = useState(today());
    const [weekStart, setWeekStart] = useState(() => weekRange(today()).start);
    const [daySessions, setDaySessions] = useState<Session[]>([]);
    const [weekSessions, setWeekSessions] = useState<Record<string, Session[]>>({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>("all");

    const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    const loadWeek = useCallback(async (start: string, silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);
        setError(null);
        try {
            // Load all 7 days in parallel
            const results = await Promise.all(
                Array.from({ length: 7 }, (_, i) => {
                    const d = addDays(start, i);
                    return sessionsApi.mySchedule(d).then(rows => ({ date: d, rows }));
                })
            );
            const map: Record<string, Session[]> = {};
            for (const { date, rows } of results) map[date] = rows;
            setWeekSessions(map);
            // Update day sessions for currently selected date
            setDaySessions(map[selectedDate] ?? []);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to load schedule");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [selectedDate]);

    useEffect(() => {
        loadWeek(weekStart);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [weekStart]);

    // When selected date changes, update day sessions from cached week data
    useEffect(() => {
        setDaySessions(weekSessions[selectedDate] ?? []);
    }, [selectedDate, weekSessions]);

    const handleDateClick = (date: string) => {
        setSelectedDate(date);
        // If date is outside current week, navigate
        const { start } = weekRange(date);
        if (start !== weekStart) setWeekStart(start);
    };

    const prevWeek = () => setWeekStart(prev => addDays(prev, -7));
    const nextWeek = () => setWeekStart(prev => addDays(prev, 7));

    const filteredSessions = statusFilter === "all"
        ? daySessions
        : daySessions.filter(s => s.status === statusFilter);

    const selectedDateLabel = new Date(selectedDate + "T00:00:00").toLocaleDateString("en-IN", {
        weekday: "long", day: "numeric", month: "long",
    });

    return (
        <div className="p-4 md:p-6 space-y-5 max-w-3xl mx-auto">

            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">My Schedule</h1>
                    <p className="text-sm text-gray-500 mt-0.5">{selectedDateLabel}</p>
                </div>
                <button
                    onClick={() => loadWeek(weekStart, true)}
                    disabled={refreshing}
                    className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors"
                >
                    <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
                </button>
            </div>

            {/* ── Week strip ──────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
                <div className="flex items-center justify-between mb-3 px-1">
                    <button onClick={prevWeek} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors">
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-medium text-gray-500">
                        {formatDisplayDate(weekStart)} – {formatDisplayDate(addDays(weekStart, 6))}
                    </span>
                    <button onClick={nextWeek} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors">
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
                <div className="flex gap-1 overflow-x-auto pb-1">
                    {weekDates.map(date => (
                        <DayColumn
                            key={date}
                            date={date}
                            sessions={weekSessions[date] ?? []}
                            isToday={date === today()}
                            isSelected={date === selectedDate}
                            onClick={() => handleDateClick(date)}
                        />
                    ))}
                </div>
            </div>

            {/* ── Filter bar ──────────────────────────────────────────────── */}
            <div className="flex items-center gap-2 overflow-x-auto">
                <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                {["all", "pending", "completed", "no_show", "cancelled"].map(s => (
                    <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className={cn(
                            "px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all border",
                            statusFilter === s
                                ? "bg-[#2493A2] text-white border-[#2493A2]"
                                : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                        )}
                    >
                        {s === "all" ? "All" : s.replace("_", " ")}
                        {s !== "all" && daySessions.filter(x => x.status === s).length > 0 && (
                            <span className="ml-1.5 opacity-70">
                                {daySessions.filter(x => x.status === s).length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* ── Error ───────────────────────────────────────────────────── */}
            {error && (
                <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
                    {error}
                </div>
            )}

            {/* ── Sessions ────────────────────────────────────────────────── */}
            {loading ? (
                <div className="space-y-3">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24" />)}
                </div>
            ) : filteredSessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                        <CalendarDays className="w-7 h-7 text-gray-300" />
                    </div>
                    <p className="text-gray-500 font-medium">
                        {statusFilter === "all" ? "No sessions on this day" : `No ${statusFilter.replace("_", " ")} sessions`}
                    </p>
                </div>
            ) : (
                <div className="space-y-2.5">
                    {filteredSessions.map(session => (
                        <SessionRow key={session.id} session={session} />
                    ))}
                </div>
            )}
        </div>
    );
}
