/**
 * Google OAuth 2.0 Strategy (Passport)
 *
 * Flow:
 *  1. Frontend navigates to  GET /api/v1/auth/google
 *  2. Backend redirects to   Google consent screen
 *  3. Google redirects to    GET /api/v1/auth/google/callback
 *  4. Backend finds/creates staff record, issues JWT
 *  5. Backend redirects to   {FRONTEND_URL}/auth/callback?token=<jwt>
 *  6. Frontend stores the token and proceeds
 */
import passport from "passport";
import { Strategy as GoogleStrategy, Profile } from "passport-google-oauth20";
import { env } from "./env";
import { query } from "./db";

type VerifyDone = (err: Error | null, user?: Express.User | false) => void;
type SessionDone = (err: Error | null, user?: Express.User) => void;

passport.use(
    new GoogleStrategy(
        {
            clientID: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
            callbackURL: env.GOOGLE_CALLBACK_URL,
            scope: ["profile", "email"],
        },
        async (_accessToken: string, _refreshToken: string, profile: Profile, done: VerifyDone) => {
            try {
                const email = profile.emails?.[0]?.value;
                const googleId = profile.id;
                const fullName = profile.displayName;
                const avatarUrl = profile.photos?.[0]?.value ?? null;

                if (!email) return done(new Error("No email returned from Google"), undefined);

                // 1. Check if a staff member with this google_id already exists
                let result = await query(
                    "SELECT id, email, full_name, role, branch_id, is_active, google_id FROM staff WHERE google_id = $1",
                    [googleId]
                );

                if (result.rows[0]) {
                    // Existing OAuth user
                    if (!result.rows[0].is_active) return done(new Error("Account is deactivated"), undefined);
                    return done(null, result.rows[0] as Express.User);
                }

                // 2. Check if a staff member with same email exists (link accounts)
                result = await query(
                    "SELECT id, email, full_name, role, branch_id, is_active, google_id FROM staff WHERE email = $1",
                    [email]
                );

                if (result.rows[0]) {
                    if (!result.rows[0].is_active) return done(new Error("Account is deactivated"), undefined);
                    // Link Google ID to existing email-based account
                    await query(
                        "UPDATE staff SET google_id = $1, avatar_url = $2, updated_at = NOW() WHERE id = $3",
                        [googleId, avatarUrl, result.rows[0].id]
                    );
                    return done(null, result.rows[0] as Express.User);
                }

                // 3. No existing account — auto-create with 'receptionist' role
                //    Admin can promote the role later via the staff management page.
                const newStaff = await query(
                    `INSERT INTO staff (email, full_name, role, google_id, avatar_url)
           VALUES ($1, $2, 'receptionist', $3, $4)
           RETURNING id, email, full_name, role, branch_id, is_active`,
                    [email, fullName, googleId, avatarUrl]
                );
                return done(null, newStaff.rows[0] as Express.User);
            } catch (err) {
                return done(err as Error, undefined);
            }
        }
    )
);

// Passport doesn't actually use sessions (we use JWT),
// but these stubs are required by passport internals:
passport.serializeUser((user: Express.User, done: SessionDone) => done(null, user));
passport.deserializeUser((user: Express.User, done: SessionDone) => done(null, user));

export default passport;
