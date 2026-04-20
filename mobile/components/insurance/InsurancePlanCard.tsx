// Insurance Plan Card - Display insurance plan summary
import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Image,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ─── Figma Assets (Local relative path) ───
const familyIcon = require('../../assets/images/cb86876504871abc5e6db19e5612175dae2b0479.png');

interface InsurancePlanCardProps {
    onSubmit?: (data: any) => void;
}

export default function InsurancePlanCard({ onSubmit }: InsurancePlanCardProps) {
    const [selectedTarget, setSelectedTarget] = useState('Self');

    // Disease checkboxes
    const [diseases, setDiseases] = useState({
        diabetes: true,
        hypertension: true,
        heartCondition: true,
        none: false,
    });

    const [requirements, setRequirements] = useState('');

    const toggleDisease = (key: keyof typeof diseases) => {
        if (key === 'none') {
            setDiseases({ diabetes: false, hypertension: false, heartCondition: false, none: true });
        } else {
            setDiseases(prev => ({ ...prev, [key]: !prev[key], none: false }));
        }
    };

    return (
        <View style={styles.cardContainer}>
            {/* ─── Title ─── */}
            <Text style={styles.title}>Get an Insurance Plan</Text>
            <Text style={styles.subtitle}>
                Find the best health insurance plan tailored for you or your parents.
            </Text>

            {/* ─── Who is it for? ─── */}
            <View style={styles.sectionContainerBase}>
                <Text style={styles.sectionTitle}>Who is it for?</Text>
                <View style={styles.targetRow}>
                    <TouchableOpacity
                        style={[styles.targetOption, selectedTarget === 'Self' && styles.targetOptionActive]}
                        onPress={() => setSelectedTarget('Self')}
                        activeOpacity={0.8}
                    >
                        <Ionicons
                            name={selectedTarget === 'Self' ? "radio-button-on" : "radio-button-off"}
                            size={16}
                            color={selectedTarget === 'Self' ? "#048357" : "#AAAEAC"}
                        />
                        <Text style={styles.targetText}>Self(Age 45-70)</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.targetOption, selectedTarget === 'Parents' && styles.targetOptionActive]}
                        onPress={() => setSelectedTarget('Parents')}
                        activeOpacity={0.8}
                    >
                        <Ionicons
                            name={selectedTarget === 'Parents' ? "radio-button-on" : "radio-button-off"}
                            size={16}
                            color={selectedTarget === 'Parents' ? "#048357" : "#AAAEAC"}
                        />
                        <Image source={familyIcon} style={styles.familyIcon} resizeMode="contain" />
                        <Text style={styles.targetText}>Parents</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* ─── Diseases ─── */}
            <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>
                    Do you existing have diseases? (Crucial for premium calculation)
                </Text>

                <TouchableOpacity style={styles.checkboxRow} onPress={() => toggleDisease('diabetes')} activeOpacity={0.7}>
                    <Ionicons name={diseases.diabetes ? "checkbox" : "square-outline"} size={24} color={diseases.diabetes ? "#66B22C" : "#AAAEAC"} />
                    <Text style={styles.checkboxLabel}>Diabetes</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.checkboxRow} onPress={() => toggleDisease('hypertension')} activeOpacity={0.7}>
                    <Ionicons name={diseases.hypertension ? "checkbox" : "square-outline"} size={24} color={diseases.hypertension ? "#66B22C" : "#AAAEAC"} />
                    <Text style={styles.checkboxLabel}>Hypertension(BP)</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.checkboxRow} onPress={() => toggleDisease('heartCondition')} activeOpacity={0.7}>
                    <Ionicons name={diseases.heartCondition ? "checkbox" : "square-outline"} size={24} color={diseases.heartCondition ? "#66B22C" : "#AAAEAC"} />
                    <Text style={styles.checkboxLabel}>Heart Condition</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.checkboxRow} onPress={() => toggleDisease('none')} activeOpacity={0.7}>
                    <Ionicons name={diseases.none ? "radio-button-on" : "radio-button-off"} size={24} color={diseases.none ? "#AAAEAC" : "#AAAEAC"} />
                    <Text style={styles.checkboxLabel}>None</Text>
                </TouchableOpacity>
            </View>

            {/* ─── Requirements Input ─── */}
            <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Write what you’re looking for</Text>
                <View style={styles.inputWrapper}>
                    <TextInput
                        style={styles.textInput}
                        placeholder="Describe your requirements or preferences....."
                        placeholderTextColor="#777777"
                        multiline
                        textAlignVertical="top"
                        value={requirements}
                        onChangeText={setRequirements}
                    />
                </View>
            </View>

            {/* ─── Submit Button ─── */}
            <View style={styles.submitContainer}>
                <TouchableOpacity
                    style={styles.submitButton}
                    activeOpacity={0.8}
                    onPress={() => onSubmit && onSubmit({ target: selectedTarget, diseases, requirements })}
                >
                    <Text style={styles.submitButtonText}>Submit</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    cardContainer: {
        backgroundColor: '#FFFFEE', // Light yellow background as per design
        borderWidth: 4,
        borderColor: '#048357', // Hero green border
        borderRadius: 31,
        paddingHorizontal: 20,
        paddingTop: 30,
        paddingBottom: 25,
        width: '100%',
        maxWidth: 400,
        alignSelf: 'center',
    },
    title: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontWeight: '600',
        fontSize: 24,
        color: '#048357', // Fallback for gradient text in design
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 10,
        color: '#2F2F2F',
        textAlign: 'center',
        marginBottom: 20,
        paddingHorizontal: 10,
    },

    /* ─── Section Shared ─── */
    sectionContainerBase: {
        backgroundColor: 'rgba(217, 217, 217, 0.38)',
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginBottom: 24,
    },
    sectionContainer: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontWeight: '500',
        fontSize: 15,
        color: '#2F2F2F',
        marginBottom: 12,
        lineHeight: 20,
    },

    /* ─── Target Radio Buttons ─── */
    targetRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
    },
    targetOption: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F5F5F5',
        borderWidth: 1,
        borderColor: '#AAAEAC',
        height: 36,
        borderRadius: 7,
    },
    targetOptionActive: {
        backgroundColor: 'rgba(2, 116, 63, 0.13)',
        borderColor: '#02743F',
    },
    familyIcon: {
        width: 22,
        height: 22,
        marginLeft: 6,
        marginRight: 2,
    },
    targetText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 11,
        color: '#000000',
        marginLeft: 4,
    },

    /* ─── Checkboxes ─── */
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    checkboxLabel: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 16,
        color: '#2F2F2F',
        marginLeft: 10,
    },

    /* ─── Text Input ─── */
    inputWrapper: {
        backgroundColor: 'rgba(249, 246, 246, 0.38)',
        borderWidth: 1,
        borderColor: '#AAAEAC',
        borderRadius: 10,
        height: 102,
        padding: 12,
    },
    textInput: {
        flex: 1,
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 13,
        color: '#2F2F2F',
    },

    /* ─── Submit Button ─── */
    submitContainer: {
        alignItems: 'center',
        marginTop: 10,
    },
    submitButton: {
        backgroundColor: '#02743F',
        width: 281,
        height: 45,
        borderRadius: 22.5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    submitButtonText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontWeight: '500',
        fontSize: 14,
        color: '#FFFFFF',
    },
});
