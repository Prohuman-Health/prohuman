"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Receipt, Search, RefreshCw, Filter, CheckCircle2,
    Clock, Ban, ChevronLeft, ChevronRight, X, AlertCircle,
    IndianRupee, TrendingUp, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { invoicesApi, type Invoice } from "@/lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ── Helpers ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
    return <div className={cn("animate-pulse bg-muted rounded-xl", className)} />;
}

const STATUS_STYLES: Record<string, string> = {
    paid: "border-emerald-200 text-emerald-700 bg-emerald-50",
    pending: "border-amber-200 text-amber-700 bg-amber-50",
    waived: "border-slate-200 text-slate-500 bg-slate-50",
};

const STATUS_ICONS: Record<string, React.ElementType> = {
    paid: CheckCircle2,
    pending: Clock,
    waived: Ban,
};

// ── Update Invoice Dialog ────────────────────────────────────────────────────

function UpdateDialog({ invoice, onClose, onSaved }: {
    invoice: Invoice;
    onClose: () => void;
    onSaved: (updated: Invoice) => void;
}) {
    const [status, setStatus] = useState<Invoice["status"]>(invoice.status);
    const [notes, setNotes] = useState(invoice.notes ?? "");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSave() {
        setSaving(true); setError(null);
        try {
            const updated = await invoicesApi.update(invoice.id, { status, notes: notes || undefined });
            onSaved(updated);
        } catch {
            setError("Failed to update invoice.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-base">Update Invoice</h3>
                    <button onClick={onClose} className="w-7 h-7 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="bg-muted/40 rounded-xl p-3.5 space-y-1">
                    <p className="text-sm font-bold">₹{Number(invoice.amount).toLocaleString("en-IN")}</p>
                    <p className="text-xs text-muted-foreground">{invoice.patient_name} · {invoice.patient_code}</p>
                    <p className="text-xs text-muted-foreground">{invoice.session_type}</p>
                </div>

                <div className="space-y-3">
                    <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Status</label>
                        <Select value={status} onValueChange={v => setStatus(v as Invoice["status"])}>
                            <SelectTrigger className="rounded-xl h-9">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                <SelectItem value="pending" className="rounded-lg">Pending</SelectItem>
                                <SelectItem value="paid" className="rounded-lg">Paid</SelectItem>
                                <SelectItem value="waived" className="rounded-lg">Waived</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Notes</label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            rows={2}
                            placeholder="Optional notes…"
                            className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                    </div>
                </div>

                {error && (
                    <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
                    </div>
                )}

                <div className="flex gap-2 pt-1">
                    <Button variant="outline" size="sm" className="flex-1 rounded-xl" onClick={onClose}>Cancel</Button>
                    <Button size="sm" className="flex-1 rounded-xl" onClick={handleSave} disabled={saving}>
                        {saving ? "Saving…" : "Save Changes"}
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ── Main Page ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 25;

export default function InvoicesPage() {
    const router = useRouter();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [page, setPage] = useState(1);

    const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);

    const load = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const params: Record<string, string> = {};
            if (statusFilter !== "all") params.status = statusFilter;
            const data = await invoicesApi.list(params);
            setInvoices(Array.isArray(data) ? data : []);
        } catch {
            setError("Failed to load invoices.");
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { setPage(1); }, [search, statusFilter]);

    const filtered = invoices.filter(inv => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            inv.patient_name.toLowerCase().includes(q) ||
            inv.patient_code.toLowerCase().includes(q) ||
            inv.session_type.toLowerCase().includes(q)
        );
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const total = invoices.reduce((s, i) => s + Number(i.amount), 0);
    const paid = invoices.filter(i => i.status === "paid").reduce((s, i) => s + Number(i.amount), 0);
    const pending = invoices.filter(i => i.status === "pending").reduce((s, i) => s + Number(i.amount), 0);

    function handleSaved(updated: Invoice) {
        setInvoices(prev => prev.map(inv => inv.id === updated.id ? updated : inv));
        setEditInvoice(null);
    }

    return (
        <div className="flex flex-col h-full overflow-hidden gap-4 p-4 md:p-5">
            {/* ── Header ── */}
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight">Invoices</h1>
                    <p className="text-sm text-muted-foreground mt-0.5 hidden sm:block">Manage billing & payments</p>
                </div>
                <button onClick={load}
                    className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
                    <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                </button>
            </div>

            {/* ── Stats ── */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: "Total Billed", value: `₹${total.toLocaleString("en-IN")}`, icon: IndianRupee, color: "bg-blue-50 text-blue-600" },
                    { label: "Collected", value: `₹${paid.toLocaleString("en-IN")}`, icon: TrendingUp, color: "bg-emerald-50 text-emerald-600" },
                    { label: "Outstanding", value: `₹${pending.toLocaleString("en-IN")}`, icon: AlertTriangle, color: "bg-amber-50 text-amber-600" },
                ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="bg-white rounded-2xl border border-border/50 p-4 flex items-center gap-3">
                        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", color)}>
                            <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide truncate">{label}</p>
                            <p className="text-base font-bold mt-0.5 truncate">{value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Filters ── */}
            <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[180px] max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input placeholder="Search patient, code…" className="pl-9 rounded-xl bg-white h-9" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div className="flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-9 rounded-xl w-32 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="all" className="rounded-lg text-xs">All Statuses</SelectItem>
                            <SelectItem value="pending" className="rounded-lg text-xs">Pending</SelectItem>
                            <SelectItem value="paid" className="rounded-lg text-xs">Paid</SelectItem>
                            <SelectItem value="waived" className="rounded-lg text-xs">Waived</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                {(search || statusFilter !== "all") && (
                    <button onClick={() => { setSearch(""); setStatusFilter("all"); }}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                        <X className="w-3.5 h-3.5" /> Clear
                    </button>
                )}
            </div>

            {/* ── Error ── */}
            {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
            )}

            {/* ── Table ── */}
            <div className="bg-white rounded-2xl border border-border/50 flex-1 flex flex-col overflow-hidden min-h-0">
                <div className="overflow-auto flex-1">
                    <table className="w-full text-sm min-w-[640px]">
                        <thead className="sticky top-0 bg-white border-b border-border z-10">
                            <tr>
                                {["Patient", "Session Type", "Amount", "Date", "Status", ""].map(h => (
                                    <th key={h} className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3.5">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: 8 }).map((_, i) => (
                                    <tr key={i} className="border-b border-border/60">
                                        {Array.from({ length: 6 }).map((_, j) => (
                                            <td key={j} className="px-5 py-4"><Skeleton className="h-4 w-full" /></td>
                                        ))}
                                    </tr>
                                ))
                            ) : paginated.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-16 text-muted-foreground text-sm">
                                        <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                        No invoices found
                                    </td>
                                </tr>
                            ) : paginated.map(inv => {
                                const StatusIcon = STATUS_ICONS[inv.status] ?? Clock;
                                return (
                                    <tr key={inv.id} className="border-b border-border/60 hover:bg-muted/20 transition-colors">
                                        <td className="px-5 py-3.5">
                                            <button
                                                onClick={() => router.push(`/patients/${inv.patient_id}`)}
                                                className="text-left hover:underline"
                                            >
                                                <p className="font-medium text-sm">{inv.patient_name}</p>
                                                <p className="text-[11px] text-muted-foreground">{inv.patient_code}</p>
                                            </button>
                                        </td>
                                        <td className="px-5 py-3.5 text-xs text-muted-foreground">{inv.session_type}</td>
                                        <td className="px-5 py-3.5">
                                            <span className="font-bold text-sm">₹{Number(inv.amount).toLocaleString("en-IN")}</span>
                                        </td>
                                        <td className="px-5 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                                            {new Date(inv.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <Badge variant="outline" className={cn("gap-1 text-[11px] rounded-full px-2.5 font-medium capitalize", STATUS_STYLES[inv.status] ?? "")}>
                                                <StatusIcon className="w-3 h-3" />
                                                {inv.status}
                                            </Badge>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <button
                                                onClick={() => setEditInvoice(inv)}
                                                className="text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
                                            >
                                                Edit
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-5 py-3 border-t border-border/60 text-xs text-muted-foreground shrink-0">
                        <span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setPage(p => p - 1)} disabled={page === 1}
                                className="w-7 h-7 rounded-lg border border-border flex items-center justify-center disabled:opacity-40 hover:bg-muted transition-colors">
                                <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            <span className="px-2">{page} / {totalPages}</span>
                            <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages}
                                className="w-7 h-7 rounded-lg border border-border flex items-center justify-center disabled:opacity-40 hover:bg-muted transition-colors">
                                <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Update dialog */}
            {editInvoice && (
                <UpdateDialog
                    invoice={editInvoice}
                    onClose={() => setEditInvoice(null)}
                    onSaved={handleSaved}
                />
            )}
        </div>
    );
}
