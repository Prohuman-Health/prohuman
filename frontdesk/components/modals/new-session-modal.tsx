"use client";

import { useState, useEffect } from "react";
import { X, Loader2, CalendarDays, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { usePatients } from "@/lib/contexts/patients-context";
import { useStaff } from "@/lib/contexts/staff-context";
import { useSessionTypes } from "@/lib/contexts/catalog-context";
import { useSessions } from "@/lib/contexts/sessions-context";
import { useAuth } from "@/lib/auth-context";
import { sessionsApi, branchesApi, Branch } from "@/lib/api";

interface Props {
    open: boolean;
    onClose: () => void;
    prefill?: { patientId?: string; doctorId?: string; date?: string; time?: string };
}

export function NewSessionModal({ open, onClose, prefill }: Props) {
    const { patients } = usePatients();
    const { doctors } = useStaff();
    const { sessionTypes } = useSessionTypes();
    const { refresh } = useSessions();
    const { user } = useAuth();

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [apiError, setApiError] = useState<string | null>(null);

    // Branches — only loaded if user has no branch_id
    const [branches, setBranches] = useState<Branch[]>([]);
    const [branchesLoading, setBranchesLoading] = useState(false);

    const todayStr = new Date().toISOString().slice(0, 10);
    const [form, setForm] = useState({
        patient_id: prefill?.patientId ?? "",
        doctor_id: prefill?.doctorId ?? "",
        session_type_id: "",
        date: prefill?.date ?? todayStr,
        time: prefill?.time ?? "09:00",
        notes: "",
        branch_id: user?.branch_id ?? "",
    });

    // Load branches when modal opens (if no branch on user)
    useEffect(() => {
        if (!open) return;
        // Reset success/error on open
        setErrors({}); setApiError(null); setSuccess(false);
        // Pre-fill branch from user if available
        setForm(prev => ({ ...prev, branch_id: user?.branch_id ?? "" }));

        if (!user?.branch_id) {
            setBranchesLoading(true);
            branchesApi.list()
                .then(b => {
                    setBranches(b);
                    // Auto-select first branch if only one
                    if (b.length === 1) setForm(prev => ({ ...prev, branch_id: b[0].id }));
                })
                .catch(() => {/* silent */ })
                .finally(() => setBranchesLoading(false));
        }
    }, [open, user?.branch_id]);

    const set = (k: keyof typeof form) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
            setForm(prev => ({ ...prev, [k]: e.target.value }));
            setErrors(prev => { const n = { ...prev }; delete n[k]; return n; });
        };

    function validate(): boolean {
        const errs: Record<string, string> = {};
        if (!form.patient_id) errs.patient_id = "Select a patient";
        if (!form.doctor_id) errs.doctor_id = "Select a doctor";
        if (!form.session_type_id) errs.session_type_id = "Select a session type";
        if (!form.date) errs.date = "Date is required";
        if (!form.time) errs.time = "Time is required";
        if (!form.branch_id) errs.branch_id = "Select a branch";
        setErrors(errs);
        return Object.keys(errs).length === 0;
    }

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!validate()) return;
        setLoading(true); setApiError(null);
        try {
            const scheduled_at = new Date(`${form.date}T${form.time}:00`).toISOString();
            const type = sessionTypes.find(t => t.id === form.session_type_id);
            await sessionsApi.create({
                patient_id: form.patient_id,
                doctor_id: form.doctor_id,
                session_type_id: form.session_type_id,
                branch_id: form.branch_id,
                scheduled_at,
                ...(type?.default_duration_minutes ? { duration_minutes: type.default_duration_minutes } : {}),
                ...(form.notes.trim() ? { pre_session_notes: form.notes.trim() } : {}),
            } as Parameters<typeof sessionsApi.create>[0]);
            await refresh();
            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                setForm({ patient_id: "", doctor_id: "", session_type_id: "", date: todayStr, time: "09:00", notes: "", branch_id: user?.branch_id ?? "" });
                onClose();
            }, 1200);
        } catch (err: unknown) {
            setApiError(err instanceof Error ? err.message : "Failed to schedule session");
        } finally { setLoading(false); }
    }

    function reset() {
        setErrors({}); setApiError(null); setSuccess(false);
        onClose();
    }

    if (!open) return null;

    const needsBranchPicker = !user?.branch_id;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={reset} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-border/60">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                            <CalendarDays className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="font-bold text-base">Schedule Session</h2>
                            <p className="text-xs text-muted-foreground">Book a new patient session</p>
                        </div>
                    </div>
                    <button onClick={reset} className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={submit} noValidate>
                    <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
                        {apiError && (
                            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-sm text-red-700">
                                <AlertCircle className="w-4 h-4 shrink-0" />{apiError}
                            </div>
                        )}
                        {success && (
                            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5 text-sm text-emerald-700">
                                <CheckCircle2 className="w-4 h-4 shrink-0" />Session scheduled!
                            </div>
                        )}

                        {/* Branch picker — only shown when user has no branch assigned */}
                        {needsBranchPicker && (
                            <Field label="Branch" required error={errors.branch_id}>
                                {branchesLoading ? (
                                    <div className="h-10 rounded-xl border border-input bg-muted animate-pulse" />
                                ) : branches.length === 0 ? (
                                    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-sm text-amber-700">
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                        No branches found. Please create a branch first.
                                    </div>
                                ) : (
                                    <select value={form.branch_id} onChange={set("branch_id")}
                                        className={cn("w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none appearance-none",
                                            errors.branch_id && "border-red-400")}>
                                        <option value="">Select branch…</option>
                                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                )}
                            </Field>
                        )}

                        <Field label="Patient" required error={errors.patient_id}>
                            <select value={form.patient_id} onChange={set("patient_id")}
                                className={cn("w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none appearance-none",
                                    errors.patient_id && "border-red-400")}>
                                <option value="">Select patient…</option>
                                {patients.map(p => <option key={p.id} value={p.id}>{p.full_name} ({p.patient_code})</option>)}
                            </select>
                        </Field>

                        <Field label="Doctor" required error={errors.doctor_id}>
                            <select value={form.doctor_id} onChange={set("doctor_id")}
                                className={cn("w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none appearance-none",
                                    errors.doctor_id && "border-red-400")}>
                                <option value="">Select doctor…</option>
                                {doctors.map(d => <option key={d.id} value={d.id}>{d.full_name}{d.specialty ? ` — ${d.specialty}` : ""}</option>)}
                            </select>
                        </Field>

                        <Field label="Session Type" required error={errors.session_type_id}>
                            <select value={form.session_type_id} onChange={set("session_type_id")}
                                className={cn("w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none appearance-none",
                                    errors.session_type_id && "border-red-400")}>
                                <option value="">Select type…</option>
                                {sessionTypes.map(t => <option key={t.id} value={t.id}>{t.name} ({t.default_duration_minutes} min · ₹{t.fee})</option>)}
                            </select>
                        </Field>

                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Date" required error={errors.date}>
                                <div className="relative">
                                    <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                                    <Input type="date" className={cn("pl-9 rounded-xl", errors.date && "border-red-400")}
                                        value={form.date} onChange={set("date")} />
                                </div>
                            </Field>
                            <Field label="Time" required error={errors.time}>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                                    <Input type="time" className={cn("pl-9 rounded-xl", errors.time && "border-red-400")}
                                        value={form.time} onChange={set("time")} />
                                </div>
                            </Field>
                        </div>

                        <Field label="Notes">
                            <textarea value={form.notes} onChange={set("notes")} rows={2}
                                placeholder="Any clinical notes or special instructions…"
                                className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground" />
                        </Field>
                    </div>

                    <div className="px-6 py-4 border-t border-border/60 flex items-center justify-end gap-3">
                        <Button type="button" variant="outline" onClick={reset} className="rounded-xl">Cancel</Button>
                        <Button type="submit" disabled={loading || success} className="rounded-xl gap-2 min-w-[150px]">
                            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Scheduling…</> :
                                success ? <><CheckCircle2 className="w-4 h-4" />Scheduled!</> : "Schedule Session"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
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
