"use client";

import { useState } from "react";
import Sidebar from "@/components/sidebar";
import TopBar from "@/components/topbar";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen bg-[#EBEBEB] p-2 md:p-3 gap-2 md:gap-3 overflow-hidden">
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-20 bg-black/30 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar — hidden on mobile, icon-only on md, full on lg */}
            <div
                className={`
          fixed lg:relative z-30 lg:z-auto h-full
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
            >
                <Sidebar collapsed={false} onClose={() => setSidebarOpen(false)} />
            </div>

            {/* Right panel */}
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden rounded-2xl bg-[#f7f7f7]">
                <TopBar onMenuClick={() => setSidebarOpen(true)} />
                <main className="flex-1 overflow-y-auto overflow-x-hidden">
                    {children}
                </main>
            </div>
        </div>
    );
}
