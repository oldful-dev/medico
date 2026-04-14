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
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Fonts } from '@/constants/theme';

import { apiClient } from '@/services/api/apiClient';

// Home essentials icons
const acRepairIcon = require('@/assets/images/fa6360cf6179cebaed29a6c808bafae2d31ad753.png');
const plumbingIcon = require('@/assets/images/8ce612b04a3a83f1e834c7b71a6dd2c0174cb918.png');
const cleaningIcon = require('@/assets/images/ad6b9b061bc7b1487a0e73c2557f711136d2a4d9.png');
const driverIcon = require('@/assets/images/60d4d0afa5801aeaa9e593bc049e3b017ef5624c.png');
const billsIcon = require('@/assets/images/056ecb9c01dd2283b1c0db1e84c1eb94c6d8a45a.png');
const bankWorkIcon = require('@/assets/images/33ede0e57be708b9775957c3ecec7013b0a56c6d.png');
const groceryIcon = require('@/assets/images/8888c71f466119aa294bd00136ff887f616d4737.png');
const anythingElseIcon = require('@/assets/images/6c8ed456023258e8b4095af93909c6cbc6c4b909.png');

const ICON_MAPPING: Record<string, any> = {
    'appliance-repair': acRepairIcon,
    'plumbing-electrical': plumbingIcon,
    'deep-cleaning': cleaningIcon,
    'driving-cab': driverIcon,
    'bill-payment': billsIcon,
    'bank-paperwork': bankWorkIcon,
    'grocery-run': groceryIcon,
    'anything-else': anythingElseIcon,
    'paper-legal': bankWorkIcon,
    'trip-travels': driverIcon,
    'tech-helper': acRepairIcon,
    'smart-upgrade': cleaningIcon,
};

export default function AllHomeEssentialsScreen() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const [services, setServices] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        fetchServices();
    }, []);

    const fetchServices = async () => {
        try {
            setLoading(true);
            const res = await apiClient.get<any[]>('/services?isEnabled=true');
            if (res.success && res.data) {
                // Utility to resolve mismatched slugs to valid mobile routes
                const resolveSlugToRoute = (slug: string) => {
                    if (slug === 'tech-helper-essentials') return '/tech-helper';
                    if (slug === 'home-essentials') return '/all-home-essentials';
                    return `/${slug}`;
                };

                // Filter for Home Essentials, excluding the parent category item itself
                const filtered = res.data
                    .filter((s: any) => s.serviceType === 'HOME_ESSENTIALS' && s.slug !== 'home-essentials')
                    .map((s: any) => ({
                        ...s,
                        route: resolveSlugToRoute(s.slug),
                        iconAsset: ICON_MAPPING[s.slug] || anythingElseIcon,
                        displayLabel: s.name.replace(' & ', '\n').replace(' ', '\n')
                    }));
                setServices(filtered);
            }
        } catch (error) {
            console.error('Failed to fetch services:', error);
        } finally {
            setLoading(false);
        }
    };

    // Screen padding corresponds to marginHorizontal of the card mapping on Home Screen
    const availableWidth = width - 40; // 20px padding on each side

    // Grid sizing logic - 4 Columns
    const exactItemWidth = Math.floor(availableWidth * 0.23);
    const exactCardHeight = exactItemWidth * 1.35;

    // Pad the grid array for clean left alignment in last row
    const paddedGrid = [...services];
    while (paddedGrid.length > 0 && paddedGrid.length % 4 !== 0) {
        paddedGrid.push({ empty: true });
    }

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            {/* ─── Header ─── */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#2F2F2F" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>All Home Essentials</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {loading ? (
                    <Text style={{ textAlign: 'center', marginTop: 20 }}>Loading services...</Text>
                ) : (
                    <View style={styles.gridContainer}>
                        {paddedGrid.map((item, i) => {
                            if (item.empty) {
                                return <View key={`empty-${i}`} style={{ width: exactItemWidth }} />;
                            }
                            return (
                                <TouchableOpacity
                                    key={item.id || `service-${i}`}
                                    style={[styles.gridItem, { width: exactItemWidth, height: exactCardHeight }]}
                                    onPress={() => router.push(item.route as any)}
                                >
                                    <View style={styles.essentialIconCircle}>
                                        <Image source={item.iconAsset} style={styles.essentialIcon} resizeMode="contain" />
                                    </View>
                                    <Text style={styles.essentialLabel}>{item.displayLabel}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}
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
        fontFamily: Fonts.bold,
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
        marginBottom: 20,
        alignItems: 'center',
        justifyContent: 'flex-start',
    },
    essentialIconCircle: {
        width: '80%', // Roughly matched from index.tsx scaling
        aspectRatio: 1,
        borderRadius: 999,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 6,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#34C759',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    essentialIcon: {
        width: '60%',
        height: '60%',
    },
    essentialLabel: {
        fontFamily: Fonts.medium,
        fontSize: 10,
        color: '#333333',
        textAlign: 'center',
        lineHeight: 12,
    },
});
