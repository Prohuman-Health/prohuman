"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
    MessageCircle, Hash, Plus, Send, Users, Search,
    ChevronRight, Lock, Loader2, RefreshCw, X, MessagesSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { messagingApi, StaffChannel, StaffMessage, staffApi, StaffMember } from "@/lib/api";

// ── Helpers ─────────────────────────────────────────────────────────────────

function timeLabel(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays === 0) return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return d.toLocaleDateString("en-IN", { weekday: "short" });
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
    const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
    const colors = ["bg-teal-100 text-teal-700", "bg-blue-100 text-blue-700", "bg-purple-100 text-purple-700", "bg-amber-100 text-amber-700"];
    const color = colors[name.charCodeAt(0) % colors.length];
    return (
        <div className={cn("rounded-full flex items-center justify-center font-semibold shrink-0", color,
            size === "sm" ? "w-7 h-7 text-[10px]" : "w-9 h-9 text-xs")}>
            {initials}
        </div>
    );
}

// ── Channel List Item ────────────────────────────────────────────────────────

function ChannelItem({ channel, active, onClick }: {
    channel: StaffChannel;
    active: boolean;
    onClick: () => void;
}) {
    const displayName = channel.type === "direct" ? (channel.dm_other_name ?? channel.name) : channel.name;
    return (
        <button onClick={onClick} className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors",
            active ? "bg-[#2493A2]/10 text-[#2493A2]" : "hover:bg-muted/60 text-foreground"
        )}>
            {channel.type === "direct"
                ? <Avatar name={displayName} size="sm" />
                : <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
            }
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold truncate">{displayName}</span>
                    {channel.last_message_at && (
                        <span className="text-[10px] text-muted-foreground shrink-0 ml-1">{timeLabel(channel.last_message_at)}</span>
                    )}
                </div>
                {channel.last_message && (
                    <p className="text-[11px] text-muted-foreground truncate">{channel.last_message}</p>
                )}
            </div>
            {channel.unread_count > 0 && (
                <span className="shrink-0 min-w-[18px] h-[18px] rounded-full bg-[#2493A2] text-white text-[10px] font-semibold flex items-center justify-center px-1">
                    {channel.unread_count > 99 ? "99+" : channel.unread_count}
                </span>
            )}
        </button>
    );
}

// ── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg, isOwn, showSender }: { msg: StaffMessage; isOwn: boolean; showSender: boolean }) {
    return (
        <div className={cn("flex gap-2 max-w-[75%]", isOwn ? "ml-auto flex-row-reverse" : "")}>
            {!isOwn && showSender && <Avatar name={msg.sender_name ?? "?"} size="sm" />}
            {!isOwn && !showSender && <div className="w-7 shrink-0" />}
            <div>
                {showSender && !isOwn && (
                    <p className="text-[10px] font-semibold text-muted-foreground mb-0.5 ml-1">{msg.sender_name}</p>
                )}
                <div className={cn(
                    "px-3 py-2 rounded-2xl text-sm leading-relaxed",
                    isOwn
                        ? "bg-[#2493A2] text-white rounded-tr-sm"
                        : "bg-white border border-border/60 rounded-tl-sm"
                )}>
                    {msg.body}
                </div>
                <p className={cn("text-[10px] text-muted-foreground mt-0.5", isOwn ? "text-right mr-1" : "ml-1")}>
                    {new Date(msg.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </p>
            </div>
        </div>
    );
}

// ── New Channel Dialog ────────────────────────────────────────────────────────

function NewChannelDialog({ onClose, onCreate }: {
    onClose: () => void;
    onCreate: (ch: StaffChannel) => void;
}) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    async function submit() {
        if (!name.trim()) { setErr("Channel name is required"); return; }
        setSaving(true); setErr(null);
        try {
            const ch = await messagingApi.createChannel({ name: name.trim(), description: description.trim() || undefined });
            onCreate(ch);
        } catch (e: unknown) {
            setErr(e instanceof Error ? e.message : "Failed to create channel");
        } finally { setSaving(false); }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="font-semibold text-base">New Channel</h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                </div>
                <div className="space-y-3">
                    <Input placeholder="Channel name" value={name} onChange={e => setName(e.target.value)} className="rounded-xl h-9 text-sm" />
                    <Input placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} className="rounded-xl h-9 text-sm" />
                    {err && <p className="text-xs text-red-500">{err}</p>}
                </div>
                <div className="flex gap-2 mt-5">
                    <Button variant="outline" className="flex-1 rounded-xl h-9 text-sm" onClick={onClose}>Cancel</Button>
                    <Button className="flex-1 rounded-xl h-9 text-sm bg-[#2493A2] hover:bg-[#1e7d8c]" onClick={submit} disabled={saving}>
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Create"}
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ── New DM Dialog ─────────────────────────────────────────────────────────────

function NewDMDialog({ onClose, onDM }: { onClose: () => void; onDM: (id: string) => void }) {
    const [staffList, setStaffList] = useState<StaffMember[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [starting, setStarting] = useState<string | null>(null);

    useEffect(() => {
        staffApi.list().then(setStaffList).catch(() => {}).finally(() => setLoading(false));
    }, []);

    const filtered = staffList.filter(s =>
        s.full_name.toLowerCase().includes(search.toLowerCase()) ||
        (s.email ?? "").toLowerCase().includes(search.toLowerCase())
    );

    async function startDM(staffId: string) {
        setStarting(staffId);
        try {
            const { id } = await messagingApi.createOrGetDM(staffId);
            onDM(id);
        } catch { /* ignore */ } finally { setStarting(null); }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-base">New Direct Message</h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                </div>
                <Input placeholder="Search staff…" value={search} onChange={e => setSearch(e.target.value)} className="rounded-xl h-9 text-sm mb-3" />
                <div className="space-y-1 max-h-64 overflow-y-auto">
                    {loading && <p className="text-xs text-muted-foreground text-center py-4">Loading…</p>}
                    {filtered.map(s => (
                        <button key={s.id} onClick={() => startDM(s.id)}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-muted/60 transition-colors text-left">
                            <Avatar name={s.full_name} size="sm" />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{s.full_name}</p>
                                <p className="text-[10px] text-muted-foreground capitalize">{s.role}</p>
                            </div>
                            {starting === s.id
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                                : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                            }
                        </button>
                    ))}
                    {!loading && filtered.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No staff found</p>}
                </div>
            </div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MessagingPage() {
    const [channels, setChannels] = useState<StaffChannel[]>([]);
    const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
    const [messages, setMessages] = useState<StaffMessage[]>([]);
    const [loadingChannels, setLoadingChannels] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [channelSearch, setChannelSearch] = useState("");
    const [draft, setDraft] = useState("");
    const [sending, setSending] = useState(false);
    const [showNewChannel, setShowNewChannel] = useState(false);
    const [showNewDM, setShowNewDM] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Current user id from JWT (stored in localStorage by auth context)
    const [myId, setMyId] = useState<string | null>(null);
    useEffect(() => {
        try {
            const token = localStorage.getItem("auth_token");
            if (token) {
                const payload = JSON.parse(atob(token.split(".")[1]));
                setMyId(payload.sub ?? null);
            }
        } catch { /* ignore */ }
    }, []);

    const loadChannels = useCallback(async () => {
        try {
            const chs = await messagingApi.listChannels();
            setChannels(chs);
        } catch { /* silent */ } finally { setLoadingChannels(false); }
    }, []);

    const loadMessages = useCallback(async (channelId: string) => {
        setLoadingMessages(true);
        try {
            const msgs = await messagingApi.getMessages(channelId);
            setMessages(msgs);
            await messagingApi.markRead(channelId);
            // Update unread count locally
            setChannels(prev => prev.map(c => c.id === channelId ? { ...c, unread_count: 0 } : c));
        } catch { /* silent */ } finally { setLoadingMessages(false); }
    }, []);

    useEffect(() => { loadChannels(); }, [loadChannels]);

    useEffect(() => {
        if (activeChannelId) {
            loadMessages(activeChannelId);
        }
    }, [activeChannelId, loadMessages]);

    // Poll every 10s when a channel is open
    useEffect(() => {
        if (pollRef.current) clearInterval(pollRef.current);
        if (!activeChannelId) return;
        pollRef.current = setInterval(async () => {
            try {
                const msgs = await messagingApi.getMessages(activeChannelId);
                setMessages(msgs);
                const chs = await messagingApi.listChannels();
                setChannels(chs.map(c => c.id === activeChannelId ? { ...c, unread_count: 0 } : c));
                await messagingApi.markRead(activeChannelId);
            } catch { /* silent */ }
        }, 10000);
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [activeChannelId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    async function sendMessage() {
        if (!draft.trim() || !activeChannelId || sending) return;
        setSending(true);
        const text = draft.trim();
        setDraft("");
        try {
            const msg = await messagingApi.sendMessage(activeChannelId, text);
            setMessages(prev => [...prev, msg]);
            // Update last_message in channel list
            setChannels(prev => prev.map(c => c.id === activeChannelId
                ? { ...c, last_message: text, last_message_at: msg.created_at }
                : c));
        } catch { setDraft(text); } finally { setSending(false); }
    }

    const activeChannel = channels.find(c => c.id === activeChannelId);
    const displayName = activeChannel?.type === "direct"
        ? (activeChannel.dm_other_name ?? activeChannel.name)
        : activeChannel?.name;

    const filteredChannels = channels.filter(c => {
        const name = c.type === "direct" ? (c.dm_other_name ?? c.name) : c.name;
        return name.toLowerCase().includes(channelSearch.toLowerCase());
    });

    return (
        <div className="flex h-[calc(100vh-56px)] overflow-hidden">
            {/* ── Left Sidebar ── */}
            <div className="w-72 border-r border-border/60 bg-white flex flex-col shrink-0">
                <div className="p-4 border-b border-border/60">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="font-semibold text-sm flex items-center gap-2">
                            <MessageCircle className="w-4 h-4 text-[#2493A2]" /> Messages
                        </h2>
                        <div className="flex gap-1">
                            <button onClick={() => setShowNewDM(true)}
                                className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                                title="New Direct Message">
                                <Users className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setShowNewChannel(true)}
                                className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                                title="New Channel">
                                <Plus className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Search channels…"
                            className="pl-7 h-8 text-xs rounded-xl"
                            value={channelSearch}
                            onChange={e => setChannelSearch(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                    {loadingChannels && (
                        <div className="flex flex-col gap-2 p-2">
                            {[...Array(5)].map((_, i) => <div key={i} className="h-12 rounded-xl bg-muted animate-pulse" />)}
                        </div>
                    )}
                    {filteredChannels.map(ch => (
                        <ChannelItem
                            key={ch.id}
                            channel={ch}
                            active={ch.id === activeChannelId}
                            onClick={() => setActiveChannelId(ch.id)}
                        />
                    ))}
                    {!loadingChannels && filteredChannels.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-8">No channels found</p>
                    )}
                </div>
            </div>

            {/* ── Right: Chat area ── */}
            {activeChannel ? (
                <div className="flex-1 flex flex-col overflow-hidden bg-muted/20">
                    {/* Header */}
                    <div className="px-5 py-3 border-b border-border/60 bg-white flex items-center gap-3 shrink-0">
                        {activeChannel.type === "direct"
                            ? <Avatar name={displayName ?? "?"} />
                            : <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                                <Hash className="w-4 h-4 text-muted-foreground" />
                              </div>
                        }
                        <div>
                            <p className="font-semibold text-sm">{displayName}</p>
                            {activeChannel.description && (
                                <p className="text-[11px] text-muted-foreground">{activeChannel.description}</p>
                            )}
                        </div>
                        <button onClick={() => loadMessages(activeChannelId!)}
                            className="ml-auto w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                            <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-3">
                        {loadingMessages && (
                            <div className="flex justify-center py-8">
                                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                            </div>
                        )}
                        {!loadingMessages && messages.length === 0 && (
                            <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
                                <MessageCircle className="w-10 h-10 opacity-30" />
                                <p className="text-sm">No messages yet. Start the conversation!</p>
                            </div>
                        )}
                        {messages.map((msg, idx) => {
                            const prev = messages[idx - 1];
                            const showSender = !prev || prev.sender_id !== msg.sender_id ||
                                new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() > 300000;
                            return (
                                <MessageBubble
                                    key={msg.id}
                                    msg={msg}
                                    isOwn={msg.sender_id === myId}
                                    showSender={showSender}
                                />
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="px-5 py-3 border-t border-border/60 bg-white shrink-0">
                        <div className="flex gap-2 items-end">
                            <Input
                                placeholder={`Message ${displayName ?? "channel"}…`}
                                className="flex-1 rounded-xl text-sm"
                                value={draft}
                                onChange={e => setDraft(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                            />
                            <Button
                                className="rounded-xl h-10 w-10 p-0 bg-[#2493A2] hover:bg-[#1e7d8c] shrink-0"
                                onClick={sendMessage}
                                disabled={!draft.trim() || sending}
                            >
                                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            </Button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
                    <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                        <MessageCircle className="w-7 h-7 opacity-40" />
                    </div>
                    <p className="text-sm font-medium">Select a channel to start messaging</p>
                    <p className="text-xs">Or start a new conversation using the buttons above</p>
                </div>
            )}

            {showNewChannel && (
                <NewChannelDialog
                    onClose={() => setShowNewChannel(false)}
                    onCreate={ch => {
                        setShowNewChannel(false);
                        setChannels(prev => [ch, ...prev]);
                        setActiveChannelId(ch.id);
                    }}
                />
            )}
            {showNewDM && (
                <NewDMDialog
                    onClose={() => setShowNewDM(false)}
                    onDM={id => {
                        setShowNewDM(false);
                        loadChannels();
                        setActiveChannelId(id);
                    }}
                />
            )}
        </div>
    );
}
