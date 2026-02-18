"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Search, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import NewSessionDialog from "@/components/new-session-dialog";
import SessionDetailPanel from "@/components/session-detail-panel";

// ─── Types ────────────────────────────────────────────────────────────────────
type Session = {
    id: string;
    patientName: string;
    sessionType: string;
    doctor: string;
    doctorInitials: string;
    startTime: string; // "HH:MM"
    endTime: string;
    color: string; // tailwind bg class
    textColor: string;
    date: string; // "YYYY-MM-DD"
    status: "confirmed" | "pending" | "cancelled";
    notes?: string;
};

// ─── Mock Data ─────────────────────────────────────────────────────────────────
const TODAY = new Date();
const fmt = (d: Date) => d.toISOString().split("T")[0];

function addDays(d: Date, n: number) {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
}

const SESSIONS: Session[] = [
    {
        id: "s1",
        patientName: "Aisha Mehta",
        sessionType: "Initial Evaluation",
        doctor: "Dr. Priya Sharma",
        doctorInitials: "PS",
        startTime: "09:00",
        endTime: "10:00",
        color: "bg-violet-100 border-violet-300",
        textColor: "text-violet-700",
        date: fmt(TODAY),
        status: "confirmed",
        notes: "New patient. Lower back pain for 3 weeks.",
    },
    {
        id: "s2",
        patientName: "Rohan Kapoor",
        sessionType: "Follow-Up Session",
        doctor: "Dr. Arjun Nair",
        doctorInitials: "AN",
        startTime: "10:00",
        endTime: "11:00",
        color: "bg-blue-100 border-blue-300",
        textColor: "text-blue-700",
        date: fmt(TODAY),
        status: "confirmed",
        notes: "Post-surgical rehab — week 3.",
    },
    {
        id: "s3",
        patientName: "Sunita Rao",
        sessionType: "Follow-Up Session",
        doctor: "Dr. Priya Sharma",
        doctorInitials: "PS",
        startTime: "11:00",
        endTime: "12:00",
        color: "bg-emerald-100 border-emerald-300",
        textColor: "text-emerald-700",
        date: fmt(TODAY),
        status: "confirmed",
    },
    {
        id: "s4",
        patientName: "Vikram Singh",
        sessionType: "Discharge Assessment",
        doctor: "Dr. Arjun Nair",
        doctorInitials: "AN",
        startTime: "13:00",
        endTime: "14:00",
        color: "bg-amber-100 border-amber-300",
        textColor: "text-amber-700",
        date: fmt(TODAY),
        status: "confirmed",
    },
    {
        id: "s5",
        patientName: "Meena Joshi",
        sessionType: "Initial Evaluation",
        doctor: "Dr. Priya Sharma",
        doctorInitials: "PS",
        startTime: "14:00",
        endTime: "15:00",
        color: "bg-violet-100 border-violet-300",
        textColor: "text-violet-700",
        date: fmt(addDays(TODAY, 1)),
        status: "confirmed",
    },
    {
        id: "s6",
        patientName: "Deepak Verma",
        sessionType: "Follow-Up Session",
        doctor: "Dr. Arjun Nair",
        doctorInitials: "AN",
        startTime: "09:30",
        endTime: "10:30",
        color: "bg-blue-100 border-blue-300",
        textColor: "text-blue-700",
        date: fmt(addDays(TODAY, 2)),
        status: "pending",
    },
    {
        id: "s7",
        patientName: "Kavya Reddy",
        sessionType: "Group Therapy",
        doctor: "Dr. Priya Sharma",
        doctorInitials: "PS",
        startTime: "15:00",
        endTime: "16:00",
        color: "bg-pink-100 border-pink-300",
        textColor: "text-pink-700",
        date: fmt(addDays(TODAY, -1)),
        status: "confirmed",
    },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const HOURS = Array.from({ length: 11 }, (_, i) => i + 8); // 8 AM – 6 PM

function timeToRow(time: string) {
    const [h, m] = time.split(":").map(Number);
    return (h - 8) * 60 + m; // minutes from 8 AM
}

function durationMins(start: string, end: string) {
    return timeToRow(end) - timeToRow(start);
}

const TOTAL_MINS = 10 * 60; // 8 AM to 6 PM

function formatHour(h: number) {
    if (h === 12) return "12 PM";
    if (h > 12) return `${h - 12} PM`;
    return `${h} AM`;
}

function getWeekDays(anchor: Date) {
    const day = anchor.getDay(); // 0=Sun
    const monday = addDays(anchor, -day + 1);
    return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

// ─── Mini Calendar ────────────────────────────────────────────────────────────
function MiniCalendar({
    anchor,
    selected,
    onSelect,
}: {
    anchor: Date;
    selected: Date;
    onSelect: (d: Date) => void;
}) {
    const [viewMonth, setViewMonth] = useState(new Date(anchor.getFullYear(), anchor.getMonth(), 1));

    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = firstDay === 0 ? 6 : firstDay - 1; // Mon-based

    const cells: (number | null)[] = [
        ...Array(startOffset).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];

    return (
        <div className="select-none">
            <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold">
                    {MONTH_NAMES[month]} {year}
                </span>
                <div className="flex gap-1">
                    <button
                        onClick={() => setViewMonth(new Date(year, month - 1, 1))}
                        className="p-1 rounded hover:bg-muted transition-colors"
                    >
                        <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <button
                        onClick={() => setViewMonth(new Date(year, month + 1, 1))}
                        className="p-1 rounded hover:bg-muted transition-colors"
                    >
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                </div>
            </div>
            <div className="grid grid-cols-7 gap-y-1">
                {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
                    <div key={d} className="text-[10px] font-medium text-muted-foreground text-center py-0.5">
                        {d}
                    </div>
                ))}
                {cells.map((day, i) => {
                    if (!day) return <div key={`e-${i}`} />;
                    const date = new Date(year, month, day);
                    const isToday = fmt(date) === fmt(TODAY);
                    const isSelected = fmt(date) === fmt(selected);
                    return (
                        <button
                            key={day}
                            onClick={() => onSelect(date)}
                            className={cn(
                                "text-[12px] w-7 h-7 mx-auto rounded-full flex items-center justify-center transition-colors",
                                isSelected
                                    ? "bg-foreground text-white font-semibold"
                                    : isToday
                                        ? "bg-muted font-semibold text-foreground"
                                        : "hover:bg-muted text-foreground"
                            )}
                        >
                            {day}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Session Block ─────────────────────────────────────────────────────────────
function SessionBlock({
    session,
    onClick,
}: {
    session: Session;
    onClick: () => void;
}) {
    const topPct = (timeToRow(session.startTime) / TOTAL_MINS) * 100;
    const heightPct = (durationMins(session.startTime, session.endTime) / TOTAL_MINS) * 100;

    return (
        <button
            onClick={onClick}
            style={{ top: `${topPct}%`, height: `${heightPct}%` }}
            className={cn(
                "absolute left-1 right-1 rounded-md border px-2 py-1 text-left overflow-hidden transition-all hover:brightness-95 hover:shadow-sm",
                session.color
            )}
        >
            <p className={cn("text-[11px] font-semibold leading-tight truncate", session.textColor)}>
                {session.patientName}
            </p>
            <p className={cn("text-[10px] leading-tight truncate opacity-80", session.textColor)}>
                {session.sessionType}
            </p>
            <p className={cn("text-[10px] leading-tight truncate opacity-70 mt-0.5", session.textColor)}>
                {session.startTime} – {session.endTime}
            </p>
        </button>
    );
}

// ─── Main Calendar Page ────────────────────────────────────────────────────────
export default function CalendarPage() {
    const [weekAnchor, setWeekAnchor] = useState(TODAY);
    const [selectedDate, setSelectedDate] = useState(TODAY);
    const [selectedSession, setSelectedSession] = useState<Session | null>(null);
    const [newSessionOpen, setNewSessionOpen] = useState(false);
    const [viewMode] = useState<"weekly">("weekly");

    const weekDays = getWeekDays(weekAnchor);

    const prevWeek = () => setWeekAnchor(addDays(weekAnchor, -7));
    const nextWeek = () => setWeekAnchor(addDays(weekAnchor, 7));
    const goToday = () => { setWeekAnchor(TODAY); setSelectedDate(TODAY); };

    const handleDaySelect = (d: Date) => {
        setSelectedDate(d);
        setWeekAnchor(d);
    };

    // Today's upcoming sessions for the left panel
    const todaySessions = SESSIONS
        .filter((s) => s.date === fmt(selectedDate))
        .sort((a, b) => a.startTime.localeCompare(b.startTime));

    const nextSession = todaySessions.find((s) => s.startTime >= new Date().toTimeString().slice(0, 5));

    return (
        <div className="flex h-full overflow-hidden">
            {/* ── Left Panel ── */}
            <div className="w-[260px] shrink-0 border-r border-border bg-white flex flex-col overflow-y-auto">
                <div className="p-5 space-y-5">
                    {/* Date header */}
                    <div className="flex items-start gap-3">
                        <div className="flex flex-col items-center bg-red-500 text-white rounded-lg px-3 py-1.5 min-w-[52px]">
                            <span className="text-[10px] font-bold uppercase tracking-wider">
                                {MONTH_NAMES[selectedDate.getMonth()].slice(0, 3)}
                            </span>
                            <span className="text-2xl font-bold leading-none">{selectedDate.getDate()}</span>
                        </div>
                        <div>
                            <p className="font-semibold text-sm">
                                {MONTH_NAMES[selectedDate.getMonth()]} {selectedDate.getDate()}, {selectedDate.getFullYear()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][selectedDate.getDay()]}
                            </p>
                        </div>
                    </div>

                    {/* Mini calendar */}
                    <MiniCalendar
                        anchor={weekAnchor}
                        selected={selectedDate}
                        onSelect={handleDaySelect}
                    />
                </div>

                {/* Divider */}
                <div className="border-t border-border" />

                {/* Next session / selected day detail */}
                <div className="p-5 flex-1">
                    {nextSession ? (
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <p className="font-semibold text-sm">{nextSession.patientName}</p>
                                <span className="text-[10px] text-orange-500 font-medium flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> upcoming
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground mb-0.5">{nextSession.sessionType}</p>
                            <p className="text-xs text-muted-foreground mb-3">
                                {nextSession.startTime} – {nextSession.endTime} · {nextSession.doctor}
                            </p>
                            {nextSession.notes && (
                                <p className="text-xs text-muted-foreground bg-muted rounded-md p-2.5 leading-relaxed">
                                    {nextSession.notes}
                                </p>
                            )}
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground">No upcoming sessions today.</p>
                    )}

                    {/* Today's session list */}
                    {todaySessions.length > 0 && (
                        <div className="mt-4 space-y-2">
                            <p className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">
                                {fmt(selectedDate) === fmt(TODAY) ? "Today" : MONTH_NAMES[selectedDate.getMonth()] + " " + selectedDate.getDate()}
                            </p>
                            {todaySessions.map((s) => (
                                <button
                                    key={s.id}
                                    onClick={() => setSelectedSession(s)}
                                    className="w-full text-left flex items-start gap-2.5 p-2 rounded-md hover:bg-muted transition-colors"
                                >
                                    <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0", s.color.split(" ")[0].replace("bg-", "bg-").replace("100", "400"))} />
                                    <div className="min-w-0">
                                        <p className="text-xs font-medium truncate">{s.patientName}</p>
                                        <p className="text-[11px] text-muted-foreground">{s.startTime} · {s.doctor.split(" ")[1]}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Main Calendar Area ── */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Calendar toolbar */}
                <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-white shrink-0">
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl font-semibold">Calendar</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Filter tabs */}
                        <div className="flex items-center bg-muted rounded-lg p-0.5 text-sm">
                            {["All Sessions", "Confirmed", "Pending"].map((t) => (
                                <button
                                    key={t}
                                    className={cn(
                                        "px-3 py-1 rounded-md transition-colors text-xs font-medium",
                                        t === "All Sessions"
                                            ? "bg-white shadow-sm text-foreground"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-1 border border-border rounded-md">
                            <button onClick={prevWeek} className="p-1.5 hover:bg-muted transition-colors rounded-l-md">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button onClick={goToday} className="px-3 py-1 text-xs font-medium hover:bg-muted transition-colors">
                                Today
                            </button>
                            <button onClick={nextWeek} className="p-1.5 hover:bg-muted transition-colors rounded-r-md">
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>

                        <button className="p-1.5 border border-border rounded-md hover:bg-muted transition-colors">
                            <Search className="w-4 h-4 text-muted-foreground" />
                        </button>

                        <Button
                            size="sm"
                            className="gap-1.5 text-xs"
                            onClick={() => setNewSessionOpen(true)}
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Add Session
                        </Button>
                    </div>
                </div>

                {/* Week grid */}
                <div className="flex-1 overflow-auto">
                    <div className="flex h-full min-w-[700px]">
                        {/* Time column */}
                        <div className="w-16 shrink-0 border-r border-border bg-white sticky left-0 z-10">
                            {/* Day headers spacer */}
                            <div className="h-14 border-b border-border" />
                            {/* Hour labels */}
                            <div className="relative" style={{ height: `${TOTAL_MINS * 1.2}px` }}>
                                {HOURS.map((h) => (
                                    <div
                                        key={h}
                                        className="absolute w-full flex items-start justify-end pr-2"
                                        style={{ top: `${((h - 8) * 60 / TOTAL_MINS) * 100}%` }}
                                    >
                                        <span className="text-[10px] text-muted-foreground -translate-y-2">
                                            {formatHour(h)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Day columns */}
                        <div className="flex flex-1">
                            {weekDays.map((day, di) => {
                                const isToday = fmt(day) === fmt(TODAY);
                                const isSelected = fmt(day) === fmt(selectedDate);
                                const daySessions = SESSIONS.filter((s) => s.date === fmt(day));

                                return (
                                    <div
                                        key={di}
                                        className="flex-1 border-r border-border last:border-r-0 flex flex-col"
                                    >
                                        {/* Day header */}
                                        <div
                                            className={cn(
                                                "h-14 border-b border-border flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-colors sticky top-0 bg-white z-10",
                                                isSelected && !isToday ? "bg-muted/50" : ""
                                            )}
                                            onClick={() => setSelectedDate(day)}
                                        >
                                            <span className="text-[11px] text-muted-foreground font-medium">
                                                {DAY_LABELS[di]}
                                            </span>
                                            <span
                                                className={cn(
                                                    "text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full",
                                                    isToday
                                                        ? "bg-foreground text-white"
                                                        : isSelected
                                                            ? "bg-muted text-foreground"
                                                            : "text-foreground"
                                                )}
                                            >
                                                {day.getDate()}
                                            </span>
                                            <span className="text-[9px] text-muted-foreground">
                                                {MONTH_NAMES[day.getMonth()].slice(0, 3)} {day.getFullYear()}
                                            </span>
                                        </div>

                                        {/* Time grid */}
                                        <div
                                            className="relative flex-1"
                                            style={{ height: `${TOTAL_MINS * 1.2}px` }}
                                        >
                                            {/* Hour lines */}
                                            {HOURS.map((h) => (
                                                <div
                                                    key={h}
                                                    className="absolute w-full border-t border-border/60"
                                                    style={{ top: `${((h - 8) * 60 / TOTAL_MINS) * 100}%` }}
                                                />
                                            ))}

                                            {/* Current time indicator */}
                                            {isToday && (() => {
                                                const now = new Date();
                                                const mins = (now.getHours() - 8) * 60 + now.getMinutes();
                                                if (mins < 0 || mins > TOTAL_MINS) return null;
                                                return (
                                                    <div
                                                        className="absolute left-0 right-0 z-20 flex items-center"
                                                        style={{ top: `${(mins / TOTAL_MINS) * 100}%` }}
                                                    >
                                                        <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                                                        <div className="flex-1 h-px bg-red-500" />
                                                    </div>
                                                );
                                            })()}

                                            {/* Session blocks */}
                                            {daySessions.map((s) => (
                                                <SessionBlock
                                                    key={s.id}
                                                    session={s}
                                                    onClick={() => setSelectedSession(s)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Session Detail Panel ── */}
            {selectedSession && (
                <SessionDetailPanel
                    session={selectedSession}
                    onClose={() => setSelectedSession(null)}
                />
            )}

            {/* ── New Session Dialog ── */}
            <NewSessionDialog
                open={newSessionOpen}
                onClose={() => setNewSessionOpen(false)}
                defaultDate={selectedDate}
            />
        </div>
    );
}
