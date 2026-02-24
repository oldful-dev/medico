"use client";
import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import DashboardPage from "@/components/pages/DashboardPage";
import RolesPage from "@/components/pages/RolesPage";
import CitiesPage from "@/components/pages/CitiesPage";
import UsersPage from "@/components/pages/UsersPage";
import ServicesPage from "@/components/pages/ServicesPage";
import BookingsPage from "@/components/pages/BookingsPage";
import CaregiversPage from "@/components/pages/CaregiversPage";
import PlansPage from "@/components/pages/PlansPage";
import PricingPage from "@/components/pages/PricingPage";
import PaymentsPage from "@/components/pages/PaymentsPage";
import SOSPage from "@/components/pages/SOSPage";
import NotificationsPage from "@/components/pages/NotificationsPage";
import LegalPage from "@/components/pages/LegalPage";
import StorePage from "@/components/pages/StorePage";
import MediaPage from "@/components/pages/MediaPage";
import ReportsPage from "@/components/pages/ReportsPage";
import AuditPage from "@/components/pages/AuditPage";
import ServerUIPage from "@/components/pages/ServerUIPage";
import SupportPage from "@/components/pages/SupportPage";
import SmartFeaturesPage from "@/components/pages/SmartFeaturesPage";

const pageComponents = {
    dashboard: DashboardPage,
    roles: RolesPage,
    cities: CitiesPage,
    users: UsersPage,
    services: ServicesPage,
    bookings: BookingsPage,
    caregivers: CaregiversPage,
    plans: PlansPage,
    pricing: PricingPage,
    payments: PaymentsPage,
    sos: SOSPage,
    notifications: NotificationsPage,
    legal: LegalPage,
    store: StorePage,
    media: MediaPage,
    reports: ReportsPage,
    audit: AuditPage,
    "server-ui": ServerUIPage,
    support: SupportPage,
    smart: SmartFeaturesPage,
};

export default function DashboardLayout() {
    const [currentPage, setCurrentPage] = useState("dashboard");

    const PageComponent = pageComponents[currentPage] || DashboardPage;

    return (
        <AdminLayout currentPage={currentPage} setCurrentPage={setCurrentPage}>
            <PageComponent key={currentPage} />
        </AdminLayout>
    );
}
