"use client";

import { Bell, Lock, Palette, Globe, Database, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SETTINGS_SECTIONS = [
    { icon: Palette, label: "Clinic Branding", desc: "Logo, name, and colour theme", color: "bg-violet-100 text-violet-700" },
    { icon: Bell, label: "Notifications", desc: "Email and in-app alert preferences", color: "bg-amber-100 text-amber-700" },
    { icon: Lock, label: "Security & Access", desc: "Password policy and 2FA settings", color: "bg-red-100 text-red-700" },
    { icon: Globe, label: "Timezone & Locale", desc: "Regional settings and date formats", color: "bg-blue-100 text-blue-700" },
    { icon: Database, label: "Data & Backups", desc: "Export data and manage backups", color: "bg-emerald-100 text-emerald-700" },
];

export default function SettingsPage() {
    return (
        <div className="flex flex-col gap-4 p-5 max-w-2xl">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Configure your clinic's preferences and system settings.</p>
            </div>

            <div className="space-y-2">
                {SETTINGS_SECTIONS.map((s) => (
                    <div key={s.label} className="bg-white rounded-2xl px-5 py-4 flex items-center gap-4 cursor-pointer hover:shadow-sm transition-shadow group">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", s.color)}>
                            <s.icon className="w-4.5 h-4.5" />
                        </div>
                        <div className="flex-1">
                            <p className="font-semibold text-sm">{s.label}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                ))}
            </div>

            <div className="bg-foreground text-white rounded-2xl p-5 flex items-center justify-between mt-2">
                <div>
                    <p className="font-bold">ProHuman Health Admin</p>
                    <p className="text-xs text-white/60 mt-0.5">Version 1.0.0 · All systems operational</p>
                </div>
                <Button variant="outline" size="sm" className="rounded-xl text-xs bg-white/10 border-white/20 text-white hover:bg-white/20">
                    Check for Updates
                </Button>
            </div>
        </div>
    );
}
