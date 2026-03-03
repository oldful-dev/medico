// Insurance - Landing
// PRD: Tailored for seniors/parents with pre-existing condition tracking
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Platform,
    TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// ─── Pre-existing Conditions from Figma ───
const CONDITIONS = [
    { label: 'Diabetes', selected: true },
    { label: 'Hypertension (BP)', selected: true },
    { label: 'Heart Condition', selected: false },
    { label: 'None', selected: false, isNone: true },
];

// ─── Who Is It For ───
const RECIPIENTS = [
    { label: 'Self (Age 45-70)', selected: true, icon: 'person' as const },
    { label: 'Parents', selected: false, icon: 'people' as const },
];

export default function InsuranceScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    return (
        <View style={styles.screen}>
            <View style={{ backgroundColor: '#048357', height: insets.top }} />
            <StatusBar style="light" backgroundColor="#048357" />

            {/* ─── Header ─── */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Insurance Plan</Text>
                <View style={{ width: 34 }} />
            </View>

            {/* ─── Content Card ─── */}
            <View style={styles.contentCard}>
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* ─── Main Form Card (matches Figma Rectangle 157) ─── */}
                    <View style={styles.formWrapper}>
                        {/* Title */}
                        <Text style={styles.pageTitle}>Get an Insurance Plan</Text>
                        <Text style={styles.pageSubtitle}>
                            Find the best health insurance plan tailored for you or your parents.
                        </Text>

                        {/* ─── Who Is It For? ─── */}
                        <View style={styles.sectionCard}>
                            <Text style={styles.sectionTitle}>Who is it for?</Text>
                            <View style={styles.recipientRow}>
                                {RECIPIENTS.map((item, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={[
                                            styles.recipientButton,
                                            item.selected && styles.recipientButtonSelected,
                                        ]}
                                    >
                                        <Ionicons
                                            name={item.selected ? 'radio-button-on' : 'radio-button-off'}
                                            size={15}
                                            color={item.selected ? '#048357' : '#AAAEAC'}
                                        />
                                        <Text style={[
                                            styles.recipientText,
                                            item.selected && styles.recipientTextSelected,
                                        ]}>
                                            {item.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* ─── Pre-existing Conditions ─── */}
                        <Text style={styles.conditionHeader}>
                            Do you existing have diseases?{'\n'}
                            <Text style={styles.conditionSubHeader}>(Crucial for premium calculation)</Text>
                        </Text>

                        {CONDITIONS.map((cond, index) => (
                            <TouchableOpacity key={index} style={styles.conditionItem}>
                                <View style={[
                                    styles.conditionCheckbox,
                                    cond.selected && styles.conditionCheckboxSelected,
                                ]}>
                                    {cond.selected && (
                                        <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                                    )}
                                </View>
                                <Text style={[
                                    styles.conditionLabel,
                                    cond.selected && styles.conditionLabelSelected,
                                ]}>
                                    {cond.label}
                                </Text>
                            </TouchableOpacity>
                        ))}

                        {/* ─── Requirements Text Area ─── */}
                        <Text style={styles.requirementsLabel}>Write what you're looking for</Text>
                        <View style={styles.textAreaCard}>
                            <TextInput
                                style={styles.textArea}
                                placeholder="Describe your requirements or preferences....."
                                placeholderTextColor="#AAAEAC"
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                            />
                        </View>

                        {/* ─── Submit Button ─── */}
                        <View style={styles.submitContainer}>
                            <TouchableOpacity style={styles.submitButton} activeOpacity={0.8}>
                                <Text style={styles.submitButtonText}>Submit</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#048357',
    },

    /* ─── Header ─── */
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#048357',
        paddingHorizontal: 16,
        paddingBottom: 20,
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

    /* ─── Content Card ─── */
    contentCard: {
        flex: 1,
        backgroundColor: '#FDFDE8',
        borderTopLeftRadius: 45,
        borderTopRightRadius: 45,
        overflow: 'hidden',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 17,
        paddingTop: 28,
        paddingBottom: 40,
    },

    /* ─── Form Wrapper (Figma Rectangle 157) ─── */
    formWrapper: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 18,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },

    /* ─── Page Title ─── */
    pageTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 20,
        color: '#555555',
        textAlign: 'center',
        marginBottom: 6,
        letterSpacing: -0.24,
    },
    pageSubtitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 11,
        color: '#777777',
        textAlign: 'center',
        lineHeight: 16,
        marginBottom: 20,
    },

    /* ─── Who is it for? Section ─── */
    sectionCard: {
        backgroundColor: '#FFFDFD',
        borderRadius: 12,
        padding: 14,
        marginBottom: 18,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    sectionTitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 14,
        color: '#2F2F2F',
        marginBottom: 10,
        letterSpacing: -0.24,
    },
    recipientRow: {
        flexDirection: 'row',
        gap: 10,
    },
    recipientButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 36,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(143,143,143,0.3)',
        gap: 6,
    },
    recipientButtonSelected: {
        borderColor: '#048357',
        backgroundColor: 'rgba(4, 131, 87, 0.05)',
    },
    recipientText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 11,
        color: '#555555',
    },
    recipientTextSelected: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        color: '#02743F',
    },

    /* ─── Pre-existing Conditions ─── */
    conditionHeader: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 13,
        color: '#2F2F2F',
        marginBottom: 14,
        lineHeight: 20,
    },
    conditionSubHeader: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 11,
        color: '#777777',
    },
    conditionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 10,
    },
    conditionCheckbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 1.5,
        borderColor: '#DADADA',
        justifyContent: 'center',
        alignItems: 'center',
    },
    conditionCheckboxSelected: {
        backgroundColor: '#048357',
        borderColor: '#048357',
    },
    conditionLabel: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 13,
        color: '#555555',
    },
    conditionLabelSelected: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        color: '#2F2F2F',
    },

    /* ─── Requirements Text Area ─── */
    requirementsLabel: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 13,
        color: '#2F2F2F',
        marginTop: 12,
        marginBottom: 8,
    },
    textAreaCard: {
        backgroundColor: '#FFFDFD',
        borderRadius: 10,
        borderWidth: 0.8,
        borderColor: 'rgba(143,143,143,0.2)',
        marginBottom: 20,
    },
    textArea: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 12,
        color: '#2F2F2F',
        padding: 14,
        height: 102,
    },

    /* ─── Submit Button ─── */
    submitContainer: {
        alignItems: 'center',
    },
    submitButton: {
        width: 281,
        height: 45,
        backgroundColor: '#02743F',
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    submitButtonText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 14,
        color: '#FFFFFF',
    },
});
