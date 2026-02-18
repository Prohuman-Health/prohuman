"use client";

import { X, Calendar, Clock, User, Stethoscope, FileText, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Session = {
    id: string;
    patientName: string;
    sessionType: string;
    doctor: string;
    doctorInitials: string;
    startTime: string;
    endTime: string;
    color: string;
    textColor: string;
    date: string;
    status: "confirmed" | "pending" | "cancelled";
    notes?: string;
};

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return `${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d.getDay()]}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export default function SessionDetailPanel({
    session,
    onClose,
}: {
    session: Session;
    onClose: () => void;
}) {
    return (
        <div className="w-[280px] shrink-0 border-l border-border bg-white flex flex-col overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h2 className="font-semibold text-sm">Session Details</h2>
                <button
                    onClick={onClose}
                    className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="p-5 space-y-5">
                {/* Patient */}
                <div>
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-base">{session.patientName}</h3>
                        <Badge
                            variant="outline"
                            className={cn(
                                "text-[10px] capitalize",
                                session.status === "confirmed"
                                    ? "border-emerald-300 text-emerald-600 bg-emerald-50"
                                    : session.status === "pending"
                                        ? "border-amber-300 text-amber-600 bg-amber-50"
                                        : "border-red-300 text-red-600 bg-red-50"
                            )}
                        >
                            {session.status}
                        </Badge>
                    </div>
                    <p className={cn("text-xs font-medium", session.textColor)}>{session.sessionType}</p>
                </div>

                {/* Details */}
                <div className="space-y-3">
                    <div className="flex items-start gap-2.5">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                            <p className="text-xs text-muted-foreground">Date</p>
                            <p className="text-xs font-medium">{formatDate(session.date)}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                            <p className="text-xs text-muted-foreground">Time</p>
                            <p className="text-xs font-medium">
                                {session.startTime} – {session.endTime}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                        <Stethoscope className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                            <p className="text-xs text-muted-foreground">Doctor</p>
                            <p className="text-xs font-medium">{session.doctor}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                        <User className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                            <p className="text-xs text-muted-foreground">Patient ID</p>
                            <p className="text-xs font-medium text-muted-foreground">PHC-{session.id.toUpperCase()}</p>
                        </div>
                    </div>
                </div>

                {/* Notes */}
                {session.notes && (
                    <div>
                        <div className="flex items-center gap-1.5 mb-2">
                            <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Intake Notes</p>
                        </div>
                        <p className="text-xs text-muted-foreground bg-muted rounded-md p-3 leading-relaxed">
                            {session.notes}
                        </p>
                    </div>
                )}

                {/* Attendance */}
                <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Mark Attendance
                    </p>
                    <div className="flex gap-2">
                        <Button size="sm" className="flex-1 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Attended
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 text-xs gap-1.5 border-red-200 text-red-600 hover:bg-red-50">
                            <XCircle className="w-3.5 h-3.5" />
                            No-Show
                        </Button>
                    </div>
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-1">
                    <Button variant="outline" size="sm" className="w-full text-xs">
                        Reschedule Session
                    </Button>
                    <Button variant="outline" size="sm" className="w-full text-xs text-red-600 border-red-200 hover:bg-red-50">
                        Cancel Session
                    </Button>
                </div>
            </div>
        </div>
    );
}
