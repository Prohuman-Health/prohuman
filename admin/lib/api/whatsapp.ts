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
};
