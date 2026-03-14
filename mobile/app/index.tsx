import { Redirect } from 'expo-router';

export default function AppIndex() {
    // Always route through custom splash — it handles auth check + redirect
    return <Redirect href="/splash" />;
}
