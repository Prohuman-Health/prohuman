"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Package, Plus, Search, AlertTriangle, RefreshCw, X, Loader2,
    ChevronRight, ArrowUpCircle, ArrowDownCircle, Minus, RotateCcw,
    Trash2, Pencil, CheckCircle2, PackageOpen, Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
    inventoryApi, InventoryItem, InventoryTransaction,
    InventoryCategory, InventoryTxType,
} from "@/lib/api";

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES: { value: InventoryCategory; label: string }[] = [
    { value: "consumable",  label: "Consumable" },
    { value: "equipment",   label: "Equipment" },
    { value: "medication",  label: "Medication" },
    { value: "linen",       label: "Linen" },
    { value: "stationery",  label: "Stationery" },
    { value: "other",       label: "Other" },
];

const TX_TYPES: { value: InventoryTxType; label: string; icon: React.ElementType; color: string }[] = [
    { value: "restock",    label: "Restock",    icon: ArrowUpCircle,   color: "text-emerald-600" },
    { value: "use",        label: "Use",         icon: ArrowDownCircle, color: "text-blue-600" },
    { value: "wastage",    label: "Wastage",     icon: Trash2,          color: "text-red-500" },
    { value: "adjustment", label: "Adjustment",  icon: RotateCcw,       color: "text-amber-600" },
];

function categoryLabel(cat: InventoryCategory) {
    return CATEGORIES.find(c => c.value === cat)?.label ?? cat;
}

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

// ── Item Form Dialog ──────────────────────────────────────────────────────────

function ItemFormDialog({ item, onClose, onSave }: {
    item: InventoryItem | null;
    onClose: () => void;
    onSave: (saved: InventoryItem) => void;
}) {
    const isEdit = !!item;
    const [name, setName] = useState(item?.name ?? "");
    const [category, setCategory] = useState<InventoryCategory>(item?.category ?? "consumable");
    const [unit, setUnit] = useState(item?.unit ?? "");
    const [currentStock, setCurrentStock] = useState(item?.current_stock ?? 0);
    const [minStock, setMinStock] = useState(item?.min_stock ?? 0);
    const [notes, setNotes] = useState(item?.notes ?? "");
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    async function submit() {
        if (!name.trim()) { setErr("Name is required"); return; }
        if (!unit.trim()) { setErr("Unit is required"); return; }
        setSaving(true); setErr(null);
        try {
            let saved: InventoryItem;
            if (isEdit) {
                saved = await inventoryApi.updateItem(item!.id, { name, category, unit, min_stock: minStock, notes });
            } else {
                saved = await inventoryApi.createItem({ name, category, unit, current_stock: currentStock, min_stock: minStock, notes });
            }
            onSave(saved);
        } catch (e: unknown) {
            setErr(e instanceof Error ? e.message : "Failed to save");
        } finally { setSaving(false); }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="font-semibold text-base">{isEdit ? "Edit Item" : "Add Inventory Item"}</h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                </div>
                <div className="space-y-3">
                    <Input placeholder="Item name *" value={name} onChange={e => setName(e.target.value)} className="rounded-xl h-9 text-sm" />
                    <div className="grid grid-cols-2 gap-3">
                        <Select value={category} onValueChange={v => setCategory(v as InventoryCategory)}>
                            <SelectTrigger className="rounded-xl h-9 text-sm">
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value} className="rounded-lg text-sm">{c.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Input placeholder="Unit (e.g. pcs, ml) *" value={unit} onChange={e => setUnit(e.target.value)} className="rounded-xl h-9 text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {!isEdit && (
                            <div>
                                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Opening Stock</label>
                                <Input type="number" min={0} value={currentStock} onChange={e => setCurrentStock(Number(e.target.value))} className="rounded-xl h-9 text-sm" />
                            </div>
                        )}
                        <div className={isEdit ? "col-span-2" : ""}>
                            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Min Stock (Alert Below)</label>
                            <Input type="number" min={0} value={minStock} onChange={e => setMinStock(Number(e.target.value))} className="rounded-xl h-9 text-sm" />
                        </div>
                    </div>
                    <Input placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} className="rounded-xl h-9 text-sm" />
                    {err && <p className="text-xs text-red-500">{err}</p>}
                </div>
                <div className="flex gap-2 mt-5">
                    <Button variant="outline" className="flex-1 rounded-xl h-9 text-sm" onClick={onClose}>Cancel</Button>
                    <Button className="flex-1 rounded-xl h-9 text-sm bg-[#2493A2] hover:bg-[#1e7d8c]" onClick={submit} disabled={saving}>
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (isEdit ? "Save Changes" : "Add Item")}
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ── Transaction Dialog ────────────────────────────────────────────────────────

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
        if (!qty || qty <= 0) { setErr("Quantity must be positive"); return; }
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
                        <h2 className="font-semibold text-base">Record Transaction</h2>
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
                    <div>
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
                            Quantity ({item.unit})
                            {type === "adjustment" && <span className="normal-case ml-1 font-normal">(positive = add, negative = subtract)</span>}
                        </label>
                        <Input type="number" value={qty}
                            onChange={e => setQty(Number(e.target.value))}
                            className="rounded-xl h-9 text-sm"
                            min={type === "adjustment" ? undefined : 1}
                        />
                    </div>
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
                        <h2 className="font-semibold text-base">Transaction History</h2>
                        <p className="text-xs text-muted-foreground">{item.name} · {item.unit}</p>
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
                                        <span>{new Date(tx.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
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
    const [editItem, setEditItem] = useState<InventoryItem | null | "new">(null);
    const [txItem, setTxItem] = useState<InventoryItem | null>(null);
    const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null);
    const [deactivating, setDeactivating] = useState<string | null>(null);
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

    async function deactivate(item: InventoryItem) {
        if (!confirm(`Remove "${item.name}" from inventory?`)) return;
        setDeactivating(item.id);
        try {
            await inventoryApi.deactivateItem(item.id);
            setItems(prev => prev.filter(i => i.id !== item.id));
            setLowStockCount(prev => item.is_low_stock ? prev - 1 : prev);
        } catch { /* ignore */ } finally { setDeactivating(null); }
    }

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.category.includes(search.toLowerCase())
    );

    return (
        <div className="p-5 lg:p-6 max-w-6xl mx-auto space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <Package className="w-5 h-5 text-[#2493A2]" /> Inventory
                    </h1>
                    <p className="text-xs text-muted-foreground mt-0.5">Track supplies, equipment, and consumables</p>
                </div>
                <Button className="rounded-xl h-9 text-sm gap-1.5 bg-[#2493A2] hover:bg-[#1e7d8c]"
                    onClick={() => setEditItem("new")}>
                    <Plus className="w-3.5 h-3.5" /> Add Item
                </Button>
            </div>

            {/* Low stock alert */}
            {lowStockCount > 0 && (
                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-amber-50 border border-amber-200">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <p className="text-sm text-amber-800">
                        <span className="font-semibold">{lowStockCount} item{lowStockCount > 1 ? "s" : ""}</span> below minimum stock level
                    </p>
                    <button onClick={() => setLowStockOnly(true)}
                        className="ml-auto text-xs text-amber-700 font-medium hover:text-amber-900 underline-offset-2 hover:underline">
                        Show only
                    </button>
                </div>
            )}

            {/* Filters */}
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
                <button onClick={loadItems} className="w-9 h-9 flex items-center justify-center rounded-xl border border-border hover:bg-muted/60 text-muted-foreground transition-colors">
                    <RefreshCw className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-border/50 overflow-hidden">
                {/* Header row */}
                <div className="grid grid-cols-[1fr_120px_80px_80px_80px_120px] gap-4 px-5 py-3 border-b border-border/60 bg-muted/30">
                    {["Item", "Category", "Unit", "Stock", "Min", "Actions"].map(h => (
                        <span key={h} className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{h}</span>
                    ))}
                </div>
                {loading && (
                    <div className="divide-y divide-border/40">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="grid grid-cols-[1fr_120px_80px_80px_80px_120px] gap-4 px-5 py-4">
                                {[...Array(6)].map((_, j) => <Skeleton key={j} className="h-4" />)}
                            </div>
                        ))}
                    </div>
                )}
                {!loading && filteredItems.length === 0 && (
                    <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
                        <PackageOpen className="w-10 h-10 opacity-30" />
                        <p className="text-sm">No items found</p>
                        <Button variant="outline" className="rounded-xl h-8 text-xs gap-1" onClick={() => setEditItem("new")}>
                            <Plus className="w-3.5 h-3.5" /> Add First Item
                        </Button>
                    </div>
                )}
                <div className="divide-y divide-border/40">
                    {filteredItems.map(item => (
                        <div key={item.id} className="grid grid-cols-[1fr_120px_80px_80px_80px_120px] gap-4 px-5 py-3.5 items-center hover:bg-muted/20 transition-colors">
                            <div>
                                <p className="text-sm font-medium">{item.name}</p>
                                {item.notes && <p className="text-[11px] text-muted-foreground truncate">{item.notes}</p>}
                            </div>
                            <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border w-fit", categoryColor(item.category))}>
                                {categoryLabel(item.category)}
                            </span>
                            <span className="text-sm text-muted-foreground">{item.unit}</span>
                            <span className={cn("text-sm font-semibold", item.is_low_stock ? "text-amber-600" : "text-foreground")}>
                                {item.current_stock}
                                {item.is_low_stock && <AlertTriangle className="inline w-3 h-3 ml-1 text-amber-500" />}
                            </span>
                            <span className="text-sm text-muted-foreground">{item.min_stock}</span>
                            <div className="flex items-center gap-1">
                                <button onClick={() => setTxItem(item)}
                                    className="w-7 h-7 rounded-lg hover:bg-[#2493A2]/10 hover:text-[#2493A2] text-muted-foreground transition-colors flex items-center justify-center"
                                    title="Record Transaction">
                                    <Plus className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => setHistoryItem(item)}
                                    className="w-7 h-7 rounded-lg hover:bg-muted text-muted-foreground transition-colors flex items-center justify-center"
                                    title="View History">
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => setEditItem(item)}
                                    className="w-7 h-7 rounded-lg hover:bg-muted text-muted-foreground transition-colors flex items-center justify-center"
                                    title="Edit">
                                    <Pencil className="w-3 h-3" />
                                </button>
                                <button onClick={() => deactivate(item)} disabled={deactivating === item.id}
                                    className="w-7 h-7 rounded-lg hover:bg-red-50 hover:text-red-500 text-muted-foreground transition-colors flex items-center justify-center"
                                    title="Remove">
                                    {deactivating === item.id
                                        ? <Loader2 className="w-3 h-3 animate-spin" />
                                        : <Trash2 className="w-3 h-3" />
                                    }
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Dialogs */}
            {(editItem === "new" || (editItem && editItem !== "new")) && (
                <ItemFormDialog
                    item={editItem === "new" ? null : editItem}
                    onClose={() => setEditItem(null)}
                    onSave={saved => {
                        setEditItem(null);
                        setItems(prev => {
                            const idx = prev.findIndex(i => i.id === saved.id);
                            if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next; }
                            return [saved, ...prev];
                        });
                    }}
                />
            )}
            {txItem && (
                <TransactionDialog
                    item={txItem}
                    onClose={() => setTxItem(null)}
                    onDone={newStock => {
                        setTxItem(null);
                        setItems(prev => prev.map(i => i.id === txItem.id
                            ? { ...i, current_stock: newStock, is_low_stock: newStock <= i.min_stock }
                            : i
                        ));
                    }}
                />
            )}
            {historyItem && (
                <TransactionHistory item={historyItem} onClose={() => setHistoryItem(null)} />
            )}
        </div>
    );
}
