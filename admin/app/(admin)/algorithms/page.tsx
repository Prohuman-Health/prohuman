"use client";

import { useState } from "react";
import { Plus, Search, ChevronDown, ChevronUp, Pencil, Trash2, BookOpen, AlertTriangle, ClipboardCheck, Dumbbell, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAlgorithms } from "@/lib/contexts/catalog-context";
import type { Algorithm } from "@/lib/api";

function safeArray(val: unknown): string[] {
    if (Array.isArray(val)) return val as string[];
    if (typeof val === "string") {
        try { const p = JSON.parse(val); return Array.isArray(p) ? p : []; } catch { return []; }
    }
    return [];
}

function Skeleton({ className }: { className?: string }) {
    return <div className={cn("animate-pulse bg-muted rounded-xl", className)} />;
}

export default function AlgorithmsPage() {
    const { algorithms, total, loading, search, setSearch, refresh } = useAlgorithms();
    const [expanded, setExpanded] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<Record<string, string>>({});

    const filtered = algorithms.filter(a =>
        !search || a.name.toLowerCase().includes(search.toLowerCase()) ||
        (a.diagnosis ?? "").toLowerCase().includes(search.toLowerCase())
    );

    const getTab = (id: string) => activeTab[id] ?? "overview";
    const setTab = (id: string, tab: string) => setActiveTab(prev => ({ ...prev, [id]: tab }));

    return (
        <div className="flex flex-col gap-4 p-4 md:p-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight">Algorithm Directory</h1>
                    <p className="text-sm text-muted-foreground mt-0.5 hidden sm:block">{total} clinical protocols</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={refresh} className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
                        <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                    </button>
                    <Button size="sm" className="gap-1.5 rounded-xl shrink-0">
                        <Plus className="w-4 h-4" /> <span className="hidden sm:inline">New Algorithm</span>
                    </Button>
                </div>
            </div>

            {/* Search */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input placeholder="Search by name or diagnosis..." className="pl-9 rounded-xl bg-white" value={search}
                        onChange={e => setSearch(e.target.value)} />
                </div>
                <span className="text-xs text-muted-foreground sm:ml-auto shrink-0">{filtered.length} algorithms</span>
            </div>

            {/* Algorithm list */}
            <div className="space-y-2">
                {loading ? (
                    Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)
                ) : filtered.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 text-center text-muted-foreground text-sm">
                        {search ? "No algorithms match your search" : "No algorithms yet. Create your first protocol!"}
                    </div>
                ) : filtered.map(a => {
                    const isOpen = expanded === a.id;
                    const tab = getTab(a.id);
                    const evalSteps = safeArray(a.evaluation_steps);
                    const treatSteps = safeArray(a.treatment_steps);
                    const redFlags = safeArray(a.red_flags);
                    const exercises = safeArray((a as Algorithm & { exercises?: unknown[] }).exercises?.map((e: unknown) => (e as { exercise_name?: string }).exercise_name ?? e));

                    return (
                        <div key={a.id} className="bg-white rounded-2xl overflow-hidden">
                            {/* Row header */}
                            <div className="flex items-center gap-4 px-4 md:px-5 py-3.5 cursor-pointer hover:bg-muted/20 transition-colors"
                                onClick={() => setExpanded(isOpen ? null : a.id)}>
                                <div className="w-9 h-9 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
                                    <BookOpen className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-semibold text-sm">{a.name}</p>
                                        <Badge variant="outline" className={cn("text-[10px] rounded-full px-2 font-medium",
                                            a.is_active ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-muted-foreground/20 text-muted-foreground")}>
                                            {a.is_active ? "Active" : "Inactive"}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5 truncate hidden sm:block">
                                        {a.diagnosis ?? a.description ?? "No diagnosis specified"}
                                    </p>
                                </div>

                                <div className="hidden md:flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
                                    {a.estimated_sessions && <span>{a.estimated_sessions} sessions</span>}
                                    <span>by {a.created_by_name ?? "Unknown"}</span>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                    <button className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
                                        onClick={ev => ev.stopPropagation()}><Pencil className="w-3.5 h-3.5" /></button>
                                    <button className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                                        onClick={ev => ev.stopPropagation()}><Trash2 className="w-3.5 h-3.5" /></button>
                                    {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground ml-1" /> : <ChevronDown className="w-4 h-4 text-muted-foreground ml-1" />}
                                </div>
                            </div>

                            {/* Expanded panel */}
                            {isOpen && (
                                <div className="border-t border-border/60 bg-muted/20">
                                    <div className="flex gap-1 px-4 md:px-5 pt-3 border-b border-border/40">
                                        {[
                                            { id: "overview", label: "Overview", Icon: BookOpen },
                                            { id: "redflags", label: "Red Flags", Icon: AlertTriangle },
                                            { id: "protocol", label: "Protocol", Icon: ClipboardCheck },
                                            { id: "exercises", label: "Exercises", Icon: Dumbbell },
                                        ].map(({ id, label, Icon }) => (
                                            <button key={id} onClick={() => setTab(a.id, id)}
                                                className={cn("flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-all",
                                                    tab === id ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
                                                <Icon className="w-3.5 h-3.5" />{label}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="px-4 md:px-5 py-4">
                                        {tab === "overview" && (
                                            <div className="space-y-3">
                                                <p className="text-sm text-muted-foreground leading-relaxed">{a.description ?? a.diagnosis ?? "No description."}</p>
                                                {evalSteps.length > 0 && (<>
                                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Evaluation Steps</p>
                                                    <ul className="space-y-1.5">
                                                        {evalSteps.map((step, i) => (
                                                            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                                                <span className="w-5 h-5 rounded-full bg-foreground text-white text-[10px] flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                                                                {step}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </>)}
                                            </div>
                                        )}
                                        {tab === "redflags" && (
                                            <div className="space-y-2">
                                                {redFlags.length === 0
                                                    ? <p className="text-sm text-muted-foreground">No red flags defined.</p>
                                                    : redFlags.map((flag, i) => (
                                                        <div key={i} className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                                                            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                                                            <p className="text-sm text-red-700">{flag}</p>
                                                        </div>
                                                    ))}
                                            </div>
                                        )}
                                        {tab === "protocol" && (
                                            <div className="space-y-2">
                                                {treatSteps.length === 0
                                                    ? <p className="text-sm text-muted-foreground">No treatment steps defined.</p>
                                                    : treatSteps.map((step, i) => (
                                                        <div key={i} className="flex items-start gap-3 bg-white rounded-xl px-3 py-2.5 border border-border/40">
                                                            <span className="w-5 h-5 rounded-full bg-foreground text-white text-[10px] flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                                                            <p className="text-sm text-muted-foreground">{step}</p>
                                                        </div>
                                                    ))}
                                            </div>
                                        )}
                                        {tab === "exercises" && (
                                            <div className="flex flex-wrap gap-2">
                                                {exercises.length === 0
                                                    ? <p className="text-sm text-muted-foreground">No exercises linked.</p>
                                                    : exercises.map(ex => (
                                                        <span key={ex} className="text-xs font-medium bg-white border border-border/60 rounded-xl px-3 py-1.5">{ex}</span>
                                                    ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="px-4 md:px-5 pb-4">
                                        <Button size="sm" className="rounded-xl text-xs gap-1.5">Apply to Patient File</Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
