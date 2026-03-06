"use client";

import { useState, useEffect } from "react";
import { X, Loader2, BookOpen, AlertCircle, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { algorithmsApi } from "@/lib/api";
import type { Algorithm } from "@/lib/api";
import { useAlgorithms } from "@/lib/contexts/catalog-context";

interface Props { open: boolean; onClose: () => void; }

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

function StepListEditor({ label, steps, onChange }: {
    label: string; steps: string[]; onChange: (s: string[]) => void;
}) {
    const [input, setInput] = useState("");
    function add() {
        const v = input.trim(); if (!v) return;
        onChange([...steps, v]); setInput("");
    }
    return (
        <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">{label}</p>
            {steps.map((s, i) => (
                <div key={i} className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-foreground text-white text-[10px] flex items-center justify-center shrink-0 mt-2">{i + 1}</span>
                    <Input value={s} onChange={e => {
                        const n = [...steps]; n[i] = e.target.value; onChange(n);
                    }} className="rounded-xl flex-1 h-9 text-sm" />
                    <button type="button" onClick={() => onChange(steps.filter((_, j) => j !== i))}
                        className="mt-2 text-muted-foreground hover:text-red-500 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ))}
            <div className="flex gap-2">
                <Input value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
                    placeholder="Type step and press Enter…" className="rounded-xl text-sm" />
                <button type="button" onClick={add}
                    className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0">
                    <Plus className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

const EMPTY_FORM = {
    name: "", diagnosis: "", description: "",
    outcome_measures: "", estimated_sessions: "",
    evaluation_steps: [] as string[],
    treatment_steps: [] as string[],
    red_flags: [] as string[],
};

export function NewAlgorithmModal({ open, onClose }: Props) {
    const { refresh } = useAlgorithms();

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [form, setForm] = useState(EMPTY_FORM);

    const set = (k: keyof typeof form) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            setForm(prev => ({ ...prev, [k]: e.target.value }));
            setErrors(prev => { const n = { ...prev }; delete n[k]; return n; });
        };

    function validate(): boolean {
        const errs: Record<string, string> = {};
        if (!form.name.trim()) errs.name = "Algorithm name is required";
        if (form.estimated_sessions && isNaN(Number(form.estimated_sessions)))
            errs.estimated_sessions = "Must be a number";
        setErrors(errs);
        return Object.keys(errs).length === 0;
    }

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!validate()) return;
        setLoading(true); setApiError(null);
        try {
            await algorithmsApi.create({
                name: form.name.trim(),
                diagnosis: form.diagnosis.trim() || undefined,
                description: form.description.trim() || undefined,
                outcome_measures: form.outcome_measures.trim() || undefined,
                estimated_sessions: form.estimated_sessions ? Number(form.estimated_sessions) : undefined,
                evaluation_steps: form.evaluation_steps as unknown,
                treatment_steps: form.treatment_steps as unknown,
                red_flags: form.red_flags as unknown,
            } as Partial<Algorithm>);
            await refresh();
            setSuccess(true);
            setTimeout(() => { reset(); }, 1200);
        } catch (err: unknown) {
            setApiError(err instanceof Error ? err.message : "Failed to create algorithm");
        } finally { setLoading(false); }
    }

    function reset() {
        setForm(EMPTY_FORM); setErrors({}); setApiError(null); setSuccess(false);
        onClose();
    }

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={reset} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-border/60">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
                            <BookOpen className="w-4 h-4 text-violet-600" />
                        </div>
                        <div>
                            <h2 className="font-bold text-base">New Algorithm</h2>
                            <p className="text-xs text-muted-foreground">Create a clinical treatment protocol</p>
                        </div>
                    </div>
                    <button onClick={reset}
                        className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={submit} noValidate>
                    <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
                        {apiError && (
                            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-sm text-red-700">
                                <AlertCircle className="w-4 h-4 shrink-0" /> {apiError}
                            </div>
                        )}
                        {success && (
                            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5 text-sm text-emerald-700">
                                <CheckCircle2 className="w-4 h-4 shrink-0" /> Algorithm created successfully!
                            </div>
                        )}

                        {/* Basic info */}
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Algorithm Name" required error={errors.name}>
                                <Input className={cn("rounded-xl", errors.name && "border-red-400")}
                                    placeholder="e.g. Post-TKR Phase 1" value={form.name} onChange={set("name")} />
                            </Field>
                            <Field label="Est. Sessions" error={errors.estimated_sessions}>
                                <Input type="number" min={1} className={cn("rounded-xl", errors.estimated_sessions && "border-red-400")}
                                    placeholder="e.g. 12" value={form.estimated_sessions} onChange={set("estimated_sessions")} />
                            </Field>
                        </div>

                        <Field label="Diagnosis / Condition">
                            <Input className="rounded-xl" placeholder="e.g. Total Knee Replacement"
                                value={form.diagnosis} onChange={set("diagnosis")} />
                        </Field>

                        <Field label="Description">
                            <textarea value={form.description} onChange={set("description")} rows={2}
                                placeholder="Overview of this clinical protocol…"
                                className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground" />
                        </Field>

                        <Field label="Outcome Measures">
                            <Input className="rounded-xl" placeholder="e.g. KOOS score, VAS pain, ROM…"
                                value={form.outcome_measures} onChange={set("outcome_measures")} />
                        </Field>

                        {/* Step editors */}
                        <div className="border border-border/60 rounded-2xl p-4 space-y-5 bg-muted/20">
                            <StepListEditor label="Evaluation Steps" steps={form.evaluation_steps}
                                onChange={v => setForm(p => ({ ...p, evaluation_steps: v }))} />
                            <div className="border-t border-border/40" />
                            <StepListEditor label="Treatment Steps" steps={form.treatment_steps}
                                onChange={v => setForm(p => ({ ...p, treatment_steps: v }))} />
                            <div className="border-t border-border/40" />
                            <StepListEditor label="Red Flags" steps={form.red_flags}
                                onChange={v => setForm(p => ({ ...p, red_flags: v }))} />
                        </div>
                    </div>

                    <div className="px-6 py-4 border-t border-border/60 flex items-center justify-end gap-3">
                        <Button type="button" variant="outline" onClick={reset} className="rounded-xl">Cancel</Button>
                        <Button type="submit" disabled={loading || success} className="rounded-xl gap-2 min-w-[160px]">
                            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Creating…</> :
                                success ? <><CheckCircle2 className="w-4 h-4" />Created!</> :
                                    <><BookOpen className="w-4 h-4" />Create Algorithm</>}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Edit Algorithm Modal
───────────────────────────────────────────────────────────────────────────── */

function safeArr(v: unknown): string[] {
    if (Array.isArray(v)) return v as string[];
    if (typeof v === "string") { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; } }
    return [];
}

interface EditProps { open: boolean; onClose: () => void; algorithm: Algorithm; }

export function EditAlgorithmModal({ open, onClose, algorithm }: EditProps) {
    const { refresh } = useAlgorithms();

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [form, setForm] = useState({
        name: algorithm.name,
        diagnosis: algorithm.diagnosis ?? "",
        description: algorithm.description ?? "",
        outcome_measures: (algorithm as Algorithm & { outcome_measures?: string }).outcome_measures ?? "",
        estimated_sessions: algorithm.estimated_sessions ? String(algorithm.estimated_sessions) : "",
        evaluation_steps: safeArr(algorithm.evaluation_steps),
        treatment_steps: safeArr(algorithm.treatment_steps),
        red_flags: safeArr(algorithm.red_flags),
        is_active: algorithm.is_active,
    });

    useEffect(() => {
        setForm({
            name: algorithm.name,
            diagnosis: algorithm.diagnosis ?? "",
            description: algorithm.description ?? "",
            outcome_measures: (algorithm as Algorithm & { outcome_measures?: string }).outcome_measures ?? "",
            estimated_sessions: algorithm.estimated_sessions ? String(algorithm.estimated_sessions) : "",
            evaluation_steps: safeArr(algorithm.evaluation_steps),
            treatment_steps: safeArr(algorithm.treatment_steps),
            red_flags: safeArr(algorithm.red_flags),
            is_active: algorithm.is_active,
        });
        setErrors({}); setApiError(null); setSuccess(false);
    }, [algorithm]);

    const set = (k: keyof typeof form) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            setForm(prev => ({ ...prev, [k]: e.target.value }));
            setErrors(prev => { const n = { ...prev }; delete n[k]; return n; });
        };

    function validate(): boolean {
        const errs: Record<string, string> = {};
        if (!form.name.trim()) errs.name = "Name is required";
        if (form.estimated_sessions && isNaN(Number(form.estimated_sessions)))
            errs.estimated_sessions = "Must be a number";
        setErrors(errs);
        return Object.keys(errs).length === 0;
    }

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!validate()) return;
        setLoading(true); setApiError(null);
        try {
            await algorithmsApi.update(algorithm.id, {
                name: form.name.trim(),
                diagnosis: form.diagnosis.trim() || undefined,
                description: form.description.trim() || undefined,
                outcome_measures: form.outcome_measures.trim() || undefined,
                estimated_sessions: form.estimated_sessions ? Number(form.estimated_sessions) : undefined,
                evaluation_steps: form.evaluation_steps as unknown,
                treatment_steps: form.treatment_steps as unknown,
                red_flags: form.red_flags as unknown,
                is_active: form.is_active,
            } as Partial<Algorithm>);
            await refresh();
            setSuccess(true);
            setTimeout(() => { setSuccess(false); onClose(); }, 1200);
        } catch (err: unknown) {
            setApiError(err instanceof Error ? err.message : "Failed to update algorithm");
        } finally { setLoading(false); }
    }

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-border/60">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
                            <BookOpen className="w-4 h-4 text-violet-600" />
                        </div>
                        <div>
                            <h2 className="font-bold text-base">Edit Algorithm</h2>
                            <p className="text-xs text-muted-foreground truncate max-w-[300px]">{algorithm.name}</p>
                        </div>
                    </div>
                    <button onClick={onClose}
                        className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={submit} noValidate>
                    <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
                        {apiError && (
                            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-sm text-red-700">
                                <AlertCircle className="w-4 h-4 shrink-0" /> {apiError}
                            </div>
                        )}
                        {success && (
                            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5 text-sm text-emerald-700">
                                <CheckCircle2 className="w-4 h-4 shrink-0" /> Algorithm updated!
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Algorithm Name" required error={errors.name}>
                                <Input className={cn("rounded-xl", errors.name && "border-red-400")}
                                    value={form.name} onChange={set("name")} />
                            </Field>
                            <Field label="Est. Sessions" error={errors.estimated_sessions}>
                                <Input type="number" min={1} className={cn("rounded-xl", errors.estimated_sessions && "border-red-400")}
                                    value={form.estimated_sessions} onChange={set("estimated_sessions")} />
                            </Field>
                        </div>

                        <Field label="Diagnosis / Condition">
                            <Input className="rounded-xl" value={form.diagnosis} onChange={set("diagnosis")} />
                        </Field>
                        <Field label="Description">
                            <textarea value={form.description} onChange={set("description")} rows={2}
                                className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
                        </Field>
                        <Field label="Outcome Measures">
                            <Input className="rounded-xl" value={form.outcome_measures} onChange={set("outcome_measures")} />
                        </Field>

                        <div className="border border-border/60 rounded-2xl p-4 space-y-5 bg-muted/20">
                            <StepListEditor label="Evaluation Steps" steps={form.evaluation_steps}
                                onChange={v => setForm(p => ({ ...p, evaluation_steps: v }))} />
                            <div className="border-t border-border/40" />
                            <StepListEditor label="Treatment Steps" steps={form.treatment_steps}
                                onChange={v => setForm(p => ({ ...p, treatment_steps: v }))} />
                            <div className="border-t border-border/40" />
                            <StepListEditor label="Red Flags" steps={form.red_flags}
                                onChange={v => setForm(p => ({ ...p, red_flags: v }))} />
                        </div>

                        <Field label="Status">
                            <div className="flex items-center gap-3">
                                <button type="button" onClick={() => setForm(p => ({ ...p, is_active: true }))}
                                    className={cn("flex-1 py-2 rounded-xl text-xs font-medium border transition-all",
                                        form.is_active ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "border-border text-muted-foreground hover:text-foreground")}>
                                    Active
                                </button>
                                <button type="button" onClick={() => setForm(p => ({ ...p, is_active: false }))}
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
                                success ? <><CheckCircle2 className="w-4 h-4" />Saved!</> : "Save Changes"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Delete Confirm Modal (shared for exercises & algorithms)
───────────────────────────────────────────────────────────────────────────── */

interface DeleteProps {
    open: boolean; onClose: () => void;
    title: string; description: string;
    onConfirm: () => Promise<void>;
}

export function DeleteConfirmModal({ open, onClose, title, description, onConfirm }: DeleteProps) {
    const [loading, setLoading] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    async function handleConfirm() {
        setLoading(true); setApiError(null);
        try { await onConfirm(); onClose(); }
        catch (err: unknown) { setApiError(err instanceof Error ? err.message : "Failed to delete"); }
        finally { setLoading(false); }
    }

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                <div className="px-6 py-6 flex flex-col items-center text-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center">
                        <Trash2 className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                        <h2 className="font-bold text-base">{title}</h2>
                        <p className="text-sm text-muted-foreground mt-1">{description}</p>
                    </div>
                    {apiError && (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-700 w-full">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {apiError}
                        </div>
                    )}
                </div>
                <div className="px-6 pb-5 flex gap-3">
                    <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl" disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleConfirm} disabled={loading}
                        className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white gap-2">
                        {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Deleting…</> : "Yes, Deactivate"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
