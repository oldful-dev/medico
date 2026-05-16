import React, { useState, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    TextInput,
    RefreshControl,
    Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSize, Spacing, Radius, Shadow } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { useUser } from '@/context/UserContext';

const TEST_ICON_MAP: Record<string, string> = {
    urine: 'water',
    iron: 'beaker',
    full: 'heart',
    checkup: 'medical',
    screening: 'search',
    advanced: 'analytics',
    package: 'cube',
    hemoglobin: 'flash',
    diabetes: 'warning',
    thyroid: 'ellipsis-horizontal',
    lipid: 'flask',
    liver: 'code-working',
    kidney: 'body',
};

const CATEGORY_COLORS = [
    { bg: '#047857', light: '#F0FDF4', text: '#047857', name: 'Emerald' },
    { bg: '#1E40AF', light: '#EFF6FF', text: '#1E40AF', name: 'Blue' },
    { bg: '#6D28D9', light: '#F3F0FF', text: '#6D28D9', name: 'Violet' },
    { bg: '#B45309', light: '#FFFBEB', text: '#B45309', name: 'Amber' },
    { bg: '#991B1B', light: '#FEF2F2', text: '#991B1B', name: 'Red' },
];

export default function BloodTestScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { services, isLoading: servicesLoading, refreshData } = useUser();

    const [search, setSearch] = useState('');
    const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [page, setPage] = useState(1);
    const itemsPerPage = 6;

    const getTestIcon = (name: string): string => {
        const lower = name.toLowerCase();
        for (const [key, icon] of Object.entries(TEST_ICON_MAP)) {
            if (lower.includes(key)) return icon;
        }
        return 'medical';
    };

    const getColorByIndex = (index: number) => {
        return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
    };

    const filteredServices = useMemo(() => {
        return services.filter(s =>
            s.name.toLowerCase().includes(search.toLowerCase())
        );
    }, [services, search]);

    const paginatedServices = useMemo(() => {
        return filteredServices.slice((page - 1) * itemsPerPage, page * itemsPerPage);
    }, [filteredServices, page]);

    const totalPages = Math.ceil(filteredServices.length / itemsPerPage);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await refreshData();
        setRefreshing(false);
    }, [refreshData]);

    const handleTestPress = (serviceId: string) => {
        setSelectedTestId(serviceId);
    };

    const handleBookTest = () => {
        if (selectedTestId) {
            const test = services.find(s => s.id === selectedTestId);
            if (test) {
                router.push({
                    pathname: '/services/[id]',
                    params: { id: selectedTestId },
                });
            }
        }
    };

    // ── LOADING ────────────────────────────────────────────────────────────────
    if (servicesLoading) {
        return (
            <View style={styles.screen}>
                <View style={{ backgroundColor: Colors.primary, height: insets.top }} />
                <StatusBar style="light" backgroundColor={Colors.primary} />
                <View style={styles.headerContainer}>
                    <Text style={styles.headerTitle}>Diagnostic Labs</Text>
                    <Text style={styles.headerSubtitle}>Hospital-grade tests at home</Text>
                </View>
                <View style={[styles.contentContainer, { justifyContent: 'center', alignItems: 'center' }]}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            </View>
        );
    }

    // ── MAIN VIEW ────────────────────────────────────────────────────────────────
    return (
        <View style={styles.screen}>
            <View style={{ backgroundColor: Colors.primary, height: insets.top }} />
            <StatusBar style="light" backgroundColor={Colors.primary} />

            {/* Header */}
            <View style={styles.headerContainer}>
                <Text style={styles.headerTitle}>Diagnostic Labs</Text>
                <Text style={styles.headerSubtitle}>Hospital-grade tests at home</Text>
            </View>

            <ScrollView
                style={styles.contentContainer}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
            >
                {/* Search Bar */}
                <View style={styles.searchRow}>
                    <Ionicons name="search" size={18} color={Colors.textMuted} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search tests, packages..."
                        placeholderTextColor={Colors.textMuted}
                        value={search}
                        onChangeText={(text) => {
                            setSearch(text);
                            setPage(1);
                        }}
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => {
                            setSearch('');
                            setPage(1);
                        }}>
                            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Results Count */}
                {filteredServices.length > 0 && (
                    <Text style={styles.resultsCount}>
                        Showing <Text style={styles.resultCountBold}>{paginatedServices.length}</Text> of{' '}
                        <Text style={styles.resultCountBold}>{filteredServices.length}</Text> tests
                        {search && (
                            <>
                                {' '}for "<Text style={styles.resultCountBold}>{search}</Text>"
                            </>
                        )}
                    </Text>
                )}

                {/* Test Cards Grid */}
                {filteredServices.length === 0 ? (
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyIcon}>🔍</Text>
                        <Text style={styles.emptyTitle}>No tests found</Text>
                        <Text style={styles.emptyText}>Try a different search term.</Text>
                        <TouchableOpacity
                            onPress={() => {
                                setSearch('');
                                setPage(1);
                            }}
                            style={styles.clearButton}
                        >
                            <Text style={styles.clearButtonText}>Clear search</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        <View style={styles.testsGrid}>
                            {paginatedServices.map((test, idx) => {
                                const colorIndex = services.indexOf(test);
                                const color = getColorByIndex(colorIndex);
                                const icon = getTestIcon(test.name);
                                const isSelected = selectedTestId === test.id;

                                return (
                                    <TouchableOpacity
                                        key={test.id}
                                        onPress={() => handleTestPress(test.id)}
                                        style={[
                                            styles.testCard,
                                            {
                                                borderColor: isSelected ? color.bg : '#E5E7EB',
                                                borderWidth: isSelected ? 2 : 1,
                                            },
                                            isSelected && styles.testCardSelected,
                                        ]}
                                        activeOpacity={0.7}
                                    >
                                        {/* Icon Area */}
                                        <View
                                            style={[
                                                styles.iconArea,
                                                { backgroundColor: color.light },
                                            ]}
                                        >
                                            <Ionicons
                                                name={icon as any}
                                                size={40}
                                                color={color.bg}
                                            />
                                        </View>

                                        {/* Card Content */}
                                        <View style={styles.cardContent}>
                                            <Text style={styles.testName} numberOfLines={2}>
                                                {test.name}
                                            </Text>

                                            {test.category && (
                                                <Text style={styles.testCategory} numberOfLines={1}>
                                                    {test.category}
                                                </Text>
                                            )}

                                            {/* Price Section */}
                                            <View style={styles.priceSection}>
                                                <Text style={styles.price}>
                                                    ₹{test.basePrice || test.discountedPrice || '---'}
                                                </Text>
                                                {isSelected && (
                                                    <View
                                                        style={[
                                                            styles.selectionIndicator,
                                                            { backgroundColor: color.bg },
                                                        ]}
                                                    >
                                                        <Ionicons name="checkmark" size={16} color="white" />
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <View style={styles.paginationContainer}>
                                <TouchableOpacity
                                    onPress={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    style={[styles.paginationButton, page === 1 && styles.paginationButtonDisabled]}
                                >
                                    <Ionicons name="chevron-back" size={18} color={page === 1 ? Colors.textMuted : Colors.primary} />
                                </TouchableOpacity>

                                <Text style={styles.paginationText}>
                                    Page {page} of {totalPages}
                                </Text>

                                <TouchableOpacity
                                    onPress={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    style={[styles.paginationButton, page === totalPages && styles.paginationButtonDisabled]}
                                >
                                    <Ionicons name="chevron-forward" size={18} color={page === totalPages ? Colors.textMuted : Colors.primary} />
                                </TouchableOpacity>
                            </View>
                        )}
                    </>
                )}

                <View style={{ height: Spacing.xl }} />
            </ScrollView>

            {/* Sticky Booking Footer */}
            {selectedTestId && filteredServices.length > 0 && (
                <View style={styles.footerContainer}>
                    <View style={styles.footerContent}>
                        <View>
                            <Text style={styles.footerLabel}>Selected Test</Text>
                            <Text style={styles.footerTestName} numberOfLines={1}>
                                {services.find(s => s.id === selectedTestId)?.name}
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={handleBookTest}
                            style={styles.bookButton}
                        >
                            <Text style={styles.bookButtonText}>Book Now</Text>
                            <Ionicons name="arrow-forward" size={16} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#FFFCF6',
    },
    headerContainer: {
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        paddingBottom: Spacing.lg,
    },
    headerTitle: {
        fontSize: FontSize.xl,
        fontFamily: Fonts.bold,
        color: 'white',
    },
    headerSubtitle: {
        fontSize: FontSize.sm,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 4,
    },
    contentContainer: {
        flex: 1,
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.md,
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        paddingHorizontal: Spacing.md,
        height: 44,
        marginBottom: Spacing.md,
    },
    searchIcon: {
        marginRight: Spacing.sm,
    },
    searchInput: {
        flex: 1,
        fontSize: FontSize.sm,
        fontFamily: Fonts.regular,
        color: Colors.textDark,
    },
    resultsCount: {
        fontSize: FontSize.xs,
        color: Colors.textMuted,
        marginBottom: Spacing.md,
    },
    resultCountBold: {
        fontFamily: Fonts.semiBold,
        color: Colors.textDark,
    },
    testsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: Spacing.md,
    },
    testCard: {
        width: '48%',
        backgroundColor: 'white',
        borderRadius: Radius.xl,
        marginRight: '4%',
        marginBottom: Spacing.md,
        overflow: 'hidden',
        ...Shadow,
    },
    testCardSelected: {
        backgroundColor: 'white',
    },
    iconArea: {
        padding: Spacing.md,
        justifyContent: 'center',
        alignItems: 'center',
        height: 100,
    },
    cardContent: {
        paddingHorizontal: Spacing.md,
        paddingBottom: Spacing.md,
    },
    testName: {
        fontSize: FontSize.xs,
        fontFamily: Fonts.bold,
        color: Colors.textDark,
        marginBottom: 4,
        lineHeight: 14,
    },
    testCategory: {
        fontSize: FontSize.xs,
        fontFamily: Fonts.regular,
        color: Colors.textMuted,
        marginBottom: Spacing.sm,
    },
    priceSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    price: {
        fontSize: FontSize.base,
        fontFamily: Fonts.bold,
        color: Colors.primary,
    },
    selectionIndicator: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    paginationContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: Spacing.md,
        paddingVertical: Spacing.md,
    },
    paginationButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        justifyContent: 'center',
        alignItems: 'center',
    },
    paginationButtonDisabled: {
        opacity: 0.5,
    },
    paginationText: {
        fontSize: FontSize.xs,
        fontFamily: Fonts.semiBold,
        color: Colors.textMuted,
    },
    emptyBox: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.xl * 3,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: Spacing.md,
    },
    emptyTitle: {
        fontSize: FontSize.base,
        fontFamily: Fonts.bold,
        color: Colors.textDark,
        marginBottom: Spacing.xs,
    },
    emptyText: {
        fontSize: FontSize.xs,
        color: Colors.textMuted,
        marginBottom: Spacing.md,
    },
    clearButton: {
        marginTop: Spacing.sm,
    },
    clearButtonText: {
        fontSize: FontSize.xs,
        fontFamily: Fonts.semiBold,
        color: Colors.primary,
    },
    footerContainer: {
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        backgroundColor: 'white',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
    },
    footerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    footerLabel: {
        fontSize: FontSize.xs,
        fontFamily: Fonts.regular,
        color: Colors.textMuted,
        marginBottom: 4,
    },
    footerTestName: {
        fontSize: FontSize.sm,
        fontFamily: Fonts.bold,
        color: Colors.textDark,
        maxWidth: 200,
    },
    bookButton: {
        flexDirection: 'row',
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: Radius.lg,
        alignItems: 'center',
        gap: Spacing.xs,
    },
    bookButtonText: {
        color: 'white',
        fontSize: FontSize.sm,
        fontFamily: Fonts.bold,
    },
});
