import { request } from "./core";

export interface PatientLabel {
    id: string;
    name: string;
    color: string;
    branch_id: string | null;
    created_at?: string;
}

export interface LabelAuditEntry {
    id: string;
    patient_id: string;
    label_id: string;
    action: "assigned" | "removed";
    actor_id: string | null;
    actor_name: string | null;
    label_name: string;
    label_color: string;
    created_at: string;
    // joined fields (clinic-wide endpoint only)
    patient_name?: string;
    patient_code?: string;
}

export const patientLabelsApi = {
    listDefinitions: () =>
        request<PatientLabel[]>("/patient-labels/labels"),
    create: (data: { name: string; color: string; branch_id?: string | null }) =>
        request<PatientLabel>("/patient-labels/labels", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: { name?: string; color?: string }) =>
        request<PatientLabel>(`/patient-labels/labels/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) =>
        request<null>(`/patient-labels/labels/${id}`, { method: "DELETE" }),
    labelsMap: () =>
        request<Record<string, PatientLabel[]>>("/patient-labels/labels-map"),
    getForPatient: (id: string) =>
        request<PatientLabel[]>(`/patient-labels/${id}/labels`),
    getAudit: (patientId: string) =>
        request<LabelAuditEntry[]>(`/patient-labels/${patientId}/label-audit`),
    getRecentActivity: () =>
        request<LabelAuditEntry[]>("/patient-labels/label-activity"),
    assign: (patientId: string, labelId: string) =>
        request<unknown>(`/patient-labels/${patientId}/labels`, { method: "POST", body: JSON.stringify({ label_id: labelId }) }),
    remove: (patientId: string, labelId: string) =>
        request<null>(`/patient-labels/${patientId}/labels/${labelId}`, { method: "DELETE" }),
};
