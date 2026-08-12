"use client";
import { Suspense } from "react";
import AdminLayout from "@/components/AdminLayout";
import ServicesPage from "@/components/pages/ServicesPage";

export default function Page() {
    return (
        <AdminLayout>
            <Suspense fallback={null}>
                <ServicesPage />
            </Suspense>
        </AdminLayout>
    );
}
