import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Platform,
    ScrollView,
    Alert,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import DateTimePickerInput from '@/components/common/DateTimePickerInput';
import { useServiceInitialization } from '@/hooks/useServiceInitialization';
import { bookingService } from '@/services/api/bookingService';


// ─── Figma Assets ───
const imgCarouselIndia = require('@/assets/images/c73921e0062b4c910b14682c3ab2491a1db69321.png'); // Gateway of India image
const imgCarouselOther = require('@/assets/images/ed2f1e34305aceebaaeb35f1b9e59d02cc97c79e.png'); // Edge of other image
const imgQuestionMark = require('@/assets/images/c359f98cd0aedd8de95a2f5901d68748695c53d9.png'); // 3D Question mark icon
const imgCalendar = require('@/assets/images/90b351b656f19748f6824ce10c01ad95a0f686f6.png'); // Calendar 3D icon
const imgYoga = require('@/assets/images/3abc2815df401d4b6b19fda9a2f8c9fd80b8f9e3.png'); // Yoga icon
const imgPicnic = require('@/assets/images/5bf8c5af10af2edaa6cb38278c8f8ce7133b77db.png'); // Picnic bag icon
const imgChai = require('@/assets/images/70f805bc4699a177600d02eb33328392afe8e5f3.png'); // Chai icon

export default function TripTravelsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [destination, setDestination] = useState('Temple Tours');
    const [tripPeopleCount, setTripPeopleCount] = useState(1);
    const [selectedEvent, setSelectedEvent] = useState('Morning Yoga Group');
    const [eventPeopleCount, setEventPeopleCount] = useState(1);
    const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined);
    const [isBooking, setIsBooking] = React.useState(false);

    const { isReady, cityId, serviceId, isLoading: isLoadingInit } = useServiceInitialization('trip-travels');



    const handleBookTrip = async () => {
        if (!destination || !selectedDate) {
            Alert.alert('Missing Info', 'Please select a destination and date.');
            return;
        }

        if (!cityId || !serviceId) {
            Alert.alert('Error', 'Service initialization incomplete. Please try again.');
            return;
        }

        try {
            setIsBooking(true);
            // Trip & Travels is an inquiry service — no Razorpay, goes to /service-confirmation.
            const res = await bookingService.createBooking({
                serviceId,
                cityId,
                scheduledDate: selectedDate!.toISOString(),
                addressLine: 'Trip / Travel Inquiry',
                formDataJson: { type: 'TRIP', destination, peopleCount: tripPeopleCount },
            });
            if (res.success && res.data) {
                router.push({ pathname: '/service-confirmation', params: { bookingId: res.data.id } });
            } else {
                Alert.alert('Booking Failed', res.message || 'Something went wrong.');
            }
        } catch (error) {
            console.error('Trip booking error:', error);
            Alert.alert('Error', 'Failed to submit inquiry. Please check your connection.');
        } finally {
            setIsBooking(false);
        }
    };

    const handleBookLocalEvent = async () => {
        if (!selectedEvent) {
            Alert.alert('Missing Info', 'Please select an event.');
            return;
        }
        if (eventPeopleCount < 1) {
            Alert.alert('Required', 'Please select at least 1 person.');
            return;
        }
        if (!cityId || !serviceId) {
            Alert.alert('Error', 'Service initialization incomplete. Please try again.');
            return;
        }

        try {
            setIsBooking(true);
            // Local event booking — no Razorpay, goes to /service-confirmation.
            const res = await bookingService.createBooking({
                serviceId,
                cityId,
                scheduledDate: new Date().toISOString(),
                addressLine: 'Local Event Booking',
                formDataJson: { type: 'EVENT', event: selectedEvent, groupSize: eventPeopleCount },
            });
            if (res.success && res.data) {
                router.push({ pathname: '/service-confirmation', params: { bookingId: res.data.id } });
            } else {
                Alert.alert('Booking Failed', res.message || 'Something went wrong.');
            }
        } catch (error) {
            console.error('Event booking error:', error);
            Alert.alert('Error', 'Failed to book seat. Please check your connection.');
        } finally {
            setIsBooking(false);
        }
    };

    return (
        <View style={styles.screen}>
            {/* Dark green header background to bridge safe area */}
            <View style={{ backgroundColor: '#048357', height: insets.top }} />
            <StatusBar style="light" backgroundColor="#048357" />

            {/* ─── Header ─── */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Trip & Travells</Text>
            </View>

            <KeyboardAwareScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" enableOnAndroid extraScrollHeight={20}>

                {/* ─── Intro Text ─── */}
                <Text style={styles.introText}>
                    Meet friends, go on trips, and have fun...
                </Text>

                {/* ─── Horizontal Image Carousel ─── */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.carouselContainer}
                >
                    <Image source={imgCarouselOther} style={[styles.carouselImage, { width: 67, marginRight: 15, marginLeft: -60 }]} />
                    <Image source={imgCarouselIndia} style={styles.carouselImage} />
                    <Image source={imgCarouselIndia} style={[styles.carouselImage, { width: 68, marginLeft: 15 }]} />
                </ScrollView>

                {/* Carousel dots indicator mock */}
                <View style={styles.carouselDots}>
                    <View style={[styles.dot, styles.dotInactive]} />
                    <View style={[styles.dot, styles.dotInactive]} />
                    <View style={[styles.dot, styles.dotActive]} />
                    <View style={[styles.dot, styles.dotInactive]} />
                    <View style={[styles.dot, styles.dotInactive]} />
                </View>

                {/* ─── Where Do You Want to Go? ─── */}
                <Text style={styles.sectionTitle}>Where do you want to go?</Text>

                <View style={styles.card}>
                    {/* Option 1: Checked */}
                    <TouchableOpacity style={styles.optionRow} onPress={() => setDestination('Temple Tours')}>
                        <View style={destination === 'Temple Tours' ? styles.radioSelected : styles.radioUnselected}>
                            {destination === 'Temple Tours' && <View style={styles.radioInner} />}
                        </View>
                        <Text style={styles.optionTextBold}>Temple Tours <Text style={styles.optionTextLight}>(Day trips to Tirupati/local temples)</Text></Text>
                    </TouchableOpacity>

                    {/* Option 2: Unchecked Radio */}
                    <TouchableOpacity style={styles.optionRow} onPress={() => setDestination('Out of station')}>
                        <View style={destination === 'Out of station' ? styles.radioSelected : styles.radioUnselected}>
                            {destination === 'Out of station' && <View style={styles.radioInner} />}
                        </View>
                        <Text style={styles.optionTextBold}>Out of station <Text style={styles.optionTextLight}>/anywhere in india</Text></Text>
                    </TouchableOpacity>

                    {/* Something Else / Text Input Mock */}
                    <View style={styles.somethingElseBox}>
                        <Image source={imgQuestionMark} style={styles.questionMarkIcon} />
                        <Text style={styles.somethingElseTitle}>
                            Something Else? <Text style={styles.somethingElseSubtitle}>write your specific requirement...</Text>
                        </Text>
                    </View>

                    {/* ─── Date & Time ─── */}
                    <DateTimePickerInput
                        label="When?"
                        value={selectedDate}
                        onDateChange={setSelectedDate}
                    />

                    {/* ─── Number of People ─── */}
                    <Text style={[styles.sectionTitle, { textAlign: 'left', fontSize: 16, marginTop: 15 }]}>How Many People?</Text>
                    <View style={styles.stepperContainer}>
                        <TouchableOpacity style={styles.stepperButton} onPress={() => setTripPeopleCount(Math.max(1, tripPeopleCount - 1))}>
                            <Ionicons name="remove" size={20} color="#555555" />
                        </TouchableOpacity>
                        <Text style={styles.stepperValue}>{tripPeopleCount}</Text>
                        <TouchableOpacity style={styles.stepperButton} onPress={() => setTripPeopleCount(tripPeopleCount + 1)}>
                            <Ionicons name="add" size={20} color="#555555" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ─── Submit Inquiry ─── */}
                <TouchableOpacity
                    style={[styles.mainButton, { marginBottom: 35 }, (isBooking || isLoadingInit) && { opacity: 0.7 }]}
                    activeOpacity={0.8}
                    disabled={isBooking || isLoadingInit}
                    onPress={handleBookTrip}
                >
                    <Text style={styles.mainButtonText}>{isLoadingInit ? 'Initializing...' : isBooking ? 'Processing...' : 'Submit inquiry'}</Text>
                </TouchableOpacity>

                {/* ─── Join Local Events ─── */}
                <View style={styles.localEventsHeader}>
                    <Image source={imgCalendar} style={styles.calendarIcon} />
                    <Text style={styles.sectionTitle}>Join Local Events</Text>
                </View>

                <View style={styles.card}>
                    {/* Option: Morning Yoga (Checked) */}
                    <TouchableOpacity style={styles.eventRow} onPress={() => setSelectedEvent('Morning Yoga Group')}>
                        <View style={selectedEvent === 'Morning Yoga Group' ? styles.radioSelected : styles.radioUnselected}>
                            {selectedEvent === 'Morning Yoga Group' && <View style={styles.radioInner} />}
                        </View>
                        <Image source={imgYoga} style={styles.eventIcon} />
                        <Text style={styles.optionTextBold}>Morning Yoga Group <Text style={styles.optionTextLight}>(Park meetups)</Text></Text>
                    </TouchableOpacity>
                    <View style={styles.divider} />

                    {/* Option: Day Outing (Checked but lighter check variant in figma, using same for now) */}
                    <TouchableOpacity style={styles.eventRow} onPress={() => setSelectedEvent('Day Outing')}>
                        <View style={selectedEvent === 'Day Outing' ? styles.radioSelected : styles.radioUnselected}>
                            {selectedEvent === 'Day Outing' && <View style={styles.radioInner} />}
                        </View>
                        <Image source={imgPicnic} style={styles.eventIcon} />
                        <Text style={styles.optionTextBold}>Day Outing <Text style={styles.optionTextLight}>(Picnic spots)</Text></Text>
                    </TouchableOpacity>
                    <View style={styles.divider} />

                    {/* Option: Chai & Chat (Checked) */}
                    <TouchableOpacity style={styles.eventRow} onPress={() => setSelectedEvent('Chai & Chat')}>
                        <View style={selectedEvent === 'Chai & Chat' ? styles.radioSelected : styles.radioUnselected}>
                            {selectedEvent === 'Chai & Chat' && <View style={styles.radioInner} />}
                        </View>
                        <Image source={imgChai} style={styles.eventIcon} />
                        <Text style={styles.optionTextBold}>Chai & Chat <Text style={styles.optionTextLight}>(Weekly meetup)</Text></Text>
                    </TouchableOpacity>
                    <View style={styles.divider} />

                    {/* Something Else / Text Input Mock */}
                    <View style={styles.somethingElseBox}>
                        <Image source={imgQuestionMark} style={styles.questionMarkIcon} />
                        <Text style={styles.somethingElseTitle}>
                            Something Else? <Text style={styles.somethingElseSubtitle}>write your specific requirement...</Text>
                        </Text>
                    </View>

                    {/* ─── Number of Group People ─── */}
                    <Text style={[styles.sectionTitle, { textAlign: 'left', fontSize: 16, marginTop: 15 }]}>Group Size</Text>
                    <View style={styles.stepperContainer}>
                        <TouchableOpacity style={styles.stepperButton} onPress={() => setEventPeopleCount(Math.max(1, eventPeopleCount - 1))}>
                            <Ionicons name="remove" size={20} color="#555555" />
                        </TouchableOpacity>
                        <Text style={styles.stepperValue}>{eventPeopleCount}</Text>
                        <TouchableOpacity style={styles.stepperButton} onPress={() => setEventPeopleCount(eventPeopleCount + 1)}>
                            <Ionicons name="add" size={20} color="#555555" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ─── Book Seat ─── */}
                <TouchableOpacity
                    style={[styles.mainButton, (isBooking || isLoadingInit) && { opacity: 0.7 }]}
                    activeOpacity={0.8}
                    disabled={isBooking || isLoadingInit}
                    onPress={handleBookLocalEvent}
                >
                    <Text style={styles.mainButtonText}>{isLoadingInit ? 'Initializing...' : isBooking ? 'Processing...' : 'Book Seat'}</Text>
                </TouchableOpacity>

            </KeyboardAwareScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#FDFDE8', // Cream background matching Figma
    },

    /* ─── Header ─── */
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#048357',
        paddingHorizontal: 16,
        paddingBottom: 15,
        paddingTop: 10,
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        flex: 1,
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 20,
        color: '#FFFFFF',
        textAlign: 'left', marginLeft: 12,
        letterSpacing: -0.24,
    },

    scrollContent: {
        paddingBottom: 40,
    },

    /* ─── Intro / Carousel ─── */
    introText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 16,
        color: '#555555',
        textAlign: 'center',
        marginTop: 20,
        marginBottom: 15,
        letterSpacing: -0.24,
    },
    carouselContainer: {
        paddingHorizontal: 16,
        height: 132,
    },
    carouselImage: {
        width: 355,
        height: 132,
        borderRadius: 21,
    },
    carouselDots: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: -20, // Negative margin to overlap image
        marginBottom: 20,
        gap: 6,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    dotInactive: {
        backgroundColor: 'rgba(217, 217, 217, 0.7)',
    },
    dotActive: {
        backgroundColor: '#048357',
    },

    /* ─── Sections ─── */
    sectionTitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 20,
        color: '#555555',
        marginBottom: 15,
        textAlign: 'center',
    },

    /* ─── Card Shared ─── */
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        marginHorizontal: 15,
        paddingVertical: 15,
        paddingHorizontal: 12,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 15,
        elevation: 3,
    },

    /* ─── Options & Rows ─── */
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        paddingHorizontal: 8,
    },
    checkIcon: {
        width: 16,
        height: 16,
        marginRight: 10,
    },
    radioUnchecked: {
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#555555',
        marginRight: 10,
    },
    optionTextBold: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 14,
        color: '#2F2F2F',
    },
    optionTextLight: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontWeight: 'normal',
    },
    radioSelected: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: '#048357',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    radioUnselected: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: '#D9D9D9',
        marginRight: 10,
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#048357',
    },

    /* ─── Additions for Date & Stepper ─── */
    datePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E5E5',
        paddingHorizontal: 15,
        paddingVertical: 14,
        marginBottom: 10,
    },
    datePickerText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 14,
        color: '#555555',
    },
    stepperContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E5E5',
        borderRadius: 12,
        alignSelf: 'flex-start',
        paddingVertical: 6,
        paddingHorizontal: 10,
    },
    stepperButton: {
        padding: 5,
        backgroundColor: 'rgba(217, 217, 217, 0.3)',
        borderRadius: 8,
    },
    stepperValue: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 16,
        color: '#2F2F2F',
        marginHorizontal: 20,
    },

    /* ─── Something Else Input ─── */
    somethingElseBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(4, 131, 87, 0.16)',
        borderRadius: 8,
        paddingHorizontal: 10,
        height: 42,
    },
    questionMarkIcon: {
        width: 21,
        height: 20,
        marginRight: 8,
    },
    somethingElseTitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 12,
        color: '#555555',
    },
    somethingElseSubtitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontStyle: 'italic',
        fontWeight: 'normal',
    },

    /* ─── Local Events Specifica ─── */
    localEventsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        marginBottom: 5,
    },
    calendarIcon: {
        width: 27,
        height: 27,
        marginRight: 10,
        marginTop: -10,
    },
    eventRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 5,
    },
    checkCircleBox: {
        width: 25,
        height: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    solidCheckBg: {
        width: 25,
        height: 25,
        backgroundColor: '#048357',
        borderRadius: 7,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkCircleBoxEmpty: {
        width: 25,
        height: 25,
        borderRadius: 7,
        borderWidth: 1,
        borderColor: '#AAAEAC',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
        backgroundColor: '#FFFFFF',
    },
    checkIconSmall: {
        width: 17,
        height: 17,
    },
    eventIcon: {
        width: 22,
        height: 22,
        marginRight: 10,
    },
    divider: {
        height: 1,
        backgroundColor: '#D9D9D9',
        marginLeft: 40, // aligns under text 
        width: '85%',
    },

    /* ─── Buttons ─── */
    mainButton: {
        backgroundColor: '#02743F',
        borderRadius: 22.5,
        height: 45,
        width: 230,
        alignSelf: 'center',
        justifyContent: 'center',
        alignItems: 'center',
    },
    mainButtonText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 14,
        color: '#FFFFFF',
    },
});
