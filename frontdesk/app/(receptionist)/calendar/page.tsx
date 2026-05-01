"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
    ChevronLeft, ChevronRight, Plus, Clock, RefreshCw, Filter, X,
    CalendarDays, LayoutGrid, Ban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useSessions } from "@/lib/contexts/sessions-context";
import { useStaff } from "@/lib/contexts/staff-context";
import { useCatalog } from "@/lib/contexts/catalog-context";
import { NewSessionModal } from "@/components/modals/new-session-modal";
import { calendarApi, settingsApi, type Session, type ClinicClosure } from "@/lib/api";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const CHIP_COLORS = [
    "bg-violet-500", "bg-blue-500", "bg-emerald-500",
    "bg-amber-500", "bg-pink-500", "bg-cyan-500", "bg-orange-500", "bg-indigo-500",
];
const SESSION_BG = [
    "bg-violet-50 border-violet-300 text-violet-800",
    "bg-blue-50 border-blue-300 text-blue-800",
    "bg-emerald-50 border-emerald-300 text-emerald-800",
    "bg-amber-50 border-amber-300 text-amber-800",
    "bg-pink-50 border-pink-300 text-pink-800",
    "bg-cyan-50 border-cyan-300 text-cyan-800",
    "bg-orange-50 border-orange-300 text-orange-800",
    "bg-indigo-50 border-indigo-300 text-indigo-800",
];

const STATUS_CONFIG: Record<string, string> = {
    completed: "border-emerald-200 text-emerald-700 bg-emerald-50",
    confirmed: "border-blue-200 text-blue-700 bg-blue-50",
    pending: "border-amber-200 text-amber-700 bg-amber-50",
    "no-show": "border-red-200 text-red-600 bg-red-50",
    cancelled: "border-muted-foreground/30 text-muted-foreground",
    rescheduled: "border-purple-200 text-purple-600 bg-purple-50",
};

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

function titleCase(value: string) {
    return value
        .split("-")
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

function coerceClosedDates(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return [...new Set(value.filter((v): v is string => typeof v === "string"))].sort((a, b) => a.localeCompare(b));
}

function coerceWeeklyClosedDays(value: unknown): number[] {
    if (!Array.isArray(value)) return [];
    return [...new Set(value.map(v => Number(v)).filter(v => Number.isInteger(v) && v >= 0 && v <= 6))].sort((a, b) => a - b);
}

type CalendarClosureView = {
    id: string;
    closure_date: string;
    reason: string | null;
    source: "calendar" | "settings_date" | "settings_weekly";
};

// ── Day View ──────────────────────────────────────────────────────────────────
function DayView({
    date, sessions, doctorColorMap, sessionTypeColorMap, onAddSession, closureReason, onSessionClick, onEmptySlotClick,
}: {
    date: Date;
    sessions: Session[];
    doctorColorMap: Record<string, number>;
    sessionTypeColorMap: Record<string, string>;
    onAddSession: () => void;
    closureReason?: string | null;
    onSessionClick?: (session: Session) => void;
    onEmptySlotClick?: (hour: number) => void;
}) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Scroll to current time / business start on mount
    useEffect(() => {
        if (scrollRef.current) {
            const scrollTo = isToday
                ? Math.max(0, (now.getHours() - START_HOUR - 1) * SLOT_HEIGHT)
                : 0;
            scrollRef.current.scrollTop = scrollTo;
        }
    }, [date]);

    // Filter sessions for this day
    const daySessions = sessions.filter(s => {
        const d = new Date(s.scheduled_at);
        return d.toDateString() === date.toDateString();
    });

    // Group sessions by their hour slot (handle overlaps with left offset)
    const slotMap: Record<number, Session[]> = {};
    daySessions.forEach(s => {
        const h = new Date(s.scheduled_at).getHours();
        if (!slotMap[h]) slotMap[h] = [];
        slotMap[h].push(s);
    });

    return (
        <div className="bg-white rounded-2xl flex flex-col overflow-hidden">
            {/* Day header */}
            <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between shrink-0">
                <div>
                    <h2 className="font-bold text-lg">
                        {date.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {daySessions.length} session{daySessions.length !== 1 ? "s" : ""} scheduled
                    </p>
                </div>
                <Button size="sm" className="gap-1.5 rounded-xl" onClick={onAddSession} disabled={!!closureReason}>
                    <Plus className="w-3.5 h-3.5" /> Add Session
                </Button>
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
                            {/* Time label */}
                            <div className="w-16 shrink-0 pr-3 flex items-start justify-end pt-1">
                                <span className="text-[11px] text-muted-foreground font-mono">
                                    {h === 12 ? "12 PM" : h < 12 ? `${h} AM` : `${h - 12} PM`}
                                </span>
                            </div>
                            {/* Hour lane */}
                            <div
                                className="flex-1 border-t border-border/40 relative cursor-pointer hover:bg-muted/20 transition-colors"
                                onClick={() => onEmptySlotClick?.(h)}
                            >
                                {/* Half-hour marker */}
                                <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-border/20" />
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
                    {daySessions.map((s) => {
                        const dt = new Date(s.scheduled_at);
                        const startMin = dt.getHours() * 60 + dt.getMinutes();
                        const topPx = ((startMin - START_HOUR * 60) / 60) * SLOT_HEIGHT;
                        const heightPx = Math.max((s.duration_minutes / 60) * SLOT_HEIGHT, 28);
                        const colorIdx = doctorColorMap[s.doctor_id] ?? 0;
                        const stHex = sessionTypeColorMap[s.session_type_name];
                        const bgCls = stHex ? undefined : SESSION_BG[colorIdx % SESSION_BG.length];
                        const blockStyle = stHex
                            ? { backgroundColor: stHex + "18", borderColor: stHex + "60", color: stHex }
                            : undefined;
                        const statusCls = STATUS_CONFIG[s.status] ?? STATUS_CONFIG.pending;

                        // Handle overlaps in same hour — offset by doctor index
                        const hourSessions = slotMap[dt.getHours()] ?? [];
                        const posInHour = hourSessions.findIndex(x => x.id === s.id);
                        const overlapCount = hourSessions.length;
                        const widthPct = overlapCount > 1 ? 100 / overlapCount : 100;
                        const leftPct = posInHour * widthPct;

                        return (
                            <div key={s.id}
                                onClick={(e) => { e.stopPropagation(); onSessionClick?.(s); }}
                                className={cn(
                                    "absolute left-16 rounded-xl border px-2.5 py-1.5 overflow-hidden cursor-pointer hover:shadow-md transition-shadow z-10",
                                    bgCls
                                )}
                                style={{
                                    top: `${topPx}px`,
                                    height: `${heightPx}px`,
                                    left: `calc(4rem + ${leftPct}%)`,
                                    width: `calc(${widthPct}% - 0.75rem)`,
                                    ...blockStyle,
                                }}>
                                <p className="text-[11px] font-bold truncate leading-tight">{s.patient_name}</p>
                                <p className="text-[10px] truncate opacity-80">{s.session_type_name}</p>
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
    const { sessions, loading, refresh } = useSessions();
    const { doctors } = useStaff();
    const { sessionTypes } = useCatalog();

    const today = new Date();
    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth());
    const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());
    const [filterDoctor, setFilterDoctor] = useState<string>("all");
    const [filterSessionType, setFilterSessionType] = useState<string>("all");
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [filterOpen, setFilterOpen] = useState(false);
    const [scheduleOpen, setScheduleOpen] = useState(false);
    const [selectedDateForModal, setSelectedDateForModal] = useState<string | undefined>();
    const [selectedTimeForModal, setSelectedTimeForModal] = useState<string | undefined>();
    const [selectedSession, setSelectedSession] = useState<Session | null>(null);
    const [closures, setClosures] = useState<ClinicClosure[]>([]);
    const [closuresLoading, setClosuresLoading] = useState(false);
    const [settingsClosedDates, setSettingsClosedDates] = useState<string[]>([]);
    const [settingsWeeklyClosedDays, setSettingsWeeklyClosedDays] = useState<number[]>([]);
    // "month" | "day"
    const [viewMode, setViewMode] = useState<"month" | "day">("month");

    const doctorColorMap = useMemo(() => {
        const map: Record<string, number> = {};
        doctors.forEach((d, i) => { map[d.id] = i; });
        return map;
    }, [doctors]);

    const doctorChipMap = useMemo(() => {
        const map: Record<string, string> = {};
        doctors.forEach((d, i) => { map[d.id] = CHIP_COLORS[i % CHIP_COLORS.length]; });
        return map;
    }, [doctors]);

    const sessionTypeColorMap = useMemo(() => {
        const map: Record<string, string> = {};
        sessionTypes.forEach(st => { if (st.color) map[st.name] = st.color; });
        return map;
    }, [sessionTypes]);

    const activeDoctor = useMemo(() => {
        return doctors.find((doctor) => doctor.id === filterDoctor) ?? null;
    }, [doctors, filterDoctor]);

    const sessionTypeOptions = useMemo(() => {
        const names = new Set<string>();
        sessionTypes.forEach((sessionType) => names.add(sessionType.name));
        sessions.forEach((session) => names.add(session.session_type_name));
        return [...names].sort((a, b) => a.localeCompare(b));
    }, [sessionTypes, sessions]);

    const statusOptions = useMemo(() => {
        const preferred = ["pending", "confirmed", "completed", "cancelled", "rescheduled", "no-show"];
        const present = new Set(sessions.map((session) => session.status));
        const ordered = preferred.filter((status) => present.has(status));
        const remaining = [...present].filter((status) => !preferred.includes(status)).sort((a, b) => a.localeCompare(b));
        return [...ordered, ...remaining];
    }, [sessions]);

    const filteredSessions = useMemo(() => {
        return sessions.filter((session) => {
            if (filterDoctor !== "all" && session.doctor_id !== filterDoctor) return false;
            if (filterSessionType !== "all" && session.session_type_name !== filterSessionType) return false;
            if (filterStatus !== "all" && session.status !== filterStatus) return false;
            return true;
        });
    }, [sessions, filterDoctor, filterSessionType, filterStatus]);

    const sessionsByDate = useMemo(() => {
        const map: Record<string, Session[]> = {};
        filteredSessions.forEach(s => {
                const key = s.scheduled_at.slice(0, 10);
                if (!map[key]) map[key] = [];
                map[key].push(s);
            });
        return map;
    }, [filteredSessions]);

    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const firstDay = getFirstDay(viewYear, viewMonth);
    const cells = Array.from({ length: firstDay + daysInMonth }, (_, i) => (i < firstDay ? null : i - firstDay + 1));

    useEffect(() => {
        const from = dateKey(viewYear, viewMonth, 1);
        const to = dateKey(viewYear, viewMonth, daysInMonth);
        setClosuresLoading(true);
        calendarApi.listClosures({ from, to })
            .then(setClosures)
            .catch(() => setClosures([]))
            .finally(() => setClosuresLoading(false));
    }, [viewYear, viewMonth, daysInMonth]);

    useEffect(() => {
        settingsApi.list()
            .then((list) => {
                const map = new Map(list.map(s => [s.key, s.value]));
                setSettingsClosedDates(coerceClosedDates(map.get("clinic_closed_days")));
                setSettingsWeeklyClosedDays(coerceWeeklyClosedDays(map.get("clinic_weekly_closed_days")));
            })
            .catch(() => {
                setSettingsClosedDates([]);
                setSettingsWeeklyClosedDays([]);
            });
    }, []);

    const settingsClosuresForMonth = useMemo<CalendarClosureView[]>(() => {
        const out: CalendarClosureView[] = [];
        const monthPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-`;

        settingsClosedDates.forEach((d) => {
            if (d.startsWith(monthPrefix)) {
                out.push({
                    id: `settings_date:${d}`,
                    closure_date: d,
                    reason: "Clinic closed",
                    source: "settings_date",
                });
            }
        });

        if (settingsWeeklyClosedDays.length > 0) {
            for (let day = 1; day <= daysInMonth; day += 1) {
                const dt = new Date(viewYear, viewMonth, day);
                if (settingsWeeklyClosedDays.includes(dt.getDay())) {
                    const key = dateKey(viewYear, viewMonth, day);
                    out.push({
                        id: `settings_weekly:${key}`,
                        closure_date: key,
                        reason: "Weekly clinic closure",
                        source: "settings_weekly",
                    });
                }
            }
        }

        return out;
    }, [viewYear, viewMonth, daysInMonth, settingsClosedDates, settingsWeeklyClosedDays]);

    const closuresByDate = useMemo(() => {
        const map: Record<string, CalendarClosureView> = {};
        settingsClosuresForMonth.forEach(c => { map[c.closure_date] = c; });
        closures.forEach(c => {
            map[c.closure_date] = {
                id: c.id,
                closure_date: c.closure_date,
                reason: c.reason,
                source: "calendar",
            };
        });
        return map;
    }, [settingsClosuresForMonth, closures]);

    const monthClosures = useMemo(() => {
        return Object.values(closuresByDate).sort((a, b) => a.closure_date.localeCompare(b.closure_date));
    }, [closuresByDate]);

    const activeFilterCount = [filterDoctor, filterSessionType, filterStatus].filter((value) => value !== "all").length;

    const selectedKey = selectedDay ? dateKey(viewYear, viewMonth, selectedDay) : null;
    const selectedClosure = selectedKey ? closuresByDate[selectedKey] : undefined;
    const selectedSessions = (selectedKey ? (sessionsByDate[selectedKey] ?? []) : [])
        .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
    const selectedDate = selectedDay ? new Date(viewYear, viewMonth, selectedDay) : today;

    function prevMonth() {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
        else setViewMonth(m => m - 1);
    }
    function nextMonth() {
        if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
        else setViewMonth(m => m + 1);
    }
    function openScheduleForDay(day: number) {
        const targetDate = dateKey(viewYear, viewMonth, day);
        if (closuresByDate[targetDate]) return;
        setSelectedDateForModal(targetDate);
        setSelectedTimeForModal(undefined);
        setScheduleOpen(true);
    }

    function openEmptyTimeSlot(hour: number, date: string) {
        const time = `${String(hour).padStart(2, "0")}:00`;
        setSelectedDateForModal(date);
        setSelectedTimeForModal(time);
        setScheduleOpen(true);
    }

    function openExistingSession(session: Session) {
        setSelectedSession(session);
    }

    return (
        <div className="flex flex-col gap-4 p-4 md:p-5 min-h-full">
            {/* ── Header ─────────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">{filteredSessions.length} of {sessions.length} sessions in view</p>
                </div>
                <div className="flex items-center gap-2">
                    {/* View toggle */}
                    <div className="flex items-center gap-0.5 bg-white rounded-xl p-1 border border-border">
                        <button onClick={() => setViewMode("month")}
                            className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all",
                                viewMode === "month" ? "bg-foreground text-white" : "text-muted-foreground hover:text-foreground")}>
                            <LayoutGrid className="w-3.5 h-3.5" /> Month
                        </button>
                        <button onClick={() => { setViewMode("day"); if (!selectedDay) setSelectedDay(today.getDate()); }}
                            className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all",
                                viewMode === "day" ? "bg-foreground text-white" : "text-muted-foreground hover:text-foreground")}>
                            <CalendarDays className="w-3.5 h-3.5" /> Day
                        </button>
                    </div>
                    <button onClick={refresh}
                        className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
                        <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                    </button>
                    <Button size="sm" className="gap-1.5 rounded-xl" onClick={() => setScheduleOpen(true)}>
                        <Plus className="w-4 h-4" /> New Session
                    </Button>
                </div>
            </div>

            {/* ── Doctor filter trigger ───────────────────────────────────────── */}
            <div className="flex items-center justify-between gap-3 shrink-0">
                <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Filters</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <span className="text-sm text-muted-foreground">
                            {activeFilterCount === 0 ? "Showing all sessions" : `${activeFilterCount} active filter${activeFilterCount !== 1 ? "s" : ""}`}
                        </span>
                        {activeDoctor && <Badge variant="outline" className="rounded-full text-[10px] px-2.5">{activeDoctor.full_name}</Badge>}
                        {filterSessionType !== "all" && <Badge variant="outline" className="rounded-full text-[10px] px-2.5">{filterSessionType}</Badge>}
                        {filterStatus !== "all" && <Badge variant="outline" className="rounded-full text-[10px] px-2.5">{titleCase(filterStatus)}</Badge>}
                    </div>
                </div>
                <button
                    onClick={() => setFilterOpen(true)}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                    <Filter className="w-4 h-4" />
                    Open Filters
                </button>
            </div>

            {/* ── Month nav (shared) ──────────────────────────────────────────── */}
            <div className="flex items-center justify-between bg-white rounded-2xl px-5 py-3 shrink-0">
                <h2 className="text-base font-bold">{MONTHS[viewMonth]} {viewYear}</h2>
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => {
                            setViewMonth(today.getMonth()); setViewYear(today.getFullYear());
                            setSelectedDay(today.getDate());
                        }}
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

            {/* ── MONTH VIEW ─────────────────────────────────────────────────── */}
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
                                const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
                                const isSelected = day === selectedDay;
                                return (
                                    <div key={day}
                                        onClick={() => { setSelectedDay(day); setViewMode("day"); }}
                                        className={cn("rounded-xl p-1.5 cursor-pointer transition-all min-h-[80px] flex flex-col group relative",
                                            isSelected ? "bg-foreground text-white" : "hover:bg-muted/40",
                                            !isSelected && closure ? "border border-red-200 bg-red-50/60" : "")}>
                                        <span className={cn("text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1",
                                            isToday && !isSelected ? "bg-foreground text-white" : "",
                                            isSelected ? "text-white" : "text-foreground")}>
                                            {day}
                                        </span>
                                        {closure && (
                                            <p className={cn("text-[10px] px-1 mb-1 font-semibold", isSelected ? "text-white/85" : "text-red-600")}>
                                                Closed
                                            </p>
                                        )}
                                        <div className="space-y-0.5 flex-1">
                                            {daySessions.slice(0, 3).map((s, j) => (
                                                <div key={j} className={cn("flex items-center gap-1 rounded px-1 py-0.5",
                                                    isSelected ? "bg-white/10" : "bg-muted/60")}>
                                                    <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", doctorChipMap[s.doctor_id] ?? "bg-muted-foreground")} />
                                                    <span className={cn("text-[10px] truncate font-medium leading-none",
                                                        isSelected ? "text-white/90" : "text-foreground/70")}>
                                                        {s.patient_name.split(" ")[0]}
                                                    </span>
                                                </div>
                                            ))}
                                            {daySessions.length > 3 && (
                                                <p className={cn("text-[10px] px-1 font-medium", isSelected ? "text-white/60" : "text-muted-foreground")}>
                                                    +{daySessions.length - 3} more
                                                </p>
                                            )}
                                        </div>
                                        {!isSelected && (
                                            <button onClick={e => { e.stopPropagation(); openScheduleForDay(day); }}
                                                className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-foreground text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Plus className="w-2.5 h-2.5" />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right panel — day detail */}
                    <div className="w-full lg:w-[260px] shrink-0 flex flex-col gap-3">
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
                                <div className="flex items-center gap-1.5">
                                    {selectedDay && (
                                        <button onClick={() => setViewMode("day")}
                                            title="Open day view"
                                            className="w-7 h-7 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:bg-foreground hover:text-white transition-all">
                                            <CalendarDays className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                    <button onClick={() => selectedDay && openScheduleForDay(selectedDay)}
                                        disabled={!!selectedClosure}
                                        className="w-7 h-7 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:bg-foreground hover:text-white transition-all">
                                        <Plus className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                {loading ? (
                                    Array.from({ length: 3 }).map((_, i) => (
                                        <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
                                    ))
                                ) : selectedSessions.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-24 text-center gap-2">
                                        <p className="text-xs text-muted-foreground">{selectedClosure ? "Clinic is closed on this day" : "No sessions on this day"}</p>
                                        {!selectedClosure && (
                                            <button onClick={() => selectedDay && openScheduleForDay(selectedDay)}
                                                className="text-xs font-medium text-foreground hover:underline">
                                                + Schedule one
                                            </button>
                                        )}
                                    </div>
                                ) : selectedSessions.map(s => {
                                    const dt = new Date(s.scheduled_at);
                                    const color = doctorChipMap[s.doctor_id] ?? "bg-muted-foreground";
                                    const statusCls = STATUS_CONFIG[s.status] ?? STATUS_CONFIG.pending;
                                    return (
                                        <div key={s.id} onClick={() => openExistingSession(s)} className="bg-muted/40 rounded-xl p-3 space-y-1.5 hover:bg-muted/60 transition-colors cursor-pointer">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className={cn("w-2 h-2 rounded-full shrink-0 mt-0.5", color)} />
                                                    <span className="text-xs font-semibold truncate">{s.patient_name}</span>
                                                </div>
                                                <Badge variant="outline" className={cn("text-[9px] rounded-full px-1.5 font-medium whitespace-nowrap shrink-0", statusCls)}>
                                                    {s.status}
                                                </Badge>
                                            </div>
                                            <p className="text-[11px] text-muted-foreground truncate pl-4">{s.session_type_name}</p>
                                            <p className="text-[11px] text-muted-foreground truncate pl-4">Dr. {s.doctor_name}</p>
                                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground pl-4">
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

                        {/* Doctor legend */}
                        {doctors.length > 0 && (
                            <div className="bg-white rounded-2xl p-4 space-y-2 shrink-0">
                                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Doctors</p>
                                {doctors.slice(0, 6).map((d, i) => (
                                    <div key={d.id} className="flex items-center gap-2 cursor-pointer"
                                        onClick={() => setFilterDoctor(filterDoctor === d.id ? "all" : d.id)}>
                                        <div className={cn("w-2 h-2 rounded-full shrink-0", CHIP_COLORS[i % CHIP_COLORS.length],
                                            filterDoctor !== "all" && filterDoctor !== d.id ? "opacity-30" : "")} />
                                        <span className={cn("text-xs truncate", filterDoctor !== "all" && filterDoctor !== d.id ? "text-muted-foreground/40" : "text-muted-foreground")}>
                                            {d.full_name}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="bg-white rounded-2xl p-4 space-y-2 shrink-0">
                            <div className="flex items-center justify-between">
                                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Closures</p>
                                {closuresLoading && <span className="text-[10px] text-muted-foreground">Loading...</span>}
                            </div>
                            {monthClosures.length === 0 ? (
                                <p className="text-xs text-muted-foreground">No closure days this month.</p>
                            ) : monthClosures.map(c => (
                                <div key={c.id} className="flex items-start justify-between gap-2 rounded-xl border border-red-100 bg-red-50/60 px-2.5 py-2">
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold text-red-700">{new Date(c.closure_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
                                        <p className="text-[11px] text-red-600 truncate">{c.reason || "Clinic closed"}</p>
                                        <p className="text-[10px] text-red-500/90 mt-0.5">
                                            {c.source === "calendar" ? "Calendar closure" : "From Settings"}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── DAY VIEW ───────────────────────────────────────────────────── */}
            {viewMode === "day" && (
                <div className="flex gap-4 flex-1">
                    {/* Day nav sidebar */}
                    <div className="hidden lg:flex flex-col gap-1 w-8 shrink-0 mt-1">
                        <button onClick={() => {
                            const d = new Date(viewYear, viewMonth, (selectedDay ?? today.getDate()) - 1);
                            setViewYear(d.getFullYear()); setViewMonth(d.getMonth()); setSelectedDay(d.getDate());
                        }} className="w-8 h-8 rounded-xl bg-white border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button onClick={() => {
                            const d = new Date(viewYear, viewMonth, (selectedDay ?? today.getDate()) + 1);
                            setViewYear(d.getFullYear()); setViewMonth(d.getMonth()); setSelectedDay(d.getDate());
                        }} className="w-8 h-8 rounded-xl bg-white border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex-1 min-h-[600px]">
                        <DayView
                            date={selectedDate}
                            sessions={filteredSessions}
                            doctorColorMap={doctorColorMap}
                            sessionTypeColorMap={sessionTypeColorMap}
                            closureReason={selectedClosure?.reason ?? (selectedClosure ? "" : undefined)}
                            onAddSession={() => {
                                setSelectedDateForModal(dateKey(viewYear, viewMonth, selectedDay ?? today.getDate()));
                                setScheduleOpen(true);
                            }}
                            onSessionClick={openExistingSession}
                            onEmptySlotClick={(hour) => openEmptyTimeSlot(hour, dateKey(viewYear, viewMonth, selectedDay ?? today.getDate()))}
                        />
                    </div>
                </div>
            )}

            <NewSessionModal
                open={scheduleOpen}
                onClose={() => { setScheduleOpen(false); setSelectedDateForModal(undefined); setSelectedTimeForModal(undefined); }}
                prefill={selectedDateForModal ? { date: selectedDateForModal, time: selectedTimeForModal } : undefined}
            />

            {filterOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setFilterOpen(false)} />
                    <div className="relative w-full max-w-5xl rounded-2xl bg-white shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
                            <div>
                                <h3 className="font-bold text-sm">Calendar Filters</h3>
                                <p className="text-xs text-muted-foreground mt-0.5">Filter by doctor, session type, and status.</p>
                            </div>
                            <button
                                onClick={() => setFilterOpen(false)}
                                className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-5 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                                <div className="rounded-2xl border border-border/70 p-4 space-y-3">
                                    <div>
                                        <h4 className="text-sm font-semibold">Doctor</h4>
                                        <p className="text-xs text-muted-foreground mt-0.5">Show sessions for one doctor or everyone.</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={() => setFilterDoctor("all")}
                                            className={cn(
                                                "px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border",
                                                filterDoctor === "all"
                                                    ? "border-foreground bg-foreground text-white"
                                                    : "border-border bg-white text-muted-foreground hover:text-foreground hover:bg-muted"
                                            )}
                                        >
                                            All Doctors
                                        </button>
                                        {doctors.map((doctor, index) => {
                                            const isActive = filterDoctor === doctor.id;
                                            return (
                                                <button
                                                    key={doctor.id}
                                                    onClick={() => setFilterDoctor(doctor.id)}
                                                    className={cn(
                                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border",
                                                        isActive
                                                            ? "border-foreground bg-foreground text-white"
                                                            : "border-border bg-white text-muted-foreground hover:text-foreground hover:bg-muted"
                                                    )}
                                                >
                                                    <span className={cn("w-2 h-2 rounded-full", CHIP_COLORS[index % CHIP_COLORS.length])} />
                                                    {doctor.full_name.replace("Dr. ", "")}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-border/70 p-4 space-y-3">
                                    <div>
                                        <h4 className="text-sm font-semibold">Session Type</h4>
                                        <p className="text-xs text-muted-foreground mt-0.5">Focus on one kind of appointment.</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={() => setFilterSessionType("all")}
                                            className={cn(
                                                "px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border",
                                                filterSessionType === "all"
                                                    ? "border-foreground bg-foreground text-white"
                                                    : "border-border bg-white text-muted-foreground hover:text-foreground hover:bg-muted"
                                            )}
                                        >
                                            All Types
                                        </button>
                                        {sessionTypeOptions.map((sessionType) => {
                                            const isActive = filterSessionType === sessionType;
                                            return (
                                                <button
                                                    key={sessionType}
                                                    onClick={() => setFilterSessionType(sessionType)}
                                                    className={cn(
                                                        "px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border",
                                                        isActive
                                                            ? "border-foreground bg-foreground text-white"
                                                            : "border-border bg-white text-muted-foreground hover:text-foreground hover:bg-muted"
                                                    )}
                                                >
                                                    {sessionType}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-border/70 p-4 space-y-3">
                                    <div>
                                        <h4 className="text-sm font-semibold">Status</h4>
                                        <p className="text-xs text-muted-foreground mt-0.5">Narrow the view by booking status.</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={() => setFilterStatus("all")}
                                            className={cn(
                                                "px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border",
                                                filterStatus === "all"
                                                    ? "border-foreground bg-foreground text-white"
                                                    : "border-border bg-white text-muted-foreground hover:text-foreground hover:bg-muted"
                                            )}
                                        >
                                            All Statuses
                                        </button>
                                        {statusOptions.map((status) => {
                                            const isActive = filterStatus === status;
                                            return (
                                                <button
                                                    key={status}
                                                    onClick={() => setFilterStatus(status)}
                                                    className={cn(
                                                        "px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border capitalize",
                                                        isActive
                                                            ? "border-foreground bg-foreground text-white"
                                                            : "border-border bg-white text-muted-foreground hover:text-foreground hover:bg-muted"
                                                    )}
                                                >
                                                    {titleCase(status)}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="px-5 py-4 border-t border-border/60 flex items-center justify-between gap-3">
                            <Button
                                variant="outline"
                                className="rounded-xl"
                                onClick={() => {
                                    setFilterDoctor("all");
                                    setFilterSessionType("all");
                                    setFilterStatus("all");
                                }}
                            >
                                Reset
                            </Button>
                            <Button className="rounded-xl" onClick={() => setFilterOpen(false)}>Apply Filters</Button>
                        </div>
                    </div>
                </div>
            )}

            {selectedSession && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedSession(null)} />
                    <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
                        <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
                            <h3 className="font-bold text-sm">Session Info</h3>
                            <button onClick={() => setSelectedSession(null)} className="w-7 h-7 rounded-lg bg-muted text-muted-foreground hover:text-foreground">
                                <Plus className="w-3.5 h-3.5 rotate-45 mx-auto" />
                            </button>
                        </div>
                        <div className="p-5 space-y-3 text-sm">
                            <div>
                                <p className="text-[11px] uppercase text-muted-foreground font-semibold">Patient</p>
                                <p className="font-medium">{selectedSession.patient_name}</p>
                            </div>
                            <div>
                                <p className="text-[11px] uppercase text-muted-foreground font-semibold">Doctor</p>
                                <p className="font-medium">Dr. {selectedSession.doctor_name}</p>
                            </div>
                            <div>
                                <p className="text-[11px] uppercase text-muted-foreground font-semibold">Session Type</p>
                                <p className="font-medium">{selectedSession.session_type_name}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <p className="text-[11px] uppercase text-muted-foreground font-semibold">Date</p>
                                    <p className="font-medium">{new Date(selectedSession.scheduled_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] uppercase text-muted-foreground font-semibold">Time</p>
                                    <p className="font-medium">{new Date(selectedSession.scheduled_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <p className="text-[11px] uppercase text-muted-foreground font-semibold">Duration</p>
                                    <p className="font-medium">{selectedSession.duration_minutes} min</p>
                                </div>
                                <div>
                                    <p className="text-[11px] uppercase text-muted-foreground font-semibold">Status</p>
                                    <p className="font-medium capitalize">{selectedSession.status}</p>
                                </div>
                            </div>
                        </div>
                        <div className="px-5 py-4 border-t border-border/60 flex justify-end">
                            <Button variant="outline" className="rounded-xl" onClick={() => setSelectedSession(null)}>Close</Button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
