import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Platform,
    ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Fonts, FontSize, Spacing, Radius, Shadow } from '@/constants/theme';

// ─── Figma Assets ───
const imgHeartOutline = require('@/assets/images/37d35bff48c57182eb08ca96ee07ef22d24fd2db.png'); // Heart with plus icon 
const imgBgBlue = require('@/assets/images/d8ad60edd50d15bfa3472e8a2d9ca46b49e1d6b3.png'); // Background image for Care plan price
const imgBgGreen = require('@/assets/images/86bc70fa8f71d21216a24037fe0a8390c6f29516.png'); // Background image for Home Maker plan price

const imgMoneyBag = require('@/assets/images/26948a93a4bbaa57b96ff130f4425886b3c5d292.png'); // Priority money bag icon
const imgCheckmark = require('@/assets/images/019640d27de157c119b045c46aae6a6559dd3a79.png'); // Green Check Circle
const imgFamilyHeart = require('@/assets/images/26945e6abc1b678cf3cb29a1a66c0cf290cc7cfd.png'); // Family icon

export default function PlansScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    return (
        <View style={styles.screen}>
            {/* Header extension */}
            <View style={{ backgroundColor: Colors.primary, height: insets.top }} />
            <StatusBar style="light" backgroundColor={Colors.primary} />

            {/* ─── Header ─── */}
            <View style={styles.headerContainer}>
                {/* Invisible back button layout just to center title */}
                <View style={styles.backButtonPlaceholder}>
                    <Ionicons name="arrow-back" size={24} color={Colors.textWhite} />
                </View>

                <Text style={styles.headerTitle}>Plans</Text>

                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* ─── Value Plans Banner ─── */}
                <View style={styles.valuePlanBanner}>
                    <Image source={imgHeartOutline} style={styles.heartPulseIcon} resizeMode="contain" />
                    <View style={styles.bannerTextContainer}>
                        <Text style={styles.bannerTitle}>Value Plans for Your Peace of Mind</Text>
                        <Text style={styles.bannerSubtitle}>Subscribe and save with our exclusive Oldful plans.</Text>
                    </View>
                </View>

                {/* ─── Plans Horizontal Scroll ─── */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.plansScrollContainer}
                >
                    {/* Plan Card 1: Care Plan */}
                    <View style={styles.planCard}>
                        <Text style={styles.planCardTitle}>Care Plan</Text>

                        <View style={styles.planCardDurationTabs}>
                            <Text style={styles.durationTabInactive}>Quarterly</Text>
                            <Text style={styles.durationTabInactive}>Biannually</Text>
                            <View style={styles.durationTabActiveLeft}>
                                <Text style={styles.durationTabTextActive}>Yearly</Text>
                            </View>
                        </View>

                        <View style={styles.priceContainer}>
                            {/* Assuming the blue background img sets the background of this container */}
                            <View style={[styles.priceBackground, { backgroundColor: '#56BDB7' }]} />
                            <Text style={styles.priceText}>₹1,999 <Text style={styles.priceSuffix}>/ Yearly</Text></Text>
                        </View>

                        <View style={styles.planFeatures}>
                            <View style={styles.featureItem}>
                                <Ionicons name="checkmark-outline" size={14} color="#666" style={styles.featureCheck} />
                                <Text style={styles.featureTextBold}>25% Off Healthy Meals</Text>
                            </View>
                            <View style={styles.featureItem}>
                                <Ionicons name="checkmark-outline" size={14} color="#666" style={styles.featureCheck} />
                                <Text style={styles.featureTextBold}>Temple & Picnic <Text style={styles.featureText}>Group Trips</Text></Text>
                            </View>
                            <View style={styles.featureItem}>
                                <Ionicons name="checkmark-outline" size={14} color="#666" style={styles.featureCheck} />
                                <Text style={styles.featureTextBold}>Paperwork & Tech Support</Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.planActionButtonLeft}
                            activeOpacity={0.8}
                            onPress={() => router.push('/smart-upgrade' as any)}
                        >
                            <Text style={styles.planActionText}>View Details / Subscribe</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Plan Card 2: Home Maker Plan */}
                    <View style={styles.planCard}>
                        <Text style={[styles.planCardTitle, { color: '#048357' }]}>Home Maker Plan</Text>

                        <View style={[styles.planCardDurationTabs, { backgroundColor: '#E8F5E9' }]}>
                            <Text style={[styles.durationTabInactive, { color: '#048357' }]}>Quarterly</Text>
                            <Text style={[styles.durationTabInactive, { color: '#048357' }]}>Biannually</Text>
                            <View style={styles.durationTabActiveRight}>
                                <Text style={[styles.durationTabTextActive, { color: '#048357' }]}>Yearly</Text>
                            </View>
                        </View>

                        <View style={styles.priceContainer}>
                            <View style={[styles.priceBackground, { backgroundColor: '#75B55E' }]} />
                            <Text style={styles.priceText}>₹4,799 <Text style={styles.priceSuffix}>/ Yearly</Text></Text>
                        </View>

                        <View style={styles.planFeatures}>
                            <View style={styles.featureItem}>
                                <Ionicons name="checkmark-outline" size={14} color="#85C3A8" style={styles.featureCheck} />
                                <Text style={styles.featureTextBold}>Home Cook <Text style={styles.featureText}>(Daily Meals)</Text></Text>
                            </View>
                            <View style={styles.featureItem}>
                                <Ionicons name="checkmark-outline" size={14} color="#85C3A8" style={styles.featureCheck} />
                                <Text style={styles.featureTextBold}>Bank, Will & ID{'\n'}Certificate <Text style={styles.featureText}>Updates</Text></Text>
                            </View>
                            <View style={styles.featureItem}>
                                <Ionicons name="checkmark-outline" size={14} color="#85C3A8" style={styles.featureCheck} />
                                <Text style={styles.featureTextBold}>Medicines & <Text style={styles.featureText}>Doctor Visits</Text></Text>
                            </View>
                            <View style={styles.featureItem}>
                                <Ionicons name="checkmark-outline" size={14} color="#85C3A8" style={styles.featureCheck} />
                                <Text style={styles.featureTextBold}>Tech Help <Text style={styles.featureText}>at Home</Text></Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.planActionButtonRight}
                            activeOpacity={0.8}
                            onPress={() => router.push('/smart-upgrade' as any)}
                        >
                            <Text style={styles.planActionText}>View Details / Subscribe</Text>
                        </TouchableOpacity>
                    </View>

                </ScrollView>

                {/* ─── Why Subscribe Section ─── */}
                <Text style={styles.sectionTitle}>Why Subscribe?</Text>

                <View style={styles.whySubscribeContainer}>

                    {/* Benefit 1 */}
                    <View style={styles.benefitRow}>
                        <View style={styles.benefitIconBox}>
                            <Image source={imgMoneyBag} style={styles.benefitIcon} resizeMode="contain" />
                        </View>
                        <View style={styles.benefitTextGroup}>
                            <Text style={styles.benefitTitle}>Save Big</Text>
                            <Text style={styles.benefitDesc}>Recover your plan cost in just <Text style={styles.benefitDescBold}>2 orders.</Text></Text>
                        </View>
                    </View>

                    {/* Benefit 2 */}
                    <View style={styles.benefitRow}>
                        <View style={styles.benefitIconBox}>
                            <Image source={imgCheckmark} style={styles.benefitIcon} resizeMode="contain" />
                        </View>
                        <View style={styles.benefitTextGroup}>
                            <Text style={styles.benefitTitle}>Priority Support</Text>
                            <Text style={styles.benefitDesc}><Text style={styles.benefitDescBold}>Skip the queue.</Text>member get answered first</Text>
                        </View>
                    </View>

                    {/* Benefit 3 */}
                    <View style={styles.benefitRow}>
                        <View style={styles.benefitIconBox}>
                            <Image source={imgFamilyHeart} style={[styles.benefitIcon, { width: 33, height: 33 }]} resizeMode="contain" />
                        </View>
                        <View style={styles.benefitTextGroup}>
                            <Text style={styles.benefitTitle}>Family Updates</Text>
                            <Text style={styles.benefitDescBold}>We Send a weekly health report to your children.</Text>
                        </View>
                    </View>

                </View>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: Colors.bgScreen, // Cream color matches Figma
    },

    /* ─── Header ─── */
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.lg,
        paddingBottom: 25,
        paddingTop: 10,
    },
    backButtonPlaceholder: {
        padding: 5,
        opacity: 0, // In apps without a direct back stack here or top-level tabs, we can hide or make it visible if needed. Let's keep it visible per screenshot design.
    },
    headerTitle: {
        flex: 1,
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading2,
        color: Colors.textWhite,
        textAlign: 'center',
        letterSpacing: -0.24,
    },
    scrollContent: {
        paddingBottom: 110, // Account for bottom tab bar
    },

    /* ─── Value Plan Banner ─── */
    valuePlanBanner: {
        backgroundColor: 'rgba(128, 249, 231, 0.38)',
        borderWidth: 1,
        borderColor: '#80F9E7',
        borderRadius: Radius.md,
        marginHorizontal: Spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        marginTop: 15,
        marginBottom: 20,
    },
    heartPulseIcon: {
        width: 65,
        height: 48,
        marginRight: 10,
    },
    bannerTextContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    bannerTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: Colors.textDark,
    },
    bannerSubtitle: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.caption,
        color: Colors.textBody,
        marginTop: 2,
    },

    /* ─── Cards Horizontal Row ─── */
    plansScrollContainer: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: 25,
        gap: Spacing.lg, // Gap between cards
    },
    planCard: {
        backgroundColor: Colors.bgCard,
        borderRadius: Radius.xl,
        width: 205, // Specific width to allow peek of the second card
        padding: Spacing.lg,
        ...Shadow.card,
    },
    planCardTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: Colors.textBody,
        marginBottom: Spacing.sm,
    },

    /* Duration Tabs */
    planCardDurationTabs: {
        flexDirection: 'row',
        backgroundColor: '#EAEFFF',
        borderRadius: 8,
        padding: 3,
        marginBottom: 10,
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    durationTabInactive: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.caption,
        color: Colors.textBody,
        paddingHorizontal: 4,
    },
    durationTabActiveLeft: {
        backgroundColor: '#D1DEFE',
        borderRadius: 6,
        paddingVertical: 4,
        paddingHorizontal: 8,
    },
    durationTabActiveRight: {
        backgroundColor: '#D8ECDC',
        borderRadius: 6,
        paddingVertical: 4,
        paddingHorizontal: 8,
    },
    durationTabTextActive: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.caption,
        color: '#4B73D0',
    },

    /* Price Container */
    priceContainer: {
        height: 28,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingHorizontal: Spacing.sm,
        marginBottom: Spacing.md,
        overflow: 'hidden',
    },
    priceBackground: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
    },
    priceText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.bodySmall,
        color: Colors.textWhite,
    },
    priceSuffix: {
        fontFamily: Fonts.regular,
        fontWeight: 'normal',
    },

    /* Plan Features */
    planFeatures: {
        marginBottom: 15,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    featureCheck: {
        marginRight: 6,
        marginTop: 2,
    },
    featureTextBold: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.bodySmall,
        color: Colors.textBody,
        flex: 1,
        lineHeight: 14,
    },
    featureText: {
        fontFamily: Fonts.regular,
        fontWeight: 'normal',
    },

    /* Plan Action Button */
    planActionButtonLeft: {
        backgroundColor: '#4B78D8',
        borderRadius: 6,
        height: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 'auto',
    },
    planActionButtonRight: {
        backgroundColor: '#42884F',
        borderRadius: 6,
        height: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 'auto',
    },
    planActionText: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.caption,
        color: Colors.textWhite,
    },

    /* ─── Why Subscribe ─── */
    sectionTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading1,
        color: Colors.textDark,
        paddingHorizontal: 18,
        marginBottom: Spacing.lg,
    },
    whySubscribeContainer: {
        backgroundColor: Colors.bgCard,
        borderRadius: Radius.xl * 2,
        marginHorizontal: Spacing.lg,
        padding: Spacing.xl,
        ...Shadow.card,
    },
    benefitRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 18,
    },
    benefitIconBox: {
        width: 35,
        height: 35,
        alignItems: 'center',
        marginRight: 10,
    },
    benefitIcon: {
        width: 25,
        height: 25,
    },
    benefitTextGroup: {
        flex: 1,
        justifyContent: 'center',
    },
    benefitTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: Colors.textBody,
        marginBottom: 4,
    },
    benefitDesc: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.bodySmall,
        color: Colors.textMuted,
        lineHeight: 18,
    },
    benefitDescBold: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.bodySmall,
        color: Colors.textMuted,
        lineHeight: 18,
    }
});
