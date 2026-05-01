"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft, Phone, Mail, Stethoscope, User, Clock,
    CalendarDays, Activity, Plus, Pencil, Trash2, Check,
    RefreshCw, ChevronLeft, ChevronRight, AlertCircle, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
    doctorsApi, sessionsApi,
    type Doctor, type DoctorAvailabilitySlot, type Session,
} from "@/lib/api";
import { NewSessionModal } from "@/components/modals/new-session-modal";

const AVATAR_COLORS = [
    "bg-violet-100 text-violet-700", "bg-blue-100 text-blue-700",
    "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-700", "bg-pink-100 text-pink-700",
];

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDay(y: number, m: number) { return new Date(y, m, 1).getDay(); }
function dateKey(y: number, m: number, d: number) {
    return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function Skeleton({ className }: { className?: string }) {
    return <div className={cn("animate-pulse bg-muted rounded-xl", className)} />;
}

function StatusBadge({ active }: { active: boolean }) {
    return (
        <Badge variant="outline" className={cn(
            "text-[10px] rounded-full px-2.5 font-medium capitalize",
            active ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-red-200 text-red-600 bg-red-50"
        )}>
            {active ? "Active" : "Unavailable"}
        </Badge>
    );
}

interface SlotFormData { start_time: string; end_time: string; label: string; is_active: boolean; }

function SlotForm({ data, onChange, onSave, onCancel, saving }: {
    data: SlotFormData;
    onChange: (d: SlotFormData) => void;
    onSave: () => void;
    onCancel: () => void;
    saving: boolean;
}) {
    return (
        <div className="bg-white rounded-lg p-2.5 mt-1 space-y-2 border border-border/60">
            <div className="flex gap-2">
                <div className="flex-1">
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase">Start</label>
                    <input type="time" value={data.start_time} onChange={e => onChange({ ...data, start_time: e.target.value })}
                        className="w-full mt-0.5 h-7 rounded-lg border border-border bg-muted/30 px-2 text-xs focus:outline-none" />
                </div>
                <div className="flex-1">
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase">End</label>
                    <input type="time" value={data.end_time} onChange={e => onChange({ ...data, end_time: e.target.value })}
                        className="w-full mt-0.5 h-7 rounded-lg border border-border bg-muted/30 px-2 text-xs focus:outline-none" />
                </div>
            </div>
            <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase">Label (optional)</label>
                <input type="text" placeholder="e.g. Morning, Afternoon" value={data.label}
                    onChange={e => onChange({ ...data, label: e.target.value })}
                    className="w-full mt-0.5 h-7 rounded-lg border border-border bg-muted/30 px-2 text-xs focus:outline-none" />
            </div>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" checked={data.is_active} onChange={e => onChange({ ...data, is_active: e.target.checked })} className="rounded" />
                Active
            </label>
            <div className="flex items-center gap-1.5 pt-0.5">
                <button onClick={onSave} disabled={saving}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-foreground text-white text-xs disabled:opacity-50">
                    <Check className="w-3 h-3" /> Save
                </button>
                <button onClick={onCancel} disabled={saving}
                    className="px-2.5 py-1 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground">
                    Cancel
                </button>
            </div>
        </div>
    );
}

const STATUS_COLORS: Record<string, string> = {
    scheduled: "bg-blue-100 text-blue-700",
    completed: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-red-100 text-red-600",
    "no-show": "bg-amber-100 text-amber-700",
};

type Tab = "sessions" | "schedule" | "calendar";

export default function DoctorDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();

    const [doctor, setDoctor] = useState<Doctor | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Sessions
    const [sessions, setSessions] = useState<Session[]>([]);
    const [sessionsLoading, setSessionsLoading] = useState(false);
    const [sessionsTotal, setSessionsTotal] = useState(0);
    const [sessionsPage, setSessionsPage] = useState(1);
    const SESSIONS_LIMIT = 20;

    // Availability
    const [slots, setSlots] = useState<DoctorAvailabilitySlot[]>([]);
    const [slotsLoading, setSlotsLoading] = useState(false);
    const [slotError, setSlotError] = useState<string | null>(null);
    const [slotFormKey, setSlotFormKey] = useState<string | null>(null);
    const [slotFormData, setSlotFormData] = useState<SlotFormData>({ start_time: "", end_time: "", label: "", is_active: true });
    const [slotSaving, setSlotSaving] = useState(false);

    // Calendar
    const now = new Date();
    const [viewYear, setViewYear] = useState(now.getFullYear());
    const [viewMonth, setViewMonth] = useState(now.getMonth());
    const [selectedDay, setSelectedDay] = useState<number | null>(now.getDate());

    // Tab
    const [tab, setTab] = useState<Tab>("sessions");

    // Schedule session modal
    const [scheduleOpen, setScheduleOpen] = useState(false);

    // ── Load doctor ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (!id) return;
        setLoading(true);
        doctorsApi.get(id)
            .then(setDoctor)
            .catch(() => setError("Failed to load doctor."))
            .finally(() => setLoading(false));
    }, [id]);

    // ── Load sessions ────────────────────────────────────────────────────────
    const loadSessions = useCallback(async (page: number) => {
        if (!doctor) return;
        setSessionsLoading(true);
        try {
            const res = await sessionsApi.list({
                doctor_id: doctor.staff_id,
                page: String(page),
                limit: String(SESSIONS_LIMIT),
            });
            setSessions(res.sessions ?? []);
            setSessionsTotal(res.total ?? 0);
        } catch {
            // ignore
        } finally {
            setSessionsLoading(false);
        }
    }, [doctor]);

    useEffect(() => {
        if (doctor && tab === "sessions") loadSessions(sessionsPage);
    }, [doctor, tab, sessionsPage, loadSessions]);

    // ── Load availability ────────────────────────────────────────────────────
    const loadSlots = useCallback(async () => {
        if (!id) return;
        setSlotsLoading(true);
        setSlotError(null);
        try {
            const data = await doctorsApi.getAvailability(id);
            setSlots(Array.isArray(data) ? data : []);
        } catch {
            setSlotError("Failed to load availability.");
        } finally {
            setSlotsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (tab === "schedule") loadSlots();
    }, [tab, loadSlots]);

    // ── Calendar ─────────────────────────────────────────────────────────────
    useEffect(() => {
        if (doctor && tab === "calendar") loadSessions(1);
    }, [doctor, tab, loadSessions]);

    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const firstDay = getFirstDay(viewYear, viewMonth);
    const cells = Array.from({ length: firstDay + daysInMonth }, (_, i) => (i < firstDay ? null : i - firstDay + 1));

    const sessionDateMap: Record<string, Session[]> = {};
    sessions.forEach(s => {
        const key = s.scheduled_at.slice(0, 10);
        if (!sessionDateMap[key]) sessionDateMap[key] = [];
        sessionDateMap[key].push(s);
    });
    const selectedKey = selectedDay ? dateKey(viewYear, viewMonth, selectedDay) : null;
    const daySessions = selectedKey ? (sessionDateMap[selectedKey] ?? []) : [];

    // ── Slot actions ─────────────────────────────────────────────────────────
    async function saveSlot() {
        if (!id || !slotFormKey) return;
        if (!slotFormData.start_time || !slotFormData.end_time) return;
        setSlotSaving(true);
        try {
            if (slotFormKey.startsWith("new-")) {
                const day = parseInt(slotFormKey.replace("new-", ""), 10);
                await doctorsApi.addSlot(id, {
                    day_of_week: day,
                    start_time: slotFormData.start_time,
                    end_time: slotFormData.end_time,
                    label: slotFormData.label || null,
                    is_active: slotFormData.is_active,
                    branch_id: doctor?.branch_id ?? "",
                });
            } else {
                await doctorsApi.updateSlot(id, slotFormKey, {
                    start_time: slotFormData.start_time,
                    end_time: slotFormData.end_time,
                    label: slotFormData.label || null,
                    is_active: slotFormData.is_active,
                });
            }
            setSlotFormKey(null);
            await loadSlots();
        } catch {
            setSlotError("Could not save slot.");
        } finally {
            setSlotSaving(false);
        }
    }

    async function deleteSlot(slotId: string) {
        if (!id) return;
        try {
            await doctorsApi.deleteSlot(id, slotId);
            setSlots(prev => prev.filter(s => s.id !== slotId));
        } catch {
            setSlotError("Could not delete slot.");
        }
    }

    function openAddSlot(day: number) {
        setSlotFormKey(`new-${day}`);
        setSlotFormData({ start_time: "09:00", end_time: "17:00", label: "", is_active: true });
    }
    function openEditSlot(s: DoctorAvailabilitySlot) {
        setSlotFormKey(s.id);
        setSlotFormData({ start_time: s.start_time, end_time: s.end_time, label: s.label ?? "", is_active: s.is_active });
    }

    // ── Render ────────────────────────────────────────────────────────────────
    const initials = doctor?.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() ?? "??";

    if (loading) {
        return (
            <div className="flex flex-col h-full p-5 gap-4">
                <div className="flex items-center gap-3">
                    <Skeleton className="w-8 h-8 rounded-xl" />
                    <Skeleton className="w-40 h-6" />
                </div>
                <div className="flex gap-4 flex-1">
                    <Skeleton className="w-72 rounded-2xl" />
                    <Skeleton className="flex-1 rounded-2xl" />
                </div>
            </div>
        );
    }

    if (error || !doctor) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                <AlertCircle className="w-8 h-8" />
                <p className="text-sm">{error ?? "Doctor not found."}</p>
                <Button size="sm" variant="outline" onClick={() => router.back()}>Go back</Button>
            </div>
        );
    }

    const totalPages = Math.ceil(sessionsTotal / SESSIONS_LIMIT);

    return (
        <div className="flex flex-col h-full overflow-hidden gap-4 p-4 md:p-5">
            {/* ── Header ── */}
            <div className="flex items-center gap-3">
                <button onClick={() => router.back()}
                    className="w-8 h-8 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                    <h1 className="text-xl font-bold tracking-tight">{doctor.full_name}</h1>
                    {doctor.specialty && <p className="text-xs text-muted-foreground">{doctor.specialty}</p>}
                </div>
                <div className="ml-auto">
                    <Button size="sm" className="rounded-xl gap-1.5 text-xs" onClick={() => setScheduleOpen(true)}>
                        <Plus className="w-3.5 h-3.5" /> Schedule Session
                    </Button>
                </div>
            </div>

            {/* ── Body ── */}
            <div className="flex gap-4 flex-1 min-h-0">

                {/* ── Left sidebar ── */}
                <div className="w-72 shrink-0 flex flex-col gap-3 overflow-y-auto">
                    {/* Profile card */}
                    <div className="bg-white rounded-2xl p-5 border border-border/50 flex flex-col items-center gap-3 text-center">
                        <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold", AVATAR_COLORS[0])}>
                            {initials}
                        </div>
                        <div>
                            <p className="font-bold text-base">{doctor.full_name}</p>
                            {doctor.specialty && <p className="text-xs text-muted-foreground mt-0.5">{doctor.specialty}</p>}
                        </div>
                        <StatusBadge active={doctor.is_active} />
                    </div>

                    {/* Info card */}
                    <div className="bg-white rounded-2xl p-4 border border-border/50 space-y-3.5">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Contact</p>
                        {doctor.email && (
                            <div className="flex items-start gap-2.5">
                                <Mail className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                                <p className="text-xs break-all">{doctor.email}</p>
                            </div>
                        )}
                        {doctor.phone && (
                            <div className="flex items-center gap-2.5">
                                <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                <p className="text-xs">{doctor.phone}</p>
                            </div>
                        )}
                        {doctor.specialty && (
                            <div className="flex items-center gap-2.5">
                                <Stethoscope className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                <p className="text-xs">{doctor.specialty}</p>
                            </div>
                        )}
                    </div>

                    {/* Bio card */}
                    {doctor.bio && (
                        <div className="bg-white rounded-2xl p-4 border border-border/50">
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Bio</p>
                            <p className="text-xs text-muted-foreground leading-relaxed">{doctor.bio}</p>
                        </div>
                    )}

                    {/* Quick stats card */}
                    <div className="bg-white rounded-2xl p-4 border border-border/50 grid grid-cols-2 gap-3">
                        <div className="bg-muted/40 rounded-xl p-3 text-center">
                            <p className="text-xl font-bold">{sessionsTotal}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Total Sessions</p>
                        </div>
                        <div className="bg-muted/40 rounded-xl p-3 text-center">
                            <p className="text-xl font-bold">{slots.length}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Avail. Slots</p>
                        </div>
                    </div>
                </div>

                {/* ── Right panel ── */}
                <div className="flex-1 min-w-0 bg-white rounded-2xl border border-border/50 flex flex-col overflow-hidden">
                    {/* Tabs */}
                    <div className="px-5 pt-4 pb-0 border-b border-border/60">
                        <div className="inline-flex items-center gap-1 bg-muted rounded-xl p-1">
                            {([
                                ["sessions", <Activity key="a" className="w-3 h-3" />, "Sessions"],
                                ["schedule", <Clock key="c" className="w-3 h-3" />, "Schedule"],
                                ["calendar", <CalendarDays key="cal" className="w-3 h-3" />, "Calendar"],
                            ] as const).map(([t, icon, label]) => (
                                <button key={t} onClick={() => setTab(t)}
                                    className={cn("flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                                        tab === t ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
                                    {icon} {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── Sessions tab ── */}
                    {tab === "sessions" && (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <div className="overflow-auto flex-1">
                                <table className="w-full text-sm min-w-[600px]">
                                    <thead className="sticky top-0 bg-white border-b border-border z-10">
                                        <tr>
                                            {["Patient", "Date & Time", "Session Type", "Duration", "Status"].map(h => (
                                                <th key={h} className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3.5">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sessionsLoading ? (
                                            Array.from({ length: 6 }).map((_, i) => (
                                                <tr key={i} className="border-b border-border/60">
                                                    {Array.from({ length: 5 }).map((_, j) => (
                                                        <td key={j} className="px-5 py-4"><Skeleton className="h-4 w-full" /></td>
                                                    ))}
                                                </tr>
                                            ))
                                        ) : sessions.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="text-center py-16 text-muted-foreground text-sm">
                                                    <User className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                                    No sessions found
                                                </td>
                                            </tr>
                                        ) : sessions.map(s => {
                                            const dt = new Date(s.scheduled_at);
                                            const statusColor = STATUS_COLORS[s.status] ?? "bg-muted text-muted-foreground";
                                            return (
                                                <tr key={s.id} className="border-b border-border/60 hover:bg-muted/20 transition-colors">
                                                    <td className="px-5 py-3.5">
                                                        <p className="font-medium text-sm">{s.patient_name}</p>
                                                        <p className="text-[11px] text-muted-foreground">{s.patient_code}</p>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                                                        <p className="font-medium text-foreground">{dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                                                        <p>{dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}</p>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-xs">{s.session_type_name}</td>
                                                    <td className="px-5 py-3.5 text-xs text-muted-foreground">{s.duration_minutes} min</td>
                                                    <td className="px-5 py-3.5">
                                                        <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-medium capitalize", statusColor)}>
                                                            {s.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between px-5 py-3 border-t border-border/60 text-xs text-muted-foreground">
                                    <span>Showing {(sessionsPage - 1) * SESSIONS_LIMIT + 1}–{Math.min(sessionsPage * SESSIONS_LIMIT, sessionsTotal)} of {sessionsTotal}</span>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => setSessionsPage(p => p - 1)} disabled={sessionsPage === 1}
                                            className="w-7 h-7 rounded-lg border border-border flex items-center justify-center disabled:opacity-40 hover:bg-muted transition-colors">
                                            <ChevronLeft className="w-3.5 h-3.5" />
                                        </button>
                                        <span className="px-2">{sessionsPage} / {totalPages}</span>
                                        <button onClick={() => setSessionsPage(p => p + 1)} disabled={sessionsPage === totalPages}
                                            className="w-7 h-7 rounded-lg border border-border flex items-center justify-center disabled:opacity-40 hover:bg-muted transition-colors">
                                            <ChevronRight className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Schedule tab ── */}
                    {tab === "schedule" && (
                        <div className="flex-1 overflow-y-auto p-5">
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-sm font-semibold">Weekly Availability</p>
                                {slotsLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                            </div>
                            {slotError && (
                                <div className="flex items-center gap-2 text-xs text-red-500 mb-3">
                                    <AlertCircle className="w-3.5 h-3.5" /> {slotError}
                                </div>
                            )}
                            <div className="space-y-2">
                                {DAYS.map((dayName, dayIdx) => {
                                    const daySlots = slots.filter(s => s.day_of_week === dayIdx);
                                    const isAdding = slotFormKey === `new-${dayIdx}`;
                                    return (
                                        <div key={dayIdx} className="bg-muted/30 rounded-xl p-3.5">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-xs font-semibold">{dayName}</p>
                                                {!isAdding && (
                                                    <button onClick={() => openAddSlot(dayIdx)}
                                                        className="w-5 h-5 rounded-md bg-white border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                                                        <Plus className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                            {daySlots.length === 0 && !isAdding && (
                                                <p className="text-[11px] text-muted-foreground italic">No slots</p>
                                            )}
                                            {daySlots.map(slot => {
                                                if (slotFormKey === slot.id) return (
                                                    <SlotForm key={slot.id} data={slotFormData} onChange={setSlotFormData}
                                                        onSave={saveSlot} onCancel={() => setSlotFormKey(null)} saving={slotSaving} />
                                                );
                                                return (
                                                    <div key={slot.id} className={cn("flex items-center justify-between rounded-lg px-2.5 py-1.5 mb-1 text-xs",
                                                        slot.is_active ? "bg-white" : "bg-muted/60 opacity-60")}>
                                                        <span className="font-medium">
                                                            {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}
                                                            {slot.label && <span className="ml-1.5 text-muted-foreground">· {slot.label}</span>}
                                                        </span>
                                                        <div className="flex items-center gap-1">
                                                            <button onClick={() => openEditSlot(slot)} className="text-muted-foreground hover:text-foreground transition-colors">
                                                                <Pencil className="w-3 h-3" />
                                                            </button>
                                                            <button onClick={() => deleteSlot(slot.id)} className="text-muted-foreground hover:text-red-500 transition-colors">
                                                                <Trash2 className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {isAdding && (
                                                <SlotForm data={slotFormData} onChange={setSlotFormData}
                                                    onSave={saveSlot} onCancel={() => setSlotFormKey(null)} saving={slotSaving} />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ── Calendar tab ── */}
                    {tab === "calendar" && (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-3 border-b border-border/60">
                                <p className="text-sm font-bold">{MONTHS[viewMonth]} {viewYear}</p>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => {
                                        if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
                                        else setViewMonth(m => m - 1);
                                    }} className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80 transition-colors">
                                        <ChevronLeft className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => {
                                        if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
                                        else setViewMonth(m => m + 1);
                                    }} className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80 transition-colors">
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                <div className="grid grid-cols-7 px-4 pt-3 mb-1">
                                    {DAYS_SHORT.map(d => (
                                        <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground uppercase py-1">{d.charAt(0)}</div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-7 gap-0.5 px-4">
                                    {cells.map((day, i) => {
                                        if (!day) return <div key={`e-${i}`} />;
                                        const key = dateKey(viewYear, viewMonth, day);
                                        const hasSessions = (sessionDateMap[key] ?? []).length > 0;
                                        const isToday = day === now.getDate() && viewMonth === now.getMonth() && viewYear === now.getFullYear();
                                        const isSel = day === selectedDay;
                                        return (
                                            <div key={day} onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                                                className={cn("rounded-lg p-1 cursor-pointer transition-all flex flex-col items-center gap-0.5 min-h-[42px]",
                                                    isSel ? "bg-foreground" : "hover:bg-muted/50")}>
                                                <span className={cn("text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full",
                                                    isToday && !isSel ? "bg-foreground text-white" : "",
                                                    isSel ? "text-white" : "text-foreground")}>{day}</span>
                                                {hasSessions && <div className={cn("w-1.5 h-1.5 rounded-full", isSel ? "bg-white/70" : "bg-[#2493A2]")} />}
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="px-5 pt-4 pb-4">
                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                        {selectedDay ? `${MONTHS[viewMonth]} ${selectedDay}, ${viewYear}` : "Select a date"}
                                    </p>
                                    {sessionsLoading ? (
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
                                        </div>
                                    ) : daySessions.length === 0 ? (
                                        <p className="text-xs text-muted-foreground">No sessions on this day.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {daySessions.map(s => {
                                                const dt = new Date(s.scheduled_at);
                                                const statusColor = STATUS_COLORS[s.status] ?? "bg-muted text-muted-foreground";
                                                return (
                                                    <div key={s.id} className="bg-muted/40 rounded-xl p-3 flex items-start gap-2.5">
                                                        <div className="w-2 h-2 rounded-full shrink-0 mt-1 bg-[#2493A2]" />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <p className="text-xs font-semibold truncate">{s.patient_name}</p>
                                                                <span className={cn("px-1.5 py-0.5 rounded-full text-[10px] font-medium capitalize shrink-0", statusColor)}>
                                                                    {s.status}
                                                                </span>
                                                            </div>
                                                            <p className="text-[11px] text-muted-foreground">
                                                                {s.session_type_name} · {dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <NewSessionModal open={scheduleOpen} onClose={() => setScheduleOpen(false)}
                prefill={doctor ? { doctorId: doctor.id } : undefined} />
        </div>
    );
}
