"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Users, Search, RefreshCw, ChevronRight, Phone, Mail,
    AlertTriangle, Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { patientsApi, Patient } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

// ── Helpers ───────────────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
    return <div className={cn("animate-pulse bg-gray-100 rounded-xl", className)} />;
}

function PatientAvatar({ name }: { name: string }) {
    const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
    return (
        <div className="w-10 h-10 rounded-xl bg-[#2493A2]/10 text-[#2493A2] text-sm font-bold flex items-center justify-center shrink-0">
            {initials}
        </div>
    );
}

const GENDER_COLORS: Record<string, string> = {
    male:   "text-blue-500 bg-blue-50 border-blue-100",
    female: "text-pink-500 bg-pink-50 border-pink-100",
    other:  "text-violet-500 bg-violet-50 border-violet-100",
};

// ── Main ──────────────────────────────────────────────────────────────────────
export default function PatientsPage() {
    const { user } = useAuth();
    const router = useRouter();

    const [patients, setPatients] = useState<Patient[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 20;

    const load = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const params: Record<string, string> = {
                limit: String(PAGE_SIZE),
                offset: String((page - 1) * PAGE_SIZE),
            };
            // filter to own branch if available
            if (user?.branch_id) params.branch_id = user.branch_id;
            if (search) params.search = search;
            const d = await patientsApi.list(params);
            setPatients(d.patients ?? []);
            setTotal(d.total ?? 0);
        } catch {
            setError("Failed to load patients.");
        } finally { setLoading(false); }
    }, [user?.branch_id, search, page]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { setPage(1); }, [search]);

    const totalPages = Math.ceil(total / PAGE_SIZE);

    return (
        <div className="p-5 max-w-4xl mx-auto space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Patients</h1>
                    <p className="text-sm text-gray-400 mt-0.5">{total} patient{total !== 1 ? "s" : ""}</p>
                </div>
                <button onClick={load} className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors">
                    <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                </button>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search by name, code or phone…"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:ring-2 focus:ring-[#2493A2]/30 focus:border-[#2493A2]"
                />
            </div>

            {/* List */}
            {error ? (
                <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-sm text-red-600">
                    <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
                </div>
            ) : loading ? (
                <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
            ) : patients.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-16 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
                        <Users className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">{search ? "No patients match your search" : "No patients found"}</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {patients.map(p => (
                        <button key={p.id} onClick={() => router.push(`/patients/${p.id}`)}
                            className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 hover:border-[#2493A2]/40 hover:shadow-sm transition-all text-left">
                            <PatientAvatar name={p.full_name} />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-sm font-semibold text-gray-900 truncate">{p.full_name}</p>
                                    <span className={cn(
                                        "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border capitalize",
                                        GENDER_COLORS[p.gender] ?? "text-gray-400 bg-gray-50 border-gray-200"
                                    )}>{p.gender}</span>
                                </div>
                                <div className="flex items-center gap-3 mt-1 flex-wrap">
                                    <span className="inline-flex items-center gap-1 text-xs text-gray-400 font-mono">
                                        <Hash className="w-3 h-3" />{p.patient_code}
                                    </span>
                                    {p.phone && (
                                        <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                                            <Phone className="w-3 h-3" />{p.phone}
                                        </span>
                                    )}
                                    {p.email && (
                                        <span className="inline-flex items-center gap-1 text-xs text-gray-400 truncate">
                                            <Mail className="w-3 h-3" />{p.email}
                                        </span>
                                    )}
                                    <span className="text-xs text-gray-300">{p.age}y</span>
                                </div>
                                {p.complaints && (
                                    <p className="text-xs text-gray-400 truncate mt-0.5">{p.complaints}</p>
                                )}
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                        </button>
                    ))}
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
