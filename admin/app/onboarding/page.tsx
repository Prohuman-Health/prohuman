"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { onboarding } from "@/lib/api";
import {
    Building2, MapPin, Clock, Dumbbell, CheckCircle2,
    ChevronRight, ChevronLeft, Loader2, Plus, X, Stethoscope,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const DEFAULT_HOURS = Object.fromEntries(
    DAYS.map((d) => [d, { open: d === "Sunday" ? false : true, from: "09:00", to: "18:00" }])
);

const PRESET_SESSION_TYPES = [
    { name: "Initial Consultation", description: "First assessment and evaluation", duration_minutes: 60, fee: 1500 },
    { name: "Physiotherapy Session", description: "Hands-on therapy and exercise", duration_minutes: 45, fee: 1000 },
    { name: "Home Visit", description: "Treatment at patient's home", duration_minutes: 60, fee: 2000 },
    { name: "Group Session", description: "Group rehabilitation class", duration_minutes: 60, fee: 600 },
    { name: "Fitness Training", description: "Fitness and conditioning session", duration_minutes: 45, fee: 800 },
    { name: "Follow-Up", description: "Progress review and adjustment", duration_minutes: 30, fee: 700 },
];

interface SessionType {
    name: string;
    description: string;
    duration_minutes: number;
    fee: number;
}

const STEPS = [
    { id: "clinic", icon: Building2, label: "Your Clinic" },
    { id: "location", icon: MapPin, label: "Location" },
    { id: "hours", icon: Clock, label: "Hours" },
    { id: "services", icon: Dumbbell, label: "Services" },
    { id: "done", icon: CheckCircle2, label: "Done" },
];

// ── Main Component ────────────────────────────────────────────────────────────
export default function OnboardingPage() {
    const { user } = useAuth();
    const router = useRouter();

    const [step, setStep] = useState(0);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [clinicName, setClinicName] = useState("");
    const [timezone, setTimezone] = useState("Asia/Kolkata");
    const [address, setAddress] = useState("");
    const [city, setCity] = useState("");
    const [pincode, setPincode] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [hours, setHours] = useState<Record<string, { open: boolean; from: string; to: string }>>(DEFAULT_HOURS);
    const [sessionTypes, setSessionTypes] = useState<SessionType[]>([
        PRESET_SESSION_TYPES[0],
        PRESET_SESSION_TYPES[1],
    ]);
    const [customName, setCustomName] = useState("");
    const [customDuration, setCustomDuration] = useState(60);
    const [customFee, setCustomFee] = useState(0);

    // Pre-fill email from user
    useEffect(() => {
        if (user?.email) setEmail(user.email);
    }, [user]);

    const togglePreset = (st: typeof PRESET_SESSION_TYPES[0]) => {
        setSessionTypes((prev) =>
            prev.some((s) => s.name === st.name)
                ? prev.filter((s) => s.name !== st.name)
                : [...prev, { ...st }]
        );
    };

    const addCustom = () => {
        if (!customName.trim()) return;
        setSessionTypes((prev) => [...prev, { name: customName, description: "", duration_minutes: customDuration, fee: customFee }]);
        setCustomName("");
        setCustomDuration(60);
        setCustomFee(0);
    };

    const canNext = () => {
        if (step === 0) return clinicName.trim().length >= 2;
        if (step === 1) return address.trim().length >= 5 && city.trim().length >= 2;
        return true;
    };

    const handleComplete = async () => {
        setSaving(true);
        setError(null);
        try {
            await onboarding.complete({
                clinic: { name: clinicName, timezone },
                branch: {
                    address: `${address}, ${city}${pincode ? " - " + pincode : ""}`,
                    phone, email, operating_hours: hours,
                },
                session_types: sessionTypes,
            });
            setStep(4); // done screen
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0A0E28] flex flex-col">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#2493A2] flex items-center justify-center">
                        <span className="text-white font-bold text-sm">P</span>
                    </div>
                    <span className="text-white font-semibold text-sm">ProHuman Health</span>
                </div>
                {user && (
                    <p className="text-white/30 text-xs hidden sm:block">
                        Welcome, {user.full_name?.split(" ")[0]} 👋
                    </p>
                )}
            </header>

            {/* Step progress bar */}
            <div className="px-6 pt-6 pb-2 max-w-2xl mx-auto w-full">
                <div className="flex items-center gap-0">
                    {STEPS.map((s, i) => {
                        const Icon = s.icon;
                        const done = i < step;
                        const active = i === step;
                        return (
                            <div key={s.id} className="flex items-center flex-1">
                                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300
                  ${done ? "bg-[#2493A2]" : active ? "bg-[#2493A2]/20 border-2 border-[#2493A2]" : "bg-white/5 border border-white/10"}
                `}>
                                    {done ? (
                                        <CheckCircle2 className="w-4 h-4 text-white" />
                                    ) : (
                                        <Icon className={`w-4 h-4 ${active ? "text-[#2493A2]" : "text-white/20"}`} />
                                    )}
                                </div>
                                {i < STEPS.length - 1 && (
                                    <div className={`flex-1 h-0.5 mx-1 transition-all duration-500 ${done ? "bg-[#2493A2]" : "bg-white/10"}`} />
                                )}
                            </div>
                        );
                    })}
                </div>
                <div className="mt-3 flex items-center justify-between">
                    <p className="text-white font-semibold text-lg">{STEPS[step]?.label}</p>
                    <p className="text-white/30 text-xs">Step {Math.min(step + 1, 5)} of 5</p>
                </div>
            </div>

            {/* Step content */}
            <div className="flex-1 flex items-start justify-center px-4 py-6">
                <div className="w-full max-w-2xl">

                    {/* ── STEP 0: Clinic Identity ─── */}
                    {step === 0 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div>
                                <h2 className="text-2xl font-bold text-white">What's your clinic called?</h2>
                                <p className="text-white/40 mt-1 text-sm">This will appear on reports, invoices, and patient communications.</p>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-white/50 text-xs font-medium uppercase tracking-wider">Clinic Name *</label>
                                    <input
                                        value={clinicName}
                                        onChange={e => setClinicName(e.target.value)}
                                        placeholder="e.g. ProHuman Physiotherapy Centre"
                                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 text-sm focus:outline-none focus:border-[#2493A2] transition-colors"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-white/50 text-xs font-medium uppercase tracking-wider">Timezone</label>
                                    <select
                                        value={timezone}
                                        onChange={e => setTimezone(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#2493A2] transition-colors"
                                    >
                                        <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                                        <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                                        <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                                        <option value="Europe/London">Europe/London (GMT)</option>
                                        <option value="America/New_York">America/New_York (ET)</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── STEP 1: Location ─── */}
                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div>
                                <h2 className="text-2xl font-bold text-white">Where is <span className="text-[#2493A2]">{clinicName}</span> located?</h2>
                                <p className="text-white/40 mt-1 text-sm">Patients and staff will see this address in confirmations and invoices.</p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {[
                                    { label: "Street Address *", value: address, set: setAddress, placeholder: "123, MG Road", span: "sm:col-span-2" },
                                    { label: "City *", value: city, set: setCity, placeholder: "Mumbai" },
                                    { label: "PIN Code", value: pincode, set: setPincode, placeholder: "400001" },
                                    { label: "Phone", value: phone, set: setPhone, placeholder: "+91 98765 43210" },
                                    { label: "Email", value: email, set: setEmail, placeholder: "clinic@example.com" },
                                ].map(({ label, value, set, placeholder, span }) => (
                                    <div key={label} className={`space-y-1.5 ${span ?? ""}`}>
                                        <label className="text-white/50 text-xs font-medium uppercase tracking-wider">{label}</label>
                                        <input
                                            value={value}
                                            onChange={e => set(e.target.value)}
                                            placeholder={placeholder}
                                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 text-sm focus:outline-none focus:border-[#2493A2] transition-colors"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── STEP 2: Hours ─── */}
                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div>
                                <h2 className="text-2xl font-bold text-white">Operating Hours</h2>
                                <p className="text-white/40 mt-1 text-sm">Set when your clinic is open. You can adjust these later in Settings.</p>
                            </div>
                            <div className="space-y-2">
                                {DAYS.map((day) => {
                                    const h = hours[day];
                                    return (
                                        <div key={day} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/3 border border-white/8">
                                            {/* Toggle */}
                                            <button
                                                onClick={() => setHours(prev => ({ ...prev, [day]: { ...prev[day], open: !prev[day].open } }))}
                                                className={`w-10 h-5 rounded-full transition-all shrink-0 relative ${h.open ? "bg-[#2493A2]" : "bg-white/10"}`}
                                            >
                                                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${h.open ? "left-5" : "left-0.5"}`} />
                                            </button>
                                            {/* Day */}
                                            <span className={`text-sm font-medium w-24 shrink-0 ${h.open ? "text-white" : "text-white/30"}`}>{day}</span>
                                            {/* Times */}
                                            {h.open ? (
                                                <div className="flex items-center gap-2 flex-1">
                                                    <input type="time" value={h.from}
                                                        onChange={e => setHours(prev => ({ ...prev, [day]: { ...prev[day], from: e.target.value } }))}
                                                        className="flex-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-[#2493A2] transition-colors"
                                                    />
                                                    <span className="text-white/30 text-xs">to</span>
                                                    <input type="time" value={h.to}
                                                        onChange={e => setHours(prev => ({ ...prev, [day]: { ...prev[day], to: e.target.value } }))}
                                                        className="flex-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-[#2493A2] transition-colors"
                                                    />
                                                </div>
                                            ) : (
                                                <span className="text-white/20 text-xs flex-1">Closed</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ── STEP 3: Session Types ─── */}
                    {step === 3 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div>
                                <h2 className="text-2xl font-bold text-white">Services you offer</h2>
                                <p className="text-white/40 mt-1 text-sm">Select the session types for your clinic. You can always add more later.</p>
                            </div>

                            {/* Presets */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {PRESET_SESSION_TYPES.map((st) => {
                                    const selected = sessionTypes.some(s => s.name === st.name);
                                    return (
                                        <button key={st.name} onClick={() => togglePreset(st)}
                                            className={`text-left px-4 py-3 rounded-xl border transition-all duration-200 ${selected
                                                ? "bg-[#2493A2]/10 border-[#2493A2] text-white"
                                                : "bg-white/3 border-white/10 text-white/60 hover:border-white/20 hover:text-white"
                                                }`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">{st.name}</p>
                                                    <p className="text-xs mt-0.5 opacity-60 truncate">{st.description}</p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-xs font-semibold text-[#DCB13C]">₹{st.fee}</p>
                                                    <p className="text-[10px] opacity-40">{st.duration_minutes}min</p>
                                                </div>
                                            </div>
                                            {selected && <div className="mt-2 flex items-center gap-1 text-[#2493A2] text-[10px] font-medium"><CheckCircle2 className="w-3 h-3" />Added</div>}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Custom type */}
                            <div className="border border-dashed border-white/10 rounded-xl p-4 space-y-3">
                                <p className="text-white/50 text-xs font-medium uppercase tracking-wider">Add Custom Service</p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <input value={customName} onChange={e => setCustomName(e.target.value)}
                                        placeholder="Service name"
                                        className="sm:col-span-3 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/20 text-sm focus:outline-none focus:border-[#2493A2] transition-colors"
                                    />
                                    <div className="space-y-1">
                                        <label className="text-white/30 text-[10px]">Duration (min)</label>
                                        <input type="number" value={customDuration} onChange={e => setCustomDuration(Number(e.target.value))}
                                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#2493A2] transition-colors"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-white/30 text-[10px]">Fee (₹)</label>
                                        <input type="number" value={customFee} onChange={e => setCustomFee(Number(e.target.value))}
                                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#2493A2] transition-colors"
                                        />
                                    </div>
                                    <button onClick={addCustom}
                                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#2493A2]/20 hover:bg-[#2493A2]/30 text-[#57BDA2] text-sm font-medium transition-colors self-end"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Add
                                    </button>
                                </div>
                            </div>

                            {/* Selected badges */}
                            {sessionTypes.length > 0 && (
                                <div>
                                    <p className="text-white/40 text-xs mb-2">{sessionTypes.length} service{sessionTypes.length !== 1 ? "s" : ""} selected</p>
                                    <div className="flex flex-wrap gap-2">
                                        {sessionTypes.map(st => (
                                            <span key={st.name} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2493A2]/10 border border-[#2493A2]/30 text-[#57BDA2] text-xs font-medium">
                                                {st.name}
                                                <button onClick={() => setSessionTypes(p => p.filter(s => s.name !== st.name))}>
                                                    <X className="w-3 h-3 opacity-60 hover:opacity-100" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
                            )}
                        </div>
                    )}

                    {/* ── STEP 4: Done ─── */}
                    {step === 4 && (
                        <div className="flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in zoom-in-95 duration-500 py-8">
                            <div className="w-20 h-20 rounded-full bg-[#2493A2]/10 border-2 border-[#2493A2] flex items-center justify-center">
                                <Stethoscope className="w-9 h-9 text-[#2493A2]" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-bold text-white">You're all set! 🎉</h2>
                                <p className="text-white/40 mt-2 text-sm max-w-md">
                                    <span className="text-[#2493A2] font-semibold">{clinicName}</span> is ready. Your branch, operating hours, and session types have been saved.
                                </p>
                            </div>
                            <div className="grid grid-cols-3 gap-4 w-full max-w-xs">
                                {[
                                    { label: "Branch", value: "1" },
                                    { label: "Services", value: String(sessionTypes.length) },
                                    { label: "Staff", value: "1" },
                                ].map(({ label, value }) => (
                                    <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                                        <p className="text-2xl font-bold text-white">{value}</p>
                                        <p className="text-[11px] text-white/40 mt-1">{label}</p>
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={() => router.replace("/dashboard")}
                                className="flex items-center gap-2 px-8 py-3 rounded-xl bg-[#2493A2] hover:bg-[#1d7a87] text-white font-semibold transition-all shadow-lg shadow-[#2493A2]/20"
                            >
                                Go to Dashboard <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {/* Navigation buttons */}
                    {step < 4 && (
                        <div className="flex items-center justify-between mt-8">
                            <button
                                onClick={() => setStep(s => Math.max(0, s - 1))}
                                disabled={step === 0}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 text-white/50 hover:text-white hover:border-white/20 text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft className="w-4 h-4" /> Back
                            </button>

                            {step < 3 ? (
                                <button
                                    onClick={() => canNext() && setStep(s => s + 1)}
                                    disabled={!canNext()}
                                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#2493A2] hover:bg-[#1d7a87] text-white text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-[#2493A2]/20"
                                >
                                    Continue <ChevronRight className="w-4 h-4" />
                                </button>
                            ) : (
                                <button
                                    onClick={handleComplete}
                                    disabled={saving || sessionTypes.length === 0}
                                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#2493A2] hover:bg-[#1d7a87] text-white text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-[#2493A2]/20"
                                >
                                    {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <>Finish Setup <CheckCircle2 className="w-4 h-4" /></>}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
