"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

// Receptionists do not go through clinic onboarding — redirect to dashboard
export default function OnboardingPage() {
    const router = useRouter();
    useEffect(() => { router.replace("/dashboard"); }, [router]);
    return (
        <div className="h-screen flex items-center justify-center bg-[#0A0E28]">
            <Loader2 className="w-8 h-8 text-[#2493A2] animate-spin" />
        </div>
    );
}
