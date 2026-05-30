import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  useWindowDimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Fonts, FontSize, Spacing, Radius, Shadow } from '@/constants/theme';
import { ThemeColors } from '@/hooks/use-theme-colors';
import { LinearGradient } from 'expo-linear-gradient';
import { Banner } from '@/services/api/bannerService';

interface BannerSliderProps {
  banners: Banner[];
  colors: ThemeColors;
}

export function BannerSlider({ banners, colors }: BannerSliderProps) {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoScrollTimer, setAutoScrollTimer] = useState<any>(null);

  const activeBanners = banners.filter((b: Banner) => b.isActive);

  const BANNER_HEIGHT = 240;

  // Auto-scroll every 5 seconds
  useEffect(() => {
    if (activeBanners.length <= 1) return;

    const startAutoScroll = () => {
      const timer = setInterval(() => {
        setCurrentIndex(prev => {
          const next = (prev + 1) % activeBanners.length;
          flatListRef.current?.scrollToIndex({ index: next, animated: true });
          return next;
        });
      }, 5000);
      setAutoScrollTimer(timer);
    };

    startAutoScroll();
    return () => {
      if (autoScrollTimer) clearInterval(autoScrollTimer);
    };
  }, [activeBanners.length]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const currentIndex = Math.round(contentOffsetX / width);
    setCurrentIndex(currentIndex);
    Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
      useNativeDriver: false,
    })(event);
  };

  const handleBannerPress = (banner: Banner) => {
    if (!banner?.ctaRoute) return;
    router.push(banner.ctaRoute as any);
  };

  if (activeBanners.length === 0) return null;

  const s = makeStyles(colors, width, BANNER_HEIGHT);

  return (
    <View style={s.container}>
      <View style={s.sliderWrapper}>
        <FlatList
          ref={flatListRef}
          data={activeBanners}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={s.bannerCard}
              activeOpacity={0.95}
              onPress={() => handleBannerPress(item)}
            >
              {/* Background Image */}
              <Image
                source={{ uri: item.imageUrl }}
                style={s.bannerImage}
                resizeMode="cover"
              />

              {/* Dark Overlay Gradient */}
              <LinearGradient
                colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.5)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={s.gradientOverlay}
              />

              {/* Text Content */}
              <View style={s.bannerContent}>
                <Text style={s.bannerHeading} numberOfLines={2}>
                  {item.heading}
                </Text>
                <Text style={s.bannerSubheading} numberOfLines={2}>
                  {item.subheading}
                </Text>

                {item.ctaRoute && (
                  <View style={s.ctaContainer}>
                    <Text style={s.ctaText}>{item.ctaText || 'Explore'}</Text>
                    <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          scrollEnabled
          scrollEventThrottle={16}
          onScroll={handleScroll}
          showsHorizontalScrollIndicator={false}
          onScrollBeginDrag={() => {
            if (autoScrollTimer) clearInterval(autoScrollTimer);
            setAutoScrollTimer(null);
          }}
          onScrollEndDrag={() => {
            if (activeBanners.length > 1) {
              const timer = setInterval(() => {
                setCurrentIndex(prev => {
                  const next = (prev + 1) % activeBanners.length;
                  flatListRef.current?.scrollToIndex({ index: next, animated: true });
                  return next;
                });
              }, 5000);
              setAutoScrollTimer(timer);
            }
          }}
        />

        {/* Pagination Dots */}
        {activeBanners.length > 1 && (
          <View style={s.paginationContainer}>
            {activeBanners.map((_: Banner, index: number) => {
              const inputRange = [
                (index - 1) * width,
                index * width,
                (index + 1) * width,
              ];

              const scale = scrollX.interpolate({
                inputRange,
                outputRange: [0.8, 1.2, 0.8],
                extrapolate: 'clamp',
              });

              const opacity = scrollX.interpolate({
                inputRange,
                outputRange: [0.5, 1, 0.5],
                extrapolate: 'clamp',
              });

              return (
                <Animated.View
                  key={index}
                  style={[
                    s.dot,
                    {
                      transform: [{ scale }],
                      opacity,
                      backgroundColor: colors.primary,
                    },
                  ]}
                />
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}

function makeStyles(c: ThemeColors, width: number, bannerHeight: number) {
  return StyleSheet.create({
    container: {
      marginHorizontal: Spacing.cardMargin,
      marginTop: Spacing.md,
      marginBottom: Spacing.md,
    },
    sliderWrapper: {
      position: 'relative',
    },
    bannerCard: {
      width: width - Spacing.cardMargin * 2,
      height: bannerHeight,
      borderRadius: Radius.xl,
      overflow: 'hidden',
      ...Shadow.card,
    },
    bannerImage: {
      width: '100%',
      height: '100%',
      position: 'absolute',
    },
    gradientOverlay: {
      ...StyleSheet.absoluteFillObject,
    },
    bannerContent: {
      flex: 1,
      padding: Spacing.lg,
      justifyContent: 'flex-end',
      ...StyleSheet.absoluteFillObject,
    },
    bannerHeading: {
      fontFamily: Fonts.bold,
      fontSize: FontSize.heading2,
      color: '#FFFFFF',
      marginBottom: Spacing.sm,
      lineHeight: 28,
    },
    bannerSubheading: {
      fontFamily: Fonts.regular,
      fontSize: FontSize.body,
      color: 'rgba(255,255,255,0.9)',
      marginBottom: Spacing.md,
      lineHeight: 20,
    },
    ctaContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      backgroundColor: c.primary,
      paddingHorizontal: Spacing.md,
      paddingVertical: 10,
      borderRadius: Radius.lg,
      alignSelf: 'flex-start',
    },
    ctaText: {
      fontFamily: Fonts.semiBold,
      fontSize: FontSize.bodySmall,
      color: '#FFFFFF',
    },
    paginationContainer: {
      position: 'absolute',
      bottom: 12,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 6,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginHorizontal: 3,
    },
  });
}
