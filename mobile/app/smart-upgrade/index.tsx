import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Platform,
    ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

// ─── Figma Assets ───
const imgLightning = require('@/assets/images/50ffab5c68d190752695666bb7ec8bee1bc4842a.png'); // Lightning bolt
const imgChart = require('@/assets/images/45958abae6d20cd413b2ccd515807fab5af92fa7.png'); // Pricing table chart

export default function SmartUpgradeScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    return (
        <View style={styles.screen}>
            {/* Header extension */}
            <View style={{ backgroundColor: '#048357', height: insets.top }} />
            <StatusBar style="light" backgroundColor="#048357" />

            {/* ─── Header ─── */}
            <View style={styles.headerContainer}>
                {/* Back Button Overlay */}
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>Smart Upgrade</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* ─── Main Content Box (Gradient) ─── */}
                <LinearGradient
                    // "linear-gradient(-39.5267deg, rgb(255, 255, 255) 27.139%, rgb(123, 251, 206) 101.39%)"
                    colors={['#FFFFFF', '#7BFBCE']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gradientCard}
                >
                    {/* Header Group */}
                    <View style={styles.titleGroup}>
                        <Text style={styles.cardTitle}>Smart Upgrade</Text>
                        <Image source={imgLightning} style={styles.lightningIcon} resizeMode="contain" />
                    </View>

                    <Text style={styles.cardSubtitleBold}>Stop Paying Booking Fees.</Text>
                    <Text style={styles.cardSubtitleBold}>Get Total Home Managment.</Text>

                    <Text style={styles.priceIntroText}>
                        Join the oldful Homemaker Plan for Just <Text style={styles.priceAmount}>₹3,499/ </Text>month
                    </Text>

                    {/* ─── Pricing Chart Image ─── */}
                    <Image source={imgChart} style={styles.chartImage} resizeMode="contain" />

                    {/* ─── Upgrade Button ─── */}
                    <TouchableOpacity
                        style={styles.upgradeButton}
                        activeOpacity={0.8}
                        onPress={() => {
                            router.push({
                                pathname: '/service-confirmation',
                                params: {
                                    serviceName: 'Smart Upgrade',
                                    description: 'Oldful Homemaker Plan - Total Home Management',
                                    address: 'N/A',
                                    fee: '₹3,499/month'
                                }
                            });
                        }}
                    >
                        <Text style={styles.upgradeButtonText}>View Plan Details & Upgrade</Text>
                    </TouchableOpacity>

                    {/* ─── Important Disclaimer ─── */}
                    <Text style={styles.disclaimerHeader}>
                        Important Note<Text style={styles.disclaimerSubtitle}> (Disclaimer)</Text>
                    </Text>

                    <View style={styles.disclaimerBox}>
                        <Text style={styles.disclaimerText}>
                            <Text style={styles.disclaimerBold}>Booking Fee: </Text>
                            This fee covers the admimisistrative cost of finding, verifying, and scheduling the professional.
                        </Text>
                        <View style={styles.divider} />

                        <Text style={styles.disclaimerText}>
                            <Text style={styles.disclaimerBold}>Vendor Payments: </Text>
                            The actual cost of repair (spare parts, labour charges, materials) or utility bill amounts must be paid directly to the vendor/provider upon completion.
                        </Text>
                        <View style={styles.divider} />

                        <Text style={styles.disclaimerText}>
                            <Text style={styles.disclaimerBold}>Supervision: </Text>
                            “Pay-Per-Use” Bookings Include remote Coordination.for physical on-site supervision (having an Oldful staff member stand guard while work is done),you must have an active Oldful plan.
                        </Text>
                    </View>

                </LinearGradient>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#FDFDE8', // Light cream 
    },

    /* ─── Header ─── */
    headerContainer: {
        backgroundColor: '#048357',
        alignItems: 'center',
        paddingVertical: 15,
        paddingBottom: 25,
        position: 'relative',
    },
    backButton: {
        position: 'absolute',
        top: 15,
        left: 16,
        padding: 5,
        zIndex: 10,
    },
    headerTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 20,
        color: '#FFFFFF',
        letterSpacing: -0.24,
    },
    scrollContent: {
        paddingHorizontal: 15,
        paddingVertical: 20,
        paddingBottom: 60,
    },

    /* ─── Gradient Card ─── */
    gradientCard: {
        borderRadius: 27,
        padding: 20,
        paddingTop: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 5,
    },

    titleGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    cardTitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 20,
        color: '#472323',
    },
    lightningIcon: {
        width: 18,
        height: 19,
        marginLeft: 5,
    },

    cardSubtitleBold: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 16,
        color: '#2F2F2F',
        lineHeight: 22,
    },
    priceIntroText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 10,
        color: '#555',
        marginTop: 10,
        marginBottom: 15,
    },
    priceAmount: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 10,
    },

    /* ─── Chart Image ─── */
    chartImage: {
        width: '100%',
        height: 191, // Based on Figma
        marginBottom: 20,
    },

    /* ─── Upgrade Button ─── */
    upgradeButton: {
        backgroundColor: '#02743F',
        height: 45,
        borderRadius: 22.5,
        alignSelf: 'center',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        marginBottom: 30,
        paddingHorizontal: 20,
    },
    upgradeButtonText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        color: '#FFFFFF',
        fontSize: 14,
    },

    /* ─── Disclaimer Section ─── */
    disclaimerHeader: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 14,
        color: '#2F2F2F',
        marginBottom: 10,
    },
    disclaimerSubtitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontWeight: 'normal',
    },
    disclaimerBox: {
        paddingHorizontal: 5,
    },
    disclaimerText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 10,
        color: '#2F2F2F',
        lineHeight: 16,
        marginBottom: 10,
    },
    disclaimerBold: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        color: '#1E1E1E',
    },
    divider: {
        height: 1,
        backgroundColor: '#D9D9D9',
        marginVertical: 5,
    }
});
