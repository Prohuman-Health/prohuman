"use client";

import { Plus, Search, RefreshCw, UserCheck, UserX, Pencil, Trash2, ShieldOff, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useStaff } from "@/lib/contexts/staff-context";
import { useState } from "react";
import { NewStaffModal } from "@/components/modals/new-staff-modal";
import { EditStaffModal } from "@/components/modals/edit-staff-modal";
import { staffApi, StaffMember } from "@/lib/api";

const ROLE_COLORS: Record<string, string> = {
    admin: "bg-violet-100 text-violet-700",
    receptionist: "bg-blue-100 text-blue-700",
    physiotherapist: "bg-emerald-100 text-emerald-700",
    massager: "bg-amber-100 text-amber-700",
    fitness_trainer: "bg-orange-100 text-orange-700",
    doctor: "bg-teal-100 text-teal-700",
};
const AVATAR_COLORS = ["bg-violet-100 text-violet-700", "bg-blue-100 text-blue-700", "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-700", "bg-teal-100 text-teal-700", "bg-orange-100 text-orange-700"];
const initials = (name: string) => name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

function Skeleton({ className }: { className?: string }) {
    return <div className={cn("animate-pulse bg-muted rounded-xl", className)} />;
}

export default function StaffPage() {
    const { staff, loading, showInactive, setShowInactive, refresh } = useStaff();
    const [search, setSearch] = useState("");
    const [addStaffOpen, setAddStaffOpen] = useState(false);
    const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
    const [togglingId, setTogglingId] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const filtered = staff.filter(s =>
        !search || s.full_name.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase()) ||
        s.role.toLowerCase().includes(search.toLowerCase())
    );

    async function toggleActive(s: StaffMember, e: React.MouseEvent) {
        e.stopPropagation();
        if (togglingId === s.id) return;
        setTogglingId(s.id);
        try {
            await staffApi.update(s.id, { is_active: !s.is_active });
            await refresh();
        } catch {
            // silent fail — error would need a toast system
        } finally {
            setTogglingId(null);
        }
    }

    async function confirmDelete() {
        if (!deleteTarget) return;
        setDeleting(true);
        setDeleteError(null);
        try {
            await staffApi.deleteAndRevoke(deleteTarget.id);
            setDeleteTarget(null);
            await refresh();
        } catch (err) {
            setDeleteError(err instanceof Error ? err.message : "Failed to delete user");
        } finally {
            setDeleting(false);
        }
    }

    return (
        <>
            <div className="flex flex-col gap-4 p-5">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Staff &amp; Roles</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">{staff.length} {showInactive ? "inactive" : "active"} staff members</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={refresh} className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
                            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                        </button>
                        <Button size="sm" className="gap-1.5 rounded-xl" onClick={() => setAddStaffOpen(true)}><Plus className="w-4 h-4" /> Add Staff</Button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input placeholder="Search staff…" className="pl-9 rounded-xl bg-white" value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <div className="flex items-center gap-1 bg-white rounded-xl p-1">
                        {([[false, "Active"], [true, "Inactive"]] as const).map(([v, l]) => (
                            <button key={String(v)} onClick={() => setShowInactive(v)}
                                className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all", showInactive === v ? "bg-foreground text-white" : "text-muted-foreground hover:text-foreground")}>
                                {l}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-2xl overflow-hidden border border-border/50">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[600px]">
                        <thead className="border-b border-border/60">
                            <tr>
                                {["Name", "Role", "Email", "Phone", "Joined", "Status", "Actions"].map(h => (
                                    <th key={h} className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3.5">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="border-b border-border/60">
                                        {Array.from({ length: 7 }).map((_, j) => <td key={j} className="px-5 py-4"><Skeleton className="h-4 w-full" /></td>)}
                                    </tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
                                    {search ? "No staff match your search" : `No ${showInactive ? "inactive" : "active"} staff`}
                                </td></tr>
                            ) : filtered.map((s, i) => (
                                <tr key={s.id} className="border-b border-border/60 hover:bg-muted/30 transition-colors">
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0", AVATAR_COLORS[i % AVATAR_COLORS.length])}>
                                                {initials(s.full_name)}
                                            </div>
                                            <span className="font-semibold">{s.full_name}</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className={cn("text-[11px] font-medium px-2.5 py-1 rounded-full capitalize", ROLE_COLORS[s.role] ?? "bg-muted text-muted-foreground")}>
                                            {s.role.replace("_", " ")}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-muted-foreground text-xs">{s.email}</td>
                                    <td className="px-5 py-4 text-muted-foreground text-xs">{s.phone ?? "—"}</td>
                                    <td className="px-5 py-4 text-muted-foreground text-xs">{new Date(s.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                                    <td className="px-5 py-4">
                                        <Badge variant="outline" className={cn("text-[10px] rounded-full px-2.5 font-medium",
                                            s.is_active ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-muted-foreground/20 text-muted-foreground")}>
                                            {s.is_active ? "Active" : "Inactive"}
                                        </Badge>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-1">
                                            {/* View details */}
                                            <Link href={`/staff/${s.id}`}
                                                onClick={e => e.stopPropagation()}
                                                title="View details"
                                                className="p-1.5 text-muted-foreground hover:text-[#2493A2] transition-colors rounded-lg hover:bg-muted">
                                                <ExternalLink className="w-3.5 h-3.5" />
                                            </Link>
                                            {/* Edit button */}
                                            <button
                                                onClick={e => { e.stopPropagation(); setEditingStaff(s); }}
                                                title="Edit staff"
                                                className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                            {/* Activate / Deactivate button */}
                                            <button
                                                onClick={e => toggleActive(s, e)}
                                                disabled={togglingId === s.id}
                                                title={s.is_active ? "Deactivate" : "Activate"}
                                                className={cn(
                                                    "p-1.5 transition-colors rounded-lg",
                                                    togglingId === s.id && "opacity-50 cursor-wait",
                                                    s.is_active
                                                        ? "text-muted-foreground hover:text-red-500 hover:bg-red-50"
                                                        : "text-muted-foreground hover:text-emerald-500 hover:bg-emerald-50"
                                                )}
                                            >
                                                {s.is_active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                                            </button>
                                            {/* Delete & Revoke button */}
                                            <button
                                                onClick={e => { e.stopPropagation(); setDeleteTarget(s); setDeleteError(null); }}
                                                title="Delete user & revoke sessions"
                                                className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors rounded-lg"
                                            >
                                                <ShieldOff className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    </div>
                </div>
            </div>

            {/* Delete & Revoke confirmation dialog */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setDeleteTarget(null); setDeleteError(null); }} />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                                <ShieldOff className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                                <p className="font-bold text-sm">Delete User &amp; Revoke Access</p>
                                <p className="text-xs text-muted-foreground mt-0.5">This cannot be undone</p>
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            <span className="font-semibold text-foreground">{deleteTarget.full_name}</span> ({deleteTarget.email}) will be permanently deleted and all active sessions immediately revoked — including Google SSO sessions.
                        </p>
                        {deleteError && (
                            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{deleteError}</p>
                        )}
                        <div className="flex justify-end gap-3 pt-1">
                            <Button variant="outline" className="rounded-xl text-xs" onClick={() => { setDeleteTarget(null); setDeleteError(null); }} disabled={deleting}>
                                Cancel
                            </Button>
                            <Button className="rounded-xl text-xs bg-red-600 hover:bg-red-700 gap-2" onClick={confirmDelete} disabled={deleting}>
                                {deleting ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />Deleting…</> : "Delete & Revoke"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <NewStaffModal open={addStaffOpen} onClose={() => setAddStaffOpen(false)} />
            <EditStaffModal staff={editingStaff} onClose={() => setEditingStaff(null)} />
        </>
    );
}
