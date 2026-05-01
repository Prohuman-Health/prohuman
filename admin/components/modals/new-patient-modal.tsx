"use client";

import { useState, useRef, useMemo } from "react";
import { X, Loader2, User, Mail, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput, validatePhone } from "@/components/ui/phone-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { usePatients } from "@/lib/contexts/patients-context";
import { useAuth } from "@/lib/auth-context";
import { patientsApi } from "@/lib/api";

interface Props { open: boolean; onClose: () => void; }

const GENDERS = ["Male", "Female", "Other"] as const;

export function NewPatientModal({ open, onClose }: Props) {
    const { refresh } = usePatients();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [apiError, setApiError] = useState<string | null>(null);
    const formRef = useRef<HTMLFormElement>(null);

    const [form, setForm] = useState({
        full_name: "", phone: "", email: "",
        date_of_birth: "", gender: "Male" as typeof GENDERS[number],
        complaints: "", reference: "",
    });

    const calculatedAge = useMemo(() => {
        if (!form.date_of_birth) return null;
        const dob = new Date(form.date_of_birth);
        if (isNaN(dob.getTime())) return null;
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
        return age >= 0 ? age : null;
    }, [form.date_of_birth]);

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
        if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errs.email = "Enter a valid email address";
        if (!form.date_of_birth) errs.date_of_birth = "Date of birth is required";
        else if (calculatedAge === null || calculatedAge < 0 || calculatedAge > 130) errs.date_of_birth = "Enter a valid date of birth";
        if (!form.complaints.trim()) errs.complaints = "Chief complaints are required";
        setErrors(errs);
        return Object.keys(errs).length === 0;
    }

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!validate()) return;
        setLoading(true); setApiError(null);
        try {
            await patientsApi.create({
                full_name: form.full_name.trim(),
                phone: form.phone.trim(),
                ...(form.email.trim() ? { email: form.email.trim() } : {}),
                date_of_birth: form.date_of_birth,
                age: calculatedAge!,
                gender: form.gender,
                complaints: form.complaints.trim(),
                ...(form.reference.trim() ? { reference: form.reference.trim() } : {}),
                ...(user?.branch_id ? { branch_id: user.branch_id } : {}),
            });
            await refresh();
            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                setForm({ full_name: "", phone: "", email: "", date_of_birth: "", gender: "Male", complaints: "", reference: "" });
                onClose();
            }, 1200);
        } catch (err: unknown) {
            setApiError(err instanceof Error ? err.message : "Failed to create patient");
        } finally { setLoading(false); }
    }

    function reset() {
        setForm({ full_name: "", phone: "", email: "", date_of_birth: "", gender: "Male", complaints: "", reference: "" });
        setErrors({}); setApiError(null); setSuccess(false);
        onClose();
    }

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={reset} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-border/60">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#2493A2]/10 flex items-center justify-center">
                            <User className="w-4 h-4 text-[#2493A2]" />
                        </div>
                        <div>
                            <h2 className="font-bold text-base">New Patient</h2>
                            <p className="text-xs text-muted-foreground">Register a new patient record</p>
                        </div>
                    </div>
                    <button onClick={reset} className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form ref={formRef} onSubmit={submit} noValidate>
                    <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
                        {apiError && (
                            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-sm text-red-700">
                                <AlertCircle className="w-4 h-4 shrink-0" /> {apiError}
                            </div>
                        )}
                        {success && (
                            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5 text-sm text-emerald-700">
                                <CheckCircle2 className="w-4 h-4 shrink-0" /> Patient created successfully!
                            </div>
                        )}

                        <Field label="Full Name" required error={errors.full_name}>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                <Input className={cn("pl-9 rounded-xl", errors.full_name && "border-red-400")}
                                    placeholder="e.g. Aisha Mehta" value={form.full_name} onChange={set("full_name")} />
                            </div>
                        </Field>

                        <Field label="Phone" required error={errors.phone}>
                            <PhoneInput
                                value={form.phone}
                                onChange={v => { setForm(prev => ({ ...prev, phone: v })); setErrors(prev => { const n = { ...prev }; delete n.phone; return n; }); }}
                                error={errors.phone}
                            />
                        </Field>

                        <Field
                            label="Date of Birth"
                            required
                            error={errors.date_of_birth}
                            aside={calculatedAge !== null ? `${calculatedAge} yrs` : undefined}
                        >
                            <Input
                                type="date"
                                max={new Date().toISOString().slice(0, 10)}
                                className={cn("rounded-xl", errors.date_of_birth && "border-red-400")}
                                value={form.date_of_birth}
                                onChange={e => {
                                    setForm(prev => ({ ...prev, date_of_birth: e.target.value }));
                                    setErrors(prev => { const n = { ...prev }; delete n.date_of_birth; return n; });
                                }}
                            />
                        </Field>

                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Email" error={errors.email}>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                    <Input type="email" className={cn("pl-9 rounded-xl", errors.email && "border-red-400")}
                                        placeholder="Optional" value={form.email} onChange={set("email")} />
                                </div>
                            </Field>
                            <Field label="Gender">
                                <Select value={form.gender} onValueChange={v => setForm(f => ({...f, gender: v as typeof form.gender}))}>
                                    <SelectTrigger className="w-full h-10 rounded-xl text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        {GENDERS.map(g => <SelectItem key={g} value={g} className="rounded-lg">{g}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </Field>
                        </div>

                        <Field label="Chief Complaints" required error={errors.complaints}>
                            <textarea value={form.complaints} onChange={set("complaints")} rows={3}
                                placeholder="Describe the patient's primary complaints..."
                                className={cn("w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground",
                                    errors.complaints && "border-red-400")} />
                        </Field>

                        <Field label="Patient Reference" aside="optional">
                            <textarea value={form.reference} onChange={set("reference")} rows={2}
                                placeholder="e.g. Referred by Dr. Sharma · Walk-in · Google ads..."
                                className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground" />
                        </Field>
                    </div>

                    <div className="px-6 py-4 border-t border-border/60 flex items-center justify-end gap-3">
                        <Button type="button" variant="outline" onClick={reset} className="rounded-xl">Cancel</Button>
                        <Button type="submit" disabled={loading || success} className="rounded-xl gap-2 min-w-[130px]">
                            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Creating…</> :
                                success ? <><CheckCircle2 className="w-4 h-4" />Created!</> : "Create Patient"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function Field({ label, required, error, aside, children }: { label: string; required?: boolean; error?: string; aside?: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">
                    {label}{required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                {aside && <span className="text-xs font-semibold text-[#2493A2]">{aside}</span>}
            </div>
            {children}
            {error && <p className="text-[11px] text-red-500 font-medium">{error}</p>}
        </div>
    );
}
