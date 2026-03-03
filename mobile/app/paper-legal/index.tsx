import React, { useState } from 'react';
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
const imgCheckmark = require('@/assets/images/019640d27de157c119b045c46aae6a6559dd3a79.png'); // Green Check Circle
const imgQuestionMark = require('@/assets/images/c359f98cd0aedd8de95a2f5901d68748695c53d9.png'); // 3D Question mark icon
const imgOldfulIllustration = require('@/assets/images/49fa5256c84b3ee062131d88f5ae26383f5d5257.png'); // The lawyer/assistant illustration

export default function PaperLegalScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [selectedService, setSelectedService] = useState('Digital Life Certificate');

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

                <Text style={styles.headerTitle}>Paper and Legal</Text>
                <Text style={styles.headerSubtitle}>Pension, Life Certificates, and{'\n'}Property work.</Text>
            </View>

            {/* Main Content Area (Rounded Cream Box) */}
            <View style={styles.contentContainer}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    {/* ─── Select Service ─── */}
                    <Text style={styles.sectionTitle}>Select Service</Text>

                    <View style={styles.serviceCard}>

                        {/* Option 1: Digital Life Certificate */}
                        <TouchableOpacity style={styles.optionRow} onPress={() => setSelectedService('Digital Life Certificate')}>
                            <View style={selectedService === 'Digital Life Certificate' ? styles.radioSelected : styles.radioUnselected}>
                                {selectedService === 'Digital Life Certificate' && <View style={styles.radioInner} />}
                            </View>
                            <Text style={styles.optionMainText}>Digital life Certificate <Text style={styles.optionSubText}>(Jeevan Pramaan - Home visit)</Text></Text>
                        </TouchableOpacity>

                        {/* Option 2: Bank KYC */}
                        <TouchableOpacity style={styles.optionRow} onPress={() => setSelectedService('Bank KYC Update')}>
                            <View style={selectedService === 'Bank KYC Update' ? styles.radioSelected : styles.radioUnselected}>
                                {selectedService === 'Bank KYC Update' && <View style={styles.radioInner} />}
                            </View>
                            <Text style={styles.optionMainText}>Bank KYC Update <Text style={styles.optionSubText}>(Assistance)</Text></Text>
                        </TouchableOpacity>

                        {/* Option 3: Will Registration */}
                        <TouchableOpacity style={styles.optionRow} onPress={() => setSelectedService('Will Registration')}>
                            <View style={selectedService === 'Will Registration' ? styles.radioSelected : styles.radioUnselected}>
                                {selectedService === 'Will Registration' && <View style={styles.radioInner} />}
                            </View>
                            <Text style={styles.optionMainText}>Will Registration <Text style={styles.optionSubText}>(Lawyer Connect)</Text></Text>
                        </TouchableOpacity>

                        {/* Option 4: Govt ID Update */}
                        <TouchableOpacity style={styles.optionRow} onPress={() => setSelectedService('Govt ID Update')}>
                            <View style={selectedService === 'Govt ID Update' ? styles.radioSelected : styles.radioUnselected}>
                                {selectedService === 'Govt ID Update' && <View style={styles.radioInner} />}
                            </View>
                            <Text style={styles.optionMainText}>Govt ID Update <Text style={styles.optionSubText}>(adhar/Pan fix)</Text></Text>
                        </TouchableOpacity>

                    </View>

                    {/* ─── Details Text Area ─── */}
                    <Text style={styles.sectionTitle}>Details</Text>
                    <View style={styles.textAreaContainer}>
                        <TextInput
                            style={styles.textArea}
                            placeholder="Describe your requirement or what needs signatures..."
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                            placeholderTextColor="#898989"
                        />
                    </View>

                    {/* ─── Upload Documents ─── */}
                    <Text style={styles.sectionTitle}>Upload Documents</Text>
                    <View style={styles.uploadCard}>
                        <View style={styles.uploadDashedBox}>
                            <Ionicons name="cloud-upload-outline" size={40} color="#048357" style={styles.uploadCloudIcon} />
                            <Text style={styles.uploadTitle}>Select Relevant Documents</Text>
                            <Text style={styles.uploadSubtitle}>JPG, PNG or PDF, file size no more than 10MB</Text>
                            <TouchableOpacity style={styles.uploadButton}>
                                <Text style={styles.uploadButtonText}>SELECT FILES</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* ─── Schedule Visit ─── */}
                    <Text style={styles.sectionTitle}>Schedule Visit</Text>
                    <View style={styles.scheduleContainer}>
                        <TouchableOpacity style={styles.datePickerButton}>
                            <Ionicons name="calendar-outline" size={20} color="#048357" style={{ marginRight: 10 }} />
                            <Text style={styles.datePickerText}>Select Date & Time</Text>
                        </TouchableOpacity>
                    </View>

                    {/* ─── Book Assistant Button ─── */}
                    <TouchableOpacity style={styles.submitButton} activeOpacity={0.8}>
                        <Text style={styles.submitButtonText}>Book Assistant</Text>
                    </TouchableOpacity>

                    {/* ─── Oldful Illustration Bottom ─── */}
                    <View style={styles.illustrationContainer}>
                        <Image source={imgOldfulIllustration} style={styles.illustration} resizeMode="contain" />
                    </View>

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
        paddingVertical: 15,
        paddingBottom: 45,
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
        fontSize: 24,
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
        lineHeight: 22,
    },

    /* ─── Main Content Container (Cream Box) ─── */
    contentContainer: {
        flex: 1,
        backgroundColor: '#FDFDE8', // Cream color
        borderTopLeftRadius: 45,
        borderTopRightRadius: 45,
        paddingTop: 30, // Space from top inside cream box
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },

    /* ─── Section Header ─── */
    sectionTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 20,
        color: '#2F2F2F',
        marginBottom: 15,
        marginLeft: 5,
    },

    /* ─── Options Card ─── */
    serviceCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 25,
        paddingVertical: 25,
        paddingHorizontal: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    checkIcon: {
        width: 18,
        height: 18,
        marginRight: 10,
    },
    optionMainText: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 12,
        color: '#2F2F2F',
        flex: 1,
        flexWrap: 'wrap',
        lineHeight: 18,
    },
    optionSubText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontWeight: 'normal',
        fontSize: 11.5,
    },
    radioSelected: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: '#048357',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    radioUnselected: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: '#D9D9D9',
        marginRight: 10,
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#048357',
    },

    /* ─── Inputs & UI Components ─── */
    textAreaContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E5E5',
        marginBottom: 20,
        padding: 12,
        minHeight: 100,
    },
    textArea: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 14,
        color: '#2F2F2F',
    },

    /* ─── Upload Card ─── */
    uploadCard: {
        alignItems: 'center',
        marginBottom: 20,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 15,
        borderWidth: 1,
        borderColor: '#E5E5E5',
    },
    uploadDashedBox: {
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: '#048357',
        borderRadius: 12,
        width: '100%',
        paddingVertical: 18,
        alignItems: 'center',
        backgroundColor: 'rgba(4, 131, 87, 0.03)',
    },
    uploadCloudIcon: {
        marginBottom: 8,
    },
    uploadTitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 12,
        color: '#2F2F2F',
        marginBottom: 4,
    },
    uploadSubtitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 10,
        color: '#898989',
        marginBottom: 12,
    },
    uploadButton: {
        borderWidth: 1,
        borderColor: '#048357',
        borderRadius: 14,
        paddingVertical: 6,
        paddingHorizontal: 16,
        backgroundColor: '#FFFFFF',
    },
    uploadButtonText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 10,
        color: '#02743F',
        textTransform: 'uppercase',
    },

    /* ─── Schedule Container ─── */
    scheduleContainer: {
        marginBottom: 35,
    },
    datePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E5E5',
        paddingHorizontal: 15,
        paddingVertical: 14,
    },
    datePickerText: {
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
        marginBottom: 20,
    },
    submitButtonText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        color: '#FFFFFF',
        fontSize: 14,
    },

    /* ─── Illustration ─── */
    illustrationContainer: {
        alignItems: 'center',
        marginTop: 10,
        borderRadius: 50,
        overflow: 'hidden',
        alignSelf: 'center',
    },
    illustration: {
        width: 331,
        height: 221,
        borderRadius: 50,
    },
});
