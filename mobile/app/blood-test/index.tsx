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
import { useThemeColors } from '@/hooks/use-theme-colors';


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
    onViewDetails,
    styles: cardStyles
}: {
    item: LabPackage;
    onViewDetails: (code: string) => void;
    styles: ReturnType<typeof makeStyles>;
}) => {
    const icon = getTestIcon(item.name);
    const IconComponent = icon.family === 'MaterialCommunityIcons' ? MaterialCommunityIcons : Ionicons;
    const discountPercent = item.discounted_cost
        ? Math.round(((item.cost - item.discounted_cost) / item.cost) * 100)
        : 0;

    return (
        <View style={cardStyles.packageCard}>
            {/* Discount Badge Row */}
            {discountPercent > 0 && (
                <View style={cardStyles.badgeRow}>
                    <View style={cardStyles.saveBadge}>
                        <Text style={cardStyles.saveBadgeText}>SAVE {discountPercent}%</Text>
                    </View>
                </View>
            )}

            {/* Card Content Row */}
            <View style={cardStyles.cardContent}>
                <View style={cardStyles.iconSection}>
                    <View style={[cardStyles.iconCircle, { backgroundColor: `${icon.color}20` }]}>
                        <IconComponent name={icon.name as any} size={28} color={icon.color} />
                    </View>
                </View>

                <View style={cardStyles.infoSection}>
                    <Text style={cardStyles.packageName} numberOfLines={2}>{item.name}</Text>
                    <Text style={cardStyles.parametersText}>
                        {item.tests_count || 0} {item.tests_count === 1 ? 'Parameter' : 'Parameters'}
                    </Text>

                    <View style={cardStyles.priceRow}>
                        {item.discounted_cost ? (
                            <View>
                                <Text style={cardStyles.originalPrice}>₹{item.cost}</Text>
                                <Text style={cardStyles.discountedPrice}>₹{item.discounted_cost}</Text>
                            </View>
                        ) : (
                            <Text style={cardStyles.discountedPrice}>₹{item.cost}</Text>
                        )}
                        <TouchableOpacity
                            style={cardStyles.viewDetailsBtn}
                            onPress={() => onViewDetails(item.code)}
                            activeOpacity={0.7}
                        >
                            <Text style={cardStyles.viewDetailsText}>View Details</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );
});

const makeStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bgScreen,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 11,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.textDark,
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
        backgroundColor: colors.sosRed,
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
        backgroundColor: colors.bgCardMuted,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    searchIcon: {
        marginRight: 10,
        pointerEvents: 'none',
    },
    searchInput: {
        fontSize: 14,
        color: colors.textDark,
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
        backgroundColor: colors.primary,
    },
    categoryTabText: {
        fontSize: 13,
        color: colors.textMuted,
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
        color: colors.textMuted,
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
        backgroundColor: colors.bgCard,
        borderWidth: 1,
        borderColor: colors.borderLight,
        borderRadius: 10,
        marginBottom: 12,
        paddingTop: 12,
        paddingBottom: 12,
        paddingHorizontal: 12,
        shadowColor: colors.shadowColor,
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
        backgroundColor: colors.sosRed,
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
        color: colors.textDark,
    },
    parametersText: {
        fontSize: 11,
        color: colors.textMuted,
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
        color: colors.textMuted,
        textDecorationLine: 'line-through',
        fontWeight: '400',
    },
    discountedPrice: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.primary,
        letterSpacing: -0.4,
        lineHeight: 18,
    },
    viewDetailsBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderWidth: 1.5,
        borderColor: colors.primary,
        borderRadius: 6,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        minWidth: 80,
    },
    viewDetailsText: {
        fontSize: 11,
        color: colors.primary,
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
        color: colors.textDark,
        fontWeight: '600',
        marginBottom: 6,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 12,
        color: colors.textMuted,
        fontWeight: '400',
        textAlign: 'center',
        lineHeight: 16,
    },
});

export default function BloodTestScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams();
    const colors = useThemeColors();
    const s = makeStyles(colors);

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
        router.push('/(tabs)/cart' as any);
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
        <PackageCard item={item} onViewDetails={handleViewDetails} styles={s} />
    ), [handleViewDetails, s]);

    // Memoized empty state component to prevent unnecessary re-renders
    const emptyListComponent = useMemo(() => (
        loading ? null : (
            <View style={s.emptyContainer}>
                <Ionicons name="search" size={48} color={colors.textMuted} style={s.emptyIcon} />
                <Text style={s.emptyTitle}>
                    {searchText ? 'No tests found' : 'No tests available'}
                </Text>
                <Text style={s.emptySubtitle}>
                    {searchText
                        ? `Try searching for a different test or category`
                        : 'Tests will appear here soon'
                    }
                </Text>
            </View>
        )
    ), [searchText, loading, s, colors.textMuted]);

    return (
        <View style={[s.container, { paddingTop: insets.top }, ]}>
            <StatusBar backgroundColor={colors.bgScreen} />

            {/* Header — Fixed, never remounted */}
            <View style={[s.header, ]}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={colors.textDark} />
                </TouchableOpacity>
                <Text style={s.headerTitle}>Blood Tests</Text>
                {!isFromCheckout && (
                    <TouchableOpacity onPress={handleCartPress}>
                        <View style={s.cartIcon}>
                            <Ionicons name="cart" size={24} color={colors.textDark} />
                            {itemCount > 0 && (
                                <View style={s.cartBadge}>
                                    <Text style={s.cartBadgeText}>{itemCount}</Text>
                                </View>
                            )}
                        </View>
                    </TouchableOpacity>
                )}
                {isFromCheckout && <View style={{ width: 24 }} />}
            </View>

            {/* Search Bar — Fixed, stable input */}
            <View style={[s.searchContainer, ]}>
                <Ionicons name="search" size={18} color={colors.textMuted} style={s.searchIcon} />
                <TextInput
                    placeholder="Search blood tests, packages..."
                    placeholderTextColor={colors.textMuted}
                    style={s.searchInput}
                    value={searchText}
                    onChangeText={setSearchText}
                />
            </View>

            {/* Category Tabs — Fixed, stable scroll */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={[s.categoriesScroll, ]}
                contentContainerStyle={s.categoriesContent}
            >
                {CATEGORIES.map((cat, idx) => (
                    <TouchableOpacity
                        key={idx}
                        onPress={() => setActiveCategory(idx)}
                        style={[
                            s.categoryTab,
                            activeCategory === idx && s.categoryTabActive,
                        ]}
                    >
                        <Text
                            style={[
                                s.categoryTabText,
                                activeCategory === idx && s.categoryTabTextActive,
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
                <View style={[s.loadingContainer, ]}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={s.loadingText}>Loading tests...</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredPackages}
                    renderItem={renderPackageCard}
                    keyExtractor={(item) => item.code}
                    style={[s.flatList, ]}
                    scrollEnabled={true}
                    contentContainerStyle={s.listContent}
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
