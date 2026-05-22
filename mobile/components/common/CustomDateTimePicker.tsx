import React, { useState, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Colors, Fonts, FontSize, Spacing, Radius } from '@/constants/theme';

interface CustomDateTimePickerProps {
    label?: string;
    value?: Date;
    onChange?: (date: Date) => void;      // used by trip-travels
    onDateChange?: (date: Date) => void;  // used by other screens
    minimumDate?: Date;
    daysToShow?: number;
    timeSlots?: string[];
}

const DEFAULT_TIME_SLOTS = [
    '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
    '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM',
];

const DAY_NAMES  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON_NAMES  = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDatePill(date: Date): string {
    return `${DAY_NAMES[date.getDay()]}\n${date.getDate()} ${MON_NAMES[date.getMonth()]}`;
}

function mergeDateTime(date: Date, timeStr: string): Date {
    const [timePart, meridiem] = timeStr.split(' ');
    const [h, m] = timePart.split(':').map(Number);
    const hours = meridiem === 'PM' && h !== 12 ? h + 12 : meridiem === 'AM' && h === 12 ? 0 : h;
    const merged = new Date(date);
    merged.setHours(hours, m, 0, 0);
    return merged;
}

export default function CustomDateTimePicker({
    label,
    value,
    onChange,
    onDateChange,
    minimumDate,
    daysToShow = 14,
    timeSlots = DEFAULT_TIME_SLOTS,
}: CustomDateTimePickerProps) {
    const notify = onChange ?? onDateChange;

    const datePills = useMemo(() => {
        const pills: Date[] = [];
        const start = new Date(minimumDate ?? new Date());
        start.setHours(0, 0, 0, 0);
        for (let i = 0; i < daysToShow; i++) {
            const d = new Date(start);
            d.setDate(d.getDate() + i);
            pills.push(d);
        }
        return pills;
    }, [minimumDate, daysToShow]);

    const [selectedDateIdx, setSelectedDateIdx] = useState(0);
    const [selectedTime, setSelectedTime]       = useState(timeSlots[0]);
    const scrollRef = useRef<ScrollView>(null);

    const handleDateSelect = (idx: number) => {
        setSelectedDateIdx(idx);
        if (notify) notify(mergeDateTime(datePills[idx], selectedTime));
    };

    const handleTimeSelect = (slot: string) => {
        setSelectedTime(slot);
        if (notify) notify(mergeDateTime(datePills[selectedDateIdx], slot));
    };

    return (
        <View style={styles.container}>
            {label && <Text style={styles.label}>{label}</Text>}

            {/* ── Select Date ── */}
            <View style={styles.section}>
                <Text style={styles.sectionLabel}>Select Date</Text>
                <ScrollView
                    ref={scrollRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.dateContainer}
                    decelerationRate="fast"
                    snapToInterval={84}
                    snapToAlignment="start"
                >
                    {datePills.map((date, idx) => {
                        const active = selectedDateIdx === idx;
                        return (
                            <TouchableOpacity
                                key={idx}
                                style={[styles.datePill, active && styles.datePillSelected]}
                                onPress={() => handleDateSelect(idx)}
                                activeOpacity={0.75}
                            >
                                <Text style={[styles.datePillText, active && styles.datePillTextSelected]}>
                                    {formatDatePill(date)}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {/* ── Select Time ── */}
            <View style={styles.section}>
                <Text style={styles.sectionLabel}>Select Time</Text>
                <View style={styles.timeGrid}>
                    {timeSlots.map((slot, idx) => {
                        const active = selectedTime === slot;
                        return (
                            <TouchableOpacity
                                key={idx}
                                style={[styles.timeSlot, active && styles.timeSlotSelected]}
                                onPress={() => handleTimeSelect(slot)}
                                activeOpacity={0.75}
                            >
                                <Text style={[styles.timeSlotText, active && styles.timeSlotTextSelected]}>
                                    {slot}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
    label: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading3,
        color: Colors.textDark,
        marginBottom: Spacing.md,
    },
    section: {
        marginBottom: Spacing.lg,
    },
    sectionLabel: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: Colors.textDark,
        marginBottom: Spacing.md,
    },

    // Date pills
    dateContainer: {
        flexDirection: 'row',
        gap: 10,
        paddingRight: 16,
    },
    datePill: {
        width: 74,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    datePillSelected: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primary,
    },
    datePillText: {
        fontFamily: Fonts.semiBold,
        fontSize: 12,
        color: Colors.textMuted,
        textAlign: 'center',
        lineHeight: 18,
    },
    datePillTextSelected: {
        color: '#FFFFFF',
    },

    // Time grid
    timeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    timeSlot: {
        paddingVertical: 11,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
        width: '31%',
        alignItems: 'center',
    },
    timeSlotSelected: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primary,
    },
    timeSlotText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: Colors.textMuted,
    },
    timeSlotTextSelected: {
        color: '#FFFFFF',
    },
});
