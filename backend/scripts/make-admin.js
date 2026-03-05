#!/usr/bin/env node
// scripts/make-admin.js
// Seeds or promotes a staff member to admin role.
//
// Usage:
//   node scripts/make-admin.js <email> [password]
//
// Examples:
//   node scripts/make-admin.js arnabbhowmik019@gmail.com
//   node scripts/make-admin.js admin@clinic.com MyP@ss123
//
// - If the email exists in the staff table, it is promoted to admin.
// - If the email does NOT exist AND a password is supplied, a new admin
//   staff row is created (useful for fresh deployments with no Google OAuth yet).
// - Reads DATABASE_URL from .env (falls back to the local Docker default).

require("dotenv").config();
const { Pool } = require("pg");
const crypto = require("crypto");

const DB =
    process.env.DATABASE_URL ||
    "postgresql://prohuman:prohuman_secret@localhost:5432/prohuman_db";

const pool = new Pool({ connectionString: DB });

const [, , email, plainPassword] = process.argv;

if (!email) {
    console.error("Usage: node scripts/make-admin.js <email> [password]");
    process.exit(1);
}

async function hashPassword(plain) {
    // bcrypt-compatible hash using the bcryptjs npm package if available,
    // otherwise a simple SHA-256 (not for production — install bcryptjs).
    try {
        const bcrypt = require("bcryptjs");
        return await bcrypt.hash(plain, 12);
    } catch {
        console.warn("⚠  bcryptjs not found — using SHA-256 (install bcryptjs for production)");
        return crypto.createHash("sha256").update(plain).digest("hex");
    }
}

async function run() {
    const client = await pool.connect();
    try {
        // Check if user already exists
        const existing = await client.query(
            "SELECT id, email, role, is_active FROM staff WHERE email = $1",
            [email]
        );

        if (existing.rows.length > 0) {
            // ── PROMOTE existing user ────────────────────────────────────────
            console.log("Found existing staff member:", existing.rows[0]);
            const updated = await client.query(
                `UPDATE staff
                 SET role = 'admin', is_active = true, updated_at = NOW()
                 WHERE email = $1
                 RETURNING id, email, role, is_active`,
                [email]
            );
            console.log("✅  Promoted to admin:", updated.rows[0]);

        } else if (plainPassword) {
            // ── CREATE new admin staff row ───────────────────────────────────
            console.log(`No staff found for ${email} — creating new admin account…`);

            // Need at least one branch to attach the staff to
            const branch = await client.query(
                "SELECT id FROM branches ORDER BY created_at ASC LIMIT 1"
            );
            if (branch.rows.length === 0) {
                console.error("❌  No branches found. Run db:migrate first, then create a branch.");
                process.exit(1);
            }
            const branchId = branch.rows[0].id;
            const passwordHash = await hashPassword(plainPassword);

            const inserted = await client.query(
                `INSERT INTO staff (full_name, email, password_hash, role, branch_id, is_active)
                 VALUES ($1, $2, $3, 'admin', $4, true)
                 RETURNING id, email, role, branch_id, is_active`,
                [email.split("@")[0], email, passwordHash, branchId]
            );
            console.log("✅  Admin staff created:", inserted.rows[0]);
            console.log(`    Email:    ${email}`);
            console.log(`    Password: ${plainPassword}`);
            console.log(`    Branch:   ${branchId}`);

        } else {
            console.error(`❌  No staff found for ${email}.`);
            console.log("    Options:");
            console.log("      1. Log in via Google first, then re-run this script.");
            console.log(`      2. Create directly: node scripts/make-admin.js ${email} YourPassword`);
            process.exit(1);
        }

    } finally {
        client.release();
        await pool.end();
    }
}

run().catch(err => {
    console.error("Error:", err.message);
    process.exit(1);
});
