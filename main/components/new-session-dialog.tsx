"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Search, UserPlus, ChevronRight } from "lucide-react";

const DOCTORS = [
    { id: "d1", name: "Dr. Priya Sharma", available: true },
    { id: "d2", name: "Dr. Arjun Nair", available: true },
    { id: "d3", name: "Dr. Meera Iyer", available: false },
];

const SESSION_TYPES = [
    "Initial Evaluation",
    "Follow-Up Session",
    "Discharge Assessment",
    "Group Therapy",
];

const MOCK_PATIENTS = [
    { id: "p1", name: "Aisha Mehta", age: 34, phone: "+91 98765 43210" },
    { id: "p2", name: "Rohan Kapoor", age: 28, phone: "+91 87654 32109" },
    { id: "p3", name: "Sunita Rao", age: 52, phone: "+91 76543 21098" },
];

type Step = "patient" | "session";

export default function NewSessionDialog({
    open,
    onClose,
    defaultDate,
}: {
    open: boolean;
    onClose: () => void;
    defaultDate: Date;
}) {
    const [step, setStep] = useState<Step>("patient");
    const [patientMode, setPatientMode] = useState<"existing" | "new">("existing");
    const [search, setSearch] = useState("");
    const [selectedPatient, setSelectedPatient] = useState<(typeof MOCK_PATIENTS)[0] | null>(null);

    // New patient fields
    const [newName, setNewName] = useState("");
    const [newAge, setNewAge] = useState("");
    const [newGender, setNewGender] = useState("");
    const [newPhone, setNewPhone] = useState("");
    const [complaints, setComplaints] = useState("");

    // Session fields
    const [doctor, setDoctor] = useState("");
    const [sessionType, setSessionType] = useState("");
    const [date, setDate] = useState(defaultDate.toISOString().split("T")[0]);
    const [time, setTime] = useState("09:00");
    const [notes, setNotes] = useState("");

    const filteredPatients = MOCK_PATIENTS.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase())
    );

    const handleClose = () => {
        setStep("patient");
        setSelectedPatient(null);
        setSearch("");
        onClose();
    };

    const canProceed =
        step === "patient"
            ? patientMode === "existing"
                ? !!selectedPatient
                : !!newName && !!newAge && !!newGender
            : !!doctor && !!sessionType && !!date && !!time;

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-lg p-0 overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
                    <DialogTitle className="text-base">Book New Session</DialogTitle>
                    {/* Step indicator */}
                    <div className="flex items-center gap-2 mt-3">
                        {(["patient", "session"] as Step[]).map((s, i) => (
                            <div key={s} className="flex items-center gap-2">
                                <div className="flex items-center gap-1.5">
                                    <div
                                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${step === s
                                                ? "bg-foreground text-white"
                                                : i < (step === "session" ? 1 : 0)
                                                    ? "bg-emerald-500 text-white"
                                                    : "bg-muted text-muted-foreground"
                                            }`}
                                    >
                                        {i + 1}
                                    </div>
                                    <span
                                        className={`text-xs font-medium capitalize ${step === s ? "text-foreground" : "text-muted-foreground"
                                            }`}
                                    >
                                        {s === "patient" ? "Patient" : "Session Details"}
                                    </span>
                                </div>
                                {i < 1 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                            </div>
                        ))}
                    </div>
                </DialogHeader>

                <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
                    {/* ── Step 1: Patient ── */}
                    {step === "patient" && (
                        <>
                            {/* Toggle */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPatientMode("existing")}
                                    className={`flex-1 py-2 text-xs font-medium rounded-md border transition-colors ${patientMode === "existing"
                                            ? "bg-foreground text-white border-foreground"
                                            : "border-border text-muted-foreground hover:bg-muted"
                                        }`}
                                >
                                    Existing Patient
                                </button>
                                <button
                                    onClick={() => setPatientMode("new")}
                                    className={`flex-1 py-2 text-xs font-medium rounded-md border transition-colors ${patientMode === "new"
                                            ? "bg-foreground text-white border-foreground"
                                            : "border-border text-muted-foreground hover:bg-muted"
                                        }`}
                                >
                                    <UserPlus className="w-3.5 h-3.5 inline mr-1" />
                                    New Patient
                                </button>
                            </div>

                            {patientMode === "existing" ? (
                                <>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                        <Input
                                            placeholder="Search by name or phone..."
                                            className="pl-8 text-sm"
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                        {filteredPatients.map((p) => (
                                            <button
                                                key={p.id}
                                                onClick={() => setSelectedPatient(p)}
                                                className={`w-full text-left px-3 py-2.5 rounded-md border transition-colors ${selectedPatient?.id === p.id
                                                        ? "border-foreground bg-muted"
                                                        : "border-border hover:bg-muted"
                                                    }`}
                                            >
                                                <p className="text-sm font-medium">{p.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Age {p.age} · {p.phone}
                                                </p>
                                            </button>
                                        ))}
                                        {filteredPatients.length === 0 && (
                                            <p className="text-xs text-muted-foreground text-center py-4">
                                                No patients found.
                                            </p>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="col-span-2 space-y-1">
                                            <Label className="text-xs">Full Name *</Label>
                                            <Input
                                                placeholder="Patient's full name"
                                                className="text-sm"
                                                value={newName}
                                                onChange={(e) => setNewName(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Age *</Label>
                                            <Input
                                                placeholder="e.g. 34"
                                                type="number"
                                                className="text-sm"
                                                value={newAge}
                                                onChange={(e) => setNewAge(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Gender *</Label>
                                            <Select value={newGender} onValueChange={setNewGender}>
                                                <SelectTrigger className="text-sm">
                                                    <SelectValue placeholder="Select" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="male">Male</SelectItem>
                                                    <SelectItem value="female">Female</SelectItem>
                                                    <SelectItem value="other">Other</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="col-span-2 space-y-1">
                                            <Label className="text-xs">Phone Number</Label>
                                            <Input
                                                placeholder="+91 98765 43210"
                                                className="text-sm"
                                                value={newPhone}
                                                onChange={(e) => setNewPhone(e.target.value)}
                                            />
                                        </div>
                                        <div className="col-span-2 space-y-1">
                                            <Label className="text-xs">Presenting Complaints *</Label>
                                            <Textarea
                                                placeholder="e.g. Lower back pain for 3 weeks, post-surgical rehab..."
                                                className="text-sm resize-none"
                                                rows={3}
                                                value={complaints}
                                                onChange={(e) => setComplaints(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* ── Step 2: Session Details ── */}
                    {step === "session" && (
                        <div className="space-y-3">
                            {/* Patient summary */}
                            <div className="flex items-center gap-2 bg-muted rounded-md px-3 py-2">
                                <div className="w-6 h-6 rounded-full bg-foreground/10 flex items-center justify-center text-[10px] font-bold">
                                    {(selectedPatient?.name ?? newName).charAt(0)}
                                </div>
                                <div>
                                    <p className="text-xs font-medium">{selectedPatient?.name ?? newName}</p>
                                    <p className="text-[11px] text-muted-foreground">
                                        {selectedPatient ? `Age ${selectedPatient.age}` : `Age ${newAge}`}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs">Date *</Label>
                                    <Input
                                        type="date"
                                        className="text-sm"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Time *</Label>
                                    <Input
                                        type="time"
                                        className="text-sm"
                                        value={time}
                                        onChange={(e) => setTime(e.target.value)}
                                    />
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <Label className="text-xs">Session Type *</Label>
                                    <Select value={sessionType} onValueChange={setSessionType}>
                                        <SelectTrigger className="text-sm">
                                            <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {SESSION_TYPES.map((t) => (
                                                <SelectItem key={t} value={t}>{t}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <Label className="text-xs">Available Doctor *</Label>
                                    <div className="space-y-1.5">
                                        {DOCTORS.map((d) => (
                                            <button
                                                key={d.id}
                                                disabled={!d.available}
                                                onClick={() => setDoctor(d.id)}
                                                className={`w-full text-left px-3 py-2 rounded-md border text-sm transition-colors flex items-center justify-between ${!d.available
                                                        ? "opacity-40 cursor-not-allowed border-border"
                                                        : doctor === d.id
                                                            ? "border-foreground bg-muted"
                                                            : "border-border hover:bg-muted"
                                                    }`}
                                            >
                                                <span className="font-medium">{d.name}</span>
                                                <Badge
                                                    variant="outline"
                                                    className={`text-[10px] ${d.available
                                                            ? "border-emerald-300 text-emerald-600 bg-emerald-50"
                                                            : "border-red-200 text-red-500 bg-red-50"
                                                        }`}
                                                >
                                                    {d.available ? "Available" : "Unavailable"}
                                                </Badge>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <Label className="text-xs">Pre-session Notes (optional)</Label>
                                    <Textarea
                                        placeholder="Any notes from the intake call..."
                                        className="text-sm resize-none"
                                        rows={2}
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-border flex items-center justify-between">
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={step === "patient" ? handleClose : () => setStep("patient")}
                    >
                        {step === "patient" ? "Cancel" : "Back"}
                    </Button>
                    <Button
                        size="sm"
                        className="text-xs"
                        disabled={!canProceed}
                        onClick={() => {
                            if (step === "patient") setStep("session");
                            else handleClose();
                        }}
                    >
                        {step === "patient" ? "Next: Session Details →" : "Confirm Booking"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
