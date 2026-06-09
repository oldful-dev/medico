import React, { useState, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Colors, Fonts, FontSize, Spacing, Radius } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useTheme } from '@/context/ThemeContext';
import { useTranslation } from 'react-i18next';

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
    '8:00 AM - 11:00 AM',
    '12:00 PM - 3:00 PM',
    '4:00 PM - 7:00 PM',
];

function formatDatePill(date: Date, t: any): string {
    const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const monthKeys = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    return `${t(`days.${dayKeys[date.getDay()]}`)}\n${date.getDate()} ${t(`months.${monthKeys[date.getMonth()]}`)}`;
}

function mergeDateTime(date: Date, timeStr: string): Date {
    let cleanTimeStr = timeStr;
    if (timeStr.includes('-')) {
        cleanTimeStr = timeStr.split('-')[0].trim();
    }
    const parts = cleanTimeStr.split(' ');
    const timePart = parts[0];
    const meridiem = parts[1];
    let h = 0, m = 0;
    if (timePart.includes(':')) {
        const [hourPart, minPart] = timePart.split(':').map(Number);
        h = hourPart;
        m = minPart;
    } else {
        h = Number(timePart);
    }
    const hours = meridiem === 'PM' && h !== 12 ? h + 12 : meridiem === 'AM' && h === 12 ? 0 : h;
    const merged = new Date(date);
    merged.setHours(hours, isNaN(m) ? 0 : m, 0, 0);
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
    const { t } = useTranslation();
    const { isDarkMode } = useTheme();
    const colors = useThemeColors();
    const styles = makeStyles(isDarkMode, colors);
    const notify = onChange ?? onDateChange;

    const isSlotPast = (date: Date, slot: string) => {
        const now = new Date();
        if (date.toDateString() !== now.toDateString()) return false;
        return mergeDateTime(date, slot) <= now;
    };

    const datePills = useMemo(() => {
        const pills: Date[] = [];
        const start = new Date(minimumDate ?? new Date());
        
        // If today is fully past (all slots in the past), we start from tomorrow
        const now = new Date();
        const isTodayFullyPast = timeSlots.every(slot => mergeDateTime(start, slot) <= now);
        if (isTodayFullyPast && start.toDateString() === now.toDateString()) {
            start.setDate(start.getDate() + 1);
        }

        start.setHours(0, 0, 0, 0);
        for (let i = 0; i < daysToShow; i++) {
            const d = new Date(start);
            d.setDate(d.getDate() + i);
            pills.push(d);
        }
        return pills;
    }, [minimumDate, daysToShow, timeSlots]);

    const [selectedDateIdx, setSelectedDateIdx] = useState(0);
    const [selectedTime, setSelectedTime]       = useState(timeSlots[0]);
    const scrollRef = useRef<ScrollView>(null);

    // Keep selection in sync and shift if selected time becomes past
    React.useEffect(() => {
        const selectedDate = datePills[selectedDateIdx];
        if (!selectedDate) return;
        if (isSlotPast(selectedDate, selectedTime)) {
            const firstValid = timeSlots.find(slot => !isSlotPast(selectedDate, slot));
            if (firstValid) {
                setSelectedTime(firstValid);
                if (notify) notify(mergeDateTime(selectedDate, firstValid));
            }
        }
    }, [selectedDateIdx, datePills, timeSlots, selectedTime, notify]);

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
                <Text style={styles.sectionLabel}>{t('common.select_date')}</Text>
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
                                    {formatDatePill(date, t)}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {/* ── Select Time ── */}
            <View style={styles.section}>
                <Text style={styles.sectionLabel}>{t('common.select_time')}</Text>
                <View style={styles.timeGrid}>
                    {timeSlots.map((slot, idx) => {
                        const active = selectedTime === slot;
                        const isPast = datePills[selectedDateIdx] ? isSlotPast(datePills[selectedDateIdx], slot) : false;
                        return (
                            <TouchableOpacity
                                key={idx}
                                style={[
                                    styles.timeSlot,
                                    active && styles.timeSlotSelected,
                                    isPast && styles.timeSlotDisabled
                                ]}
                                onPress={() => handleTimeSelect(slot)}
                                disabled={isPast}
                                activeOpacity={0.75}
                            >
                                <Text style={[
                                    styles.timeSlotText,
                                    active && styles.timeSlotTextSelected,
                                    isPast && styles.timeSlotTextDisabled
                                ]}>
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

const makeStyles = (isDarkMode: boolean, colors: any) => StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
    label: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading3,
        color: colors.textDark,
        marginBottom: Spacing.md,
    },
    section: {
        marginBottom: Spacing.lg,
    },
    sectionLabel: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: colors.textDark,
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
        borderColor: isDarkMode ? '#334155' : '#E5E7EB',
        backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    datePillSelected: {
        borderColor: colors.primary,
        backgroundColor: colors.primary,
    },
    datePillText: {
        fontFamily: Fonts.semiBold,
        fontSize: 12,
        color: colors.textMuted,
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
        borderColor: isDarkMode ? '#334155' : '#E5E7EB',
        backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
        width: '31%',
        alignItems: 'center',
    },
    timeSlotSelected: {
        borderColor: colors.primary,
        backgroundColor: colors.primary,
    },
    timeSlotDisabled: {
        borderColor: isDarkMode ? '#334155' : '#E5E7EB',
        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#F3F4F6',
        opacity: 0.5,
    },
    timeSlotText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: colors.textMuted,
        textAlign: 'center',
    },
    timeSlotTextSelected: {
        color: '#FFFFFF',
    },
    timeSlotTextDisabled: {
        color: isDarkMode ? '#475569' : '#9CA3AF',
    },
});
