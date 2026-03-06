"use client";

import { useState, useEffect } from "react";
import { X, Loader2, User, Mail, Hash, AlertCircle, CheckCircle2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput, validatePhone } from "@/components/ui/phone-input";
import { cn } from "@/lib/utils";
import { usePatients } from "@/lib/contexts/patients-context";
import { patientsApi, Patient } from "@/lib/api";

interface Props {
    patient: Patient | null;
    onClose: (updated?: Patient) => void;
}

const GENDERS = ["Male", "Female", "Other"] as const;

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

export function EditPatientModal({ patient, onClose }: Props) {
    const { refresh } = usePatients();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [apiError, setApiError] = useState<string | null>(null);

    const [form, setForm] = useState({
        full_name: "",
        phone: "",
        email: "",
        age: "",
        gender: "Male" as typeof GENDERS[number],
        complaints: "",
    });

    // Pre-fill whenever patient changes
    useEffect(() => {
        if (!patient) return;
        setForm({
            full_name: patient.full_name,
            phone: patient.phone,
            email: patient.email ?? "",
            age: String(patient.age),
            gender: (patient.gender as typeof GENDERS[number]) ?? "Male",
            complaints: patient.complaints ?? "",
        });
        setErrors({});
        setApiError(null);
        setSuccess(false);
    }, [patient]);

    const set = (k: keyof typeof form) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
            setForm(prev => ({ ...prev, [k]: e.target.value }));
            setErrors(prev => { const n = { ...prev }; delete n[k]; return n; });
        };

    function validate(): boolean {
        const errs: Record<string, string> = {};
        if (!form.full_name.trim()) errs.full_name = "Full name is required";
        const phoneErr = validatePhone(form.phone);
        if (phoneErr) errs.phone = phoneErr;
        if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
            errs.email = "Enter a valid email address";
        const age = parseInt(form.age);
        if (!form.age) errs.age = "Age is required";
        else if (isNaN(age) || age < 1 || age > 130) errs.age = "Age must be between 1 and 130";
        if (!form.complaints.trim()) errs.complaints = "Chief complaints are required";
        setErrors(errs);
        return Object.keys(errs).length === 0;
    }

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!patient || !validate()) return;
        setLoading(true); setApiError(null);
        try {
            const updated = await patientsApi.update(patient.id, {
                full_name: form.full_name.trim(),
                phone: form.phone.trim(),
                email: form.email.trim() || undefined,
                age: parseInt(form.age),
                gender: form.gender,
                complaints: form.complaints.trim(),
            });
            await refresh();
            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                onClose(updated);
            }, 1000);
        } catch (err: unknown) {
            setApiError(err instanceof Error ? err.message : "Failed to update patient");
        } finally { setLoading(false); }
    }

    if (!patient) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => onClose()} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-border/60">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#2493A2]/10 flex items-center justify-center">
                            <User className="w-4 h-4 text-[#2493A2]" />
                        </div>
                        <div>
                            <h2 className="font-bold text-base">Edit Patient</h2>
                            <p className="text-xs text-muted-foreground font-mono">{patient.patient_code}</p>
                        </div>
                    </div>
                    <button onClick={() => onClose()}
                        className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
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
                                <CheckCircle2 className="w-4 h-4 shrink-0" />Patient updated successfully!
                            </div>
                        )}

                        <Field label="Full Name" required error={errors.full_name}>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                <Input className={cn("pl-9 rounded-xl", errors.full_name && "border-red-400")}
                                    placeholder="e.g. Aisha Mehta"
                                    value={form.full_name} onChange={set("full_name")} />
                            </div>
                        </Field>

                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Phone" required error={errors.phone}>
                                <PhoneInput
                                    value={form.phone}
                                    onChange={v => {
                                        setForm(prev => ({ ...prev, phone: v }));
                                        setErrors(prev => { const n = { ...prev }; delete n.phone; return n; });
                                    }}
                                    error={errors.phone}
                                />
                            </Field>
                            <Field label="Age" required error={errors.age}>
                                <div className="relative">
                                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                    <Input type="number" min={1} max={130}
                                        className={cn("pl-9 rounded-xl", errors.age && "border-red-400")}
                                        placeholder="28" value={form.age} onChange={set("age")} />
                                </div>
                            </Field>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Email" error={errors.email}>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                    <Input type="email"
                                        className={cn("pl-9 rounded-xl", errors.email && "border-red-400")}
                                        placeholder="Optional" value={form.email} onChange={set("email")} />
                                </div>
                            </Field>
                            <Field label="Gender">
                                <select value={form.gender} onChange={set("gender")}
                                    className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                                    {GENDERS.map(g => <option key={g}>{g}</option>)}
                                </select>
                            </Field>
                        </div>

                        <Field label="Chief Complaints" required error={errors.complaints}>
                            <textarea value={form.complaints} onChange={set("complaints")} rows={3}
                                placeholder="Describe the patient's primary complaints..."
                                className={cn(
                                    "w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground",
                                    errors.complaints && "border-red-400"
                                )} />
                        </Field>
                    </div>

                    <div className="px-6 py-4 border-t border-border/60 flex items-center justify-end gap-3">
                        <Button type="button" variant="outline" onClick={() => onClose()} className="rounded-xl">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading || success} className="rounded-xl gap-2 min-w-[140px]">
                            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> :
                                success ? <><CheckCircle2 className="w-4 h-4" />Saved!</> :
                                    <><Save className="w-4 h-4" />Save Changes</>}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
