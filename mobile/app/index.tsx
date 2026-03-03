import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { View, ActivityIndicator } from 'react-native';

export default function AppIndex() {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <View style={{ flex: 1, backgroundColor: '#FFFFF0', justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#048357" />
            </View>
        );
    }

    if (isAuthenticated) {
        return <Redirect href="/(tabs)" />;
    } else {
        return <Redirect href="/(auth)/login" />;
    }
}
