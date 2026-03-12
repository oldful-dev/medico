import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Modal } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSize, Radius, Spacing } from '@/constants/theme';

interface DateTimePickerInputProps {
    label?: string;
    value?: Date;
    onDateChange?: (date: Date) => void;
    minimumDate?: Date;
}

export default function DateTimePickerInput({
    label = 'Schedule Appointment',
    value,
    onDateChange,
    minimumDate,
}: DateTimePickerInputProps) {
    const [date, setDate] = useState<Date>(value || new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [hasSelected, setHasSelected] = useState(!!value);

    const handleDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
            if (_event.type === 'dismissed') return;
        }
        if (selectedDate) {
            setDate(selectedDate);
            setHasSelected(true);
            if (Platform.OS === 'android') {
                // On Android, show time picker after date is selected
                setTimeout(() => setShowTimePicker(true), 300);
            }
            onDateChange?.(selectedDate);
        }
    };

    const handleTimeChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowTimePicker(false);
            if (_event.type === 'dismissed') return;
        }
        if (selectedDate) {
            setDate(selectedDate);
            onDateChange?.(selectedDate);
        }
    };

    const formatDate = (d: Date) => {
        const day = d.getDate().toString().padStart(2, '0');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months[d.getMonth()];
        const year = d.getFullYear();
        let hours = d.getHours();
        const mins = d.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        return `${day} ${month} ${year}  •  ${hours}:${mins} ${ampm}`;
    };

    const openPicker = () => {
        setShowDatePicker(true);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.label}>{label}</Text>
            <TouchableOpacity style={styles.pickerButton} onPress={openPicker} activeOpacity={0.7}>
                <Ionicons name="calendar-outline" size={20} color={Colors.primary} style={{ marginRight: 10 }} />
                <Text style={[styles.pickerText, hasSelected && styles.pickerTextSelected]}>
                    {hasSelected ? formatDate(date) : 'Select Date & Time'}
                </Text>
                <Ionicons name="chevron-forward" size={18} color="#AAAEAC" />
            </TouchableOpacity>

            {/* iOS: Show as modal with both date+time */}
            {Platform.OS === 'ios' && showDatePicker && (
                <Modal transparent animationType="slide">
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Select Date & Time</Text>
                                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                                    <Text style={styles.modalDone}>Done</Text>
                                </TouchableOpacity>
                            </View>
                            <DateTimePicker
                                value={date}
                                mode="datetime"
                                display="spinner"
                                onChange={(event, selectedDate) => {
                                    if (selectedDate) {
                                        setDate(selectedDate);
                                        setHasSelected(true);
                                        onDateChange?.(selectedDate);
                                    }
                                }}
                                minimumDate={minimumDate || new Date()}
                                textColor={Colors.textDark}
                            />
                        </View>
                    </View>
                </Modal>
            )}

            {/* Android: Sequential date then time pickers */}
            {Platform.OS === 'android' && showDatePicker && (
                <DateTimePicker
                    value={date}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                    minimumDate={minimumDate || new Date()}
                />
            )}
            {Platform.OS === 'android' && showTimePicker && (
                <DateTimePicker
                    value={date}
                    mode="time"
                    display="default"
                    onChange={handleTimeChange}
                />
            )}
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
        marginBottom: Spacing.sm,
    },
    pickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.bgCard,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: '#E5E5E5',
        paddingHorizontal: 15,
        paddingVertical: 14,
    },
    pickerText: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.body,
        color: '#898989',
        flex: 1,
    },
    pickerTextSelected: {
        color: Colors.textDark,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    modalContent: {
        backgroundColor: Colors.bgCard,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 30,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
    },
    modalTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading3,
        color: Colors.textDark,
    },
    modalDone: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.button,
        color: Colors.primary,
    },
});
