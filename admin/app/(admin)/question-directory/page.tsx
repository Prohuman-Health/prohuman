"use client";

import { useState, useEffect, useCallback, useRef, KeyboardEvent } from "react";
import {
    Plus, Search, Pencil, Trash2, X, RefreshCw, AlertCircle, CheckCircle2,
    Type, ToggleLeft, List, Scale, BookOpen, Tag, ChevronDown, ChevronRight, Paperclip, PenLine,
    Loader2, ScanLine, Crosshair,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { questionsApi, Question, QuestionAnswerType } from "@/lib/api";

// ── Section taxonomy (mirrors the CSV intake form structure) ──────────────────
const SECTIONS = [
    "Intake",
    "Present History",
    "Past History",
    "Medical History",
    "Lifestyle Assessment",
    "Posture",
    "Assessment",
    "Diagnosis",
    "Recovery Plan",
    "SOAP Note",
    "Exercises",
    "Parameters",
    "Consultants",
    "Payment",
    "Other",
] as const;

type Section = (typeof SECTIONS)[number];

// ── Answer type meta ──────────────────────────────────────────────────────────
const ANSWER_TYPE_META: Record<QuestionAnswerType, { icon: React.ElementType; label: string; color: string }> = {
    free_text: { icon: Type, label: "Free Text", color: "bg-blue-100 text-blue-700" },
    yes_no: { icon: ToggleLeft, label: "Yes / No", color: "bg-emerald-100 text-emerald-700" },
    scale: { icon: Scale, label: "Scale", color: "bg-amber-100 text-amber-700" },
    multiple_choice: { icon: List, label: "Multiple Choice", color: "bg-violet-100 text-violet-700" },
    file_upload: { icon: Paperclip, label: "File Upload", color: "bg-cyan-100 text-cyan-700" },
    drawing_pad: { icon: PenLine, label: "Drawing", color: "bg-fuchsia-100 text-fuchsia-700" },
    medical_media: { icon: ScanLine, label: "Medical Media", color: "bg-teal-100 text-teal-700" },
    body_map: { icon: Crosshair, label: "Body Map", color: "bg-rose-100 text-rose-700" },
};
const ANSWER_TYPES = Object.keys(ANSWER_TYPE_META) as QuestionAnswerType[];

function Skeleton({ className }: { className?: string }) {
    return <div className={cn("animate-pulse bg-muted rounded-xl", className)} />;
}

// ── Option chips input ────────────────────────────────────────────────────────
function OptionChipsInput({ chips, onChange, hasError }: { chips: string[]; onChange: (v: string[]) => void; hasError?: boolean }) {
    const [draft, setDraft] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    function commit(raw: string) {
        const val = raw.trim();
        if (val && !chips.includes(val)) onChange([...chips, val]);
        setDraft("");
    }
    function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
        if (e.key === "Enter" || e.key === ",") { e.preventDefault(); commit(draft); }
        else if (e.key === "Backspace" && draft === "" && chips.length > 0) onChange(chips.slice(0, -1));
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
                    <button type="button" onClick={() => onChange(chips.filter((_, idx) => idx !== i))}
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
                placeholder={chips.length === 0 ? "Type an option, press Enter or comma…" : "Add another…"}
                className="flex-1 min-w-[120px] outline-none bg-transparent text-xs text-foreground placeholder:text-muted-foreground"
            />
        </div>
    );
}

// ── Question form state ───────────────────────────────────────────────────────
interface QForm {
    text: string;
    section: Section | "";
    answer_type: QuestionAnswerType;
    options: string[];
    scale_min: string;
    scale_max: string;
    treatment_tags: string[];
    body_regions: string[];
    is_active: boolean;
}

function emptyForm(): QForm {
    return { text: "", section: "", answer_type: "free_text", options: [], scale_min: "0", scale_max: "10", treatment_tags: [], body_regions: [], is_active: true };
}

function validateForm(f: QForm): Record<string, string> {
    const e: Record<string, string> = {};
    if (!f.text.trim()) e.text = "Question text is required";
    if (f.answer_type === "multiple_choice" && f.options.length < 2) e.options = "At least 2 options required";
    if (f.answer_type === "scale") {
        const min = parseInt(f.scale_min), max = parseInt(f.scale_max);
        if (isNaN(min)) e.scale_min = "Required";
        if (isNaN(max)) e.scale_max = "Required";
        if (!isNaN(min) && !isNaN(max) && min >= max) e.scale_max = "Max must be greater than min";
    }
    return e;
}

// ── Question Editor Modal ─────────────────────────────────────────────────────
function QuestionModal({
    initial,
    onClose,
    onSaved,
}: { initial?: Question; onClose: () => void; onSaved: () => void }) {
    const isNew = !initial;

    // Derive section from category or legacy tags
    const existingSection = (initial?.category && (SECTIONS as readonly string[]).includes(initial.category)
        ? initial.category
        : initial?.tags?.find(t => (SECTIONS as readonly string[]).includes(t)) ?? "Other") as Section;

    const [form, setForm] = useState<QForm>(initial ? {
        text: initial.text,
        section: existingSection,
        answer_type: initial.answer_type,
        options: initial.options ?? [],
        scale_min: String(initial.scale_min ?? "0"),
        scale_max: String(initial.scale_max ?? "10"),
        treatment_tags: initial.treatment_tags ?? [],
        body_regions: initial.body_regions ?? [],
        is_active: initial.is_active,
    } : emptyForm());

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    function update(patch: Partial<QForm>) {
        setForm(prev => ({ ...prev, ...patch }));
    }

    async function save() {
        const errs = validateForm(form);
        setErrors(errs);
        if (Object.keys(errs).length > 0) return;

        setSaving(true);
        setApiError(null);
        try {
            const payload = {
                text: form.text.trim(),
                answer_type: form.answer_type,
                options: form.answer_type === "multiple_choice" ? form.options : undefined,
                scale_min: form.answer_type === "scale" ? parseInt(form.scale_min) : undefined,
                scale_max: form.answer_type === "scale" ? parseInt(form.scale_max) : undefined,
                category: form.section || undefined,
                tags: form.section ? [form.section] : [],
                treatment_tags: form.treatment_tags,
                body_regions: form.body_regions,
                is_active: form.is_active,
            };
            if (isNew) await questionsApi.create(payload);
            else await questionsApi.update(initial!.id, payload);
            onSaved();
            onClose();
        } catch (err) {
            setApiError(err instanceof Error ? err.message : "Failed to save question");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
                    <h2 className="font-bold text-base">{isNew ? "New Question" : "Edit Question"}</h2>
                    <button onClick={onClose} className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
                    {apiError && (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-sm text-red-700">
                            <AlertCircle className="w-4 h-4 shrink-0" />{apiError}
                        </div>
                    )}

                    {/* Question text */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold">Question Text <span className="text-red-500">*</span></label>
                        <textarea
                            rows={2}
                            value={form.text}
                            onChange={e => update({ text: e.target.value })}
                            placeholder="e.g. What brings you here today?"
                            className={cn(
                                "w-full px-3 py-2.5 rounded-xl border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring",
                                errors.text ? "border-red-400" : "border-input"
                            )}
                        />
                        {errors.text && <p className="text-[11px] text-red-500">{errors.text}</p>}
                    </div>

                    {/* Answer type */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold">Answer Type</label>
                        <div className="flex flex-wrap gap-2">
                            {ANSWER_TYPES.map(type => {
                                const meta = ANSWER_TYPE_META[type];
                                const Icon = meta.icon;
                                return (
                                    <button key={type} type="button"
                                        onClick={() => update({ answer_type: type })}
                                        className={cn(
                                            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all",
                                            form.answer_type === type
                                                ? "border-foreground bg-foreground text-white"
                                                : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                                        )}>
                                        <Icon className="w-3.5 h-3.5" />{meta.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Section */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold">Section / Category
                            <span className="text-muted-foreground font-normal ml-1">(optional)</span>
                        </label>
                        <select
                            value={form.section}
                            onChange={e => update({ section: e.target.value as Section | "" })}
                            className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none appearance-none">
                            <option value="">— No section —</option>
                            {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    {/* Multiple choice options */}
                    {form.answer_type === "multiple_choice" && (
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold">Options</label>
                            <OptionChipsInput chips={form.options} onChange={v => update({ options: v })} hasError={!!errors.options} />
                            {errors.options ? <p className="text-[11px] text-red-500">{errors.options}</p>
                                : <p className="text-[10px] text-muted-foreground">{form.options.length} option{form.options.length !== 1 ? "s" : ""} · minimum 2 required</p>}
                        </div>
                    )}

                    {/* Scale min/max */}
                    {form.answer_type === "scale" && (
                        <div className="flex items-center gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold">Min</label>
                                <Input type="number" className={cn("rounded-xl w-20", errors.scale_min && "border-red-400")}
                                    value={form.scale_min} onChange={e => update({ scale_min: e.target.value })} />
                                {errors.scale_min && <p className="text-[11px] text-red-500">{errors.scale_min}</p>}
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold">Max</label>
                                <Input type="number" className={cn("rounded-xl w-20", errors.scale_max && "border-red-400")}
                                    value={form.scale_max} onChange={e => update({ scale_max: e.target.value })} />
                                {errors.scale_max && <p className="text-[11px] text-red-500">{errors.scale_max}</p>}
                            </div>
                        </div>
                    )}

                    {/* Treatment tags */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold">Treatment Type Tags
                            <span className="text-muted-foreground font-normal ml-1">(optional)</span>
                        </label>
                        <OptionChipsInput
                            chips={form.treatment_tags}
                            onChange={v => update({ treatment_tags: v })}
                        />
                        <p className="text-[10px] text-muted-foreground">
                            e.g. Physiotherapy · Massage · Exercise · Visceral · Pelvic Floor
                        </p>
                    </div>

                    {/* Body regions */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold">Body Region Tags
                            <span className="text-muted-foreground font-normal ml-1">(optional)</span>
                        </label>
                        <OptionChipsInput
                            chips={form.body_regions}
                            onChange={v => update({ body_regions: v })}
                        />
                        <p className="text-[10px] text-muted-foreground">
                            e.g. Knee · Shoulder · Spine · Hip · Ankle · Neck
                        </p>
                    </div>

                    {/* Active toggle */}
                    <div className="flex items-center justify-between py-2 border-t border-border/60">
                        <div>
                            <p className="text-sm font-medium">Active</p>
                            <p className="text-xs text-muted-foreground">Inactive questions won&apos;t appear when building forms</p>
                        </div>
                        <button type="button"
                            onClick={() => update({ is_active: !form.is_active })}
                            className={cn("relative w-11 h-6 rounded-full transition-colors", form.is_active ? "bg-foreground" : "bg-muted")}>
                            <span className={cn("absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all", form.is_active ? "left-5" : "left-0.5")} />
                        </button>
                    </div>
                </div>
                <div className="px-6 py-4 border-t border-border/60 flex justify-end gap-3">
                    <Button variant="outline" className="rounded-xl" onClick={onClose} disabled={saving}>Cancel</Button>
                    <Button className="rounded-xl gap-2" onClick={save} disabled={saving}>
                        {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : <><CheckCircle2 className="w-4 h-4" />Save Question</>}
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ── Form preview renderer ─────────────────────────────────────────────────────
function QuestionPreview({ q }: { q: Question }) {
    if (q.answer_type === "free_text") {
        return (
            <div className="mt-2 w-full max-w-sm h-9 rounded-lg border border-border bg-muted/40 px-3 flex items-center">
                <span className="text-xs text-muted-foreground/60 select-none">Type your answer…</span>
            </div>
        );
    }
    if (q.answer_type === "yes_no") {
        return (
            <div className="mt-2 flex gap-2">
                {["Yes", "No"].map(opt => (
                    <div key={opt} className="px-5 py-1.5 rounded-lg border border-border bg-muted/40 text-xs font-medium text-muted-foreground select-none">
                        {opt}
                    </div>
                ))}
            </div>
        );
    }
    if (q.answer_type === "multiple_choice" && q.options && q.options.length > 0) {
        return (
            <div className="mt-2 flex flex-col gap-1.5">
                {q.options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border border-border bg-muted/40 shrink-0" />
                        <span className="text-xs text-muted-foreground">{opt}</span>
                    </div>
                ))}
            </div>
        );
    }
    if (q.answer_type === "scale") {
        const min = q.scale_min ?? 0;
        const max = q.scale_max ?? 10;
        const mid = Math.round((min + max) / 2);
        return (
            <div className="mt-2 w-full max-w-xs space-y-1">
                <div className="relative h-2 bg-muted rounded-full border border-border">
                    <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-border bg-white shadow-sm" />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground px-0.5">
                    <span>{min}</span><span>{mid}</span><span>{max}</span>
                </div>
            </div>
        );
    }
    if (q.answer_type === "file_upload") {
        return (
            <div className="mt-2 w-full max-w-xs h-14 rounded-lg border border-dashed border-border bg-muted/30 flex items-center justify-center gap-2">
                <Paperclip className="w-3.5 h-3.5 text-muted-foreground/60" />
                <span className="text-xs text-muted-foreground/60 select-none">Attach a file…</span>
            </div>
        );
    }
    if (q.answer_type === "drawing_pad") {
        return (
            <div className="mt-2 w-full max-w-xs h-16 rounded-lg border border-dashed border-border bg-muted/30 flex items-center justify-center gap-2">
                <PenLine className="w-3.5 h-3.5 text-muted-foreground/60" />
                <span className="text-xs text-muted-foreground/60 select-none">Draw here…</span>
            </div>
        );
    }
    return null;
}

// ── Section accordion ─────────────────────────────────────────────────────────
function SectionGroup({
    section,
    questions,
    onEdit,
    onRetire,
}: {
    section: Section;
    questions: Question[];
    onEdit: (q: Question) => void;
    onRetire: (q: Question) => void;
}) {
    const [open, setOpen] = useState(true);
    if (questions.length === 0) return null;

    return (
        <div className="bg-white rounded-2xl border border-border/50 overflow-hidden">
            <button
                onClick={() => setOpen(v => !v)}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                        <Tag className="w-3.5 h-3.5 text-violet-700" />
                    </div>
                    <span className="font-semibold text-sm">{section}</span>
                    <Badge variant="outline" className="text-[10px] rounded-full px-2">{questions.length}</Badge>
                </div>
                {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            </button>

            {open && (
                <div className="border-t border-border/60">
                    {questions.map((q, i) => {
                        const meta = ANSWER_TYPE_META[q.answer_type];
                        const Icon = meta.icon;
                        return (
                            <div key={q.id} className={cn("flex items-start gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors", i < questions.length - 1 && "border-b border-border/40")}>
                                <span className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0 mt-0.5">
                                    {i + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className={cn("text-sm font-medium", !q.is_active && "line-through text-muted-foreground")}>
                                        {q.text}
                                    </p>
                                    <div className="pointer-events-none opacity-70">
                                        <QuestionPreview q={q} />
                                    </div>
                                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                                        <span className={cn("flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full", meta.color)}>
                                            <Icon className="w-3 h-3" />{meta.label}
                                        </span>
                                        {q.answer_type === "multiple_choice" && q.options && (
                                            <span className="text-[11px] text-muted-foreground">
                                                {q.options.slice(0, 4).join(" · ")}{q.options.length > 4 && ` +${q.options.length - 4} more`}
                                            </span>
                                        )}
                                        {q.answer_type === "scale" && (
                                            <span className="text-[11px] text-muted-foreground">{q.scale_min} – {q.scale_max}</span>
                                        )}
                                        {(q.treatment_tags ?? []).map(t => (
                                            <span key={t} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">{t}</span>
                                        ))}
                                        {(q.body_regions ?? []).map(r => (
                                            <span key={r} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100">{r}</span>
                                        ))}
                                        {!q.is_active && (
                                            <Badge variant="outline" className="text-[10px] rounded-full px-2 text-muted-foreground">Inactive</Badge>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <button onClick={() => onEdit(q)}
                                        className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
                                        title="Edit">
                                        <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => onRetire(q)}
                                        className="p-1.5 text-muted-foreground hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                                        title="Retire question">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function QuestionDirectoryPage() {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterSection, setFilterSection] = useState<Section | "All">("All");
    const [filterTreatment, setFilterTreatment] = useState("");
    const [filterRegion, setFilterRegion] = useState("");
    const [showInactive, setShowInactive] = useState(false);
    const [modal, setModal] = useState<Question | "new" | null>(null);
    const [retireTarget, setRetireTarget] = useState<Question | null>(null);
    const [retiring, setRetiring] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try { setQuestions(await questionsApi.list()); }
        catch { setQuestions([]); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    // Group by section
    const filtered = questions.filter(q => {
        if (!showInactive && !q.is_active) return false;
        if (filterSection !== "All" && (q.category ?? "") !== filterSection && !q.tags.includes(filterSection)) return false;
        if (filterTreatment && !(q.treatment_tags ?? []).some(t => t.toLowerCase().includes(filterTreatment.toLowerCase()))) return false;
        if (filterRegion && !(q.body_regions ?? []).some(r => r.toLowerCase().includes(filterRegion.toLowerCase()))) return false;
        if (search && !q.text.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const grouped = SECTIONS.reduce<Record<Section, Question[]>>((acc, sec) => {
        acc[sec] = filtered.filter(q => (q.category ?? "") === sec || ((!q.category || q.category === "General") && q.tags.includes(sec)));
        return acc;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }, {} as any);

    // Questions with no matching section go to "Other"
    const withSection = new Set(filtered.filter(q => SECTIONS.slice(0, -1).some(s => (q.category ?? "") === s || q.tags.includes(s))).map(q => q.id));
    grouped["Other"] = [...(grouped["Other"] ?? []), ...filtered.filter(q => !withSection.has(q.id))];

    // Build autocomplete lists from loaded questions
    const allTreatmentTags = [...new Set(questions.flatMap(q => q.treatment_tags ?? []))].sort();
    const allBodyRegions = [...new Set(questions.flatMap(q => q.body_regions ?? []))].sort();

    const totalActive = questions.filter(q => q.is_active).length;

    async function doRetire() {
        if (!retireTarget) return;
        setRetiring(true);
        try { await questionsApi.retire(retireTarget.id); setRetireTarget(null); await load(); }
        catch { /* silent */ }
        finally { setRetiring(false); }
    }

    return (
        <>
            <div className="flex flex-col gap-4 p-5">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-violet-700" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Question Directory</h1>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                {totalActive} active question{totalActive !== 1 ? "s" : ""} · reusable across all forms
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={load}
                            className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
                            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                        </button>
                        <Button size="sm" className="gap-1.5 rounded-xl" onClick={() => setModal("new")}>
                            <Plus className="w-4 h-4" /> New Question
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input placeholder="Search questions…" className="pl-9 rounded-xl bg-white" value={search} onChange={e => setSearch(e.target.value)} />
                    </div>

                    <select
                        value={filterSection}
                        onChange={e => setFilterSection(e.target.value as Section | "All")}
                        className="h-9 px-3 rounded-xl border border-border bg-white text-sm focus:outline-none appearance-none cursor-pointer">
                        <option value="All">All Sections</option>
                        {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>

                    {/* Treatment tag filter */}
                    <div className="relative">
                        <Input
                            list="treatment-opts"
                            placeholder="Treatment type…"
                            className="rounded-xl bg-white w-44 h-9 text-sm"
                            value={filterTreatment}
                            onChange={e => setFilterTreatment(e.target.value)}
                        />
                        <datalist id="treatment-opts">
                            {allTreatmentTags.map(t => <option key={t} value={t} />)}
                        </datalist>
                        {filterTreatment && (
                            <button onClick={() => setFilterTreatment("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>

                    {/* Body region filter */}
                    <div className="relative">
                        <Input
                            list="region-opts"
                            placeholder="Body region…"
                            className="rounded-xl bg-white w-36 h-9 text-sm"
                            value={filterRegion}
                            onChange={e => setFilterRegion(e.target.value)}
                        />
                        <datalist id="region-opts">
                            {allBodyRegions.map(r => <option key={r} value={r} />)}
                        </datalist>
                        {filterRegion && (
                            <button onClick={() => setFilterRegion("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-1 bg-white rounded-xl p-1">
                        {([[false, "Active"], [true, "All"]] as const).map(([v, l]) => (
                            <button key={String(v)} onClick={() => setShowInactive(v)}
                                className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all", showInactive === v ? "bg-foreground text-white" : "text-muted-foreground hover:text-foreground")}>
                                {l}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-border/50 p-12 text-center text-sm text-muted-foreground">
                        {search || filterSection !== "All" ? "No questions match your filters." : "No questions yet. Click \"New Question\" to add the first one."}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {SECTIONS.map(sec => (
                            <SectionGroup
                                key={sec}
                                section={sec}
                                questions={grouped[sec] ?? []}
                                onEdit={q => setModal(q)}
                                onRetire={q => setRetireTarget(q)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Question editor modal */}
            {modal && (
                <QuestionModal
                    initial={modal === "new" ? undefined : modal}
                    onClose={() => setModal(null)}
                    onSaved={load}
                />
            )}

            {/* Retire confirmation */}
            {retireTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setRetireTarget(null)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
                        <p className="font-bold text-sm">Retire Question?</p>
                        <p className="text-sm text-muted-foreground">
                            &ldquo;<span className="font-medium text-foreground">{retireTarget.text}</span>&rdquo; will be marked inactive and won&apos;t appear in new forms. Existing form responses are not affected.
                        </p>
                        <div className="flex justify-end gap-3 pt-1">
                            <Button variant="outline" className="rounded-xl text-xs" onClick={() => setRetireTarget(null)} disabled={retiring}>Cancel</Button>
                            <Button className="rounded-xl text-xs bg-red-600 hover:bg-red-700" onClick={doRetire} disabled={retiring}>
                                {retiring ? "Retiring…" : "Retire"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
