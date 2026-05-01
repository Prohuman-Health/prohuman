"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    CalendarDays, Clock, CheckCircle2, XCircle, AlertTriangle,
    Search, RefreshCw, ChevronRight, Stethoscope, Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { sessionsApi, Session } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

// ── Helpers ───────────────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
    return <div className={cn("animate-pulse bg-gray-100 rounded-xl", className)} />;
}

const STATUS_STYLES: Record<string, string> = {
    pending:             "bg-blue-50 text-blue-600 border-blue-100",
    confirmed:           "bg-blue-50 text-blue-700 border-blue-200",
    completed:           "bg-emerald-50 text-emerald-600 border-emerald-100",
    cancelled:           "bg-gray-50 text-gray-400 border-gray-200",
    "no-show":           "bg-amber-50 text-amber-600 border-amber-100",
    "late-cancellation": "bg-orange-50 text-orange-500 border-orange-100",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
    pending:             <Clock className="w-3 h-3" />,
    confirmed:           <Clock className="w-3 h-3" />,
    completed:           <CheckCircle2 className="w-3 h-3" />,
    cancelled:           <XCircle className="w-3 h-3" />,
    "no-show":           <AlertTriangle className="w-3 h-3" />,
    "late-cancellation": <XCircle className="w-3 h-3" />,
};

function StatusBadge({ status }: { status: string }) {
    return (
        <span className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap",
            STATUS_STYLES[status] ?? "bg-gray-50 text-gray-500 border-gray-200"
        )}>
            {STATUS_ICONS[status] ?? <Clock className="w-3 h-3" />}
            {status.replace(/-/g, " ")}
        </span>
    );
}

const STATUSES = ["all", "pending", "confirmed", "completed", "no-show", "cancelled", "late-cancellation"] as const;
type StatusFilter = typeof STATUSES[number];

// ── Main ──────────────────────────────────────────────────────────────────────
export default function SessionsPage() {
    const { user } = useAuth();
    const router = useRouter();

    const [sessions, setSessions] = useState<Session[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<StatusFilter>("all");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 20;

    const load = useCallback(async () => {
        if (!user?.doctor_id) return;
        setLoading(true); setError(null);
        try {
            const params: Record<string, string> = {
                doctor_id: user.doctor_id,
                limit: String(PAGE_SIZE),
                offset: String((page - 1) * PAGE_SIZE),
            };
            if (status !== "all") params.status = status;
            const d = await sessionsApi.list(params);
            setSessions(d.sessions);
            setTotal(d.total);
        } catch {
            setError("Failed to load sessions.");
        } finally { setLoading(false); }
    }, [user?.doctor_id, status, page]);

    useEffect(() => { load(); }, [load]);
    // reset to page 1 when filter changes
    useEffect(() => { setPage(1); }, [status]);

    const filtered = search
        ? sessions.filter(s =>
            s.patient_name.toLowerCase().includes(search.toLowerCase()) ||
            s.patient_code.toLowerCase().includes(search.toLowerCase()) ||
            s.session_type.toLowerCase().includes(search.toLowerCase()))
        : sessions;

    const totalPages = Math.ceil(total / PAGE_SIZE);

    return (
        <div className="p-5 max-w-4xl mx-auto space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">My Sessions</h1>
                    <p className="text-sm text-gray-400 mt-0.5">{total} session{total !== 1 ? "s" : ""} total</p>
                </div>
                <button onClick={load} className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors">
                    <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search patient or type…"
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:ring-2 focus:ring-[#2493A2]/30 focus:border-[#2493A2]"
                    />
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                    <Filter className="w-3.5 h-3.5 text-gray-400 mr-1" />
                    {STATUSES.map(s => (
                        <button key={s} onClick={() => setStatus(s)}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all capitalize",
                                status === s
                                    ? "bg-[#2493A2] text-white border-[#2493A2]"
                                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                            )}>
                            {s === "all" ? "All" : s.replace(/-/g, " ")}
                        </button>
                    ))}
                </div>
            </div>

            {/* Session list */}
            {error ? (
                <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-sm text-red-600">
                    <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
                </div>
            ) : loading ? (
                <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-16 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
                        <CalendarDays className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">{search ? "No sessions match your search" : "No sessions found"}</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map(s => {
                        const dt = new Date(s.scheduled_at);
                        return (
                            <button key={s.id} onClick={() => router.push(`/sessions/${s.id}`)}
                                className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 hover:border-[#2493A2]/40 hover:shadow-sm transition-all text-left">
                                <div className="text-center shrink-0 min-w-[52px]">
                                    <p className="text-sm font-bold text-gray-800">
                                        {dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                                    </p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">{s.duration_minutes}m</p>
                                </div>
                                <div className="w-0.5 self-stretch bg-gray-100 rounded-full shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 truncate">{s.patient_name}</p>
                                            <p className="text-xs text-gray-400 font-mono">{s.patient_code}</p>
                                        </div>
                                        <StatusBadge status={s.status} />
                                    </div>
                                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                                            <Stethoscope className="w-3 h-3" />{s.session_type}
                                        </span>
                                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                                            <CalendarDays className="w-3 h-3" />
                                            {dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                        </span>
                                        <span className="text-xs text-gray-400">{s.branch_name}</span>
                                    </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                    <p className="text-xs text-gray-400">Page {page} of {totalPages}</p>
                    <div className="flex gap-2">
                        <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                            className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-500 disabled:opacity-40 hover:bg-gray-50 transition-colors">
                            Previous
                        </button>
                        <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                            className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-500 disabled:opacity-40 hover:bg-gray-50 transition-colors">
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
