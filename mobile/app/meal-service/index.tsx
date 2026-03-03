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
const imgThali = require('@/assets/images/6fdd60a0eb22e90770fb958a6ddcf54c1c9dc6b6.png'); // Meal image
const imgCheckmark = require('@/assets/images/019640d27de157c119b045c46aae6a6559dd3a79.png'); // Green Check Circle

// Radio button mock components for the static layout
const CheckedRadio = () => (
    <View style={styles.radioContainer}>
        <Image source={imgCheckmark} style={styles.checkedRadioIcon} />
    </View>
);

const UncheckedRadio = () => (
    <View style={styles.radioContainer}>
        <View style={styles.uncheckedRadioCircle} />
    </View>
);

const CheckedSolidRadio = () => (
    <View style={styles.radioContainer}>
        <View style={styles.solidCheckedRadio} />
    </View>
);

export default function MealServiceScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    return (
        <View style={styles.screen}>
            {/* Header extension */}
            <View style={{ backgroundColor: '#048357', height: insets.top }} />
            <StatusBar style="light" backgroundColor="#048357" />

            {/* ─── Header ─── */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Select Meal Plan</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* ─── Top Meal Selection Card ─── */}
                <View style={styles.mealSelectionCard}>
                    <View style={styles.mealOptionsContainer}>

                        <View style={styles.mealOptionItem}>
                            <UncheckedRadio />
                            <View>
                                <Text style={styles.mealOptionTitle}>Diabetic Friendly</Text>
                                <Text style={styles.mealOptionDesc}>(Low GI, Less rice)</Text>
                            </View>
                        </View>

                        <View style={styles.mealOptionItem}>
                            <CheckedRadio />
                            <View>
                                <Text style={styles.mealOptionTitle}>Home Style</Text>
                                <Text style={styles.mealOptionDesc}>(Roti,Dal, Sabzi)</Text>
                            </View>
                        </View>

                        <View style={styles.mealOptionItem}>
                            <UncheckedRadio />
                            <View>
                                <Text style={styles.mealOptionTitle}>Soft Food</Text>
                                <Text style={styles.mealOptionDesc}>(Khichdi/porridge - for{'\n'}recovering patients)</Text>
                            </View>
                        </View>

                    </View>

                    {/* Right side Image & Decoration */}
                    <View style={styles.mealImageContainer}>
                        <Image source={imgThali} style={styles.mealImage} resizeMode="contain" />
                    </View>

                    {/* Dots indicator at bottom */}
                    <View style={styles.paginationDots}>
                        <View style={[styles.dot, styles.dotInactive]} />
                        <View style={[styles.dot, styles.dotInactive]} />
                        <View style={[styles.dot, styles.dotActive]} />
                    </View>
                </View>

                {/* ─── Subscription Mode ─── */}
                <Text style={styles.sectionTitle}>Subscription Mode</Text>
                <View style={styles.sectionCard}>
                    <View style={styles.optionRow}>
                        <UncheckedRadio />
                        <Text style={styles.optionMainText}>Trial<Text style={styles.optionSubText}>(3 Days)</Text></Text>
                    </View>
                    <View style={{ height: 18 }} />
                    <View style={styles.optionRow}>
                        <CheckedSolidRadio />
                        <Text style={styles.optionMainText}>Monthly Subscription</Text>
                    </View>
                </View>

                {/* ─── Dietary Preferences ─── */}
                <Text style={styles.sectionTitle}>Dietary Preferences</Text>
                <View style={styles.sectionCard}>

                    <View style={styles.preferenceRow}>
                        <View style={styles.switchBox}>
                            <Image source={imgCheckmark} style={styles.checkedSwitchIcon} />
                            <View style={styles.uncheckedRadioCircle} />
                        </View>
                        <Text style={styles.preferenceText}>No Onion/Garlic?</Text>
                    </View>

                    <View style={{ height: 16 }} />

                    <View style={styles.preferenceRow}>
                        <View style={styles.switchBox}>
                            <Image source={imgCheckmark} style={styles.checkedSwitchIcon} />
                            <View style={styles.solidCheckedRadio} />
                        </View>
                        <Text style={styles.preferenceText}>Spicy / Non-Spicy?</Text>
                    </View>

                </View>

                {/* ─── Something Else? ─── */}
                <Text style={styles.sectionTitle}>Something Else?</Text>
                <View style={styles.textAreaContainer}>
                    <Text style={styles.textAreaPlaceholder}>write your specific requirement...(e.g, ‘No Salt’)</Text>
                </View>

                {/* ─── Action Button ─── */}
                <TouchableOpacity style={styles.submitButton} activeOpacity={0.8}>
                    <Text style={styles.submitButtonText}>Request Tiffin</Text>
                </TouchableOpacity>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#FDFDE8', // Cream color matches Figma
    },
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
        paddingHorizontal: 15,
        paddingTop: 20,
        paddingBottom: 40,
    },

    /* ─── Top Meal Selection Card ─── */
    mealSelectionCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        padding: 18,
        paddingTop: 20,
        marginBottom: 25,
        flexDirection: 'row',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 15,
        elevation: 5,
        minHeight: 182,
        position: 'relative',
    },
    mealOptionsContainer: {
        flex: 1,
        zIndex: 2,
    },
    mealOptionItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    mealOptionTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 15,
        color: '#2F2F2F',
        lineHeight: 20,
    },
    mealOptionDesc: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 12,
        color: '#777777',
        marginTop: 2,
    },
    mealImageContainer: {
        position: 'absolute',
        right: -10, // Let it bleed out slightly to match design
        top: 25,
        width: 170,
        height: 115,
        zIndex: 1,
    },
    mealImage: {
        width: '100%',
        height: '100%',
        // Slight rotation matches screenshot
        transform: [{ rotate: '-8.37deg' }],
    },
    paginationDots: {
        position: 'absolute',
        bottom: 15,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginHorizontal: 3,
    },
    dotInactive: {
        backgroundColor: 'rgba(4, 131, 87, 0.4)', // Faded green
    },
    dotActive: {
        backgroundColor: '#048357', // Solid green
    },

    /* ─── Section Header ─── */
    sectionTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 16,
        color: '#2F2F2F',
        marginLeft: 5,
        marginBottom: 12,
    },

    /* ─── Outlined Cards ─── */
    sectionCard: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#048357',
        borderRadius: 10,
        padding: 20,
        paddingVertical: 22,
        marginBottom: 20,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    optionMainText: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 16,
        color: '#2F2F2F',
    },
    optionSubText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontWeight: 'normal',
    },

    /* ─── Dietary Preferences ─── */
    preferenceRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    switchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 10,
    },
    preferenceText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 16,
        color: '#898989',
    },
    checkedSwitchIcon: {
        width: 20,
        height: 20,
        marginRight: 6,
    },

    /* ─── Text Area ─── */
    textAreaContainer: {
        height: 53,
        borderWidth: 1,
        borderColor: '#048357',
        borderRadius: 10,
        paddingHorizontal: 15,
        justifyContent: 'center',
        marginBottom: 35,
    },
    textAreaPlaceholder: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 15,
        color: '#555555',
    },

    /* ─── Reusable Components ─── */
    radioContainer: {
        width: 24,
        marginRight: 8,
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        marginTop: 2,
    },
    checkedRadioIcon: {
        width: 16,
        height: 16,
    },
    uncheckedRadioCircle: {
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#777777', // subtle gray
    },
    solidCheckedRadio: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#048357',
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
    },
    submitButtonText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        color: '#FFFFFF',
        fontSize: 14,
    },
});
