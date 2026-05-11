import { Request, Response } from "express";
import { query } from "../config/db";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";

/**
 * GET /messages/channels
 * Returns all channels the current user is a member of, with unread count.
 */
export const listChannels = asyncHandler(async (req: Request, res: Response) => {
    const staffId = req.user!.sub;

    const result = await query(
        `SELECT
            c.id, c.name, c.description, c.type, c.is_archived, c.created_at,
            m.last_read_at,
            (
                SELECT COUNT(*) FROM staff_messages sm
                WHERE sm.channel_id = c.id
                  AND sm.is_deleted = false
                  AND (m.last_read_at IS NULL OR sm.created_at > m.last_read_at)
                  AND sm.sender_id != $1
            )::int AS unread_count,
            (
                SELECT sm2.body FROM staff_messages sm2
                WHERE sm2.channel_id = c.id AND sm2.is_deleted = false
                ORDER BY sm2.created_at DESC LIMIT 1
            ) AS last_message,
            (
                SELECT sm2.created_at FROM staff_messages sm2
                WHERE sm2.channel_id = c.id AND sm2.is_deleted = false
                ORDER BY sm2.created_at DESC LIMIT 1
            ) AS last_message_at,
            -- For DM channels, return the other participant's info
            CASE WHEN c.type = 'direct' THEN (
                SELECT s.full_name FROM staff s
                JOIN staff_channel_members mem ON mem.staff_id = s.id
                WHERE mem.channel_id = c.id AND s.id != $1
                LIMIT 1
            ) END AS dm_other_name,
            CASE WHEN c.type = 'direct' THEN (
                SELECT s.id FROM staff s
                JOIN staff_channel_members mem ON mem.staff_id = s.id
                WHERE mem.channel_id = c.id AND s.id != $1
                LIMIT 1
            ) END AS dm_other_id
        FROM staff_channels c
        JOIN staff_channel_members m ON m.channel_id = c.id AND m.staff_id = $1
        WHERE c.is_archived = false
        ORDER BY COALESCE(last_message_at, c.created_at) DESC`,
        [staffId]
    );

    res.json(ApiResponse.success(result.rows));
});

/**
 * GET /messages/channels/:id/messages?before=ISO_TIMESTAMP&limit=50
 * Paginated message history (cursor-based, newest first).
 */
export const getMessages = asyncHandler(async (req: Request, res: Response) => {
    const staffId = req.user!.sub;
    const { id: channelId } = req.params;
    const { before, limit = "50" } = req.query as Record<string, string>;

    // Verify membership
    const memberCheck = await query(
        `SELECT 1 FROM staff_channel_members WHERE channel_id = $1 AND staff_id = $2`,
        [channelId, staffId]
    );
    if (memberCheck.rowCount === 0) throw ApiError.forbidden("Not a member of this channel");

    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const params: unknown[] = [channelId, limitNum];
    let beforeClause = "";
    if (before) {
        beforeClause = ` AND sm.created_at < $3`;
        params.push(before);
    }

    const result = await query(
        `SELECT sm.id, sm.channel_id, sm.sender_id, sm.sender_name, sm.body, sm.is_deleted, sm.created_at, sm.updated_at
         FROM staff_messages sm
         WHERE sm.channel_id = $1 AND sm.is_deleted = false${beforeClause}
         ORDER BY sm.created_at DESC
         LIMIT $2`,
        params
    );

    // Return in chronological order
    res.json(ApiResponse.success(result.rows.reverse()));
});

/**
 * POST /messages/channels/:id/messages
 * Send a message to a channel.
 */
export const sendMessage = asyncHandler(async (req: Request, res: Response) => {
    const staffId = req.user!.sub;
    const { id: channelId } = req.params;
    const { body } = req.body as { body: string };

    if (!body || body.trim().length === 0) throw ApiError.badRequest("Message body cannot be empty");
    if (body.length > 4000) throw ApiError.badRequest("Message too long");

    // Verify membership
    const memberCheck = await query(
        `SELECT 1 FROM staff_channel_members WHERE channel_id = $1 AND staff_id = $2`,
        [channelId, staffId]
    );
    if (memberCheck.rowCount === 0) throw ApiError.forbidden("Not a member of this channel");

    // Fetch sender name snapshot
    const staffRow = await query(`SELECT full_name FROM staff WHERE id = $1`, [staffId]);
    const senderName = staffRow.rows[0]?.full_name ?? null;

    const result = await query(
        `INSERT INTO staff_messages (channel_id, sender_id, sender_name, body)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [channelId, staffId, senderName, body.trim()]
    );

    res.status(201).json(ApiResponse.success(result.rows[0]));
});

/**
 * PATCH /messages/channels/:id/read
 * Mark a channel as read (update last_read_at for current user).
 */
export const markRead = asyncHandler(async (req: Request, res: Response) => {
    const staffId = req.user!.sub;
    const { id: channelId } = req.params;

    await query(
        `UPDATE staff_channel_members SET last_read_at = NOW()
         WHERE channel_id = $1 AND staff_id = $2`,
        [channelId, staffId]
    );

    res.json(ApiResponse.success({ ok: true }));
});

/**
 * POST /messages/channels
 * Create a new group channel (admin only).
 */
export const createChannel = asyncHandler(async (req: Request, res: Response) => {
    const staffId = req.user!.sub;
    const { name, description, member_ids } = req.body as {
        name: string;
        description?: string;
        member_ids?: string[];
    };

    if (!name || name.trim().length === 0) throw ApiError.badRequest("Channel name is required");

    const channelResult = await query(
        `INSERT INTO staff_channels (name, description, type, created_by)
         VALUES ($1, $2, 'group', $3) RETURNING *`,
        [name.trim(), description?.trim() ?? null, staffId]
    );
    const channel = channelResult.rows[0];

    // Add creator + any specified members
    const members = Array.from(new Set([staffId, ...(member_ids ?? [])]));
    for (const memberId of members) {
        await query(
            `INSERT INTO staff_channel_members (channel_id, staff_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [channel.id, memberId]
        );
    }

    res.status(201).json(ApiResponse.success(channel));
});

/**
 * POST /messages/dm
 * Get or create a direct message channel between current user and another staff member.
 */
export const createOrGetDM = asyncHandler(async (req: Request, res: Response) => {
    const staffId = req.user!.sub;
    const { other_staff_id } = req.body as { other_staff_id: string };

    if (!other_staff_id) throw ApiError.badRequest("other_staff_id is required");
    if (other_staff_id === staffId) throw ApiError.badRequest("Cannot DM yourself");

    // Check if a DM channel already exists between these two
    const existing = await query(
        `SELECT c.id FROM staff_channels c
         WHERE c.type = 'direct'
           AND EXISTS (SELECT 1 FROM staff_channel_members WHERE channel_id = c.id AND staff_id = $1)
           AND EXISTS (SELECT 1 FROM staff_channel_members WHERE channel_id = c.id AND staff_id = $2)
           AND (SELECT COUNT(*) FROM staff_channel_members WHERE channel_id = c.id) = 2
         LIMIT 1`,
        [staffId, other_staff_id]
    );

    if (existing.rowCount && existing.rowCount > 0) {
        return res.json(ApiResponse.success({ id: existing.rows[0].id, existing: true }));
    }

    // Fetch other staff name for channel name
    const otherStaff = await query(`SELECT full_name FROM staff WHERE id = $1`, [other_staff_id]);
    if (!otherStaff.rows[0]) throw ApiError.notFound("Staff member not found");

    const myStaff = await query(`SELECT full_name FROM staff WHERE id = $1`, [staffId]);

    const channelResult = await query(
        `INSERT INTO staff_channels (name, type, created_by)
         VALUES ($1, 'direct', $2) RETURNING *`,
        [`${myStaff.rows[0]?.full_name} & ${otherStaff.rows[0].full_name}`, staffId]
    );
    const channel = channelResult.rows[0];

    await query(
        `INSERT INTO staff_channel_members (channel_id, staff_id) VALUES ($1, $2), ($1, $3)`,
        [channel.id, staffId, other_staff_id]
    );

    return res.status(201).json(ApiResponse.success({ ...channel, existing: false }));
});

/**
 * GET /messages/channels/:id/members
 * List members of a channel.
 */
export const getChannelMembers = asyncHandler(async (req: Request, res: Response) => {
    const staffId = req.user!.sub;
    const { id: channelId } = req.params;

    const memberCheck = await query(
        `SELECT 1 FROM staff_channel_members WHERE channel_id = $1 AND staff_id = $2`,
        [channelId, staffId]
    );
    if (memberCheck.rowCount === 0) throw ApiError.forbidden("Not a member of this channel");

    const result = await query(
        `SELECT s.id, s.full_name, s.role, s.email, mem.joined_at
         FROM staff s
         JOIN staff_channel_members mem ON mem.staff_id = s.id
         WHERE mem.channel_id = $1
         ORDER BY s.full_name`,
        [channelId]
    );

    res.json(ApiResponse.success(result.rows));
});

/**
 * POST /messages/channels/:id/members
 * Add a member to a channel (admin only, group channels only).
 */
export const addChannelMember = asyncHandler(async (req: Request, res: Response) => {
    const { id: channelId } = req.params;
    const { staff_id } = req.body as { staff_id: string };

    if (!staff_id) throw ApiError.badRequest("staff_id is required");

    const channel = await query(`SELECT type FROM staff_channels WHERE id = $1`, [channelId]);
    if (!channel.rows[0]) throw ApiError.notFound("Channel not found");
    if (channel.rows[0].type === "direct") throw ApiError.badRequest("Cannot add members to a DM channel");

    await query(
        `INSERT INTO staff_channel_members (channel_id, staff_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [channelId, staff_id]
    );

    res.json(ApiResponse.success({ ok: true }));
});
