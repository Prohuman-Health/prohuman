"use client";

import { useState } from "react";
import { X, Loader2, ShieldCheck, Stethoscope, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput, validatePhone } from "@/components/ui/phone-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useStaff } from "@/lib/contexts/staff-context";
import { staffApi, doctorsApi } from "@/lib/api";

interface Props {
    open: boolean;
    onClose: () => void;
    /** When true: locks role to "doctor" and shows specialty / bio fields */
    doctorMode?: boolean;
}

// Roles accepted by backend enum: admin | receptionist | doctor
const ROLES = [
    { value: "admin", label: "Admin" },
    { value: "receptionist", label: "Receptionist" },
    { value: "doctor", label: "Doctor / Physiotherapist" },
] as const;

type RoleValue = typeof ROLES[number]["value"];

export function NewStaffModal({ open, onClose, doctorMode = false }: Props) {
    const { refresh } = useStaff();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [showPw, setShowPw] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [apiError, setApiError] = useState<string | null>(null);

    const [form, setForm] = useState({
        full_name: "", email: "", phone: "",
        role: (doctorMode ? "doctor" : "doctor") as RoleValue,
        password: "",
        specialty: "",
        bio: "",
    });

    const set = (k: keyof typeof form) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
            setForm(prev => ({ ...prev, [k]: e.target.value }));
            setErrors(prev => { const n = { ...prev }; delete n[k]; return n; });
        };

    function validate(): boolean {
        const errs: Record<string, string> = {};
        if (!form.full_name.trim()) errs.full_name = "Full name is required";
        if (!form.email.trim()) errs.email = "Email is required";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errs.email = "Enter a valid email";
        if (form.phone) { const phoneErr = validatePhone(form.phone); if (phoneErr) errs.phone = phoneErr; }
        if (!form.role) errs.role = "Role is required";
        if (!form.password) errs.password = "Password is required";
        else if (form.password.length < 8) errs.password = "Password must be at least 8 characters";
        setErrors(errs);
        return Object.keys(errs).length === 0;
    }

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!validate()) return;
        setLoading(true); setApiError(null);
        try {
            const staff = await staffApi.create({
                full_name: form.full_name.trim(),
                email: form.email.trim(),
                role: form.role,
                password: form.password,
                ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
            } as Parameters<typeof staffApi.create>[0]);

            // If doctor role + specialty/bio filled in, fetch doctor record and update it
            if (form.role === "doctor" && (form.specialty.trim() || form.bio.trim())) {
                try {
                    // The backend creates the doctor row linked to this staff id.
                    // We need to find that doctor by staff_id to get the doctor id.
                    const doctors = await doctorsApi.list();
                    const doc = doctors.find(d => d.staff_id === staff.id);
                    if (doc) {
                        await doctorsApi.update(doc.id, {
                            ...(form.specialty.trim() ? { specialty: form.specialty.trim() } : {}),
                            ...(form.bio.trim() ? { bio: form.bio.trim() } : {}),
                        });
                    }
                } catch {
                    // Non-fatal — doctor was created, specialty update failed silently
                }
            }

            await refresh();
            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                setForm({ full_name: "", email: "", phone: "", role: doctorMode ? "doctor" : "doctor", password: "", specialty: "", bio: "" });
                onClose();
            }, 1200);
        } catch (err: unknown) {
            setApiError(err instanceof Error ? err.message : "Failed to create staff");
        } finally { setLoading(false); }
    }

    function reset() {
        setErrors({}); setApiError(null); setSuccess(false);
        onClose();
    }

    const isDoctor = doctorMode || form.role === "doctor";

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={reset} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-border/60">
                    <div className="flex items-center gap-3">
                        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center",
                            doctorMode ? "bg-blue-50" : "bg-violet-50")}>
                            {doctorMode
                                ? <Stethoscope className="w-4 h-4 text-blue-600" />
                                : <ShieldCheck className="w-4 h-4 text-violet-600" />}
                        </div>
                        <div>
                            <h2 className="font-bold text-base">{doctorMode ? "Add Doctor" : "Add Staff Member"}</h2>
                            <p className="text-xs text-muted-foreground">
                                {doctorMode ? "Create a new doctor account" : "Create a new clinic account"}
                            </p>
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
                                <CheckCircle2 className="w-4 h-4 shrink-0" />{doctorMode ? "Doctor added!" : "Staff member added!"}
                            </div>
                        )}

                        <Field label="Full Name" required error={errors.full_name}>
                            <Input className={cn("rounded-xl", errors.full_name && "border-red-400")}
                                placeholder={doctorMode ? "Dr. Full Name" : "Full Name"} value={form.full_name} onChange={set("full_name")} />
                        </Field>

                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Email" required error={errors.email}>
                                <Input type="email" className={cn("rounded-xl", errors.email && "border-red-400")}
                                    placeholder="doctor@clinic.com" value={form.email} onChange={set("email")} />
                            </Field>
                            <Field label="Phone" error={errors.phone}>
                                <PhoneInput
                                    value={form.phone}
                                    onChange={v => { setForm(prev => ({ ...prev, phone: v })); setErrors(prev => { const n = { ...prev }; delete n.phone; return n; }); }}
                                    error={errors.phone}
                                />
                            </Field>
                        </div>

                        {!doctorMode && (
                            <Field label="Role" required error={errors.role}>
                                <Select value={form.role} onValueChange={v => { setForm(prev => ({...prev, role: v})); setErrors(prev => { const n = {...prev}; delete n.role; return n; }); }}>
                                    <SelectTrigger className={cn("w-full h-10 rounded-xl text-sm", errors.role && "border-red-400")}>
                                        <SelectValue placeholder="Select role…" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        {ROLES.map(r => <SelectItem key={r.value} value={r.value} className="rounded-lg">{r.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </Field>
                        )}

                        {isDoctor && (
                            <Field label="Specialty" error={errors.specialty}>
                                <Input className="rounded-xl"
                                    placeholder="e.g. Physiotherapy, Sports Rehab…"
                                    value={form.specialty} onChange={set("specialty")} />
                            </Field>
                        )}

                        {isDoctor && (
                            <Field label="Bio" error={errors.bio}>
                                <textarea
                                    rows={2}
                                    className="w-full rounded-xl border border-input bg-background text-sm px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                                    placeholder="Short description (optional)"
                                    value={form.bio}
                                    onChange={set("bio")}
                                />
                            </Field>
                        )}

                        <Field label="Temporary Password" required error={errors.password}>
                            <div className="relative">
                                <Input type={showPw ? "text" : "password"}
                                    className={cn("pr-10 rounded-xl", errors.password && "border-red-400")}
                                    placeholder="Min 8 characters" value={form.password} onChange={set("password")} />
                                <button type="button" onClick={() => setShowPw(v => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </Field>
                    </div>

                    <div className="px-6 py-4 border-t border-border/60 flex items-center justify-end gap-3">
                        <Button type="button" variant="outline" onClick={reset} className="rounded-xl">Cancel</Button>
                        <Button type="submit" disabled={loading || success} className="rounded-xl gap-2 min-w-[120px]">
                            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Adding…</> :
                                success ? <><CheckCircle2 className="w-4 h-4" />Added!</> :
                                    doctorMode ? "Add Doctor" : "Add Staff"}
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
