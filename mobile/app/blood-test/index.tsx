import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    FlatList,
    TextInput,
    ListRenderItem,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Alert } from 'react-native';
import { labService } from '@/services/api/labService';
import type { LabPackage } from '@/services/api/labService';
import { BloodTestDetailModal } from './detail-modal';
import { useCart } from '@/context/CartContext';

// ─── Design Tokens ────────────────────────────────────────────────────
const PRIMARY_GREEN = '#02743F';
const CARD_BORDER = '#E5E7EB';
const TEXT_DARK = '#2F2F2F';
const TEXT_MUTED = '#888888';
const LIGHT_GREEN_BG = '#F0FDF4';
const SAVE_BADGE_RED = '#F43F5E';

const CATEGORIES = ['All Packages', 'Popular', 'Health Checkups', 'Wellness'];

const getTestIcon = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes("urine")) return { family: 'MaterialCommunityIcons', name: 'test-tube', color: '#8B5CF6' };
    if (lowerName.includes("iron")) return { family: 'MaterialCommunityIcons', name: 'flask', color: '#14B8A6' };
    if (lowerName.includes("full body") || lowerName.includes("checkup")) return { family: 'Ionicons', name: 'fitness', color: '#F43F5E' };
    if (lowerName.includes("screening") || lowerName.includes("advanced")) return { family: 'Ionicons', name: 'scan', color: '#0EA5E9' };
    if (lowerName.includes("package")) return { family: 'MaterialCommunityIcons', name: 'package', color: '#3B82F6' };
    if (lowerName.includes("hba1c") || lowerName.includes("glycosylated") || lowerName.includes("hemoglobin")) return { family: 'Ionicons', name: 'pulse', color: '#EF4444' };
    if (lowerName.includes("test")) return { family: 'MaterialCommunityIcons', name: 'stethoscope', color: '#10B981' };
    return { family: 'Ionicons', name: 'shield-checkmark', color: '#6366F1' };
};

// ─── Memoized PackageCard Component ──────────────────────────────────────
// Prevents unnecessary re-renders when parent updates but item data hasn't changed
const PackageCard = memo(({
    item,
    onViewDetails
}: {
    item: LabPackage;
    onViewDetails: (code: string) => void;
}) => {
    const icon = getTestIcon(item.name);
    const IconComponent = icon.family === 'MaterialCommunityIcons' ? MaterialCommunityIcons : Ionicons;
    const discountPercent = item.discounted_cost
        ? Math.round(((item.cost - item.discounted_cost) / item.cost) * 100)
        : 0;

    return (
        <View style={styles.packageCard}>
            {/* Discount Badge Row */}
            {discountPercent > 0 && (
                <View style={styles.badgeRow}>
                    <View style={styles.saveBadge}>
                        <Text style={styles.saveBadgeText}>SAVE {discountPercent}%</Text>
                    </View>
                </View>
            )}

            {/* Card Content Row */}
            <View style={styles.cardContent}>
                <View style={styles.iconSection}>
                    <View style={[styles.iconCircle, { backgroundColor: `${icon.color}20` }]}>
                        <IconComponent name={icon.name as any} size={28} color={icon.color} />
                    </View>
                </View>

                <View style={styles.infoSection}>
                    <Text style={styles.packageName} numberOfLines={2}>{item.name}</Text>
                    <Text style={styles.parametersText}>
                        {item.tests_count || 0} {item.tests_count === 1 ? 'Parameter' : 'Parameters'}
                    </Text>

                    <View style={styles.priceRow}>
                        {item.discounted_cost ? (
                            <View>
                                <Text style={styles.originalPrice}>₹{item.cost}</Text>
                                <Text style={styles.discountedPrice}>₹{item.discounted_cost}</Text>
                            </View>
                        ) : (
                            <Text style={styles.discountedPrice}>₹{item.cost}</Text>
                        )}
                        <TouchableOpacity
                            style={styles.viewDetailsBtn}
                            onPress={() => onViewDetails(item.code)}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.viewDetailsText}>View Details</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );
});

export default function BloodTestScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams();

    const [packages, setPackages] = useState<LabPackage[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeCategory, setActiveCategory] = useState(0);
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [detailModalCode, setDetailModalCode] = useState<string>('');
    const [searchText, setSearchText] = useState('');

    // Rebook mode: auto-add package to cart and jump to checkout
    const isRebook = params.rebook === 'true';
    const rebookPackageCode = params.packageCode as string | undefined;
    const rebookPackageName = params.packageName as string | undefined;
    const isFromCheckout = params.fromCheckout === 'true';

    const { addItem, itemCount } = useCart();

    useEffect(() => {
        fetchPackages();
    }, []);

    // Rebook mode: auto-add package to cart and navigate to cart
    useEffect(() => {
        if (isRebook && rebookPackageCode && packages.length > 0) {
            const pkg = packages.find(p => p.code === rebookPackageCode);
            if (pkg) {
                addItem({
                    id: pkg.code,
                    serviceType: 'Bloodwork',
                    title: pkg.name,
                    price: pkg.discounted_cost || pkg.cost,
                    quantity: 1,
                    details: pkg,
                });
                // Navigate to cart to complete the rebook
                router.push('/cart' as any);
            }
        }
    }, [isRebook, rebookPackageCode, packages, addItem, router]);

    const fetchPackages = async () => {
        setLoading(true);
        try {
            const pkgs = await labService.getPackages();
            setPackages(pkgs || []);
        } catch (error) {
            console.error('Fetch packages failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = useCallback((code: string) => {
        setDetailModalCode(code);
        setDetailModalVisible(true);
    }, []);

    const handleAddToCart = useCallback((pkg: LabPackage) => {
        addItem({
            id: pkg.code,
            serviceType: 'Bloodwork', // Used for category-wise grouping in the global cart
            title: pkg.name,
            price: pkg.discounted_cost || pkg.cost,
            quantity: 1,
            details: pkg,
        });
        setDetailModalVisible(false);
        Alert.alert('Added to Cart', `${pkg.name} has been added to your cart successfully.`);
    }, [addItem]);

    const handleCartPress = useCallback(() => {
        if (itemCount === 0) return;
        router.push('/cart' as any); // We will build this Cart page next
    }, [itemCount, router]);

    // Memoize filtered packages to prevent unnecessary recalculations
    const filteredPackages = useMemo(() =>
        packages.filter(pkg =>
            pkg.name.toLowerCase().includes(searchText.toLowerCase())
        ),
        [packages, searchText]
    );

    // Memoize renderItem to prevent FlatList item re-renders
    const renderPackageCard = useCallback(({ item }: { item: LabPackage }) => (
        <PackageCard item={item} onViewDetails={handleViewDetails} />
    ), [handleViewDetails]);

    // Memoized empty state component to prevent unnecessary re-renders
    const emptyListComponent = useMemo(() => (
        loading ? null : (
            <View style={styles.emptyContainer}>
                <Ionicons name="search" size={48} color={TEXT_MUTED} style={styles.emptyIcon} />
                <Text style={styles.emptyTitle}>
                    {searchText ? 'No tests found' : 'No tests available'}
                </Text>
                <Text style={styles.emptySubtitle}>
                    {searchText
                        ? `Try searching for a different test or category`
                        : 'Tests will appear here soon'
                    }
                </Text>
            </View>
        )
    ), [searchText, loading]);

    return (
        <View style={[styles.container, { paddingTop: insets.top }, ]}>
            <StatusBar backgroundColor="#FFFFFF" />

            {/* Header — Fixed, never remounted */}
            <View style={[styles.header, ]}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={TEXT_DARK} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Blood Tests</Text>
                {!isFromCheckout && (
                    <TouchableOpacity onPress={handleCartPress}>
                        <View style={styles.cartIcon}>
                            <Ionicons name="cart" size={24} color={TEXT_DARK} />
                            {itemCount > 0 && (
                                <View style={styles.cartBadge}>
                                    <Text style={styles.cartBadgeText}>{itemCount}</Text>
                                </View>
                            )}
                        </View>
                    </TouchableOpacity>
                )}
                {isFromCheckout && <View style={{ width: 24 }} />}
            </View>

            {/* Search Bar — Fixed, stable input */}
            <View style={[styles.searchContainer, ]}>
                <Ionicons name="search" size={18} color={TEXT_MUTED} style={styles.searchIcon} />
                <TextInput
                    placeholder="Search blood tests, packages..."
                    placeholderTextColor={TEXT_MUTED}
                    style={styles.searchInput}
                    value={searchText}
                    onChangeText={setSearchText}
                />
            </View>

            {/* Category Tabs — Fixed, stable scroll */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={[styles.categoriesScroll, ]}
                contentContainerStyle={styles.categoriesContent}
            >
                {CATEGORIES.map((cat, idx) => (
                    <TouchableOpacity
                        key={idx}
                        onPress={() => setActiveCategory(idx)}
                        style={[
                            styles.categoryTab,
                            activeCategory === idx && styles.categoryTabActive,
                        ]}
                    >
                        <Text
                            style={[
                                styles.categoryTabText,
                                activeCategory === idx && styles.categoryTabTextActive,
                            ]}
                        >
                            {cat}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Single FlatList Instance — Stable, persistent rendering */}
            {/* Eliminates conditional rendering that caused layout thrashing */}
            {loading ? (
                <View style={[styles.loadingContainer, ]}>
                    <ActivityIndicator size="large" color={PRIMARY_GREEN} />
                    <Text style={styles.loadingText}>Loading tests...</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredPackages}
                    renderItem={renderPackageCard}
                    keyExtractor={(item) => item.code}
                    style={[styles.flatList, ]}
                    scrollEnabled={true}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={emptyListComponent}
                    maxToRenderPerBatch={10}
                    updateCellsBatchingPeriod={50}
                    initialNumToRender={10}
                />
            )}

            {/* Detail Modal — Outside FlatList, non-blocking */}
            <BloodTestDetailModal
                visible={detailModalVisible}
                packageCode={detailModalCode}
                onClose={() => setDetailModalVisible(false)}
                onAddToCart={handleAddToCart}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 11,
        borderBottomWidth: 1,
        borderBottomColor: CARD_BORDER,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: TEXT_DARK,
        flex: 1,
        textAlign: 'center',
    },
    cartIcon: {
        position: 'relative',
    },
    cartBadge: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: SAVE_BADGE_RED,
        borderRadius: 10,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cartBadgeText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginVertical: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        minHeight: 40,
        backgroundColor: LIGHT_GREEN_BG,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#D1FAE5',
    },
    searchIcon: {
        marginRight: 10,
        pointerEvents: 'none',
    },
    searchInput: {
        fontSize: 14,
        color: TEXT_DARK,
        flex: 1,
        padding: 0,
    },
    categoriesScroll: {
        paddingHorizontal: 16,
        marginBottom: 8,
        marginTop: 0,
        flexGrow: 0,
        height: 44,
        minHeight: 44,
        maxHeight: 44,
    },
    categoriesContent: {
        paddingRight: 16,
        paddingBottom: 0,
        gap: 6,
    },
    categoryTab: {
        marginRight: 12,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: 'transparent',
        height: 36,
        justifyContent: 'center',
    },
    categoryTabActive: {
        backgroundColor: PRIMARY_GREEN,
    },
    categoryTabText: {
        fontSize: 13,
        color: TEXT_MUTED,
        fontWeight: '500',
    },
    categoryTabTextActive: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
        minHeight: 200,
    },
    loadingText: {
        fontSize: 14,
        color: TEXT_MUTED,
        fontWeight: '500',
        marginTop: 8,
    },
    flatList: {
        flex: 1,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 24,
    },
    packageCard: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: CARD_BORDER,
        borderRadius: 10,
        marginBottom: 12,
        paddingTop: 12,
        paddingBottom: 12,
        paddingHorizontal: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 2,
        elevation: 1,
    },
    badgeRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 8,
    },
    saveBadge: {
        backgroundColor: SAVE_BADGE_RED,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    saveBadgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '700',
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    iconSection: {
        marginTop: 2,
    },
    iconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
    },
    infoSection: {
        flex: 1,
        justifyContent: 'flex-start',
        gap: 4,
    },
    packageName: {
        fontSize: 13,
        fontWeight: '600',
        color: TEXT_DARK,
    },
    parametersText: {
        fontSize: 11,
        color: '#6B7280',
        fontWeight: '400',
    },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 2,
        gap: 8,
    },
    originalPrice: {
        fontSize: 11,
        color: '#9CA3AF',
        textDecorationLine: 'line-through',
        fontWeight: '400',
    },
    discountedPrice: {
        fontSize: 16,
        fontWeight: '700',
        color: PRIMARY_GREEN,
        letterSpacing: -0.4,
        lineHeight: 18,
    },
    viewDetailsBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderWidth: 1.5,
        borderColor: PRIMARY_GREEN,
        borderRadius: 6,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        minWidth: 80,
    },
    viewDetailsText: {
        fontSize: 11,
        color: PRIMARY_GREEN,
        fontWeight: '600',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 300,
        paddingVertical: 40,
        paddingHorizontal: 32,
    },
    emptyIcon: {
        marginBottom: 12,
        opacity: 0.35,
    },
    emptyTitle: {
        fontSize: 16,
        color: TEXT_DARK,
        fontWeight: '600',
        marginBottom: 6,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 12,
        color: TEXT_MUTED,
        fontWeight: '400',
        textAlign: 'center',
        lineHeight: 16,
    },
});
