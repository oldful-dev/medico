// Schedule Visit — Date & Time slot picker
// Matches doctor-visit design system: green header, cream body, Colors/Fonts tokens
import React, { useState, useRef, useCallback } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    StyleSheet, Platform, FlatList,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors, Fonts, FontSize, Spacing, Radius } from '@/constants/theme';
import { useBooking } from '@/context/BookingContext';

// ─── Helpers ────────────────────────────────────────────
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function buildDateList(count = 14) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Array.from({ length: count }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        return d;
    });
}

function buildTimeSlots(selectedDate: Date): string[] {
    const slots: string[] = [];
    const now = new Date();
    const isToday = selectedDate.toDateString() === now.toDateString();

    for (let h = 9; h <= 20; h++) {
        if (isToday && h <= now.getHours()) continue; // skip past slots for today
        const label = `${h > 12 ? h - 12 : h}:00 ${h >= 12 ? 'PM' : 'AM'}`;
        slots.push(label);
    }
    return slots;
}

function toISODate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─── Component ──────────────────────────────────────────
const DATES = buildDateList(14);

export default function ScheduleScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{
        serviceId?: string;
        cityId?: string;
        symptoms?: string;
        doctorType?: string;
        visitType?: string;
        addressLine?: string;
    }>();
    const { setCurrentBooking, currentBooking } = useBooking();

    const [selectedDate, setSelectedDate] = useState<Date>(DATES[0]);
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const timeSlots = buildTimeSlots(selectedDate);
    const dateListRef = useRef<FlatList>(null);

    const handleConfirm = useCallback(() => {
        if (!selectedSlot) return;

        // Merge schedule into booking draft stored in context
        setCurrentBooking({
            ...currentBooking,
            scheduledDate: toISODate(selectedDate),
            scheduledTime: selectedSlot,
            ...(params.serviceId && { serviceId: params.serviceId }),
            ...(params.cityId && { cityId: params.cityId }),
            ...(params.symptoms && { symptoms: params.symptoms.split(',') }),
            ...(params.doctorType && { doctorType: params.doctorType }),
            ...(params.visitType && { visitType: params.visitType }),
            ...(params.addressLine && { addressLine: params.addressLine }),
        });

        router.push({
            pathname: '/doctor-visit/confirmation',
            params: {
                scheduledDate: toISODate(selectedDate),
                scheduledTime: selectedSlot,
                ...params,
            },
        });
    }, [selectedDate, selectedSlot, currentBooking, params, setCurrentBooking, router]);

    // ─── Render date card ──────────────────────────────
    const renderDate = ({ item }: { item: Date }) => {
        const isSelected = item.toDateString() === selectedDate.toDateString();
        const isToday = item.toDateString() === new Date().toDateString();
        return (
            <TouchableOpacity
                style={[styles.dateCard, isSelected && styles.dateCardSelected]}
                onPress={() => {
                    setSelectedDate(item);
                    setSelectedSlot(null);
                }}
                activeOpacity={0.8}
            >
                <Text style={[styles.dateDayName, isSelected && styles.dateTextSelected]}>
                    {isToday ? 'Today' : DAY_NAMES[item.getDay()]}
                </Text>
                <Text style={[styles.dateDayNum, isSelected && styles.dateTextSelected]}>
                    {item.getDate()}
                </Text>
                <Text style={[styles.dateMonth, isSelected && styles.dateTextSelected]}>
                    {MONTH_NAMES[item.getMonth()]}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.screen} edges={['top']}>
            <StatusBar style="light" />

            {/* ─── Hero Header ─── */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={Colors.textWhite} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Schedule Visit</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.body} showsVerticalScrollIndicator={false} contentContainerStyle={styles.bodyContent}>

                {/* ─── Date Selector ─── */}
                <Text style={styles.sectionLabel}>Select Date</Text>
                <FlatList
                    ref={dateListRef}
                    data={DATES}
                    keyExtractor={d => d.toISOString()}
                    renderItem={renderDate}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.dateList}
                />

                {/* ─── Selected Date Display ─── */}
                <View style={styles.selectedDateBadge}>
                    <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
                    <Text style={styles.selectedDateText}>
                        {DAY_NAMES[selectedDate.getDay()]}, {selectedDate.getDate()} {MONTH_NAMES[selectedDate.getMonth()]} {selectedDate.getFullYear()}
                    </Text>
                </View>

                {/* ─── Time Slot Grid ─── */}
                <Text style={[styles.sectionLabel, { marginTop: Spacing.xl }]}>Select Time</Text>
                {timeSlots.length === 0 ? (
                    <View style={styles.noSlots}>
                        <Ionicons name="time-outline" size={32} color={Colors.textLight} />
                        <Text style={styles.noSlotsText}>No slots available for today.{'\n'}Please select another date.</Text>
                    </View>
                ) : (
                    <View style={styles.slotGrid}>
                        {timeSlots.map(slot => {
                            const isActive = slot === selectedSlot;
                            return (
                                <TouchableOpacity
                                    key={slot}
                                    style={[styles.slotChip, isActive && styles.slotChipActive]}
                                    onPress={() => setSelectedSlot(slot)}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons
                                        name="time-outline"
                                        size={14}
                                        color={isActive ? Colors.textWhite : Colors.primary}
                                    />
                                    <Text style={[styles.slotText, isActive && styles.slotTextActive]}>
                                        {slot}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}

                {/* ─── Info Note ─── */}
                <View style={styles.infoBox}>
                    <Ionicons name="information-circle-outline" size={16} color="#5a7d6e" />
                    <Text style={styles.infoText}>
                        Our team will confirm your appointment within 30 minutes via WhatsApp.
                    </Text>
                </View>

            </ScrollView>

            {/* ─── Confirm Button ─── */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.confirmBtn, !selectedSlot && styles.confirmBtnDisabled]}
                    onPress={handleConfirm}
                    disabled={!selectedSlot}
                    activeOpacity={0.85}
                >
                    <Text style={styles.confirmBtnText}>Confirm Appointment</Text>
                    <Ionicons name="arrow-forward" size={20} color={Colors.textWhite} />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: Colors.primary },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.lg,
    },
    backBtn: { padding: 8 },
    headerTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading2,
        color: Colors.textWhite,
    },

    body: { flex: 1, backgroundColor: Colors.bgScreen ?? '#FAFAF0', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
    bodyContent: { padding: Spacing.xl, paddingBottom: 100 },

    sectionLabel: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: Colors.textDark,
        marginBottom: Spacing.md,
    },

    // ─── Date strip ───
    dateList: { paddingBottom: Spacing.sm },
    dateCard: {
        width: 60,
        paddingVertical: Spacing.md,
        marginRight: Spacing.sm,
        borderRadius: Radius.md,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#E5E5E5',
    },
    dateCardSelected: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    dateDayName: {
        fontFamily: Fonts.regular,
        fontSize: 11,
        color: Colors.textLight,
        marginBottom: 4,
    },
    dateDayNum: {
        fontFamily: Fonts.bold ?? Fonts.semiBold,
        fontSize: 20,
        color: Colors.textDark,
    },
    dateMonth: {
        fontFamily: Fonts.regular,
        fontSize: 11,
        color: Colors.textLight,
        marginTop: 4,
    },
    dateTextSelected: { color: Colors.textWhite },

    // ─── Selected date badge ───
    selectedDateBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: Spacing.md,
        backgroundColor: '#E8F5EE',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: Radius.sm,
        alignSelf: 'flex-start',
    },
    selectedDateText: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.small,
        color: Colors.primary,
    },

    // ─── Slot grid ───
    slotGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    slotChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: Radius.full ?? 50,
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: Colors.primary,
    },
    slotChipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    slotText: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.small,
        color: Colors.primary,
    },
    slotTextActive: { color: Colors.textWhite },

    // ─── No slots ───
    noSlots: {
        alignItems: 'center',
        paddingVertical: Spacing.xl * 2,
        gap: Spacing.md,
    },
    noSlotsText: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.body,
        color: Colors.textLight,
        textAlign: 'center',
        lineHeight: 24,
    },

    // ─── Info box ───
    infoBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        marginTop: Spacing.xl,
        backgroundColor: '#EDF7F1',
        padding: Spacing.md,
        borderRadius: Radius.md,
        borderLeftWidth: 3,
        borderLeftColor: Colors.primary,
    },
    infoText: {
        flex: 1,
        fontFamily: Fonts.regular,
        fontSize: FontSize.small,
        color: '#3d6b53',
        lineHeight: 20,
    },

    // ─── Footer ───
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0, right: 0,
        backgroundColor: Colors.bgScreen ?? '#FAFAF0',
        padding: Spacing.xl,
        paddingBottom: Platform.OS === 'ios' ? Spacing.xl + 16 : Spacing.xl,
        borderTopWidth: 1,
        borderTopColor: '#E5E5E5',
    },
    confirmBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: Colors.primary,
        paddingVertical: 16,
        borderRadius: Radius.lg ?? 12,
    },
    confirmBtnDisabled: { opacity: 0.45 },
    confirmBtnText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: Colors.textWhite,
    },
});
