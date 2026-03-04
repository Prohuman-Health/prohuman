"use client";

import { useState } from "react";
import { Plus, Search, Clock, MoreHorizontal, X, ChevronLeft, ChevronRight, CalendarDays, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const DOCTORS = [
    { id: "d1", name: "Dr. Priya Sharma", specialization: "Musculoskeletal Physiotherapy", phone: "+91 98765 43210", email: "priya.sharma@prohuman.in", schedule: "Mon–Fri, 9 AM–5 PM", status: "active", sessions: 24 },
    { id: "d2", name: "Dr. Arjun Nair", specialization: "Sports Rehabilitation", phone: "+91 87654 32109", email: "arjun.nair@prohuman.in", schedule: "Mon–Sat, 10 AM–6 PM", status: "active", sessions: 18 },
    { id: "d3", name: "Dr. Meera Iyer", specialization: "Neurological Physiotherapy", phone: "+91 76543 21098", email: "meera.iyer@prohuman.in", schedule: "Tue–Sat, 9 AM–3 PM", status: "unavailable", sessions: 8 },
    { id: "d4", name: "Dr. Kiran Das", specialization: "Paediatric Physiotherapy", phone: "+91 65432 10987", email: "kiran.das@prohuman.in", schedule: "Mon–Fri, 8 AM–4 PM", status: "active", sessions: 27 },
    { id: "d5", name: "Dr. Ananya Bose", specialization: "Geriatric Physiotherapy", phone: "+91 54321 09876", email: "ananya.bose@prohuman.in", schedule: "Mon–Thu, 9 AM–5 PM", status: "active", sessions: 15 },
];

const AVATAR_COLORS = [
    "bg-violet-100 text-violet-700", "bg-blue-100 text-blue-700",
    "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-700", "bg-pink-100 text-pink-700",
];

// Availability slots per doctor: "available" | "booked" | "break" | "unavailable"
type SlotStatus = "available" | "booked" | "break" | "unavailable";

const AVAILABILITY: Record<string, Record<string, SlotStatus>> = {
    d1: { Mon: "available", Tue: "available", Wed: "booked", Thu: "available", Fri: "available", Sat: "unavailable", Sun: "unavailable" },
    d2: { Mon: "available", Tue: "booked", Wed: "available", Thu: "booked", Fri: "available", Sat: "available", Sun: "unavailable" },
    d3: { Mon: "unavailable", Tue: "available", Wed: "break", Thu: "booked", Fri: "available", Sat: "available", Sun: "unavailable" },
    d4: { Mon: "booked", Tue: "available", Wed: "available", Thu: "booked", Fri: "available", Sat: "unavailable", Sun: "unavailable" },
    d5: { Mon: "available", Tue: "booked", Wed: "available", Thu: "available", Fri: "unavailable", Sat: "unavailable", Sun: "unavailable" },
};

// Per-doctor scheduled sessions mapped by date key
const DOCTOR_SESSIONS: Record<string, Record<string, { patient: string; time: string; type: string; color: string }[]>> = {
    d1: {
        "2026-03-02": [
            { patient: "Aisha Mehta", time: "09:00", type: "Initial Evaluation", color: "bg-violet-500" },
            { patient: "Sunita Rao", time: "11:00", type: "Follow-Up", color: "bg-emerald-500" },
        ],
        "2026-03-04": [
            { patient: "Deepak Verma", time: "09:30", type: "Follow-Up", color: "bg-cyan-500" },
            { patient: "Meena Joshi", time: "14:00", type: "Discharge", color: "bg-amber-500" },
        ],
        "2026-03-07": [
            { patient: "Rohan Kapoor", time: "10:00", type: "Follow-Up", color: "bg-blue-500" },
        ],
    },
    d2: {
        "2026-03-03": [
            { patient: "Vikram Singh", time: "10:00", type: "Discharge Assessment", color: "bg-amber-500" },
        ],
        "2026-03-05": [
            { patient: "Kavya Reddy", time: "14:00", type: "Group Therapy", color: "bg-violet-500" },
            { patient: "Rohan Kapoor", time: "16:00", type: "Follow-Up", color: "bg-blue-500" },
        ],
    },
    d3: {
        "2026-03-04": [
            { patient: "Nisha Verma", time: "09:00", type: "Neuro Assessment", color: "bg-cyan-500" },
        ],
    },
    d4: {
        "2026-03-02": [
            { patient: "Aryan Patel", time: "08:00", type: "Paediatric Eval", color: "bg-pink-500" },
        ],
        "2026-03-06": [
            { patient: "Sneha Mehta", time: "10:00", type: "Follow-Up", color: "bg-emerald-500" },
        ],
    },
    d5: {
        "2026-03-03": [
            { patient: "Kamla Devi", time: "09:00", type: "Geriatric Eval", color: "bg-amber-500" },
            { patient: "Ramesh Shenoy", time: "11:00", type: "Follow-Up", color: "bg-violet-500" },
        ],
    },
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDay(y: number, m: number) { return new Date(y, m, 1).getDay(); }
function dateKey(y: number, m: number, d: number) {
    return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

const SLOT_STYLE: Record<SlotStatus, string> = {
    available: "bg-emerald-100 text-emerald-700 border-emerald-200",
    booked: "bg-amber-100 text-amber-700 border-amber-200",
    break: "bg-blue-100 text-blue-700 border-blue-200",
    unavailable: "bg-muted/60 text-muted-foreground border-border",
};

type ViewMode = "list" | "calendar";

export default function DoctorsPage() {
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<typeof DOCTORS[0] | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>("list");

    // Calendar state
    const now = new Date();
    const [viewYear, setViewYear] = useState(now.getFullYear());
    const [viewMonth, setViewMonth] = useState(now.getMonth());
    const [selectedDay, setSelectedDay] = useState<number | null>(now.getDate());

    const filtered = DOCTORS.filter(
        (d) => d.name.toLowerCase().includes(search.toLowerCase()) || d.specialization.toLowerCase().includes(search.toLowerCase())
    );

    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const firstDay = getFirstDay(viewYear, viewMonth);
    const cells = Array.from({ length: firstDay + daysInMonth }, (_, i) => (i < firstDay ? null : i - firstDay + 1));

    const selectedKey = selectedDay ? dateKey(viewYear, viewMonth, selectedDay) : null;
    const docSessions = selected ? (DOCTOR_SESSIONS[selected.id] ?? {}) : {};
    const daySessions = selectedKey ? (docSessions[selectedKey] ?? []) : [];

    function prevMonth() {
        if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
        else setViewMonth((m) => m - 1);
    }
    function nextMonth() {
        if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
        else setViewMonth((m) => m + 1);
    }

    const availability = selected ? (AVAILABILITY[selected.id] ?? {}) : {};
    const DOW_MAP: Record<number, string> = { 0: "Sun", 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat" };

    return (
        <div className="flex flex-col h-full overflow-hidden gap-4 p-4 md:p-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight">Doctors</h1>
                    <p className="text-sm text-muted-foreground mt-0.5 hidden sm:block">Manage clinic doctors, schedules and individual calendars.</p>
                </div>
                <Button size="sm" className="gap-1.5 rounded-xl shrink-0">
                    <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Doctor</span>
                </Button>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder="Search doctors..." className="pl-9 rounded-xl bg-white" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            {/* Main area */}
            <div className="flex gap-4 flex-1 min-h-0">
                {/* Table card */}
                <div className="bg-white rounded-2xl overflow-hidden flex-1 min-w-0 flex flex-col">
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-sm min-w-[600px]">
                            <thead className="border-b border-border sticky top-0 bg-white z-10">
                                <tr>
                                    {["Doctor", "Specialization", "Schedule", "Sessions", "Status", ""].map((h) => (
                                        <th key={h} className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 md:px-5 py-3.5">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((d, i) => (
                                    <tr
                                        key={d.id}
                                        onClick={() => { setSelected(selected?.id === d.id ? null : d); setViewMode("list"); setSelectedDay(now.getDate()); setViewYear(now.getFullYear()); setViewMonth(now.getMonth()); }}
                                        className={cn("border-b border-border/60 cursor-pointer transition-colors hover:bg-muted/30", selected?.id === d.id && "bg-muted/50")}
                                    >
                                        <td className="px-4 md:px-5 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0", AVATAR_COLORS[i % AVATAR_COLORS.length])}>
                                                    {d.name.split(" ")[1]?.charAt(0)}
                                                </div>
                                                <span className="font-medium whitespace-nowrap">{d.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 md:px-5 py-3.5 text-muted-foreground">{d.specialization}</td>
                                        <td className="px-4 md:px-5 py-3.5 text-muted-foreground text-xs whitespace-nowrap">
                                            <span className="flex items-center gap-1.5"><Clock className="w-3 h-3 shrink-0" />{d.schedule}</span>
                                        </td>
                                        <td className="px-4 md:px-5 py-3.5 text-center font-semibold">{d.sessions}</td>
                                        <td className="px-4 md:px-5 py-3.5">
                                            <Badge variant="outline" className={cn("text-[10px] rounded-full px-2.5 font-medium capitalize whitespace-nowrap",
                                                d.status === "active" ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-red-200 text-red-600 bg-red-50"
                                            )}>
                                                {d.status}
                                            </Badge>
                                        </td>
                                        <td className="px-4 md:px-5 py-3.5">
                                            <button className="text-muted-foreground hover:text-foreground transition-colors" onClick={(e) => e.stopPropagation()}>
                                                <MoreHorizontal className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Detail + Calendar Panel — side on lg */}
                {selected && (
                    <div className="hidden lg:flex w-[300px] shrink-0 bg-white rounded-2xl flex-col overflow-hidden">
                        {/* Panel header with tabs */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
                            <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
                                <button
                                    onClick={() => setViewMode("list")}
                                    className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all", viewMode === "list" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
                                >
                                    <User className="w-3 h-3" /> Profile
                                </button>
                                <button
                                    onClick={() => setViewMode("calendar")}
                                    className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all", viewMode === "calendar" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
                                >
                                    <CalendarDays className="w-3 h-3" /> Calendar
                                </button>
                            </div>
                            <button onClick={() => setSelected(null)} className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground text-xs transition-colors">✕</button>
                        </div>

                        {/* Profile view */}
                        {viewMode === "list" && (
                            <div className="p-5 space-y-5 flex-1 overflow-y-auto">
                                <div className="flex flex-col items-center text-center gap-2.5">
                                    <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold", AVATAR_COLORS[DOCTORS.indexOf(selected) % AVATAR_COLORS.length])}>
                                        {selected.name.split(" ")[1]?.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-bold text-base">{selected.name}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">{selected.specialization}</p>
                                    </div>
                                    <Badge variant="outline" className={cn("text-[10px] rounded-full px-2.5 font-medium capitalize",
                                        selected.status === "active" ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-red-200 text-red-600 bg-red-50"
                                    )}>
                                        {selected.status}
                                    </Badge>
                                </div>

                                <div className="bg-muted/50 rounded-xl p-3.5 space-y-2.5">
                                    {[["Phone", selected.phone], ["Email", selected.email], ["Schedule", selected.schedule], ["Sessions", String(selected.sessions)]].map(([label, value]) => (
                                        <div key={label}>
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{label}</p>
                                            <p className="text-xs font-medium mt-0.5">{value}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Weekly availability grid */}
                                <div>
                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Weekly Availability</p>
                                    <div className="grid grid-cols-7 gap-1">
                                        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => {
                                            const status: SlotStatus = (availability[day] as SlotStatus) ?? "unavailable";
                                            return (
                                                <div key={day} className="flex flex-col items-center gap-1">
                                                    <span className="text-[9px] text-muted-foreground uppercase">{day.slice(0, 1)}</span>
                                                    <div className={cn("w-full h-6 rounded-md border text-[8px] font-bold flex items-center justify-center", SLOT_STYLE[status])}>
                                                        {status === "available" ? "✓" : status === "booked" ? "●" : status === "break" ? "–" : "✗"}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {(["available", "booked", "break", "unavailable"] as SlotStatus[]).map((s) => (
                                            <span key={s} className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium capitalize", SLOT_STYLE[s])}>{s}</span>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Button size="sm" className="w-full rounded-xl text-xs" onClick={() => setViewMode("calendar")}>View Full Calendar</Button>
                                    <Button variant="outline" size="sm" className="w-full rounded-xl text-xs">Edit Doctor</Button>
                                </div>
                            </div>
                        )}

                        {/* Calendar view */}
                        {viewMode === "calendar" && (
                            <div className="flex-1 overflow-y-auto flex flex-col">
                                {/* Doctor chip */}
                                <div className="px-5 pt-4 pb-2">
                                    <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2">
                                        <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0", AVATAR_COLORS[DOCTORS.indexOf(selected) % AVATAR_COLORS.length])}>
                                            {selected.name.split(" ")[1]?.charAt(0)}
                                        </div>
                                        <span className="text-xs font-medium truncate">{selected.name}</span>
                                    </div>
                                </div>

                                {/* Month nav */}
                                <div className="flex items-center justify-between px-5 py-2">
                                    <p className="text-sm font-bold">{MONTHS[viewMonth].slice(0, 3)} {viewYear}</p>
                                    <div className="flex items-center gap-1">
                                        <button onClick={prevMonth} className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80 transition-colors">
                                            <ChevronLeft className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={nextMonth} className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80 transition-colors">
                                            <ChevronRight className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Day headers */}
                                <div className="grid grid-cols-7 px-3 mb-1">
                                    {DAYS.map((d) => (
                                        <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground uppercase py-1">{d.charAt(0)}</div>
                                    ))}
                                </div>

                                {/* Calendar grid */}
                                <div className="grid grid-cols-7 gap-0.5 px-3">
                                    {cells.map((day, i) => {
                                        if (!day) return <div key={`e-${i}`} />;
                                        const key = dateKey(viewYear, viewMonth, day);
                                        const dayName = DOW_MAP[new Date(viewYear, viewMonth, day).getDay()];
                                        const avail: SlotStatus = (availability[dayName] as SlotStatus) ?? "unavailable";
                                        const hasSessions = (docSessions[key] ?? []).length > 0;
                                        const isToday = day === now.getDate() && viewMonth === now.getMonth() && viewYear === now.getFullYear();
                                        const isSel = day === selectedDay;

                                        return (
                                            <div
                                                key={day}
                                                onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                                                className={cn(
                                                    "rounded-lg p-1 cursor-pointer transition-all flex flex-col items-center gap-0.5 min-h-[38px]",
                                                    isSel ? "bg-foreground" : "hover:bg-muted/50"
                                                )}
                                            >
                                                <span className={cn(
                                                    "text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full",
                                                    isToday && !isSel ? "bg-foreground text-white" : "",
                                                    isSel ? "text-white" : "text-foreground"
                                                )}>{day}</span>
                                                {/* Availability dot */}
                                                <div className={cn(
                                                    "w-1.5 h-1.5 rounded-full",
                                                    isSel ? "bg-white/50" :
                                                        avail === "available" ? "bg-emerald-400" :
                                                            avail === "booked" ? "bg-amber-400" :
                                                                avail === "break" ? "bg-blue-400" : "bg-muted-foreground/30"
                                                )} />
                                                {hasSessions && (
                                                    <div className={cn("w-1 h-1 rounded-full", isSel ? "bg-white/70" : "bg-foreground/60")} />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Legend */}
                                <div className="px-4 pt-3 pb-2 flex gap-2 flex-wrap border-t border-border/40 mt-2">
                                    {[["bg-emerald-400", "Available"], ["bg-amber-400", "Booked"], ["bg-blue-400", "Break"], ["bg-muted-foreground/30", "Off"]].map(([color, label]) => (
                                        <span key={label} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                            <span className={cn("w-1.5 h-1.5 rounded-full", color)} />
                                            {label}
                                        </span>
                                    ))}
                                </div>

                                {/* Day sessions */}
                                <div className="px-4 pb-4 flex-1">
                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                        {selectedDay ? `${MONTHS[viewMonth]} ${selectedDay}` : "Select a date"}
                                    </p>
                                    {daySessions.length === 0 ? (
                                        <p className="text-xs text-muted-foreground">No sessions scheduled.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {daySessions.map((s, i) => (
                                                <div key={i} className="bg-muted/40 rounded-xl p-2.5 flex items-start gap-2">
                                                    <div className={cn("w-2 h-2 rounded-full shrink-0 mt-1", s.color)} />
                                                    <div>
                                                        <p className="text-xs font-semibold">{s.patient}</p>
                                                        <p className="text-[11px] text-muted-foreground">{s.type} · {s.time}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <button className="mt-3 w-full text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1">
                                        <Plus className="w-3 h-3" /> Add session
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Mobile bottom sheet */}
            {selected && (
                <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 bg-white rounded-t-2xl shadow-2xl max-h-[70vh] overflow-y-auto">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 sticky top-0 bg-white">
                        <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
                            <button onClick={() => setViewMode("list")} className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all", viewMode === "list" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground")}>
                                <User className="w-3 h-3" /> Profile
                            </button>
                            <button onClick={() => setViewMode("calendar")} className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all", viewMode === "calendar" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground")}>
                                <CalendarDays className="w-3 h-3" /> Calendar
                            </button>
                        </div>
                        <button onClick={() => setSelected(null)} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {viewMode === "list" && (
                        <div className="p-5 space-y-4">
                            <p className="font-semibold text-lg">{selected.name}</p>
                            <p className="text-sm text-muted-foreground">{selected.specialization}</p>
                            <div className="grid grid-cols-2 gap-3">
                                {[["Phone", selected.phone], ["Schedule", selected.schedule], ["Sessions", String(selected.sessions)], ["Status", selected.status]].map(([label, value]) => (
                                    <div key={label} className="bg-muted/50 rounded-xl p-3">
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{label}</p>
                                        <p className="text-xs font-medium mt-0.5">{value}</p>
                                    </div>
                                ))}
                            </div>
                            <Button size="sm" className="w-full rounded-xl" onClick={() => setViewMode("calendar")}>View Calendar</Button>
                        </div>
                    )}

                    {viewMode === "calendar" && (
                        <div className="p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-bold">{MONTHS[viewMonth]} {viewYear}</p>
                                <div className="flex gap-1">
                                    <button onClick={prevMonth} className="w-7 h-7 rounded-xl bg-muted flex items-center justify-center"><ChevronLeft className="w-4 h-4" /></button>
                                    <button onClick={nextMonth} className="w-7 h-7 rounded-xl bg-muted flex items-center justify-center"><ChevronRight className="w-4 h-4" /></button>
                                </div>
                            </div>
                            <div className="grid grid-cols-7">
                                {DAYS.map((d) => (
                                    <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground uppercase py-1">{d.charAt(0)}</div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 gap-0.5">
                                {cells.map((day, i) => {
                                    if (!day) return <div key={`e-${i}`} />;
                                    const key = dateKey(viewYear, viewMonth, day);
                                    const dayName = DOW_MAP[new Date(viewYear, viewMonth, day).getDay()];
                                    const avail: SlotStatus = (availability[dayName] as SlotStatus) ?? "unavailable";
                                    const hasSessions = (docSessions[key] ?? []).length > 0;
                                    const isSel = day === selectedDay;
                                    const isToday = day === now.getDate() && viewMonth === now.getMonth() && viewYear === now.getFullYear();
                                    return (
                                        <div key={day} onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                                            className={cn("rounded-lg p-1 cursor-pointer flex flex-col items-center gap-0.5 min-h-[38px] transition-all", isSel ? "bg-foreground" : "hover:bg-muted/50")}>
                                            <span className={cn("text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full", isToday && !isSel ? "bg-foreground text-white" : "", isSel ? "text-white" : "")}>{day}</span>
                                            <div className={cn("w-1.5 h-1.5 rounded-full", isSel ? "bg-white/50" : avail === "available" ? "bg-emerald-400" : avail === "booked" ? "bg-amber-400" : avail === "break" ? "bg-blue-400" : "bg-muted-foreground/30")} />
                                            {hasSessions && <div className={cn("w-1 h-1 rounded-full", isSel ? "bg-white/70" : "bg-foreground/60")} />}
                                        </div>
                                    );
                                })}
                            </div>
                            {daySessions.length > 0 && (
                                <div className="space-y-2 pt-2 border-t border-border/40">
                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase">{MONTHS[viewMonth]} {selectedDay}</p>
                                    {daySessions.map((s, i) => (
                                        <div key={i} className="flex items-start gap-2 bg-muted/40 rounded-xl p-2.5">
                                            <div className={cn("w-2 h-2 rounded-full shrink-0 mt-1", s.color)} />
                                            <div>
                                                <p className="text-xs font-semibold">{s.patient}</p>
                                                <p className="text-[11px] text-muted-foreground">{s.type} · {s.time}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
            {selected && <div className="lg:hidden fixed inset-0 z-30 bg-black/20" onClick={() => setSelected(null)} />}
        </div>
    );
}
