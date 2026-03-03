import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function CartScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    return (
        <View style={styles.screen}>
            {/* Header extension */}
            <View style={{ backgroundColor: '#048357', height: insets.top }} />
            <StatusBar style="light" backgroundColor="#048357" />

            {/* ─── Header ─── */}
            <View style={styles.headerContainer}>
                <Text style={styles.headerTitle}>My Cart & Bookings</Text>
            </View>

            <View style={styles.contentContainer}>
                {/* ─── Empty State ─── */}
                <View style={styles.emptyStateWrapper}>
                    {/* Icon matching PRD: calendar or relaxing chair. Using calendar. */}
                    <View style={styles.iconCircle}>
                        <Ionicons name="calendar-clear-outline" size={60} color="#048357" />
                    </View>

                    <Text style={styles.emptyHeadline}>You have no upcoming appointments.</Text>

                    <TouchableOpacity
                        style={styles.exploreButton}
                        activeOpacity={0.8}
                        onPress={() => router.push('/')}
                    >
                        <Text style={styles.exploreButtonText}>Explore Services</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#048357', // Matches app theme header
    },
    /* ─── Header ─── */
    headerContainer: {
        backgroundColor: '#048357',
        alignItems: 'center',
        paddingVertical: 15,
        paddingBottom: 25,
        position: 'relative',
    },
    headerTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 20,
        color: '#FFFFFF',
        letterSpacing: -0.24,
    },
    /* ─── Main Content Container (Cream Box) ─── */
    contentContainer: {
        flex: 1,
        backgroundColor: '#FDFDE8',
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 25,
    },
    /* ─── Empty State ─── */
    emptyStateWrapper: {
        alignItems: 'center',
        marginTop: -60, // Shift up slightly for better visual balance
    },
    iconCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(4, 131, 87, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 25,
    },
    emptyHeadline: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 18,
        color: '#2F2F2F',
        textAlign: 'center',
        marginBottom: 35,
        lineHeight: 24,
        paddingHorizontal: 20,
    },
    exploreButton: {
        backgroundColor: '#02743F',
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 3,
    },
    exploreButtonText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        color: '#FFFFFF',
        fontSize: 16,
    },
});
