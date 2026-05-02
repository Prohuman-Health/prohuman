import { request } from "./core";

export interface WhatsAppTemplate {
    id: string;
    name: string;
    trigger: string; // e.g. "registration", "appointment", "post_session"…
    body: string;
    is_active: boolean;
    variables: string[] | null;
    updated_at: string;
    updated_by_name?: string | null;
}

export interface WhatsAppAuthStatus {
    connected: boolean;
    connecting: boolean;
    reconnecting: boolean;
    reconnect_attempt: number;
    qr_available: boolean;
    qr_data_url: string | null;
    qr_expires_at: string | null;
    connected_jid: string | null;
    connected_whatsapp_number: string | null;
    last_error: string | null;
    updated_at: string;
}

export type RecipientType = "patient" | "doctor" | "custom";
export interface RecipientEntry {
    type: RecipientType;
    phone?: string;  // required when type === "custom"
    label?: string;  // display label for custom entries
}
export interface NotificationConditions {
    session_type_ids?: string[];
    branch_ids?: string[];
}
export interface NotificationRule {
    id: string;
    name: string;
    trigger: string;
    template_id: string;
    template_name?: string | null;
    template_trigger?: string | null;
    recipients: RecipientEntry[];
    delay_minutes: number;
    is_enabled: boolean;
    conditions: NotificationConditions;
    created_by_name?: string | null;
    updated_by_name?: string | null;
    created_at: string;
    updated_at: string;
}

export const whatsappApi = {
    list: () => request<WhatsAppTemplate[]>("/whatsapp"),
    get: (id: string) => request<WhatsAppTemplate>(`/whatsapp/${id}`),
    update: (id: string, data: { name?: string; body?: string; is_active?: boolean }) =>
        request<WhatsAppTemplate>(`/whatsapp/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    preview: (id: string, variables: Record<string, string>) =>
        request<{ preview: string }>(`/whatsapp/${id}/preview`, { method: "POST", body: JSON.stringify(variables) }),
    bulkToggle: (ids: string[], is_active: boolean) =>
        request<null>("/whatsapp/bulk/toggle", { method: "POST", body: JSON.stringify({ ids, is_active }) }),
    getAuthStatus: () => request<WhatsAppAuthStatus>("/whatsapp/auth/status"),
    generateQr: () => request<WhatsAppAuthStatus>("/whatsapp/auth/qr", { method: "POST" }),
    logoutAuth: () => request<{ logged_out: boolean }>("/whatsapp/auth/logout", { method: "POST" }),

    // Notification rules
    listRules: () => request<NotificationRule[]>("/whatsapp/rules"),
    createRule: (data: {
        name: string;
        trigger: string;
        template_id: string;
        recipients: RecipientEntry[];
        delay_minutes: number;
        conditions: NotificationConditions;
    }) => request<NotificationRule>("/whatsapp/rules", { method: "POST", body: JSON.stringify(data) }),
    updateRule: (id: string, data: Partial<{
        name: string;
        trigger: string;
        template_id: string;
        recipients: RecipientEntry[];
        delay_minutes: number;
        is_enabled: boolean;
        conditions: NotificationConditions;
    }>) => request<NotificationRule>(`/whatsapp/rules/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    deleteRule: (id: string) => request<null>(`/whatsapp/rules/${id}`, { method: "DELETE" }),
};
