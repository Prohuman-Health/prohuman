"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Wallet, ChevronLeft, ChevronRight, Plus,
    TrendingUp, Clock, ArrowDownCircle, X, Loader2, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { cashApi, CashDay, CashDebit, settingsApi } from "@/lib/api";

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
    return new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

type ViewScope = "daily" | "weekly" | "monthly";

function getRangeForScope(scope: ViewScope, anchor: Date): { from: string; to: string; label: string } {
    const pad = (n: number) => String(n).padStart(2, "0");
    const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (scope === "daily") {
        const s = iso(anchor);
        return {
            from: s, to: s,
            label: anchor.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
        };
    }
    if (scope === "weekly") {
        const day = anchor.getDay(); // 0=Sun
        const mon = new Date(anchor); mon.setDate(anchor.getDate() - ((day + 6) % 7));
        const sun = new Date(mon);   sun.setDate(mon.getDate() + 6);
        return {
            from: iso(mon), to: iso(sun),
            label: `${mon.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${sun.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`,
        };
    }
    // monthly
    const from = `${anchor.getFullYear()}-${pad(anchor.getMonth() + 1)}-01`;
    const lastDay = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
    const to = `${anchor.getFullYear()}-${pad(anchor.getMonth() + 1)}-${pad(lastDay)}`;
    const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    return { from, to, label: `${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}` };
}

function stepAnchor(anchor: Date, scope: ViewScope, dir: 1 | -1): Date {
    const d = new Date(anchor);
    if (scope === "daily")   d.setDate(d.getDate() + dir);
    if (scope === "weekly")  d.setDate(d.getDate() + dir * 7);
    if (scope === "monthly") d.setMonth(d.getMonth() + dir);
    return d;
}

function Skeleton({ className }: { className?: string }) {
    return <div className={cn("animate-pulse bg-muted rounded-xl", className)} />;
}

// ── Add Debit Dialog ─────────────────────────────────────────────────────────

function AddDebitDialog({ date, onClose, onAdded }: { date: string; onClose: () => void; onAdded: () => void }) {
    const [amount, setAmount] = useState("");
    const [desc, setDesc]     = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError]   = useState<string | null>(null);

    async function submit() {
        const n = parseFloat(amount);
        if (!n || n <= 0) { setError("Enter a valid amount"); return; }
        if (!desc.trim()) { setError("Description is required"); return; }
        setSaving(true); setError(null);
        try {
            await cashApi.createDebit({ date, amount: n, description: desc.trim() });
            onAdded();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to save");
        } finally { setSaving(false); }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold">Add Cash Debit</h2>
                    <button onClick={onClose} className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center"><X className="w-4 h-4" /></button>
                </div>
                <p className="text-xs text-muted-foreground">Recording debit for <span className="font-mono font-medium">{date}</span></p>
                <div className="space-y-3">
                    <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Amount (₹)</label>
                        <Input type="number" min="1" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="rounded-xl" />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Description</label>
                        <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="e.g. Purchased supplies" className="rounded-xl" />
                    </div>
                </div>
                {error && <p className="text-xs text-red-500">{error}</p>}
                <div className="flex gap-2 pt-1">
                    <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>Cancel</Button>
                    <Button className="flex-1 rounded-xl" onClick={submit} disabled={saving}>
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Debit"}
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CashRegisterPage() {
    const today  = new Date();
    const [scope, setScope]   = useState<ViewScope>("monthly");
    const [scopeLoaded, setScopeLoaded] = useState(false);
    const [anchor, setAnchor] = useState<Date>(today);

    const [summary, setSummary]   = useState<{ days: CashDay[]; total_collected: number; total_pending: number; total_debits: number; total_net: number } | null>(null);
    const [loading, setLoading]   = useState(true);
    const [error, setError]       = useState<string | null>(null);
    const [addDebitFor, setAddDebitFor] = useState<string | null>(null);

    // Load view scope from settings (admin-controlled)
    useEffect(() => {
        settingsApi.list().then(list => {
            const s = list.find((x: { key: string }) => x.key === "cash_receptionist_view_scope");
            if (s) {
                const v = String(s.value).replace(/"/g, "") as ViewScope;
                setScope(v);
            }
        }).catch(() => {})
        .finally(() => setScopeLoaded(true));
    }, []);

    const { from, to, label } = getRangeForScope(scope, anchor);

    const load = useCallback(async () => {
        if (!scopeLoaded) return;
        setLoading(true); setError(null);
        try {
            const data = await cashApi.summary(from, to);
            setSummary(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load");
        } finally { setLoading(false); }
    }, [from, to, scopeLoaded]);

    useEffect(() => { load(); }, [load]);

    const todayStr = today.toISOString().slice(0, 10);

    return (
        <div className="flex flex-col h-full p-4 md:p-5 gap-4 overflow-hidden">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1">
                    <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-emerald-600" /> Cash Register
                    </h1>
                    <p className="text-xs text-muted-foreground mt-0.5">Daily cash collection and pending amounts</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setAnchor(d => stepAnchor(d, scope, -1))}
                        className="w-8 h-8 rounded-xl border border-border/60 bg-white flex items-center justify-center hover:bg-muted transition-colors">
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-semibold min-w-[160px] text-center">{label}</span>
                    <button onClick={() => setAnchor(d => stepAnchor(d, scope, 1))}
                        className="w-8 h-8 rounded-xl border border-border/60 bg-white flex items-center justify-center hover:bg-muted transition-colors">
                        <ChevronRight className="w-4 h-4" />
                    </button>
                    <button onClick={load} className="w-8 h-8 rounded-xl border border-border/60 bg-white flex items-center justify-center hover:bg-muted transition-colors ml-1">
                        <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                    </button>
                </div>
            </div>

            {/* Totals */}
            {!loading && summary && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
                    {[
                        { label: "Collected",    value: summary.total_collected, icon: TrendingUp,      color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
                        { label: "Pending",      value: summary.total_pending,   icon: Clock,           color: "text-amber-600",   bg: "bg-amber-50 border-amber-200"   },
                        { label: "Debits",       value: summary.total_debits,    icon: ArrowDownCircle, color: "text-red-600",     bg: "bg-red-50 border-red-200"       },
                        { label: "Net Balance",  value: summary.total_net,       icon: Wallet,          color: summary.total_net >= 0 ? "text-blue-600" : "text-red-600", bg: summary.total_net >= 0 ? "bg-blue-50 border-blue-200" : "bg-red-50 border-red-200" },
                    ].map(({ label, value, icon: Icon, color, bg }) => (
                        <div key={label} className={cn("rounded-2xl border p-4 flex items-center gap-3", bg)}>
                            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm">
                                <Icon className={cn("w-4 h-4", color)} />
                            </div>
                            <div>
                                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
                                <p className={cn("text-base font-bold", color)}>₹{fmt(value)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Table */}
            <div className="flex-1 bg-white rounded-2xl border border-border/60 overflow-hidden flex flex-col min-h-0">
                <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr_1fr_auto] px-4 py-3 border-b border-border/60 bg-muted/30 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    <span>Date</span>
                    <span className="text-right">Collected</span>
                    <span className="text-right">Pending</span>
                    <span className="text-right">Debits</span>
                    <span className="text-right">Net</span>
                    <span className="w-16" />
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-border/40">
                    {loading ? (
                        Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="px-4 py-3"><Skeleton className="h-8 w-full" /></div>
                        ))
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-2">
                            <p className="text-sm text-red-500">{error}</p>
                            <Button variant="outline" size="sm" className="rounded-xl" onClick={load}>Retry</Button>
                        </div>
                    ) : (
                        summary?.days.map(day => {
                            const dateObj   = new Date(day.date + "T12:00:00");
                            const dayLabel  = dateObj.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
                            const isToday   = day.date === todayStr;
                            const hasActivity = day.collected > 0 || day.pending > 0 || day.debit_total > 0;

                            return (
                                <div key={day.date} className={cn(
                                    "grid grid-cols-[1.4fr_1fr_1fr_1fr_1fr_auto] px-4 py-3 items-center",
                                    isToday && "bg-blue-50/60",
                                    !hasActivity && "opacity-50"
                                )}>
                                    <div className="flex items-center gap-2">
                                        {isToday && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />}
                                        <span className={cn("text-sm font-medium", isToday && "text-blue-700")}>{dayLabel}</span>
                                        {day.debits.length > 0 && (
                                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 rounded-full border-red-200 text-red-600">
                                                {day.debits.length} debit{day.debits.length > 1 ? "s" : ""}
                                            </Badge>
                                        )}
                                    </div>
                                    <span className={cn("text-sm font-semibold text-right", day.collected > 0 ? "text-emerald-600" : "text-muted-foreground")}>
                                        {day.collected > 0 ? `₹${fmt(day.collected)}` : "—"}
                                    </span>
                                    <span className={cn("text-sm text-right", day.pending > 0 ? "text-amber-600 font-medium" : "text-muted-foreground")}>
                                        {day.pending > 0 ? `₹${fmt(day.pending)}` : "—"}
                                    </span>
                                    <span className={cn("text-sm text-right", day.debit_total > 0 ? "text-red-600 font-medium" : "text-muted-foreground")}>
                                        {day.debit_total > 0 ? `₹${fmt(day.debit_total)}` : "—"}
                                    </span>
                                    <span className={cn("text-sm font-bold text-right", day.net > 0 ? "text-blue-700" : day.net < 0 ? "text-red-600" : "text-muted-foreground")}>
                                        {hasActivity ? `₹${fmt(day.net)}` : "—"}
                                    </span>
                                    <div className="flex justify-end w-16">
                                        <button
                                            onClick={() => setAddDebitFor(day.date)}
                                            className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                                            title="Add debit"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Debit entries below table for current day */}
            {!loading && summary && (() => {
                const todayData = summary.days.find(d => d.date === todayStr);
                if (!todayData || todayData.debits.length === 0) return null;
                return (
                    <div className="bg-white rounded-2xl border border-border/60 p-4 shrink-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Today's Debit Entries</p>
                        <div className="space-y-2">
                            {todayData.debits.map((d: CashDebit) => (
                                <div key={d.id} className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50/40 px-3 py-2">
                                    <ArrowDownCircle className="w-4 h-4 text-red-500 shrink-0" />
                                    <p className="text-sm flex-1">{d.description}</p>
                                    <span className="text-sm font-bold text-red-600">₹{fmt(parseFloat(String(d.amount)))}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })()}

            {addDebitFor && (
                <AddDebitDialog
                    date={addDebitFor}
                    onClose={() => setAddDebitFor(null)}
                    onAdded={() => { setAddDebitFor(null); load(); }}
                />
            )}
        </div>
    );
}
