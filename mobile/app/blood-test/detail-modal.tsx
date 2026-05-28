import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Modal,
    StyleSheet,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { labService, type LabPackage } from '@/services/api/labService';
import { useTheme } from '@/context/ThemeContext';
import { useThemeColors, ThemeColors } from '@/hooks/use-theme-colors';

const PRIMARY_GREEN = '#02743F';
const TEXT_DARK = '#2F2F2F';
const TEXT_MUTED = '#888888';
const CREAM_BG = '#FDFDE8';

// ─── Redcliffe parameter group shape ──────────────────────────────────────────
interface ParameterGroup {
    name: string;
    package_detail: { name: string }[];
}

interface PackageDetailsResponse {
    status: string;
    name?: string;
    code?: string;
    data?: ParameterGroup[];   // groups from /api/external/v2/package-parameter-data/
}

interface DetailModalProps {
    visible: boolean;
    packageCode?: string;
    onClose: () => void;
    onAddToCart: (pkg: LabPackage) => void;
    onBookNow?: (pkg: LabPackage) => void;
}

export function BloodTestDetailModal({
    visible,
    packageCode,
    onClose,
    onAddToCart,
    onBookNow,
}: DetailModalProps) {
    const [pkg, setPkg] = useState<LabPackage | null>(null);
    const [paramGroups, setParamGroups] = useState<ParameterGroup[]>([]);
    const [loading, setLoading] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const { isDarkMode } = useTheme();
    const colors = useThemeColors();
    // useSafeAreaInsets must be called INSIDE the modal component — Modals render
    // outside the normal React tree so the provider context is still inherited,
    // but the inset values are only meaningful when read here, not from a parent.
    const insets = useSafeAreaInsets();
    const styles = makeStyles(isDarkMode, colors);

    useEffect(() => {
        if (!visible || !packageCode) return;

        setLoading(true);
        setPkg(null);
        setParamGroups([]);
        setExpandedGroups(new Set());

        // Run both fetches in parallel — package list (for price/meta) + details (for parameters)
        Promise.all([
            labService.getPackages(),
            labService.getPackageDetails(packageCode),
        ])
            .then(([pkgList, detailRes]) => {
                // Resolve basic package info
                const found = (pkgList || []).find((p: LabPackage) => p.code === packageCode);
                if (found) setPkg(found);

                // Resolve parameter groups — detailRes shape: { status, data: ParameterGroup[] }
                const raw = detailRes as any;
                const groups: ParameterGroup[] =
                    raw?.data ??          // { data: [...] }
                    raw?.body?.data ??    // wrapped by backend test responses
                    [];

                // Deduplicate: the API returns the same group name multiple times across
                // different partner packages. Merge their package_detail arrays and
                // deduplicate individual parameter names within each group.
                const groupMap = new Map<string, Set<string>>();
                for (const g of groups) {
                    if (!g.package_detail || g.package_detail.length === 0) continue;
                    const existing = groupMap.get(g.name) ?? new Set<string>();
                    for (const p of g.package_detail) {
                        existing.add(p.name);
                    }
                    groupMap.set(g.name, existing);
                }

                const meaningful: ParameterGroup[] = Array.from(groupMap.entries()).map(
                    ([name, paramSet]) => ({
                        name,
                        package_detail: Array.from(paramSet).map((n) => ({ name: n })),
                    })
                );
                setParamGroups(meaningful);
            })
            .catch((err) => {
                console.error('[DetailModal] fetch error:', err);
            })
            .finally(() => setLoading(false));
    }, [visible, packageCode]);

    const toggleGroup = (name: string) => {
        setExpandedGroups((prev) => {
            const next = new Set(prev);
            if (next.has(name)) {
                next.delete(name);
            } else {
                next.add(name);
            }
            return next;
        });
    };

    const totalParams = paramGroups.reduce(
        (sum, g) => sum + g.package_detail.length,
        0
    );

    const discountPercent =
        pkg?.cost && pkg.discounted_cost && pkg.cost > pkg.discounted_cost
            ? Math.round(((pkg.cost - pkg.discounted_cost) / pkg.cost) * 100)
            : 0;

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* ── Header ── */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle} numberOfLines={2}>
                            {pkg?.name || 'Test Details'}
                        </Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color={isDarkMode ? '#FFFFFF' : TEXT_DARK} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        style={styles.content}
                        contentContainerStyle={{ paddingBottom: 24 }}
                    >
                        {loading ? (
                            <View style={{ marginTop: 60, alignItems: 'center' }}>
                                <ActivityIndicator size="large" color={PRIMARY_GREEN} />
                                <Text style={{ marginTop: 12, color: TEXT_MUTED }}>
                                    Loading details...
                                </Text>
                            </View>
                        ) : pkg ? (
                            <>
                                {/* ── Price & Discount ── */}
                                <View style={styles.priceSection}>
                                    <View>
                                        <Text style={styles.price}>
                                            ₹{pkg.discounted_cost || pkg.cost}
                                        </Text>
                                        {discountPercent > 0 && (
                                            <Text style={styles.originalPrice}>₹{pkg.cost}</Text>
                                        )}
                                    </View>
                                    {discountPercent > 0 && (
                                        <View style={styles.saveBadge}>
                                            <Text style={styles.saveBadgeText}>
                                                SAVE {discountPercent}%
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                {/* ── Info Grid — Report Time / Collection / Parameters ── */}
                                <View style={styles.infoGrid}>
                                    <View style={styles.infoItem}>
                                        <MaterialCommunityIcons
                                            name="clock-outline"
                                            size={18}
                                            color={PRIMARY_GREEN}
                                        />
                                        <Text style={styles.infoLabel}>Report Time</Text>
                                        <Text style={styles.infoValue}>
                                            {(pkg as any).reportTime || '12-24 Hrs'}
                                        </Text>
                                    </View>
                                    <View style={styles.infoItem}>
                                        <MaterialCommunityIcons
                                            name="home"
                                            size={18}
                                            color={PRIMARY_GREEN}
                                        />
                                        <Text style={styles.infoLabel}>Collection</Text>
                                        <Text style={styles.infoValue}>Home</Text>
                                    </View>
                                    <View style={styles.infoItem}>
                                        <Ionicons name="flask" size={18} color={PRIMARY_GREEN} />
                                        <Text style={styles.infoLabel}>Parameters</Text>
                                        <Text style={styles.infoValue}>
                                            {totalParams > 0 ? totalParams : pkg.tests_count || 0}
                                        </Text>
                                    </View>
                                </View>

                                {/* ── Fasting Banner ── */}
                                {pkg.fasting && (
                                    <View style={styles.fastingBox}>
                                        <Ionicons
                                            name="warning"
                                            size={16}
                                            color="#D97706"
                                            style={{ marginRight: 8 }}
                                        />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.fastingTitle}>Fasting Required</Text>
                                            <Text style={styles.fastingDesc}>
                                                Avoid food & water for 10-12 hours before collection
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                {/* ── Parameters Section ── */}
                                <View style={styles.section}>
                                    <View style={styles.sectionHeader}>
                                        <Ionicons
                                            name="list"
                                            size={16}
                                            color={PRIMARY_GREEN}
                                            style={{ marginRight: 6 }}
                                        />
                                        <Text style={styles.sectionTitle}>
                                            Includes{' '}
                                            {totalParams > 0 ? totalParams : pkg.tests_count || 0}{' '}
                                            Parameters
                                        </Text>
                                    </View>

                                    {paramGroups.length > 0 ? (
                                        // Grouped accordions — one per test group (CBC, LFT, etc.)
                                        paramGroups.map((group) => {
                                            const isExpanded = expandedGroups.has(group.name);
                                            return (
                                                <View
                                                    key={group.name}
                                                    style={styles.groupCard}
                                                >
                                                    {/* Group header — tap to expand */}
                                                    <TouchableOpacity
                                                        style={styles.groupHeader}
                                                        onPress={() => toggleGroup(group.name)}
                                                        activeOpacity={0.75}
                                                    >
                                                        <View style={styles.groupHeaderLeft}>
                                                            <View style={styles.groupDot} />
                                                            <Text
                                                                style={styles.groupName}
                                                                numberOfLines={2}
                                                            >
                                                                {group.name}
                                                            </Text>
                                                        </View>
                                                        <View style={styles.groupHeaderRight}>
                                                            <Text style={styles.groupCount}>
                                                                {group.package_detail.length} tests
                                                            </Text>
                                                            <Ionicons
                                                                name={
                                                                    isExpanded
                                                                        ? 'chevron-up'
                                                                        : 'chevron-down'
                                                                }
                                                                size={16}
                                                                color={TEXT_MUTED}
                                                            />
                                                        </View>
                                                    </TouchableOpacity>

                                                    {/* Expanded sub-parameters */}
                                                    {isExpanded && (
                                                        <View style={styles.paramList}>
                                                            {group.package_detail.map(
                                                                (param, idx) => (
                                                                    <View
                                                                        key={idx}
                                                                        style={styles.paramItem}
                                                                    >
                                                                        <Ionicons
                                                                            name="checkmark-circle"
                                                                            size={14}
                                                                            color={PRIMARY_GREEN}
                                                                            style={{
                                                                                marginRight: 8,
                                                                                marginTop: 1,
                                                                            }}
                                                                        />
                                                                        <Text style={styles.paramName}>
                                                                            {param.name}
                                                                        </Text>
                                                                    </View>
                                                                )
                                                            )}
                                                        </View>
                                                    )}
                                                </View>
                                            );
                                        })
                                    ) : (
                                        // Fallback — no groups returned but count is known
                                        <View style={styles.parametersBox}>
                                            <Ionicons
                                                name="checkmark"
                                                size={16}
                                                color={PRIMARY_GREEN}
                                                style={{ marginRight: 8 }}
                                            />
                                            <Text style={styles.parametersText}>
                                                Complete analysis with{' '}
                                                {pkg.tests_count || 0} comprehensive parameters
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                {/* ── Preparation ── */}
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>Preparation</Text>
                                    <View style={styles.prepBox}>
                                        <Ionicons
                                            name={
                                                pkg.fasting
                                                    ? 'alert-circle'
                                                    : 'checkmark-circle'
                                            }
                                            size={16}
                                            color={pkg.fasting ? '#D97706' : PRIMARY_GREEN}
                                            style={{ marginRight: 8 }}
                                        />
                                        <Text style={styles.prepText}>
                                            {(pkg as any).preparation ||
                                                (pkg.fasting
                                                    ? 'Fast for 10-12 hours before sample collection'
                                                    : 'No special preparation required')}
                                        </Text>
                                    </View>
                                </View>

                                {/* ── Important Notes ── */}
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>Important Notes</Text>
                                    {[
                                        'Report time may vary slightly by location',
                                        'Always share your previous reports with the doctor',
                                        'NABL certified labs, quality guaranteed',
                                    ].map((note, i) => (
                                        <View key={i} style={styles.noteItem}>
                                            <Ionicons
                                                name="information-circle-outline"
                                                size={14}
                                                color={TEXT_MUTED}
                                            />
                                            <Text style={styles.noteText}>{note}</Text>
                                        </View>
                                    ))}
                                </View>
                            </>
                        ) : (
                            <View
                                style={{
                                    alignItems: 'center',
                                    paddingVertical: 50,
                                    paddingHorizontal: 20,
                                }}
                            >
                                <Ionicons
                                    name="alert-circle-outline"
                                    size={48}
                                    color={TEXT_MUTED}
                                    style={{ marginBottom: 12 }}
                                />
                                <Text
                                    style={{
                                        color: isDarkMode ? '#FFFFFF' : TEXT_DARK,
                                        fontSize: 15,
                                        fontWeight: '600',
                                        textAlign: 'center',
                                        marginBottom: 6,
                                    }}
                                >
                                    Unable to load
                                </Text>
                                <Text
                                    style={{
                                        color: TEXT_MUTED,
                                        fontSize: 12,
                                        textAlign: 'center',
                                        lineHeight: 18,
                                    }}
                                >
                                    There was an issue loading the package details. Please try
                                    again.
                                </Text>
                            </View>
                        )}
                    </ScrollView>

                    {/* ── Sticky Footer ── */}
                    <View style={[styles.footer, { paddingBottom: styles.footer.paddingBottom + insets.bottom }]}>
                        <TouchableOpacity
                            style={styles.cartBtn}
                            onPress={() => {
                                if (pkg) onAddToCart(pkg);
                                onClose();
                            }}
                        >
                            <Ionicons
                                name="cart-outline"
                                size={18}
                                color={PRIMARY_GREEN}
                                style={{ marginRight: 6 }}
                            />
                            <Text style={styles.cartBtnText}>Add to Cart</Text>
                        </TouchableOpacity>

                        {onBookNow && (
                            <TouchableOpacity
                                style={styles.bookBtn}
                                onPress={() => {
                                    if (pkg) {
                                        onClose();
                                        onBookNow(pkg);
                                    }
                                }}
                            >
                                <Text style={styles.bookBtnText}>Book Now</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const makeStyles = (isDarkMode: boolean, colors: ThemeColors) =>
    StyleSheet.create({
        overlay: {
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.55)',
            justifyContent: 'flex-end',
        },
        container: {
            minHeight: '70%',
            maxHeight: '95%',
            backgroundColor: isDarkMode ? '#1A1A1A' : '#fff',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            overflow: 'hidden',
            flexDirection: 'column',
        },
        header: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            paddingHorizontal: 18,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: isDarkMode ? '#3A3A3A' : '#F0F0F0',
        },
        headerTitle: {
            fontSize: 15,
            fontWeight: '700',
            color: isDarkMode ? '#FFFFFF' : TEXT_DARK,
            flex: 1,
            marginRight: 12,
            lineHeight: 22,
        },
        closeBtn: { padding: 4 },
        content: {
            flex: 1,
            paddingHorizontal: 16,
            paddingTop: 12,
        },

        // Price
        priceSection: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            paddingBottom: 14,
            borderBottomWidth: 1,
            borderBottomColor: isDarkMode ? '#3A3A3A' : '#F0F0F0',
            marginBottom: 14,
        },
        price: {
            fontSize: 28,
            fontWeight: '900',
            color: isDarkMode ? '#FFFFFF' : TEXT_DARK,
        },
        originalPrice: {
            fontSize: 13,
            color: TEXT_MUTED,
            textDecorationLine: 'line-through',
            marginTop: 4,
        },
        saveBadge: {
            backgroundColor: '#F43F5E',
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 6,
        },
        saveBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

        // Info grid
        infoGrid: {
            flexDirection: 'row',
            gap: 10,
            marginBottom: 14,
        },
        infoItem: {
            flex: 1,
            backgroundColor: isDarkMode ? '#252525' : '#F9FAFB',
            padding: 12,
            borderRadius: 10,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: isDarkMode ? '#3A3A3A' : '#F0F0F0',
        },
        infoLabel: {
            fontSize: 10,
            color: TEXT_MUTED,
            marginTop: 6,
            fontWeight: '500',
        },
        infoValue: {
            fontSize: 12,
            fontWeight: '600',
            color: isDarkMode ? '#FFFFFF' : TEXT_DARK,
            marginTop: 2,
            textAlign: 'center',
        },

        // Fasting
        fastingBox: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            backgroundColor: '#FEF3C7',
            padding: 12,
            borderRadius: 10,
            marginBottom: 14,
            borderWidth: 1,
            borderColor: '#FDE68A',
        },
        fastingTitle: { fontSize: 13, fontWeight: '600', color: '#D97706' },
        fastingDesc: {
            fontSize: 12,
            color: '#92400E',
            marginTop: 2,
            lineHeight: 17,
        },

        // Section
        section: { marginBottom: 16 },
        sectionHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 10,
        },
        sectionTitle: {
            fontSize: 14,
            fontWeight: '700',
            color: isDarkMode ? '#FFFFFF' : TEXT_DARK,
        },

        // Parameter groups (accordion)
        groupCard: {
            backgroundColor: isDarkMode ? '#252525' : '#F9FAFB',
            borderRadius: 10,
            marginBottom: 8,
            borderWidth: 1,
            borderColor: isDarkMode ? '#3A3A3A' : '#EBEBEB',
            overflow: 'hidden',
        },
        groupHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 12,
            paddingVertical: 11,
        },
        groupHeaderLeft: {
            flexDirection: 'row',
            alignItems: 'center',
            flex: 1,
            marginRight: 8,
        },
        groupDot: {
            width: 7,
            height: 7,
            borderRadius: 4,
            backgroundColor: PRIMARY_GREEN,
            marginRight: 10,
            flexShrink: 0,
        },
        groupName: {
            fontSize: 13,
            fontWeight: '600',
            color: isDarkMode ? '#FFFFFF' : TEXT_DARK,
            flex: 1,
        },
        groupHeaderRight: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
        },
        groupCount: {
            fontSize: 11,
            color: TEXT_MUTED,
            fontWeight: '500',
        },

        // Sub-parameters
        paramList: {
            paddingHorizontal: 12,
            paddingBottom: 10,
            borderTopWidth: 1,
            borderTopColor: isDarkMode ? '#3A3A3A' : '#EBEBEB',
            paddingTop: 8,
        },
        paramItem: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            paddingVertical: 4,
        },
        paramName: {
            fontSize: 12,
            color: isDarkMode ? '#CCCCCC' : '#4B5563',
            flex: 1,
            lineHeight: 18,
        },

        // Fallback parameters box
        parametersBox: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: isDarkMode ? '#252525' : '#F9FAFB',
            padding: 12,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: isDarkMode ? '#3A3A3A' : '#F0F0F0',
        },
        parametersText: {
            fontSize: 13,
            color: isDarkMode ? '#FFFFFF' : TEXT_DARK,
            flex: 1,
            lineHeight: 19,
        },

        // Preparation
        prepBox: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            backgroundColor: '#FEF3C7',
            padding: 12,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: '#FDE68A',
        },
        prepText: {
            fontSize: 12,
            color: '#92400E',
            flex: 1,
            lineHeight: 18,
        },

        // Notes
        noteItem: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 8,
            paddingVertical: 6,
        },
        noteText: {
            fontSize: 12,
            color: TEXT_MUTED,
            flex: 1,
            paddingTop: 1,
            lineHeight: 18,
        },

        // Footer buttons
        footer: {
            flexDirection: 'row',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderTopWidth: 1,
            borderTopColor: isDarkMode ? '#3A3A3A' : '#F0F0F0',
            backgroundColor: isDarkMode ? '#1A1A1A' : '#fff',
            gap: 10,
        },
        cartBtn: {
            flex: 1,
            flexDirection: 'row',
            paddingVertical: 13,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1.5,
            borderColor: PRIMARY_GREEN,
            backgroundColor: isDarkMode ? '#252525' : '#FFFFFF',
        },
        cartBtnText: {
            color: PRIMARY_GREEN,
            fontSize: 14,
            fontWeight: '700',
        },
        bookBtn: {
            flex: 1,
            backgroundColor: PRIMARY_GREEN,
            paddingVertical: 13,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
        },
        bookBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
    });
