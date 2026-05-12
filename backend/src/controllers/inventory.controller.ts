import { Request, Response } from "express";
import { query } from "../config/db";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";

/**
 * GET /inventory/items?category=&search=&low_stock=
 */
export const listItems = asyncHandler(async (req: Request, res: Response) => {
    const { category, search, low_stock } = req.query as Record<string, string>;

    const conditions: string[] = ["is_active = true"];
    const params: unknown[] = [];

    if (category) {
        params.push(category);
        conditions.push(`category = $${params.length}`);
    }
    if (search) {
        params.push(`%${search}%`);
        conditions.push(`name ILIKE $${params.length}`);
    }
    if (low_stock === "true") {
        conditions.push("current_stock <= min_stock");
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const result = await query(
        `SELECT *, (current_stock <= min_stock) AS is_low_stock
         FROM inventory_items
         ${where}
         ORDER BY name`,
        params
    );

    res.json(ApiResponse.success(result.rows));
});

/**
 * GET /inventory/items/:id
 */
export const getItem = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await query(
        `SELECT *, (current_stock <= min_stock) AS is_low_stock FROM inventory_items WHERE id = $1`,
        [id]
    );
    if (!result.rows[0]) throw ApiError.notFound("Item not found");
    res.json(ApiResponse.success(result.rows[0]));
});

/**
 * POST /inventory/items
 */
export const createItem = asyncHandler(async (req: Request, res: Response) => {
    const { name, category, unit, current_stock, min_stock, notes } = req.body as {
        name: string;
        category: string;
        unit: string;
        current_stock: number;
        min_stock: number;
        notes?: string;
    };

    if (!name?.trim()) throw ApiError.badRequest("Item name is required");
    if (!category) throw ApiError.badRequest("Category is required");
    if (!unit?.trim()) throw ApiError.badRequest("Unit is required");

    const result = await query(
        `INSERT INTO inventory_items (name, category, unit, current_stock, min_stock, notes)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *, (current_stock <= min_stock) AS is_low_stock`,
        [name.trim(), category, unit.trim(), current_stock ?? 0, min_stock ?? 0, notes?.trim() ?? null]
    );
    res.status(201).json(ApiResponse.success(result.rows[0]));
});

/**
 * PATCH /inventory/items/:id
 */
export const updateItem = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, category, unit, min_stock, notes, is_active } = req.body as {
        name?: string;
        category?: string;
        unit?: string;
        min_stock?: number;
        notes?: string;
        is_active?: boolean;
    };

    const result = await query(
        `UPDATE inventory_items SET
            name        = COALESCE($1, name),
            category    = COALESCE($2, category),
            unit        = COALESCE($3, unit),
            min_stock   = COALESCE($4, min_stock),
            notes       = COALESCE($5, notes),
            is_active   = COALESCE($6, is_active),
            updated_at  = NOW()
         WHERE id = $7
         RETURNING *, (current_stock <= min_stock) AS is_low_stock`,
        [name?.trim() ?? null, category ?? null, unit?.trim() ?? null, min_stock ?? null, notes?.trim() ?? null, is_active ?? null, id]
    );

    if (!result.rows[0]) throw ApiError.notFound("Item not found");
    res.json(ApiResponse.success(result.rows[0]));
});

/**
 * DELETE /inventory/items/:id  — soft delete
 */
export const deactivateItem = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await query(
        `UPDATE inventory_items SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id`,
        [id]
    );
    if (!result.rows[0]) throw ApiError.notFound("Item not found");
    res.json(ApiResponse.success({ ok: true }));
});

/**
 * POST /inventory/items/:id/transactions
 * Record a stock transaction (restock, use, adjustment, wastage).
 */
export const recordTransaction = asyncHandler(async (req: Request, res: Response) => {
    const staffId = req.user!.sub;
    const { id: itemId } = req.params;
    const { type, quantity, notes } = req.body as {
        type: string;
        quantity: number;
        notes?: string;
    };

    if (!type) throw ApiError.badRequest("Transaction type is required");
    if (quantity === undefined || quantity === null) throw ApiError.badRequest("Quantity is required");

    const validTypes = ["restock", "use", "adjustment", "wastage"];
    if (!validTypes.includes(type)) throw ApiError.badRequest(`Type must be one of: ${validTypes.join(", ")}`);

    // For use / wastage, quantity reduces stock; for restock / adjustment, quantity is added
    // Adjustment can be negative (passed as negative number), use/wastage are always reductions
    let delta: number;
    if (type === "restock") {
        delta = Math.abs(quantity);
    } else if (type === "use" || type === "wastage") {
        delta = -Math.abs(quantity);
    } else {
        // adjustment: allow positive or negative
        delta = quantity;
    }

    // Atomically update stock and capture new value
    const updated = await query(
        `UPDATE inventory_items
         SET current_stock = current_stock + $1, updated_at = NOW()
         WHERE id = $2
         RETURNING current_stock`,
        [delta, itemId]
    );
    if (!updated.rows[0]) throw ApiError.notFound("Item not found");

    const stockAfter = updated.rows[0].current_stock;

    const tx = await query(
        `INSERT INTO inventory_transactions (item_id, type, quantity, stock_after, notes, created_by)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [itemId, type, Math.abs(quantity), stockAfter, notes?.trim() ?? null, staffId]
    );

    res.status(201).json(ApiResponse.success({ transaction: tx.rows[0], stock_after: stockAfter }));
});

/**
 * GET /inventory/items/:id/transactions?limit=50
 */
export const listTransactions = asyncHandler(async (req: Request, res: Response) => {
    const { id: itemId } = req.params;
    const { limit = "50" } = req.query as Record<string, string>;
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10)));

    const result = await query(
        `SELECT t.*, s.full_name AS created_by_name
         FROM inventory_transactions t
         LEFT JOIN staff s ON s.id = t.created_by
         WHERE t.item_id = $1
         ORDER BY t.created_at DESC
         LIMIT $2`,
        [itemId, limitNum]
    );

    res.json(ApiResponse.success(result.rows));
});

/**
 * GET /inventory/low-stock
 * Items where current_stock <= min_stock.
 */
export const getLowStockItems = asyncHandler(async (req: Request, res: Response) => {
    const result = await query(
        `SELECT *, (min_stock - current_stock) AS deficit
         FROM inventory_items
         WHERE is_active = true AND current_stock <= min_stock
         ORDER BY (min_stock - current_stock) DESC`,
        []
    );
    res.json(ApiResponse.success(result.rows));
});
