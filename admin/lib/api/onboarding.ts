import { request } from "./core";

export interface OnboardingStatus {
    completed: boolean; has_branch: boolean;
    branch: unknown | null; session_type_count: number;
}

export const onboardingApi = {
    status: () => request<OnboardingStatus>("/onboarding/status"),
    complete: (payload: unknown) =>
        request<null>("/onboarding/complete", { method: "POST", body: JSON.stringify(payload) }),
};
