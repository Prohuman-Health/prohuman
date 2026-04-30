"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
    CalendarDays, Clock, CheckCircle2, XCircle, AlertTriangle,
    RefreshCw, ChevronRight, User, Stethoscope,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { sessionsApi, Session } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

// ── Helpers ───────────────────────────────────────────────────────────────────
function today(): string {
    return new Date().toISOString().slice(0, 10);
}

function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
}

function initials(name: string) {
    return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

// ── Status helpers ─────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
    pending:   "bg-blue-50 text-blue-600 border-blue-100",
    scheduled: "bg-blue-50 text-blue-600 border-blue-100",
    completed: "bg-emerald-50 text-emerald-600 border-emerald-100",
    cancelled: "bg-red-50 text-red-500 border-red-100",
    no_show:   "bg-amber-50 text-amber-600 border-amber-100",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
    pending:   <Clock className="w-3 h-3" />,
    scheduled: <Clock className="w-3 h-3" />,
    completed: <CheckCircle2 className="w-3 h-3" />,
    cancelled: <XCircle className="w-3 h-3" />,
    no_show:   <AlertTriangle className="w-3 h-3" />,
};

function StatusBadge({ status }: { status: string }) {
    return (
        <span className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
            STATUS_STYLES[status] ?? "bg-gray-50 text-gray-500 border-gray-200"
        )}>
            {STATUS_ICONS[status] ?? <Clock className="w-3 h-3" />}
            {status.replace("_", " ")}
        </span>
    );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
    return <div className={cn("animate-pulse bg-gray-100 rounded-xl", className)} />;
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color }: {
    label: string; value: number | string; icon: React.ElementType; color: string;
}) {
    return (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
            <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", color)}>
                <Icon className="w-5 h-5" />
            </div>
            <div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
        </div>
    );
}

// ── Session card ──────────────────────────────────────────────────────────────
function SessionCard({ session }: { session: Session }) {
    const isUpcoming = session.status === "pending" || session.status === "scheduled";
    const timeNow = Date.now();
    const sessionTime = new Date(session.scheduled_at).getTime();
    const isNow = isUpcoming && sessionTime <= timeNow + 15 * 60_000 && sessionTime >= timeNow - 5 * 60_000;

    return (
        <div className={cn(
            "flex items-start gap-4 p-4 rounded-2xl border transition-all",
            isNow
                ? "bg-[#2493A2]/5 border-[#2493A2]/30 shadow-sm"
                : "bg-white border-gray-100 hover:border-gray-200"
        )}>
            {/* Time */}
            <div className="text-center shrink-0 min-w-[52px]">
                <p className={cn("text-base font-bold", isNow ? "text-[#2493A2]" : "text-gray-800")}>
                    {formatTime(session.scheduled_at)}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">{session.duration_minutes}m</p>
            </div>

            {/* Divider */}
            <div className={cn("w-0.5 self-stretch rounded-full shrink-0", isNow ? "bg-[#2493A2]" : "bg-gray-100")} />

            {/* Details */}
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{session.patient_name}</p>
                        <p className="text-xs text-gray-400 font-mono mt-0.5">{session.patient_code}</p>
                    </div>
                    <StatusBadge status={session.status} />
                </div>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                        <Stethoscope className="w-3 h-3" />
                        {session.session_type}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                        <CalendarDays className="w-3 h-3" />
                        {session.branch_name}
                    </span>
                </div>
            </div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
    const { user } = useAuth();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedDate, setSelectedDate] = useState(today());

    const loadSchedule = useCallback(async (date: string, silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);
        setError(null);
        try {
            const data = await sessionsApi.mySchedule(date);
            setSessions(data);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to load schedule");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadSchedule(selectedDate);
    }, [selectedDate, loadSchedule]);

    // ── Computed stats ────────────────────────────────────────────────────────
    const total     = sessions.length;
    const completed = sessions.filter(s => s.status === "completed").length;
    const upcoming  = sessions.filter(s => s.status === "pending" || s.status === "scheduled").length;
    const noShows   = sessions.filter(s => s.status === "no_show").length;

    const isToday = selectedDate === today();

    return (
        <div className="p-4 md:p-6 space-y-5 max-w-3xl mx-auto">

            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
                        {isToday ? "Today" : new Date(selectedDate + "T00:00:00").toLocaleDateString("en-IN", {
                            weekday: "long", day: "numeric", month: "long",
                        })}
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Welcome back, {user?.full_name?.split(" ")[0]}
                        {user?.specialty ? ` · ${user.specialty}` : ""}
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={() => loadSchedule(selectedDate, true)}
                        disabled={refreshing}
                        className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors"
                    >
                        <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
                    </button>
                    <Link
                        href="/schedule"
                        className="h-9 px-4 rounded-xl bg-[#2493A2] text-white text-sm font-medium flex items-center gap-1.5 hover:bg-[#1d7a87] transition-colors"
                    >
                        <CalendarDays className="w-4 h-4" />
                        <span className="hidden sm:inline">Schedule</span>
                    </Link>
                </div>
            </div>

            {/* ── Date picker ─────────────────────────────────────────────── */}
            <div className="flex items-center gap-2">
                <input
                    type="date"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    className="h-9 px-3 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:border-[#2493A2] focus:ring-1 focus:ring-[#2493A2]/30 transition-all bg-white"
                />
                {!isToday && (
                    <button
                        onClick={() => setSelectedDate(today())}
                        className="h-9 px-3 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors bg-white"
                    >
                        Today
                    </button>
                )}
            </div>

            {/* ── Stats ───────────────────────────────────────────────────── */}
            {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatCard label="Total Sessions" value={total} icon={CalendarDays}
                        color="bg-blue-50 text-blue-600" />
                    <StatCard label="Upcoming" value={upcoming} icon={Clock}
                        color="bg-amber-50 text-amber-600" />
                    <StatCard label="Completed" value={completed} icon={CheckCircle2}
                        color="bg-emerald-50 text-emerald-600" />
                    <StatCard label="No-Shows" value={noShows} icon={AlertTriangle}
                        color="bg-red-50 text-red-500" />
                </div>
            )}

            {/* ── Error ───────────────────────────────────────────────────── */}
            {error && (
                <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
                    {error}
                </div>
            )}

            {/* ── Sessions list ────────────────────────────────────────────── */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-widest">
                        {isToday ? "Today&apos;s Sessions" : "Sessions"}
                        {!loading && <span className="ml-2 text-gray-400 font-normal normal-case tracking-normal">{total} total</span>}
                    </h2>
                    <Link href="/schedule" className="text-xs text-[#2493A2] hover:underline flex items-center gap-0.5">
                        View all <ChevronRight className="w-3 h-3" />
                    </Link>
                </div>

                {loading ? (
                    <div className="space-y-3">
                        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
                    </div>
                ) : sessions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                            <User className="w-7 h-7 text-gray-300" />
                        </div>
                        <p className="text-gray-500 font-medium">No sessions scheduled</p>
                        <p className="text-sm text-gray-400 mt-1">
                            {isToday ? "You have no sessions today." : "No sessions on this date."}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        {sessions.map(session => (
                            <SessionCard key={session.id} session={session} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
