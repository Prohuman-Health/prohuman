"use client";

import { useEffect, useState } from "react";
import {
    Plus, ArrowUpRight, TrendingUp, CalendarDays,
    Users, Stethoscope, Layers, Activity, AlertTriangle, Clock,
    RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { dashboard, DashboardStats } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const ROLE_COLORS: Record<string, string> = {
    admin: "bg-violet-100 text-violet-700",
    receptionist: "bg-blue-100 text-blue-700",
    physiotherapist: "bg-emerald-100 text-emerald-700",
    massager: "bg-amber-100 text-amber-700",
    fitness_trainer: "bg-orange-100 text-orange-700",
    doctor: "bg-teal-100 text-teal-700",
};

function initials(name: string) {
    return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const d = Math.floor(diff / 86400000);
    if (d === 0) return "Today";
    if (d === 1) return "Yesterday";
    return `${d} days ago`;
}

function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}
function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Skeleton shimmer ──────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
    return <div className={cn("animate-pulse bg-muted rounded-xl", className)} />;
}

export default function DashboardPage() {
    const { user } = useAuth();
    const [data, setData] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const load = async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);
        setError(null);
        try {
            const res = await dashboard.stats();
            setData(res);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to load dashboard");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { load(); }, []);

    // Derived
    const maxWeekly = data ? Math.max(...data.weekly_sessions.map(d => d.count), 1) : 1;
    const statusTotal = Math.max(data?.session_status.total ?? 0, 1); // avoid ÷0
    const completedPct = data ? Math.round((data.session_status.completed / statusTotal) * 100) : 0;
    const circumference = 2 * Math.PI * 54;
    const offset = isFinite(completedPct) ? circumference - (completedPct / 100) * circumference : circumference;

    const greeting = () => {
        const h = new Date().getHours();
        if (h < 12) return "Good morning";
        if (h < 17) return "Good afternoon";
        return "Good evening";
    };

    // ── Stat card definitions ─────────────────────────────────────────────────
    const STATS = data ? [
        {
            label: "Total Patients",
            value: data.stats.total_patients,
            sub: "Active records",
            icon: Users,
            filled: true,
        },
        {
            label: "Active Doctors",
            value: data.stats.active_doctors,
            sub: "On staff",
            icon: Stethoscope,
            filled: false,
        },
        {
            label: "Sessions This Month",
            value: data.stats.sessions_this_month,
            sub: `${data.stats.sessions_today} today`,
            icon: CalendarDays,
            filled: false,
        },
        {
            label: "Session Types",
            value: data.stats.session_types,
            sub: data.stats.unassigned_forms > 0
                ? `${data.stats.unassigned_forms} without form`
                : "All forms assigned",
            icon: Layers,
            filled: false,
        },
    ] : null;

    return (
        <div className="p-4 md:p-6 space-y-4 md:space-y-5">

            {/* ── Header ─────────────────────────────────────────────────────── */}
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-sm text-muted-foreground mt-0.5 hidden sm:block">
                        {greeting()}, {user?.full_name?.split(" ")[0]} —&nbsp;
                        {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={() => load(true)}
                        disabled={refreshing}
                        className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
                    >
                        <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
                    </button>
                    <Button size="sm" className="gap-1.5 rounded-xl text-xs md:text-sm">
                        <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        <span className="hidden sm:inline">Add Session</span>
                        <span className="sm:hidden">Add</span>
                    </Button>
                </div>
            </div>

            {/* Error banner */}
            {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    {error} — <button className="underline" onClick={() => load()}>Retry</button>
                </div>
            )}

            {/* ── Stat Cards ─────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-28 md:h-32 rounded-2xl" />
                    ))
                ) : STATS?.map((s) => {
                    const Icon = s.icon;
                    return (
                        <div
                            key={s.label}
                            className={cn(
                                "rounded-2xl p-4 md:p-5 flex flex-col gap-2 md:gap-3 border",
                                s.filled ? "bg-foreground text-white border-foreground" : "bg-white border-border"
                            )}
                        >
                            <div className="flex items-center justify-between">
                                <p className={cn("text-xs md:text-sm font-medium", s.filled ? "text-white/70" : "text-muted-foreground")}>
                                    {s.label}
                                </p>
                                <div className={cn("w-6 h-6 md:w-7 md:h-7 rounded-full border flex items-center justify-center shrink-0",
                                    s.filled ? "border-white/30" : "border-border")}>
                                    <Icon className={cn("w-3 h-3", s.filled ? "text-white" : "text-muted-foreground")} />
                                </div>
                            </div>
                            <p className={cn("text-3xl md:text-4xl font-bold tracking-tight",
                                s.filled ? "text-white" : "text-foreground")}>
                                {s.value.toLocaleString()}
                            </p>
                            <p className={cn("text-[10px] md:text-[11px] flex items-center gap-1",
                                s.filled ? "text-white/60" : "text-muted-foreground")}>
                                <TrendingUp className="w-3 h-3 shrink-0" />
                                <span className="truncate">{s.sub}</span>
                            </p>
                        </div>
                    );
                })}
            </div>

            {/* ── Middle row ─────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[1fr_280px_240px] gap-3 md:gap-4">

                {/* Weekly bar chart */}
                <div className="bg-white rounded-2xl border border-border p-4 md:p-5 md:col-span-2 xl:col-span-1">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-base">Sessions This Month</h2>
                        {data && (
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-lg">
                                {data.stats.sessions_this_month} total
                            </span>
                        )}
                    </div>
                    {loading ? (
                        <Skeleton className="h-36" />
                    ) : (
                        <div className="flex items-end gap-2 md:gap-3 h-32 md:h-36">
                            {(data?.weekly_sessions ?? []).map((d) => {
                                const pct = (d.count / maxWeekly) * 100;
                                const isMax = d.count === maxWeekly && d.count > 0;
                                return (
                                    <div key={d.dow} className="flex flex-col items-center gap-1.5 flex-1 group">
                                        {isMax && <span className="text-[10px] font-semibold text-foreground">{d.count}</span>}
                                        <div className="w-full flex items-end relative" style={{ height: "90px" }}>
                                            <div
                                                className={cn("w-full rounded-full transition-all duration-500 group-hover:opacity-80",
                                                    isMax ? "bg-foreground" : "bg-muted")}
                                                style={{ height: `${Math.max(pct, d.count > 0 ? 8 : 4)}%`, minHeight: "4px" }}
                                            />
                                        </div>
                                        <span className="text-[10px] text-muted-foreground">{DOW[d.dow]}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Next session */}
                <div className="bg-white rounded-2xl border border-border p-4 md:p-5 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold text-base">Next Session</h2>
                        <Clock className="w-4 h-4 text-[#2493A2]" />
                    </div>
                    {loading ? (
                        <Skeleton className="flex-1 min-h-[80px]" />
                    ) : data?.upcoming_session ? (
                        <>
                            <div className="flex-1 bg-muted rounded-xl p-4 space-y-2">
                                <p className="font-bold text-base leading-tight">{data.upcoming_session.patient_name}</p>
                                <p className="text-xs text-muted-foreground">{data.upcoming_session.session_type_name}</p>
                                <p className="text-xs text-muted-foreground">
                                    {formatDate(data.upcoming_session.scheduled_at)} · {formatTime(data.upcoming_session.scheduled_at)}
                                </p>
                                <p className="text-[11px] text-[#2493A2] font-medium">
                                    Dr. {data.upcoming_session.doctor_name}
                                </p>
                            </div>
                            <Button className="w-full rounded-xl gap-2" size="sm" asChild>
                                <a href="/calendar"><CalendarDays className="w-4 h-4" /> View Calendar</a>
                            </Button>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 bg-muted rounded-xl p-4">
                            <CalendarDays className="w-8 h-8 text-muted-foreground/30" />
                            <p className="text-sm font-medium text-muted-foreground">No upcoming sessions</p>
                            <p className="text-xs text-muted-foreground/60">Schedule a session to get started</p>
                        </div>
                    )}
                </div>

                {/* Recent patients */}
                <div className="bg-white rounded-2xl border border-border p-4 md:p-5 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold text-base">Recent Patients</h2>
                        <a href="/patients" className="text-[11px] text-[#2493A2] hover:underline">View all</a>
                    </div>
                    {loading ? (
                        <div className="space-y-2">
                            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
                        </div>
                    ) : data?.recent_patients.length ? (
                        <div className="space-y-2.5">
                            {data.recent_patients.map((p) => (
                                <div key={p.id} className="flex items-center gap-2.5 group cursor-pointer hover:bg-muted/50 rounded-lg px-1 py-0.5 transition-colors">
                                    <div className="w-7 h-7 rounded-full bg-[#2493A2]/10 text-[#2493A2] flex items-center justify-center text-[10px] font-bold shrink-0">
                                        {initials(p.full_name)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium truncate">{p.full_name}</p>
                                        <p className="text-[10px] text-muted-foreground">{p.patient_code} · {timeAgo(p.created_at)}</p>
                                    </div>
                                    <ArrowUpRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-center py-4">
                            <div>
                                <Users className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                                <p className="text-sm text-muted-foreground">No patients yet</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Bottom row ─────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[1fr_1fr_240px] gap-3 md:gap-4">

                {/* Staff */}
                <div className="bg-white rounded-2xl border border-border p-4 md:p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-base">Staff</h2>
                        <a href="/staff" className="text-[11px] border border-border rounded-lg px-2.5 py-1 text-muted-foreground hover:bg-muted transition-colors flex items-center gap-1">
                            <Plus className="w-3 h-3" /> Add
                        </a>
                    </div>
                    {loading ? (
                        <div className="space-y-3">
                            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
                        </div>
                    ) : data?.staff.length ? (
                        <div className="space-y-3">
                            {data.staff.slice(0, 5).map((m) => (
                                <div key={m.id} className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                                        {initials(m.full_name)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{m.full_name}</p>
                                        <p className="text-[11px] text-muted-foreground capitalize">{m.role.replace("_", " ")}</p>
                                    </div>
                                    <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 capitalize",
                                        ROLE_COLORS[m.role] ?? "bg-gray-100 text-gray-600")}>
                                        {m.role.replace("_", " ")}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-4 text-sm text-muted-foreground">No staff added yet</div>
                    )}
                </div>

                {/* Session status donut */}
                <div className="bg-white rounded-2xl border border-border p-4 md:p-5">
                    <h2 className="font-semibold text-base mb-4">Session Breakdown</h2>
                    {loading ? (
                        <div className="flex flex-col items-center gap-4">
                            <Skeleton className="w-32 h-32 rounded-full" />
                            <div className="w-full space-y-2">
                                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-4" />)}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-4">
                            <div className="relative w-28 h-28 md:w-32 md:h-32">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                                    <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="12" className="text-muted" />
                                    <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="12"
                                        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
                                        className="text-foreground transition-all duration-700" />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-2xl font-bold">{completedPct}%</span>
                                    <span className="text-[10px] text-muted-foreground">Done</span>
                                </div>
                            </div>
                            <div className="w-full space-y-2">
                                {[
                                    { label: "Completed", count: data?.session_status.completed ?? 0, color: "bg-foreground" },
                                    { label: "Scheduled", count: data?.session_status.scheduled ?? 0, color: "bg-[#2493A2]" },
                                    { label: "Cancelled", count: data?.session_status.cancelled ?? 0, color: "bg-muted-foreground/30" },
                                    { label: "No-Show", count: data?.session_status.no_show ?? 0, color: "bg-red-200" },
                                ].filter(i => i.count > 0).map((item) => {
                                    const pct = statusTotal > 0 ? Math.round((item.count / statusTotal) * 100) : 0;
                                    return (
                                        <div key={item.label} className="flex items-center gap-2 text-xs">
                                            <div className={cn("w-2 h-2 rounded-full shrink-0", item.color)} />
                                            <span className="text-muted-foreground flex-1">{item.label}</span>
                                            <span className="font-medium text-foreground">{item.count}</span>
                                            <span className="text-muted-foreground w-8 text-right">{pct}%</span>
                                        </div>
                                    );
                                })}
                                {statusTotal === 0 && (
                                    <p className="text-center text-sm text-muted-foreground py-2">No sessions yet</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Alerts + clock */}
                <div className="bg-foreground text-white rounded-2xl p-4 md:p-5 flex flex-col gap-3 md:col-span-2 xl:col-span-1">
                    <p className="text-sm font-semibold text-white/70">Today's Alerts</p>
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-2">
                        {loading ? (
                            <>
                                <Skeleton className="h-14 bg-white/10" />
                                <Skeleton className="h-14 bg-white/10" />
                            </>
                        ) : (
                            <>
                                {(data?.stats.waitlist_count ?? 0) > 0 && (
                                    <div className="bg-white/10 rounded-xl p-3">
                                        <p className="text-xs font-medium">{data!.stats.waitlist_count} on Waitlist</p>
                                        <p className="text-[11px] text-white/60 mt-0.5">Patients awaiting slots</p>
                                    </div>
                                )}
                                {(data?.stats.unassigned_forms ?? 0) > 0 && (
                                    <div className="bg-white/10 rounded-xl p-3">
                                        <p className="text-xs font-medium">{data!.stats.unassigned_forms} Forms Unassigned</p>
                                        <p className="text-[11px] text-white/60 mt-0.5">Session types need forms</p>
                                    </div>
                                )}
                                {(data?.stats.waitlist_count ?? 0) === 0 && (data?.stats.unassigned_forms ?? 0) === 0 && !loading && (
                                    <div className="bg-white/10 rounded-xl p-3">
                                        <p className="text-xs font-medium flex items-center gap-1.5">
                                            <Activity className="w-3 h-3 text-emerald-400" /> All clear!
                                        </p>
                                        <p className="text-[11px] text-white/60 mt-0.5">No pending alerts</p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                    <div className="text-center">
                        <LiveClock />
                        <p className="text-[11px] text-white/50 mt-0.5">Current Time</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Isolated clock to avoid re-rendering the whole page every second
function LiveClock() {
    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const t = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(t);
    }, []);
    return (
        <p className="text-3xl font-bold tracking-tight tabular-nums">
            {time.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
        </p>
    );
}
