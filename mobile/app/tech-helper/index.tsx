import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Platform,
    ScrollView,
    TextInput
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import ImageUploadBox from '@/components/common/ImageUploadBox';
import { Colors, Fonts, FontSize, Spacing, Radius, Shadow } from '@/constants/theme';

// Feature items array according to PRD
const ISSUES = [
    { id: 'phone', title: 'Phone Help', sub: '(WhatsApp, Zoom, Contacts setup)' },
    { id: 'tv_wifi', title: 'TV & Wi-Fi', sub: '(Netflix login, Remote fix)' },
    { id: 'banking', title: 'Banking App', sub: '(Teach me how to use UPI safely)' },
];

export default function TechHelperScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    // State for multi-select checkboxes
    const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
    const [otherIssue, setOtherIssue] = useState('');

    // State for mode selection (radio button)
    const [selectedMode, setSelectedMode] = useState<'home' | 'phone'>('home');

    const toggleIssue = (id: string) => {
        setSelectedIssues(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    return (
        <View style={styles.screen}>
            {/* Header extension */}
            <View style={{ backgroundColor: Colors.primary, height: insets.top }} />
            <StatusBar style="light" backgroundColor={Colors.primary} />

            {/* ─── Header ─── */}
            <View style={styles.headerContainer}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.textWhite} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Tech Helper</Text>
            </View>

            {/* ─── Main Content Container ─── */}
            <View style={styles.contentContainer}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    {/* Hero Title & Tagline */}
                    <Text style={styles.mainTitle}>Tech Helper</Text>
                    <Text style={styles.subTitle}>We fix phones, Wi-Fi, and TV remotes.</Text>
                    <View style={styles.divider} />

                    {/* ─── What's the issue? (Multi-select) ─── */}
                    <Text style={styles.sectionTitle}>What's the issue?</Text>

                    {ISSUES.map((issue) => {
                        const isSelected = selectedIssues.includes(issue.id);
                        return (
                            <TouchableOpacity
                                key={issue.id}
                                style={[styles.checkboxCard, isSelected && styles.checkboxCardSelected]}
                                activeOpacity={0.7}
                                onPress={() => toggleIssue(issue.id)}
                            >
                                <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                                    {isSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                                </View>
                                <View style={styles.checkboxTextGroup}>
                                    <Text style={[styles.issueTitle, isSelected && styles.issueTitleSelected]}>{issue.title}</Text>
                                    <Text style={styles.issueSubTitle}>{issue.sub}</Text>
                                </View>
                            </TouchableOpacity>
                        )
                    })}

                    {/* ─── Something Else? (Text Box) ─── */}
                    <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Something Else?</Text>
                    <View style={styles.textInputBox}>
                        <TextInput
                            style={styles.textInput}
                            placeholder="Describe the problem you are facing..."
                            placeholderTextColor="#898989"
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                            value={otherIssue}
                            onChangeText={setOtherIssue}
                        />
                    </View>

                    {/* ─── Upload Photos ─── */}
                    <View style={{ marginTop: 20 }}>
                        <ImageUploadBox
                            title="Upload Photos (Optional)"
                            subtitle="Show us the error message or broken device"
                        />
                    </View>

                    <View style={styles.divider} />

                    {/* ─── Select Mode & Price (Radio Buttons) ─── */}
                    <Text style={styles.sectionTitle}>Select Mode</Text>

                    {/* Mode: Home Visit */}
                    <TouchableOpacity
                        style={[styles.radioCard, selectedMode === 'home' && styles.radioCardSelected]}
                        activeOpacity={0.7}
                        onPress={() => setSelectedMode('home')}
                    >
                        <View style={[styles.radioCircle, selectedMode === 'home' && styles.radioCircleSelected]} />
                        <View style={styles.radioTextGroup}>
                            <Text style={styles.radioTitle}>Home Visit</Text>
                            <Text style={styles.radioSubTitle}>A buddy comes to teach</Text>
                        </View>
                        <Text style={styles.radioPrice}>₹599</Text>
                    </TouchableOpacity>

                    {/* Mode: Phone Call */}
                    <TouchableOpacity
                        style={[styles.radioCard, selectedMode === 'phone' && styles.radioCardSelected]}
                        activeOpacity={0.7}
                        onPress={() => setSelectedMode('phone')}
                    >
                        <View style={[styles.radioCircle, selectedMode === 'phone' && styles.radioCircleSelected]} />
                        <View style={styles.radioTextGroup}>
                            <Text style={styles.radioTitle}>Phone Call</Text>
                            <Text style={styles.radioSubTitle}>Remote help</Text>
                        </View>
                        <Text style={styles.radioPrice}>₹399</Text>
                    </TouchableOpacity>

                    {/* ─── Book Support Button ─── */}
                    <View style={styles.footerSpacing} />
                    <TouchableOpacity
                        style={styles.submitButton}
                        activeOpacity={0.8}
                        onPress={() => {
                            const selectedLabels = selectedIssues.map(id => ISSUES.find(i => i.id === id)?.title).filter(Boolean);
                            const desc = [...selectedLabels, otherIssue].filter(Boolean).join(', ');
                            router.push({
                                pathname: '/service-confirmation',
                                params: {
                                    serviceName: 'Tech Helper',
                                    description: desc,
                                    address: '123 Baker St, London',
                                    fee: selectedMode === 'home' ? '₹599' : '₹399'
                                }
                            });
                        }}
                    >
                        <Text style={styles.submitButtonText}>Book Tech Support</Text>
                    </TouchableOpacity>

                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: Colors.primary,
    },

    /* ─── Header ─── */
    headerContainer: {
        backgroundColor: Colors.primary,
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
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading2,
        color: Colors.textWhite,
        letterSpacing: -0.24,
    },

    /* ─── Content Area ─── */
    contentContainer: {
        flex: 1,
        backgroundColor: Colors.bgScreen,
        borderTopLeftRadius: Radius.xl * 2,
        borderTopRightRadius: Radius.xl * 2,
        ...Shadow.card,
    },
    scrollContent: {
        paddingTop: Spacing.xl,
        paddingHorizontal: Spacing.xl,
        paddingBottom: 40,
    },

    mainTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading1,
        color: Colors.textDark,
        marginBottom: 5,
        textAlign: 'center',
    },
    subTitle: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.body,
        color: Colors.textMuted,
        textAlign: 'center',
        marginBottom: 20,
    },
    divider: {
        height: 1,
        backgroundColor: '#D9D9D9',
        marginVertical: 15,
    },
    sectionTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading3,
        color: Colors.textDark,
        marginBottom: 15,
    },

    /* ─── Checkboxes ─── */
    checkboxCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.bgCard,
        borderRadius: Radius.md,
        padding: Spacing.lg,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        ...Shadow.card,
    },
    checkboxCardSelected: {
        borderColor: Colors.primary,
        backgroundColor: 'rgba(4, 131, 87, 0.05)',
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: Colors.textLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    checkboxSelected: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    checkboxTextGroup: {
        flex: 1,
    },
    issueTitle: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.body,
        color: Colors.textDark,
    },
    issueTitleSelected: {
        color: Colors.primary,
    },
    issueSubTitle: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.bodySmall,
        color: Colors.textMuted,
        marginTop: 2,
    },

    /* ─── Text Input ─── */
    textInputBox: {
        backgroundColor: Colors.bgCard,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        padding: Spacing.lg,
        minHeight: 100,
    },
    textInput: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.body,
        color: Colors.textDark,
        flex: 1,
    },

    /* ─── Radio Cards ─── */
    radioCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.bgCard,
        borderRadius: Radius.md,
        padding: 18,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: Colors.borderLight,
    },
    radioCardSelected: {
        borderColor: Colors.primary,
        backgroundColor: 'rgba(4, 131, 87, 0.05)',
        borderWidth: 1.5,
    },
    radioCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: Colors.textLight,
        marginRight: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioCircleSelected: {
        borderColor: Colors.primary,
        borderWidth: 6, // Forms the dot
    },
    radioTextGroup: {
        flex: 1,
    },
    radioTitle: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.body,
        color: Colors.textDark,
    },
    radioSubTitle: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.bodySmall,
        color: Colors.textMuted,
        marginTop: 2,
    },
    radioPrice: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading2,
        color: Colors.primary,
    },

    /* ─── Button ─── */
    footerSpacing: {
        height: 20,
    },
    submitButton: {
        backgroundColor: Colors.primary,
        height: 50,
        borderRadius: Radius.full,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadow.card,
    },
    submitButtonText: {
        fontFamily: Fonts.medium,
        color: Colors.textWhite,
        fontSize: FontSize.button,
    },
});
