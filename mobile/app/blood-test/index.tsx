import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    FlatList,
    TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { labService } from '@/services/api/labService';
import type { LabPackage } from '@/services/api/labService';
import { BloodTestDetailModal } from './detail-modal';

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

export default function BloodTestScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [packages, setPackages] = useState<LabPackage[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeCategory, setActiveCategory] = useState(0);
    const [cartCount, setCartCount] = useState(0);
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [detailModalCode, setDetailModalCode] = useState<string>('');

    useEffect(() => {
        fetchPackages();
    }, []);

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

    const handleViewDetails = (code: string) => {
        setDetailModalCode(code);
        setDetailModalVisible(true);
    };

    const handleAddToCart = (pkg: LabPackage) => {
        setCartCount(prev => prev + 1);
        setDetailModalVisible(false);
        // Navigate to schedule with package payload
        router.push({ pathname: '/blood-test/schedule', params: { packagePayload: JSON.stringify(pkg) } } as any);
    };

    const renderPackageCard = ({ item }: { item: LabPackage }) => {
        const icon = getTestIcon(item.name);
        const IconComponent = icon.family === 'MaterialCommunityIcons' ? MaterialCommunityIcons : Ionicons;
        const discountPercent = item.discounted_cost
            ? Math.round(((item.cost - item.discounted_cost) / item.cost) * 100)
            : 0;

        return (
            <View style={styles.packageCard}>
                {/* Save Badge */}
                {discountPercent > 0 && (
                    <View style={styles.saveBadge}>
                        <Text style={styles.saveBadgeText}>SAVE {discountPercent}%</Text>
                    </View>
                )}

                {/* Card Content */}
                <View style={styles.cardContent}>
                    {/* Icon Section */}
                    <View style={styles.iconSection}>
                        <View style={[styles.iconCircle, { backgroundColor: `${icon.color}15` }]}>
                            <IconComponent name={icon.name as any} size={32} color={icon.color} />
                        </View>
                    </View>

                    {/* Info Section */}
                    <View style={styles.infoSection}>
                        <Text style={styles.packageName} numberOfLines={3}>{item.name}</Text>
                        <Text style={styles.parametersText}>
                            {item.tests_count || 0} Parameters
                        </Text>
                        <View style={styles.priceRow}>
                            <View>
                                {item.discounted_cost ? (
                                    <>
                                        <Text style={styles.originalPrice}>₹{item.cost}</Text>
                                        <Text style={styles.discountedPrice}>₹{item.discounted_cost}</Text>
                                    </>
                                ) : (
                                    <Text style={styles.discountedPrice}>₹{item.cost}</Text>
                                )}
                            </View>
                            <TouchableOpacity
                                style={styles.viewDetailsBtn}
                                onPress={() => handleViewDetails(item.code)}
                            >
                                <Text style={styles.viewDetailsText}>View Details</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar backgroundColor="#FFFFFF" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={TEXT_DARK} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Blood Tests</Text>
                <TouchableOpacity>
                    <View style={styles.cartIcon}>
                        <Ionicons name="cart" size={24} color={TEXT_DARK} />
                        {cartCount > 0 && (
                            <View style={styles.cartBadge}>
                                <Text style={styles.cartBadgeText}>{cartCount}</Text>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={18} color={TEXT_MUTED} style={styles.searchIcon} />
                <TextInput
                    placeholder="Search blood tests, packages..."
                    placeholderTextColor={TEXT_MUTED}
                    style={styles.searchInput}
                    editable={false}
                    pointerEvents="none"
                />
            </View>

            {/* Category Tabs */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoriesScroll}
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

            {/* Packages List */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={PRIMARY_GREEN} />
                </View>
            ) : (
                <FlatList
                    data={packages}
                    renderItem={renderPackageCard}
                    keyExtractor={(item) => item.code}
                    scrollEnabled={true}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* Detail Modal */}
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
        paddingVertical: 12,
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
        marginVertical: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        minHeight: 44,
        backgroundColor: LIGHT_GREEN_BG,
        borderRadius: 8,
    },
    searchIcon: {
        marginRight: 8,
        pointerEvents: 'none',
    },
    searchInput: {
        fontSize: 13,
        color: TEXT_DARK,
        flex: 1,
        padding: 0,
    },
    searchPlaceholder: {
        fontSize: 13,
        color: TEXT_MUTED,
        flex: 1,
    },
    categoriesScroll: {
        paddingHorizontal: 16,
        marginBottom: 8,
    },
    categoriesContent: {
        paddingRight: 16,
    },
    categoryTab: {
        marginRight: 20,
        paddingVertical: 8,
        paddingBottom: 6,
    },
    categoryTabActive: {
        borderBottomWidth: 2,
        borderBottomColor: PRIMARY_GREEN,
    },
    categoryTabText: {
        fontSize: 13,
        color: TEXT_MUTED,
        fontWeight: '500',
    },
    categoryTabTextActive: {
        color: PRIMARY_GREEN,
        fontWeight: '700',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    packageCard: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: CARD_BORDER,
        borderRadius: 12,
        marginBottom: 12,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    saveBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: SAVE_BADGE_RED,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        zIndex: 10,
    },
    saveBadgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '700',
    },
    cardContent: {
        flexDirection: 'row',
    },
    iconSection: {
        marginRight: 12,
    },
    iconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoSection: {
        flex: 1,
    },
    packageName: {
        fontSize: 12,
        fontWeight: '600',
        color: TEXT_DARK,
        marginBottom: 6,
        lineHeight: 16,
    },
    parametersText: {
        fontSize: 11,
        color: TEXT_MUTED,
        marginBottom: 8,
    },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    originalPrice: {
        fontSize: 11,
        color: TEXT_MUTED,
        textDecorationLine: 'line-through',
        marginBottom: 2,
    },
    discountedPrice: {
        fontSize: 16,
        fontWeight: '700',
        color: PRIMARY_GREEN,
    },
    viewDetailsBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: PRIMARY_GREEN,
        borderRadius: 6,
    },
    viewDetailsText: {
        fontSize: 12,
        color: PRIMARY_GREEN,
        fontWeight: '600',
    },
});
