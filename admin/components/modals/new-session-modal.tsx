"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, CalendarDays, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { usePatients } from "@/lib/contexts/patients-context";
import { useSessions } from "@/lib/contexts/sessions-context";
import { useAuth } from "@/lib/auth-context";
import { sessionsApi, calendarApi, Branch, SessionType } from "@/lib/api";

interface Props {
    open: boolean;
    onClose: () => void;
    prefill?: { patientId?: string; doctorId?: string; date?: string; time?: string };
}

export function NewSessionModal({ open, onClose, prefill }: Props) {
    const { patients } = usePatients();
    const { refresh } = useSessions();
    const { user } = useAuth();

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [apiError, setApiError] = useState<string | null>(null);
    const [isClosedDay, setIsClosedDay] = useState(false);
    const [closedReason, setClosedReason] = useState<string | null>(null);
    const [availableDoctors, setAvailableDoctors] = useState<import("@/lib/api").Doctor[]>([]);
    const [doctorsLoading, setDoctorsLoading] = useState(false);
    const [sessionTypes, setSessionTypes] = useState<SessionType[]>([]);
    const [modalEl, setModalEl] = useState<HTMLDivElement | null>(null);

    // Branches — only loaded if user has no branch_id
    const [branches, setBranches] = useState<Branch[]>([]);
    const [branchesLoading, setBranchesLoading] = useState(false);

    const todayStr = new Date().toISOString().slice(0, 10);
    const [form, setForm] = useState({
        patient_id: prefill?.patientId ?? "",
        doctor_id: prefill?.doctorId ?? "",
        assisting_doctor_id: "",
        session_type_id: "",
        date: prefill?.date ?? todayStr,
        time: prefill?.time ?? "09:00",
        notes: "",
        branch_id: user?.branch_id ?? "",
    });

    // Single effect: fetch all booking-modal data in one round trip
    useEffect(() => {
        if (!open) return;
        // Reset UI state on open
        setErrors({}); setApiError(null); setSuccess(false);
        // Apply prefill values on each open
        setForm(prev => ({
            ...prev,
            patient_id: prefill?.patientId ?? prev.patient_id,
            doctor_id: prefill?.doctorId ?? "",
            assisting_doctor_id: "",
            date: prefill?.date ?? todayStr,
            time: prefill?.time ?? prev.time,
            branch_id: user?.branch_id ?? prev.branch_id,
        }));
    }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!open || !form.date) return;
        setDoctorsLoading(true);
        setBranchesLoading(true);
        calendarApi.dateInfo(form.date, form.branch_id || undefined)
            .then(info => {
                setAvailableDoctors(info.available_doctors);
                setIsClosedDay(info.is_closed);
                setClosedReason(info.closure_reason);
                setSessionTypes(info.session_types);
                if (!user?.branch_id) {
                    setBranches(info.branches);
                    if (info.branches.length === 1) {
                        setForm(prev => ({ ...prev, branch_id: info.branches[0].id }));
                    }
                }
                // Clear doctor selections since availability may have changed
                setForm(prev => ({ ...prev, doctor_id: "", assisting_doctor_id: "" }));
            })
            .catch(() => {
                setAvailableDoctors([]);
                setIsClosedDay(false);
                setClosedReason(null);
            })
            .finally(() => { setDoctorsLoading(false); setBranchesLoading(false); });
    }, [open, form.date, form.branch_id]); // eslint-disable-line react-hooks/exhaustive-deps

    const set = (k: keyof typeof form) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
            setForm(prev => ({ ...prev, [k]: e.target.value }));
            setErrors(prev => { const n = { ...prev }; delete n[k]; return n; });
        };

    const setVal = (k: keyof typeof form) => (v: string) => {
        setForm(prev => ({ ...prev, [k]: v }));
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
        if (isClosedDay) errs.date = "Clinic is closed on selected date";
        if (form.date && form.time) {
            const selectedDateTime = new Date(`${form.date}T${form.time}:00`);
            if (Number.isNaN(selectedDateTime.getTime())) {
                errs.time = "Invalid date/time";
            } else if (selectedDateTime <= new Date()) {
                errs.time = "Session cannot be scheduled in the past";
            }
        }
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
                ...(form.assisting_doctor_id ? { assisting_doctor_id: form.assisting_doctor_id } : {}),
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
                setForm({ patient_id: "", doctor_id: "", assisting_doctor_id: "", session_type_id: "", date: todayStr, time: "09:00", notes: "", branch_id: user?.branch_id ?? "" });
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

    return createPortal(
        <div ref={setModalEl} className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
                                    <Select value={form.branch_id} onValueChange={setVal("branch_id")}>
                                        <SelectTrigger className={cn("w-full h-10 rounded-xl text-sm", errors.branch_id && "border-red-400")}>
                                            <SelectValue placeholder="Select branch…" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl" container={modalEl}>
                                            {branches.map(b => <SelectItem key={b.id} value={b.id} className="rounded-lg">{b.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                )}
                            </Field>
                        )}

                        <Field label="Patient" required error={errors.patient_id}>
                            <Select value={form.patient_id} onValueChange={setVal("patient_id")}>
                                <SelectTrigger className={cn("w-full h-10 rounded-xl text-sm", errors.patient_id && "border-red-400")}>
                                    <SelectValue placeholder="Select patient…" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl" container={modalEl}>
                                    {patients.map(p => <SelectItem key={p.id} value={p.id} className="rounded-lg">{p.full_name} ({p.patient_code})</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </Field>

                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Doctor" required error={errors.doctor_id}>
                                <Select value={form.doctor_id} onValueChange={setVal("doctor_id")} disabled={doctorsLoading || !form.date}>
                                    <SelectTrigger className={cn("w-full h-10 rounded-xl text-sm", errors.doctor_id && "border-red-400")}>
                                        <SelectValue placeholder={doctorsLoading ? "Loading…" : !form.date ? "Pick a date first" : "Select doctor…"} />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl" container={modalEl}>
                                        {availableDoctors.map(d => <SelectItem key={d.id} value={d.id} className="rounded-lg">{d.full_name}{d.specialty ? ` — ${d.specialty}` : ""}</SelectItem>)}
                                        {!doctorsLoading && availableDoctors.length === 0 && (
                                            <div className="px-3 py-2 text-xs text-gray-400 text-center">No available doctors on this date</div>
                                        )}
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field label="Assisting Doctor">
                                <Select value={form.assisting_doctor_id} onValueChange={setVal("assisting_doctor_id")} disabled={doctorsLoading || !form.date}>
                                    <SelectTrigger className="w-full h-10 rounded-xl text-sm">
                                        <SelectValue placeholder="None" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl" container={modalEl}>
                                        {availableDoctors.filter(d => d.id !== form.doctor_id).map(d => <SelectItem key={d.id} value={d.id} className="rounded-lg">{d.full_name}{d.specialty ? ` — ${d.specialty}` : ""}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </Field>
                        </div>

                        <Field label="Session Type" required error={errors.session_type_id}>
                            <Select value={form.session_type_id} onValueChange={setVal("session_type_id")}>
                                <SelectTrigger className={cn("w-full h-10 rounded-xl text-sm", errors.session_type_id && "border-red-400")}>
                                    <SelectValue placeholder="Select type…" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl" container={modalEl}>
                                    {sessionTypes.map(t => <SelectItem key={t.id} value={t.id} className="rounded-lg">{t.name} ({t.default_duration_minutes} min · ₹{t.fee})</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </Field>

                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Date" required error={errors.date}>
                                <div className="relative">
                                    <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                                    <Input type="date" className={cn("pl-9 rounded-xl", errors.date && "border-red-400")}
                                        value={form.date} onChange={set("date")} />
                                </div>
                                {isClosedDay && (
                                    <p className="text-[11px] text-red-600 mt-1">Clinic closed: {closedReason || "No reason provided"}</p>
                                )}
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
        </div>,
        document.body
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
