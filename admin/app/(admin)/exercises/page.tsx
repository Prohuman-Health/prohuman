"use client";

import { useState } from "react";
import { Plus, Search, Pencil, Trash2, Play, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const CATEGORIES = ["All", "Strength", "Flexibility", "Balance", "Cardio", "Neurological", "Post-Surgical"];

const EXERCISES = [
    { id: "e1", name: "Straight Leg Raise", category: "Strength", targetArea: "Quadriceps / Hip Flexors", duration: "3 × 15 reps", difficulty: "Beginner", videoUrl: "#", instructions: "Lie flat on your back. Tighten the quadriceps of one leg and raise it to about 45°. Hold for 2 sec, lower slowly. Keep opposite knee bent.", status: "active" },
    { id: "e2", name: "Shoulder Pendulum", category: "Flexibility", targetArea: "Shoulder / Rotator Cuff", duration: "5 min", difficulty: "Beginner", videoUrl: "#", instructions: "Lean forward at the waist, supporting yourself with your good arm. Let the affected arm hang freely and gently swing in small circles.", status: "active" },
    { id: "e3", name: "Terminal Knee Extension (TKE)", category: "Strength", targetArea: "Knee / VMO", duration: "3 × 20 reps", difficulty: "Intermediate", videoUrl: "#", instructions: "Loop a resistance band behind your knee. Stand with a slight bend in the knee and straighten fully against band resistance. Control the return.", status: "active" },
    { id: "e4", name: "Single Leg Balance", category: "Balance", targetArea: "Ankle / Core", duration: "3 × 30 sec", difficulty: "Intermediate", videoUrl: "#", instructions: "Stand on one foot with a slight bend in the knee. Focus on a fixed point. Progress to eyes closed or unstable surface once stable.", status: "active" },
    { id: "e5", name: "Cat-Cow Stretch", category: "Flexibility", targetArea: "Lumbar Spine", duration: "3 × 10 reps", difficulty: "Beginner", videoUrl: "#", instructions: "On all fours, alternate between arching your back toward the ceiling (cat) and letting it sag toward the floor (cow). Move slowly and breathe.", status: "active" },
    { id: "e6", name: "Cervical Retraction (Chin Tucks)", category: "Strength", targetArea: "Cervical Spine / Deep Neck Flexors", duration: "3 × 10 reps", difficulty: "Beginner", videoUrl: "#", instructions: "Sitting upright, gently draw your chin straight back creating a 'double chin'. Hold 5 sec. Do not tilt head up or down.", status: "active" },
    { id: "e7", name: "Step-Ups", category: "Strength", targetArea: "Quad / Glute / VMO", duration: "3 × 12 reps each side", difficulty: "Intermediate", videoUrl: "#", instructions: "Stand in front of a step. Step up with the weaker leg leading, pushing through the heel. Lower the trailing leg slowly. Progress step height.", status: "active" },
    { id: "e8", name: "Diaphragmatic Breathing", category: "Neurological", targetArea: "Respiratory / Core", duration: "5–10 min daily", difficulty: "Beginner", videoUrl: "#", instructions: "Lie with knees bent. Place one hand on chest, other on abdomen. Breathe in slowly expanding the abdomen. Exhale fully. Minimize chest movement.", status: "draft" },
];

const DIFFICULTY_STYLE: Record<string, string> = {
    Beginner: "bg-emerald-100 text-emerald-700",
    Intermediate: "bg-amber-100 text-amber-700",
    Advanced: "bg-red-100 text-red-600",
};

const CATEGORY_STYLE: Record<string, string> = {
    Strength: "bg-violet-100 text-violet-700",
    Flexibility: "bg-blue-100 text-blue-700",
    Balance: "bg-pink-100 text-pink-700",
    Cardio: "bg-orange-100 text-orange-700",
    Neurological: "bg-cyan-100 text-cyan-700",
    "Post-Surgical": "bg-rose-100 text-rose-700",
};

export default function ExercisesPage() {
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("All");
    const [expanded, setExpanded] = useState<string | null>(null);

    const filtered = EXERCISES.filter((e) => {
        const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) || e.targetArea.toLowerCase().includes(search.toLowerCase());
        const matchCat = category === "All" || e.category === category;
        return matchSearch && matchCat;
    });

    return (
        <div className="flex flex-col gap-4 p-4 md:p-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight">Exercise Directory</h1>
                    <p className="text-sm text-muted-foreground mt-0.5 hidden sm:block">Manage exercises and routines for patient treatment plans.</p>
                </div>
                <Button size="sm" className="gap-1.5 rounded-xl shrink-0">
                    <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Exercise</span>
                </Button>
            </div>

            {/* Search + Category filter */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input placeholder="Search exercises..." className="pl-9 rounded-xl bg-white" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <div className="flex items-center gap-1 bg-white rounded-xl p-1 overflow-x-auto w-full sm:w-auto">
                    {CATEGORIES.map((c) => (
                        <button key={c} onClick={() => setCategory(c)} className={cn("px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap", category === c ? "bg-foreground text-white" : "text-muted-foreground hover:text-foreground")}>
                            {c}
                        </button>
                    ))}
                </div>
                <span className="text-xs text-muted-foreground sm:ml-auto shrink-0">{filtered.length} exercises</span>
            </div>

            {/* Exercise List */}
            <div className="space-y-2">
                {filtered.map((e) => {
                    const isOpen = expanded === e.id;
                    return (
                        <div key={e.id} className="bg-white rounded-2xl overflow-hidden">
                            <div
                                className="flex items-center gap-4 px-4 md:px-5 py-3.5 cursor-pointer hover:bg-muted/20 transition-colors"
                                onClick={() => setExpanded(isOpen ? null : e.id)}
                            >
                                {/* Left icon */}
                                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", CATEGORY_STYLE[e.category] ?? "bg-muted text-muted-foreground")}>
                                    <Play className="w-3.5 h-3.5" />
                                </div>

                                {/* Main info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-semibold text-sm">{e.name}</p>
                                        <Badge variant="outline" className={cn("text-[10px] rounded-full px-2 font-medium capitalize", e.status === "active" ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-muted-foreground/20 text-muted-foreground")}>
                                            {e.status}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{e.targetArea}</p>
                                </div>

                                {/* Tags */}
                                <div className="hidden md:flex items-center gap-2 shrink-0">
                                    <span className={cn("text-[11px] font-medium px-2.5 py-1 rounded-full", CATEGORY_STYLE[e.category] ?? "bg-muted text-muted-foreground")}>{e.category}</span>
                                    <span className={cn("text-[11px] font-medium px-2.5 py-1 rounded-full", DIFFICULTY_STYLE[e.difficulty] ?? "bg-muted text-muted-foreground")}>{e.difficulty}</span>
                                    <span className="text-xs text-muted-foreground font-mono">{e.duration}</span>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1 shrink-0">
                                    <button className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted" onClick={(ev) => { ev.stopPropagation(); }}><Pencil className="w-3.5 h-3.5" /></button>
                                    <button className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors rounded-lg hover:bg-red-50" onClick={(ev) => { ev.stopPropagation(); }}><Trash2 className="w-3.5 h-3.5" /></button>
                                    {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground ml-1" /> : <ChevronDown className="w-4 h-4 text-muted-foreground ml-1" />}
                                </div>
                            </div>

                            {/* Expanded instructions */}
                            {isOpen && (
                                <div className="border-t border-border/60 px-4 md:px-5 py-4 bg-muted/20 flex flex-col sm:flex-row gap-4">
                                    <div className="flex-1">
                                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Instructions</p>
                                        <p className="text-sm text-muted-foreground leading-relaxed">{e.instructions}</p>
                                    </div>
                                    <div className="flex flex-col gap-2 sm:items-end shrink-0">
                                        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                                            <div className="bg-white rounded-xl px-3 py-2 text-xs">
                                                <p className="text-muted-foreground text-[10px] uppercase tracking-wider">Dosage</p>
                                                <p className="font-semibold mt-0.5">{e.duration}</p>
                                            </div>
                                            <div className="bg-white rounded-xl px-3 py-2 text-xs">
                                                <p className="text-muted-foreground text-[10px] uppercase tracking-wider">Level</p>
                                                <p className={cn("font-semibold mt-0.5", DIFFICULTY_STYLE[e.difficulty]?.split(" ")[1] ?? "")}>{e.difficulty}</p>
                                            </div>
                                        </div>
                                        <button className="text-xs text-blue-600 hover:underline font-medium">View Video →</button>
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
