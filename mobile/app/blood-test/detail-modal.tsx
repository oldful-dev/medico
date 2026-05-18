import React, { useState, useEffect } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, Modal,
    StyleSheet, ActivityIndicator, Platform, FlatList,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { labService, type LabPackage } from '@/services/api/labService';

const PRIMARY_GREEN = '#02743F';
const TEXT_DARK = '#2F2F2F';
const TEXT_MUTED = '#888888';
const CREAM_BG = '#FDFDE8';

interface DetailModalProps {
    visible: boolean;
    packageCode?: string;
    onClose: () => void;
    onAddToCart: (pkg: LabPackage) => void;
}

export function BloodTestDetailModal({ visible, packageCode, onClose, onAddToCart }: DetailModalProps) {
    const [pkg, setPkg] = useState<LabPackage | null>(null);
    const [loading, setLoading] = useState(false);
    const [expandedTests, setExpandedTests] = useState(false);

    useEffect(() => {
        if (visible && packageCode) {
            setLoading(true);
            setExpandedTests(false);
            labService.getPackageDetails(packageCode)
                .then(data => { setPkg(data); })
                .catch(err => console.error('Failed to fetch package details:', err))
                .finally(() => setLoading(false));
        }
    }, [visible, packageCode]);

    const discountPercent = pkg?.cost && pkg.discounted_cost && pkg.cost > pkg.discounted_cost
        ? Math.round(((pkg.cost - pkg.discounted_cost) / pkg.cost) * 100)
        : 0;

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle} numberOfLines={2}>{pkg?.name || 'Test Details'}</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color={TEXT_DARK} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} style={styles.content} contentContainerStyle={{ paddingBottom: 20 }}>
                        {loading ? (
                            <View style={{ marginTop: 60, alignItems: 'center' }}>
                                <ActivityIndicator size="large" color={PRIMARY_GREEN} />
                            </View>
                        ) : pkg ? (
                            <>
                                {/* Price & Badge */}
                                <View style={styles.priceSection}>
                                    <View>
                                        <Text style={styles.price}>₹{pkg.discounted_cost || pkg.cost}</Text>
                                        {discountPercent > 0 && (
                                            <Text style={styles.originalPrice}>₹{pkg.cost}</Text>
                                        )}
                                    </View>
                                    {discountPercent > 0 && (
                                        <View style={styles.saveBadge}>
                                            <Text style={styles.saveBadgeText}>SAVE {discountPercent}%</Text>
                                        </View>
                                    )}
                                </View>

                                {/* Description */}
                                {pkg.description && (
                                    <View style={styles.descSection}>
                                        <Text style={styles.descText}>{pkg.description}</Text>
                                    </View>
                                )}

                                {/* Info Grid - 3 columns */}
                                <View style={styles.infoGrid}>
                                    <View style={styles.infoItem}>
                                        <MaterialCommunityIcons name="clock-outline" size={18} color={PRIMARY_GREEN} />
                                        <Text style={styles.infoLabel}>Report Time</Text>
                                        <Text style={styles.infoValue}>{pkg.reportTime || '24 Hrs'}</Text>
                                    </View>
                                    <View style={styles.infoItem}>
                                        <MaterialCommunityIcons name="home" size={18} color={PRIMARY_GREEN} />
                                        <Text style={styles.infoLabel}>Collection</Text>
                                        <Text style={styles.infoValue}>Home Collection</Text>
                                    </View>
                                    <View style={styles.infoItem}>
                                        <Ionicons name="flask" size={18} color={PRIMARY_GREEN} />
                                        <Text style={styles.infoLabel}>Tests</Text>
                                        <Text style={styles.infoValue}>{pkg.tests_count || 0}</Text>
                                    </View>
                                </View>

                                {/* Tests List */}
                                {pkg.tests && pkg.tests.length > 0 && (
                                    <View style={styles.section}>
                                        <View style={styles.sectionHeader}>
                                            <Text style={styles.sectionTitle}>Includes ({pkg.tests.length} Parameters)</Text>
                                            <TouchableOpacity onPress={() => setExpandedTests(!expandedTests)}>
                                                <Ionicons name={expandedTests ? "chevron-up" : "chevron-down"} size={20} color={PRIMARY_GREEN} />
                                            </TouchableOpacity>
                                        </View>
                                        {expandedTests && (
                                            <View style={styles.testsList}>
                                                {pkg.tests.map((test, idx) => (
                                                    <View key={idx} style={styles.testItem}>
                                                        <Ionicons name="checkmark-circle" size={14} color={PRIMARY_GREEN} />
                                                        <Text style={styles.testName}>{test}</Text>
                                                    </View>
                                                ))}
                                                {pkg.tests.length > 20 && (
                                                    <TouchableOpacity onPress={() => {}}>
                                                        <Text style={styles.moreLink}>+ More ({pkg.tests.length - 20})</Text>
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        )}
                                    </View>
                                )}

                                {/* Preparation */}
                                {pkg.preparation && (
                                    <View style={styles.section}>
                                        <Text style={styles.sectionTitle}>Preparation</Text>
                                        <View style={styles.prepBox}>
                                            <Ionicons name="alert-circle" size={16} color="#D97706" style={{ marginRight: 8 }} />
                                            <Text style={styles.prepText}>{pkg.preparation}</Text>
                                        </View>
                                    </View>
                                )}

                                {/* Fasting Banner if needed */}
                                {pkg.fasting && (
                                    <View style={styles.fastingBox}>
                                        <Ionicons name="information-circle" size={16} color="#D97706" style={{ marginRight: 8 }} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.fastingTitle}>Fasting Required</Text>
                                            <Text style={styles.fastingDesc}>No food or water for 10-12 hours before test</Text>
                                        </View>
                                    </View>
                                )}

                                {/* Important Notes */}
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>Important Notes</Text>
                                    <View style={styles.noteItem}>
                                        <Ionicons name="information-circle-outline" size={14} color={TEXT_MUTED} />
                                        <Text style={styles.noteText}>Report may vary slightly by location</Text>
                                    </View>
                                    <View style={styles.noteItem}>
                                        <Ionicons name="information-circle-outline" size={14} color={TEXT_MUTED} />
                                        <Text style={styles.noteText}>Always share your previous reports with the doctor</Text>
                                    </View>
                                </View>
                            </>
                        ) : null}
                    </ScrollView>

                    {/* Sticky Add to Cart Button */}
                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={styles.addBtn}
                            onPress={() => {
                                if (pkg) onAddToCart(pkg);
                                onClose();
                            }}
                        >
                            <Text style={styles.addBtnText}>Add to Cart</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    container: {
        flex: 0.88,
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
        flexDirection: 'column',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: TEXT_DARK,
        flex: 1,
        marginRight: 12,
    },
    closeBtn: {
        padding: 4,
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 12,
    },
    priceSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        marginBottom: 16,
    },
    price: {
        fontSize: 28,
        fontWeight: '900',
        color: TEXT_DARK,
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
    saveBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    descSection: {
        backgroundColor: CREAM_BG,
        padding: 12,
        borderRadius: 10,
        marginBottom: 16,
    },
    descText: {
        fontSize: 13,
        color: TEXT_DARK,
        lineHeight: 19,
    },
    infoGrid: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 16,
    },
    infoItem: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        padding: 12,
        borderRadius: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F0F0F0',
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
        color: TEXT_DARK,
        marginTop: 2,
    },
    section: {
        marginBottom: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: TEXT_DARK,
    },
    testsList: {
        backgroundColor: '#F9FAFB',
        padding: 12,
        borderRadius: 10,
        gap: 8,
    },
    testItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
    },
    testName: {
        fontSize: 12,
        color: TEXT_DARK,
        flex: 1,
        paddingTop: 2,
    },
    moreLink: {
        color: PRIMARY_GREEN,
        fontSize: 12,
        fontWeight: '600',
        marginTop: 4,
    },
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
    fastingBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#FEF3C7',
        padding: 12,
        borderRadius: 10,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#FDE68A',
    },
    fastingTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#D97706',
    },
    fastingDesc: {
        fontSize: 12,
        color: '#92400E',
        marginTop: 2,
        lineHeight: 17,
    },
    noteItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        paddingVertical: 8,
    },
    noteText: {
        fontSize: 12,
        color: TEXT_MUTED,
        flex: 1,
        paddingTop: 2,
    },
    footer: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        backgroundColor: '#fff',
    },
    addBtn: {
        backgroundColor: PRIMARY_GREEN,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addBtnText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
});
