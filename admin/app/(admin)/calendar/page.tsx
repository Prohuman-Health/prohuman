"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
    ChevronLeft, ChevronRight, Plus, Clock, RefreshCw, Filter,
    CalendarDays, LayoutGrid, Ban, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useSessions } from "@/lib/contexts/sessions-context";
import { useStaff } from "@/lib/contexts/staff-context";
import { useCatalog } from "@/lib/contexts/catalog-context";
import { NewSessionModal } from "@/components/modals/new-session-modal";
import { calendarApi, type Session, type ClinicClosure } from "@/lib/api";

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

// ── Day View ──────────────────────────────────────────────────────────────────
function DayView({
    date, sessions, doctorColorMap, sessionTypeColorMap, filterDoctor, onAddSession, closureReason,
}: {
    date: Date;
    sessions: Session[];
    doctorColorMap: Record<string, number>;
    sessionTypeColorMap: Record<string, string>;
    filterDoctor: string;
    onAddSession: () => void;
    closureReason?: string | null;
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
        return d.toDateString() === date.toDateString() &&
            (filterDoctor === "all" || s.doctor_id === filterDoctor);
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
                            <div className="flex-1 border-t border-border/40 relative">
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
    const [scheduleOpen, setScheduleOpen] = useState(false);
    const [selectedDateForModal, setSelectedDateForModal] = useState<string | undefined>();
    const [closures, setClosures] = useState<ClinicClosure[]>([]);
    const [closuresLoading, setClosuresLoading] = useState(false);
    const [closureOpen, setClosureOpen] = useState(false);
    const [closureDate, setClosureDate] = useState(today.toISOString().slice(0, 10));
    const [closureReason, setClosureReason] = useState("");
    const [closureSaving, setClosureSaving] = useState(false);
    const [closureError, setClosureError] = useState<string | null>(null);
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

    const sessionsByDate = useMemo(() => {
        const map: Record<string, Session[]> = {};
        sessions.filter(s => filterDoctor === "all" || s.doctor_id === filterDoctor)
            .forEach(s => {
                const key = s.scheduled_at.slice(0, 10);
                if (!map[key]) map[key] = [];
                map[key].push(s);
            });
        return map;
    }, [sessions, filterDoctor]);

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

    const closuresByDate = useMemo(() => {
        const map: Record<string, ClinicClosure> = {};
        closures.forEach(c => { map[c.closure_date] = c; });
        return map;
    }, [closures]);

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
        setScheduleOpen(true);
    }

    async function createClosure() {
        if (!closureDate) return;
        setClosureSaving(true);
        setClosureError(null);
        try {
            await calendarApi.createClosure({
                closure_date: closureDate,
                ...(closureReason.trim() ? { reason: closureReason.trim() } : {}),
            });
            const from = dateKey(viewYear, viewMonth, 1);
            const to = dateKey(viewYear, viewMonth, daysInMonth);
            setClosures(await calendarApi.listClosures({ from, to }));
            setClosureOpen(false);
            setClosureReason("");
        } catch (e) {
            setClosureError(e instanceof Error ? e.message : "Failed to save closure");
        } finally {
            setClosureSaving(false);
        }
    }

    async function removeClosure(id: string) {
        try {
            await calendarApi.deleteClosure(id);
            setClosures(prev => prev.filter(c => c.id !== id));
        } catch {
            // ignore
        }
    }

    return (
        <div className="flex flex-col gap-4 p-4 md:p-5 min-h-full">
            {/* ── Header ─────────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">{sessions.length} sessions this period</p>
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
                    <Button size="sm" variant="outline" className="gap-1.5 rounded-xl" onClick={() => {
                        const d = selectedDay ? dateKey(viewYear, viewMonth, selectedDay) : today.toISOString().slice(0, 10);
                        setClosureDate(d);
                        setClosureReason(selectedClosure?.reason ?? "");
                        setClosureError(null);
                        setClosureOpen(true);
                    }}>
                        <Ban className="w-4 h-4" /> Add Closure
                    </Button>
                </div>
            </div>

            {/* ── Doctor filter strip ─────────────────────────────────────────── */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 shrink-0">
                <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <button onClick={() => setFilterDoctor("all")}
                    className={cn("px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all",
                        filterDoctor === "all" ? "bg-foreground text-white" : "bg-white text-muted-foreground hover:text-foreground border border-border")}>
                    All Doctors
                </button>
                {doctors.map((d, i) => (
                    <button key={d.id} onClick={() => setFilterDoctor(filterDoctor === d.id ? "all" : d.id)}
                        className={cn("px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5",
                            filterDoctor === d.id ? "bg-foreground text-white" : "bg-white text-muted-foreground hover:text-foreground border border-border")}>
                        <span className={cn("w-2 h-2 rounded-full", CHIP_COLORS[i % CHIP_COLORS.length])} />
                        {d.full_name.replace("Dr. ", "")}
                    </button>
                ))}
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
                                        <div key={s.id} className="bg-muted/40 rounded-xl p-3 space-y-1.5 hover:bg-muted/60 transition-colors cursor-pointer">
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
                            {closures.length === 0 ? (
                                <p className="text-xs text-muted-foreground">No closure days this month.</p>
                            ) : closures.map(c => (
                                <div key={c.id} className="flex items-start justify-between gap-2 rounded-xl border border-red-100 bg-red-50/60 px-2.5 py-2">
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold text-red-700">{new Date(c.closure_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
                                        <p className="text-[11px] text-red-600 truncate">{c.reason || "Clinic closed"}</p>
                                    </div>
                                    <button onClick={() => removeClosure(c.id)} className="p-1 rounded-lg text-red-500 hover:bg-red-100 transition-colors">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
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
                        {/* Previous / next day */}
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
                            sessions={sessions}
                            doctorColorMap={doctorColorMap}
                            sessionTypeColorMap={sessionTypeColorMap}
                            filterDoctor={filterDoctor}
                            closureReason={selectedClosure?.reason ?? (selectedClosure ? "" : undefined)}
                            onAddSession={() => {
                                setSelectedDateForModal(dateKey(viewYear, viewMonth, selectedDay ?? today.getDate()));
                                setScheduleOpen(true);
                            }}
                        />
                    </div>
                </div>
            )}

            <NewSessionModal
                open={scheduleOpen}
                onClose={() => { setScheduleOpen(false); setSelectedDateForModal(undefined); }}
                prefill={selectedDateForModal ? { date: selectedDateForModal } : undefined}
            />

            {closureOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setClosureOpen(false)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="px-5 py-4 border-b border-border/60">
                            <h3 className="font-bold text-sm">Add Clinic Closure</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">Closed days will be blocked from scheduling</p>
                        </div>
                        <div className="p-5 space-y-3">
                            {closureError && <p className="text-xs text-red-600">{closureError}</p>}
                            <div className="space-y-1">
                                <label className="text-xs font-semibold">Date</label>
                                <input type="date" value={closureDate} onChange={e => setClosureDate(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold">Reason</label>
                                <textarea value={closureReason} onChange={e => setClosureReason(e.target.value)} rows={2} placeholder="Holiday / maintenance / staff leave"
                                    className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm resize-none focus:outline-none" />
                            </div>
                        </div>
                        <div className="px-5 py-4 border-t border-border/60 flex justify-end gap-2">
                            <Button variant="outline" className="rounded-xl" onClick={() => setClosureOpen(false)} disabled={closureSaving}>Cancel</Button>
                            <Button className="rounded-xl gap-1.5" onClick={createClosure} disabled={closureSaving || !closureDate}>
                                {closureSaving ? "Saving..." : "Save Closure"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
