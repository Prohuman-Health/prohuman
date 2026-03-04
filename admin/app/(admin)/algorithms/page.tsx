"use client";

import { useState } from "react";
import { Plus, Search, ChevronDown, ChevronUp, Pencil, Trash2, BookOpen, AlertTriangle, ClipboardCheck, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const CONDITIONS = ["All", "Shoulder", "Knee", "Spine", "Hip", "Neurological", "Sports"];

const ALGORITHMS = [
    {
        id: "a1",
        name: "Frozen Shoulder (Adhesive Capsulitis)",
        condition: "Shoulder",
        icdCode: "M75.0",
        stage: "Comprehensive",
        status: "active",
        lastUpdated: "Jan 2025",
        summary: "A staged rehabilitation protocol covering the freezing, frozen, and thawing phases of adhesive capsulitis.",
        evaluation: [
            "Assess passive and active ROM in all planes (flexion, abduction, ER, IR)",
            "Shoulder pain VAS score at rest and during movement",
            "DASH or SPADI outcome measure at baseline",
            "Rule out red flags: trauma, infection, fracture, malignancy",
        ],
        redFlags: [
            "Bone pain at night unrelated to movement",
            "Constitutional symptoms (fever, weight loss)",
            "Trauma with suspected fracture or dislocation",
        ],
        treatmentProtocol: [
            "Phase 1 (Freezing): Pain management, gentle PROM, pendulum, modalities",
            "Phase 2 (Frozen): Progressive PROM/AROM, joint mobilisation Grade I–II, capsular stretches",
            "Phase 3 (Thawing): Strengthening rotator cuff, scapular stabilisers, proprioception",
        ],
        exercises: ["Shoulder Pendulum", "Codman's Exercise", "Pulleys", "Anterior Capsule Stretch", "ER with Theraband"],
        outcomes: "DASH / SPADI — reassess every 4 weeks. Target full ROM within 6–12 months.",
    },
    {
        id: "a2",
        name: "Knee Osteoarthritis (OA)",
        condition: "Knee",
        icdCode: "M17.1",
        stage: "Comprehensive",
        status: "active",
        lastUpdated: "Dec 2024",
        summary: "Evidence-based conservative management for mild to moderate knee OA focusing on load management, strengthening, and patient education.",
        evaluation: [
            "KOOS / WOMAC questionnaire",
            "VAS pain at rest, on stairs, and with 500 m walk",
            "Knee ROM (flexion, extension), quadriceps lag",
            "Single-leg squat quality, gait analysis",
        ],
        redFlags: [
            "Acute joint swelling with warmth (rule out septic arthritis)",
            "Rapid progression of pain — consider X-ray / MRI",
            "Locking or giving way — rule out meniscal tear",
        ],
        treatmentProtocol: [
            "Phase 1: Education, activity modification, pain relief (TENS, ice/heat)",
            "Phase 2: Quad/glute strengthening — VMO focus, cycling, hydrotherapy",
            "Phase 3: Functional training — step-ups, mini-squats, proprioception",
            "Phase 4: Return to activity, maintenance program",
        ],
        exercises: ["Straight Leg Raise", "TKE with Band", "Quad Sets", "Step-Ups", "Mini Squats"],
        outcomes: "KOOS / WOMAC — reassess at 6 and 12 weeks. Weight management counselling if BMI > 25.",
    },
    {
        id: "a3",
        name: "Non-Specific Low Back Pain (NSLBP)",
        condition: "Spine",
        icdCode: "M54.5",
        stage: "Comprehensive",
        status: "active",
        lastUpdated: "Feb 2025",
        summary: "Subacute to chronic NSLBP management using movement, graded activity, and psychosocial screening.",
        evaluation: [
            "Oswestry Disability Index (ODI)",
            "VAS back and leg pain — differentiate central vs radicular",
            "Lumbar ROM, neurological screen (SLR, reflexes, sensation)",
            "STarT MSK screening tool for psychosocial risk",
        ],
        redFlags: [
            "Bowel/bladder dysfunction — urgent referral",
            "Saddle anaesthesia — cauda equina — EMERGENCY",
            "Bilateral leg weakness or sudden worsening neurological signs",
            "History of malignancy or unexplained weight loss",
        ],
        treatmentProtocol: [
            "Acute: Reassurance, stay active advice, gentle McKenzie or Williams flexion",
            "Sub-acute: Core stability (transverse abdominis, multifidus), graded aerobic",
            "Chronic: Cognitive-functional therapy, pain neuroscience education, loaded exercise",
        ],
        exercises: ["Cat-Cow Stretch", "Pelvic Tilts", "Bridge", "Bird-Dog", "Diaphragmatic Breathing"],
        outcomes: "ODI — reassess every 4 weeks. Flag if STarT MSK scores high for psychosocial factors.",
    },
    {
        id: "a4",
        name: "Cervical Spondylosis / Neck Pain",
        condition: "Spine",
        icdCode: "M47.8",
        stage: "Comprehensive",
        status: "active",
        lastUpdated: "Jan 2025",
        summary: "Conservative management of mechanical neck pain and cervical spondylosis with or without radiculopathy.",
        evaluation: [
            "NDI (Neck Disability Index)",
            "Cervical ROM, Spurling's test, ULTT for radiculopathy",
            "Neurological screen — upper limb reflexes, sensation, grip",
            "Posture analysis (forward head, upper cross syndrome)",
        ],
        redFlags: [
            "Myelopathic signs — Hoffmann's reflex, gait disturbance",
            "Vertebral artery symptoms — dizziness, diplopia, drop attacks",
            "Trauma with high-speed mechanism — rule out fracture",
        ],
        treatmentProtocol: [
            "Phase 1: Postural correction, cervical traction (if radiculopathy), heat/TENS",
            "Phase 2: DNF strengthening, cervical retraction, upper thoracic mobility",
            "Phase 3: Proprioception retraining, progressive loading, ergonomic advice",
        ],
        exercises: ["Chin Tucks (Cervical Retraction)", "Cervical Rotation Stretch", "Scapular Retraction", "Upper Trapezius Stretch"],
        outcomes: "NDI — reassess at 4 weeks. Discharge criteria: <20% disability, pain < 3/10 VAS.",
    },
    {
        id: "a5",
        name: "Hamstring Strain (Grade I–II)",
        condition: "Sports",
        icdCode: "M62.1",
        stage: "Return to Sport",
        status: "draft",
        lastUpdated: "Feb 2025",
        summary: "Sports-focused progressive return-to-sport protocol for acute and sub-acute hamstring strain.",
        evaluation: [
            "FASH (Functional Assessment Scale for Hamstring) questionnaire",
            "Palpation along proximal/mid/distal hamstring",
            "Slump test and Active Knee Extension test",
            "Strength testing — isokinetic or handheld dynamometer if available",
        ],
        redFlags: [
            "Complete rupture (Grade III) — refer for surgical opinion",
            "Massive bruising with palpable gap — ultrasound scan",
            "Sciatic nerve involvement — radicular pattern of pain",
        ],
        treatmentProtocol: [
            "Phase 1 (Acute): PRICE, pain-free range, neural flossing",
            "Phase 2 (Sub-acute): Progressive stretching, concentric strengthening",
            "Phase 3 (Strengthening): Nordic curls, Romanian DL, agility drills",
            "Phase 4 (RTS): Sport-specific running drills, speed work",
        ],
        exercises: ["Lying Hamstring Stretch", "Nordic Curl (eccentric)", "Romanian Deadlift", "Prone Hip Extension"],
        outcomes: "FASH — reassess at 2 weeks. RTS cleared when strength ≥ 90% limb symmetry index.",
    },
];

const CONDITION_COLORS: Record<string, string> = {
    Shoulder: "bg-violet-100 text-violet-700",
    Knee: "bg-blue-100 text-blue-700",
    Spine: "bg-amber-100 text-amber-700",
    Hip: "bg-pink-100 text-pink-700",
    Neurological: "bg-cyan-100 text-cyan-700",
    Sports: "bg-emerald-100 text-emerald-700",
};

const STAGE_COLORS: Record<string, string> = {
    "Comprehensive": "bg-foreground text-white",
    "Return to Sport": "bg-emerald-600 text-white",
    "Acute Management": "bg-red-100 text-red-700",
};

export default function AlgorithmsPage() {
    const [search, setSearch] = useState("");
    const [condition, setCondition] = useState("All");
    const [expanded, setExpanded] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<Record<string, string>>({});

    const filtered = ALGORITHMS.filter((a) => {
        const matchSearch = a.name.toLowerCase().includes(search.toLowerCase()) || a.icdCode.toLowerCase().includes(search.toLowerCase());
        const matchCond = condition === "All" || a.condition === condition;
        return matchSearch && matchCond;
    });

    function getTab(id: string) { return activeTab[id] ?? "overview"; }
    function setTab(id: string, tab: string) { setActiveTab((prev) => ({ ...prev, [id]: tab })); }

    return (
        <div className="flex flex-col gap-4 p-4 md:p-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight">Algorithm Directory</h1>
                    <p className="text-sm text-muted-foreground mt-0.5 hidden sm:block">Standardised clinical pathways and treatment protocols for common conditions.</p>
                </div>
                <Button size="sm" className="gap-1.5 rounded-xl shrink-0">
                    <Plus className="w-4 h-4" /> <span className="hidden sm:inline">New Algorithm</span>
                </Button>
            </div>

            {/* Search + Condition filter */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input placeholder="Search by condition or ICD code..." className="pl-9 rounded-xl bg-white" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <div className="flex items-center gap-1 bg-white rounded-xl p-1 overflow-x-auto w-full sm:w-auto">
                    {CONDITIONS.map((c) => (
                        <button key={c} onClick={() => setCondition(c)} className={cn("px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap", condition === c ? "bg-foreground text-white" : "text-muted-foreground hover:text-foreground")}>
                            {c}
                        </button>
                    ))}
                </div>
                <span className="text-xs text-muted-foreground sm:ml-auto shrink-0">{filtered.length} algorithms</span>
            </div>

            {/* Algorithm list */}
            <div className="space-y-2">
                {filtered.map((a) => {
                    const isOpen = expanded === a.id;
                    const tab = getTab(a.id);
                    return (
                        <div key={a.id} className="bg-white rounded-2xl overflow-hidden">
                            {/* Row */}
                            <div
                                className="flex items-center gap-4 px-4 md:px-5 py-3.5 cursor-pointer hover:bg-muted/20 transition-colors"
                                onClick={() => setExpanded(isOpen ? null : a.id)}
                            >
                                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", CONDITION_COLORS[a.condition] ?? "bg-muted")}>
                                    <BookOpen className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-semibold text-sm">{a.name}</p>
                                        <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{a.icdCode}</span>
                                        <Badge variant="outline" className={cn("text-[10px] rounded-full px-2 font-medium capitalize", a.status === "active" ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-muted-foreground/20 text-muted-foreground")}>
                                            {a.status}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5 truncate hidden sm:block">{a.summary}</p>
                                </div>
                                <div className="hidden md:flex items-center gap-2 shrink-0">
                                    <span className={cn("text-[11px] font-medium px-2.5 py-1 rounded-full", CONDITION_COLORS[a.condition] ?? "bg-muted")}>{a.condition}</span>
                                    <span className={cn("text-[11px] font-medium px-2.5 py-1 rounded-full", STAGE_COLORS[a.stage] ?? "bg-muted")}>{a.stage}</span>
                                    <span className="text-xs text-muted-foreground">Updated {a.lastUpdated}</span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <button className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted" onClick={(ev) => ev.stopPropagation()}><Pencil className="w-3.5 h-3.5" /></button>
                                    <button className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors rounded-lg hover:bg-red-50" onClick={(ev) => ev.stopPropagation()}><Trash2 className="w-3.5 h-3.5" /></button>
                                    {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground ml-1" /> : <ChevronDown className="w-4 h-4 text-muted-foreground ml-1" />}
                                </div>
                            </div>

                            {/* Expanded detail */}
                            {isOpen && (
                                <div className="border-t border-border/60 bg-muted/20">
                                    {/* Sub-tabs */}
                                    <div className="flex gap-1 px-4 md:px-5 pt-3 border-b border-border/40">
                                        {[
                                            { id: "overview", label: "Overview", Icon: BookOpen },
                                            { id: "redflags", label: "Red Flags", Icon: AlertTriangle },
                                            { id: "protocol", label: "Protocol", Icon: ClipboardCheck },
                                            { id: "exercises", label: "Exercises", Icon: Dumbbell },
                                        ].map(({ id, label, Icon }) => (
                                            <button
                                                key={id}
                                                onClick={() => setTab(a.id, id)}
                                                className={cn(
                                                    "flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-all",
                                                    tab === id ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                                                )}
                                            >
                                                <Icon className="w-3.5 h-3.5" />
                                                {label}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="px-4 md:px-5 py-4">
                                        {tab === "overview" && (
                                            <div className="space-y-3">
                                                <p className="text-sm text-muted-foreground leading-relaxed">{a.summary}</p>
                                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Evaluation Steps</p>
                                                <ul className="space-y-1.5">
                                                    {a.evaluation.map((step, i) => (
                                                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                                            <span className="w-5 h-5 rounded-full bg-foreground text-white text-[10px] flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                                                            {step}
                                                        </li>
                                                    ))}
                                                </ul>
                                                <p className="text-sm font-medium"><span className="text-muted-foreground">Outcomes: </span>{a.outcomes}</p>
                                            </div>
                                        )}
                                        {tab === "redflags" && (
                                            <div className="space-y-2">
                                                <p className="text-xs text-muted-foreground mb-3">Items below require immediate assessment or referral before continuing treatment.</p>
                                                {a.redFlags.map((flag, i) => (
                                                    <div key={i} className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                                                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                                                        <p className="text-sm text-red-700">{flag}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {tab === "protocol" && (
                                            <div className="space-y-2">
                                                {a.treatmentProtocol.map((step, i) => (
                                                    <div key={i} className="flex items-start gap-3 bg-white rounded-xl px-3 py-2.5 border border-border/40">
                                                        <span className="w-5 h-5 rounded-full bg-foreground text-white text-[10px] flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                                                        <p className="text-sm text-muted-foreground">{step}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {tab === "exercises" && (
                                            <div className="flex flex-wrap gap-2">
                                                {a.exercises.map((ex) => (
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
