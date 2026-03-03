import React from 'react';
import {
    View,
    Text,
    Image,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Platform,
    useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// Service grid images
const doctorVisitImg = require('@/assets/images/32a4661f97e2fa2dd2c85c403a7c530b7214e7f7.png');
const homingNursingImg = require('@/assets/images/afd8e2afab202de7ddce09bf8add378c861b9347.png');
const fitnessTherapyImg = require('@/assets/images/54f5c849cf75e776592dec8236f221da3694ca53.png');
const homeBloodTestImg = require('@/assets/images/f74321d18a86a9e77628058ed35a50d284752eb2.png');
const orderMedicineImg = require('@/assets/images/79c15725f6f1a73658b615886f1289634cef9408.png');
const rentEquipmentImg = require('@/assets/images/d3906f517597b2ef10369d92c422b16bf20e879e.png');
const physioFitnessImg = require('@/assets/images/4ea419052803769fad63ff4292316ce7f8f77dbc.png');
const mealServiceImg = require('@/assets/images/8f136eff1200bb21c080348f6cdb7ad1c2831bdf.png');
const emergencyIcon = require('@/assets/images/e1baef7b977f856b4e0401f74fbf21e0ce5348f7.png');
const medicalReportIcon = require('@/assets/images/e453f94c7e87531b0da0b6712f8dc4b3bc7084a9.png');

const SERVICE_GRID = [
    { image: doctorVisitImg, label1: 'Doctor', label2: 'Visit', route: '/doctor-visit' },
    { image: homingNursingImg, label1: 'Homing', label2: 'Nursing', route: '/nurse-care' },
    { image: homeBloodTestImg, label1: 'Home', label2: 'Blood Test', route: '/blood-test' },
    { image: fitnessTherapyImg, label1: 'Fitness &', label2: 'Therapy', route: '/physio-fitness' },
    { image: rentEquipmentImg, label1: 'Rent Medical', label2: 'Equipment', route: '/medical-equipment' },
    { image: orderMedicineImg, label1: 'Order', label2: 'Medicines', route: '/order-medicines' },
    { image: mealServiceImg, label1: 'Meal', label2: 'Service', route: '/meal-service' },
    { image: physioFitnessImg, label1: 'Physio', label2: 'Fitness', route: '/physio-fitness' },
    { image: emergencyIcon, label1: 'Hospital', label2: 'Trip', route: '/hospital-trip' },
    { image: medicalReportIcon, label1: 'Insurance', label2: '& Claims', route: '/insurance' },
];

export default function AllOldfulServicesScreen() {
    const router = useRouter();
    const { width } = useWindowDimensions();

    // Screen padding corresponds to marginHorizontal of the card mapping on Home Screen
    const availableWidth = width - 40; // 20px padding on each side

    // Grid sizing logic - 3 Columns
    const exactItemWidth = Math.floor(availableWidth * 0.315);
    const exactImageHeight = exactItemWidth * 0.85;
    const exactCardHeight = exactImageHeight + 56;

    // Pad the grid array for clean left alignment in last row
    const paddedGrid: Array<typeof SERVICE_GRID[0] | { empty: boolean }> = [...SERVICE_GRID];
    while (paddedGrid.length % 3 !== 0) {
        paddedGrid.push({ empty: true });
    }

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            {/* ─── Header ─── */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#2F2F2F" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>All Oldful Services</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.gridContainer}>
                    {paddedGrid.map((item, i) => {
                        if ('empty' in item) {
                            return <View key={`empty-${i}`} style={{ width: exactItemWidth }} />;
                        }
                        return (
                            <TouchableOpacity
                                key={`service-${i}`}
                                style={[styles.gridItem, { width: exactItemWidth, height: exactCardHeight }]}
                                onPress={() => router.push(item.route as any)}
                            >
                                <Image
                                    source={item.image}
                                    style={[styles.gridImage, { width: exactItemWidth, height: exactImageHeight }]}
                                    resizeMode="cover"
                                />
                                <View style={styles.gridLabelContainer}>
                                    <Text style={styles.gridLabel}>{item.label1}</Text>
                                    {item.label2 ? <Text style={styles.gridLabel}>{item.label2}</Text> : null}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#FFFFE3',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    backButton: {
        paddingRight: 15,
    },
    headerTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-Bold', android: 'Poppins_700Bold', default: 'System' }),
        fontSize: 20,
        color: '#034C2A',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
        paddingTop: 10,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    gridItem: {
        marginBottom: 15,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
        alignItems: 'center',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    gridImage: {
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
    },
    gridLabelContainer: {
        flex: 1,
        width: '100%',
        paddingHorizontal: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    gridLabel: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 11,
        color: '#085B34',
        textAlign: 'center',
        lineHeight: 14,
    },
});
