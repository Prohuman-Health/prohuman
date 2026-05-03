"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
    CalendarDays, Clock, CheckCircle2, XCircle, AlertTriangle,
    RefreshCw, ChevronLeft, ChevronRight, Stethoscope, Filter,
    Link2, Link2Off, Loader2, Ban, Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { sessionsApi, gcalApi, leaveApi, Session, GCalEvent, GCalStatus, DoctorLeavePeriod } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

// ── Helpers ───────────────────────────────────────────────────────────────────
function today(): string {
    return new Date().toISOString().slice(0, 10);
}

function formatTime(iso: string) {
    if (!iso) return "";
    if (iso.length === 10) return "All day";
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

function formatRelativeTime(iso: string) {
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
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

// ── Google icon ───────────────────────────────────────────────────────────────
function GoogleColorIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
    );
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

// ── Google Calendar event row ─────────────────────────────────────────────────
function GCalEventRow({ event }: { event: GCalEvent }) {
    return (
        <div className="flex items-center gap-4 p-4 bg-red-50/60 rounded-2xl border border-red-100 transition-all">
            <div className="text-center shrink-0 min-w-[52px]">
                <p className="text-sm font-bold text-red-500">{formatTime(event.start)}</p>
                {!event.all_day && (
                    <p className="text-[10px] text-red-400 mt-0.5">→ {formatTime(event.end)}</p>
                )}
            </div>
            <div className="w-0.5 self-stretch bg-red-200 rounded-full shrink-0" />
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <GoogleColorIcon className="w-3.5 h-3.5 shrink-0" />
                    <p className="text-sm font-medium text-red-700 truncate">{event.title}</p>
                </div>
                <p className="text-xs text-red-400 mt-0.5">Personal calendar · Unavailable</p>
            </div>
            <Ban className="w-4 h-4 text-red-300 shrink-0" />
        </div>
    );
}

// ── Google Calendar connect panel ─────────────────────────────────────────────
function GCalConnectPanel({
    status, onConnect, onDisconnect, connecting, disconnecting,
}: {
    status: GCalStatus | null;
    onConnect: () => void;
    onDisconnect: () => void;
    connecting: boolean;
    disconnecting: boolean;
}) {
    return (
        <div className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-2xl border text-sm",
            status?.connected ? "bg-green-50 border-green-100" : "bg-gray-50 border-gray-100"
        )}>
            <GoogleColorIcon className="w-5 h-5 shrink-0" />
            <div className="flex-1 min-w-0">
                {status?.connected ? (
                    <>
                        <p className="font-medium text-gray-800 text-xs">Google Calendar connected</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                            Since {formatRelativeTime(status.connected_at!)} · Personal events shown as unavailable
                        </p>
                    </>
                ) : (
                    <>
                        <p className="font-medium text-gray-700 text-xs">Connect Google Calendar</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Overlay personal events as unavailability</p>
                    </>
                )}
            </div>
            {status?.connected ? (
                <button onClick={onDisconnect} disabled={disconnecting}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 bg-red-50 hover:bg-red-100 border border-red-100 transition-colors disabled:opacity-60">
                    {disconnecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Link2Off className="w-3 h-3" />}
                    Disconnect
                </button>
            ) : (
                <button onClick={onConnect} disabled={connecting}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-[#2493A2] hover:bg-[#1d7a87] border border-[#2493A2] transition-colors disabled:opacity-60">
                    {connecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Link2 className="w-3 h-3" />}
                    Connect
                </button>
            )}
        </div>
    );
}

// ── Day column (week view) ─────────────────────────────────────────────────────
function DayColumn({
    date, sessions, gcalEvents, isToday, isSelected, onLeave, onClick,
}: {
    date: string;
    sessions: Session[];
    gcalEvents: GCalEvent[];
    isToday: boolean;
    isSelected: boolean;
    onLeave: boolean;
    onClick: () => void;
}) {
    const d = new Date(date + "T00:00:00");
    const dayName = d.toLocaleDateString("en-IN", { weekday: "short" });
    const dayNum  = d.getDate();
    const hasBusy = gcalEvents.length > 0;

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
            <div className="flex gap-0.5 h-1.5">
                {sessions.length > 0 && (
                    <span className={cn("w-1.5 h-1.5 rounded-full", isSelected ? "bg-white/70" : "bg-[#2493A2]")} />
                )}
                {hasBusy && (
                    <span className={cn("w-1.5 h-1.5 rounded-full", isSelected ? "bg-red-200" : "bg-red-400")} />
                )}
                {onLeave && (
                    <span className={cn("w-1.5 h-1.5 rounded-full", isSelected ? "bg-amber-200" : "bg-amber-400")} />
                )}
            </div>
        </button>
    );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function SchedulePage() {
    const searchParams = useSearchParams();
    const { user } = useAuth();

    const [selectedDate, setSelectedDate] = useState(today());
    const [weekStart, setWeekStart] = useState(() => weekRange(today()).start);
    const [daySessions, setDaySessions] = useState<Session[]>([]);
    const [weekSessions, setWeekSessions] = useState<Record<string, Session[]>>({});
    const [weekGcalEvents, setWeekGcalEvents] = useState<Record<string, GCalEvent[]>>({});
    const [dayGcalEvents, setDayGcalEvents] = useState<GCalEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [leavePeriods, setLeavePeriods] = useState<DoctorLeavePeriod[]>([]);

    // Google Calendar state
    const [gcalStatus, setGcalStatus] = useState<GCalStatus | null>(null);
    const [gcalStatusLoading, setGcalStatusLoading] = useState(true);
    const [gcalConnecting, setGcalConnecting] = useState(false);
    const [gcalDisconnecting, setGcalDisconnecting] = useState(false);
    const [showGcal, setShowGcal] = useState(true);

    const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    // Handle ?gcal=connected redirect from backend
    useEffect(() => {
        if (searchParams.get("gcal") === "connected") {
            gcalApi.status().then(setGcalStatus).finally(() => setGcalStatusLoading(false));
            const url = new URL(window.location.href);
            url.searchParams.delete("gcal");
            window.history.replaceState({}, "", url.toString());
        }
    }, [searchParams]);

    // Load gcal status on mount
    useEffect(() => {
        gcalApi.status()
            .then(setGcalStatus)
            .catch(() => setGcalStatus({ connected: false }))
            .finally(() => setGcalStatusLoading(false));
    }, []);

    // Load doctor's own leave periods
    useEffect(() => {
        if (!user?.doctor_id) return;
        leaveApi.list(user.doctor_id)
            .then(setLeavePeriods)
            .catch(() => setLeavePeriods([]));
    }, [user?.doctor_id]);

    const loadWeek = useCallback(async (start: string, silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);
        setError(null);
        try {
            const dates = Array.from({ length: 7 }, (_, i) => addDays(start, i));

            // Clinic sessions — always fetch
            const sessionResults = await Promise.all(
                dates.map(d => sessionsApi.mySchedule(d).then(rows => ({ date: d, rows })))
            );
            const sessMap: Record<string, Session[]> = {};
            for (const { date, rows } of sessionResults) sessMap[date] = rows;
            setWeekSessions(sessMap);
            setDaySessions(sessMap[selectedDate] ?? []);

            // Google Calendar events — only if connected and overlay is on
            if (gcalStatus?.connected) {
                const gcalResults = await Promise.allSettled(
                    dates.map(d => gcalApi.events(d).then(evts => ({ date: d, evts })))
                );
                const gcalMap: Record<string, GCalEvent[]> = {};
                for (const r of gcalResults) {
                    if (r.status === "fulfilled") gcalMap[r.value.date] = r.value.evts;
                }
                setWeekGcalEvents(gcalMap);
                setDayGcalEvents(gcalMap[selectedDate] ?? []);
            }
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to load schedule");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDate, gcalStatus]);

    useEffect(() => {
        loadWeek(weekStart);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [weekStart, gcalStatus]);

    useEffect(() => {
        setDaySessions(weekSessions[selectedDate] ?? []);
        setDayGcalEvents(weekGcalEvents[selectedDate] ?? []);
    }, [selectedDate, weekSessions, weekGcalEvents]);

    const handleDateClick = (date: string) => {
        setSelectedDate(date);
        const { start } = weekRange(date);
        if (start !== weekStart) setWeekStart(start);
    };

    const handleConnect = () => {
        setGcalConnecting(true);
        window.location.href = gcalApi.connectUrl(`${window.location.origin}/schedule`);
    };

    const handleDisconnect = async () => {
        setGcalDisconnecting(true);
        try {
            await gcalApi.disconnect();
            setGcalStatus({ connected: false });
            setWeekGcalEvents({});
            setDayGcalEvents([]);
        } finally {
            setGcalDisconnecting(false);
        }
    };

    const filteredSessions = statusFilter === "all"
        ? daySessions
        : daySessions.filter(s => s.status === statusFilter);

    const isDateOnLeave = (date: string) =>
        leavePeriods.some(lp => date >= lp.from_date && date <= lp.to_date);
    const activeLeavePeriod = leavePeriods.find(
        lp => selectedDate >= lp.from_date && selectedDate <= lp.to_date
    ) ?? null;

    // Merge + sort clinic sessions and gcal events for display
    type DisplayItem = { type: "session"; data: Session } | { type: "gcal"; data: GCalEvent };
    const displayItems: DisplayItem[] = [
        ...filteredSessions.map(s => ({ type: "session" as const, data: s })),
        ...(showGcal && gcalStatus?.connected ? dayGcalEvents.map(e => ({ type: "gcal" as const, data: e })) : []),
    ].sort((a, b) => {
        const aTime = a.type === "session" ? a.data.scheduled_at : a.data.start;
        const bTime = b.type === "session" ? b.data.scheduled_at : b.data.start;
        return new Date(aTime).getTime() - new Date(bTime).getTime();
    });

    const selectedDateLabel = new Date(selectedDate + "T00:00:00").toLocaleDateString("en-IN", {
        weekday: "long", day: "numeric", month: "long",
    });

    return (
        <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">

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

            {/* ── Google Calendar panel ────────────────────────────────────── */}
            {!gcalStatusLoading && (
                <GCalConnectPanel
                    status={gcalStatus}
                    onConnect={handleConnect}
                    onDisconnect={handleDisconnect}
                    connecting={gcalConnecting}
                    disconnecting={gcalDisconnecting}
                />
            )}

            {/* ── Week strip ──────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
                <div className="flex items-center justify-between mb-3 px-1">
                    <button onClick={() => setWeekStart(prev => addDays(prev, -7))}
                        className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors">
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-medium text-gray-500">
                        {formatDisplayDate(weekStart)} – {formatDisplayDate(addDays(weekStart, 6))}
                    </span>
                    <button onClick={() => setWeekStart(prev => addDays(prev, 7))}
                        className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors">
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
                <div className="flex gap-1 overflow-x-auto pb-1">
                    {weekDates.map(date => (
                        <DayColumn
                            key={date}
                            date={date}
                            sessions={weekSessions[date] ?? []}
                            gcalEvents={weekGcalEvents[date] ?? []}
                            isToday={date === today()}
                            isSelected={date === selectedDate}
                            onLeave={isDateOnLeave(date)}
                            onClick={() => handleDateClick(date)}
                        />
                    ))}
                </div>
            </div>

            {/* ── Leave banner ─────────────────────────────────────────────── */}
            {activeLeavePeriod && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-amber-200 bg-amber-50 text-sm text-amber-800">
                    <Briefcase className="w-4 h-4 text-amber-500 shrink-0" />
                    <div className="flex-1">
                        <p className="font-semibold">You are on leave</p>
                        <p className="text-[11px] text-amber-600 mt-0.5">
                            {activeLeavePeriod.from_date} – {activeLeavePeriod.to_date}
                            {activeLeavePeriod.reason ? ` · ${activeLeavePeriod.reason}` : ""}
                        </p>
                    </div>
                </div>
            )}

            {/* ── Filter + overlay toggle row ──────────────────────────────── */}
            <div className="flex items-center gap-2 overflow-x-auto">
                <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                {["all", "pending", "completed", "no_show", "cancelled"].map(s => (
                    <button key={s} onClick={() => setStatusFilter(s)}
                        className={cn(
                            "px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all border",
                            statusFilter === s
                                ? "bg-[#2493A2] text-white border-[#2493A2]"
                                : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                        )}>
                        {s === "all" ? "All" : s.replace("_", " ")}
                        {s !== "all" && daySessions.filter(x => x.status === s).length > 0 && (
                            <span className="ml-1.5 opacity-70">{daySessions.filter(x => x.status === s).length}</span>
                        )}
                    </button>
                ))}
                {gcalStatus?.connected && (
                    <button
                        onClick={() => setShowGcal(v => !v)}
                        className={cn(
                            "ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border whitespace-nowrap transition-all",
                            showGcal
                                ? "bg-red-50 text-red-500 border-red-100"
                                : "bg-white text-gray-400 border-gray-200"
                        )}>
                        <GoogleColorIcon className="w-3.5 h-3.5" />
                        {showGcal ? "Hide busy" : "Show busy"}
                    </button>
                )}
            </div>

            {/* ── Error ───────────────────────────────────────────────────── */}
            {error && (
                <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">{error}</div>
            )}

            {/* ── Legend ──────────────────────────────────────────────────── */}
            {gcalStatus?.connected && showGcal && dayGcalEvents.length > 0 && (
                <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#2493A2]" /> Clinic session
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-400" /> Personal calendar (unavailable)
                    </span>
                </div>
            )}

            {/* ── Items list ───────────────────────────────────────────────── */}
            {loading ? (
                <div className="space-y-3">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24" />)}
                </div>
            ) : displayItems.length === 0 ? (
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
                    {displayItems.map(item =>
                        item.type === "session"
                            ? <SessionRow key={`s-${item.data.id}`} session={item.data} />
                            : <GCalEventRow key={`g-${item.data.id}`} event={item.data} />
                    )}
                </div>
            )}
        </div>
    );
}
