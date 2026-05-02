"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Search, Pencil, MessageCircle, Clock, Zap, Copy, CheckCircle2,
    RefreshCw, ToggleLeft, ToggleRight, X, Loader2, AlertCircle, Save,
    Wifi, WifiOff, LogOut, QrCode, Bell, BellOff, Plus, Trash2,
    User, Stethoscope, Phone, ChevronDown, Settings2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
    whatsappApi, WhatsAppTemplate, WhatsAppAuthStatus,
    NotificationRule, RecipientEntry, NotificationConditions,
} from "@/lib/api";
import { sessionTypesApi, SessionType, branchesApi, Branch } from "@/lib/api";

// ── Trigger metadata ───────────────────────────────────────────────────────────
const TRIGGER_LABELS: Record<string, string> = {
    registration:               "Patient Registration",
    appointment_confirmed:      "Appointment Confirmed",
    appointment_reminder_24h:   "Appointment Reminder (24h before)",
    appointment_reminder_1h:    "Appointment Reminder (1h before)",
    post_session_exercises:     "Post-Session Exercises",
    follow_up_weekly:           "Weekly Follow-Up",
    follow_up_biweekly:         "Bi-weekly Follow-Up",
    follow_up_monthly:          "Monthly Follow-Up",
    follow_up_quarterly:        "Quarterly Follow-Up",
    payment_pending:            "Payment Pending",
    no_show:                    "No Show",
    cancellation:               "Cancellation",
    rescheduled:                "Appointment Rescheduled",
    milestone_5_sessions:       "5-Session Milestone",
    milestone_10_sessions:      "10-Session Milestone",
    compliance_low:             "Low Exercise Compliance",
    satisfaction_survey:        "Satisfaction Survey",
    seasonal_greeting:          "Seasonal Greeting",
    referral_incentive:         "Referral Incentive",
    points_redeemable:          "Points Redeemable",
    high_risk_alert:            "High Risk Alert",
    insurance_update:           "Insurance Update",
    invoice_generated:          "Invoice Generated",
    invoice_paid:               "Invoice Paid",
    invoice_overdue:            "Invoice Overdue",
};

const TRIGGER_COLOR: Record<string, string> = {
    registration:             "bg-violet-100 text-violet-700",
    appointment_confirmed:    "bg-blue-100 text-blue-700",
    appointment_reminder_24h: "bg-blue-100 text-blue-700",
    appointment_reminder_1h:  "bg-blue-100 text-blue-700",
    post_session_exercises:   "bg-emerald-100 text-emerald-700",
    follow_up_weekly:         "bg-amber-100 text-amber-700",
    follow_up_biweekly:       "bg-amber-100 text-amber-700",
    follow_up_monthly:        "bg-amber-100 text-amber-700",
    follow_up_quarterly:      "bg-amber-100 text-amber-700",
    payment_pending:          "bg-pink-100 text-pink-700",
    no_show:                  "bg-orange-100 text-orange-700",
    cancellation:             "bg-red-100 text-red-600",
    rescheduled:              "bg-cyan-100 text-cyan-700",
    milestone_5_sessions:     "bg-indigo-100 text-indigo-700",
    milestone_10_sessions:    "bg-indigo-100 text-indigo-700",
    compliance_low:           "bg-orange-100 text-orange-700",
    satisfaction_survey:      "bg-teal-100 text-teal-700",
    seasonal_greeting:        "bg-lime-100 text-lime-700",
    referral_incentive:       "bg-purple-100 text-purple-700",
    points_redeemable:        "bg-yellow-100 text-yellow-700",
    high_risk_alert:          "bg-red-100 text-red-700",
    insurance_update:         "bg-slate-100 text-slate-700",
    invoice_generated:        "bg-sky-100 text-sky-700",
    invoice_paid:             "bg-emerald-100 text-emerald-700",
    invoice_overdue:          "bg-rose-100 text-rose-700",
};

const ALL_TRIGGERS = Object.keys(TRIGGER_LABELS);

function triggerLabel(t: string) { return TRIGGER_LABELS[t] ?? t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()); }

function Skeleton({ className }: { className?: string }) {
    return <div className={cn("animate-pulse bg-muted rounded-xl", className)} />;
}

// ── ConnectionPanel ────────────────────────────────────────────────────────────
function ConnectionPanel() {
    const [status, setStatus] = useState<WhatsAppAuthStatus | null>(null);
    const [loadingStatus, setLoadingStatus] = useState(true);
    const [generatingQr, setGeneratingQr] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);

    const fetchStatus = useCallback(async () => {
        try { setStatus(await whatsappApi.getAuthStatus()); }
        catch { }
        finally { setLoadingStatus(false); }
    }, []);

    useEffect(() => {
        fetchStatus();
        const id = setInterval(fetchStatus, 5000);
        return () => clearInterval(id);
    }, [fetchStatus]);

    async function handleGenerateQr() {
        setGeneratingQr(true);
        try { setStatus(await whatsappApi.generateQr()); }
        catch { }
        finally { setGeneratingQr(false); }
    }

    async function handleLogout() {
        if (!confirm("Disconnect WhatsApp? You'll need to scan a new QR to reconnect.")) return;
        setLoggingOut(true);
        try { await whatsappApi.logoutAuth(); await fetchStatus(); }
        catch { }
        finally { setLoggingOut(false); }
    }

    const connected = status?.connected;
    const qrAvailable = status?.qr_available && status?.qr_data_url;

    return (
        <div className={`rounded-2xl border p-5 flex flex-col gap-4 ${connected ? "bg-emerald-50 border-emerald-200" : "bg-white border-border/50"}`}>
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${connected ? "bg-emerald-100" : "bg-muted"}`}>
                        {loadingStatus
                            ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                            : connected
                                ? <Wifi className="w-5 h-5 text-emerald-600" />
                                : <WifiOff className="w-5 h-5 text-muted-foreground" />}
                    </div>
                    <div>
                        <p className="text-sm font-semibold">
                            {loadingStatus ? "Checking..." : connected ? "WhatsApp Connected" : "WhatsApp Disconnected"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {connected && status?.connected_whatsapp_number
                                ? `Sending as +${status.connected_whatsapp_number}`
                                : status?.connecting || status?.reconnecting
                                    ? "Connecting..."
                                    : status?.last_error ?? "Not connected — notifications will not be sent"}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {!connected && (
                        <Button size="sm" className="rounded-xl gap-2" onClick={handleGenerateQr} disabled={generatingQr}>
                            {generatingQr ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <QrCode className="w-3.5 h-3.5" />}
                            {qrAvailable ? "Refresh QR" : "Connect"}
                        </Button>
                    )}
                    {connected && (
                        <Button size="sm" variant="outline" className="rounded-xl gap-2 text-red-600 border-red-200 hover:bg-red-50"
                            onClick={handleLogout} disabled={loggingOut}>
                            {loggingOut ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
                            Disconnect
                        </Button>
                    )}
                    <button onClick={fetchStatus}
                        className="w-8 h-8 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
                        <RefreshCw className={`w-3.5 h-3.5 ${loadingStatus ? "animate-spin" : ""}`} />
                    </button>
                </div>
            </div>
            {qrAvailable && !connected && (
                <div className="flex flex-col items-center gap-3 pt-2 border-t border-border/40">
                    <p className="text-xs text-muted-foreground">Scan with WhatsApp → Linked Devices → Link a Device</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={status!.qr_data_url!} alt="WhatsApp QR Code"
                        className="w-52 h-52 rounded-xl border border-border p-2 bg-white" />
                    {status?.qr_expires_at && (
                        <p className="text-[11px] text-muted-foreground">Expires {new Date(status.qr_expires_at).toLocaleTimeString()}</p>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Template EditModal ─────────────────────────────────────────────────────────
function EditModal({ template, onClose, onSaved }: {
    template: WhatsAppTemplate; onClose: () => void; onSaved: (t: WhatsAppTemplate) => void;
}) {
    const [name, setName] = useState(template.name);
    const [body, setBody] = useState(template.body);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function save() {
        if (!name.trim()) { setError("Name is required"); return; }
        if (!body.trim()) { setError("Message body is required"); return; }
        setSaving(true); setError(null);
        try {
            const updated = await whatsappApi.update(template.id, { name: name.trim(), body: body.trim() });
            onSaved(updated); onClose();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Save failed");
        } finally { setSaving(false); }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
                    <div>
                        <h2 className="font-bold text-base">Edit Template</h2>
                        <p className="text-xs text-muted-foreground capitalize">{triggerLabel(template.trigger)}</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="px-6 py-5 space-y-4">
                    {error && (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-sm text-red-700">
                            <AlertCircle className="w-4 h-4 shrink-0" />{error}
                        </div>
                    )}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold">Template Name <span className="text-red-500">*</span></label>
                        <Input className={cn("rounded-xl", !name.trim() && error && "border-red-400")}
                            value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold">Message Body <span className="text-red-500">*</span></label>
                        <textarea value={body} onChange={e => setBody(e.target.value)} rows={8}
                            className={cn("w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring font-mono leading-relaxed",
                                !body.trim() && error && "border-red-400")} />
                        <p className="text-[11px] text-muted-foreground">Use {"{{variable}}"} syntax for dynamic fields</p>
                    </div>
                </div>
                <div className="px-6 py-4 border-t border-border/60 flex justify-end gap-3">
                    <Button variant="outline" className="rounded-xl" onClick={onClose} disabled={saving}>Cancel</Button>
                    <Button className="rounded-xl gap-2" onClick={save} disabled={saving}>
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Save
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ── TemplatesTab ───────────────────────────────────────────────────────────────
function TemplatesTab() {
    const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [triggerFilter, setTriggerFilter] = useState("All");
    const [expanded, setExpanded] = useState<string | null>(null);
    const [editing, setEditing] = useState<WhatsAppTemplate | null>(null);
    const [copied, setCopied] = useState<string | null>(null);
    const [toggling, setToggling] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try { setTemplates(await whatsappApi.list()); }
        catch { setTemplates([]); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const allTriggers = ["All", ...Array.from(new Set(templates.map(t => t.trigger)))];
    const filtered = templates.filter(t => {
        const matchesTrigger = triggerFilter === "All" || t.trigger === triggerFilter;
        const matchesSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.body.toLowerCase().includes(search.toLowerCase());
        return matchesTrigger && matchesSearch;
    });

    async function toggleActive(t: WhatsAppTemplate) {
        setToggling(t.id);
        try {
            const updated = await whatsappApi.update(t.id, { is_active: !t.is_active });
            setTemplates(prev => prev.map(x => x.id === t.id ? updated : x));
        } catch { } finally { setToggling(null); }
    }

    function copyBody(body: string, id: string) {
        navigator.clipboard.writeText(body).then(() => { setCopied(id); setTimeout(() => setCopied(null), 2000); });
    }

    const activeCount = templates.filter(t => t.is_active).length;

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: "Total Templates", value: templates.length, color: "text-foreground" },
                    { label: "Active", value: activeCount, color: "text-emerald-600" },
                    { label: "Inactive", value: templates.length - activeCount, color: "text-muted-foreground" },
                    { label: "Trigger Types", value: allTriggers.length - 1, color: "text-blue-600" },
                ].map(({ label, value, color }) => (
                    <div key={label} className="bg-white rounded-2xl border border-border/50 p-4">
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className={cn("text-2xl font-bold mt-1", color)}>{value}</p>
                    </div>
                ))}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input placeholder="Search templates..." className="pl-9 rounded-xl bg-white" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div className="flex items-center gap-1 bg-white rounded-xl p-1 flex-wrap">
                    {allTriggers.map(t => (
                        <button key={t} onClick={() => setTriggerFilter(t)}
                            className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize",
                                triggerFilter === t ? "bg-foreground text-white" : "text-muted-foreground hover:text-foreground")}>
                            {t === "All" ? "All" : triggerLabel(t)}
                        </button>
                    ))}
                </div>
                <button onClick={load} className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors ml-auto">
                    <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                </button>
            </div>
            <div className="space-y-2">
                {loading ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />) :
                    filtered.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-border/50 p-12 text-center text-sm text-muted-foreground">
                            {search || triggerFilter !== "All" ? "No templates match your filters." : "No WhatsApp templates found."}
                        </div>
                    ) : filtered.map(t => (
                        <div key={t.id} className={cn("bg-white rounded-2xl border transition-all overflow-hidden",
                            t.is_active ? "border-border/50" : "border-border/30 opacity-60")}>
                            <div className="flex items-center gap-4 px-5 py-4">
                                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                                    t.is_active ? "bg-[#25D366]/10" : "bg-muted")}>
                                    <MessageCircle className={cn("w-4 h-4", t.is_active ? "text-[#25D366]" : "text-muted-foreground")} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold text-sm">{t.name}</span>
                                        <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full capitalize",
                                            TRIGGER_COLOR[t.trigger] ?? "bg-muted text-muted-foreground")}>
                                            {triggerLabel(t.trigger)}
                                        </span>
                                        {!t.is_active && <Badge variant="outline" className="text-[10px] rounded-full text-muted-foreground border-muted-foreground/20">Inactive</Badge>}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{t.body.slice(0, 100)}...</p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <button onClick={() => copyBody(t.body, t.id)}
                                        className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                                        {copied === t.id ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                    <button onClick={() => setEditing(t)}
                                        className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => toggleActive(t)} disabled={toggling === t.id}
                                        className={cn("p-2 rounded-xl transition-colors", t.is_active
                                            ? "text-emerald-600 hover:bg-emerald-50" : "text-muted-foreground hover:bg-muted")}>
                                        {toggling === t.id ? <Loader2 className="w-4 h-4 animate-spin" />
                                            : t.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                                    </button>
                                    <button onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                                        className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                                        <Zap className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            {expanded === t.id && (
                                <div className="px-5 pb-5 pt-0 border-t border-border/40">
                                    <div className="mt-3 bg-[#ECF0F1] rounded-2xl p-4 max-w-sm space-y-2">
                                        <div className="flex items-center gap-1.5 mb-2">
                                            <div className="w-2 h-2 rounded-full bg-[#25D366]" />
                                            <span className="text-[11px] font-semibold text-muted-foreground">Message Preview</span>
                                        </div>
                                        <div className="bg-white rounded-xl rounded-tl-none p-3 text-xs leading-relaxed text-foreground shadow-sm whitespace-pre-wrap font-sans">{t.body}</div>
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-3 h-3 text-muted-foreground" />
                                            <span className="text-[10px] text-muted-foreground">
                                                Updated {new Date(t.updated_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                                {t.updated_by_name ? ` by ${t.updated_by_name}` : ""}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
            </div>
            {editing && (
                <EditModal template={editing} onClose={() => setEditing(null)}
                    onSaved={updated => setTemplates(prev => prev.map(t => t.id === updated.id ? updated : t))} />
            )}
        </div>
    );
}

// ── RuleModal ─────────────────────────────────────────────────────────────────
type RuleFormData = {
    name: string;
    trigger: string;
    template_id: string;
    includePatient: boolean;
    includeDoctor: boolean;
    customPhones: Array<{ phone: string; label: string }>;
    delay_minutes: number;
    session_type_ids: string[];
    branch_ids: string[];
};

function RuleModal({ rule, templates, onClose, onSaved }: {
    rule: NotificationRule | null;
    templates: WhatsAppTemplate[];
    onClose: () => void;
    onSaved: (r: NotificationRule) => void;
}) {
    const isEdit = !!rule;
    const [form, setForm] = useState<RuleFormData>(() => {
        if (rule) {
            const recipients = rule.recipients ?? [];
            const customPhones = recipients
                .filter(r => r.type === "custom")
                .map(r => ({ phone: r.phone ?? "", label: r.label ?? "" }));
            return {
                name: rule.name, trigger: rule.trigger, template_id: rule.template_id,
                includePatient: recipients.some(r => r.type === "patient"),
                includeDoctor: recipients.some(r => r.type === "doctor"),
                customPhones, delay_minutes: rule.delay_minutes,
                session_type_ids: rule.conditions?.session_type_ids ?? [],
                branch_ids: rule.conditions?.branch_ids ?? [],
            };
        }
        return {
            name: "", trigger: "", template_id: "",
            includePatient: true, includeDoctor: false, customPhones: [],
            delay_minutes: 0, session_type_ids: [], branch_ids: [],
        };
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sessionTypes, setSessionTypes] = useState<SessionType[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);

    useEffect(() => {
        sessionTypesApi.list().then(setSessionTypes).catch(() => {});
        branchesApi.list().then(setBranches).catch(() => {});
    }, []);

    const filteredTemplates = form.trigger ? templates.filter(t => t.trigger === form.trigger) : templates;

    function setField<K extends keyof RuleFormData>(key: K, value: RuleFormData[K]) {
        setForm(prev => {
            const next = { ...prev, [key]: value };
            if (key === "trigger") {
                const stillValid = templates.some(t => t.id === prev.template_id && t.trigger === value);
                if (!stillValid) next.template_id = "";
            }
            return next;
        });
    }

    function addCustomPhone() { setForm(prev => ({ ...prev, customPhones: [...prev.customPhones, { phone: "", label: "" }] })); }
    function updateCustomPhone(idx: number, field: "phone" | "label", value: string) {
        setForm(prev => ({ ...prev, customPhones: prev.customPhones.map((p, i) => i === idx ? { ...p, [field]: value } : p) }));
    }
    function removeCustomPhone(idx: number) { setForm(prev => ({ ...prev, customPhones: prev.customPhones.filter((_, i) => i !== idx) })); }
    function toggleId(field: "session_type_ids" | "branch_ids", id: string) {
        setForm(prev => {
            const arr = prev[field];
            return { ...prev, [field]: arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id] };
        });
    }

    async function save() {
        setError(null);
        if (!form.name.trim()) { setError("Name is required"); return; }
        if (!form.trigger) { setError("Trigger event is required"); return; }
        if (!form.template_id) { setError("Template is required"); return; }

        const recipients: RecipientEntry[] = [];
        if (form.includePatient) recipients.push({ type: "patient" });
        if (form.includeDoctor) recipients.push({ type: "doctor" });
        for (const cp of form.customPhones) {
            const phone = cp.phone.trim();
            if (!phone) { setError("All custom phone numbers must be filled in"); return; }
            recipients.push({ type: "custom", phone, label: cp.label.trim() || undefined });
        }
        if (recipients.length === 0) { setError("At least one recipient is required"); return; }

        const conditions: NotificationConditions = {};
        if (form.session_type_ids.length > 0) conditions.session_type_ids = form.session_type_ids;
        if (form.branch_ids.length > 0) conditions.branch_ids = form.branch_ids;

        setSaving(true);
        try {
            const payload = {
                name: form.name.trim(), trigger: form.trigger, template_id: form.template_id,
                recipients, delay_minutes: form.delay_minutes, conditions,
            };
            const saved = isEdit
                ? await whatsappApi.updateRule(rule!.id, payload)
                : await whatsappApi.createRule(payload);
            onSaved(saved); onClose();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Save failed");
        } finally { setSaving(false); }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 shrink-0">
                    <div>
                        <h2 className="font-bold text-base">{isEdit ? "Edit Notification Rule" : "New Notification Rule"}</h2>
                        <p className="text-xs text-muted-foreground">Configure when and to whom WhatsApp messages are sent automatically</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="overflow-y-auto px-6 py-5 space-y-6">
                    {error && (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-sm text-red-700">
                            <AlertCircle className="w-4 h-4 shrink-0" />{error}
                        </div>
                    )}
                    {/* Name */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold">Rule Name <span className="text-red-500">*</span></label>
                        <Input className="rounded-xl" value={form.name} onChange={e => setField("name", e.target.value)}
                            placeholder="e.g. Appointment confirmation to patient" />
                    </div>
                    {/* Trigger + Template */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold">Trigger Event <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <select value={form.trigger} onChange={e => setField("trigger", e.target.value)}
                                    className="w-full px-3 py-2.5 pr-8 rounded-xl border border-input bg-background text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-ring">
                                    <option value="">Select trigger...</option>
                                    {ALL_TRIGGERS.map(t => <option key={t} value={t}>{triggerLabel(t)}</option>)}
                                </select>
                                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold">Message Template <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <select value={form.template_id} onChange={e => setField("template_id", e.target.value)}
                                    className="w-full px-3 py-2.5 pr-8 rounded-xl border border-input bg-background text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-ring">
                                    <option value="">Select template...</option>
                                    {(filteredTemplates.length > 0 ? filteredTemplates : templates).map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                            </div>
                            {form.trigger && filteredTemplates.length === 0 && (
                                <p className="text-[11px] text-amber-600">No template for this trigger — showing all</p>
                            )}
                        </div>
                    </div>
                    {/* Delay */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold">Send Delay</label>
                        <div className="flex items-center gap-3">
                            <Input type="number" min={0} className="rounded-xl w-32" value={form.delay_minutes}
                                onChange={e => setField("delay_minutes", Math.max(0, parseInt(e.target.value) || 0))} />
                            <span className="text-sm text-muted-foreground">minutes after the trigger event (0 = immediately)</span>
                        </div>
                    </div>
                    {/* Recipients */}
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs font-semibold">Recipients <span className="text-red-500">*</span></label>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Who receives this message when the event fires</p>
                        </div>
                        <div className="flex gap-3 flex-wrap">
                            {[
                                { key: "includePatient" as const, icon: User, label: "Patient", desc: "The patient from the event" },
                                { key: "includeDoctor" as const, icon: Stethoscope, label: "Doctor / Therapist", desc: "The assigned doctor" },
                            ].map(({ key, icon: Icon, label, desc }) => {
                                const checked = form[key];
                                return (
                                    <button key={key} type="button" onClick={() => setField(key, !checked)}
                                        className={cn("flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left",
                                            checked ? "border-foreground bg-foreground/5" : "border-border hover:border-foreground/30")}>
                                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                            checked ? "bg-foreground text-white" : "bg-muted text-muted-foreground")}>
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">{label}</p>
                                            <p className="text-[11px] text-muted-foreground">{desc}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        <div className="space-y-2">
                            {form.customPhones.map((cp, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                        <Phone className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                    <Input className="rounded-xl w-44" placeholder="+91 9876543210"
                                        value={cp.phone} onChange={e => updateCustomPhone(idx, "phone", e.target.value)} />
                                    <Input className="rounded-xl flex-1" placeholder="Label (e.g. Reception)"
                                        value={cp.label} onChange={e => updateCustomPhone(idx, "label", e.target.value)} />
                                    <button onClick={() => removeCustomPhone(idx)}
                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50 transition-colors">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            <Button type="button" variant="outline" size="sm" className="rounded-xl gap-2" onClick={addCustomPhone}>
                                <Plus className="w-3.5 h-3.5" />Add Custom Number
                            </Button>
                        </div>
                    </div>
                    {/* Conditions */}
                    <div className="space-y-4 pt-2 border-t border-border/40">
                        <div>
                            <p className="text-xs font-semibold">Conditions <span className="text-muted-foreground font-normal">(optional)</span></p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Restrict to specific session types or branches — empty means all</p>
                        </div>
                        {sessionTypes.length > 0 && (
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">Session Types</label>
                                <div className="flex flex-wrap gap-2">
                                    {sessionTypes.map(st => {
                                        const selected = form.session_type_ids.includes(st.id);
                                        return (
                                            <button key={st.id} type="button" onClick={() => toggleId("session_type_ids", st.id)}
                                                className={cn("px-3 py-1.5 rounded-xl text-xs font-medium border transition-all",
                                                    selected ? "bg-blue-600 text-white border-blue-600" : "bg-white text-muted-foreground border-border hover:border-blue-300")}>
                                                {st.name}
                                            </button>
                                        );
                                    })}
                                </div>
                                {form.session_type_ids.length > 0 && (
                                    <p className="text-[11px] text-blue-600">Only fires for: {form.session_type_ids.map(id => sessionTypes.find(s => s.id === id)?.name).filter(Boolean).join(", ")}</p>
                                )}
                            </div>
                        )}
                        {branches.length > 1 && (
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">Branches</label>
                                <div className="flex flex-wrap gap-2">
                                    {branches.map(b => {
                                        const selected = form.branch_ids.includes(b.id);
                                        return (
                                            <button key={b.id} type="button" onClick={() => toggleId("branch_ids", b.id)}
                                                className={cn("px-3 py-1.5 rounded-xl text-xs font-medium border transition-all",
                                                    selected ? "bg-violet-600 text-white border-violet-600" : "bg-white text-muted-foreground border-border hover:border-violet-300")}>
                                                {b.name}
                                            </button>
                                        );
                                    })}
                                </div>
                                {form.branch_ids.length > 0 && (
                                    <p className="text-[11px] text-violet-600">Only fires for: {form.branch_ids.map(id => branches.find(b => b.id === id)?.name).filter(Boolean).join(", ")}</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <div className="px-6 py-4 border-t border-border/60 flex justify-end gap-3 shrink-0">
                    <Button variant="outline" className="rounded-xl" onClick={onClose} disabled={saving}>Cancel</Button>
                    <Button className="rounded-xl gap-2" onClick={save} disabled={saving}>
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {isEdit ? "Save Changes" : "Create Rule"}
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ── RulesTab ───────────────────────────────────────────────────────────────────
function RulesTab({ templates }: { templates: WhatsAppTemplate[] }) {
    const [rules, setRules] = useState<NotificationRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingRule, setEditingRule] = useState<NotificationRule | null | "new">(null);
    const [toggling, setToggling] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try { setRules(await whatsappApi.listRules()); }
        catch { setRules([]); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    async function toggleRule(r: NotificationRule) {
        setToggling(r.id);
        try {
            const updated = await whatsappApi.updateRule(r.id, { is_enabled: !r.is_enabled });
            setRules(prev => prev.map(x => x.id === r.id ? { ...x, ...updated } : x));
        } catch { } finally { setToggling(null); }
    }

    async function deleteRule(r: NotificationRule) {
        if (!confirm(`Delete rule "${r.name}"? This cannot be undone.`)) return;
        setDeleting(r.id);
        try { await whatsappApi.deleteRule(r.id); setRules(prev => prev.filter(x => x.id !== r.id)); }
        catch { } finally { setDeleting(null); }
    }

    function recipientSummary(recipients: RecipientEntry[]) {
        const parts: string[] = [];
        if (recipients.some(r => r.type === "patient")) parts.push("Patient");
        if (recipients.some(r => r.type === "doctor")) parts.push("Doctor");
        const custom = recipients.filter(r => r.type === "custom");
        if (custom.length > 0) parts.push(`${custom.length} custom`);
        return parts.join(", ") || "None";
    }

    function conditionSummary(rule: NotificationRule) {
        const parts: string[] = [];
        if (rule.conditions?.session_type_ids?.length) parts.push(`${rule.conditions.session_type_ids.length} session type(s)`);
        if (rule.conditions?.branch_ids?.length) parts.push(`${rule.conditions.branch_ids.length} branch(es)`);
        return parts.length > 0 ? parts.join(", ") : "All";
    }

    const grouped = rules.reduce<Record<string, NotificationRule[]>>((acc, r) => {
        if (!acc[r.trigger]) acc[r.trigger] = [];
        acc[r.trigger].push(r);
        return acc;
    }, {});
    const enabledCount = rules.filter(r => r.is_enabled).length;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    {[
                        { label: "Total Rules", value: rules.length, icon: Bell, color: "text-foreground" },
                        { label: "Active", value: enabledCount, icon: Bell, color: "text-emerald-600" },
                        { label: "Paused", value: rules.length - enabledCount, icon: BellOff, color: "text-muted-foreground" },
                    ].map(({ label, value, icon: Icon, color }) => (
                        <div key={label} className="bg-white rounded-2xl border border-border/50 px-4 py-3 flex items-center gap-3">
                            <Icon className={cn("w-4 h-4", color)} />
                            <div>
                                <p className="text-xs text-muted-foreground">{label}</p>
                                <p className={cn("text-xl font-bold", color)}>{value}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={load} className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
                        <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                    </button>
                    <Button className="rounded-xl gap-2" onClick={() => setEditingRule("new")}>
                        <Plus className="w-4 h-4" />Add Rule
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
            ) : rules.length === 0 ? (
                <div className="bg-white rounded-2xl border border-border/50 p-16 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                        <Bell className="w-7 h-7 text-muted-foreground" />
                    </div>
                    <p className="font-semibold mb-1">No notification rules yet</p>
                    <p className="text-sm text-muted-foreground mb-4">Create rules to automatically send WhatsApp messages when events occur</p>
                    <Button className="rounded-xl gap-2" onClick={() => setEditingRule("new")}>
                        <Plus className="w-4 h-4" />Create First Rule
                    </Button>
                </div>
            ) : (
                <div className="space-y-5">
                    {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([trigger, triggerRules]) => (
                        <div key={trigger}>
                            <div className="flex items-center gap-2 mb-2">
                                <span className={cn("text-[10px] font-semibold px-2.5 py-1 rounded-full",
                                    TRIGGER_COLOR[trigger] ?? "bg-muted text-muted-foreground")}>
                                    {triggerLabel(trigger)}
                                </span>
                                <span className="text-xs text-muted-foreground">{triggerRules.length} rule{triggerRules.length !== 1 ? "s" : ""}</span>
                            </div>
                            <div className="space-y-2 pl-2">
                                {triggerRules.map(r => (
                                    <div key={r.id} className={cn("bg-white rounded-2xl border transition-all",
                                        r.is_enabled ? "border-border/50" : "border-border/30 opacity-60")}>
                                        <div className="flex items-center gap-4 px-5 py-4">
                                            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                                                r.is_enabled ? "bg-[#25D366]/10" : "bg-muted")}>
                                                <Bell className={cn("w-4 h-4", r.is_enabled ? "text-[#25D366]" : "text-muted-foreground")} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-semibold text-sm">{r.name}</span>
                                                    {!r.is_enabled && <Badge variant="outline" className="text-[10px] rounded-full text-muted-foreground border-muted-foreground/20">Paused</Badge>}
                                                </div>
                                                <div className="flex items-center gap-3 mt-1 flex-wrap">
                                                    <span className="text-xs text-muted-foreground">
                                                        Template: <span className="text-foreground font-medium">{r.template_name ?? "—"}</span>
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        To: <span className="text-foreground font-medium">{recipientSummary(r.recipients)}</span>
                                                    </span>
                                                    {r.delay_minutes > 0 && (
                                                        <span className="text-xs text-muted-foreground">
                                                            Delay: <span className="text-foreground font-medium">{r.delay_minutes}m</span>
                                                        </span>
                                                    )}
                                                    <span className="text-xs text-muted-foreground">
                                                        Applies to: <span className="text-foreground font-medium">{conditionSummary(r)}</span>
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <button onClick={() => setEditingRule(r)}
                                                    className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => toggleRule(r)} disabled={toggling === r.id}
                                                    className={cn("p-2 rounded-xl transition-colors", r.is_enabled
                                                        ? "text-emerald-600 hover:bg-emerald-50" : "text-muted-foreground hover:bg-muted")}>
                                                    {toggling === r.id ? <Loader2 className="w-4 h-4 animate-spin" />
                                                        : r.is_enabled ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                                                </button>
                                                <button onClick={() => deleteRule(r)} disabled={deleting === r.id}
                                                    className="p-2 rounded-xl text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors">
                                                    {deleting === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {editingRule !== null && (
                <RuleModal
                    rule={editingRule === "new" ? null : editingRule}
                    templates={templates}
                    onClose={() => setEditingRule(null)}
                    onSaved={saved => {
                        setRules(prev => {
                            const idx = prev.findIndex(x => x.id === saved.id);
                            if (idx >= 0) return prev.map(x => x.id === saved.id ? saved : x);
                            return [...prev, saved];
                        });
                    }}
                />
            )}
        </div>
    );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function WhatsAppPage() {
    const [tab, setTab] = useState<"templates" | "rules">("templates");
    const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);

    useEffect(() => {
        whatsappApi.list().then(setTemplates).catch(() => {});
    }, []);

    return (
        <div className="flex flex-col gap-4 p-5">
            <ConnectionPanel />
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">WhatsApp</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Manage message templates and configure automated notification rules</p>
                </div>
            </div>
            <div className="flex items-center gap-1 bg-white rounded-2xl border border-border/50 p-1 w-fit">
                {[
                    { key: "templates", icon: MessageCircle, label: "Templates" },
                    { key: "rules", icon: Settings2, label: "Notification Rules" },
                ].map(({ key, icon: Icon, label }) => (
                    <button key={key} onClick={() => setTab(key as typeof tab)}
                        className={cn("flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                            tab === key ? "bg-foreground text-white" : "text-muted-foreground hover:text-foreground")}>
                        <Icon className="w-4 h-4" />{label}
                    </button>
                ))}
            </div>
            {tab === "templates" && <TemplatesTab />}
            {tab === "rules" && <RulesTab templates={templates} />}
        </div>
    );
}
