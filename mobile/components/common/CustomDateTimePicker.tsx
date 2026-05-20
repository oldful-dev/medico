import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Colors, Fonts, FontSize, Spacing, Radius } from '@/constants/theme';

interface CustomDateTimePickerProps {
    label?: string;
    value?: Date;
    onDateChange?: (date: Date) => void;
    minimumDate?: Date;
    daysToShow?: number;
    timeSlots?: string[];
}

const DEFAULT_TIME_SLOTS = [
    '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
    '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM',
    '06:00 PM'
];

export default function CustomDateTimePicker({
    label,
    value,
    onDateChange,
    minimumDate,
    daysToShow = 5,
    timeSlots = DEFAULT_TIME_SLOTS,
}: CustomDateTimePickerProps) {
    const [selectedDateIdx, setSelectedDateIdx] = useState(0);
    const [selectedTimeSlot, setSelectedTimeSlot] = useState(timeSlots[0]);

    // Generate date pills for next N days
    const datePills = useMemo(() => {
        const pills = [];
        const start = minimumDate || new Date();

        for (let i = 0; i < daysToShow; i++) {
            const date = new Date(start);
            date.setDate(date.getDate() + i);
            pills.push(date);
        }
        return pills;
    }, [minimumDate, daysToShow]);

    const handleDateSelect = (index: number) => {
        setSelectedDateIdx(index);
    };

    const handleTimeSelect = (time: string) => {
        setSelectedTimeSlot(time);

        if (onDateChange) {
            const selectedDate = datePills[selectedDateIdx];
            const [timePart, meridiem] = time.split(' ');
            const [h, m] = timePart.split(':').map(Number);
            const hours = meridiem === 'PM' && h !== 12 ? h + 12 : meridiem === 'AM' && h === 12 ? 0 : h;

            const merged = new Date(selectedDate);
            merged.setHours(hours, m, 0, 0);
            onDateChange(merged);
        }
    };

    const formatDatePill = (date: Date): string => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayName = days[date.getDay()];
        const dayNum = date.getDate();
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthName = months[date.getMonth()];
        return `${dayName}\n${dayNum} ${monthName}`;
    };

    const selectedDate = datePills[selectedDateIdx];
    const isToday = selectedDateIdx === 0;

    return (
        <View style={styles.container}>
            {label && <Text style={styles.label}>{label}</Text>}

            {/* ─── Select Date ─── */}
            <View style={styles.section}>
                <Text style={styles.sectionLabel}>Select Date</Text>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    scrollEventThrottle={16}
                    style={styles.dateScrollView}
                >
                    <View style={styles.dateContainer}>
                        {datePills.map((date, idx) => (
                            <TouchableOpacity
                                key={idx}
                                style={[
                                    styles.datePill,
                                    selectedDateIdx === idx && styles.datePillSelected,
                                ]}
                                onPress={() => handleDateSelect(idx)}
                            >
                                <Text style={[
                                    styles.datePillText,
                                    selectedDateIdx === idx && styles.datePillTextSelected,
                                ]}>
                                    {isToday && idx === 0 ? 'Thu\n21 May' : formatDatePill(date)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>
            </View>

            {/* ─── Select Time ─── */}
            <View style={styles.section}>
                <Text style={styles.sectionLabel}>Select Time</Text>
                <View style={styles.timeGrid}>
                    {timeSlots.map((slot, idx) => (
                        <TouchableOpacity
                            key={idx}
                            style={[
                                styles.timeSlot,
                                selectedTimeSlot === slot && styles.timeSlotSelected,
                            ]}
                            onPress={() => handleTimeSelect(slot)}
                        >
                            <Text style={[
                                styles.timeSlotText,
                                selectedTimeSlot === slot && styles.timeSlotTextSelected,
                            ]}>
                                {slot}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: Spacing.lg,
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
    dateScrollView: {
        marginHorizontal: -16, // extend to edges
        paddingHorizontal: 16,
    },
    dateContainer: {
        flexDirection: 'row',
        gap: Spacing.md,
        paddingRight: Spacing.md,
    },
    datePill: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: Radius.lg,
        borderWidth: 2,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
        minWidth: 70,
        alignItems: 'center',
        justifyContent: 'center',
    },
    datePillSelected: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primary,
    },
    datePillText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.caption,
        color: Colors.textMuted,
        textAlign: 'center',
        lineHeight: 18,
    },
    datePillTextSelected: {
        color: '#FFFFFF',
    },
    timeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.md,
    },
    timeSlot: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
        flex: 1,
        minWidth: '30%',
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
