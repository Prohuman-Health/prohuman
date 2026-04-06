"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, Lock, Globe, Database, Save, Loader2, Building2, Phone, Mail, MapPin, Clock, IndianRupee, RefreshCw, Plus, Trash2, Pencil, X, Tag, Download, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { settingsApi, Setting, patientsApi, staffApi, sessionsApi, patientLabelsApi, PatientLabel } from "@/lib/api";

type Tab = "clinic" | "notifications" | "security" | "locale" | "data" | "labels";

const TABS: { id: Tab; label: string; icon: React.ElementType; color: string }[] = [
    { id: "clinic", label: "Clinic Profile", icon: Building2, color: "bg-violet-100 text-violet-700" },
    { id: "notifications", label: "Notifications", icon: Bell, color: "bg-amber-100 text-amber-700" },
    { id: "security", label: "Security & Access", icon: Lock, color: "bg-red-100 text-red-700" },
    { id: "locale", label: "Timezone & Locale", icon: Globe, color: "bg-blue-100 text-blue-700" },
    { id: "labels", label: "Patient Labels", icon: Tag, color: "bg-pink-100 text-pink-700" },
    { id: "data", label: "Data & Backups", icon: Database, color: "bg-emerald-100 text-emerald-700" },
];

const TIMEZONES = ["Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Europe/London", "America/New_York", "America/Los_Angeles"];
const DATE_FORMATS = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"];

function Skeleton({ className }: { className?: string }) {
    return <div className={cn("animate-pulse bg-muted rounded-xl", className)} />;
}

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<Tab>("clinic");
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const list: Setting[] = await settingsApi.list();
            const map: Record<string, string> = {};
            list.forEach(s => { map[s.key] = String(s.value ?? ""); });
            setSettings(map);
        } catch { /* use defaults */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
        setSettings(prev => ({ ...prev, [k]: e.target.value }));

    async function save() {
        setSaving(true);
        try {
            await Promise.all(Object.entries(settings).map(([k, v]) => settingsApi.upsert(k, v)));
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch { /* silently ignore */ }
        finally { setSaving(false); }
    }

    const get = (k: string, fallback = "") => settings[k] ?? fallback;

    return (
        <div className="flex flex-col lg:flex-row h-full gap-4 p-4 md:p-5 overflow-auto lg:overflow-hidden">
            {/* Sidebar tabs */}
            <div className="w-full lg:w-56 shrink-0 flex flex-col gap-1">
                <div className="flex items-center justify-between mb-2">
                    <h1 className="text-xl font-bold tracking-tight">Settings</h1>
                    <button onClick={load} className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80">
                        <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                    </button>
                </div>
                {TABS.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={cn("flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all text-left",
                            activeTab === tab.id ? "bg-foreground text-white" : "bg-white text-muted-foreground hover:bg-muted hover:text-foreground")}>
                        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                            activeTab === tab.id ? "bg-white/10" : tab.color)}>
                            <tab.icon className="w-3.5 h-3.5" />
                        </div>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Main content */}
            <div className="flex-1 bg-white rounded-2xl flex flex-col overflow-hidden">
                {loading ? (
                    <div className="p-6 space-y-4">
                        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
                    </div>
                ) : (
                    <>
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* ── Clinic Profile ─────────────────────────── */}
                            {activeTab === "clinic" && (
                                <Section title="Clinic Profile" desc="Your clinic's basic information displayed to staff and in reports.">
                                    <Row label="Clinic Name" icon={Building2}>
                                        <Input className="rounded-xl" value={get("clinic_name")} onChange={set("clinic_name")} placeholder="ProHuman Health Clinic" />
                                    </Row>
                                    <Row label="Phone Number" icon={Phone}>
                                        <Input className="rounded-xl" value={get("clinic_phone")} onChange={set("clinic_phone")} placeholder="+91 98765 43210" />
                                    </Row>
                                    <Row label="Email Address" icon={Mail}>
                                        <Input type="email" className="rounded-xl" value={get("clinic_email")} onChange={set("clinic_email")} placeholder="hello@prohuman.in" />
                                    </Row>
                                    <Row label="Address" icon={MapPin}>
                                        <textarea rows={2} value={get("clinic_address")} onChange={set("clinic_address")}
                                            placeholder="123 Health Street, Mumbai 400001"
                                            className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground" />
                                    </Row>
                                    <Row label="Working Hours" icon={Clock}>
                                        <WorkingHoursEditor
                                            value={get("working_hours", '[{"start":"09:00","end":"18:00"}]')}
                                            onChange={v => setSettings(prev => ({ ...prev, working_hours: v }))}
                                        />
                                    </Row>
                                </Section>
                            )}

                            {/* ── Notifications ───────────────────────────── */}
                            {activeTab === "notifications" && (
                                <Section title="Notifications" desc="Control when and how the system sends alerts to staff and patients.">
                                    {[
                                        { key: "notify_new_patient", label: "New patient registered", desc: "Alert admin when a new patient is created" },
                                        { key: "notify_session_scheduled", label: "Session scheduled", desc: "Alert doctor when a session is booked" },
                                        { key: "notify_session_cancelled", label: "Session cancelled", desc: "Alert relevant parties on cancellation" },
                                        { key: "notify_no_show", label: "No-show alert", desc: "Flag sessions where patient didn't attend" },
                                        { key: "notify_payment_pending", label: "Pending payment", desc: "Alert when a session payment is overdue" },
                                    ].map(item => (
                                        <div key={item.key} className="flex items-center justify-between py-3 border-b border-border/60 last:border-0">
                                            <div>
                                                <p className="text-sm font-medium">{item.label}</p>
                                                <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                                            </div>
                                            <button onClick={() => setSettings(prev => ({ ...prev, [item.key]: prev[item.key] === "true" ? "false" : "true" }))}
                                                className={cn("relative w-11 h-6 rounded-full transition-colors shrink-0",
                                                    get(item.key) === "true" ? "bg-foreground" : "bg-muted")}>
                                                <span className={cn("absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all",
                                                    get(item.key) === "true" ? "left-5" : "left-0.5")} />
                                            </button>
                                        </div>
                                    ))}
                                </Section>
                            )}

                            {/* ── Security ──────────────────────────────────── */}
                            {activeTab === "security" && (
                                <Section title="Security & Access" desc="Configure authentication and access control settings.">
                                    {[
                                        { key: "require_2fa", label: "Require 2-Factor Auth", desc: "All staff must use 2FA to login" },
                                        { key: "session_expiry_enabled", label: "Auto logout on inactivity", desc: "Log out staff after period of inactivity" },
                                        { key: "allow_google_login", label: "Allow Google SSO", desc: "Staff can sign in with Google" },
                                    ].map(item => (
                                        <div key={item.key} className="flex items-center justify-between py-3 border-b border-border/60 last:border-0">
                                            <div>
                                                <p className="text-sm font-medium">{item.label}</p>
                                                <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                                            </div>
                                            <button onClick={() => setSettings(prev => ({ ...prev, [item.key]: prev[item.key] === "true" ? "false" : "true" }))}
                                                className={cn("relative w-11 h-6 rounded-full transition-colors shrink-0",
                                                    get(item.key) === "true" ? "bg-foreground" : "bg-muted")}>
                                                <span className={cn("absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all",
                                                    get(item.key) === "true" ? "left-5" : "left-0.5")} />
                                            </button>
                                        </div>
                                    ))}
                                    <Row label="Session Timeout" icon={Clock}>
                                        <select
                                            value={get("session_timeout_minutes", "30")}
                                            onChange={set("session_timeout_minutes")}
                                            className="h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none appearance-none w-40">
                                            <option value="30">30 minutes</option>
                                            <option value="60">60 minutes</option>
                                            <option value="90">90 minutes</option>
                                        </select>
                                    </Row>
                                </Section>
                            )}

                            {/* ── Locale ─────────────────────────────────── */}
                            {activeTab === "locale" && (
                                <Section title="Timezone & Locale" desc="Set regional preferences for date formats and timezone.">
                                    <Row label="Timezone" icon={Globe}>
                                        <select value={get("timezone", "Asia/Kolkata")} onChange={set("timezone")}
                                            className="w-full max-w-xs h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none appearance-none">
                                            {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                                        </select>
                                    </Row>
                                    <Row label="Date Format" icon={Globe}>
                                        <select value={get("date_format", "DD/MM/YYYY")} onChange={set("date_format")}
                                            className="w-full max-w-xs h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none appearance-none">
                                            {DATE_FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
                                        </select>
                                    </Row>
                                    <Row label="Currency Symbol" icon={IndianRupee}>
                                        <Input className="rounded-xl w-24" value={get("currency_symbol", "₹")} onChange={set("currency_symbol")} maxLength={3} />
                                    </Row>
                                </Section>
                            )}

                            {/* ── Data ──────────────────────────────────── */}
                            {activeTab === "data" && (
                                <Section title="Data & Backups" desc="Export or manage your clinic data.">
                                    <div className="space-y-3">
                                        {[
                                            { label: "Export Patients (CSV)", desc: "Download all patient records", action: "Export" },
                                            { label: "Export Sessions (CSV)", desc: "Download all session history", action: "Export" },
                                            { label: "Export Staff (CSV)", desc: "Download staff directory", action: "Export" },
                                            { label: "Full Data Backup", desc: "Download complete clinic backup as ZIP", action: "Download" },
                                        ].map(item => (
                                            <div key={item.label} className="flex items-center justify-between py-3.5 px-4 bg-muted/40 rounded-xl">
                                                <div>
                                                    <p className="text-sm font-medium">{item.label}</p>
                                                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                                                </div>
                                                <Button size="sm" variant="outline" className="rounded-xl text-xs shrink-0">{item.action}</Button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl space-y-2">
                                        <p className="text-sm font-semibold text-red-700">Danger Zone</p>
                                        <p className="text-xs text-red-600">Permanently delete all clinic data. This action cannot be undone.</p>
                                        <Button size="sm" className="rounded-xl bg-red-600 hover:bg-red-700 text-xs">Delete All Data</Button>
                                    </div>
                                </Section>
                            )}
                        </div>

                        {/* Save footer */}
                        {activeTab !== "data" && activeTab !== "labels" && (
                            <div className="px-6 py-4 border-t border-border/60 flex items-center justify-end gap-3">
                                {saved && <span className="text-xs text-emerald-600 font-medium">Changes saved ✓</span>}
                                <Button onClick={save} disabled={saving} className="rounded-xl gap-2">
                                    {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : <><Save className="w-4 h-4" />Save Settings</>}
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

function WorkingHoursEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    let shifts: { start: string; end: string }[];
    try { shifts = JSON.parse(value); } catch { shifts = [{ start: "09:00", end: "18:00" }]; }
    if (!Array.isArray(shifts) || shifts.length === 0) shifts = [{ start: "09:00", end: "18:00" }];

    function update(index: number, field: "start" | "end", val: string) {
        const next = shifts.map((s, i) => i === index ? { ...s, [field]: val } : s);
        onChange(JSON.stringify(next));
    }
    function addShift() { onChange(JSON.stringify([...shifts, { start: "09:00", end: "18:00" }])); }
    function removeShift(index: number) {
        if (shifts.length <= 1) return;
        onChange(JSON.stringify(shifts.filter((_, i) => i !== index)));
    }

    return (
        <div className="space-y-2">
            {shifts.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-14 shrink-0">Shift {i + 1}</span>
                    <Input className="rounded-xl w-28" type="time" value={s.start} onChange={e => update(i, "start", e.target.value)} />
                    <span className="text-xs text-muted-foreground">to</span>
                    <Input className="rounded-xl w-28" type="time" value={s.end} onChange={e => update(i, "end", e.target.value)} />
                    {shifts.length > 1 && (
                        <button type="button" onClick={() => removeShift(i)}
                            className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            ))}
            <button type="button" onClick={addShift}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1">
                <Plus className="w-3.5 h-3.5" /> Add shift
            </button>
        </div>
    );
}

function Section({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
    return (
        <div className="space-y-5">
            <div>
                <h2 className="font-bold text-base">{title}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
            </div>
            <div className="space-y-4">{children}</div>
        </div>
    );
}

function Row({ label, icon: Icon, children }: { label: string; icon: React.ElementType; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5 text-muted-foreground" /> {label}
            </label>
            {children}
        </div>
    );
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function downloadCsv(filename: string, rows: string[][]) {
    const csv = rows.map(r => r.map(cell => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
}

// ── Data Backup Tab ────────────────────────────────────────────────────────────
function DataBackupTab() {
    const [exporting, setExporting] = useState<string | null>(null);
    const [lastExport, setLastExport] = useState<Record<string, string>>(() => {
        try { return JSON.parse(localStorage.getItem("prohuman_last_export") ?? "{}"); } catch { return {}; }
    });

    function markExport(key: string) {
        const updated = { ...lastExport, [key]: new Date().toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) };
        setLastExport(updated);
        localStorage.setItem("prohuman_last_export", JSON.stringify(updated));
    }

    async function exportPatients() {
        setExporting("patients");
        try {
            const res = await patientsApi.list({ limit: "9999", page: "1" });
            const rows: string[][] = [["Code", "Full Name", "Age", "Gender", "Phone", "Email", "Complaints", "Status", "Registered"],
                ...(res.patients ?? []).map(p => [p.patient_code, p.full_name, String(p.age), p.gender, p.phone, p.email ?? "", p.complaints ?? "", p.is_active ? "Active" : "Discharged", new Date(p.created_at).toLocaleDateString("en-IN")])];
            downloadCsv("patients.csv", rows);
            markExport("patients");
        } catch { /* ignore */ } finally { setExporting(null); }
    }

    async function exportSessions() {
        setExporting("sessions");
        try {
            const res = await sessionsApi.list({ limit: "9999", page: "1" });
            const rows: string[][] = [["Patient", "Code", "Doctor", "Session Type", "Date", "Duration (min)", "Status"],
                ...(res.sessions ?? []).map(s => [s.patient_name, s.patient_code, s.doctor_name, s.session_type_name, new Date(s.scheduled_at).toLocaleString("en-IN"), String(s.duration_minutes), s.status])];
            downloadCsv("sessions.csv", rows);
            markExport("sessions");
        } catch { /* ignore */ } finally { setExporting(null); }
    }

    async function exportStaff() {
        setExporting("staff");
        try {
            const all = await staffApi.list();
            const rows: string[][] = [["Full Name", "Email", "Role", "Status"],
                ...all.map(m => [m.full_name, m.email, m.role, m.is_active ? "Active" : "Inactive"])];
            downloadCsv("staff.csv", rows);
            markExport("staff");
        } catch { /* ignore */ } finally { setExporting(null); }
    }

    async function exportAll() {
        setExporting("all");
        try {
            await Promise.all([exportPatients(), exportSessions(), exportStaff()]);
        } catch { /* ignore */ } finally { setExporting(null); }
    }

    const ITEMS = [
        { key: "patients", label: "Export Patients (CSV)", desc: "All patient records", action: "Export", fn: exportPatients },
        { key: "sessions", label: "Export Sessions (CSV)", desc: "All session history", action: "Export", fn: exportSessions },
        { key: "staff", label: "Export Staff (CSV)", desc: "Staff directory", action: "Export", fn: exportStaff },
        { key: "all", label: "Full Data Backup", desc: "Downloads all CSVs at once", action: "Download All", fn: exportAll },
    ];

    return (
        <Section title="Data & Backups" desc="Export your clinic data as CSV files.">
            <div className="space-y-3">
                {ITEMS.map(item => (
                    <div key={item.key} className="flex items-center justify-between py-3.5 px-4 bg-muted/40 rounded-xl">
                        <div>
                            <p className="text-sm font-medium">{item.label}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-xs text-muted-foreground">{item.desc}</p>
                                {lastExport[item.key] && (
                                    <p className="text-[11px] text-muted-foreground/60">· Last: {lastExport[item.key]}</p>
                                )}
                            </div>
                        </div>
                        <Button size="sm" variant="outline" className="rounded-xl text-xs shrink-0 gap-1.5"
                            disabled={exporting !== null}
                            onClick={item.fn}>
                            {exporting === item.key
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <Download className="w-3.5 h-3.5" />}
                            {item.action}
                        </Button>
                    </div>
                ))}
            </div>
        </Section>
    );
}

// ── Patient Labels Tab ──────────────────────────────────────────────────────────
const LABEL_PRESETS = ["#7C3AED", "#10B981", "#F59E0B", "#3B82F6", "#EC4899", "#06B6D4", "#F97316", "#6366F1", "#EF4444", "#14B8A6"];

function PatientLabelsTab() {
    const [labels, setLabels] = useState<PatientLabel[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<PatientLabel | null>(null);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({ name: "", color: "#7C3AED" });
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try { setLabels(await patientLabelsApi.listDefinitions()); }
        catch { setLabels([]); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    function openCreate() { setForm({ name: "", color: "#7C3AED" }); setEditing(null); setCreating(true); setError(null); }
    function openEdit(l: PatientLabel) { setForm({ name: l.name, color: l.color }); setEditing(l); setCreating(true); setError(null); }
    function cancelForm() { setCreating(false); setEditing(null); }

    async function save() {
        if (!form.name.trim()) { setError("Label name is required."); return; }
        setSaving(true); setError(null);
        try {
            if (editing) await patientLabelsApi.update(editing.id, { name: form.name.trim(), color: form.color });
            else await patientLabelsApi.create({ name: form.name.trim(), color: form.color });
            await load();
            cancelForm();
        } catch (e) { setError(e instanceof Error ? e.message : "Failed to save"); }
        finally { setSaving(false); }
    }

    async function deleteLabel(id: string) {
        setDeletingId(id);
        try { await patientLabelsApi.delete(id); await load(); }
        catch { /* ignore */ }
        finally { setDeletingId(null); }
    }

    return (
        <Section title="Patient Labels" desc="Create colored labels to tag and filter patients.">
            {loading ? (
                <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
            ) : (
                <div className="space-y-2">
                    {labels.length === 0 && !creating && (
                        <p className="text-xs text-muted-foreground py-4 text-center">No labels yet. Create your first one!</p>
                    )}
                    {labels.map(l => (
                        <div key={l.id} className="flex items-center justify-between py-3 px-4 bg-muted/40 rounded-xl">
                            <div className="flex items-center gap-3">
                                <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
                                <span className="text-sm font-medium">{l.name}</span>
                                <span className="text-[11px] text-muted-foreground font-mono">{l.color}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <button onClick={() => openEdit(l)}
                                    className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors">
                                    <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => deleteLabel(l.id)} disabled={deletingId === l.id}
                                    className="p-1.5 text-muted-foreground hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40">
                                    {deletingId === l.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                        </div>
                    ))}

                    {creating && (
                        <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-3">
                            {error && (
                                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-700">
                                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
                                </div>
                            )}
                            <div className="flex items-center gap-3">
                                <Input placeholder="Label name (e.g. Priority, Insurance…)" className="rounded-xl flex-1"
                                    value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                            </div>
                            <div className="space-y-2">
                                <p className="text-xs font-semibold text-muted-foreground">Color</p>
                                <div className="flex items-center gap-2 flex-wrap">
                                    {LABEL_PRESETS.map(c => (
                                        <button key={c} type="button" onClick={() => setForm(p => ({ ...p, color: c }))}
                                            className={cn("w-7 h-7 rounded-full transition-all ring-offset-1 shrink-0",
                                                form.color === c ? "ring-2 ring-foreground" : "hover:ring-2 hover:ring-border")}
                                            style={{ backgroundColor: c }} />
                                    ))}
                                    <input type="color" value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))}
                                        className="w-7 h-7 rounded-full border border-input cursor-pointer bg-transparent p-0.5 shrink-0" />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 justify-end">
                                <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={cancelForm}>Cancel</Button>
                                <Button size="sm" className="rounded-xl gap-2" onClick={save} disabled={saving}>
                                    {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                    {editing ? "Save Changes" : "Create Label"}
                                </Button>
                            </div>
                        </div>
                    )}

                    {!creating && (
                        <button onClick={openCreate}
                            className="flex items-center gap-2 px-4 py-2.5 w-full rounded-xl border border-dashed border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors">
                            <Plus className="w-3.5 h-3.5" /> New Label
                        </button>
                    )}
                </div>
            )}
        </Section>
    );
}
