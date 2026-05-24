import React from 'react';
import {
    View,
    Text,
    Image,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useThemeColors, ThemeColors } from '@/hooks/use-theme-colors';

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

export default function AllAyuxaServicesScreen() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const { isDarkMode } = useTheme();
    const colors = useThemeColors();
    const styles = makeStyles(isDarkMode, colors, Fonts);

    // Screen padding corresponds to marginHorizontal of the card mapping on Home Screen
    const availableWidth = width - 40; // 20px padding on each side

    // Grid sizing logic - 3 Columns
    const exactItemWidth = Math.floor(availableWidth * 0.315);
    const exactImageHeight = exactItemWidth * 0.85;
    const exactCardHeight = exactImageHeight + 56;

    // Pad the grid array for clean left alignment in last row
    const paddedGrid: (typeof SERVICE_GRID[0] | { empty: boolean })[] = [...SERVICE_GRID];
    while (paddedGrid.length % 3 !== 0) {
        paddedGrid.push({ empty: true });
    }

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgScreen }]} edges={['top']}>
            <StatusBar style={isDarkMode ? 'light' : 'dark'} />
            {/* ─── Header ─── */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={colors.textDark} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.textDark }]}>All Ayuxa Services</Text>
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
                                style={[styles.gridItem, { width: exactItemWidth, height: exactCardHeight, backgroundColor: colors.bgCard }]}
                                onPress={() => router.push(item.route as any)}
                            >
                                <Image
                                    source={item.image}
                                    style={[styles.gridImage, { width: exactItemWidth, height: exactImageHeight }]}
                                    resizeMode="cover"
                                />
                                <View style={styles.gridLabelContainer}>
                                    <Text style={[styles.gridLabel, { color: colors.textDark }]}>{item.label1}</Text>
                                    {item.label2 ? <Text style={[styles.gridLabel, { color: colors.textDark }]}>{item.label2}</Text> : null}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const makeStyles = (isDarkMode: boolean, colors: ThemeColors, fonts: typeof Fonts) => StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: isDarkMode ? '#1A1A1A' : '#FFFFE3',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: isDarkMode ? '#252525' : '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: isDarkMode ? '#3A3A3A' : '#E5E7EB',
    },
    backButton: {
        paddingRight: 15,
    },
    headerTitle: {
        fontFamily: fonts.bold,
        fontSize: 20,
        color: isDarkMode ? '#E0E0E0' : '#034C2A',
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
        backgroundColor: isDarkMode ? '#252525' : '#FFFFFF',
        overflow: 'hidden',
        alignItems: 'center',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDarkMode ? 0.3 : 0.1,
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
        fontFamily: fonts.medium,
        fontSize: 11,
        color: isDarkMode ? '#E0E0E0' : '#085B34',
        textAlign: 'center',
        lineHeight: 14,
    },
});
