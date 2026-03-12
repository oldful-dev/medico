"use client";
import ServicesPage from "./ServicesPage";

export default function HomeEssentialsPage() {
    // We reuse the ServicesPage component but it could be extended with 
    // specific filtering if we add a 'filterType' prop to ServicesPage.
    // For now, the user can see all services in ServicesPage, 
    // but this dedicated route makes it easier to find.
    return (
        <div>
            <div className="page-header">
                <h2>Home Essentials</h2>
                <p>Manage daily assistance and home maintenance services</p>
            </div>
            <ServicesPage filterType="HOME_ESSENTIALS" />
        </div>
    );
}
