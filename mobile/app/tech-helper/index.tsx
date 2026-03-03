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
            <View style={{ backgroundColor: '#048357', height: insets.top }} />
            <StatusBar style="light" backgroundColor="#048357" />

            {/* ─── Header ─── */}
            <View style={styles.headerContainer}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
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
                    <TouchableOpacity style={styles.submitButton} activeOpacity={0.8}>
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
        backgroundColor: '#048357',
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

    /* ─── Content Area ─── */
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
    },
    scrollContent: {
        paddingTop: 30,
        paddingHorizontal: 25,
        paddingBottom: 40,
    },

    mainTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 22,
        color: '#2F2F2F',
        marginBottom: 5,
        textAlign: 'center',
    },
    subTitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 14,
        color: '#898989',
        textAlign: 'center',
        marginBottom: 20,
    },
    divider: {
        height: 1,
        backgroundColor: '#D9D9D9',
        marginVertical: 15,
    },
    sectionTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 16,
        color: '#2F2F2F',
        marginBottom: 15,
    },

    /* ─── Checkboxes ─── */
    checkboxCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 15,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#EFEFEF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    checkboxCardSelected: {
        borderColor: '#02743F',
        backgroundColor: '#F0FFF7',
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#A0A0A0',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    checkboxSelected: {
        backgroundColor: '#02743F',
        borderColor: '#02743F',
    },
    checkboxTextGroup: {
        flex: 1,
    },
    issueTitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 15,
        color: '#2F2F2F',
    },
    issueTitleSelected: {
        color: '#02743F',
    },
    issueSubTitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 12,
        color: '#777777',
        marginTop: 2,
    },

    /* ─── Text Input ─── */
    textInputBox: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#D9D9D9',
        padding: 15,
        minHeight: 100,
    },
    textInput: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 14,
        color: '#2F2F2F',
        flex: 1,
    },

    /* ─── Radio Cards ─── */
    radioCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 18,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#EFEFEF',
    },
    radioCardSelected: {
        borderColor: '#02743F',
        backgroundColor: '#F0FFF7',
        borderWidth: 1.5,
    },
    radioCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#A0A0A0',
        marginRight: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioCircleSelected: {
        borderColor: '#02743F',
        borderWidth: 6, // Forms the dot
    },
    radioTextGroup: {
        flex: 1,
    },
    radioTitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 15,
        color: '#2F2F2F',
    },
    radioSubTitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 12,
        color: '#777',
        marginTop: 2,
    },
    radioPrice: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 18,
        color: '#02743F',
    },

    /* ─── Button ─── */
    footerSpacing: {
        height: 20,
    },
    submitButton: {
        backgroundColor: '#02743F',
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 5,
    },
    submitButtonText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        color: '#FFFFFF',
        fontSize: 16,
    },
});
