import { Request, Response } from "express";
import { query } from "../config/db";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";

/**
 * GET /cash/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Returns a daily breakdown of:
 *   collected  — sum of paid invoices (paid_at falls on that day)
 *   pending    — sum of pending invoices (session scheduled on that day)
 *   debits     — list of cash_debits entries for that day
 * Plus overall totals across the requested range.
 */
export const getCashSummary = asyncHandler(async (req: Request, res: Response) => {
  const { from, to } = req.query as Record<string, string>;
  if (!from || !to) throw ApiError.badRequest("from and to query params are required (YYYY-MM-DD)");

  // -- Daily collected (paid invoices whose paid_at falls in range) --
  const collectedResult = await query(
    `SELECT paid_at::date AS day, SUM(amount) AS collected
     FROM invoices
     WHERE status = 'paid' AND paid_at::date BETWEEN $1 AND $2
     GROUP BY paid_at::date`,
    [from, to]
  );

  // -- Daily pending (pending invoices whose session is scheduled in range) --
  const pendingResult = await query(
    `SELECT s.scheduled_at::date AS day, SUM(i.amount) AS pending
     FROM invoices i
     JOIN sessions s ON s.id = i.session_id
     WHERE i.status = 'pending' AND s.scheduled_at::date BETWEEN $1 AND $2
     GROUP BY s.scheduled_at::date`,
    [from, to]
  );

  // -- Cash debits in range --
  const debitsResult = await query(
    `SELECT d.*, st.full_name AS created_by_name
     FROM cash_debits d
     LEFT JOIN staff st ON st.id = d.created_by
     WHERE d.date BETWEEN $1 AND $2
     ORDER BY d.date, d.created_at`,
    [from, to]
  );

  // Build a map keyed by date string YYYY-MM-DD
  const collectedMap: Record<string, number> = {};
  for (const row of collectedResult.rows) {
    const d = row.day instanceof Date ? row.day.toISOString().slice(0, 10) : String(row.day);
    collectedMap[d] = parseFloat(row.collected);
  }

  const pendingMap: Record<string, number> = {};
  for (const row of pendingResult.rows) {
    const d = row.day instanceof Date ? row.day.toISOString().slice(0, 10) : String(row.day);
    pendingMap[d] = parseFloat(row.pending);
  }

  const debitsMap: Record<string, typeof debitsResult.rows> = {};
  for (const row of debitsResult.rows) {
    const d = row.date instanceof Date ? row.date.toISOString().slice(0, 10) : String(row.date);
    if (!debitsMap[d]) debitsMap[d] = [];
    debitsMap[d].push(row);
  }

  // Generate every date in the range
  const days: {
    date: string;
    collected: number;
    pending: number;
    debit_total: number;
    net: number;
    debits: unknown[];
  }[] = [];

  const start = new Date(from + "T00:00:00Z");
  const end   = new Date(to   + "T00:00:00Z");
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    const collected   = collectedMap[key]  ?? 0;
    const pending     = pendingMap[key]    ?? 0;
    const debitList   = debitsMap[key]     ?? [];
    const debit_total = debitList.reduce((s, x: any) => s + parseFloat(x.amount), 0);
    days.push({ date: key, collected, pending, debit_total, net: collected - debit_total, debits: debitList });
  }

  const total_collected = days.reduce((s, d) => s + d.collected,   0);
  const total_pending   = days.reduce((s, d) => s + d.pending,     0);
  const total_debits    = days.reduce((s, d) => s + d.debit_total, 0);
  const total_net       = total_collected - total_debits;

  ApiResponse.ok(res, { days, total_collected, total_pending, total_debits, total_net });
});

/**
 * POST /cash/debits
 * Body: { date: "YYYY-MM-DD", amount: number, description: string }
 */
export const createDebit = asyncHandler(async (req: Request, res: Response) => {
  const { date, amount, description } = req.body;
  const result = await query(
    `INSERT INTO cash_debits (date, amount, description, created_by)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [date, amount, description, req.user!.sub]
  );
  ApiResponse.created(res, result.rows[0]);
});

/**
 * DELETE /cash/debits/:id
 * Admin only.
 */
export const deleteDebit = asyncHandler(async (req: Request, res: Response) => {
  const { rowCount } = await query(
    "DELETE FROM cash_debits WHERE id = $1",
    [req.params.id]
  );
  if (!rowCount) throw ApiError.notFound("Debit entry not found");
  ApiResponse.noContent(res);
});
