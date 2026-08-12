import ActiveSessionsPage from "@/components/pages/ActiveSessionsPage";

export const metadata = {
    title: "User Activity | Ayuxa Platforms Admin",
};

export default function Page() {
    return <ActiveSessionsPage lockType="user" title="User Activity" />;
}
