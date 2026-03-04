"use client";

import { useState } from "react";
import { Plus, Search, Pencil, Trash2, MessageCircle, Clock, ChevronDown, ChevronUp, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TRIGGERS = ["All", "Registration", "Appointment", "Post-Session", "Follow-Up", "Payment", "Emergency"];

const MESSAGES = [
    {
        id: "w1", trigger: "Registration", name: "Welcome Message", timing: "Immediate on registration", status: "active",
        preview: "Welcome to ProHuman Health! 🎉 We're so glad you've chosen us for your physiotherapy journey. Our clinic is located at [Clinic Address]. For queries, call us at [Phone]. Your first session is [Date] at [Time]. ✅",
        variables: ["Patient Name", "Clinic Address", "Phone", "Date", "Time"],
    },
    {
        id: "w2", trigger: "Appointment", name: "Appointment Confirmation", timing: "Immediately when booked", status: "active",
        preview: "Hi [Patient Name]! Your appointment at ProHuman Health is confirmed for [Date] at [Time] with [Doctor Name]. Please arrive 10 minutes early. For directions or questions, call [Phone]. See you soon! 🙌",
        variables: ["Patient Name", "Date", "Time", "Doctor Name", "Phone"],
    },
    {
        id: "w3", trigger: "Appointment", name: "Appointment Reminder", timing: "24 hours before appointment", status: "active",
        preview: "Reminder 🔔 Hi [Patient Name], your session at ProHuman Health is tomorrow — [Date] at [Time] with [Doctor Name]. Location: [Address]. Reply CONFIRM to confirm or CANCEL if you can't make it.",
        variables: ["Patient Name", "Date", "Time", "Doctor Name", "Address"],
    },
    {
        id: "w4", trigger: "Post-Session", name: "Post-Session Exercise Instructions", timing: "After session marked complete", status: "active",
        preview: "Great work today, [Patient Name]! 💪 Here are your home exercises for this week:\n[Exercise List]\n📹 Video links: [Video URLs]\nRemember: consistency is key! Questions? Reach us at [Phone].",
        variables: ["Patient Name", "Exercise List", "Video URLs", "Phone"],
    },
    {
        id: "w5", trigger: "Follow-Up", name: "Week 1–4 Check-In (Weekly)", timing: "Every 7 days post-treatment", status: "active",
        preview: "Hi [Patient Name]! 👋 It's been a week since your last session. How are your exercises going? Let us know if you have any pain or difficulty — we're here to help. Reply to this message anytime!",
        variables: ["Patient Name"],
    },
    {
        id: "w6", trigger: "Follow-Up", name: "Month 1–2 Check-In (Bi-Weekly)", timing: "Every 14 days (1–2 months post)", status: "active",
        preview: "Hi [Patient Name]! A quick check-in from ProHuman Health. 🌟 Keep up those exercises — they make a real difference! If you feel ready for a re-evaluation, reply to book. You're doing great!",
        variables: ["Patient Name"],
    },
    {
        id: "w7", trigger: "Follow-Up", name: "Month 2–3 Check-In (Monthly)", timing: "Monthly (2–3 months post)", status: "active",
        preview: "Hello [Patient Name]! It's been a while 🙏 How are you feeling? We'd love to hear about your progress. If you'd like a re-evaluation or have concerns, book a session at [Booking Link].",
        variables: ["Patient Name", "Booking Link"],
    },
    {
        id: "w8", trigger: "Payment", name: "Pending Payment Reminder", timing: "When payment is overdue", status: "active",
        preview: "Hi [Patient Name], this is a gentle reminder that a payment of ₹[Amount] is pending for your session on [Date]. Please settle at your next visit or via [Payment Link]. For help, contact us at [Phone].",
        variables: ["Patient Name", "Amount", "Date", "Payment Link", "Phone"],
    },
    {
        id: "w9", trigger: "Appointment", name: "No-Show / Late Arrival", timing: "15+ min past appointment time", status: "active",
        preview: "Hi [Patient Name], we noticed you missed your [Time] session today. We hope everything is okay! Would you like to reschedule? Reply with a preferred time or call [Phone]. Your health matters to us 💙",
        variables: ["Patient Name", "Time", "Phone"],
    },
    {
        id: "w10", trigger: "Emergency", name: "High-Risk Patient Alert", timing: "When patient reports worsening", status: "draft",
        preview: "⚠️ ALERT for [Doctor Name]: Patient [Patient Name] has reported worsening symptoms on [Date]. Immediate consultation recommended. Please review their file and contact them at [Patient Phone].",
        variables: ["Doctor Name", "Patient Name", "Date", "Patient Phone"],
    },
];

const TRIGGER_COLORS: Record<string, string> = {
    Registration: "bg-violet-100 text-violet-700",
    Appointment: "bg-blue-100 text-blue-700",
    "Post-Session": "bg-emerald-100 text-emerald-700",
    "Follow-Up": "bg-amber-100 text-amber-700",
    Payment: "bg-pink-100 text-pink-700",
    Emergency: "bg-red-100 text-red-600",
};

export default function WhatsAppPage() {
    const [search, setSearch] = useState("");
    const [trigger, setTrigger] = useState("All");
    const [expanded, setExpanded] = useState<string | null>(null);

    const filtered = MESSAGES.filter((m) => {
        const matchSearch = m.name.toLowerCase().includes(search.toLowerCase());
        const matchTrigger = trigger === "All" || m.trigger === trigger;
        return matchSearch && matchTrigger;
    });

    return (
        <div className="flex flex-col gap-4 p-4 md:p-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight">WhatsApp Messages</h1>
                    <p className="text-sm text-muted-foreground mt-0.5 hidden sm:block">Manage automated message templates sent to patients at key triggers.</p>
                </div>
                <Button size="sm" className="gap-1.5 rounded-xl shrink-0">
                    <Plus className="w-4 h-4" /> <span className="hidden sm:inline">New Template</span>
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: "Active Templates", value: MESSAGES.filter(m => m.status === "active").length, color: "text-emerald-600" },
                    { label: "Draft Templates", value: MESSAGES.filter(m => m.status === "draft").length, color: "text-amber-600" },
                    { label: "Trigger Types", value: TRIGGERS.length - 1, color: "text-blue-600" },
                    { label: "Sent This Month", value: "284", color: "text-violet-600" },
                ].map((s) => (
                    <div key={s.label} className="bg-white rounded-2xl p-4 space-y-1">
                        <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Search + Trigger filter */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input placeholder="Search templates..." className="pl-9 rounded-xl bg-white" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <div className="flex items-center gap-1 bg-white rounded-xl p-1 overflow-x-auto w-full sm:w-auto">
                    {TRIGGERS.map((t) => (
                        <button key={t} onClick={() => setTrigger(t)} className={cn("px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap", trigger === t ? "bg-foreground text-white" : "text-muted-foreground hover:text-foreground")}>
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            {/* Template list */}
            <div className="space-y-2">
                {filtered.map((m) => {
                    const isOpen = expanded === m.id;
                    return (
                        <div key={m.id} className="bg-white rounded-2xl overflow-hidden">
                            <div
                                className="flex items-center gap-4 px-4 md:px-5 py-3.5 cursor-pointer hover:bg-muted/20 transition-colors"
                                onClick={() => setExpanded(isOpen ? null : m.id)}
                            >
                                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", TRIGGER_COLORS[m.trigger] ?? "bg-muted text-muted-foreground")}>
                                    <MessageCircle className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-semibold text-sm">{m.name}</p>
                                        <Badge variant="outline" className={cn("text-[10px] rounded-full px-2 font-medium capitalize", m.status === "active" ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-muted-foreground/20 text-muted-foreground")}>
                                            {m.status}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-1 mt-0.5">
                                        <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                                        <p className="text-xs text-muted-foreground truncate">{m.timing}</p>
                                    </div>
                                </div>
                                <div className="hidden sm:flex items-center gap-2 shrink-0">
                                    <span className={cn("text-[11px] font-medium px-2.5 py-1 rounded-full", TRIGGER_COLORS[m.trigger] ?? "bg-muted text-muted-foreground")}>
                                        {m.trigger}
                                    </span>
                                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                        <Zap className="w-3 h-3" />
                                        {m.variables.length} vars
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <button className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted" onClick={(ev) => { ev.stopPropagation(); }}><Pencil className="w-3.5 h-3.5" /></button>
                                    <button className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors rounded-lg hover:bg-red-50" onClick={(ev) => { ev.stopPropagation(); }}><Trash2 className="w-3.5 h-3.5" /></button>
                                    {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground ml-1" /> : <ChevronDown className="w-4 h-4 text-muted-foreground ml-1" />}
                                </div>
                            </div>
                            {isOpen && (
                                <div className="border-t border-border/60 px-4 md:px-5 py-4 bg-muted/20 space-y-3">
                                    <div>
                                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Message Preview</p>
                                        <div className="bg-white rounded-xl p-4 text-sm text-muted-foreground leading-relaxed whitespace-pre-line border border-border/60">
                                            {m.preview}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Variables Used</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {m.variables.map((v) => (
                                                <span key={v} className="text-[11px] bg-foreground/10 text-foreground px-2 py-0.5 rounded-full font-mono font-medium">[{v}]</span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="outline" className="rounded-xl text-xs gap-1.5"><Pencil className="w-3 h-3" /> Edit Template</Button>
                                        <Button size="sm" className="rounded-xl text-xs">Send Test</Button>
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
