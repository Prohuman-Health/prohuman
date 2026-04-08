/**
 * lib/api.ts → replaced by lib/api/ directory.
 * This file re-exports everything from the modular api folder
 * so existing imports like `import { auth } from "@/lib/api"` keep working
 * while we migrate to the new named exports.
 *
 * New code should import from "@/lib/api" which resolves to lib/api/index.ts.
 * NOTE: Next.js/TS resolves directories before .ts files, so delete this file
 * once all old imports have been migrated, or keep as legacy shim.
 */

// Re-export old named exports mapped to the new names for backward compat
export {
    getToken, setToken, clearToken, ApiError, request,
    authApi as auth,
    onboardingApi as onboarding,
    dashboardApi as dashboard,
    patientsApi as patients,
    sessionsApi as sessions,
    staffApi as staff,
    exercisesApi as exercises,
    algorithmsApi as algorithms,
    sessionTypesApi as sessionTypes,
} from "./api/index";

// Re-export all types and named api objects under new names too
export * from "./api/index";
