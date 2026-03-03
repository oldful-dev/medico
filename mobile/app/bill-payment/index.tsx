import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Platform,
    ScrollView,
    TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// ─── Figma Assets ───
const imgHero = require('@/assets/images/33ede0e57be708b9775957c3ecec7013b0a56c6d.png'); // Bill icon
const imgCheckmark = require('@/assets/images/bd57304cc6eaf62cb9cca48825822022a152326a.png');
const imgMap = require('@/assets/images/0377518a275775aa53396ca4863e21dce08ad3b6.png');

export default function BillPaymentScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    return (
        <View style={styles.screen}>
            {/* White/light content status bar text over dark green header */}
            <View style={{ backgroundColor: '#048357', height: insets.top }} />
            <StatusBar style="light" backgroundColor="#048357" />

            {/* ─── Custom Dark Green Header ─── */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Bill Payment</Text>
                <View style={{ width: 40 }} /> {/* spacer for center alignment */}
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* ─── Hero Section ─── */}
                <View style={styles.heroSection}>
                    <Image source={imgHero} style={styles.heroImage} resizeMode="contain" />
                    <View style={styles.heroTextContainer}>
                        <Text style={styles.heroTitle}>Bill Payment</Text>
                        <Text style={styles.heroSubtitle}>Concierge{"\n"}Services</Text>
                    </View>
                </View>

                <Text style={styles.heroDescription}>
                    Book a certified Bill payment  and installations in your home
                </Text>

                {/* ─── Bill Details ─── */}
                <View style={[styles.card, { marginBottom: 100 }]}>
                    <Text style={styles.sectionTitle}>Bill Details</Text>

                    <Text style={[styles.sectionTitle, { fontSize: 13, marginBottom: 8, marginTop: 5 }]}>Bill Type</Text>
                    <View style={styles.inputContainer}>
                        <Ionicons name="document-text-outline" size={18} color="#048357" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Electricity, Water, Internet..."
                            placeholderTextColor="#898989"
                        />
                    </View>

                    <Text style={[styles.sectionTitle, { fontSize: 13, marginBottom: 8, marginTop: 15 }]}>Account ID</Text>
                    <View style={styles.inputContainer}>
                        <Ionicons name="person-outline" size={18} color="#048357" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Enter Account ID / Consumer Number"
                            placeholderTextColor="#898989"
                        />
                    </View>

                    <Text style={[styles.sectionTitle, { fontSize: 13, marginBottom: 8, marginTop: 15 }]}>Amount</Text>
                    <View style={styles.inputContainer}>
                        <Ionicons name="cash-outline" size={18} color="#048357" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Amount (in ₹)"
                            keyboardType="numeric"
                            placeholderTextColor="#898989"
                        />
                    </View>
                </View>

                {/* ─── Book Service Button ─── */}
                <View style={styles.buttonContainer}>
                    <TouchableOpacity style={styles.bookButton} activeOpacity={0.8}>
                        <Text style={styles.bookButtonText}>Book Service</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#FDFDE8', // Light cream color matching Figma
    },

    /* ─── Header ─── */
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#048357',
        paddingHorizontal: 16,
        paddingBottom: 15,
        paddingTop: 10,
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        flex: 1,
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 20,
        color: '#FFFFFF',
        textAlign: 'center',
        letterSpacing: -0.24,
    },

    scrollContent: {
        paddingHorizontal: 17,
        paddingTop: 30,
        paddingBottom: 40,
    },

    /* ─── Hero Section ─── */
    heroSection: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        marginVertical: 10,
        marginBottom: 20,
        justifyContent: 'center',
    },
    heroImage: {
        width: 109,
        height: 109,
        marginRight: 10,
    },
    heroTextContainer: {
        flex: 1,
        alignItems: 'center',
    },
    heroTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 20,
        color: '#555555',
        marginBottom: 2,
        letterSpacing: -0.24,
        textAlign: 'center',
    },
    heroSubtitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 15,
        color: '#777777',
        letterSpacing: -0.24,
        textAlign: 'center',
    },
    heroDescription: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 14,
        color: '#848484',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 25,
        letterSpacing: -0.24,
        paddingHorizontal: 10,
    },

    /* ─── Cards Shared ─── */
    card: {
        backgroundColor: '#FFFDFD',
        borderRadius: 13,
        padding: 18,
        paddingVertical: 20,
        marginBottom: 15,
        elevation: 1, // Subtle drop shadow as implied by the white box on cream bg
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
    },
    sectionTitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 16,
        color: '#2F2F2F',
        marginBottom: 14,
        letterSpacing: -0.24,
    },

    /* ─── Inputs ─── */
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#D9D9D9',
        borderRadius: 8,
        paddingHorizontal: 12,
        height: 45,
    },
    inputIcon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 14,
        color: '#2F2F2F',
    },
    datePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#D9D9D9',
        borderRadius: 8,
        paddingHorizontal: 10,
        height: 45,
    },
    datePickerText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 14,
        color: '#555555',
    },

    /* ─── Main Action Button ─── */
    buttonContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    bookButton: {
        backgroundColor: '#02743F',
        width: 281,
        height: 45,
        borderRadius: 22.5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bookButtonText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 14,
        color: '#FFFFFF',
    },
});
