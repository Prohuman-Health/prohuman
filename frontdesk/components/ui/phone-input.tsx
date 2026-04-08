"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const COUNTRY_CODES = [
    { code: "+91", country: "IN", flag: "🇮🇳" },
    { code: "+1", country: "US", flag: "🇺🇸" },
    { code: "+44", country: "GB", flag: "🇬🇧" },
    { code: "+971", country: "AE", flag: "🇦🇪" },
    { code: "+65", country: "SG", flag: "🇸🇬" },
    { code: "+60", country: "MY", flag: "🇲🇾" },
    { code: "+61", country: "AU", flag: "🇦🇺" },
    { code: "+49", country: "DE", flag: "🇩🇪" },
    { code: "+33", country: "FR", flag: "🇫🇷" },
    { code: "+81", country: "JP", flag: "🇯🇵" },
] as const;

interface PhoneInputProps {
    value: string;          // stores full number e.g. "+91 9876543210"
    onChange: (full: string) => void;
    error?: string;
    placeholder?: string;
    required?: boolean;
    className?: string;
}

/** Split "+91 9876543210" → { dialCode: "+91", local: "9876543210" } */
function splitPhone(value: string): { dialCode: string; local: string } {
    for (const c of COUNTRY_CODES) {
        if (value.startsWith(c.code + " ")) {
            return { dialCode: c.code, local: value.slice(c.code.length + 1) };
        }
        if (value.startsWith(c.code)) {
            return { dialCode: c.code, local: value.slice(c.code.length) };
        }
    }
    // Fallback – treat whole thing as local under +91
    return { dialCode: "+91", local: value };
}

export function PhoneInput({ value, onChange, error, placeholder = "98765 43210", className }: PhoneInputProps) {
    const { dialCode: initDial, local: initLocal } = splitPhone(value);
    const [dialCode, setDialCode] = useState(initDial);
    const [local, setLocal] = useState(initLocal);

    function handleDialChange(code: string) {
        setDialCode(code);
        onChange(local ? `${code} ${local}` : "");
    }

    function handleLocalChange(e: React.ChangeEvent<HTMLInputElement>) {
        // Only allow digits (strip everything else)
        const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
        setLocal(digits);
        onChange(digits ? `${dialCode} ${digits}` : "");
    }

    const hasError = !!error;

    return (
        <div className="space-y-1">
            <div className={cn(
                "flex items-center rounded-xl border bg-background overflow-hidden transition-colors",
                hasError ? "border-red-400" : "border-input focus-within:ring-1 focus-within:ring-ring",
                className,
            )}>
                {/* Country code dropdown */}
                <select
                    value={dialCode}
                    onChange={e => handleDialChange(e.target.value)}
                    className="h-10 pl-2 pr-1 text-sm bg-muted/60 border-r border-input focus:outline-none cursor-pointer shrink-0"
                    style={{ minWidth: "72px" }}
                >
                    {COUNTRY_CODES.map(c => (
                        <option key={c.code} value={c.code}>
                            {c.flag} {c.code}
                        </option>
                    ))}
                </select>

                {/* Local number input */}
                <input
                    type="tel"
                    inputMode="numeric"
                    value={local}
                    onChange={handleLocalChange}
                    placeholder={placeholder}
                    maxLength={10}
                    className="flex-1 h-10 px-3 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                />

                {/* Digit counter */}
                <span className={cn(
                    "pr-3 text-[11px] font-medium tabular-nums shrink-0",
                    local.length === 10 ? "text-emerald-600" : "text-muted-foreground/60",
                )}>
                    {local.length}/10
                </span>
            </div>
        </div>
    );
}

/** Validates the local part is exactly 10 digits */
export function validatePhone(value: string): string | null {
    const { local } = splitPhone(value);
    if (!value || !local) return "Phone number is required";
    if (local.replace(/\D/g, "").length !== 10) return "Enter a valid 10-digit phone number";
    return null;
}
