"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Plus, Clock, RefreshCw, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useSessions } from "@/lib/contexts/sessions-context";
import { useStaff } from "@/lib/contexts/staff-context";
import { NewSessionModal } from "@/components/modals/new-session-modal";
import type { Session } from "@/lib/api";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// Stable color per doctor id using index
const CHIP_COLORS = [
    "bg-violet-500", "bg-blue-500", "bg-emerald-500",
    "bg-amber-500", "bg-pink-500", "bg-cyan-500", "bg-orange-500", "bg-indigo-500",
];

const STATUS_CONFIG: Record<string, string> = {
    completed: "border-emerald-200 text-emerald-700 bg-emerald-50",
    confirmed: "border-blue-200 text-blue-700 bg-blue-50",
    pending: "border-amber-200 text-amber-700 bg-amber-50",
    "no-show": "border-red-200 text-red-600 bg-red-50",
    cancelled: "border-muted-foreground/30 text-muted-foreground",
    rescheduled: "border-purple-200 text-purple-600 bg-purple-50",
};

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDay(y: number, m: number) { return new Date(y, m, 1).getDay(); }
function dateKey(y: number, m: number, d: number) {
    return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export default function CalendarPage() {
    const { sessions, loading, refresh } = useSessions();
    const { doctors } = useStaff();

    const today = new Date();
    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth());
    const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());
    const [filterDoctor, setFilterDoctor] = useState<string>("all");
    const [scheduleOpen, setScheduleOpen] = useState(false);
    const [selectedDateForModal, setSelectedDateForModal] = useState<string | undefined>();

    // Build a color map — stable per doctor index
    const doctorColorMap = useMemo(() => {
        const map: Record<string, string> = {};
        doctors.forEach((d, i) => { map[d.id] = CHIP_COLORS[i % CHIP_COLORS.length]; });
        return map;
    }, [doctors]);

    // Sessions indexed by YYYY-MM-DD
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

    const selectedKey = selectedDay ? dateKey(viewYear, viewMonth, selectedDay) : null;
    const selectedSessions = (selectedKey ? (sessionsByDate[selectedKey] ?? []) : [])
        .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));

    function prevMonth() {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
        else setViewMonth(m => m - 1);
    }
    function nextMonth() {
        if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
        else setViewMonth(m => m + 1);
    }

    function openScheduleForDay(day: number) {
        setSelectedDateForModal(dateKey(viewYear, viewMonth, day));
        setScheduleOpen(true);
    }

    return (
        <div className="flex flex-col lg:flex-row h-full gap-4 p-4 md:p-5 overflow-auto lg:overflow-hidden">
            {/* ── Main calendar area ─────────────────────────────────────────── */}
            <div className="flex flex-col flex-1 min-w-0 gap-4">
                {/* Header */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">{sessions.length} sessions this period</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={refresh}
                            className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
                            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                        </button>
                        <Button size="sm" className="gap-1.5 rounded-xl" onClick={() => setScheduleOpen(true)}>
                            <Plus className="w-4 h-4" /> New Session
                        </Button>
                    </div>
                </div>

                {/* Doctor filter strip */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
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

                {/* Calendar grid */}
                <div className="bg-white rounded-2xl p-4 md:p-5 flex-1 flex flex-col">
                    {/* Month nav */}
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-lg font-bold">{MONTHS[viewMonth]} {viewYear}</h2>
                        <div className="flex items-center gap-1.5">
                            <button onClick={() => { setViewMonth(today.getMonth()); setViewYear(today.getFullYear()); setSelectedDay(today.getDate()); }}
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

                    {/* Day headers */}
                    <div className="grid grid-cols-7 mb-2">
                        {DAYS.map(d => (
                            <div key={d} className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-1">{d}</div>
                        ))}
                    </div>

                    {/* Day cells */}
                    <div className="grid grid-cols-7 gap-1 flex-1">
                        {cells.map((day, i) => {
                            if (!day) return <div key={`empty-${i}`} />;
                            const key = dateKey(viewYear, viewMonth, day);
                            const daySessions = sessionsByDate[key] ?? [];
                            const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
                            const isSelected = day === selectedDay;

                            return (
                                <div key={day} onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                                    className={cn("rounded-xl p-1.5 cursor-pointer transition-all min-h-[72px] flex flex-col group relative",
                                        isSelected ? "bg-foreground text-white" : "hover:bg-muted/40")}>
                                    <span className={cn("text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1",
                                        isToday && !isSelected ? "bg-foreground text-white" : "",
                                        isSelected ? "text-white" : "text-foreground")}>
                                        {day}
                                    </span>

                                    {/* Session chips */}
                                    <div className="space-y-0.5 flex-1">
                                        {daySessions.slice(0, 3).map((s, j) => {
                                            const color = doctorColorMap[s.doctor_id] ?? "bg-muted-foreground";
                                            return (
                                                <div key={j} className={cn("flex items-center gap-1 rounded px-1 py-0.5",
                                                    isSelected ? "bg-white/10" : "bg-muted/60")}>
                                                    <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", color)} />
                                                    <span className={cn("text-[10px] truncate font-medium leading-none",
                                                        isSelected ? "text-white/90" : "text-foreground/70")}>
                                                        {s.patient_name.split(" ")[0]}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                        {daySessions.length > 3 && (
                                            <p className={cn("text-[10px] px-1 font-medium", isSelected ? "text-white/60" : "text-muted-foreground")}>
                                                +{daySessions.length - 3} more
                                            </p>
                                        )}
                                    </div>

                                    {/* Quick add on hover */}
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
            </div>

            {/* ── Right panel ────────────────────────────────────────────────── */}
            <div className="w-full lg:w-[260px] shrink-0 flex flex-col gap-3">
                {/* Day sessions */}
                <div className="bg-white rounded-2xl flex flex-col overflow-hidden flex-1">
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
                        </div>
                        <button onClick={() => selectedDay && openScheduleForDay(selectedDay)}
                            className="w-7 h-7 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:bg-foreground hover:text-white transition-all">
                            <Plus className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {loading ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
                            ))
                        ) : selectedSessions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-24 text-center gap-2">
                                <p className="text-xs text-muted-foreground">No sessions on this day</p>
                                <button onClick={() => selectedDay && openScheduleForDay(selectedDay)}
                                    className="text-xs font-medium text-foreground hover:underline">
                                    + Schedule one
                                </button>
                            </div>
                        ) : selectedSessions.map(s => {
                            const dt = new Date(s.scheduled_at);
                            const color = doctorColorMap[s.doctor_id] ?? "bg-muted-foreground";
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
            </div>

            {/* New Session modal */}
            <NewSessionModal
                open={scheduleOpen}
                onClose={() => { setScheduleOpen(false); setSelectedDateForModal(undefined); }}
                prefill={selectedDateForModal ? { date: selectedDateForModal } : undefined}
            />
        </div>
    );
}
