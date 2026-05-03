"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
    ChevronLeft, ChevronRight, Clock, RefreshCw,
    CalendarDays, LayoutGrid, Ban,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { sessionsApi, calendarApi, type Session, type ClinicClosure } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const STATUS_CONFIG: Record<string, string> = {
    completed:   "border-emerald-200 text-emerald-700 bg-emerald-50",
    confirmed:   "border-blue-200 text-blue-700 bg-blue-50",
    pending:     "border-amber-200 text-amber-700 bg-amber-50",
    scheduled:   "border-blue-200 text-blue-700 bg-blue-50",
    "no-show":   "border-red-200 text-red-600 bg-red-50",
    no_show:     "border-red-200 text-red-600 bg-red-50",
    cancelled:   "border-muted-foreground/30 text-muted-foreground",
    rescheduled: "border-purple-200 text-purple-600 bg-purple-50",
};

const SESSION_COLORS = [
    "bg-violet-50 border-violet-300 text-violet-800",
    "bg-blue-50 border-blue-300 text-blue-800",
    "bg-emerald-50 border-emerald-300 text-emerald-800",
    "bg-amber-50 border-amber-300 text-amber-800",
    "bg-pink-50 border-pink-300 text-pink-800",
];

// Hours to show: 7am–9pm
const START_HOUR = 7;
const END_HOUR = 21;
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
const SLOT_HEIGHT = 60; // px per hour

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDay(y: number, m: number) { return new Date(y, m, 1).getDay(); }
function dateKey(y: number, m: number, d: number) {
    return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// ── Day View ──────────────────────────────────────────────────────────────────
function DayView({
    date, sessions, closureReason,
}: {
    date: Date;
    sessions: Session[];
    closureReason?: string | null;
}) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    useEffect(() => {
        if (scrollRef.current) {
            const scrollTo = isToday
                ? Math.max(0, (now.getHours() - START_HOUR - 1) * SLOT_HEIGHT)
                : 0;
            scrollRef.current.scrollTop = scrollTo;
        }
    }, [date]); // eslint-disable-line react-hooks/exhaustive-deps

    const daySessions = sessions
        .filter(s => new Date(s.scheduled_at).toDateString() === date.toDateString())
        .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));

    const slotMap: Record<number, Session[]> = {};
    daySessions.forEach(s => {
        const h = new Date(s.scheduled_at).getHours();
        if (!slotMap[h]) slotMap[h] = [];
        slotMap[h].push(s);
    });

    return (
        <div className="bg-white rounded-2xl flex flex-col overflow-hidden">
            {/* Day header */}
            <div className="px-5 py-4 border-b border-border/60 shrink-0">
                <h2 className="font-bold text-lg">
                    {date.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                    {daySessions.length} session{daySessions.length !== 1 ? "s" : ""} scheduled
                </p>
            </div>

            {closureReason !== undefined && (
                <div className="mx-5 mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 flex items-start gap-2">
                    <Ban className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <div>
                        <p className="font-semibold">Clinic closed on this day</p>
                        <p className="text-red-600/90">{closureReason || "No reason provided"}</p>
                    </div>
                </div>
            )}

            {/* Time grid */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto">
                <div className="relative" style={{ height: `${HOURS.length * SLOT_HEIGHT}px` }}>
                    {/* Hour rows */}
                    {HOURS.map((h, idx) => (
                        <div key={h} className="absolute w-full flex"
                            style={{ top: `${idx * SLOT_HEIGHT}px`, height: `${SLOT_HEIGHT}px` }}>
                            <div className="w-16 shrink-0 pr-3 flex items-start justify-end pt-1">
                                <span className="text-[11px] text-muted-foreground font-mono">
                                    {h === 12 ? "12 PM" : h < 12 ? `${h} AM` : `${h - 12} PM`}
                                </span>
                            </div>
                            <div className="flex-1 border-t border-border/40 relative">
                                <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-border/20 pointer-events-none" />
                            </div>
                        </div>
                    ))}

                    {/* Current time indicator */}
                    {isToday && currentMinutes >= START_HOUR * 60 && currentMinutes <= END_HOUR * 60 && (
                        <div className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
                            style={{ top: `${(currentMinutes - START_HOUR * 60) / 60 * SLOT_HEIGHT}px` }}>
                            <div className="w-16 flex justify-end pr-2">
                                <div className="w-2 h-2 rounded-full bg-red-500" />
                            </div>
                            <div className="flex-1 h-px bg-red-500" />
                        </div>
                    )}

                    {/* Session blocks */}
                    {daySessions.map((s, idx) => {
                        const dt = new Date(s.scheduled_at);
                        const startMin = dt.getHours() * 60 + dt.getMinutes();
                        const topPx = ((startMin - START_HOUR * 60) / 60) * SLOT_HEIGHT;
                        const heightPx = Math.max((s.duration_minutes / 60) * SLOT_HEIGHT, 28);
                        const colorCls = SESSION_COLORS[idx % SESSION_COLORS.length];
                        const statusCls = STATUS_CONFIG[s.status] ?? STATUS_CONFIG.pending;

                        const hourSessions = slotMap[dt.getHours()] ?? [];
                        const posInHour = hourSessions.findIndex(x => x.id === s.id);
                        const overlapCount = hourSessions.length;
                        const widthPct = overlapCount > 1 ? 100 / overlapCount : 100;
                        const leftPct = posInHour * widthPct;

                        return (
                            <div key={s.id}
                                className={cn(
                                    "absolute rounded-xl border px-2.5 py-1.5 overflow-hidden",
                                    colorCls,
                                )}
                                style={{
                                    top: `${topPx}px`,
                                    height: `${heightPx}px`,
                                    left: `calc(4rem + ${leftPct}%)`,
                                    width: `calc(${widthPct}% - 0.75rem)`,
                                }}>
                                <p className="text-[11px] font-bold truncate leading-tight">{s.patient_name}</p>
                                <p className="text-[10px] truncate opacity-80">{s.session_type}</p>
                                {heightPx > 40 && (
                                    <p className="text-[10px] opacity-70 font-mono">
                                        {dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                                        {" · "}{s.duration_minutes}m
                                    </p>
                                )}
                                {heightPx > 56 && (
                                    <Badge variant="outline" className={cn("text-[9px] rounded-full px-1.5 mt-0.5 font-medium", statusCls)}>
                                        {s.status}
                                    </Badge>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CalendarPage() {
    const { user } = useAuth();
    const todayDate = new Date();

    const [viewYear, setViewYear]   = useState(todayDate.getFullYear());
    const [viewMonth, setViewMonth] = useState(todayDate.getMonth());
    const [selectedDay, setSelectedDay] = useState<number | null>(todayDate.getDate());
    const [viewMode, setViewMode]   = useState<"month" | "day">("month");

    const [sessions, setSessions]     = useState<Session[]>([]);
    const [loading, setLoading]       = useState(false);
    const [closures, setClosures]     = useState<ClinicClosure[]>([]);

    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const firstDay    = getFirstDay(viewYear, viewMonth);
    const cells = Array.from({ length: firstDay + daysInMonth }, (_, i) => (i < firstDay ? null : i - firstDay + 1));

    const fetchData = useCallback(async () => {
        if (!user?.doctor_id) return;
        const from = dateKey(viewYear, viewMonth, 1);
        const to   = dateKey(viewYear, viewMonth, daysInMonth);
        setLoading(true);
        try {
            const [sessionData, closureData] = await Promise.all([
                sessionsApi.list({ doctor_id: user.doctor_id, from, to }),
                calendarApi.listClosures({ from, to }),
            ]);
            setSessions(sessionData.sessions);
            setClosures(closureData);
        } finally {
            setLoading(false);
        }
    }, [user?.doctor_id, viewYear, viewMonth, daysInMonth]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const sessionsByDate = useMemo(() => {
        const map: Record<string, Session[]> = {};
        sessions.forEach(s => {
            const key = s.scheduled_at.slice(0, 10);
            if (!map[key]) map[key] = [];
            map[key].push(s);
        });
        return map;
    }, [sessions]);

    const closuresByDate = useMemo(() => {
        const map: Record<string, ClinicClosure> = {};
        closures.forEach(c => { map[c.closure_date] = c; });
        return map;
    }, [closures]);

    function prevMonth() {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
        else setViewMonth(m => m - 1);
    }
    function nextMonth() {
        if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
        else setViewMonth(m => m + 1);
    }
    function goToToday() {
        setViewMonth(todayDate.getMonth());
        setViewYear(todayDate.getFullYear());
        setSelectedDay(todayDate.getDate());
    }

    const selectedKey      = selectedDay ? dateKey(viewYear, viewMonth, selectedDay) : null;
    const selectedClosure  = selectedKey ? closuresByDate[selectedKey] : undefined;
    const selectedSessions = (selectedKey ? (sessionsByDate[selectedKey] ?? []) : [])
        .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
    const selectedDate = selectedDay
        ? new Date(viewYear, viewMonth, selectedDay)
        : todayDate;

    return (
        <div className="flex flex-col gap-4 p-4 md:p-5 min-h-full">
            {/* ── Header ───────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {sessions.length} session{sessions.length !== 1 ? "s" : ""} this month
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {/* View toggle */}
                    <div className="flex items-center gap-0.5 bg-white rounded-xl p-1 border border-border">
                        <button onClick={() => setViewMode("month")}
                            className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all",
                                viewMode === "month" ? "bg-foreground text-white" : "text-muted-foreground hover:text-foreground")}>
                            <LayoutGrid className="w-3.5 h-3.5" /> Month
                        </button>
                        <button onClick={() => { setViewMode("day"); if (!selectedDay) setSelectedDay(todayDate.getDate()); }}
                            className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all",
                                viewMode === "day" ? "bg-foreground text-white" : "text-muted-foreground hover:text-foreground")}>
                            <CalendarDays className="w-3.5 h-3.5" /> Day
                        </button>
                    </div>
                    <button onClick={fetchData}
                        className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
                        <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                    </button>
                </div>
            </div>

            {/* ── Month nav ────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between bg-white rounded-2xl px-5 py-3 shrink-0">
                <h2 className="text-base font-bold">{MONTHS[viewMonth]} {viewYear}</h2>
                <div className="flex items-center gap-1.5">
                    <button onClick={goToToday}
                        className="px-3 h-8 rounded-xl bg-muted text-xs font-medium text-muted-foreground hover:bg-muted/80 transition-colors">
                        Today
                    </button>
                    <button onClick={prevMonth} className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80 transition-colors">
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button onClick={nextMonth} className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80 transition-colors">
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* ── MONTH VIEW ───────────────────────────────────────────────── */}
            {viewMode === "month" && (
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Calendar grid */}
                    <div className="bg-white rounded-2xl p-4 md:p-5 flex-1">
                        {/* Day headers */}
                        <div className="grid grid-cols-7 mb-2">
                            {DAYS.map(d => (
                                <div key={d} className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-1">{d}</div>
                            ))}
                        </div>
                        {/* Day cells */}
                        <div className="grid grid-cols-7 gap-1">
                            {cells.map((day, i) => {
                                if (!day) return <div key={`empty-${i}`} />;
                                const key = dateKey(viewYear, viewMonth, day);
                                const daySessions = sessionsByDate[key] ?? [];
                                const closure = closuresByDate[key];
                                const isToday = day === todayDate.getDate() && viewMonth === todayDate.getMonth() && viewYear === todayDate.getFullYear();
                                const isSelected = day === selectedDay;

                                return (
                                    <div key={day}
                                        onClick={() => { setSelectedDay(day); setViewMode("day"); }}
                                        className={cn(
                                            "rounded-xl p-1.5 cursor-pointer transition-all min-h-[80px] flex flex-col",
                                            isSelected ? "bg-foreground text-white" : "hover:bg-muted/40",
                                            !isSelected && closure ? "border border-red-200 bg-red-50/60" : "",
                                        )}>
                                        <span className={cn("text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1",
                                            isToday && !isSelected ? "bg-foreground text-white" : "",
                                            isSelected ? "text-white" : "text-foreground")}>
                                            {day}
                                        </span>
                                        {closure && !isSelected && (
                                            <p className="text-[10px] px-1 mb-1 font-semibold text-red-600">Closed</p>
                                        )}
                                        {closure && isSelected && (
                                            <p className="text-[10px] px-1 mb-1 font-semibold text-white/85">Closed</p>
                                        )}
                                        <div className="space-y-0.5 flex-1">
                                            {loading ? (
                                                daySessions.length === 0 && null
                                            ) : daySessions.slice(0, 3).map((s, j) => (
                                                <div key={j} className={cn("flex items-center gap-1 rounded px-1 py-0.5",
                                                    isSelected ? "bg-white/10" : "bg-muted/60")}>
                                                    <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-blue-500" />
                                                    <span className={cn("text-[10px] truncate font-medium leading-none",
                                                        isSelected ? "text-white/90" : "text-foreground/70")}>
                                                        {s.patient_name.split(" ")[0]}
                                                    </span>
                                                </div>
                                            ))}
                                            {daySessions.length > 3 && (
                                                <p className={cn("text-[10px] px-1 font-medium",
                                                    isSelected ? "text-white/60" : "text-muted-foreground")}>
                                                    +{daySessions.length - 3} more
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right panel — selected day detail */}
                    <div className="w-full lg:w-[260px] shrink-0">
                        <div className="bg-white rounded-2xl flex flex-col overflow-hidden min-h-[300px]">
                            <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
                                <div>
                                    <h2 className="font-semibold text-sm">
                                        {selectedDay ? `${MONTHS[viewMonth].slice(0, 3)} ${selectedDay}` : "Select a day"}
                                    </h2>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                        {selectedSessions.length > 0
                                            ? `${selectedSessions.length} session${selectedSessions.length > 1 ? "s" : ""}`
                                            : "No sessions"}
                                    </p>
                                    {selectedClosure && (
                                        <p className="text-[11px] text-red-600 mt-0.5 font-medium">Clinic closed</p>
                                    )}
                                </div>
                                {selectedDay && (
                                    <button onClick={() => setViewMode("day")}
                                        title="Open day view"
                                        className="w-7 h-7 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:bg-foreground hover:text-white transition-all">
                                        <CalendarDays className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                {loading ? (
                                    Array.from({ length: 3 }).map((_, i) => (
                                        <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
                                    ))
                                ) : selectedSessions.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-24 text-center">
                                        <p className="text-xs text-muted-foreground">
                                            {selectedClosure ? "Clinic is closed on this day" : selectedDay ? "No sessions on this day" : "Select a day to view sessions"}
                                        </p>
                                    </div>
                                ) : selectedSessions.map(s => {
                                    const dt = new Date(s.scheduled_at);
                                    const statusCls = STATUS_CONFIG[s.status] ?? STATUS_CONFIG.pending;
                                    return (
                                        <div key={s.id} className="bg-muted/40 rounded-xl p-3 space-y-1.5">
                                            <div className="flex items-start justify-between gap-2">
                                                <span className="text-xs font-semibold truncate">{s.patient_name}</span>
                                                <Badge variant="outline" className={cn("text-[9px] rounded-full px-1.5 font-medium whitespace-nowrap shrink-0", statusCls)}>
                                                    {s.status}
                                                </Badge>
                                            </div>
                                            <p className="text-[11px] text-muted-foreground truncate">{s.session_type}</p>
                                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                                <Clock className="w-3 h-3" />
                                                {dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                                                <span className="mx-1 text-border">·</span>
                                                {s.duration_minutes} min
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── DAY VIEW ─────────────────────────────────────────────────── */}
            {viewMode === "day" && (
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Day picker strip */}
                    <div className="lg:w-[200px] shrink-0">
                        <div className="bg-white rounded-2xl p-4">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                                {MONTHS[viewMonth]} {viewYear}
                            </p>
                            <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
                                {DAYS.map(d => (
                                    <div key={d} className="text-[9px] font-semibold text-muted-foreground uppercase py-0.5">{d[0]}</div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 gap-0.5">
                                {cells.map((day, i) => {
                                    if (!day) return <div key={`e-${i}`} />;
                                    const key = dateKey(viewYear, viewMonth, day);
                                    const hasSession = (sessionsByDate[key]?.length ?? 0) > 0;
                                    const closure = !!closuresByDate[key];
                                    const isToday = day === todayDate.getDate() && viewMonth === todayDate.getMonth() && viewYear === todayDate.getFullYear();
                                    const isSelected = day === selectedDay;
                                    return (
                                        <button key={day}
                                            onClick={() => setSelectedDay(day)}
                                            className={cn(
                                                "w-full aspect-square rounded-lg text-[10px] font-medium flex flex-col items-center justify-center gap-0.5 transition-colors",
                                                isSelected ? "bg-foreground text-white" : isToday ? "bg-muted font-bold" : "hover:bg-muted/60",
                                                closure && !isSelected ? "border border-red-200 bg-red-50" : "",
                                            )}>
                                            {day}
                                            {hasSession && (
                                                <div className={cn("w-1 h-1 rounded-full", isSelected ? "bg-white" : "bg-blue-500")} />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Day view content */}
                    <div className="flex-1 min-h-[600px]">
                        <DayView
                            date={selectedDate}
                            sessions={sessions}
                            closureReason={selectedClosure ? selectedClosure.reason : undefined}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
