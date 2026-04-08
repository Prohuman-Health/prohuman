import { request } from "./core";

export interface Branch {
    id: string;
    name: string;
    address: string;
    phone: string | null;
    email: string | null;
    is_active: boolean;
}

export const branchesApi = {
    list: () => request<Branch[]>("/branches"),
    get: (id: string) => request<Branch>(`/branches/${id}`),
};
