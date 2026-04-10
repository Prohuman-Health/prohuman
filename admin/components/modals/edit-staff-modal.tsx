"use client";

import { useState, useEffect } from "react";
import { X, Loader2, ShieldCheck, AlertCircle, CheckCircle2, KeyRound, ChevronDown, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput, validatePhone } from "@/components/ui/phone-input";
import { cn } from "@/lib/utils";
import { useStaff } from "@/lib/contexts/staff-context";
import { staffApi, StaffMember } from "@/lib/api";

interface Props {
    staff: StaffMember | null;
    onClose: () => void;
}

const ROLES = [
    { value: "admin", label: "Admin" },
    { value: "receptionist", label: "Receptionist" },
    { value: "doctor", label: "Doctor / Physiotherapist" },
] as const;

type RoleValue = typeof ROLES[number]["value"];

export function EditStaffModal({ staff, onClose }: Props) {
    const { refresh } = useStaff();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [apiError, setApiError] = useState<string | null>(null);

    const [form, setForm] = useState({
        full_name: "",
        phone: "",
        role: "doctor" as RoleValue,
        is_active: true,
    });

    // Password change state
    const [pwOpen, setPwOpen] = useState(false);
    const [pw, setPw] = useState({ password: "", confirm: "" });
    const [pwShow, setPwShow] = useState({ password: false, confirm: false });
    const [pwLoading, setPwLoading] = useState(false);
    const [pwSuccess, setPwSuccess] = useState(false);
    const [pwError, setPwError] = useState<string | null>(null);
    const [pwFieldErrors, setPwFieldErrors] = useState<Record<string, string>>({});

    // Populate form when modal opens with a staff member
    useEffect(() => {
        if (staff) {
            setForm({
                full_name: staff.full_name,
                phone: staff.phone ?? "",
                role: (staff.role as RoleValue) ?? "doctor",
                is_active: staff.is_active,
            });
            setErrors({});
            setApiError(null);
            setSuccess(false);
            setPwOpen(false);
            setPw({ password: "", confirm: "" });
            setPwError(null);
            setPwSuccess(false);
            setPwFieldErrors({});
        }
    }, [staff]);

    function setField<K extends keyof typeof form>(k: K, v: typeof form[K]) {
        setForm(prev => ({ ...prev, [k]: v }));
        setErrors(prev => { const n = { ...prev }; delete n[k as string]; return n; });
    }

    function validate(): boolean {
        const errs: Record<string, string> = {};
        if (!form.full_name.trim()) errs.full_name = "Full name is required";
        if (form.phone) {
            const phoneErr = validatePhone(form.phone);
            if (phoneErr) errs.phone = phoneErr;
        }
        if (!form.role) errs.role = "Role is required";
        setErrors(errs);
        return Object.keys(errs).length === 0;
    }

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!staff || !validate()) return;
        setLoading(true); setApiError(null);
        try {
            await staffApi.update(staff.id, {
                full_name: form.full_name.trim(),
                phone: form.phone || null,
                role: form.role,
                is_active: form.is_active,
            });
            await refresh();
            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                onClose();
            }, 1200);
        } catch (err: unknown) {
            setApiError(err instanceof Error ? err.message : "Failed to update staff");
        } finally { setLoading(false); }
    }

    function validatePassword(): boolean {
        const errs: Record<string, string> = {};
        if (!pw.password) errs.password = "Password is required";
        else if (pw.password.length < 8) errs.password = "Must be at least 8 characters";
        if (!pw.confirm) errs.confirm = "Please confirm the password";
        else if (pw.password !== pw.confirm) errs.confirm = "Passwords do not match";
        setPwFieldErrors(errs);
        return Object.keys(errs).length === 0;
    }

    async function submitPassword(e: React.FormEvent) {
        e.preventDefault();
        if (!staff || !validatePassword()) return;
        setPwLoading(true); setPwError(null);
        try {
            await staffApi.setPassword(staff.id, pw.password);
            setPwSuccess(true);
            setPw({ password: "", confirm: "" });
            setTimeout(() => setPwSuccess(false), 3000);
        } catch (err: unknown) {
            setPwError(err instanceof Error ? err.message : "Failed to update password");
        } finally { setPwLoading(false); }
    }

    if (!staff) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-border/60">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                            <ShieldCheck className="w-4 h-4 text-amber-600" />
                        </div>
                        <div>
                            <h2 className="font-bold text-base">Edit Staff</h2>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{staff.email}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="max-h-[80vh] overflow-y-auto">
                    {/* Profile form */}
                    <form onSubmit={submit} noValidate>
                        <div className="px-6 py-5 space-y-4">
                            {apiError && (
                                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-sm text-red-700">
                                    <AlertCircle className="w-4 h-4 shrink-0" />{apiError}
                                </div>
                            )}
                            {success && (
                                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5 text-sm text-emerald-700">
                                    <CheckCircle2 className="w-4 h-4 shrink-0" />Staff member updated!
                                </div>
                            )}

                            {/* Full Name */}
                            <Field label="Full Name" required error={errors.full_name}>
                                <Input
                                    className={cn("rounded-xl", errors.full_name && "border-red-400")}
                                    value={form.full_name}
                                    onChange={e => setField("full_name", e.target.value)}
                                    placeholder="Full Name"
                                />
                            </Field>

                            {/* Phone */}
                            <Field label="Phone" error={errors.phone}>
                                <PhoneInput
                                    value={form.phone}
                                    onChange={v => setField("phone", v)}
                                    error={errors.phone}
                                />
                            </Field>

                            {/* Role */}
                            <Field label="Role" required error={errors.role}>
                                <select
                                    value={form.role}
                                    onChange={e => setField("role", e.target.value as RoleValue)}
                                    className={cn(
                                        "w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none appearance-none",
                                        errors.role && "border-red-400"
                                    )}
                                >
                                    {ROLES.map(r => (
                                        <option key={r.value} value={r.value}>{r.label}</option>
                                    ))}
                                </select>
                            </Field>

                            {/* Active toggle */}
                            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3">
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold">Account Status</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {form.is_active ? "Staff member can log in and access the system" : "Account is disabled — staff cannot log in"}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setField("is_active", !form.is_active)}
                                    className={cn(
                                        "relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ml-4 focus:outline-none",
                                        form.is_active ? "bg-emerald-500" : "bg-muted-foreground/30"
                                    )}
                                >
                                    <span className={cn(
                                        "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200",
                                        form.is_active ? "translate-x-5" : "translate-x-0"
                                    )} />
                                </button>
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-border/60 flex items-center justify-end gap-3">
                            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">Cancel</Button>
                            <Button type="submit" disabled={loading || success} className="rounded-xl gap-2 min-w-[130px]">
                                {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> :
                                    success ? <><CheckCircle2 className="w-4 h-4" />Saved!</> :
                                        "Save Changes"}
                            </Button>
                        </div>
                    </form>

                    {/* Change Password section */}
                    <div className="border-t border-border/60">
                        <button
                            type="button"
                            onClick={() => { setPwOpen(v => !v); setPwError(null); setPwFieldErrors({}); setPw({ password: "", confirm: "" }); }}
                            className="w-full flex items-center justify-between px-6 py-4 text-sm font-semibold hover:bg-muted/30 transition-colors"
                        >
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
                                    <KeyRound className="w-3.5 h-3.5 text-violet-600" />
                                </div>
                                <span>Change Password</span>
                            </div>
                            <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", pwOpen && "rotate-180")} />
                        </button>

                        {pwOpen && (
                            <form onSubmit={submitPassword} noValidate className="px-6 pb-5 space-y-4">
                                {pwError && (
                                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-sm text-red-700">
                                        <AlertCircle className="w-4 h-4 shrink-0" />{pwError}
                                    </div>
                                )}
                                {pwSuccess && (
                                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5 text-sm text-emerald-700">
                                        <CheckCircle2 className="w-4 h-4 shrink-0" />Password updated successfully!
                                    </div>
                                )}

                                <Field label="New Password" required error={pwFieldErrors.password}>
                                    <div className="relative">
                                        <Input
                                            type={pwShow.password ? "text" : "password"}
                                            className={cn("rounded-xl pr-10", pwFieldErrors.password && "border-red-400")}
                                            value={pw.password}
                                            onChange={e => { setPw(p => ({ ...p, password: e.target.value })); setPwFieldErrors(p => { const n = { ...p }; delete n.password; return n; }); }}
                                            placeholder="Min. 8 characters"
                                            autoComplete="new-password"
                                        />
                                        <button type="button" onClick={() => setPwShow(s => ({ ...s, password: !s.password }))}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                                            {pwShow.password ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </Field>

                                <Field label="Confirm Password" required error={pwFieldErrors.confirm}>
                                    <div className="relative">
                                        <Input
                                            type={pwShow.confirm ? "text" : "password"}
                                            className={cn("rounded-xl pr-10", pwFieldErrors.confirm && "border-red-400")}
                                            value={pw.confirm}
                                            onChange={e => { setPw(p => ({ ...p, confirm: e.target.value })); setPwFieldErrors(p => { const n = { ...p }; delete n.confirm; return n; }); }}
                                            placeholder="Re-enter new password"
                                            autoComplete="new-password"
                                        />
                                        <button type="button" onClick={() => setPwShow(s => ({ ...s, confirm: !s.confirm }))}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                                            {pwShow.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </Field>

                                <div className="flex justify-end">
                                    <Button type="submit" disabled={pwLoading || pwSuccess} size="sm" className="rounded-xl gap-2 min-w-[140px]">
                                        {pwLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Updating…</> :
                                            pwSuccess ? <><CheckCircle2 className="w-3.5 h-3.5" />Updated!</> :
                                                "Update Password"}
                                    </Button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
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
