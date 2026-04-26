"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Pencil, Trash2, X, Loader2, Clock, IndianRupee, AlertCircle, RefreshCw, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { sessionTypesApi, SessionType, formsApi, Form } from "@/lib/api";

const PRESET_COLORS = ["#7C3AED", "#10B981", "#F59E0B", "#3B82F6", "#EC4899", "#06B6D4", "#F97316", "#6366F1", "#EF4444", "#14B8A6"];

// ── Session Type Modal ──────────────────────────────────────────────────────
function SessionTypeModal({ open, initial, onClose, onSaved }: {
    open: boolean; initial?: SessionType | null; onClose: () => void; onSaved: () => void;
}) {
    const [form, setForm] = useState({ name: "", description: "", default_duration_minutes: "60", fee: "0", form_id: "", color: "" });
    const [forms, setForms] = useState<Form[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load published forms for the dropdown
    useEffect(() => {
        formsApi.list().then(all => setForms(all.filter(f => f.is_published))).catch(() => setForms([]));
    }, []);

    useEffect(() => {
        if (initial) {
            setForm({
                name: initial.name,
                description: initial.description ?? "",
                default_duration_minutes: String(initial.default_duration_minutes),
                fee: String(initial.fee),
                form_id: initial.form_id ?? "",
                color: initial.color ?? "",
            });
        } else {
            setForm({ name: "", description: "", default_duration_minutes: "60", fee: "0", form_id: "", color: "" });
        }
        setError(null);
    }, [initial, open]);

    const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setForm(prev => ({ ...prev, [k]: e.target.value }));

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.name.trim()) { setError("Name is required."); return; }
        const dur = parseInt(form.default_duration_minutes);
        if (isNaN(dur) || dur < 5) { setError("Duration must be at least 5 minutes."); return; }
        setLoading(true); setError(null);
        try {
            const payload = {
                name: form.name.trim(),
                description: form.description.trim() || undefined,
                default_duration_minutes: dur,
                fee: parseFloat(form.fee) || 0,
                ...(form.form_id ? { form_id: form.form_id } : { form_id: null }),
                color: form.color.trim() || null,
            };
            if (initial) await sessionTypesApi.update(initial.id, payload);
            else await sessionTypesApi.create(payload);
            onSaved(); onClose();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to save");
        } finally { setLoading(false); }
    }

    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-border/60">
                    <h2 className="font-bold text-base">{initial ? "Edit Session Type" : "New Session Type"}</h2>
                    <button onClick={onClose} className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <form onSubmit={submit} noValidate>
                    <div className="px-6 py-5 space-y-4">
                        {error && (
                            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-sm text-red-700">
                                <AlertCircle className="w-4 h-4 shrink-0" />{error}
                            </div>
                        )}
                        <Field label="Name" required>
                            <Input className="rounded-xl" placeholder="e.g. Initial Evaluation" value={form.name} onChange={set("name")} />
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Duration (min)" required>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                    <Input type="number" min={5} className="pl-9 rounded-xl" value={form.default_duration_minutes} onChange={set("default_duration_minutes")} />
                                </div>
                            </Field>
                            <Field label="Fee (₹)">
                                <div className="relative">
                                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                    <Input type="number" min={0} className="pl-9 rounded-xl" value={form.fee} onChange={set("fee")} />
                                </div>
                            </Field>
                        </div>

                        {/* Linked Form picker */}
                        <Field label="Linked Form">
                            <div className="relative">
                                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                                <select value={form.form_id} onChange={set("form_id")}
                                    className="w-full h-10 pl-9 pr-3 rounded-xl border border-input bg-background text-sm focus:outline-none appearance-none">
                                    <option value="">No form (optional)</option>
                                    {forms.map(f => (
                                        <option key={f.id} value={f.id}>{f.title}</option>
                                    ))}
                                </select>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-1">
                                Patients will fill this form after each session of this type. Only published forms appear.
                            </p>
                        </Field>

                        <Field label="Color">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                    {PRESET_COLORS.map(c => (
                                        <button key={c} type="button" onClick={() => setForm(p => ({ ...p, color: c }))}
                                            className={cn("w-7 h-7 rounded-full transition-all ring-offset-1 shrink-0",
                                                form.color === c ? "ring-2 ring-foreground" : "hover:ring-2 hover:ring-border")}
                                            style={{ backgroundColor: c }} />
                                    ))}
                                    <button type="button" onClick={() => setForm(p => ({ ...p, color: "" }))}
                                        className={cn("w-7 h-7 rounded-full border-2 border-dashed border-muted-foreground/30 transition-all flex items-center justify-center text-muted-foreground text-xs",
                                            !form.color ? "ring-2 ring-foreground ring-offset-1" : "hover:ring-2 hover:ring-border hover:ring-offset-1")}>
                                        ✕
                                    </button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input type="color" value={form.color || "#7C3AED"}
                                        onChange={e => setForm(p => ({ ...p, color: e.target.value }))}
                                        className="w-8 h-8 rounded-lg border border-input cursor-pointer bg-transparent p-0.5 shrink-0" />
                                    <Input placeholder="#7C3AED (or leave blank for default)" className="rounded-xl font-mono text-xs h-8 flex-1"
                                        value={form.color} onChange={set("color")} maxLength={7} />
                                </div>
                            </div>
                        </Field>

                        <Field label="Description">
                            <textarea value={form.description} onChange={set("description")} rows={2}
                                className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                                placeholder="Brief description of what this session involves…" />
                        </Field>
                    </div>
                    <div className="px-6 py-4 border-t border-border/60 flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">Cancel</Button>
                        <Button type="submit" disabled={loading} className="rounded-xl gap-2 min-w-[100px]">
                            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : initial ? "Save Changes" : "Create"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
            {children}
        </div>
    );
}

function Skeleton({ className }: { className?: string }) {
    return <div className={cn("animate-pulse bg-muted rounded-xl", className)} />;
}

function DeleteConfirm({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
    const [loading, setLoading] = useState(false);
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                        <p className="font-bold text-base">Delete Session Type?</p>
                        <p className="text-xs text-muted-foreground mt-0.5">"{name}" will be permanently removed.</p>
                    </div>
                </div>
                <div className="flex justify-end gap-3">
                    <Button variant="outline" className="rounded-xl" onClick={onCancel}>Cancel</Button>
                    <Button className="rounded-xl bg-red-600 hover:bg-red-700 gap-2" onClick={async () => { setLoading(true); await onConfirm(); setLoading(false); }}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Delete
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default function SessionTypesPage() {
    const [types, setTypes] = useState<SessionType[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<SessionType | null>(null);
    const [deleting, setDeleting] = useState<SessionType | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try { setTypes(await sessionTypesApi.list()); }
        catch { setTypes([]); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const filtered = types.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));

    async function handleDelete() {
        if (!deleting) return;
        await sessionTypesApi.delete(deleting.id);
        setDeleting(null); load();
    }

    return (
        <div className="flex flex-col gap-4 p-4 md:p-5">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight">Session Types</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">{types.length} types configured</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={load} className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
                        <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                    </button>
                    <Button size="sm" className="gap-1.5 rounded-xl shrink-0" onClick={() => { setEditing(null); setModalOpen(true); }}>
                        <Plus className="w-4 h-4" /><span className="hidden sm:inline">New Type</span>
                    </Button>
                </div>
            </div>

            <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder="Search session types..." className="pl-9 rounded-xl bg-white" value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {loading ? (
                    Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-52" />)
                ) : filtered.length === 0 ? (
                    <div className="col-span-full bg-white rounded-2xl p-12 text-center text-muted-foreground text-sm">
                        {search ? "No session types match your search" : "No session types yet. Create your first one!"}
                    </div>
                ) : filtered.map((t, i) => {
                    const accentColor = t.color || ["#7C3AED","#10B981","#F59E0B","#3B82F6","#EC4899","#06B6D4","#F97316","#6366F1"][i % 8];
                    const bgTint = accentColor + "18";
                    return (
                    <div key={t.id} className="group bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-200 flex flex-col">
                        <div className="p-5 flex flex-col gap-4 flex-1">
                            {/* Icon + actions row */}
                            <div className="flex items-start justify-between gap-2">
                                <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center font-bold text-sm"
                                    style={{ backgroundColor: bgTint, color: accentColor }}>
                                    {t.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                    <button onClick={() => { setEditing(t); setModalOpen(true); }}
                                        className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted">
                                        <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => setDeleting(t)}
                                        className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors rounded-lg hover:bg-red-50">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>

                            {/* Title + badge */}
                            <div className="space-y-1.5">
                                <h3 className="font-bold text-base leading-snug">{t.name}</h3>
                                <Badge variant="outline" className={cn("text-[10px] rounded-full px-2 py-0 font-medium",
                                    t.is_active ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-muted-foreground/20 text-muted-foreground")}>
                                    {t.is_active ? "Active" : "Inactive"}
                                </Badge>
                            </div>

                            {/* Description */}
                            <p className={cn("text-sm leading-relaxed line-clamp-2",
                                t.description ? "text-muted-foreground" : "text-muted-foreground/40 italic")}>
                                {t.description || "No description"}
                            </p>

                            {/* Stats row */}
                            <div className="grid grid-cols-2 gap-2 mt-auto">
                                <div className="rounded-xl px-3 py-2.5 flex flex-col gap-0.5" style={{ backgroundColor: bgTint }}>
                                    <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                                        <Clock className="w-3 h-3" />Duration
                                    </span>
                                    <span className="text-base font-bold leading-tight" style={{ color: accentColor }}>
                                        {t.default_duration_minutes}
                                        <span className="text-xs font-semibold ml-0.5 text-muted-foreground">min</span>
                                    </span>
                                </div>
                                <div className="rounded-xl px-3 py-2.5 flex flex-col gap-0.5" style={{ backgroundColor: bgTint }}>
                                    <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                                        <IndianRupee className="w-3 h-3" />Fee
                                    </span>
                                    <span className="text-base font-bold leading-tight" style={{ color: accentColor }}>
                                        {t.fee === 0 ? (
                                            <span className="text-sm text-muted-foreground font-semibold">Free</span>
                                        ) : (
                                            <>₹{t.fee.toLocaleString("en-IN")}</>
                                        )}
                                    </span>
                                </div>
                            </div>

                            {/* Footer: form info + CTA */}
                            <div className="flex items-center justify-between pt-3 border-t border-border/50 gap-2">
                                {t.form_id ? (
                                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-blue-700 min-w-0">
                                        <FileText className="w-3 h-3 shrink-0" />
                                        <span className="truncate">{t.form_title ?? "Form linked"}</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50">
                                        <FileText className="w-3 h-3 shrink-0" />
                                        No intake form
                                    </div>
                                )}
                                <button
                                    onClick={() => { setEditing(t); setModalOpen(true); }}
                                    className="shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-white transition-all duration-150"
                                    onMouseEnter={e => { const el = e.currentTarget; el.style.backgroundColor = accentColor; el.style.borderColor = accentColor; }}
                                    onMouseLeave={e => { const el = e.currentTarget; el.style.backgroundColor = ""; el.style.borderColor = ""; }}>
                                    Edit type
                                </button>
                            </div>
                        </div>
                    </div>
                    );
                })}
            </div>

            <SessionTypeModal open={modalOpen} initial={editing} onClose={() => setModalOpen(false)} onSaved={load} />
            {deleting && <DeleteConfirm name={deleting.name} onConfirm={handleDelete} onCancel={() => setDeleting(null)} />}
        </div>
    );
}
