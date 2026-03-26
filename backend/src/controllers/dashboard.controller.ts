import { Request, Response } from "express";
import { query } from "../config/db";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";

/**
 * GET /dashboard/stats
 * Returns all data the dashboard needs in a single round-trip.
 */
export const getDashboardStats = asyncHandler(async (_req: Request, res: Response) => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

    // ── Run all aggregation queries in parallel ─────────────────────────────────
    const [
        patientCount,
        doctorCount,
        sessionTypesCount,
        monthSessions,
        todaySessions,
        weeklyBreakdown,
        sessionStatusBreakdown,
        recentPatients,
        upcomingSession,
        staffList,
        waitlistCount,
        unassignedForms,
        patientSplit,
    ] = await Promise.all([
        // Total active patients
        query<{ count: string }>("SELECT COUNT(*) FROM patients WHERE is_active = TRUE"),

        // Active doctors
        query<{ count: string }>("SELECT COUNT(*) FROM doctors d JOIN staff s ON s.id = d.staff_id WHERE s.is_active = TRUE"),

        // Session types
        query<{ count: string }>("SELECT COUNT(*) FROM session_types WHERE is_active = TRUE"),

        // Sessions this month (total + by status)
        query<{ count: string; status: string }>(
            "SELECT COUNT(*), status FROM sessions WHERE scheduled_at BETWEEN $1 AND $2 GROUP BY status",
            [monthStart, monthEnd]
        ),

        // Today's sessions count
        query<{ count: string }>(
            "SELECT COUNT(*) FROM sessions WHERE scheduled_at BETWEEN $1 AND $2",
            [todayStart, todayEnd]
        ),

        // Sessions per day of week for the current month (0=Sun…6=Sat)
        query<{ dow: string; count: string }>(
            `SELECT EXTRACT(DOW FROM scheduled_at)::int AS dow, COUNT(*) as count
       FROM sessions
       WHERE scheduled_at BETWEEN $1 AND $2
       GROUP BY dow ORDER BY dow`,
            [monthStart, monthEnd]
        ),

        // Session status breakdown (all time, for donut chart)
        query<{ status: string; count: string }>(
            "SELECT status, COUNT(*) FROM sessions GROUP BY status"
        ),

        // 5 most recently registered patients
        query<{ id: string; full_name: string; patient_code: string; created_at: string; phone: string }>(
            "SELECT id, full_name, patient_code, created_at, phone FROM patients WHERE is_active = TRUE ORDER BY created_at DESC LIMIT 5"
        ),

        // Next upcoming session from now
        query<{
            id: string; scheduled_at: string; patient_name: string;
            doctor_name: string; session_type_name: string; status: string;
        }>(
            `SELECT s.id, s.scheduled_at, s.status,
              p.full_name AS patient_name,
              sf.full_name AS doctor_name,
              st.name AS session_type_name
       FROM sessions s
       JOIN patients p      ON p.id = s.patient_id
       JOIN doctors d       ON d.id = s.doctor_id
       JOIN staff sf        ON sf.id = d.staff_id
       JOIN session_types st ON st.id = s.session_type_id
       WHERE s.scheduled_at >= NOW() AND s.status IN ('pending','confirmed')
       ORDER BY s.scheduled_at ASC LIMIT 1`
        ),

        // Active staff members
        query<{ id: string; full_name: string; role: string; avatar_url: string | null; is_active: boolean }>(
            "SELECT id, full_name, role, avatar_url, is_active FROM staff WHERE is_active = TRUE ORDER BY full_name LIMIT 8"
        ),

        // Waitlist count
        query<{ count: string }>("SELECT COUNT(*) FROM waitlist WHERE status = 'waiting'"),

        // Session types without a form assigned
        query<{ count: string }>("SELECT COUNT(*) FROM session_types WHERE is_active = TRUE AND form_id IS NULL"),

        // New vs repeat patients
        // new    = active patients who have exactly 1 session in total
        // repeat = active patients who have more than 1 session in total
        query<{ new_patients: string; repeat_patients: string }>(`
            SELECT
                COUNT(*) FILTER (WHERE session_count = 1) AS new_patients,
                COUNT(*) FILTER (WHERE session_count > 1)  AS repeat_patients
            FROM (
                SELECT p.id, COUNT(s.id) AS session_count
                FROM patients p
                LEFT JOIN sessions s ON s.patient_id = p.id
                WHERE p.is_active = TRUE
                GROUP BY p.id
            ) sub
        `),
    ]);

    // ── Build weekly array (Sun=0 … Sat=6) ───────────────────────────────────
    const weeklyMap: Record<number, number> = {};
    for (const row of weeklyBreakdown.rows) weeklyMap[parseInt(row.dow)] = parseInt(row.count);
    const weeklyData = [0, 1, 2, 3, 4, 5, 6].map((d) => ({ dow: d, count: weeklyMap[d] ?? 0 }));

    // ── Session status totals ─────────────────────────────────────────────────
    const statusMap: Record<string, number> = {};
    for (const row of monthSessions.rows) statusMap[row.status] = parseInt(row.count);
    const totalThisMonth = Object.values(statusMap).reduce((a, b) => a + b, 0);

    const allStatusMap: Record<string, number> = {};
    for (const row of sessionStatusBreakdown.rows) allStatusMap[row.status] = parseInt(row.count);
    const totalAll = Object.values(allStatusMap).reduce((a, b) => a + b, 0);

    ApiResponse.ok(res, {
        stats: {
            total_patients: parseInt(patientCount.rows[0]?.count ?? "0"),
            active_doctors: parseInt(doctorCount.rows[0]?.count ?? "0"),
            session_types: parseInt(sessionTypesCount.rows[0]?.count ?? "0"),
            sessions_this_month: totalThisMonth,
            sessions_today: parseInt(todaySessions.rows[0]?.count ?? "0"),
            waitlist_count: parseInt(waitlistCount.rows[0]?.count ?? "0"),
            unassigned_forms: parseInt(unassignedForms.rows[0]?.count ?? "0"),
            new_patients: parseInt(patientSplit.rows[0]?.new_patients ?? "0"),
            repeat_patients: parseInt(patientSplit.rows[0]?.repeat_patients ?? "0"),
        },
        weekly_sessions: weeklyData,
        session_status: {
            completed: allStatusMap["completed"] ?? 0,
            scheduled: (allStatusMap["pending"] ?? 0) + (allStatusMap["confirmed"] ?? 0),
            cancelled: (allStatusMap["cancelled"] ?? 0) + (allStatusMap["late-cancellation"] ?? 0),
            no_show: allStatusMap["no-show"] ?? 0,
            total: totalAll,
        },
        month_status: statusMap,
        recent_patients: recentPatients.rows,
        upcoming_session: upcomingSession.rows[0] ?? null,
        staff: staffList.rows,
    });
});
