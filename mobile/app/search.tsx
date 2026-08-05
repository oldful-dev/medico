// Search Screen - Global search across all services
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useUser } from '@/context/UserContext';
import { useTheme } from '@/context/ThemeContext';

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
    'AC repair',
    'Physiotherapy',
    'Order medicines',
];

export default function SearchScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { services } = useUser();
    const { isDarkMode } = useTheme();
    const styles = makeStyles(isDarkMode);

    const [query, setQuery] = React.useState('');
    const [results, setResults] = React.useState<{ id?: string; name: string; description?: string; slug: string; route?: string }[]>([]);
    const [recentSearches, setRecentSearches] = React.useState<string[]>([]);

    // ─── Persistence ───
    React.useEffect(() => {
        (async () => {
            const saved = await AsyncStorage.getItem('@recent_searches');
            if (saved) setRecentSearches(JSON.parse(saved));
        })();
    }, []);

    const saveRecent = async (term: string) => {
        if (!term.trim()) return;
        const updated = [term, ...recentSearches.filter(s => s !== term)].slice(0, 5);
        setRecentSearches(updated);
        await AsyncStorage.setItem('@recent_searches', JSON.stringify(updated));
    };

    const clearRecent = async () => {
        setRecentSearches([]);
        await AsyncStorage.removeItem('@recent_searches');
    };

    // ─── Search Logic ───
    React.useEffect(() => {
        if (query.trim().length > 1) {
            const filtered = services.filter(s =>
                s.name.toLowerCase().includes(query.toLowerCase()) ||
                s.description?.toLowerCase().includes(query.toLowerCase()) ||
                s.slug.toLowerCase().includes(query.toLowerCase())
            );
            setResults(filtered);
        } else {
            setResults([]);
        }
    }, [query, services]);

    const handleServiceSelect = (service: { name: string; slug: string; route?: string }) => {
        saveRecent(service.name);
        router.push((service.route || `/${service.slug}`) as Parameters<typeof router.push>[0]);
    };

    return (
        <View style={[styles.screen, { backgroundColor: '#048357' }]}>
            <View style={{ backgroundColor: '#048357', height: insets.top }} />
            <StatusBar style="light" backgroundColor="#048357" />

            {/* Header */}
            <View style={[styles.header, { backgroundColor: '#048357' }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Search</Text>
            </View>

            <View style={[styles.contentCard, { backgroundColor: isDarkMode ? '#252525' : '#FAF7ED' }]}>
                <View style={styles.searchBarContainer}>
                    <View style={[styles.searchBar, { backgroundColor: isDarkMode ? '#3A3A3A' : '#FAF7ED' }]}>
                        <Ionicons name="search" size={18} color={isDarkMode ? '#808080' : '#AAAEAC'} style={styles.searchIcon} />
                        <TextInput
                            style={[styles.searchInput, { color: isDarkMode ? '#E0E0E0' : '#2F2F2F' }]}
                            placeholder="Search services, doctors, tests..."
                            placeholderTextColor={isDarkMode ? '#808080' : '#AAAEAC'}
                            autoFocus={true}
                            value={query}
                            onChangeText={setQuery}
                        />
                        {query.length > 0 && (
                            <TouchableOpacity onPress={() => setQuery('')}>
                                <Ionicons name="close-circle" size={18} color={isDarkMode ? '#808080' : '#AAAEAC'} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {query.length > 1 ? (
                        <View style={styles.resultsContainer}>
                            <Text style={[styles.sectionTitle, { color: isDarkMode ? '#52C77A' : '#02743F' }]}>Results for &quot;{query}&quot;</Text>
                            {results.length > 0 ? (
                                results.map((item, index) => (
                                    <TouchableOpacity
                                        key={item.id || index}
                                        style={[styles.resultItem, { backgroundColor: isDarkMode ? '#3A3A3A' : '#FAF7ED' }]}
                                        onPress={() => handleServiceSelect(item)}
                                    >
                                        <View style={styles.resultIconBox}>
                                            <Ionicons name="medical" size={20} color="#048357" />
                                        </View>
                                        <View style={styles.resultInfo}>
                                            <Text style={[styles.resultName, { color: isDarkMode ? '#E0E0E0' : '#2F2F2F' }]}>{item.name}</Text>
                                            <Text style={[styles.resultDesc, { color: isDarkMode ? '#A0A0A0' : '#777' }]} numberOfLines={1}>{item.description}</Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={16} color={isDarkMode ? '#808080' : '#AAAEAC'} />
                                    </TouchableOpacity>
                                ))
                            ) : (
                                <View style={styles.emptyResults}>
                                    <Ionicons name="search-outline" size={48} color={isDarkMode ? '#555555' : '#AAAEAC'} />
                                    <Text style={[styles.emptyText, { color: isDarkMode ? '#A0A0A0' : '#AAAEAC' }]}>No services found matching &quot;{query}&quot;</Text>
                                </View>
                            )}
                        </View>
                    ) : (
                        <>
                            <Text style={[styles.sectionTitle, { color: isDarkMode ? '#52C77A' : '#02743F' }]}>Browse Categories</Text>
                            <View style={styles.categoriesGrid}>
                                {CATEGORIES.map((cat, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={[styles.categoryCard, { backgroundColor: isDarkMode ? '#3A3A3A' : '#FAF7ED' }]}
                                        onPress={() => setQuery(cat.label)}
                                    >
                                        <View style={[styles.categoryIconCircle, { backgroundColor: `${cat.color}12` }]}>
                                            <Ionicons name={cat.icon} size={22} color={cat.color} />
                                        </View>
                                        <Text style={[styles.categoryLabel, { color: isDarkMode ? '#E0E0E0' : '#2F2F2F' }]}>{cat.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {recentSearches.length > 0 && (
                                <>
                                    <View style={styles.sectionHeader}>
                                        <Text style={[styles.sectionTitle, { color: isDarkMode ? '#52C77A' : '#02743F' }]}>Recent Searches</Text>
                                        <TouchableOpacity onPress={clearRecent}>
                                            <Text style={[styles.clearText, { color: '#E05E5E' }]}>Clear</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <View style={[styles.recentList, { backgroundColor: isDarkMode ? '#3A3A3A' : '#FAF7ED' }]}>
                                        {recentSearches.map((item, index) => (
                                            <TouchableOpacity
                                                key={index}
                                                style={[styles.recentItem, { borderBottomColor: isDarkMode ? '#4A4A4A' : '#F0F0F0' }]}
                                                onPress={() => setQuery(item)}
                                            >
                                                <Ionicons name="time-outline" size={16} color={isDarkMode ? '#808080' : '#AAAEAC'} />
                                                <Text style={[styles.recentText, { color: isDarkMode ? '#C0C0C0' : '#555' }]}>{item}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </>
                            )}

                            <Text style={[styles.sectionTitle, { color: isDarkMode ? '#52C77A' : '#02743F' }]}>Popular Searches</Text>
                            <View style={styles.popularGrid}>
                                {POPULAR_SEARCHES.map((item, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={[styles.popularChip, { backgroundColor: isDarkMode ? 'rgba(52,199,89,0.15)' : 'rgba(2, 116, 63, 0.08)' }]}
                                        onPress={() => setQuery(item)}
                                    >
                                        <Ionicons name="trending-up" size={12} color="#02743F" style={styles.chipIcon} />
                                        <Text style={[styles.popularChipText, { color: isDarkMode ? '#52C77A' : '#02743F' }]}>{item}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </>
                    )}
                </ScrollView>
            </View>
        </View>
    );
}

const makeStyles = (isDarkMode: boolean) => StyleSheet.create({
    screen: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 20, paddingTop: 10 },
    backButton: { padding: 5 },
    headerTitle: { flex: 1, fontFamily: 'Poppins_600SemiBold', fontSize: 20, color: '#FAF7ED', textAlign: 'left', marginLeft: 12 },
    contentCard: { flex: 1, borderTopLeftRadius: 45, borderTopRightRadius: 45, overflow: 'hidden' },
    searchBarContainer: { paddingHorizontal: 20, paddingTop: 28 },
    searchBar: {
        flexDirection: 'row', alignItems: 'center', borderRadius: 12, height: 48, paddingHorizontal: 14,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
    },
    searchIcon: { marginRight: 10 },
    searchInput: { flex: 1, fontFamily: 'LexendDeca_400Regular', fontSize: 13 },
    scrollView: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
    sectionTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, marginBottom: 12 },
    categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
    categoryCard: { width: '31%', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 10, elevation: 2 },
    categoryIconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    categoryLabel: { fontFamily: 'LexendDeca_500Medium', fontSize: 10, textAlign: 'center' },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    clearText: { fontFamily: 'LexendDeca_400Regular', fontSize: 12 },
    recentList: { borderRadius: 12, marginBottom: 20, elevation: 2 },
    recentItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 0.5, gap: 10 },
    recentText: { flex: 1, fontFamily: 'LexendDeca_400Regular', fontSize: 12 },
    popularGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    popularChip: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
    popularChipText: { fontFamily: 'LexendDeca_500Medium', fontSize: 11 },
    chipIcon: { marginRight: 4 },
    resultsContainer: { paddingBottom: 20 },
    resultItem: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 12, marginBottom: 10, elevation: 2 },
    resultIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(4, 131, 87, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    resultInfo: { flex: 1 },
    resultName: { fontFamily: 'Poppins_600SemiBold', fontSize: 14 },
    resultDesc: { fontFamily: 'LexendDeca_400Regular', fontSize: 11 },
    emptyResults: { alignItems: 'center', marginTop: 40 },
    emptyText: { fontFamily: 'LexendDeca_400Regular', fontSize: 14, marginTop: 10 },
});
