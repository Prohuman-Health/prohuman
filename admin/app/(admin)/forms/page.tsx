"use client";

import { useState, useEffect, useCallback, useRef, KeyboardEvent } from "react";
import {
    Plus, Search, Pencil, Eye, Copy, Trash2, GripVertical, X,
    FileText, Loader2, RefreshCw, AlertCircle, CheckCircle2,
    Type, ToggleLeft, List, Scale,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
    formsApi, questionsApi,
    Form, FormQuestion, QuestionAnswerType,
} from "@/lib/api";

// ── Maps answer_type → backend enum ────────────────────────────────────────────
// Backend enum: "free_text" | "yes_no" | "scale" | "multiple_choice"
const ANSWER_TYPE_META: Record<QuestionAnswerType, { icon: React.ElementType; label: string; hint?: string }> = {
    free_text: { icon: Type, label: "Free Text", hint: "Open-ended text answer" },
    yes_no: { icon: ToggleLeft, label: "Yes / No", hint: "Boolean yes or no" },
    scale: { icon: Scale, label: "Scale", hint: "Numeric rating (requires min/max)" },
    multiple_choice: { icon: List, label: "Multiple Choice", hint: "Select from options (min 2 options)" },
};

const ANSWER_TYPES = Object.keys(ANSWER_TYPE_META) as QuestionAnswerType[];

// ── Helpers ────────────────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
    return <div className={cn("animate-pulse bg-muted rounded-xl", className)} />;
}

// ── Option Chips Input ─────────────────────────────────────────────────────────
function OptionChipsInput({
    chips, onChange, hasError,
}: { chips: string[]; onChange: (v: string[]) => void; hasError?: boolean }) {
    const [draft, setDraft] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    function commit(raw: string) {
        const val = raw.trim();
        if (val && !chips.includes(val)) onChange([...chips, val]);
        setDraft("");
    }

    function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit(draft);
        } else if (e.key === "Backspace" && draft === "" && chips.length > 0) {
            onChange(chips.slice(0, -1));
        }
    }

    function remove(i: number) {
        onChange(chips.filter((_, idx) => idx !== i));
    }

    return (
        <div
            className={cn(
                "flex flex-wrap gap-1.5 border rounded-xl px-2.5 py-2 bg-white cursor-text min-h-[36px] transition-colors",
                hasError ? "border-red-400" : "border-border hover:border-foreground/40 focus-within:border-foreground",
            )}
            onClick={() => inputRef.current?.focus()}
        >
            {chips.map((c, i) => (
                <span key={i} className="flex items-center gap-1 bg-muted border border-border rounded-lg px-2 py-0.5 text-xs font-medium text-foreground">
                    {c}
                    <button type="button" onClick={() => remove(i)}
                        className="text-muted-foreground hover:text-red-500 transition-colors ml-0.5">
                        <X className="w-2.5 h-2.5" />
                    </button>
                </span>
            ))}
            <input
                ref={inputRef}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={onKeyDown}
                onBlur={() => commit(draft)}
                placeholder={chips.length === 0 ? "Type an option, press Enter or comma to add…" : "Add another…"}
                className="flex-1 min-w-[120px] outline-none bg-transparent text-xs text-foreground placeholder:text-muted-foreground"
            />
        </div>
    );
}

// ── Form Preview Modal ─────────────────────────────────────────────────────────
function PreviewModal({ formId, title, onClose }: { formId: string; title: string; onClose: () => void }) {
    const [form, setForm] = useState<Form | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        formsApi.get(formId).then(setForm).catch(() => setForm(null)).finally(() => setLoading(false));
    }, [formId]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
                    <div>
                        <h2 className="font-bold text-base">{title}</h2>
                        <p className="text-xs text-muted-foreground">Preview mode · Read only</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {loading ? (
                        Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)
                    ) : !form?.questions?.length ? (
                        <p className="text-center text-sm text-muted-foreground py-8">This form has no questions yet.</p>
                    ) : form.questions.map((q, i) => {
                        const meta = ANSWER_TYPE_META[q.answer_type];
                        const Icon = meta?.icon ?? Type;
                        return (
                            <div key={q.id} className="space-y-1.5">
                                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                                    {i + 1}. {q.text}{q.is_required && <span className="text-red-500">*</span>}
                                </label>
                                {(q.answer_type === "free_text") && (
                                    <div className="h-16 rounded-xl border border-input bg-muted/30 px-3 py-2 text-xs text-muted-foreground">Enter text…</div>
                                )}
                                {q.answer_type === "yes_no" && (
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-5 rounded-full bg-muted relative"><span className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow" /></div>
                                        <span className="text-xs text-muted-foreground">No</span>
                                    </div>
                                )}
                                {q.answer_type === "scale" && (
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        {Array.from({ length: (q.scale_max ?? 10) - (q.scale_min ?? 0) + 1 }).map((_, n) => (
                                            <button key={n} className="w-7 h-7 rounded-lg border border-input text-xs text-muted-foreground hover:bg-muted">
                                                {(q.scale_min ?? 0) + n}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {q.answer_type === "multiple_choice" && q.options && (
                                    <div className="space-y-1">
                                        {q.options.map(opt => (
                                            <div key={opt} className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <div className="w-3.5 h-3.5 rounded border border-input bg-muted/30 shrink-0" />
                                                {opt}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                <div className="px-6 py-4 border-t border-border/60 flex justify-end gap-3">
                    <Button variant="outline" className="rounded-xl" onClick={onClose}>Close</Button>
                </div>
            </div>
        </div>
    );
}

// ── Builder question state ─────────────────────────────────────────────────────
interface BuilderQ {
    _key: string;
    question_id: string;  // "" = new
    text: string;
    answer_type: QuestionAnswerType;
    options: string[];    // list of option chips
    scale_min: string;
    scale_max: string;
    is_required: boolean;
    errors: Record<string, string>;
}

function validateQ(q: BuilderQ): Record<string, string> {
    const e: Record<string, string> = {};
    if (!q.text.trim()) e.text = "Question text is required";
    if (q.answer_type === "multiple_choice") {
        if (q.options.length < 2) e.options = "At least 2 options required";
    }
    if (q.answer_type === "scale") {
        const min = parseInt(q.scale_min), max = parseInt(q.scale_max);
        if (isNaN(min)) e.scale_min = "Required";
        if (isNaN(max)) e.scale_max = "Required";
        if (!isNaN(min) && !isNaN(max) && min >= max) e.scale_max = "Max must be greater than min";
    }
    return e;
}

// ── Builder Modal ──────────────────────────────────────────────────────────────
function BuilderModal({ form, onClose, onSaved }: { form: Form | null; onClose: () => void; onSaved: () => void }) {
    const isNew = !form;
    const [title, setTitle] = useState(form?.title ?? "");
    const [desc, setDesc] = useState(form?.description ?? "");
    const [questions, setQuestions] = useState<BuilderQ[]>([]);
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [titleError, setTitleError] = useState("");
    const [apiError, setApiError] = useState<string | null>(null);

    useEffect(() => {
        if (!form) return;
        formsApi.get(form.id).then(f => {
            setQuestions((f.questions ?? []).map(q => ({
                _key: q.id, question_id: q.id, text: q.text,
                answer_type: q.answer_type,
                options: q.options ?? [],
                scale_min: String(q.scale_min ?? "0"),
                scale_max: String(q.scale_max ?? "10"),
                is_required: q.is_required,
                errors: {},
            })));
        }).catch(() => { }).finally(() => setLoading(false));
    }, [form]);

    function addQuestion(type: QuestionAnswerType) {
        setQuestions(prev => [...prev, {
            _key: `new-${Date.now()}`, question_id: "", text: "",
            answer_type: type, options: [], scale_min: "0", scale_max: "10",
            is_required: true, errors: {},
        }]);
    }

    function updateQ(key: string, patch: Partial<BuilderQ>) {
        setQuestions(prev => prev.map(q => q._key === key
            ? { ...q, ...patch, errors: validateQ({ ...q, ...patch }) }
            : q
        ));
    }

    function removeQ(key: string) {
        setQuestions(prev => prev.filter(q => q._key !== key));
    }

    async function save(publish = false) {
        // Validate title
        if (!title.trim()) { setTitleError("Form title is required"); return; }
        setTitleError("");

        // Validate all questions
        let hasQErrors = false;
        const validated = questions.map(q => {
            const errs = validateQ(q);
            if (Object.keys(errs).length > 0) hasQErrors = true;
            return { ...q, errors: errs };
        });
        setQuestions(validated);
        if (hasQErrors) { setApiError("Please fix the highlighted question errors before saving."); return; }

        setSaving(true); setApiError(null);
        try {
            // 1. Create / update form record
            let formId = form?.id;
            if (!formId) {
                const created = await formsApi.create({ title: title.trim(), description: desc.trim() || undefined });
                formId = created.id;
            } else {
                await formsApi.update(formId, { title: title.trim(), description: desc.trim() || undefined });
            }

            // 2. Upsert each question into the question bank
            const refs: { question_id: string; order_index: number; is_required: boolean }[] = [];
            for (let i = 0; i < questions.length; i++) {
                const q = questions[i];
                if (!q.text.trim()) continue;

                const opts = q.answer_type === "multiple_choice"
                    ? q.options.filter(Boolean)
                    : undefined;

                const payload: Record<string, unknown> = {
                    text: q.text.trim(),
                    answer_type: q.answer_type,
                    ...(opts ? { options: opts } : {}),
                    ...(q.answer_type === "scale" ? {
                        scale_min: parseInt(q.scale_min),
                        scale_max: parseInt(q.scale_max),
                    } : {}),
                    tags: [],
                };

                let qId = q.question_id;
                const saved = qId
                    ? await questionsApi.update(qId, payload as Parameters<typeof questionsApi.update>[1])
                    : await questionsApi.create(payload as Parameters<typeof questionsApi.create>[0]);
                qId = saved.id;

                refs.push({ question_id: qId, order_index: i, is_required: q.is_required });
            }

            // 3. Replace all questions on the form
            await formsApi.setQuestions(formId, refs);

            // 4. Optionally publish
            if (publish) await formsApi.publish(formId);

            onSaved();
            onClose();
        } catch (err: unknown) {
            setApiError(err instanceof Error ? err.message : "Failed to save form");
        } finally { setSaving(false); }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
                    <h2 className="font-bold text-base">{isNew ? "New Form" : `Edit: ${form?.title}`}</h2>
                    <button onClick={onClose} className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {loading ? (
                    <div className="p-6 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
                ) : (
                    <div className="flex-1 overflow-y-auto">
                        <div className="px-6 pt-5 pb-3 space-y-3">
                            {apiError && (
                                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-sm text-red-700">
                                    <AlertCircle className="w-4 h-4 shrink-0" />{apiError}
                                </div>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold">Form Title <span className="text-red-500">*</span></label>
                                    <Input className={cn("rounded-xl", titleError && "border-red-400")}
                                        value={title} onChange={e => { setTitle(e.target.value); setTitleError(""); }}
                                        placeholder="e.g. Initial Intake Form" />
                                    {titleError && <p className="text-[11px] text-red-500">{titleError}</p>}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold">Description</label>
                                    <Input className="rounded-xl" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Brief description (optional)" />
                                </div>
                            </div>
                        </div>

                        {/* Add question buttons */}
                        <div className="px-6 pb-3">
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Add Question</p>
                            <div className="flex flex-wrap gap-2">
                                {ANSWER_TYPES.map(type => {
                                    const meta = ANSWER_TYPE_META[type];
                                    const Icon = meta.icon;
                                    return (
                                        <button key={type} onClick={() => addQuestion(type)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                                            title={meta.hint}>
                                            <Icon className="w-3.5 h-3.5" />{meta.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Question list */}
                        <div className="px-6 pb-6 space-y-2">
                            {questions.length === 0 ? (
                                <div className="border-2 border-dashed border-border rounded-2xl p-8 text-center text-sm text-muted-foreground">
                                    Click a question type above to build your form
                                </div>
                            ) : questions.map((q, i) => {
                                const meta = ANSWER_TYPE_META[q.answer_type];
                                const Icon = meta.icon;
                                const hasErr = Object.keys(q.errors).length > 0;
                                return (
                                    <div key={q._key} className={cn("rounded-xl p-3 border", hasErr ? "bg-red-50/50 border-red-200" : "bg-muted/40 border-transparent")}>
                                        <div className="flex items-start gap-3">
                                            <GripVertical className="w-4 h-4 text-muted-foreground mt-2.5 shrink-0 cursor-grab" />
                                            <div className="flex-1 space-y-2 min-w-0">
                                                {/* Type badge + question text */}
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="flex items-center gap-1.5 bg-white rounded-lg px-2 py-1 text-[11px] font-medium text-muted-foreground border border-border/60 shrink-0">
                                                        <Icon className="w-3 h-3" />{meta.label}
                                                    </span>
                                                    <input
                                                        className={cn("flex-1 min-w-0 text-sm font-medium bg-transparent outline-none border-b transition-colors",
                                                            q.errors.text ? "border-red-400" : "border-transparent hover:border-border focus:border-foreground")}
                                                        value={q.text}
                                                        onChange={e => updateQ(q._key, { text: e.target.value })}
                                                        placeholder="Question text…" />
                                                </div>
                                                {q.errors.text && <p className="text-[11px] text-red-500 pl-1">{q.errors.text}</p>}

                                                {/* Multiple choice options */}
                                                {q.answer_type === "multiple_choice" && (
                                                    <div className="space-y-1">
                                                        <OptionChipsInput
                                                            chips={q.options}
                                                            onChange={chips => updateQ(q._key, { options: chips })}
                                                            hasError={!!q.errors.options}
                                                        />
                                                        {q.errors.options
                                                            ? <p className="text-[11px] text-red-500">{q.errors.options}</p>
                                                            : <p className="text-[10px] text-muted-foreground">{q.options.length} option{q.options.length !== 1 ? "s" : ""} · minimum 2 required</p>}
                                                    </div>
                                                )}

                                                {/* Scale min/max */}
                                                {q.answer_type === "scale" && (
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-[11px] text-muted-foreground">Min:</span>
                                                            <input type="number" className={cn("w-14 text-xs bg-white border rounded-lg px-2 py-1 outline-none",
                                                                q.errors.scale_min ? "border-red-400" : "border-border")}
                                                                value={q.scale_min} onChange={e => updateQ(q._key, { scale_min: e.target.value })} />
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-[11px] text-muted-foreground">Max:</span>
                                                            <input type="number" className={cn("w-14 text-xs bg-white border rounded-lg px-2 py-1 outline-none",
                                                                q.errors.scale_max ? "border-red-400" : "border-border")}
                                                                value={q.scale_max} onChange={e => updateQ(q._key, { scale_max: e.target.value })} />
                                                        </div>
                                                        {(q.errors.scale_min || q.errors.scale_max) && (
                                                            <p className="text-[11px] text-red-500">{q.errors.scale_min ?? q.errors.scale_max}</p>
                                                        )}
                                                    </div>
                                                )}

                                                {/* yes_no hint */}
                                                {q.answer_type === "yes_no" && (
                                                    <p className="text-[10px] text-muted-foreground">Patients will answer Yes or No</p>
                                                )}
                                                {q.answer_type === "free_text" && (
                                                    <p className="text-[10px] text-muted-foreground">Patients can type any free-form answer</p>
                                                )}
                                            </div>

                                            {/* Required + delete */}
                                            <div className="flex items-center gap-2 shrink-0">
                                                <label className="flex items-center gap-1 text-[11px] text-muted-foreground cursor-pointer select-none">
                                                    <input type="checkbox" checked={q.is_required}
                                                        onChange={e => updateQ(q._key, { is_required: e.target.checked })}
                                                        className="w-3 h-3 rounded" />
                                                    Req
                                                </label>
                                                <button onClick={() => removeQ(q._key)}
                                                    className="p-1.5 text-muted-foreground hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="px-6 py-4 border-t border-border/60 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">{questions.length} question{questions.length !== 1 ? "s" : ""}</p>
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={onClose} className="rounded-xl" disabled={saving}>Discard</Button>
                        <Button variant="outline" onClick={() => save(false)} disabled={saving} className="rounded-xl gap-2 text-xs">
                            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}Save Draft
                        </Button>
                        <Button onClick={() => save(true)} disabled={saving} className="rounded-xl gap-2">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}Publish
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function FormsPage() {
    const [forms, setForms] = useState<Form[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [preview, setPreview] = useState<Form | null>(null);
    const [builder, setBuilder] = useState<Form | null | "new">(null);
    const [deleting, setDeleting] = useState<Form | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try { setForms(await formsApi.list()); }
        catch { setForms([]); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const filtered = forms.filter(f => f.title.toLowerCase().includes(search.toLowerCase()));

    async function handleDelete(id: string) {
        try { await formsApi.delete(id); setDeleting(null); load(); }
        catch (e) { alert(e instanceof Error ? e.message : "Failed to delete"); }
    }

    async function handleDuplicate(f: Form) {
        try {
            const full = await formsApi.get(f.id);
            const copy = await formsApi.create({ title: `${f.title} (Copy)`, description: f.description ?? undefined });
            const qs = full.questions ?? [];
            if (qs.length) {
                const refs = await Promise.all(qs.map(async (q, i) => {
                    const payload: Record<string, unknown> = {
                        text: q.text, answer_type: q.answer_type, tags: [],
                        ...(q.options ? { options: q.options } : {}),
                        ...(q.answer_type === "scale" ? { scale_min: q.scale_min ?? 0, scale_max: q.scale_max ?? 10 } : {}),
                    };
                    const newQ = await questionsApi.create(payload as Parameters<typeof questionsApi.create>[0]);
                    return { question_id: newQ.id, order_index: i, is_required: q.is_required };
                }));
                await formsApi.setQuestions(copy.id, refs);
            }
            load();
        } catch (e) { alert(e instanceof Error ? e.message : "Failed to duplicate"); }
    }

    return (
        <div className="flex flex-col gap-4 p-5">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Form Builder</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {forms.length} form{forms.length !== 1 ? "s" : ""} · {forms.filter(f => f.is_published).length} published
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={load} className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
                        <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                    </button>
                    <Button size="sm" className="gap-1.5 rounded-xl" onClick={() => setBuilder("new")}>
                        <Plus className="w-4 h-4" /> New Form
                    </Button>
                </div>
            </div>

            <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder="Search forms..." className="pl-9 rounded-xl bg-white" value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            <div className="bg-white rounded-2xl overflow-hidden border border-border/50">
                <table className="w-full text-sm">
                    <thead className="border-b border-border/60">
                        <tr>
                            {["Form Name", "Description", "Last Updated", "Status", "Actions"].map(h => (
                                <th key={h} className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3.5">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <tr key={i} className="border-b border-border/60">
                                    {Array.from({ length: 5 }).map((_, j) => <td key={j} className="px-5 py-4"><Skeleton className="h-4 w-full" /></td>)}
                                </tr>
                            ))
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={5} className="text-center py-12 text-muted-foreground text-sm">
                                {search ? "No forms match your search." : "No forms yet. Create your first one!"}
                            </td></tr>
                        ) : filtered.map(f => (
                            <tr key={f.id} className="border-b border-border/60 hover:bg-muted/30 transition-colors">
                                <td className="px-5 py-4">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center shrink-0">
                                            <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                                        </div>
                                        <span className="font-semibold">{f.title}</span>
                                    </div>
                                </td>
                                <td className="px-5 py-4 text-xs text-muted-foreground max-w-[200px] truncate">{f.description ?? "—"}</td>
                                <td className="px-5 py-4 text-xs text-muted-foreground whitespace-nowrap">
                                    {new Date(f.updated_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                </td>
                                <td className="px-5 py-4">
                                    <Badge variant="outline" className={cn("text-[10px] rounded-full px-2.5 font-medium",
                                        f.is_published ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-muted-foreground/20 text-muted-foreground")}>
                                        {f.is_published ? "Published" : "Draft"}
                                    </Badge>
                                </td>
                                <td className="px-5 py-4">
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => setBuilder(f)} className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                                        <button onClick={() => setPreview(f)} className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors" title="Preview"><Eye className="w-3.5 h-3.5" /></button>
                                        <button onClick={() => handleDuplicate(f)} className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors" title="Duplicate"><Copy className="w-3.5 h-3.5" /></button>
                                        <button onClick={() => setDeleting(f)} className="p-1.5 text-muted-foreground hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {deleting && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleting(null)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center"><AlertCircle className="w-5 h-5 text-red-600" /></div>
                            <div>
                                <p className="font-bold">Delete "{deleting.title}"?</p>
                                <p className="text-xs text-muted-foreground mt-0.5">Permanently removed. Cannot undo.</p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3">
                            <Button variant="outline" className="rounded-xl" onClick={() => setDeleting(null)}>Cancel</Button>
                            <Button className="rounded-xl bg-red-600 hover:bg-red-700" onClick={() => handleDelete(deleting.id)}>Delete</Button>
                        </div>
                    </div>
                </div>
            )}

            {preview && <PreviewModal formId={preview.id} title={preview.title} onClose={() => setPreview(null)} />}
            {builder !== null && <BuilderModal form={builder === "new" ? null : builder} onClose={() => setBuilder(null)} onSaved={load} />}
        </div>
    );
}
