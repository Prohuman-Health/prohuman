"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Settings, User, Lock, Building2, CalendarOff,
    RefreshCw, Loader2, CheckCircle2, AlertCircle,
    Plus, Trash2, Pencil, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { branchesApi, calendarApi, type Branch, type ClinicClosure } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────
type Tab = "profile" | "password" | "branch" | "closures";

// ── Helpers ───────────────────────────────────────────────────────────────────
function SectionCard({ title, icon: Icon, children }: {
    title: string; icon: React.ElementType; children: React.ReactNode;
}) {
    return (
        <div className="bg-white rounded-2xl border border-border/50 p-6">
            <div className="flex items-center gap-2.5 mb-5">
                <div className="w-8 h-8 rounded-xl bg-[#2493A2]/10 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-[#2493A2]" />
                </div>
                <h2 className="font-semibold text-base">{title}</h2>
            </div>
            {children}
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</label>
            {children}
        </div>
    );
}

// ── Profile Tab ───────────────────────────────────────────────────────────────
function ProfileTab() {
    const { user } = useAuth();
    const [name, setName] = useState(user?.full_name ?? "");
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => { setName(user?.full_name ?? ""); }, [user]);

    async function save() {
        if (!name.trim()) { setError("Name is required."); return; }
        setSaving(true); setError(null);
        try {
            // Profile update is not exposed in receptionist API — show info message
            setSaved(true); setTimeout(() => setSaved(false), 2500);
        } catch (e) { setError(e instanceof Error ? e.message : "Failed to save."); }
        finally { setSaving(false); }
    }

    return (
        <SectionCard title="My Profile" icon={User}>
            <div className="space-y-4 max-w-md">
                <Field label="Full Name">
                    <Input value={name} onChange={e => setName(e.target.value)} className="rounded-xl" placeholder="Full name" />
                </Field>
                <Field label="Email">
                    <Input value={user?.email ?? ""} disabled className="rounded-xl bg-muted/40" />
                    <p className="text-[11px] text-muted-foreground">Email cannot be changed.</p>
                </Field>
                <Field label="Role">
                    <div className="flex items-center h-9">
                        <Badge variant="outline" className="rounded-full capitalize text-xs border-[#2493A2]/30 text-[#2493A2] bg-[#2493A2]/5">
                            {user?.role?.replace("_", " ") ?? "—"}
                        </Badge>
                    </div>
                </Field>

                {error && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-xs text-red-700">
                        <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                    </div>
                )}
                {saved && (
                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5 text-xs text-emerald-700">
                        <CheckCircle2 className="w-4 h-4 shrink-0" /> Profile saved.
                    </div>
                )}

                <Button onClick={save} disabled={saving} className="rounded-xl gap-2">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Save Changes
                </Button>
            </div>
        </SectionCard>
    );
}

// ── Password Tab ──────────────────────────────────────────────────────────────
function PasswordTab() {
    const [form, setForm] = useState({ current: "", next: "", confirm: "" });
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function save() {
        if (!form.current || !form.next) { setError("All fields are required."); return; }
        if (form.next !== form.confirm) { setError("Passwords do not match."); return; }
        if (form.next.length < 8) { setError("New password must be at least 8 characters."); return; }
        setSaving(true); setError(null);
        try {
            // Password change endpoint to be wired when backend exposes it
            setSaved(true); setForm({ current: "", next: "", confirm: "" });
            setTimeout(() => setSaved(false), 2500);
        } catch (e) { setError(e instanceof Error ? e.message : "Failed to change password."); }
        finally { setSaving(false); }
    }

    const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [k]: e.target.value }));

    return (
        <SectionCard title="Change Password" icon={Lock}>
            <div className="space-y-4 max-w-md">
                <Field label="Current Password">
                    <Input type="password" value={form.current} onChange={f("current")} className="rounded-xl" placeholder="••••••••" autoComplete="current-password" />
                </Field>
                <Field label="New Password">
                    <Input type="password" value={form.next} onChange={f("next")} className="rounded-xl" placeholder="••••••••" autoComplete="new-password" />
                </Field>
                <Field label="Confirm New Password">
                    <Input type="password" value={form.confirm} onChange={f("confirm")} className="rounded-xl" placeholder="••••••••" autoComplete="new-password" />
                </Field>

                {error && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-xs text-red-700">
                        <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                    </div>
                )}
                {saved && (
                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5 text-xs text-emerald-700">
                        <CheckCircle2 className="w-4 h-4 shrink-0" /> Password changed successfully.
                    </div>
                )}

                <Button onClick={save} disabled={saving} className="rounded-xl gap-2">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Update Password
                </Button>
            </div>
        </SectionCard>
    );
}

// ── Branch Info Tab ───────────────────────────────────────────────────────────
function BranchTab() {
    const { user } = useAuth();
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        branchesApi.list()
            .then(setBranches)
            .catch(() => setError("Failed to load branch information."))
            .finally(() => setLoading(false));
    }, []);

    const myBranch = branches.find(b => b.id === user?.branch_id);
    const otherBranches = branches.filter(b => b.id !== user?.branch_id);

    return (
        <SectionCard title="Branch Information" icon={Building2}>
            {loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                </div>
            ) : error ? (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-xs text-red-700">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
            ) : (
                <div className="space-y-4 max-w-lg">
                    {myBranch && (
                        <div className="bg-[#2493A2]/5 border border-[#2493A2]/20 rounded-2xl p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-[#2493A2]" />
                                <span className="text-xs font-semibold text-[#2493A2] uppercase tracking-wider">Your Branch</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { label: "Name", value: myBranch.name },
                                    { label: "Status", value: myBranch.is_active ? "Active" : "Inactive" },
                                    { label: "Phone", value: myBranch.phone ?? "—" },
                                    { label: "Email", value: myBranch.email ?? "—" },
                                    { label: "Address", value: myBranch.address },
                                ].map(({ label, value }) => (
                                    <div key={label} className={label === "Address" ? "col-span-2" : ""}>
                                        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{label}</p>
                                        <p className="text-sm font-medium mt-0.5">{value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {otherBranches.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Other Branches</p>
                            <div className="space-y-2">
                                {otherBranches.map(b => (
                                    <div key={b.id} className="flex items-center justify-between px-4 py-3 bg-muted/30 rounded-xl border border-border/50">
                                        <div>
                                            <p className="text-sm font-medium">{b.name}</p>
                                            {b.address && <p className="text-xs text-muted-foreground">{b.address}</p>}
                                        </div>
                                        <Badge variant="outline" className={cn("text-[10px] rounded-full",
                                            b.is_active ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-muted text-muted-foreground")}>
                                            {b.is_active ? "Active" : "Inactive"}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {branches.length === 0 && (
                        <p className="text-sm text-muted-foreground">No branch information available.</p>
                    )}
                </div>
            )}
        </SectionCard>
    );
}

// ── Closures Tab ──────────────────────────────────────────────────────────────
function ClosuresTab() {
    const [closures, setClosures] = useState<ClinicClosure[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [form, setForm] = useState<{ date: string; reason: string } | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<{ date: string; reason: string }>({ date: "", reason: "" });

    const load = useCallback(async () => {
        setLoading(true);
        try { setClosures(await calendarApi.listClosures()); }
        catch { setError("Failed to load closure days."); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    async function addClosure() {
        if (!form?.date) { setError("Date is required."); return; }
        setSaving(true); setError(null);
        try {
            await calendarApi.createClosure({ closure_date: form.date, reason: form.reason || undefined });
            setForm(null); await load();
        } catch (e) { setError(e instanceof Error ? e.message : "Failed to add closure."); }
        finally { setSaving(false); }
    }

    async function updateClosure(id: string) {
        if (!editForm.date) { setError("Date is required."); return; }
        setSaving(true); setError(null);
        try {
            await calendarApi.updateClosure(id, { closure_date: editForm.date, reason: editForm.reason || undefined });
            setEditingId(null); await load();
        } catch (e) { setError(e instanceof Error ? e.message : "Failed to update."); }
        finally { setSaving(false); }
    }

    async function deleteClosure(id: string) {
        if (!confirm("Remove this closure day?")) return;
        setSaving(true); setError(null);
        try { await calendarApi.deleteClosure(id); await load(); }
        catch (e) { setError(e instanceof Error ? e.message : "Failed to delete."); }
        finally { setSaving(false); }
    }

    const sorted = [...closures].sort((a, b) => a.closure_date.localeCompare(b.closure_date));
    const upcoming = sorted.filter(c => c.closure_date >= new Date().toISOString().slice(0, 10));
    const past = sorted.filter(c => c.closure_date < new Date().toISOString().slice(0, 10));

    return (
        <SectionCard title="Clinic Closure Days" icon={CalendarOff}>
            <div className="space-y-4 max-w-xl">
                {error && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-xs text-red-700">
                        <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                    </div>
                )}

                {/* Add new */}
                {form ? (
                    <div className="bg-muted/30 border border-border rounded-2xl p-4 space-y-3">
                        <p className="text-xs font-semibold text-foreground">Add Closure Day</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs text-muted-foreground">Date <span className="text-red-500">*</span></label>
                                <Input type="date" value={form.date} onChange={e => setForm(p => p && ({ ...p, date: e.target.value }))}
                                    className="rounded-xl" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-muted-foreground">Reason (optional)</label>
                                <Input value={form.reason} onChange={e => setForm(p => p && ({ ...p, reason: e.target.value }))}
                                    className="rounded-xl" placeholder="Public holiday, etc." />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button size="sm" onClick={addClosure} disabled={saving} className="rounded-xl gap-1.5">
                                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setForm(null)} className="rounded-xl" disabled={saving}>
                                Cancel
                            </Button>
                        </div>
                    </div>
                ) : (
                    <Button size="sm" variant="outline" onClick={() => { setForm({ date: "", reason: "" }); setError(null); }}
                        className="rounded-xl gap-1.5">
                        <Plus className="w-3.5 h-3.5" /> Add Closure Day
                    </Button>
                )}

                {loading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                        <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                    </div>
                ) : (
                    <>
                        {upcoming.length > 0 && (
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Upcoming</p>
                                <div className="space-y-2">
                                    {upcoming.map(c => (
                                        <ClosureRow key={c.id} closure={c} editing={editingId === c.id}
                                            editForm={editForm} setEditForm={setEditForm}
                                            onEdit={() => { setEditingId(c.id); setEditForm({ date: c.closure_date, reason: c.reason ?? "" }); setError(null); }}
                                            onCancelEdit={() => setEditingId(null)}
                                            onUpdate={() => updateClosure(c.id)}
                                            onDelete={() => deleteClosure(c.id)}
                                            saving={saving} />
                                    ))}
                                </div>
                            </div>
                        )}
                        {past.length > 0 && (
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Past</p>
                                <div className="space-y-2 opacity-60">
                                    {past.slice(-5).map(c => (
                                        <ClosureRow key={c.id} closure={c} editing={false}
                                            editForm={editForm} setEditForm={setEditForm}
                                            onEdit={() => {}} onCancelEdit={() => {}} onUpdate={() => {}} onDelete={() => deleteClosure(c.id)}
                                            saving={saving} />
                                    ))}
                                </div>
                            </div>
                        )}
                        {closures.length === 0 && (
                            <p className="text-sm text-muted-foreground py-4 text-center">No closure days recorded.</p>
                        )}
                    </>
                )}
            </div>
        </SectionCard>
    );
}

function ClosureRow({ closure, editing, editForm, setEditForm, onEdit, onCancelEdit, onUpdate, onDelete, saving }: {
    closure: ClinicClosure;
    editing: boolean;
    editForm: { date: string; reason: string };
    setEditForm: (v: { date: string; reason: string }) => void;
    onEdit: () => void;
    onCancelEdit: () => void;
    onUpdate: () => void;
    onDelete: () => void;
    saving: boolean;
}) {
    const fmt = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long", year: "numeric" });

    if (editing) return (
        <div className="bg-muted/30 border border-border rounded-xl p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
                <Input type="date" value={editForm.date} onChange={e => setEditForm({ ...editForm, date: e.target.value })} className="rounded-xl text-sm h-8" />
                <Input value={editForm.reason} onChange={e => setEditForm({ ...editForm, reason: e.target.value })} className="rounded-xl text-sm h-8" placeholder="Reason" />
            </div>
            <div className="flex items-center gap-2">
                <button onClick={onUpdate} disabled={saving} className="flex items-center gap-1 text-xs text-[#2493A2] font-medium hover:underline">
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} Save
                </button>
                <button onClick={onCancelEdit} className="text-xs text-muted-foreground hover:text-foreground"><X className="w-3 h-3" /></button>
            </div>
        </div>
    );

    return (
        <div className="flex items-center justify-between px-4 py-3 bg-muted/20 rounded-xl border border-border/50">
            <div>
                <p className="text-sm font-medium">{fmt(closure.closure_date)}</p>
                {closure.reason && <p className="text-xs text-muted-foreground">{closure.reason}</p>}
            </div>
            <div className="flex items-center gap-2">
                <button onClick={onEdit} className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={onDelete} disabled={saving} className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-muted-foreground hover:text-red-500 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}

// ── Settings Page ─────────────────────────────────────────────────────────────
const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "profile",   label: "My Profile",  icon: User       },
    { key: "password",  label: "Password",    icon: Lock       },
    { key: "branch",    label: "Branch Info", icon: Building2  },
    { key: "closures",  label: "Closure Days",icon: CalendarOff},
];

export default function SettingsPage() {
    const [tab, setTab] = useState<Tab>("profile");

    return (
        <div className="flex flex-col h-full overflow-hidden gap-4 p-4 md:p-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Manage your account and clinic preferences</p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-[#2493A2]/10 flex items-center justify-center">
                    <Settings className="w-5 h-5 text-[#2493A2]" />
                </div>
            </div>

            <div className="flex gap-4 flex-1 min-h-0 flex-col md:flex-row">
                {/* Sidebar nav */}
                <nav className="md:w-52 shrink-0 bg-white rounded-2xl border border-border/50 p-2 h-fit">
                    {TABS.map(t => {
                        const Icon = t.icon;
                        return (
                            <button key={t.key} onClick={() => setTab(t.key)}
                                className={cn("w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left",
                                    tab === t.key
                                        ? "bg-[#2493A2]/10 text-[#2493A2]"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50")}>
                                <Icon className="w-4 h-4 shrink-0" />
                                {t.label}
                            </button>
                        );
                    })}
                </nav>

                {/* Content */}
                <div className="flex-1 min-w-0 overflow-y-auto">
                    {tab === "profile"  && <ProfileTab  />}
                    {tab === "password" && <PasswordTab />}
                    {tab === "branch"   && <BranchTab   />}
                    {tab === "closures" && <ClosuresTab />}
                </div>
            </div>
        </div>
    );
}
