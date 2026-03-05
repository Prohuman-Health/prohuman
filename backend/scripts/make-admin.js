// scripts/make-admin.js
// Run: node scripts/make-admin.js
// Updates arnabbhowmik019@gmail.com to role='admin' in the staff table

const { Pool } = require("pg");

const pool = new Pool({
    connectionString: "postgresql://prohuman:prohuman_secret@localhost:5433/prohuman_db",
});

async function run() {
    const client = await pool.connect();
    try {
        // Check current state
        const before = await client.query(
            "SELECT id, email, role, is_active FROM staff WHERE email = $1",
            ["arnabbhowmik019@gmail.com"]
        );

        if (before.rows.length === 0) {
            console.error("❌  User arnabbhowmik019@gmail.com not found in the staff table.");
            console.log("    Make sure they have logged in at least once (via Google or password).");
            process.exit(1);
        }

        console.log("Before:", before.rows[0]);

        const result = await client.query(
            `UPDATE staff
       SET role = 'admin', is_active = true, updated_at = NOW()
       WHERE email = $1
       RETURNING id, email, role, is_active`,
            ["arnabbhowmik019@gmail.com"]
        );

        console.log("✅  Updated:", result.rows[0]);
    } finally {
        client.release();
        await pool.end();
    }
}

run().catch(err => {
    console.error("Error:", err.message);
    process.exit(1);
});
