"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Search, Pencil, MessageCircle, Clock, Zap, Copy, CheckCircle2,
    RefreshCw, ToggleLeft, ToggleRight, X, Loader2, AlertCircle, Save,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { whatsappApi, WhatsAppTemplate } from "@/lib/api";

// ── Trigger meta ───────────────────────────────────────────────────────────────
const TRIGGER_COLOR: Record<string, string> = {
    registration: "bg-violet-100 text-violet-700",
    appointment: "bg-blue-100 text-blue-700",
    post_session: "bg-emerald-100 text-emerald-700",
    follow_up: "bg-amber-100 text-amber-700",
    payment: "bg-pink-100 text-pink-700",
    emergency: "bg-red-100 text-red-600",
};

function triggerLabel(t: string) {
    return t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function Skeleton({ className }: { className?: string }) {
    return <div className={cn("animate-pulse bg-muted rounded-xl", className)} />;
}

// ── Edit Modal ─────────────────────────────────────────────────────────────────
function EditModal({ template, onClose, onSaved }: {
    template: WhatsAppTemplate; onClose: () => void; onSaved: (t: WhatsAppTemplate) => void;
}) {
    const [name, setName] = useState(template.name);
    const [body, setBody] = useState(template.body);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function save() {
        if (!name.trim()) { setError("Name is required"); return; }
        if (!body.trim()) { setError("Message body is required"); return; }
        setSaving(true); setError(null);
        try {
            const updated = await whatsappApi.update(template.id, { name: name.trim(), body: body.trim() });
            onSaved(updated);
            onClose();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Save failed");
        } finally { setSaving(false); }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
                    <div>
                        <h2 className="font-bold text-base">Edit Template</h2>
                        <p className="text-xs text-muted-foreground capitalize">{triggerLabel(template.trigger)}</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="px-6 py-5 space-y-4">
                    {error && (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-sm text-red-700">
                            <AlertCircle className="w-4 h-4 shrink-0" />{error}
                        </div>
                    )}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold">Template Name <span className="text-red-500">*</span></label>
                        <Input className={cn("rounded-xl", !name.trim() && error && "border-red-400")}
                            value={name} onChange={e => setName(e.target.value)} placeholder="Template name" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold">Message Body <span className="text-red-500">*</span></label>
                        <textarea value={body} onChange={e => setBody(e.target.value)} rows={8}
                            className={cn("w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring font-mono leading-relaxed",
                                !body.trim() && error && "border-red-400")}
                            placeholder="Use {{variable_name}} for dynamic fields" />
                        <p className="text-[11px] text-muted-foreground">Use {"{{variable}}"} syntax for dynamic fields, e.g. {"{{patient_name}}"}</p>
                    </div>
                </div>
                <div className="px-6 py-4 border-t border-border/60 flex justify-end gap-3">
                    <Button variant="outline" className="rounded-xl" onClick={onClose} disabled={saving}>Cancel</Button>
                    <Button className="rounded-xl gap-2" onClick={save} disabled={saving}>
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Save
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function WhatsAppPage() {
    const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [triggerFilter, setTriggerFilter] = useState("All");
    const [expanded, setExpanded] = useState<string | null>(null);
    const [editing, setEditing] = useState<WhatsAppTemplate | null>(null);
    const [copied, setCopied] = useState<string | null>(null);
    const [toggling, setToggling] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try { setTemplates(await whatsappApi.list()); }
        catch { setTemplates([]); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    // Distinct triggers for tabs
    const allTriggers = ["All", ...Array.from(new Set(templates.map(t => t.trigger)))];

    const filtered = templates.filter(t => {
        const matchesTrigger = triggerFilter === "All" || t.trigger === triggerFilter;
        const matchesSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.body.toLowerCase().includes(search.toLowerCase());
        return matchesTrigger && matchesSearch;
    });

    async function toggleActive(t: WhatsAppTemplate) {
        setToggling(t.id);
        try {
            const updated = await whatsappApi.update(t.id, { is_active: !t.is_active });
            setTemplates(prev => prev.map(x => x.id === t.id ? updated : x));
        } catch { } finally { setToggling(null); }
    }

    function copyBody(body: string, id: string) {
        navigator.clipboard.writeText(body).then(() => {
            setCopied(id);
            setTimeout(() => setCopied(null), 2000);
        });
    }

    const activeCount = templates.filter(t => t.is_active).length;

    return (
        <div className="flex flex-col gap-4 p-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">WhatsApp Messages</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {templates.length} templates · {activeCount} active
                    </p>
                </div>
                <button onClick={load} className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
                    <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: "Total Templates", value: templates.length, color: "text-foreground" },
                    { label: "Active", value: activeCount, color: "text-emerald-600" },
                    { label: "Inactive", value: templates.length - activeCount, color: "text-muted-foreground" },
                    { label: "Trigger Types", value: allTriggers.length - 1, color: "text-blue-600" },
                ].map(({ label, value, color }) => (
                    <div key={label} className="bg-white rounded-2xl border border-border/50 p-4">
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className={cn("text-2xl font-bold mt-1", color)}>{value}</p>
                    </div>
                ))}
            </div>

            {/* Search + Filters */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input placeholder="Search templates…" className="pl-9 rounded-xl bg-white" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div className="flex items-center gap-1 bg-white rounded-xl p-1 flex-wrap">
                    {allTriggers.map(t => (
                        <button key={t} onClick={() => setTriggerFilter(t)}
                            className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize",
                                triggerFilter === t ? "bg-foreground text-white" : "text-muted-foreground hover:text-foreground")}>
                            {t === "All" ? "All" : triggerLabel(t)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Templates list */}
            <div className="space-y-2">
                {loading ? (
                    Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)
                ) : filtered.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-border/50 p-12 text-center text-sm text-muted-foreground">
                        {search || triggerFilter !== "All" ? "No templates match your filters." : "No WhatsApp templates found."}
                    </div>
                ) : filtered.map(t => (
                    <div key={t.id} className={cn("bg-white rounded-2xl border transition-all overflow-hidden",
                        t.is_active ? "border-border/50" : "border-border/30 opacity-60")}>
                        <div className="flex items-center gap-4 px-5 py-4">
                            {/* Icon */}
                            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                                t.is_active ? "bg-[#25D366]/10" : "bg-muted")}>
                                <MessageCircle className={cn("w-4 h-4", t.is_active ? "text-[#25D366]" : "text-muted-foreground")} />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-sm">{t.name}</span>
                                    <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full capitalize",
                                        TRIGGER_COLOR[t.trigger] ?? "bg-muted text-muted-foreground")}>
                                        {triggerLabel(t.trigger)}
                                    </span>
                                    {!t.is_active && (
                                        <Badge variant="outline" className="text-[10px] rounded-full text-muted-foreground border-muted-foreground/20">Inactive</Badge>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{t.body.slice(0, 100)}…</p>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1 shrink-0">
                                <button onClick={() => copyBody(t.body, t.id)}
                                    className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Copy body">
                                    {copied === t.id ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                </button>
                                <button onClick={() => setEditing(t)}
                                    className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Edit">
                                    <Pencil className="w-4 h-4" />
                                </button>
                                <button onClick={() => toggleActive(t)} disabled={toggling === t.id}
                                    className={cn("p-2 rounded-xl transition-colors", t.is_active
                                        ? "text-emerald-600 hover:bg-emerald-50"
                                        : "text-muted-foreground hover:bg-muted")}
                                    title={t.is_active ? "Deactivate" : "Activate"}>
                                    {toggling === t.id
                                        ? <Loader2 className="w-4 h-4 animate-spin" />
                                        : t.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                                </button>
                                <button onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                                    className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Preview">
                                    <Zap className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Expanded preview */}
                        {expanded === t.id && (
                            <div className="px-5 pb-5 pt-0 border-t border-border/40">
                                <div className="mt-3 bg-[#ECF0F1] rounded-2xl p-4 max-w-sm space-y-2">
                                    <div className="flex items-center gap-1.5 mb-2">
                                        <div className="w-2 h-2 rounded-full bg-[#25D366]" />
                                        <span className="text-[11px] font-semibold text-muted-foreground">Message Preview</span>
                                    </div>
                                    <div className="bg-white rounded-xl rounded-tl-none p-3 text-xs leading-relaxed text-foreground shadow-sm whitespace-pre-wrap font-sans">
                                        {t.body}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Clock className="w-3 h-3 text-muted-foreground" />
                                        <span className="text-[10px] text-muted-foreground">
                                            Updated {new Date(t.updated_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                            {t.updated_by_name ? ` by ${t.updated_by_name}` : ""}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {editing && (
                <EditModal
                    template={editing}
                    onClose={() => setEditing(null)}
                    onSaved={updated => setTemplates(prev => prev.map(t => t.id === updated.id ? updated : t))}
                />
            )}
        </div>
    );
}
