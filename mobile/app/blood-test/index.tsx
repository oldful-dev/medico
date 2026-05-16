import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    TextInput,
    RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSize, Spacing, Radius, Shadow } from '@/constants/theme';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useUser } from '@/context/UserContext';
import { getAssetUrl } from '@/utils/getAssetUrl';

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    default: { bg: '#F0FDF4', text: '#047857', border: '#D1FAE5' },
    medical: { bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE' },
    therapy: { bg: '#F3F0FF', text: '#6D28D9', border: '#E9D5FF' },
    diagnostic: { bg: '#FFFBEB', text: '#B45309', border: '#FCD34D' },
    emergency: { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA' },
};

export default function BloodTestScreen() {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { services, isLoading: servicesLoading, refreshData } = useUser();

    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');
    const [refreshing, setRefreshing] = useState(false);

    const sections = useMemo(() => {
        if (!services.length) return [];

        const grouped: Record<string, any[]> = {};
        services.forEach(service => {
            const category = service.category || 'Other';
            if (!grouped[category]) grouped[category] = [];
            grouped[category].push(service);
        });

        return Object.entries(grouped).map(([title, services]) => ({
            id: title,
            title,
            services: services.map(s => ({
                id: s.id,
                label: s.name,
                enabled: true,
            })),
        }));
    }, [services]);

    const categoryNames = useMemo(() => {
        return ['All', ...sections.map(s => s.title || 'Other').filter(Boolean)];
    }, [sections]);

    const filteredSections = useMemo(() => {
        return sections
            .map(section => ({
                ...section,
                services: (section.services || [])
                    .filter(s => s.enabled)
                    .filter(s => s.label.toLowerCase().includes(search.toLowerCase())),
            }))
            .filter(section => {
                if (activeCategory !== 'All' && section.title !== activeCategory) return false;
                return section.services.length > 0;
            });
    }, [sections, search, activeCategory]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await refreshData();
        setRefreshing(false);
    }, [refreshData]);

    const handleServicePress = (service: any) => {
        router.push({
            pathname: '/services/[id]',
            params: { id: service.id },
        } as any);
    };

    // ── LOADING ────────────────────────────────────────────────────────────────
    if (servicesLoading) {
        return (
            <View style={styles.screen}>
                <View style={{ backgroundColor: Colors.primary, height: insets.top }} />
                <StatusBar style="light" backgroundColor={Colors.primary} />
                <View style={styles.headerContainer}>
                    <Text style={styles.headerTitle}>Health Check</Text>
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
                <Text style={styles.headerTitle}>Health Check</Text>
                <Text style={styles.headerSubtitle}>Blood tests & diagnostics</Text>
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
                        placeholder="Search tests, symptoms..."
                        placeholderTextColor={Colors.textMuted}
                        value={search}
                        onChangeText={setSearch}
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Category Filter Pills */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoriesContainer}
                    scrollEventThrottle={16}
                >
                    {categoryNames.map(cat => (
                        <TouchableOpacity
                            key={cat}
                            onPress={() => setActiveCategory(cat)}
                            style={[
                                styles.categoryPill,
                                activeCategory === cat && styles.categoryPillActive,
                            ]}
                        >
                            <Text
                                style={[
                                    styles.categoryPillText,
                                    activeCategory === cat && styles.categoryPillTextActive,
                                ]}
                            >
                                {cat}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Results Count */}
                {filteredSections.length > 0 && (
                    <Text style={styles.resultsCount}>
                        Showing{' '}
                        <Text style={styles.resultCountBold}>
                            {filteredSections.reduce((acc, s) => acc + s.services.length, 0)}
                        </Text>
                        {' '}tests
                        {search && (
                            <>
                                {' '}for "<Text style={styles.resultCountBold}>{search}</Text>"
                            </>
                        )}
                    </Text>
                )}

                {/* Services Grid */}
                {filteredSections.length === 0 ? (
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyIcon}>🔍</Text>
                        <Text style={styles.emptyTitle}>No tests found</Text>
                        <Text style={styles.emptyText}>Try a different search term or category.</Text>
                        <TouchableOpacity
                            onPress={() => {
                                setSearch('');
                                setActiveCategory('All');
                            }}
                            style={styles.clearButton}
                        >
                            <Text style={styles.clearButtonText}>Clear filters</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    filteredSections.map((section, sectionIdx) => {
                        const colors = Object.values(CATEGORY_COLORS)[
                            sectionIdx % Object.keys(CATEGORY_COLORS).length
                        ];
                        return (
                            <View key={section.id} style={styles.sectionContainer}>
                                {/* Section Header */}
                                <View style={styles.sectionHeader}>
                                    <View style={styles.sectionTitleRow}>
                                        <View
                                            style={[
                                                styles.sectionDot,
                                                { backgroundColor: colors.text },
                                            ]}
                                        />
                                        <Text style={styles.sectionTitle}>{section.title}</Text>
                                        <View style={styles.sectionBadge}>
                                            <Text style={styles.sectionBadgeText}>
                                                {section.services.length}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Services Cards Grid */}
                                <View style={styles.servicesGrid}>
                                    {section.services.map((service, idx) => (
                                        <TouchableOpacity
                                            key={service.id}
                                            onPress={() => handleServicePress(service)}
                                            style={[
                                                styles.serviceCard,
                                                { borderColor: colors.border },
                                                idx % 2 === 1 && { marginLeft: Spacing.md },
                                            ]}
                                            activeOpacity={0.7}
                                        >
                                            {/* Icon Area */}
                                            <View
                                                style={[
                                                    styles.serviceIconArea,
                                                    { backgroundColor: colors.bg },
                                                ]}
                                            >
                                                <Ionicons
                                                    name="fitness"
                                                    size={40}
                                                    color={colors.text}
                                                />
                                            </View>

                                            {/* Card Content */}
                                            <View style={styles.serviceContent}>
                                                <Text style={styles.serviceLabel} numberOfLines={2}>
                                                    {service.label.replace('\n', ' ')}
                                                </Text>
                                                <Text style={styles.serviceDescription} numberOfLines={1}>
                                                    Expert diagnosis at home
                                                </Text>

                                                {/* Meta Info */}
                                                <View style={styles.serviceMeta}>
                                                    <View style={styles.metaItem}>
                                                        <Ionicons
                                                            name="time"
                                                            size={12}
                                                            color={Colors.textMuted}
                                                        />
                                                        <Text style={styles.metaText}>60 min</Text>
                                                    </View>
                                                    <View style={styles.metaItem}>
                                                        <Ionicons
                                                            name="star"
                                                            size={12}
                                                            color="#FBBF24"
                                                        />
                                                        <Text style={styles.metaText}>4.8</Text>
                                                    </View>
                                                </View>

                                                {/* CTA Button */}
                                                <View
                                                    style={[
                                                        styles.serviceButton,
                                                        { backgroundColor: colors.bg },
                                                    ]}
                                                >
                                                    <Text style={[styles.serviceButtonText, { color: colors.text }]}>
                                                        Book
                                                    </Text>
                                                    <Ionicons
                                                        name="arrow-forward"
                                                        size={11}
                                                        color={colors.text}
                                                    />
                                                </View>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        );
                    })
                )}

                <View style={{ height: Spacing.lg }} />
            </ScrollView>
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
    categoriesContainer: {
        paddingBottom: Spacing.md,
        gap: Spacing.sm,
    },
    categoryPill: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: 20,
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginRight: Spacing.sm,
    },
    categoryPillActive: {
        backgroundColor: Colors.primaryDark,
        borderColor: Colors.primaryDark,
    },
    categoryPillText: {
        fontSize: FontSize.xs,
        fontFamily: Fonts.semiBold,
        color: '#4B5563',
    },
    categoryPillTextActive: {
        color: 'white',
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
    sectionContainer: {
        marginBottom: Spacing.lg,
    },
    sectionHeader: {
        marginBottom: Spacing.md,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    sectionDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    sectionTitle: {
        fontSize: FontSize.base,
        fontFamily: Fonts.bold,
        color: Colors.textDark,
        flex: 1,
    },
    sectionBadge: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        backgroundColor: '#F3F4F6',
        borderRadius: Radius.md,
    },
    sectionBadgeText: {
        fontSize: FontSize.xs,
        fontFamily: Fonts.semiBold,
        color: '#9CA3AF',
    },
    servicesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    serviceCard: {
        flex: 0.5,
        backgroundColor: 'white',
        borderRadius: Radius.xl,
        borderWidth: 1,
        overflow: 'hidden',
        marginBottom: Spacing.md,
    },
    serviceIconArea: {
        paddingVertical: Spacing.lg,
        justifyContent: 'center',
        alignItems: 'center',
    },
    serviceContent: {
        paddingHorizontal: Spacing.sm,
        paddingBottom: Spacing.sm,
    },
    serviceLabel: {
        fontSize: FontSize.xs,
        fontFamily: Fonts.bold,
        color: Colors.textDark,
        marginBottom: 4,
        lineHeight: 14,
    },
    serviceDescription: {
        fontSize: FontSize.xs,
        fontFamily: Fonts.regular,
        color: Colors.textMuted,
        marginBottom: Spacing.sm,
    },
    serviceMeta: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: Spacing.sm,
        paddingBottom: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontSize: FontSize.xs,
        color: Colors.textMuted,
    },
    serviceButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.xs,
        borderRadius: Radius.md,
        gap: 3,
    },
    serviceButtonText: {
        fontSize: FontSize.xs,
        fontFamily: Fonts.bold,
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
});
