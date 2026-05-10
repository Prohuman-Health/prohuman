"use client";

import { useState, useEffect, useCallback } from "react";
import {
    IndianRupee, ChevronLeft, ChevronRight, Plus, Trash2,
    TrendingUp, Clock, ArrowDownCircle, Wallet, X, Loader2,
    RefreshCw, Settings2, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { cashApi, CashDay, CashDebit, settingsApi } from "@/lib/api";

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
    return new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function monthRange(year: number, month: number) {
    const from = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const to = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    return { from, to };
}

function Skeleton({ className }: { className?: string }) {
    return <div className={cn("animate-pulse bg-muted rounded-xl", className)} />;
}

// ── Add Debit Dialog ─────────────────────────────────────────────────────────

function AddDebitDialog({
    date,
    onClose,
    onAdded,
}: {
    date: string;
    onClose: () => void;
    onAdded: () => void;
}) {
    const [amount, setAmount] = useState("");
    const [desc, setDesc] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold">Add Cash Debit</h2>
                    <button onClick={onClose} className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <p className="text-xs text-muted-foreground">
                    Recording debit for <span className="font-mono font-medium">{date}</span>
                </p>
                <div className="space-y-3">
                    <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Amount (₹)</label>
                        <Input
                            type="number" min="1" step="0.01"
                            value={amount} onChange={e => setAmount(e.target.value)}
                            placeholder="0.00" className="rounded-xl"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Description</label>
                        <Input
                            value={desc} onChange={e => setDesc(e.target.value)}
                            placeholder="e.g. Purchased medical supplies" className="rounded-xl"
                        />
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

// ── Day Detail Panel ─────────────────────────────────────────────────────────

function DayPanel({
    day,
    onAddDebit,
    onDeleteDebit,
    onClose,
}: {
    day: CashDay;
    onAddDebit: (date: string) => void;
    onDeleteDebit: (id: string) => void;
    onClose: () => void;
}) {
    const dateLabel = new Date(day.date + "T12:00:00").toLocaleDateString("en-IN", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
    });

    return (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-border/60 px-5 py-4 flex items-center justify-between rounded-t-2xl">
                    <div>
                        <p className="text-[11px] text-muted-foreground font-medium">Day Detail</p>
                        <p className="text-sm font-bold">{dateLabel}</p>
                    </div>
                    <button onClick={onClose} className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="p-5 space-y-4">
                    {/* Summary cards */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                            <p className="text-[10px] text-emerald-600 font-medium uppercase tracking-wide">Collected</p>
                            <p className="text-base font-bold text-emerald-700 mt-0.5">₹{fmt(day.collected)}</p>
                        </div>
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                            <p className="text-[10px] text-amber-600 font-medium uppercase tracking-wide">Pending</p>
                            <p className="text-base font-bold text-amber-700 mt-0.5">₹{fmt(day.pending)}</p>
                        </div>
                        <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                            <p className="text-[10px] text-red-600 font-medium uppercase tracking-wide">Debits</p>
                            <p className="text-base font-bold text-red-700 mt-0.5">₹{fmt(day.debit_total)}</p>
                        </div>
                    </div>

                    {/* Net */}
                    <div className={cn(
                        "rounded-xl p-3 flex items-center justify-between",
                        day.net >= 0 ? "bg-blue-50 border border-blue-200" : "bg-red-50 border border-red-200"
                    )}>
                        <p className="text-sm font-medium text-muted-foreground">Net balance</p>
                        <p className={cn("text-lg font-bold", day.net >= 0 ? "text-blue-700" : "text-red-700")}>
                            ₹{fmt(day.net)}
                        </p>
                    </div>

                    {/* Debits list */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Debit Entries</p>
                            <button
                                onClick={() => onAddDebit(day.date)}
                                className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
                            >
                                <Plus className="w-3.5 h-3.5" /> Add
                            </button>
                        </div>
                        {day.debits.length === 0 ? (
                            <p className="text-xs text-muted-foreground py-3 text-center">No debit entries for this day.</p>
                        ) : (
                            <div className="space-y-2">
                                {day.debits.map((d: CashDebit) => (
                                    <div key={d.id} className="flex items-start gap-3 rounded-xl border border-border/60 px-3 py-2.5 bg-muted/20">
                                        <ArrowDownCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{d.description}</p>
                                            <p className="text-[11px] text-muted-foreground">
                                                {d.created_by_name ?? "—"} · {new Date(d.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-sm font-bold text-red-600">₹{fmt(parseFloat(String(d.amount)))}</span>
                                            <button
                                                onClick={() => onDeleteDebit(d.id)}
                                                className="w-6 h-6 rounded-lg hover:bg-red-100 text-muted-foreground hover:text-red-600 flex items-center justify-center"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type ViewScope = "daily" | "weekly" | "monthly";

export default function CashRegisterPage() {
    const today = new Date();
    const [year, setYear]   = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth() + 1);

    const [summary, setSummary] = useState<{ days: CashDay[]; total_collected: number; total_pending: number; total_debits: number; total_net: number } | null>(null);
    const [loading, setLoading]   = useState(true);
    const [error, setError]       = useState<string | null>(null);

    const [selectedDay, setSelectedDay] = useState<CashDay | null>(null);
    const [addDebitFor, setAddDebitFor]  = useState<string | null>(null);

    // Settings
    const [viewScope, setViewScope]   = useState<ViewScope>("monthly");
    const [scopeSaving, setScopeSaving] = useState(false);
    const [scopeSaved, setScopeSaved]   = useState(false);

    const load = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const { from, to } = monthRange(year, month);
            const data = await cashApi.summary(from, to);
            setSummary(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load");
        } finally {
            setLoading(false);
        }
    }, [year, month]);

    useEffect(() => { load(); }, [load]);

    // Load scope setting on mount
    useEffect(() => {
        settingsApi.list().then(list => {
            const s = list.find((x: { key: string }) => x.key === "cash_receptionist_view_scope");
            if (s) setViewScope(String(s.value).replace(/"/g, "") as ViewScope);
        }).catch(() => {});
    }, []);

    async function saveScope(val: ViewScope) {
        setViewScope(val);
        setScopeSaving(true);
        try {
            await settingsApi.upsert("cash_receptionist_view_scope", val);
            setScopeSaved(true);
            setTimeout(() => setScopeSaved(false), 2000);
        } catch {/* ignore */}
        finally { setScopeSaving(false); }
    }

    function prevMonth() {
        if (month === 1) { setYear(y => y - 1); setMonth(12); }
        else setMonth(m => m - 1);
    }
    function nextMonth() {
        if (month === 12) { setYear(y => y + 1); setMonth(1); }
        else setMonth(m => m + 1);
    }

    async function handleDeleteDebit(id: string) {
        await cashApi.deleteDebit(id);
        await load();
        if (selectedDay) {
            // refresh the selected day object from new data
            setSummary(prev => {
                if (!prev) return prev;
                const updated = prev.days.find(d => d.date === selectedDay.date);
                if (updated) setSelectedDay(updated);
                return prev;
            });
        }
    }

    const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

    const todayStr = today.toISOString().slice(0, 10);

    return (
        <div className="flex flex-col h-full p-4 md:p-5 gap-4 overflow-hidden">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1">
                    <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-emerald-600" /> Cash Register
                    </h1>
                    <p className="text-xs text-muted-foreground mt-0.5">Daily cash collection, pending amounts and debit entries</p>
                </div>

                {/* Month nav */}
                <div className="flex items-center gap-2">
                    <button onClick={prevMonth} className="w-8 h-8 rounded-xl border border-border/60 bg-white flex items-center justify-center hover:bg-muted transition-colors">
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-semibold w-28 text-center">{MONTH_NAMES[month - 1]} {year}</span>
                    <button onClick={nextMonth} className="w-8 h-8 rounded-xl border border-border/60 bg-white flex items-center justify-center hover:bg-muted transition-colors">
                        <ChevronRight className="w-4 h-4" />
                    </button>
                    <button onClick={load} className="w-8 h-8 rounded-xl border border-border/60 bg-white flex items-center justify-center hover:bg-muted transition-colors ml-1">
                        <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                    </button>
                </div>
            </div>

            {/* Settings bar */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-border/60 bg-white">
                <Settings2 className="w-4 h-4 text-muted-foreground shrink-0" />
                <p className="text-sm font-medium text-muted-foreground flex-1">Receptionist can view</p>
                <Select value={viewScope} onValueChange={v => saveScope(v as ViewScope)}>
                    <SelectTrigger className="w-36 rounded-xl text-sm h-8">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="daily">Daily only</SelectItem>
                        <SelectItem value="weekly">Weekly (7 days)</SelectItem>
                        <SelectItem value="monthly">Full month</SelectItem>
                    </SelectContent>
                </Select>
                {scopeSaving && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />}
                {scopeSaved  && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
            </div>

            {/* Summary totals */}
            {!loading && summary && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
                    {[
                        { label: "Total Collected", value: summary.total_collected, icon: TrendingUp,        color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
                        { label: "Total Pending",   value: summary.total_pending,   icon: Clock,             color: "text-amber-600",   bg: "bg-amber-50 border-amber-200"   },
                        { label: "Total Debits",    value: summary.total_debits,    icon: ArrowDownCircle,   color: "text-red-600",     bg: "bg-red-50 border-red-200"       },
                        { label: "Net Balance",     value: summary.total_net,       icon: Wallet,            color: summary.total_net >= 0 ? "text-blue-600" : "text-red-600", bg: summary.total_net >= 0 ? "bg-blue-50 border-blue-200" : "bg-red-50 border-red-200" },
                    ].map(({ label, value, icon: Icon, color, bg }) => (
                        <div key={label} className={cn("rounded-2xl border p-4 flex items-center gap-3", bg)}>
                            <div className={cn("w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm")}>
                                <Icon className={cn("w-4.5 h-4.5", color)} />
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
                {/* Table header */}
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
                        Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="px-4 py-3">
                                <Skeleton className="h-8 w-full" />
                            </div>
                        ))
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-2">
                            <p className="text-sm text-red-500">{error}</p>
                            <Button variant="outline" size="sm" className="rounded-xl" onClick={load}>Retry</Button>
                        </div>
                    ) : (
                        summary?.days.map(day => {
                            const dateObj  = new Date(day.date + "T12:00:00");
                            const dayLabel = dateObj.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
                            const isToday  = day.date === todayStr;
                            const hasActivity = day.collected > 0 || day.pending > 0 || day.debit_total > 0;

                            return (
                                <div
                                    key={day.date}
                                    onClick={() => setSelectedDay(day)}
                                    className={cn(
                                        "grid grid-cols-[1.4fr_1fr_1fr_1fr_1fr_auto] px-4 py-3 items-center cursor-pointer hover:bg-muted/20 transition-colors",
                                        isToday && "bg-blue-50/60",
                                        !hasActivity && "opacity-50"
                                    )}
                                >
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
                                            onClick={e => { e.stopPropagation(); setAddDebitFor(day.date); }}
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

            {/* Day detail panel */}
            {selectedDay && (
                <DayPanel
                    day={selectedDay}
                    onAddDebit={date => { setSelectedDay(null); setAddDebitFor(date); }}
                    onDeleteDebit={async id => { await handleDeleteDebit(id); }}
                    onClose={() => setSelectedDay(null)}
                />
            )}

            {/* Add debit dialog */}
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
