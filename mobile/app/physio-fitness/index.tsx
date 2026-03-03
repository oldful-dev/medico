import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Platform,
    ScrollView,
    TextInput
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// ─── Figma Assets ───
const imgPainRelief = require('@/assets/images/19384cdb0d3b6490a3d5bfa98457389b6d565416.png'); // Pain relief illustration
const imgSeniorFitnessRight = require('@/assets/images/a6d4ed0a2bd9de082ab0ad9c67504e0708c7343f.png'); // Senior fitness rigth illustration
const imgSeniorFitnessLeft = require('@/assets/images/3abc2815df401d4b6b19fda9a2f8c9fd80b8f9e3.png'); // Senior fitness left illustration
const imgCalendar = require('@/assets/images/9db46350ce94677b709648f4aadad3189870cab5.png'); // 3D Calendar Icon

// Constants
const BODY_PARTS = ['Back', 'Knee', 'Neck', 'Shoulder', 'Leg'];

export default function PhysioFitnessScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    // State 
    const [selectedService, setSelectedService] = useState<'pain' | 'fitness' | null>('pain');
    const [selectedBodyPart, setSelectedBodyPart] = useState<string>('Back');

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

                <Text style={styles.headerTitle}>Physio & Fitness</Text>
                <Text style={styles.headerSubtitle}>Pain relief therapy and senior-friendly yoga.</Text>
            </View>

            {/* Main Content Area (Rounded Cream Box) */}
            <View style={styles.contentContainer}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    {/* ─── Select Service ─── */}
                    <Text style={styles.sectionTitle}>Select Service</Text>

                    {/* Option: Pain Relief */}
                    <TouchableOpacity
                        style={[
                            styles.serviceCard,
                            styles.painCard,
                            selectedService === 'pain' && styles.selectedServiceCard
                        ]}
                        activeOpacity={0.8}
                        onPress={() => setSelectedService('pain')}
                    >
                        <Image source={imgPainRelief} style={styles.painIllustration} resizeMode="contain" />

                        <View style={styles.serviceTextGroup}>
                            <Text style={styles.serviceTitle}>Pain Relief</Text>
                            <Text style={styles.serviceSubtitle}>(Physiotherapy)</Text>
                            <Text style={styles.serviceDesc}>For back pain,frozen sholder,recovery</Text>
                        </View>

                        {/* Discount Badge */}
                        <View style={styles.discountBadge}>
                            <Text style={styles.discountText}>+10% OFF</Text>
                        </View>
                    </TouchableOpacity>

                    {/* Option: Senior Fitness */}
                    <TouchableOpacity
                        style={[
                            styles.serviceCard,
                            styles.fitnessCard,
                            selectedService === 'fitness' && styles.selectedServiceCard
                        ]}
                        activeOpacity={0.8}
                        onPress={() => setSelectedService('fitness')}
                    >
                        <Image source={imgSeniorFitnessLeft} style={styles.fitnessIllustrationLeft} resizeMode="contain" />

                        <View style={[styles.serviceTextGroup, { alignItems: 'center', flex: 1 }]}>
                            <Text style={styles.serviceTitle}>Senior Fitness</Text>
                            <Text style={styles.serviceSubtitle}>(Yoga/Exercise)</Text>
                            <Text style={styles.serviceDesc}>To stay active and mobile </Text>
                        </View>

                        <Image source={imgSeniorFitnessRight} style={styles.fitnessIllustrationRight} resizeMode="contain" />
                    </TouchableOpacity>

                    {/* ─── Select Body Part ─── */}
                    <Text style={styles.sectionTitle}>Select Body Part</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bodyPartScroll}>
                        {BODY_PARTS.map((part) => {
                            const isSelected = selectedBodyPart === part;
                            return (
                                <TouchableOpacity
                                    key={part}
                                    style={[styles.bodyPartPill, isSelected && styles.bodyPartPillSelected]}
                                    onPress={() => setSelectedBodyPart(part)}
                                >
                                    <Text style={[styles.bodyPartText, isSelected && styles.bodyPartTextSelected]}>
                                        {part}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    {/* ─── Other Issue ─── */}
                    <Text style={styles.sectionTitle}>Other Issue</Text>
                    <View style={styles.inputCard}>
                        {/* Light cyan icon box */}
                        <View style={styles.issueIconBox}>
                            <View style={styles.issueIconLine} />
                            <View style={styles.issueIconLine} />
                        </View>
                        <TextInput
                            placeholder="Describe your issue"
                            style={styles.textInput}
                            placeholderTextColor="#555"
                        />
                    </View>

                    {/* ─── Date / Time Selection ─── */}
                    <TouchableOpacity style={[styles.inputCard, { marginBottom: 35 }]} activeOpacity={0.7}>
                        <Image source={imgCalendar} style={styles.calendarIcon} resizeMode="contain" />
                        <Text style={styles.dateTimeText}>April 25, 2024 | Time 10:00 AM</Text>
                        <Ionicons name="chevron-forward" size={20} color="#555" style={{ marginLeft: 'auto' }} />
                    </TouchableOpacity>

                    {/* ─── Book Appointment Button ─── */}
                    <TouchableOpacity style={styles.submitButton} activeOpacity={0.8}>
                        <Text style={styles.submitButtonText}>Book Appointment</Text>
                    </TouchableOpacity>

                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#048357', // Solid dark green from Figma behind
    },

    /* ─── Header ─── */
    headerContainer: {
        backgroundColor: '#048357',
        alignItems: 'center',
        paddingVertical: 20,
        paddingBottom: 40,
        position: 'relative',
    },
    backButton: {
        position: 'absolute',
        top: 20,
        left: 16,
        padding: 5,
        zIndex: 10,
    },
    headerTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 26,
        color: '#FFFFFF',
        letterSpacing: -0.24,
        marginBottom: 8,
    },
    headerSubtitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 16,
        color: '#D9D9D9',
        textAlign: 'center',
        letterSpacing: -0.24,
        paddingHorizontal: 20,
    },

    /* ─── Main Content Container (Cream Box) ─── */
    contentContainer: {
        flex: 1,
        backgroundColor: '#FDFDE8', // Cream color
        borderTopLeftRadius: 45,
        borderTopRightRadius: 45,
        paddingTop: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    scrollContent: {
        paddingHorizontal: 25,
        paddingBottom: 40,
    },

    /* ─── Sections ─── */
    sectionTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 20,
        color: '#2F2F2F',
        marginBottom: 15,
        marginTop: 5,
    },

    /* ─── Service Cards ─── */
    serviceCard: {
        height: 115,
        borderRadius: 15,
        marginBottom: 15,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        position: 'relative',
        borderWidth: 1,
    },
    selectedServiceCard: {
        // We could add an active state border here if desired, skipping for exact match logic
    },
    painCard: {
        backgroundColor: '#FFEBDF',
        borderColor: '#FF8800', // Orange border
    },
    fitnessCard: {
        backgroundColor: '#D3FBFF',
        borderColor: '#313A51', // Dark blue border
    },

    painIllustration: {
        width: 62,
        height: 93,
        marginRight: 10,
    },
    fitnessIllustrationLeft: {
        width: 50,
        height: 50,
    },
    fitnessIllustrationRight: {
        width: 73,
        height: 90,
    },

    serviceTextGroup: {
        justifyContent: 'center',
    },
    serviceTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 20,
        color: '#2F2F2F',
    },
    serviceSubtitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 16,
        color: '#2F2F2F',
        marginTop: 2,
    },
    serviceDesc: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 12,
        color: '#777777',
        marginTop: 4,
    },

    discountBadge: {
        position: 'absolute',
        top: 23,
        right: 15,
        backgroundColor: 'rgba(15, 185, 46, 0.52)',
        borderColor: '#048357',
        borderWidth: 1,
        borderRadius: 23,
        height: 37,
        width: 87,
        justifyContent: 'center',
        alignItems: 'center',
    },
    discountText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        color: '#FFFFFF',
        fontSize: 11,
    },

    /* ─── Body Parts ─── */
    bodyPartScroll: {
        paddingVertical: 5,
        marginBottom: 20,
        gap: 10,
    },
    bodyPartPill: {
        height: 31,
        minWidth: 63,
        borderRadius: 23,
        borderWidth: 1,
        borderColor: '#AAAEAC',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 12,
        backgroundColor: 'transparent',
    },
    bodyPartPillSelected: {
        backgroundColor: 'rgba(4, 131, 87, 0.74)', // Teal/Green
        borderColor: '#02743F',
    },
    bodyPartText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 12,
        color: '#555555',
    },
    bodyPartTextSelected: {
        color: '#FFFFFF',
    },

    /* ─── Input & Calendar Cards ─── */
    inputCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingHorizontal: 15,
        height: 59,
        marginBottom: 15,
        shadowColor: '#02743F',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 15,
        elevation: 3,
    },

    issueIconBox: {
        width: 43,
        height: 33,
        backgroundColor: '#A7FFF2',
        borderColor: '#C4F3EC',
        borderWidth: 1,
        borderRadius: 7,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
        gap: 3,
    },
    issueIconLine: {
        width: 21,
        height: 3,
        backgroundColor: '#FFFAFA',
        borderRadius: 2,
    },
    textInput: {
        flex: 1,
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 14,
        color: '#2F2F2F',
    },

    calendarIcon: {
        width: 41,
        height: 41,
        marginRight: 12,
    },
    dateTimeText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 14,
        color: '#555555',
    },

    /* ─── Submit Button ─── */
    submitButton: {
        backgroundColor: '#02743F',
        height: 45,
        borderRadius: 22.5,
        width: 281,
        alignSelf: 'center',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
    },
    submitButtonText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        color: '#FFFFFF',
        fontSize: 14,
    },
});
