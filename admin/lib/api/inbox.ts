import { request } from "./core";

export interface InAppNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  metadata: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export interface InboxCounts {
  mail: number;
  notifications: number;
}

export const inboxApi = {
  list: (type: "mail" | "notifications" | "all" = "all", page = 1, limit = 30) =>
    request<{ notifications: InAppNotification[]; total: number }>(
      `/notifications/inbox?type=${type}&page=${page}&limit=${limit}`
    ),

  counts: () => request<InboxCounts>("/notifications/inbox/counts"),

  markRead: (id: string) =>
    request<null>(`/notifications/inbox/${id}/read`, { method: "PATCH" }),

  markAllRead: (type: "mail" | "notifications" | "all") =>
    request<null>(`/notifications/inbox/read-all?type=${type}`, { method: "PATCH" }),
};
