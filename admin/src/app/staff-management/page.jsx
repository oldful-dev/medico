import StaffManagementPage from "@/components/pages/StaffManagementPage";
import AdminLayout from "@/components/AdminLayout";

export const metadata = {
  title: "Staff Management | Ayuxa Admin",
  description: "Manage operational staff for booking assignments"
};

export default function Page() {
  return (
    <AdminLayout>
      <StaffManagementPage />
    </AdminLayout>
  );
}
