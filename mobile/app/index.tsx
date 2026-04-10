import { Redirect } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function AppIndex() {
    const { t } = useTranslation();
    // Always route through custom splash — it handles auth check + redirect
    return <Redirect href="/splash" />;
}
