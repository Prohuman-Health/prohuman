"use client";

import { useState } from "react";
import { Plus, Search, Clock, MoreHorizontal, X, ChevronLeft, ChevronRight, CalendarDays, User, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useStaff } from "@/lib/contexts/staff-context";
import { useSessions } from "@/lib/contexts/sessions-context";
import type { Doctor } from "@/lib/api";
import { NewSessionModal } from "@/components/modals/new-session-modal";
import { NewStaffModal } from "@/components/modals/new-staff-modal";

const AVATAR_COLORS = [
    "bg-violet-100 text-violet-700", "bg-blue-100 text-blue-700",
    "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-700", "bg-pink-100 text-pink-700",
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDay(y: number, m: number) { return new Date(y, m, 1).getDay(); }
function dateKey(y: number, m: number, d: number) {
    return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

type ViewMode = "profile" | "calendar";

function Skeleton({ className }: { className?: string }) {
    return <div className={cn("animate-pulse bg-muted rounded-xl", className)} />;
}

export default function DoctorsPage() {
    const { doctors, loading, refresh } = useStaff();
    const { sessions } = useSessions();

    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<Doctor | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>("profile");
    const [scheduleOpen, setScheduleOpen] = useState(false);
    const [addDoctorOpen, setAddDoctorOpen] = useState(false);

    const now = new Date();
    const [viewYear, setViewYear] = useState(now.getFullYear());
    const [viewMonth, setViewMonth] = useState(now.getMonth());
    const [selectedDay, setSelectedDay] = useState<number | null>(now.getDate());

    const filtered = doctors.filter(d =>
        !search || d.full_name.toLowerCase().includes(search.toLowerCase()) ||
        (d.specialty ?? "").toLowerCase().includes(search.toLowerCase())
    );

    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const firstDay = getFirstDay(viewYear, viewMonth);
    const cells = Array.from({ length: firstDay + daysInMonth }, (_, i) => (i < firstDay ? null : i - firstDay + 1));

    // Build session map for selected doctor from real session data
    const docSessionMap: Record<string, typeof sessions> = {};
    if (selected) {
        sessions
            .filter(s => s.doctor_id === selected.staff_id)
            .forEach(s => {
                const key = s.scheduled_at.slice(0, 10);
                if (!docSessionMap[key]) docSessionMap[key] = [];
                docSessionMap[key].push(s);
            });
    }

    const selectedKey = selectedDay ? dateKey(viewYear, viewMonth, selectedDay) : null;
    const daySessions = selectedKey ? (docSessionMap[selectedKey] ?? []) : [];

    function prevMonth() {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
        else setViewMonth(m => m - 1);
    }
    function nextMonth() {
        if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
        else setViewMonth(m => m + 1);
    }

    // Count this month's sessions per doctor
    const sessionCountByDoctorStaffId: Record<string, number> = {};
    sessions.forEach(s => {
        sessionCountByDoctorStaffId[s.doctor_id] = (sessionCountByDoctorStaffId[s.doctor_id] ?? 0) + 1;
    });

    function selectDoctor(d: Doctor) {
        setSelected(prev => prev?.id === d.id ? null : d);
        setViewMode("profile");
        setSelectedDay(now.getDate());
        setViewYear(now.getFullYear());
        setViewMonth(now.getMonth());
    }

    const DetailPanel = ({ mobile = false }: { mobile?: boolean }) => {
        if (!selected) return null;
        const idx = doctors.indexOf(selected);
        const initials = selected.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

        return (
            <div className={cn("flex flex-col overflow-hidden", mobile ? "h-full" : "flex-1")}>
                {/* Profile / Calendar tabs */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
                    <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
                        {[["profile", <User key="u" className="w-3 h-3" />, "Profile"],
                        ["calendar", <CalendarDays key="c" className="w-3 h-3" />, "Calendar"]].map(([mode, Icon, label]) => (
                            <button key={mode as string} onClick={() => setViewMode(mode as ViewMode)}
                                className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all",
                                    viewMode === mode ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
                                {Icon} {label}
                            </button>
                        ))}
                    </div>
                    <button onClick={() => setSelected(null)} className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                        <X className="w-3 h-3" />
                    </button>
                </div>

                {/* Profile */}
                {viewMode === "profile" && (
                    <div className="p-5 space-y-5 flex-1 overflow-y-auto">
                        <div className="flex flex-col items-center text-center gap-2.5">
                            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold", AVATAR_COLORS[idx % AVATAR_COLORS.length])}>
                                {initials}
                            </div>
                            <div>
                                <p className="font-bold text-base">{selected.full_name}</p>
                                {selected.specialty && <p className="text-xs text-muted-foreground mt-0.5">{selected.specialty}</p>}
                            </div>
                            <Badge variant="outline" className={cn("text-[10px] rounded-full px-2.5 font-medium capitalize",
                                selected.is_active ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-red-200 text-red-600 bg-red-50")}>
                                {selected.is_active ? "Active" : "Unavailable"}
                            </Badge>
                        </div>

                        <div className="bg-muted/50 rounded-xl p-3.5 space-y-3">
                            {[
                                ["Email", selected.email],
                                ["Phone", selected.phone ?? "—"],
                                ["Sessions (loaded)", String(sessionCountByDoctorStaffId[selected.staff_id] ?? 0)],
                            ].map(([label, value]) => (
                                <div key={label}>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{label}</p>
                                    <p className="text-xs font-medium mt-0.5">{value}</p>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-2">
                            <Button size="sm" className="w-full rounded-xl text-xs" onClick={() => setViewMode("calendar")}>
                                View Calendar
                            </Button>
                            <Button size="sm" variant="outline" className="w-full rounded-xl text-xs"
                                onClick={() => setScheduleOpen(true)}>
                                Schedule Session
                            </Button>
                        </div>
                    </div>
                )}

                {/* Calendar */}
                {viewMode === "calendar" && (
                    <div className="flex-1 overflow-y-auto flex flex-col">
                        <div className="flex items-center justify-between px-5 py-3">
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

                        <div className="grid grid-cols-7 px-3 mb-1">
                            {DAYS.map(d => <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground uppercase py-1">{d.charAt(0)}</div>)}
                        </div>

                        <div className="grid grid-cols-7 gap-0.5 px-3">
                            {cells.map((day, i) => {
                                if (!day) return <div key={`e-${i}`} />;
                                const key = dateKey(viewYear, viewMonth, day);
                                const hasSessions = (docSessionMap[key] ?? []).length > 0;
                                const isToday = day === now.getDate() && viewMonth === now.getMonth() && viewYear === now.getFullYear();
                                const isSel = day === selectedDay;
                                return (
                                    <div key={day} onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                                        className={cn("rounded-lg p-1 cursor-pointer transition-all flex flex-col items-center gap-0.5 min-h-[38px]",
                                            isSel ? "bg-foreground" : "hover:bg-muted/50")}>
                                        <span className={cn("text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full",
                                            isToday && !isSel ? "bg-foreground text-white" : "",
                                            isSel ? "text-white" : "text-foreground")}>{day}</span>
                                        {hasSessions && <div className={cn("w-1.5 h-1.5 rounded-full", isSel ? "bg-white/70" : "bg-[#2493A2]")} />}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="px-4 pt-3 pb-2 flex-1">
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                {selectedDay ? `${MONTHS[viewMonth]} ${selectedDay}` : "Select a date"}
                            </p>
                            {daySessions.length === 0 ? (
                                <p className="text-xs text-muted-foreground">No sessions on this day.</p>
                            ) : (
                                <div className="space-y-2">
                                    {daySessions.map(s => {
                                        const dt = new Date(s.scheduled_at);
                                        return (
                                            <div key={s.id} className="bg-muted/40 rounded-xl p-2.5 flex items-start gap-2">
                                                <div className="w-2 h-2 rounded-full shrink-0 mt-1 bg-[#2493A2]" />
                                                <div>
                                                    <p className="text-xs font-semibold">{s.patient_name}</p>
                                                    <p className="text-[11px] text-muted-foreground">{s.session_type_name} · {dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            <button onClick={() => setScheduleOpen(true)}
                                className="mt-3 w-full text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1">
                                <Plus className="w-3 h-3" /> Add session
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full overflow-hidden gap-4 p-4 md:p-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight">Doctors</h1>
                    <p className="text-sm text-muted-foreground mt-0.5 hidden sm:block">{doctors.length} doctors on staff</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={refresh} className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
                        <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                    </button>
                    <Button size="sm" className="gap-1.5 rounded-xl shrink-0" onClick={() => setAddDoctorOpen(true)}>
                        <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Doctor</span>
                    </Button>
                </div>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder="Search doctors..." className="pl-9 rounded-xl bg-white" value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {/* Main area */}
            <div className="flex gap-4 flex-1 min-h-0">
                {/* Table */}
                <div className="bg-white rounded-2xl overflow-hidden flex-1 min-w-0 flex flex-col border border-border/50">
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-sm min-w-[580px]">
                            <thead className="border-b border-border sticky top-0 bg-white z-10">
                                <tr>
                                    {["Doctor", "Specialty", "Email", "Sessions", "Status", ""].map(h => (
                                        <th key={h} className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3.5">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i} className="border-b border-border/60">
                                            {Array.from({ length: 6 }).map((_, j) => <td key={j} className="px-5 py-4"><Skeleton className="h-4 w-full" /></td>)}
                                        </tr>
                                    ))
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center py-12 text-muted-foreground text-sm">No doctors found</td></tr>
                                ) : filtered.map((d, i) => {
                                    const initials = d.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
                                    const sessionCount = sessionCountByDoctorStaffId[d.staff_id] ?? 0;
                                    return (
                                        <tr key={d.id} onClick={() => selectDoctor(d)}
                                            className={cn("border-b border-border/60 cursor-pointer transition-colors hover:bg-muted/30", selected?.id === d.id && "bg-muted/50")}>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0", AVATAR_COLORS[i % AVATAR_COLORS.length])}>
                                                        {initials}
                                                    </div>
                                                    <span className="font-semibold whitespace-nowrap">{d.full_name}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-muted-foreground text-sm">{d.specialty ?? "—"}</td>
                                            <td className="px-5 py-4 text-muted-foreground text-xs">{d.email}</td>
                                            <td className="px-5 py-4 text-center font-semibold text-sm">{sessionCount}</td>
                                            <td className="px-5 py-4">
                                                <Badge variant="outline" className={cn("text-[10px] rounded-full px-2.5 font-medium",
                                                    d.is_active ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-red-200 text-red-600 bg-red-50")}>
                                                    {d.is_active ? "Active" : "Unavailable"}
                                                </Badge>
                                            </td>
                                            <td className="px-5 py-4">
                                                <button className="text-muted-foreground hover:text-foreground transition-colors" onClick={e => e.stopPropagation()}>
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Side panel — desktop */}
                {selected && (
                    <div className="hidden lg:flex w-[280px] shrink-0 bg-white rounded-2xl flex-col overflow-hidden border border-border/50">
                        <DetailPanel />
                    </div>
                )}
            </div>

            {/* Mobile bottom sheet */}
            {selected && (
                <>
                    <div className="lg:hidden fixed inset-0 z-30 bg-black/20" onClick={() => setSelected(null)} />
                    <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 bg-white rounded-t-2xl shadow-2xl max-h-[75vh] overflow-hidden flex flex-col">
                        <DetailPanel mobile />
                    </div>
                </>
            )}

            {/* Schedule session modal */}
            <NewSessionModal open={scheduleOpen} onClose={() => setScheduleOpen(false)}
                prefill={selected ? { doctorId: selected.id } : undefined} />

            {/* Add doctor modal */}
            <NewStaffModal open={addDoctorOpen} onClose={() => { setAddDoctorOpen(false); refresh(); }} doctorMode />
        </div>
    );
}
