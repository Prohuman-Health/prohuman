"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Dumbbell, Tag, Link, AlertCircle, CheckCircle2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { exercisesApi } from "@/lib/api";
import type { Exercise } from "@/lib/api";
import { useExercises } from "@/lib/contexts/catalog-context";

interface Props { open: boolean; onClose: () => void; exercise: Exercise; }

const CATEGORY_OPTIONS = [
    "Lower Limb", "Upper Limb", "Spine", "Core",
    "Balance and Proprioception", "Neurological", "Cardio", "Other",
];

function Field({ label, required, error, children }: {
    label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
    return (
        <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">
                {label}{required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            {children}
            {error && <p className="text-[11px] text-red-500 font-medium">{error}</p>}
        </div>
    );
}

export function EditExerciseModal({ open, onClose, exercise }: Props) {
    const { refresh } = useExercises();

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [tagInput, setTagInput] = useState("");

    const [form, setForm] = useState({
        name: exercise.name,
        category: exercise.category ?? "",
        description: exercise.description ?? "",
        instructions: exercise.instructions ?? "",
        video_url: exercise.video_url ?? "",
        image_url: exercise.image_url ?? "",
        tags: exercise.tags ?? [] as string[],
        is_active: exercise.is_active,
    });

    // Sync form if exercise prop changes
    useEffect(() => {
        setForm({
            name: exercise.name,
            category: exercise.category ?? "",
            description: exercise.description ?? "",
            instructions: exercise.instructions ?? "",
            video_url: exercise.video_url ?? "",
            image_url: exercise.image_url ?? "",
            tags: exercise.tags ?? [],
            is_active: exercise.is_active,
        });
        setErrors({}); setApiError(null); setSuccess(false); setTagInput("");
    }, [exercise]);

    const set = (k: keyof typeof form) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
            setForm(prev => ({ ...prev, [k]: e.target.value }));
            setErrors(prev => { const n = { ...prev }; delete n[k]; return n; });
        };

    function addTag() {
        const tag = tagInput.trim().toLowerCase();
        if (!tag || form.tags.includes(tag)) { setTagInput(""); return; }
        setForm(prev => ({ ...prev, tags: [...prev.tags, tag] }));
        setTagInput("");
    }
    function removeTag(t: string) {
        setForm(prev => ({ ...prev, tags: prev.tags.filter(x => x !== t) }));
    }

    function validate(): boolean {
        const errs: Record<string, string> = {};
        if (!form.name.trim()) errs.name = "Exercise name is required";
        if (form.video_url.trim() && !/^https?:\/\/.+/.test(form.video_url.trim()))
            errs.video_url = "Must be a valid URL";
        if (form.image_url.trim() && !/^https?:\/\/.+/.test(form.image_url.trim()))
            errs.image_url = "Must be a valid URL";
        setErrors(errs);
        return Object.keys(errs).length === 0;
    }

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!validate()) return;
        setLoading(true); setApiError(null);
        try {
            await exercisesApi.update(exercise.id, {
                name: form.name.trim(),
                category: form.category || undefined,
                description: form.description.trim() || undefined,
                instructions: form.instructions.trim() || undefined,
                video_url: form.video_url.trim() || undefined,
                image_url: form.image_url.trim() || undefined,
                tags: form.tags.length > 0 ? form.tags : undefined,
                is_active: form.is_active,
            });
            await refresh();
            setSuccess(true);
            setTimeout(() => { setSuccess(false); onClose(); }, 1200);
        } catch (err: unknown) {
            setApiError(err instanceof Error ? err.message : "Failed to update exercise");
        } finally { setLoading(false); }
    }

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-border/60">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
                            <Dumbbell className="w-4 h-4 text-violet-600" />
                        </div>
                        <div>
                            <h2 className="font-bold text-base">Edit Exercise</h2>
                            <p className="text-xs text-muted-foreground truncate max-w-[260px]">{exercise.name}</p>
                        </div>
                    </div>
                    <button onClick={onClose}
                        className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={submit} noValidate>
                    <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
                        {apiError && (
                            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-sm text-red-700">
                                <AlertCircle className="w-4 h-4 shrink-0" /> {apiError}
                            </div>
                        )}
                        {success && (
                            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5 text-sm text-emerald-700">
                                <CheckCircle2 className="w-4 h-4 shrink-0" /> Exercise updated successfully!
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Exercise Name" required error={errors.name}>
                                <Input className={cn("rounded-xl", errors.name && "border-red-400")}
                                    value={form.name} onChange={set("name")} />
                            </Field>
                            <Field label="Category">
                                <Select value={form.category} onValueChange={v => setForm(prev => ({...prev, category: v}))}>
                                    <SelectTrigger className="w-full h-10 rounded-xl text-sm">
                                        <SelectValue placeholder="— Select —" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        {CATEGORY_OPTIONS.map(c => <SelectItem key={c} value={c} className="rounded-lg">{c}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </Field>
                        </div>

                        <Field label="Description">
                            <textarea value={form.description} onChange={set("description")} rows={2}
                                className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground" />
                        </Field>

                        <Field label="Instructions">
                            <textarea value={form.instructions} onChange={set("instructions")} rows={3}
                                className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground" />
                        </Field>

                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Video URL" error={errors.video_url}>
                                <div className="relative">
                                    <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                    <Input className={cn("pl-9 rounded-xl", errors.video_url && "border-red-400")}
                                        placeholder="https://..." value={form.video_url} onChange={set("video_url")} />
                                </div>
                            </Field>
                            <Field label="Image URL" error={errors.image_url}>
                                <div className="relative">
                                    <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                    <Input className={cn("pl-9 rounded-xl", errors.image_url && "border-red-400")}
                                        placeholder="https://..." value={form.image_url} onChange={set("image_url")} />
                                </div>
                            </Field>
                        </div>

                        <Field label="Tags">
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                    <Input className="pl-9 rounded-xl" placeholder="Add tag, press Enter"
                                        value={tagInput} onChange={e => setTagInput(e.target.value)}
                                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} />
                                </div>
                                <button type="button" onClick={addTag}
                                    className="w-10 h-10 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0">
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                            {form.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {form.tags.map(t => (
                                        <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-100 text-violet-700 text-[11px] font-medium">
                                            {t}
                                            <button type="button" onClick={() => removeTag(t)}
                                                className="hover:text-red-500 transition-colors ml-0.5">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </Field>

                        <Field label="Status">
                            <div className="flex items-center gap-3">
                                <button type="button"
                                    onClick={() => setForm(prev => ({ ...prev, is_active: true }))}
                                    className={cn("flex-1 py-2 rounded-xl text-xs font-medium border transition-all",
                                        form.is_active ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "border-border text-muted-foreground hover:text-foreground")}>
                                    Active
                                </button>
                                <button type="button"
                                    onClick={() => setForm(prev => ({ ...prev, is_active: false }))}
                                    className={cn("flex-1 py-2 rounded-xl text-xs font-medium border transition-all",
                                        !form.is_active ? "bg-red-50 border-red-300 text-red-700" : "border-border text-muted-foreground hover:text-foreground")}>
                                    Inactive
                                </button>
                            </div>
                        </Field>
                    </div>

                    <div className="px-6 py-4 border-t border-border/60 flex items-center justify-end gap-3">
                        <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">Cancel</Button>
                        <Button type="submit" disabled={loading || success} className="rounded-xl gap-2 min-w-[140px]">
                            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> :
                                success ? <><CheckCircle2 className="w-4 h-4" />Saved!</> :
                                    "Save Changes"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
