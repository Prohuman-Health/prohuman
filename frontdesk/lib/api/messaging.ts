import { request } from "./core";

export interface StaffChannel {
    id: string;
    name: string;
    description: string | null;
    type: "group" | "direct";
    is_archived: boolean;
    created_at: string;
    last_read_at: string | null;
    unread_count: number;
    last_message: string | null;
    last_message_at: string | null;
    dm_other_name: string | null;
    dm_other_id: string | null;
}

export interface StaffMessage {
    id: string;
    channel_id: string;
    sender_id: string;
    sender_name: string | null;
    body: string;
    is_deleted: boolean;
    created_at: string;
    updated_at: string;
}

export interface ChannelMember {
    id: string;
    full_name: string;
    role: string;
    email: string;
    joined_at: string;
}

export const messagingApi = {
    listChannels: () =>
        request<StaffChannel[]>("/messages/channels"),
    createOrGetDM: (other_staff_id: string) =>
        request<{ id: string; existing: boolean }>("/messages/dm", { method: "POST", body: JSON.stringify({ other_staff_id }) }),
    getMessages: (channelId: string, before?: string) =>
        request<StaffMessage[]>(`/messages/channels/${channelId}/messages${before ? `?before=${encodeURIComponent(before)}` : ""}`),
    sendMessage: (channelId: string, body: string) =>
        request<StaffMessage>(`/messages/channels/${channelId}/messages`, { method: "POST", body: JSON.stringify({ body }) }),
    markRead: (channelId: string) =>
        request<{ ok: boolean }>(`/messages/channels/${channelId}/read`, { method: "PATCH" }),
    getMembers: (channelId: string) =>
        request<ChannelMember[]>(`/messages/channels/${channelId}/members`),
};
