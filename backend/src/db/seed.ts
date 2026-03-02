import { pool } from "../config/db";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
dotenv.config();

async function seed() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Branch
    const branch = await client.query<{ id: string }>(
      `INSERT INTO branches (name, address, phone, email, operating_hours)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [
        "ProHuman Main Clinic",
        "123 Health Street, Mumbai",
        "+91-22-1234-5678",
        "info@prohuman.health",
        JSON.stringify({
          Mon: { open: "08:00", close: "18:00" },
          Tue: { open: "08:00", close: "18:00" },
          Wed: { open: "08:00", close: "18:00" },
          Thu: { open: "08:00", close: "18:00" },
          Fri: { open: "08:00", close: "17:00" },
          Sat: { open: "09:00", close: "13:00" },
        }),
      ]
    );
    const branchId = branch.rows[0]?.id;

    const hash = await bcrypt.hash("Admin@1234", 12);

    // Admin staff
    await client.query(
      `INSERT INTO staff (email, password_hash, full_name, role, branch_id)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT (email) DO NOTHING`,
      ["admin@prohuman.health", hash, "System Administrator", "admin", branchId]
    );

    // Doctor staff
    const docStaff = await client.query<{ id: string }>(
      `INSERT INTO staff (email, password_hash, full_name, role, branch_id)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT (email) DO NOTHING RETURNING id`,
      ["dr.priya@prohuman.health", hash, "Dr. Priya Sharma", "doctor", branchId]
    );
    if (docStaff.rows[0]) {
      const docRow = await client.query<{ id: string }>(
        `INSERT INTO doctors (staff_id, specialty)
         VALUES ($1,$2) ON CONFLICT (staff_id) DO NOTHING RETURNING id`,
        [docStaff.rows[0].id, "Physiotherapy"]
      );
      if (docRow.rows[0] && branchId) {
        // Mon–Fri 09:00–17:00
        for (let day = 1; day <= 5; day++) {
          await client.query(
            `INSERT INTO doctor_availability (doctor_id, branch_id, day_of_week, start_time, end_time)
             VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
            [docRow.rows[0].id, branchId, day, "09:00", "17:00"]
          );
        }
      }
    }

    // Receptionist
    await client.query(
      `INSERT INTO staff (email, password_hash, full_name, role, branch_id)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT (email) DO NOTHING`,
      ["reception@prohuman.health", hash, "Front Desk Staff", "receptionist", branchId]
    );

    // A basic session type
    await client.query(
      `INSERT INTO session_types (name, description, default_duration_minutes, fee)
       VALUES
         ('Initial Evaluation', 'First assessment session', 60, 1500),
         ('Follow-Up Session',  'Regular follow-up',       45, 1000),
         ('Discharge Assessment','Final discharge session', 60, 1200),
         ('Group Therapy',      'Group physiotherapy',     90,  800)
       ON CONFLICT DO NOTHING`
    );

    await client.query("COMMIT");
    console.log("Seed complete.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Seed failed:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(console.error);
