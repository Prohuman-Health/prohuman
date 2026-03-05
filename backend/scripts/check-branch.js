const { Pool } = require("pg");
const p = new Pool({ connectionString: "postgresql://prohuman:prohuman_secret@localhost:5433/prohuman_db" });

async function run() {
    const staff = await p.query("SELECT id, email, branch_id FROM staff WHERE email = $1", ["arnabbhowmik019@gmail.com"]);
    console.log("Staff:", staff.rows[0]);
    const branches = await p.query("SELECT id, name FROM branches LIMIT 5");
    console.log("Branches:", branches.rows);

    // If no branch_id, assign the first available branch
    if (!staff.rows[0]?.branch_id && branches.rows.length > 0) {
        const branchId = branches.rows[0].id;
        await p.query("UPDATE staff SET branch_id = $1, updated_at = NOW() WHERE email = $2", [branchId, "arnabbhowmik019@gmail.com"]);
        console.log("✅ Assigned branch_id:", branchId, "to arnabbhowmik019@gmail.com");
    } else if (staff.rows[0]?.branch_id) {
        console.log("✅ Already has branch_id:", staff.rows[0].branch_id);
    } else {
        console.log("❌ No branches found. Run onboarding first.");
    }
    await p.end();
}

run().catch(e => { console.error(e.message); p.end(); });
