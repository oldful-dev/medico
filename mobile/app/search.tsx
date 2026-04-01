// Search Screen - Global search across all services
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
import { useTranslation } from 'react-i18next';

// ─── Static Categories & Popular Searches ───
const CATEGORIES = [
    { label: 'Doctor Visit', icon: 'medkit' as const, color: '#048357' },
    { label: 'Nursing Care', icon: 'heart' as const, color: '#E05E5E' },
    { label: 'Blood Test', icon: 'water' as const, color: '#3B82F6' },
    { label: 'Medicines', icon: 'medical' as const, color: '#E8A317' },
    { label: 'Physio & Fitness', icon: 'fitness' as const, color: '#7C3AED' },
    { label: 'Meal Service', icon: 'restaurant' as const, color: '#F97316' },
];

const POPULAR_SEARCHES = [
    'Doctor home visit',
    'Blood test at home',
    'Nursing care',
    'AC repair near me',
    'Physiotherapy',
    'Order medicines',
    'Insurance plan',
    'Grocery delivery',
];

const RECENT_SEARCHES = [
    'Doctor visit for fever',
    'BP check at home',
    'Plumbing service',
];

export default function SearchScreen() {
    const { t } = useTranslation();
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
                <Text style={styles.headerTitle}>Search</Text>
                <View style={{ width: 34 }} />
            </View>

            {/* ─── Content Card ─── */}
            <View style={styles.contentCard}>
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Search Input */}
                    <View style={styles.searchBar}>
                        <Ionicons name="search" size={18} color="#AAAEAC" style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search services, doctors, tests..."
                            placeholderTextColor="#AAAEAC"
                            editable={true}
                        />
                        <TouchableOpacity style={styles.filterButton}>
                            <Ionicons name="options-outline" size={18} color="#02743F" />
                        </TouchableOpacity>
                    </View>

                    {/* ─── Browse Categories ─── */}
                    <Text style={styles.sectionTitle}>Browse Categories</Text>
                    <View style={styles.categoriesGrid}>
                        {CATEGORIES.map((cat, index) => (
                            <TouchableOpacity key={index} style={styles.categoryCard}>
                                <View style={[styles.categoryIconCircle, { backgroundColor: `${cat.color}12` }]}>
                                    <Ionicons name={cat.icon} size={22} color={cat.color} />
                                </View>
                                <Text style={styles.categoryLabel} numberOfLines={2}>{cat.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* ─── Recent Searches ─── */}
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Recent Searches</Text>
                        <TouchableOpacity>
                            <Text style={styles.clearText}>Clear</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.recentList}>
                        {RECENT_SEARCHES.map((item, index) => (
                            <TouchableOpacity key={index} style={styles.recentItem}>
                                <Ionicons name="time-outline" size={16} color="#AAAEAC" />
                                <Text style={styles.recentText}>{item}</Text>
                                <Ionicons name="arrow-forward-outline" size={14} color="#AAAEAC" />
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* ─── Popular Searches ─── */}
                    <Text style={styles.sectionTitle}>Popular Searches</Text>
                    <View style={styles.popularGrid}>
                        {POPULAR_SEARCHES.map((item, index) => (
                            <TouchableOpacity key={index} style={styles.popularChip}>
                                <Ionicons name="trending-up" size={12} color="#02743F" style={styles.chipIcon} />
                                <Text style={styles.popularChipText}>{item}</Text>
                            </TouchableOpacity>
                        ))}
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
        paddingHorizontal: 20,
        paddingTop: 28,
        paddingBottom: 40,
    },

    /* ─── Search Bar ─── */
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        height: 48,
        paddingHorizontal: 14,
        marginBottom: 24,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 3,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 13,
        color: '#2F2F2F',
        height: '100%',
    },
    filterButton: {
        padding: 4,
        marginLeft: 8,
    },

    /* ─── Section Headers ─── */
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        marginTop: 8,
    },
    sectionTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 15,
        color: '#02743F',
        marginBottom: 12,
        letterSpacing: -0.24,
    },
    clearText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 12,
        color: '#E05E5E',
        marginBottom: 12,
    },

    /* ─── Browse Categories ─── */
    categoriesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    categoryCard: {
        width: '31%',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginBottom: 10,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    categoryIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    categoryLabel: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 10,
        color: '#2F2F2F',
        textAlign: 'center',
        letterSpacing: -0.24,
    },

    /* ─── Recent Searches ─── */
    recentList: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        marginBottom: 20,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    recentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        gap: 10,
    },
    recentText: {
        flex: 1,
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 12,
        color: '#555555',
    },

    /* ─── Popular Searches ─── */
    popularGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    popularChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(2, 116, 63, 0.08)',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 0.5,
        borderColor: 'rgba(2, 116, 63, 0.2)',
    },
    chipIcon: {
        marginRight: 4,
    },
    popularChipText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 11,
        color: '#02743F',
    },
});
