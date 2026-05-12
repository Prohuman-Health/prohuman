"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Package, Search, AlertTriangle, RefreshCw, X, Loader2,
    ChevronRight, ArrowUpCircle, ArrowDownCircle, Trash2, RotateCcw, PackageOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
    inventoryApi, InventoryItem, InventoryTransaction,
    InventoryCategory, InventoryTxType,
} from "@/lib/api";

const CATEGORIES: { value: InventoryCategory; label: string }[] = [
    { value: "consumable",  label: "Consumable" },
    { value: "equipment",   label: "Equipment" },
    { value: "medication",  label: "Medication" },
    { value: "linen",       label: "Linen" },
    { value: "stationery",  label: "Stationery" },
    { value: "other",       label: "Other" },
];

const TX_TYPES: { value: InventoryTxType; label: string; icon: React.ElementType; color: string }[] = [
    { value: "use",        label: "Record Use",  icon: ArrowDownCircle, color: "text-blue-600" },
    { value: "wastage",    label: "Wastage",     icon: Trash2,          color: "text-red-500" },
    { value: "restock",    label: "Restock",     icon: ArrowUpCircle,   color: "text-emerald-600" },
    { value: "adjustment", label: "Adjustment",  icon: RotateCcw,       color: "text-amber-600" },
];

function categoryColor(cat: InventoryCategory): string {
    const map: Record<InventoryCategory, string> = {
        consumable: "bg-blue-50 text-blue-700 border-blue-200",
        equipment:  "bg-purple-50 text-purple-700 border-purple-200",
        medication: "bg-red-50 text-red-700 border-red-200",
        linen:      "bg-teal-50 text-teal-700 border-teal-200",
        stationery: "bg-amber-50 text-amber-700 border-amber-200",
        other:      "bg-muted text-muted-foreground border-border",
    };
    return map[cat] ?? "bg-muted text-muted-foreground";
}

function Skeleton({ className }: { className?: string }) {
    return <div className={cn("animate-pulse bg-muted rounded-xl", className)} />;
}

// ── Transaction Dialog (use/wastage/restock/adjustment) ───────────────────────

function TransactionDialog({ item, onClose, onDone }: {
    item: InventoryItem;
    onClose: () => void;
    onDone: (newStock: number) => void;
}) {
    const [type, setType] = useState<InventoryTxType>("use");
    const [qty, setQty] = useState(1);
    const [notes, setNotes] = useState("");
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    async function submit() {
        if (!qty) { setErr("Quantity is required"); return; }
        setSaving(true); setErr(null);
        try {
            const result = await inventoryApi.recordTransaction(item.id, { type, quantity: qty, notes: notes || undefined });
            onDone(result.stock_after);
        } catch (e: unknown) {
            setErr(e instanceof Error ? e.message : "Failed to record");
        } finally { setSaving(false); }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h2 className="font-semibold text-base">Record Stock Movement</h2>
                        <p className="text-xs text-muted-foreground">{item.name} · Current: {item.current_stock} {item.unit}</p>
                    </div>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-4">
                    {TX_TYPES.map(t => (
                        <button key={t.value} onClick={() => setType(t.value)}
                            className={cn("flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-colors",
                                type === t.value ? "border-[#2493A2] bg-[#2493A2]/5 text-[#2493A2]" : "border-border hover:bg-muted/60 text-muted-foreground")}>
                            <t.icon className={cn("w-3.5 h-3.5", type === t.value ? "text-[#2493A2]" : t.color)} />
                            {t.label}
                        </button>
                    ))}
                </div>
                <div className="space-y-3">
                    <Input type="number" value={qty} onChange={e => setQty(Number(e.target.value))}
                        placeholder={`Quantity (${item.unit})`} className="rounded-xl h-9 text-sm"
                        min={type === "adjustment" ? undefined : 1} />
                    <Input placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} className="rounded-xl h-9 text-sm" />
                    {err && <p className="text-xs text-red-500">{err}</p>}
                </div>
                <div className="flex gap-2 mt-5">
                    <Button variant="outline" className="flex-1 rounded-xl h-9 text-sm" onClick={onClose}>Cancel</Button>
                    <Button className="flex-1 rounded-xl h-9 text-sm bg-[#2493A2] hover:bg-[#1e7d8c]" onClick={submit} disabled={saving}>
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Record"}
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ── Transaction History Panel ─────────────────────────────────────────────────

function TransactionHistory({ item, onClose }: { item: InventoryItem; onClose: () => void }) {
    const [txs, setTxs] = useState<InventoryTransaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        inventoryApi.listTransactions(item.id).then(setTxs).catch(() => {}).finally(() => setLoading(false));
    }, [item.id]);

    const txMeta: Record<InventoryTxType, { icon: React.ElementType; color: string; sign: string }> = {
        restock:    { icon: ArrowUpCircle,   color: "text-emerald-600", sign: "+" },
        use:        { icon: ArrowDownCircle, color: "text-blue-600",    sign: "-" },
        wastage:    { icon: Trash2,          color: "text-red-500",     sign: "-" },
        adjustment: { icon: RotateCcw,       color: "text-amber-600",   sign: "±" },
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[80vh] flex flex-col">
                <div className="flex items-center justify-between mb-4 shrink-0">
                    <div>
                        <h2 className="font-semibold text-base">Stock History</h2>
                        <p className="text-xs text-muted-foreground">{item.name}</p>
                    </div>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2">
                    {loading && [...Array(4)].map((_, i) => <Skeleton key={i} className="h-14" />)}
                    {!loading && txs.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-8">No transactions recorded</p>
                    )}
                    {txs.map(tx => {
                        const meta = txMeta[tx.type];
                        return (
                            <div key={tx.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-muted/20">
                                <meta.icon className={cn("w-4 h-4 shrink-0", meta.color)} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold capitalize">{tx.type}</span>
                                        <span className={cn("text-xs font-bold", meta.color)}>
                                            {meta.sign}{tx.quantity} {item.unit}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground">→ {tx.stock_after}</span>
                                    </div>
                                    <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5">
                                        <span>{tx.created_by_name ?? "System"}</span>
                                        <span>·</span>
                                        <span>{new Date(tx.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                                        {tx.notes && <><span>·</span><span className="truncate">{tx.notes}</span></>}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function InventoryPage() {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState<string>("all");
    const [lowStockOnly, setLowStockOnly] = useState(false);
    const [txItem, setTxItem] = useState<InventoryItem | null>(null);
    const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null);
    const [lowStockCount, setLowStockCount] = useState(0);

    const loadItems = useCallback(async () => {
        setLoading(true);
        try {
            const [all, lowStock] = await Promise.all([
                inventoryApi.listItems({ category: categoryFilter !== "all" ? categoryFilter : undefined, search: search || undefined, low_stock: lowStockOnly || undefined }),
                inventoryApi.getLowStock(),
            ]);
            setItems(all);
            setLowStockCount(lowStock.length);
        } catch { /* silent */ } finally { setLoading(false); }
    }, [categoryFilter, search, lowStockOnly]);

    useEffect(() => { loadItems(); }, [loadItems]);

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-5 lg:p-6 max-w-5xl mx-auto space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <Package className="w-5 h-5 text-[#2493A2]" /> Inventory
                    </h1>
                    <p className="text-xs text-muted-foreground mt-0.5">View stock levels and record usage</p>
                </div>
                <button onClick={loadItems} className="w-8 h-8 flex items-center justify-center rounded-xl border border-border hover:bg-muted/60 text-muted-foreground transition-colors">
                    <RefreshCw className="w-3.5 h-3.5" />
                </button>
            </div>

            {lowStockCount > 0 && (
                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-amber-50 border border-amber-200">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <p className="text-sm text-amber-800">
                        <span className="font-semibold">{lowStockCount} item{lowStockCount > 1 ? "s" : ""}</span> below minimum stock
                    </p>
                    <button onClick={() => setLowStockOnly(true)}
                        className="ml-auto text-xs text-amber-700 font-medium hover:text-amber-900 underline-offset-2 hover:underline">
                        Show only
                    </button>
                </div>
            )}

            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-48">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input placeholder="Search items…" value={search} onChange={e => setSearch(e.target.value)}
                        className="pl-9 rounded-xl h-9 text-sm" />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-40 rounded-xl h-9 text-sm">
                        <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                        <SelectItem value="all" className="rounded-lg text-sm">All Categories</SelectItem>
                        {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value} className="rounded-lg text-sm">{c.label}</SelectItem>)}
                    </SelectContent>
                </Select>
                <button onClick={() => setLowStockOnly(v => !v)}
                    className={cn("flex items-center gap-1.5 px-3 h-9 rounded-xl border text-xs font-medium transition-colors",
                        lowStockOnly ? "border-amber-400 bg-amber-50 text-amber-700" : "border-border hover:bg-muted/60 text-muted-foreground")}>
                    <AlertTriangle className="w-3.5 h-3.5" /> Low Stock
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-border/50 overflow-hidden">
                <div className="grid grid-cols-[1fr_120px_80px_80px_100px] gap-4 px-5 py-3 border-b border-border/60 bg-muted/30">
                    {["Item", "Category", "Unit", "Stock", "Actions"].map(h => (
                        <span key={h} className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{h}</span>
                    ))}
                </div>
                {loading && (
                    <div className="divide-y divide-border/40">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="grid grid-cols-[1fr_120px_80px_80px_100px] gap-4 px-5 py-4">
                                {[...Array(5)].map((_, j) => <Skeleton key={j} className="h-4" />)}
                            </div>
                        ))}
                    </div>
                )}
                {!loading && filteredItems.length === 0 && (
                    <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
                        <PackageOpen className="w-10 h-10 opacity-30" />
                        <p className="text-sm">No items found</p>
                    </div>
                )}
                <div className="divide-y divide-border/40">
                    {filteredItems.map(item => (
                        <div key={item.id} className="grid grid-cols-[1fr_120px_80px_80px_100px] gap-4 px-5 py-3.5 items-center hover:bg-muted/20 transition-colors">
                            <div>
                                <p className="text-sm font-medium">{item.name}</p>
                                {item.notes && <p className="text-[11px] text-muted-foreground truncate">{item.notes}</p>}
                            </div>
                            <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border w-fit", categoryColor(item.category))}>
                                {CATEGORIES.find(c => c.value === item.category)?.label ?? item.category}
                            </span>
                            <span className="text-sm text-muted-foreground">{item.unit}</span>
                            <span className={cn("text-sm font-semibold", item.is_low_stock ? "text-amber-600" : "text-foreground")}>
                                {item.current_stock}
                                {item.is_low_stock && <AlertTriangle className="inline w-3 h-3 ml-1 text-amber-500" />}
                            </span>
                            <div className="flex items-center gap-1">
                                <button onClick={() => setTxItem(item)}
                                    className="px-2.5 h-7 rounded-lg bg-[#2493A2]/10 text-[#2493A2] hover:bg-[#2493A2]/20 text-[11px] font-medium transition-colors whitespace-nowrap">
                                    + Record
                                </button>
                                <button onClick={() => setHistoryItem(item)}
                                    className="w-7 h-7 rounded-lg hover:bg-muted text-muted-foreground transition-colors flex items-center justify-center"
                                    title="View History">
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {txItem && (
                <TransactionDialog
                    item={txItem}
                    onClose={() => setTxItem(null)}
                    onDone={newStock => {
                        setTxItem(null);
                        setItems(prev => prev.map(i => i.id === txItem.id
                            ? { ...i, current_stock: newStock, is_low_stock: newStock <= i.min_stock }
                            : i));
                    }}
                />
            )}
            {historyItem && <TransactionHistory item={historyItem} onClose={() => setHistoryItem(null)} />}
        </div>
    );
}
