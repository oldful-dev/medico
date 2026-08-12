"use client";
import { Suspense } from "react";
import AdminLayout from "@/components/AdminLayout";
import PaymentsPage from "@/components/pages/PaymentsPage";

export default function Page() {
    return (
        <AdminLayout>
            <Suspense fallback={null}>
                <PaymentsPage />
            </Suspense>
        </AdminLayout>
    );
}
