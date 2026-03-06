"use client";

import { useState } from "react";
import { Plus, Search, Pencil, Trash2, Play, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useExercises } from "@/lib/contexts/catalog-context";
import { NewExerciseModal } from "@/components/modals/new-exercise-modal";

const CATEGORY_STYLE: Record<string, string> = {
    Strength: "bg-violet-100 text-violet-700",
    Flexibility: "bg-blue-100 text-blue-700",
    Balance: "bg-pink-100 text-pink-700",
    Cardio: "bg-orange-100 text-orange-700",
    Neurological: "bg-cyan-100 text-cyan-700",
    "Post-Surgical": "bg-rose-100 text-rose-700",
};

function Skeleton({ className }: { className?: string }) {
    return <div className={cn("animate-pulse bg-muted rounded-xl", className)} />;
}

export default function ExercisesPage() {
    const { exercises, total, loading, search, category, categories, setSearch, setCategory, refresh } = useExercises();
    const [expanded, setExpanded] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);

    return (
        <>
            <div className="flex flex-col gap-4 p-4 md:p-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold tracking-tight">Exercise Directory</h1>
                        <p className="text-sm text-muted-foreground mt-0.5 hidden sm:block">{total} exercises in library</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={refresh} className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
                            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                        </button>
                        <Button size="sm" className="gap-1.5 rounded-xl shrink-0" onClick={() => setShowAddModal(true)}>
                            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Exercise</span>
                        </Button>
                    </div>
                </div>

                {/* Search + Category filter */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input placeholder="Search exercises..." className="pl-9 rounded-xl bg-white" value={search}
                            onChange={e => setSearch(e.target.value)} />
                    </div>
                    <div className="flex items-center gap-1 bg-white rounded-xl p-1 overflow-x-auto w-full sm:w-auto">
                        <button onClick={() => setCategory("")}
                            className={cn("px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap", !category ? "bg-foreground text-white" : "text-muted-foreground hover:text-foreground")}>
                            All
                        </button>
                        {categories.map(c => (
                            <button key={c} onClick={() => setCategory(c === category ? "" : c)}
                                className={cn("px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap", category === c ? "bg-foreground text-white" : "text-muted-foreground hover:text-foreground")}>
                                {c}
                            </button>
                        ))}
                    </div>
                    <span className="text-xs text-muted-foreground sm:ml-auto shrink-0">{exercises.length} shown</span>
                </div>

                {/* List */}
                <div className="space-y-2">
                    {loading ? (
                        Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)
                    ) : exercises.length === 0 ? (
                        <div className="bg-white rounded-2xl p-12 text-center text-muted-foreground text-sm">
                            {search ? "No exercises match your search" : "No exercises yet. Add your first one!"}
                        </div>
                    ) : exercises.map(e => {
                        const isOpen = expanded === e.id;
                        const catStyle = CATEGORY_STYLE[e.category ?? ""] ?? "bg-muted text-muted-foreground";
                        return (
                            <div key={e.id} className="bg-white rounded-2xl overflow-hidden">
                                <div className="flex items-center gap-4 px-4 md:px-5 py-3.5 cursor-pointer hover:bg-muted/20 transition-colors"
                                    onClick={() => setExpanded(isOpen ? null : e.id)}>
                                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", catStyle)}>
                                        <Play className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="font-semibold text-sm">{e.name}</p>
                                            <Badge variant="outline" className={cn("text-[10px] rounded-full px-2 font-medium",
                                                e.is_active ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-muted-foreground/20 text-muted-foreground")}>
                                                {e.is_active ? "Active" : "Inactive"}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{e.description ?? "No description"}</p>
                                    </div>

                                    <div className="hidden md:flex items-center gap-2 shrink-0">
                                        {e.category && (
                                            <span className={cn("text-[11px] font-medium px-2.5 py-1 rounded-full", catStyle)}>{e.category}</span>
                                        )}
                                        {e.tags?.slice(0, 2).map(t => (
                                            <span key={t} className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground">{t}</span>
                                        ))}
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                        <button className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
                                            onClick={ev => ev.stopPropagation()}><Pencil className="w-3.5 h-3.5" /></button>
                                        <button className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                                            onClick={ev => ev.stopPropagation()}><Trash2 className="w-3.5 h-3.5" /></button>
                                        {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground ml-1" /> : <ChevronDown className="w-4 h-4 text-muted-foreground ml-1" />}
                                    </div>
                                </div>

                                {isOpen && (
                                    <div className="border-t border-border/60 px-4 md:px-5 py-4 bg-muted/20 flex flex-col sm:flex-row gap-4">
                                        <div className="flex-1">
                                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Instructions</p>
                                            <p className="text-sm text-muted-foreground leading-relaxed">{e.instructions ?? "No instructions provided."}</p>
                                        </div>
                                        <div className="flex flex-col gap-2 sm:items-end shrink-0">
                                            {e.video_url && (
                                                <a href={e.video_url} target="_blank" rel="noopener noreferrer"
                                                    className="text-xs text-blue-600 hover:underline font-medium">View Video →</a>
                                            )}
                                            {e.created_by_name && (
                                                <p className="text-xs text-muted-foreground">By {e.created_by_name}</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <NewExerciseModal open={showAddModal} onClose={() => setShowAddModal(false)} />
        </>
    );
}
