// ──────────────────────────────────────────────
//  Global Location Sheet — "Where do you need service?"
//
//  The from-anywhere entry point for changing the app's Active Service
//  Location. Shows the current active location, every saved address,
//  a "Use Current Location" action, and an "Add New Address" shortcut.
//  Selecting an address here calls AddressContext.selectActiveAddress
//  directly — the same action every migrated screen's picker uses.
// ──────────────────────────────────────────────

import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useTheme } from '@/context/ThemeContext';
import { useAddress } from '@/context/AddressContext';

interface GlobalLocationSheetProps {
    visible: boolean;
    onClose: () => void;
}

export function GlobalLocationSheet({ visible, onClose }: GlobalLocationSheetProps) {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const { isDarkMode } = useTheme();
    const colors = useThemeColors();
    const router = useRouter();
    const {
        savedAddresses,
        activeAddress,
        activeAddressSource,
        selectActiveAddress,
        useCurrentLocationAsActive,
    } = useAddress();

    const [detecting, setDetecting] = useState(false);

    const handleSelectSaved = (addr: (typeof savedAddresses)[number]) => {
        selectActiveAddress(addr);
        onClose();
    };

    const handleUseCurrentLocation = async () => {
        setDetecting(true);
        try {
            await useCurrentLocationAsActive({ save: false });
            onClose();
        } finally {
            setDetecting(false);
        }
    };

    const handleAddNewAddress = () => {
        onClose();
        router.push('/manage-addresses' as any);
    };

    const styles = makeStyles(isDarkMode, colors);

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
                <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
                    <View style={styles.handle} />

                    <View style={styles.header}>
                        <Text style={styles.title}>{t('global_location.title', { defaultValue: 'Where do you need service?' })}</Text>
                        <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Ionicons name="close" size={22} color={colors.textMuted} />
                        </TouchableOpacity>
                    </View>

                    {activeAddress && (
                        <View style={styles.activeBanner}>
                            <Ionicons name="location" size={16} color={colors.primary} />
                            <View style={{ flex: 1, marginLeft: 8 }}>
                                <Text style={styles.activeBannerLabel} numberOfLines={1}>
                                    {t('global_location.current_active', { defaultValue: 'Currently using' })}
                                    {activeAddressSource === 'temporary-gps' ? ` (${t('global_location.temporary', { defaultValue: 'temporary' })})` : ''}
                                </Text>
                                <Text style={styles.activeBannerText} numberOfLines={1}>{activeAddress.line1}</Text>
                            </View>
                        </View>
                    )}

                    <TouchableOpacity style={styles.actionRow} onPress={handleUseCurrentLocation} disabled={detecting}>
                        <View style={styles.actionIconCircle}>
                            {detecting ? (
                                <ActivityIndicator size="small" color={colors.primary} />
                            ) : (
                                <Ionicons name="locate" size={18} color={colors.primary} />
                            )}
                        </View>
                        <Text style={styles.actionText}>
                            {detecting
                                ? t('global_location.detecting', { defaultValue: 'Detecting your location...' })
                                : t('global_location.use_current_location', { defaultValue: 'Use Current Location' })}
                        </Text>
                    </TouchableOpacity>

                    {savedAddresses.length > 0 && (
                        <>
                            <Text style={styles.sectionLabel}>{t('global_location.saved_addresses', { defaultValue: 'Saved Addresses' })}</Text>
                            <ScrollView style={styles.savedList} showsVerticalScrollIndicator={false}>
                                {savedAddresses.map((addr) => {
                                    const isActive = activeAddressSource === 'manual-override'
                                        ? activeAddress?.id === addr.id
                                        : activeAddressSource === 'default' && addr.isDefault;
                                    return (
                                        <TouchableOpacity
                                            key={addr.id}
                                            style={[styles.savedItem, isActive && styles.savedItemActive]}
                                            onPress={() => handleSelectSaved(addr)}
                                        >
                                            <Ionicons
                                                name={
                                                    addr.label === 'Home' ? 'home' :
                                                    addr.label === 'Office' ? 'briefcase' :
                                                    addr.label === 'Parents Home' ? 'people' :
                                                    'location'
                                                }
                                                size={18}
                                                color={isActive ? colors.primary : colors.textMuted}
                                            />
                                            <View style={{ flex: 1, marginLeft: 10 }}>
                                                <Text style={styles.savedItemLabel}>{addr.label}</Text>
                                                <Text style={styles.savedItemText} numberOfLines={1}>
                                                    {[addr.line1, addr.cityName].filter(Boolean).join(', ')}
                                                </Text>
                                            </View>
                                            {isActive && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </>
                    )}

                    <TouchableOpacity style={styles.addNewBtn} onPress={handleAddNewAddress}>
                        <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                        <Text style={styles.addNewBtnText}>{t('global_location.add_new_address', { defaultValue: 'Add New Address' })}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const makeStyles = (isDarkMode: boolean, colors: any) => StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    sheet: {
        backgroundColor: colors.bgCard,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 12,
        maxHeight: '80%',
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.borderLight,
        alignSelf: 'center',
        marginBottom: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    title: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 17,
        color: colors.textDark,
        flex: 1,
        marginRight: 12,
    },
    activeBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDarkMode ? 'rgba(4,131,87,0.15)' : '#F0FDF4',
        borderRadius: 10,
        padding: 12,
        marginBottom: 16,
    },
    activeBannerLabel: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 11,
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    activeBannerText: {
        fontFamily: Platform.select({ ios: 'Poppins-Medium', android: 'Poppins_500Medium', default: 'System' }),
        fontSize: 14,
        color: colors.textDark,
        marginTop: 2,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
        marginBottom: 8,
    },
    actionIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: isDarkMode ? 'rgba(4,131,87,0.15)' : '#F0FDF4',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    actionText: {
        fontFamily: Platform.select({ ios: 'Poppins-Medium', android: 'Poppins_500Medium', default: 'System' }),
        fontSize: 14,
        color: colors.primary,
    },
    sectionLabel: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 12,
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
        marginTop: 8,
        marginBottom: 8,
    },
    savedList: {
        maxHeight: 260,
    },
    savedItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderRadius: 10,
        marginBottom: 4,
    },
    savedItemActive: {
        backgroundColor: isDarkMode ? 'rgba(4,131,87,0.15)' : '#F0FDF4',
    },
    savedItemLabel: {
        fontFamily: Platform.select({ ios: 'Poppins-Medium', android: 'Poppins_500Medium', default: 'System' }),
        fontSize: 13,
        color: colors.textDark,
    },
    savedItemText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 12,
        color: colors.textMuted,
        marginTop: 1,
    },
    addNewBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: colors.primary,
        marginTop: 12,
    },
    addNewBtnText: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 14,
        color: colors.primary,
    },
});
