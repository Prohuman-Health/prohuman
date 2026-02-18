"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const SESSIONS: Record<string, { patient: string; doctor: string; type: string; time: string; color: string }[]> = {
    "2025-02-17": [
        { patient: "Aisha Mehta", doctor: "Dr. Priya Sharma", type: "Initial Evaluation", time: "09:00", color: "bg-violet-500" },
        { patient: "Rohan Kapoor", doctor: "Dr. Arjun Nair", type: "Follow-Up", time: "11:00", color: "bg-blue-500" },
    ],
    "2025-02-18": [
        { patient: "Sunita Rao", doctor: "Dr. Priya Sharma", type: "Follow-Up", time: "10:00", color: "bg-emerald-500" },
        { patient: "Vikram Singh", doctor: "Dr. Arjun Nair", type: "Discharge", time: "13:00", color: "bg-amber-500" },
        { patient: "Meena Joshi", doctor: "Dr. Kiran Das", type: "Initial Evaluation", time: "15:00", color: "bg-pink-500" },
    ],
    "2025-02-19": [
        { patient: "Deepak Verma", doctor: "Dr. Priya Sharma", type: "Follow-Up", time: "09:30", color: "bg-cyan-500" },
    ],
    "2025-02-20": [
        { patient: "Kavya Reddy", doctor: "Dr. Arjun Nair", type: "Group Therapy", time: "14:00", color: "bg-violet-500" },
        { patient: "Aisha Mehta", doctor: "Dr. Priya Sharma", type: "Follow-Up", time: "16:00", color: "bg-blue-500" },
    ],
    "2025-02-24": [
        { patient: "Rohan Kapoor", doctor: "Dr. Kiran Das", type: "Follow-Up", time: "10:00", color: "bg-emerald-500" },
    ],
};

function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
    return new Date(year, month, 1).getDay();
}

function dateKey(year: number, month: number, day: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function CalendarPage() {
    const today = new Date();
    const [viewYear, setViewYear] = useState(2025);
    const [viewMonth, setViewMonth] = useState(1); // February 2025
    const [selectedDay, setSelectedDay] = useState<number | null>(18);

    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
    const cells = Array.from({ length: firstDay + daysInMonth }, (_, i) => (i < firstDay ? null : i - firstDay + 1));

    const selectedKey = selectedDay ? dateKey(viewYear, viewMonth, selectedDay) : null;
    const selectedSessions = selectedKey ? (SESSIONS[selectedKey] ?? []) : [];

    function prevMonth() {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
        else setViewMonth(m => m - 1);
    }
    function nextMonth() {
        if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
        else setViewMonth(m => m + 1);
    }

    return (
        <div className="flex h-full gap-4 p-5 overflow-hidden">
            {/* Calendar */}
            <div className="flex flex-col flex-1 min-w-0 gap-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">View and manage all scheduled sessions.</p>
                    </div>
                    <Button size="sm" className="gap-1.5 rounded-xl">
                        <Plus className="w-4 h-4" /> New Session
                    </Button>
                </div>

                {/* Month nav */}
                <div className="bg-white rounded-2xl p-5 flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-lg font-bold">{MONTHS[viewMonth]} {viewYear}</h2>
                        <div className="flex items-center gap-1">
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
                        {DAYS.map((d) => (
                            <div key={d} className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-1">{d}</div>
                        ))}
                    </div>

                    {/* Grid */}
                    <div className="grid grid-cols-7 gap-1 flex-1">
                        {cells.map((day, i) => {
                            if (!day) return <div key={`empty-${i}`} />;
                            const key = dateKey(viewYear, viewMonth, day);
                            const daySessions = SESSIONS[key] ?? [];
                            const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
                            const isSelected = day === selectedDay;

                            return (
                                <div
                                    key={day}
                                    onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                                    className={cn(
                                        "rounded-xl p-1.5 cursor-pointer transition-all min-h-[72px] flex flex-col",
                                        isSelected ? "bg-foreground text-white" : "hover:bg-muted/50",
                                    )}
                                >
                                    <span className={cn(
                                        "text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1",
                                        isToday && !isSelected ? "bg-foreground text-white" : "",
                                        isSelected ? "text-white" : "text-foreground",
                                    )}>
                                        {day}
                                    </span>
                                    <div className="space-y-0.5">
                                        {daySessions.slice(0, 2).map((s, j) => (
                                            <div key={j} className={cn("flex items-center gap-1 rounded px-1 py-0.5", isSelected ? "bg-white/10" : "bg-muted/60")}>
                                                <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", s.color)} />
                                                <span className={cn("text-[10px] truncate font-medium", isSelected ? "text-white/90" : "text-foreground/70")}>{s.patient.split(" ")[0]}</span>
                                            </div>
                                        ))}
                                        {daySessions.length > 2 && (
                                            <p className={cn("text-[10px] px-1 font-medium", isSelected ? "text-white/60" : "text-muted-foreground")}>+{daySessions.length - 2} more</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Side panel */}
            <div className="w-[260px] shrink-0 flex flex-col gap-4">
                {/* Selected day sessions */}
                <div className="bg-white rounded-2xl flex flex-col overflow-hidden flex-1">
                    <div className="px-5 py-4 border-b border-border/60">
                        <h2 className="font-semibold text-sm">
                            {selectedDay
                                ? `${MONTHS[viewMonth]} ${selectedDay}, ${viewYear}`
                                : "Select a day"}
                        </h2>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                            {selectedSessions.length > 0 ? `${selectedSessions.length} session${selectedSessions.length > 1 ? "s" : ""}` : "No sessions"}
                        </p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {selectedSessions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-24 text-center">
                                <p className="text-xs text-muted-foreground">No sessions scheduled</p>
                                <button className="text-xs text-foreground font-medium mt-2 hover:underline">+ Add session</button>
                            </div>
                        ) : (
                            selectedSessions.map((s, i) => (
                                <div key={i} className="bg-muted/40 rounded-xl p-3 space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        <div className={cn("w-2 h-2 rounded-full shrink-0", s.color)} />
                                        <span className="text-xs font-semibold">{s.patient}</span>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">{s.type}</p>
                                    <p className="text-[11px] text-muted-foreground">{s.doctor}</p>
                                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                        <Clock className="w-3 h-3" />
                                        {s.time}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Mini legend */}
                <div className="bg-white rounded-2xl p-4 space-y-2 shrink-0">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Session Types</p>
                    {[
                        { label: "Initial Evaluation", color: "bg-violet-500" },
                        { label: "Follow-Up Session", color: "bg-blue-500" },
                        { label: "Discharge Assessment", color: "bg-amber-500" },
                        { label: "Group Therapy", color: "bg-pink-500" },
                    ].map((item) => (
                        <div key={item.label} className="flex items-center gap-2">
                            <div className={cn("w-2 h-2 rounded-full shrink-0", item.color)} />
                            <span className="text-xs text-muted-foreground">{item.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
