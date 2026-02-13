/**
 * Explore Screen - Premium Airbnb + Logistics Design
 *
 * Features:
 * - Animated shimmer skeleton loading
 * - Scroll-driven header animations
 * - 3D card interactions with spring physics
 * - Pulsing live indicators
 * - Animated route visualizations
 * - Glassmorphism effects (Powered by Skia)
 * - Modern gradient accents
 * - Micro-interactions everywhere
 * - High Performance Lists (Switched to FlatList for stability)
 * - NEW: SmartRadar (Network Visualization)
 * - NEW: BountyTicket (Transactional Design)
 * - NEW: BoardingPass (Logistics Design)
 * - REFACTORED: Airbnb Style Ambient Shadows
 * - REFACTORED: Offer Modal Logic (State Lifted)
 * - UPDATE: Integrated Offer Logic & Matching Trips Query
 */

import { api } from "@/convex/_generated/api";
import { useAuth } from "@clerk/clerk-expo";
import { useMutation, useQuery } from "convex/react";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  ArrowRight,
  Box,
  Calendar,
  ChevronRight,
  Clock,
  Luggage,
  Plane,
  Radar,
  TrendingUp,
  X,
  Zap,
} from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInRight,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Toast from "react-native-toast-message";

import { useTranslation } from "react-i18next";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// ============================================================================
// DESIGN SYSTEM - Premium 2026 (Updated for Airbnb "Ambient + Key" Shadows)
// ============================================================================
const DESIGN = {
  colors: {
    background: "#F2F4F6",
    backgroundSecondary: "#FFFFFF",
    backgroundTertiary: "#E5E7EB",
    surface: "#FFFFFF",
    modalOverlay: "rgba(15, 23, 42, 0.4)",
    textPrimary: "#0F172A",
    textSecondary: "#64748B",
    textTertiary: "#94A3B8",
    textInverse: "#FFFFFF",
    brand: "#FF385C",
    brandLight: "rgba(255, 56, 92, 0.08)",
    brandGradient: ["#FF385C", "#E31C5F"] as const,
    accent: "#10B981",
    accentLight: "rgba(16, 185, 129, 0.1)",
    accentGradient: ["#10B981", "#059669"] as const,
    dark: "#0F172A",
    darkGradient: ["#0F172A", "#1E293B"] as const,
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
    border: "#E2E8F0",
    borderDark: "#CBD5E1",
    divider: "#F1F5F9",
    shimmer: "#E2E8F0",
    shimmerHighlight: "#F8FAFC",
    glassLight: "rgba(255, 255, 255, 0.7)",
    glassDark: "rgba(15, 23, 42, 0.6)",
    live: "#22C55E",
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  radius: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 24,
    xl: 32,
    full: 9999,
  },

  shadow: {
    sm: {
      shadowColor: "rgb(26, 26, 26)",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 3,
      elevation: 2,
    },
    md: {
      shadowColor: "rgb(26, 26, 26)",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 4,
    },
    lg: {
      shadowColor: "rgb(26, 26, 26)",
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.1,
      shadowRadius: 24,
      elevation: 10,
    },
    ticket: {
      shadowColor: "rgb(26, 26, 26)",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 3,
    },
    colored: (color: string) => ({
      shadowColor: color,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 8,
    }),
  },
} as const;

// ============================================================================
// ANIMATED COMPONENTS
// ============================================================================

const ShimmerEffect: React.FC<{
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: any;
}> = ({ width, height, borderRadius = DESIGN.radius.sm, style }) => {
  const shimmerTranslate = useSharedValue(-1);

  useEffect(() => {
    shimmerTranslate.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.ease }),
      -1,
      false,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(shimmerTranslate.value, [-1, 1], [-200, 200]) },
    ],
  }));

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: DESIGN.colors.shimmer,
          overflow: "hidden",
        },
        style,
      ]}
    >
      <Animated.View style={[styles.shimmerGradient, animatedStyle]}>
        <LinearGradient
          colors={[
            "transparent",
            DESIGN.colors.shimmerHighlight,
            "transparent",
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
};

const SkeletonCard: React.FC<{ index: number }> = ({ index }) => (
  <Animated.View
    entering={FadeIn.delay(index * 100).duration(400)}
    style={styles.skeletonCard}
  >
    <View style={styles.skeletonHeader}>
      <ShimmerEffect width={44} height={44} borderRadius={22} />
      <View style={styles.skeletonHeaderText}>
        <ShimmerEffect width={100} height={14} />
        <ShimmerEffect width={70} height={10} style={{ marginTop: 6 }} />
      </View>
      <ShimmerEffect width={60} height={24} borderRadius={12} />
    </View>
    <View style={styles.skeletonRoute}>
      <ShimmerEffect width={50} height={40} />
      <ShimmerEffect width={80} height={8} />
      <ShimmerEffect width={50} height={40} />
    </View>
    <ShimmerEffect
      width="100%"
      height={48}
      borderRadius={DESIGN.radius.md}
      style={{ marginTop: 12 }}
    />
  </Animated.View>
);

const PulsingDot: React.FC<{ color?: string; size?: number }> = ({
  color = DESIGN.colors.live,
  size = 8,
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.5, { duration: 1000 }),
        withTiming(1, { duration: 1000 }),
      ),
      -1,
      false,
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 1000 }),
        withTiming(1, { duration: 1000 }),
      ),
      -1,
      false,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={styles.pulsingDotContainer}>
      <Animated.View
        style={[
          styles.pulsingDotOuter,
          {
            backgroundColor: color,
            width: size * 2,
            height: size * 2,
            borderRadius: size,
          },
          animatedStyle,
        ]}
      />
      <View
        style={[
          styles.pulsingDotInner,
          {
            backgroundColor: color,
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
      />
    </View>
  );
};

const AnimatedCounter: React.FC<{
  value: number;
  duration?: number;
  style?: any;
}> = ({ value, duration = 1000, style }) => {
  const animatedValue = useSharedValue(0);
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    animatedValue.value = withTiming(value, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [value]);

  useEffect(() => {
    const interval = setInterval(() => {
      const progress = animatedValue.value;
      setDisplayValue(Math.round(progress));
    }, 16);
    return () => clearInterval(interval);
  }, []);

  return <Text style={style}>{displayValue}</Text>;
};

const Card3D: React.FC<{
  children: React.ReactNode;
  onPress?: () => void;
  style?: any;
  disabled?: boolean;
}> = ({ children, onPress, style, disabled }) => {
  const scale = useSharedValue(1);
  const rotateX = useSharedValue(0);
  const rotateY = useSharedValue(0);
  const elevation = useSharedValue(1);

  const handlePressIn = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
    elevation.value = withSpring(0.5);
  };

  const handlePressOut = () => {
    if (disabled) return;
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
    elevation.value = withSpring(1);
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
    >
      <Animated.View style={[style]}>{children}</Animated.View>
    </Pressable>
  );
};

// ============================================================================
// NEW: SMART RADAR COMPONENT (Replaces StatsCard)
// ============================================================================
const SmartRadar: React.FC<{
  activeTravelers: number;
  activeRequests: number;
  t: any;
}> = ({ activeTravelers, activeRequests, t }) => {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 4000, easing: Easing.linear }),
      -1,
      false,
    );
  }, []);

  const radarStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const totalMatches = activeTravelers + activeRequests;

  return (
    <Card3D style={styles.radarContainer}>
      <LinearGradient
        colors={DESIGN.colors.darkGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.radarGradient}
      >
        <View style={styles.radarVisual}>
          <View style={styles.radarCircle1} />
          <View style={styles.radarCircle2} />
          <View style={styles.radarCircle3} />
          <Animated.View style={[styles.radarSweep, radarStyle]}>
            <LinearGradient
              colors={["rgba(16, 185, 129, 0.5)", "transparent"]}
              start={{ x: 0.5, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.radarSweepGradient}
            />
          </Animated.View>

          {activeTravelers > 0 && (
            <View style={[styles.radarBlip, { top: "30%", left: "60%" }]}>
              <PulsingDot color={DESIGN.colors.accent} size={4} />
            </View>
          )}
          {activeRequests > 0 && (
            <View style={[styles.radarBlip, { top: "70%", left: "40%" }]}>
              <PulsingDot color={DESIGN.colors.brand} size={4} />
            </View>
          )}
        </View>

        <View style={styles.radarContent}>
          <View style={styles.radarHeader}>
            <View style={styles.radarLiveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>{t("explore.network_live")}</Text>
            </View>
            <Radar size={16} color="rgba(255,255,255,0.5)" />
          </View>

          <View style={styles.radarStatsRow}>
            <View>
              <Text style={styles.radarLabel}>
                {t("explore.scanning_deals")}
              </Text>
              <View style={styles.radarBigNumberContainer}>
                <AnimatedCounter
                  value={totalMatches}
                  style={styles.radarBigNumber}
                />
                <Text style={styles.radarBigNumberLabel}>
                  {t("explore.opportunities")}
                </Text>
              </View>
            </View>

            <View style={styles.radarDetailColumn}>
              <View style={styles.radarMiniStat}>
                <Plane size={12} color={DESIGN.colors.accent} />
                <Text style={styles.radarMiniText}>
                  {t("explore.inbound_count", { count: activeTravelers })}
                </Text>
              </View>
              <View style={[styles.radarMiniStat, { marginTop: 4 }]}>
                <Box size={12} color={DESIGN.colors.brand} />
                <Text style={styles.radarMiniText}>
                  {t("explore.wanted_count", { count: activeRequests })}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>
    </Card3D>
  );
};

// ============================================================================
// NEW: BOARDING PASS COMPONENT (Compact Horizontal Design)
// ============================================================================
const BoardingPass: React.FC<{ trip: any; t: any; index: number }> = ({
  trip,
  t,
  index,
}) => {
  const router = useRouter();

  const dateObj = new Date(trip.arrivalDate);
  const day = dateObj.getDate();
  const month = dateObj
    .toLocaleString("default", { month: "short" })
    .toUpperCase();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: "/(stack)/orders",
      params: { tripId: trip._id, travelerId: trip.traveler._id },
    });
  };

  return (
    <Animated.View entering={FadeInRight.delay(index * 100).springify()}>
      <Card3D onPress={handlePress} style={styles.passContainer}>
        <View style={styles.passLeft}>
          <View style={styles.passRouteHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.passCityCode}>{trip.originCountryCode}</Text>
              <Text style={styles.passCityName} numberOfLines={1}>
                {trip.originCity}
              </Text>
            </View>

            <View style={styles.passFlightVisual}>
              <View style={styles.passFlightDot} />
              <View style={styles.passFlightLineContainer}>
                <View style={styles.passFlightLine} />
                <View style={styles.passPlaneWrapper}>
                  <Plane
                    size={14}
                    color={DESIGN.colors.brand}
                    style={{ transform: [{ rotate: "90deg" }] }}
                  />
                </View>
              </View>
              <View style={styles.passFlightDot} />
            </View>

            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <Text style={styles.passCityCode}>
                {trip.destinationCountryCode}
              </Text>
              <Text style={styles.passCityName} numberOfLines={1}>
                {trip.destinationCity}
              </Text>
            </View>
          </View>

          <View style={styles.passMetaInfo}>
            <View style={styles.passMetaItem}>
              <Calendar size={12} color={DESIGN.colors.textTertiary} />
              <Text style={styles.passMetaText}>
                {day} {month}
              </Text>
            </View>
            <View style={styles.passMetaItem}>
              <Luggage size={12} color={DESIGN.colors.textTertiary} />
              <Text style={styles.passMetaText}>{trip.availableSpace}</Text>
            </View>
          </View>
        </View>

        <View style={styles.passDividerVertical}>
          <View style={styles.passNotchTop} />
          <View style={styles.passDashedLineVertical} />
          <View style={styles.passNotchBottom} />
        </View>

        <TouchableOpacity
          style={styles.passRight}
          activeOpacity={0.8}
          onPress={handlePress}
        >
          <Image
            source={{ uri: trip.traveler.image }}
            style={styles.passAvatar}
          />
          <Text style={styles.passUsername} numberOfLines={1}>
            {trip.traveler.username}
          </Text>
          <View style={styles.passRequestPill}>
            <Text style={styles.passRequestText}>
              {t("explore.request_pill")}
            </Text>
          </View>
        </TouchableOpacity>
      </Card3D>
    </Animated.View>
  );
};

// ============================================================================
// NEW: POTENTIAL EARNINGS HEADER (Gradient)
// ============================================================================
const PotentialEarningsHeader: React.FC<{ requests: any[] }> = ({
  requests,
}) => {
  const { t } = useTranslation();
  const totalPotential = requests.reduce(
    (sum, item) => sum + (item.travelerFee || 0),
    0,
  );

  return (
    <Animated.View
      entering={FadeInDown.delay(100)}
      style={styles.earningsHeaderContainer}
    >
      <LinearGradient
        colors={DESIGN.colors.accentGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.earningsGradient}
      >
        <View style={styles.earningsContent}>
          <View style={styles.earningsIconBg}>
            <TrendingUp size={16} color={DESIGN.colors.textInverse} />
          </View>
          <Text style={styles.earningsLabel}>
            {t("explore.total_potential_earnings")}
          </Text>
          <Text style={styles.earningsValue}>${totalPotential}</Text>
        </View>
        <View style={styles.earningsDecoCircle} />
      </LinearGradient>
    </Animated.View>
  );
};

// ============================================================================
// NEW: BOUNTY TICKET COMPONENT (Slim Vertical Design)
// ============================================================================
const BountyTicket: React.FC<{
  request: any;
  t: any;
  index: number;
  onOfferPress: (request: any) => void;
}> = ({ request, t, index, onOfferPress }) => {
  const router = useRouter();

  const handlePress = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onOfferPress(request);
  };

  const formattedDate = new Date(request.requiredByDate).toLocaleDateString(
    undefined,
    { month: "short", day: "numeric" },
  );

  return (
    <Animated.View entering={FadeInDown.delay(index * 100).springify()}>
      <Card3D onPress={handlePress} style={styles.bountyRow}>
        <View style={styles.bountyImageContainer}>
          {request.imageKey ? (
            <Image
              source={{ uri: `https://ts79.space/${request.imageKey}` }}
              style={styles.bountyImage}
              contentFit="cover"
            />
          ) : (
            <View
              style={[
                styles.bountyImage,
                {
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: DESIGN.colors.border,
                },
              ]}
            >
              <Box size={24} color={DESIGN.colors.textTertiary} />
            </View>
          )}
        </View>

        <View style={styles.bountyCenter}>
          <Text style={styles.bountyTitle} numberOfLines={1}>
            {request.productName}
          </Text>
          <View style={styles.bountyRouteCompact}>
            <Text style={styles.bountyRouteText}>
              {request.originCity}{" "}
              <ArrowRight size={10} color={DESIGN.colors.textTertiary} />{" "}
              {request.destinationCity}
            </Text>
          </View>
          <View style={styles.bountyBadges}>
            <View style={styles.bountyBadge}>
              <Box size={10} color={DESIGN.colors.textSecondary} />
              <Text style={styles.bountyBadgeText}>
                {request.productWeight || "N/A"}
              </Text>
            </View>
            <View
              style={[
                styles.bountyBadge,
                { backgroundColor: DESIGN.colors.brandLight },
              ]}
            >
              <Clock size={10} color={DESIGN.colors.brand} />
              <Text
                style={[styles.bountyBadgeText, { color: DESIGN.colors.brand }]}
              >
                {formattedDate}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.bountyRight}>
          <View style={styles.bountyPriceTag}>
            <Text style={styles.bountyPriceLabel}>{t("explore.earn")}</Text>
            <Text style={styles.bountyPriceValue}>${request.travelerFee}</Text>
          </View>
          <View style={styles.bountyArrow}>
            <ChevronRight size={16} color={DESIGN.colors.textTertiary} />
          </View>
        </View>
      </Card3D>
    </Animated.View>
  );
};

// ============================================================================
// PREMIUM SECTION HEADER
// ============================================================================
const SectionHeader: React.FC<{
  title: string;
  count?: number;
  subtitle?: string;
  icon?: any;
  action?: string;
}> = ({ title, count, subtitle, icon: IconComponent, action }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionHeaderLeft}>
      {IconComponent && (
        <View style={styles.sectionIconBg}>
          <IconComponent
            size={18}
            color={DESIGN.colors.textPrimary}
            strokeWidth={2.5}
          />
        </View>
      )}
      <View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {count !== undefined && (
            <View style={styles.sectionCountBadge}>
              <Text style={styles.sectionCountText}>{count}</Text>
            </View>
          )}
        </View>
        {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
      </View>
    </View>
    {action && (
      <TouchableOpacity>
        <Text style={styles.sectionActionText}>{action}</Text>
      </TouchableOpacity>
    )}
  </View>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function ExploreScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { userId } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const [isOfferModalVisible, setOfferModalVisible] = useState(false);
  const [selectedBounty, setSelectedBounty] = useState<any>(null);
  const [proposedFee, setProposedFee] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentUser = useQuery(
    api.users.getUserByClerkId,
    userId ? { clerkId: userId } : "skip",
  );
  const recommendedRequests = useQuery(api.requests.getRecommendedRequests);
  const recommendedTrips = useQuery(api.trips.getRecommendedTrips);

  const createInitialOffer = useMutation(api.offers.createInitialOffer);

  const myMatchingTrips = useQuery(
    api.trips.getMyMatchingTrips,
    selectedBounty
      ? {
          originCity: selectedBounty.originCity,
          destinationCity: selectedBounty.destinationCity,
        }
      : "skip",
  );

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const headerAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(scrollY.value, [0, 100], [0, -20], "clamp") },
    ],
    opacity: interpolate(scrollY.value, [0, 100], [1, 0.95], "clamp"),
  }));

  const onRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  }, []);

  const handleBountyPress = (request: any) => {
    setSelectedBounty(request);
    setProposedFee(request.travelerFee.toString());
    setOfferModalVisible(true);
  };

  const handleProfilePress = () => {
    if (!selectedBounty) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOfferModalVisible(false);
    router.push(
      `/user/${selectedBounty.requester?._id || selectedBounty.userId}`,
    );
  };

  const handleSubmitOffer = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSubmitting(true);
    const fee = parseFloat(proposedFee);

    if (isNaN(fee) || fee <= 0) {
      Alert.alert(t("alerts.invalid_fee"), t("alerts.enter_valid_amount"));
      setIsSubmitting(false);
      return;
    }

    if (!myMatchingTrips || myMatchingTrips.length === 0) {
      Alert.alert(
        t("alerts.no_matching_trip"),
        t("alerts.need_trip_msg", {
          origin: selectedBounty?.originCity,
          dest: selectedBounty?.destinationCity,
        }),
      );
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await createInitialOffer({
        requestId: selectedBounty._id,
        tripId: myMatchingTrips[0]._id,
        proposedFee: fee,
      });

      if (result.success && result.negotiationId) {
        setOfferModalVisible(false);
        router.push({
          pathname: "/(stack)/offers",
          params: { id: result.negotiationId },
        });
      } else if (result.reason === "DUPLICATE_OFFER") {
        setOfferModalVisible(false);
        Toast.show({
          type: "info",
          text1: t("alerts.offer_exists"),
          text2: t("alerts.offer_exists_msg"),
        });
      }
    } catch (error) {
      Alert.alert(t("alerts.error"), t("alerts.send_offer_error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (recommendedRequests === undefined || recommendedTrips === undefined) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={DESIGN.colors.brand} />
        </View>
      </View>
    );
  }

  const hasRequests = recommendedRequests.length > 0;
  const hasTrips = recommendedTrips.length > 0;

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={DESIGN.colors.background}
      />

      <Animated.View style={[styles.header, headerAnimStyle]}>
        <View style={styles.headerTopRow}>
          <View>
            <Text style={styles.headerEyebrow}>
              {t("explore.global_network")}
            </Text>
            <Text style={styles.headerTitle}>
              {t("explore.mission_control")}
            </Text>
          </View>
        </View>
      </Animated.View>

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={DESIGN.colors.brand}
            colors={[DESIGN.colors.brand]}
          />
        }
      >
        <View style={styles.radarSection}>
          <SmartRadar
            activeTravelers={recommendedTrips.length}
            activeRequests={recommendedRequests.length}
            t={t}
          />
        </View>

        <View style={styles.sectionSpacing}>
          <SectionHeader
            title={t("explore.inbound_travelers_title")}
            subtitle={t("explore.inbound_travelers_subtitle")}
            count={recommendedTrips.length}
            icon={Plane}
          />

          {hasTrips ? (
            <View style={{ height: 160, width: "100%" }}>
              <FlatList
                horizontal
                data={recommendedTrips}
                keyExtractor={(item) => item._id}
                renderItem={({ item, index }) => (
                  <BoardingPass trip={item} t={t} index={index} />
                )}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
                extraData={refreshing}
                decelerationRate="fast"
                snapToInterval={290 + DESIGN.spacing.md}
                snapToAlignment="start"
              />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {t("explore.empty_travelers")}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.sectionSpacing}>
          <SectionHeader
            title={t("explore.available_bounties")}
            subtitle={t("explore.bounties_subtitle")}
            count={recommendedRequests.length}
            icon={Zap}
          />

          {hasRequests ? (
            <View style={styles.jobsContainer}>
              <PotentialEarningsHeader requests={recommendedRequests} />

              <View style={styles.jobsList}>
                {recommendedRequests.map((request, index) => (
                  <BountyTicket
                    key={request._id}
                    request={request}
                    t={t}
                    index={index}
                    onOfferPress={handleBountyPress}
                  />
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {t("explore.empty_bounties")}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </Animated.ScrollView>

      {selectedBounty && (
        <Modal
          animationType="slide"
          transparent
          visible={isOfferModalVisible}
          onRequestClose={() => setOfferModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalOverlay}
          >
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setOfferModalVisible(false)}
            />

            <Animated.View
              entering={FadeInDown.springify().damping(15)}
              style={styles.offerModalContent}
            >
              <Pressable
                onPress={(e) => e.stopPropagation()}
                style={{ width: "100%" }}
              >
                <View style={styles.offerModalHeader}>
                  <View style={styles.offerModalHandle} />
                  <TouchableOpacity
                    onPress={() => setOfferModalVisible(false)}
                    style={styles.closeModalBtn}
                  >
                    <X size={20} color={DESIGN.colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={handleProfilePress}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalTitle}>
                    {t("request_component.labels.propose_fee")}
                  </Text>

                  <Text style={styles.modalSubtitle}>
                    {selectedBounty.productName} ({selectedBounty.originCity} to{" "}
                    {selectedBounty.destinationCity})
                  </Text>
                </TouchableOpacity>

                <View style={styles.offerInputContainer}>
                  <Text style={styles.offerCurrency}>$</Text>
                  <TextInput
                    style={styles.offerInput}
                    placeholder={selectedBounty.travelerFee.toFixed(2)}
                    placeholderTextColor={DESIGN.colors.textTertiary}
                    keyboardType="numeric"
                    value={proposedFee}
                    onChangeText={setProposedFee}
                    autoFocus
                    selectionColor={DESIGN.colors.brand}
                  />
                </View>

                <Text style={styles.offerHint}>
                  {t("request_component.suggested_fee")}: $
                  {selectedBounty.travelerFee.toFixed(2)}
                </Text>

                <TouchableOpacity
                  style={[
                    styles.offerSubmitButton,
                    isSubmitting && styles.buttonDisabled,
                  ]}
                  onPress={handleSubmitOffer}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={DESIGN.colors.textInverse} />
                  ) : (
                    <Text style={styles.offerSubmitText}>
                      {t("request_component.labels.send_offer")}
                    </Text>
                  )}
                </TouchableOpacity>
              </Pressable>
            </Animated.View>
          </KeyboardAvoidingView>
        </Modal>
      )}
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DESIGN.colors.background,
  },
  scrollContent: {
    paddingBottom: 120,
    paddingTop: DESIGN.spacing.md,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    paddingTop:
      Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 8 : 48,
    paddingHorizontal: DESIGN.spacing.lg,
    paddingBottom: DESIGN.spacing.sm,
    backgroundColor: DESIGN.colors.background,
    zIndex: 10,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 0,
  },
  headerEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    color: DESIGN.colors.brand,
    letterSpacing: 1.2,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: DESIGN.colors.textPrimary,
    letterSpacing: -1,
  },
  profileBtn: {
    ...DESIGN.shadow.sm,
  },
  profilePlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  radarSection: {
    paddingHorizontal: DESIGN.spacing.lg,
    marginBottom: DESIGN.spacing.lg,
  },
  radarContainer: {
    height: 180,
    borderRadius: DESIGN.radius.xl,
    overflow: "hidden",
    ...DESIGN.shadow.md,
  },
  radarGradient: {
    flex: 1,
    position: "relative",
  },
  radarVisual: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.3,
  },
  radarCircle1: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    position: "absolute",
  },
  radarCircle2: {
    width: 300,
    height: 300,
    borderRadius: 150,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    position: "absolute",
  },
  radarCircle3: {
    width: 400,
    height: 400,
    borderRadius: 200,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    position: "absolute",
  },
  radarSweep: {
    width: 400,
    height: 400,
    position: "absolute",
    borderRadius: 200,
    overflow: "hidden",
  },
  radarSweepGradient: {
    width: "50%",
    height: "50%",
    borderTopRightRadius: 200,
  },
  radarBlip: {
    position: "absolute",
  },
  radarContent: {
    flex: 1,
    padding: DESIGN.spacing.lg,
    justifyContent: "space-between",
  },
  radarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  radarLiveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(34, 197, 94, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: DESIGN.colors.live,
  },
  liveText: {
    fontSize: 10,
    fontWeight: "700",
    color: DESIGN.colors.live,
    letterSpacing: 0.5,
  },
  radarStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  radarLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  radarBigNumberContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  radarBigNumber: {
    fontSize: 42,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: -2,
    lineHeight: 48,
  },
  radarBigNumberLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(255,255,255,0.6)",
  },
  radarDetailColumn: {
    alignItems: "flex-end",
    gap: 4,
  },
  radarMiniStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  radarMiniText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFF",
  },
  passContainer: {
    width: 290,
    height: 120,
    backgroundColor: DESIGN.colors.surface,
    borderRadius: DESIGN.radius.md,
    marginRight: DESIGN.spacing.md,
    ...DESIGN.shadow.ticket,
    flexDirection: "row",
    overflow: "hidden",
  },
  passLeft: {
    flex: 1,
    padding: 12,
    justifyContent: "space-between",
  },
  passRouteHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  passCityCode: {
    fontSize: 18,
    fontWeight: "800",
    color: DESIGN.colors.textPrimary,
  },
  passCityName: {
    fontSize: 10,
    color: DESIGN.colors.textSecondary,
    maxWidth: 60,
  },
  passFlightVisual: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  passFlightDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: DESIGN.colors.brand,
  },
  passFlightLineContainer: {
    flex: 1,
    height: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  passFlightLine: {
    position: "absolute",
    height: 1,
    width: "100%",
    backgroundColor: DESIGN.colors.borderDark,
    top: 6,
  },
  passPlaneWrapper: {
    backgroundColor: DESIGN.colors.surface,
    paddingHorizontal: 4,
  },
  passMetaInfo: {
    flexDirection: "row",
    gap: 8,
  },
  passMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: DESIGN.colors.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  passMetaText: {
    fontSize: 10,
    fontWeight: "600",
    color: DESIGN.colors.textSecondary,
  },
  passDividerVertical: {
    width: 20,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DESIGN.colors.surface,
    position: "relative",
    zIndex: 1,
  },
  passDashedLineVertical: {
    height: "80%",
    width: 1,
    borderWidth: 1,
    borderColor: DESIGN.colors.border,
    borderStyle: "dashed",
  },
  passNotchTop: {
    position: "absolute",
    top: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: DESIGN.colors.background,
  },
  passNotchBottom: {
    position: "absolute",
    bottom: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: DESIGN.colors.background,
  },
  passRight: {
    width: 80,
    backgroundColor: DESIGN.colors.backgroundTertiary,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 8,
    borderLeftWidth: 1,
    borderLeftColor: "transparent",
  },
  passAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFF",
  },
  passUsername: {
    fontSize: 10,
    color: DESIGN.colors.textSecondary,
    textAlign: "center",
    width: "100%",
  },
  passRequestPill: {
    backgroundColor: DESIGN.colors.brand,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 100,
    width: "100%",
    alignItems: "center",
  },
  passRequestText: {
    color: "#FFF",
    fontSize: 9,
    fontWeight: "700",
  },
  jobsContainer: {
    paddingHorizontal: DESIGN.spacing.lg,
  },
  earningsHeaderContainer: {
    marginBottom: DESIGN.spacing.md,
    borderRadius: DESIGN.radius.md,
    overflow: "hidden",
    ...DESIGN.shadow.md,
  },
  earningsGradient: {
    padding: DESIGN.spacing.md,
    position: "relative",
  },
  earningsContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  earningsIconBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  earningsLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFF",
    flex: 1,
    opacity: 0.9,
  },
  earningsValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFF",
  },
  earningsDecoCircle: {
    position: "absolute",
    right: -20,
    top: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  jobsList: {
    gap: DESIGN.spacing.md,
    paddingBottom: DESIGN.spacing.md,
  },
  bountyRow: {
    flexDirection: "row",
    height: 84,
    backgroundColor: DESIGN.colors.surface,
    borderRadius: DESIGN.radius.md,
    ...DESIGN.shadow.ticket,
    padding: 8,
    alignItems: "center",
  },
  bountyImageContainer: {
    width: 68,
    height: 68,
    borderRadius: DESIGN.radius.sm,
    overflow: "hidden",
    backgroundColor: DESIGN.colors.backgroundTertiary,
  },
  bountyImage: {
    width: "100%",
    height: "100%",
  },
  bountyCenter: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "center",
    gap: 6,
  },
  bountyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: DESIGN.colors.textPrimary,
  },
  bountyRouteCompact: {
    flexDirection: "row",
    alignItems: "center",
  },
  bountyRouteText: {
    fontSize: 12,
    color: DESIGN.colors.textSecondary,
    fontWeight: "500",
  },
  bountyBadges: {
    flexDirection: "row",
    gap: 6,
  },
  bountyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: DESIGN.colors.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bountyBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: DESIGN.colors.textSecondary,
  },
  bountyRight: {
    alignItems: "flex-end",
    justifyContent: "center",
    paddingLeft: 8,
    borderLeftWidth: 1,
    borderLeftColor: DESIGN.colors.divider,
    height: "80%",
    minWidth: 70,
  },
  bountyPriceTag: {
    alignItems: "flex-end",
  },
  bountyPriceLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: DESIGN.colors.textTertiary,
  },
  bountyPriceValue: {
    fontSize: 16,
    fontWeight: "800",
    color: DESIGN.colors.success,
  },
  bountyArrow: {
    marginTop: 4,
  },
  sectionSpacing: {
    marginTop: DESIGN.spacing.lg,
  },
  sectionHeader: {
    paddingHorizontal: DESIGN.spacing.lg,
    marginBottom: DESIGN.spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: DESIGN.colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: DESIGN.colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: DESIGN.colors.textSecondary,
    marginTop: 2,
  },
  sectionCountBadge: {
    backgroundColor: DESIGN.colors.background,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  sectionCountText: {
    fontSize: 10,
    fontWeight: "700",
    color: DESIGN.colors.textPrimary,
  },
  sectionActionText: {
    fontSize: 12,
    fontWeight: "700",
    color: DESIGN.colors.brand,
  },
  horizontalList: {
    paddingHorizontal: DESIGN.spacing.lg,
    paddingVertical: 10,
  },
  emptyContainer: {
    padding: DESIGN.spacing.xl,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: DESIGN.colors.textTertiary,
  },
  bottomSpacer: {
    height: 100,
  },
  shimmerGradient: {
    width: 200,
    height: "100%",
  },
  skeletonCard: {
    width: SCREEN_WIDTH * 0.7,
    backgroundColor: DESIGN.colors.surface,
    borderRadius: DESIGN.radius.lg,
    padding: DESIGN.spacing.md,
    borderWidth: 1,
    borderColor: DESIGN.colors.border,
  },
  skeletonHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: DESIGN.spacing.md,
  },
  skeletonHeaderText: {
    flex: 1,
    marginLeft: DESIGN.spacing.sm,
  },
  skeletonRoute: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pulsingDotContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 16,
    height: 16,
  },
  pulsingDotOuter: {
    position: "absolute",
  },
  pulsingDotInner: {
    position: "absolute",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: DESIGN.colors.modalOverlay,
    justifyContent: "flex-end",
  },
  offerModalContent: {
    backgroundColor: DESIGN.colors.surface,
    borderTopLeftRadius: DESIGN.radius.xl,
    borderTopRightRadius: DESIGN.radius.xl,
    padding: DESIGN.spacing.lg,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    ...DESIGN.shadow.lg,
  },
  offerModalHeader: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: DESIGN.spacing.md,
    position: "relative",
  },
  offerModalHandle: {
    width: 40,
    height: 4,
    backgroundColor: DESIGN.colors.borderDark,
    borderRadius: 2,
    alignSelf: "center",
  },
  closeModalBtn: {
    position: "absolute",
    right: 0,
    top: -10,
    padding: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: DESIGN.colors.textPrimary,
    textAlign: "center",
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 12,
    color: DESIGN.colors.textSecondary,
    textAlign: "center",
    marginBottom: DESIGN.spacing.lg,
  },
  offerInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DESIGN.colors.background,
    borderRadius: DESIGN.radius.lg,
    padding: DESIGN.spacing.md,
    marginBottom: DESIGN.spacing.md,
  },
  offerCurrency: {
    fontSize: 32,
    fontWeight: "700",
    color: DESIGN.colors.textPrimary,
    marginRight: 4,
  },
  offerInput: {
    fontSize: 42,
    fontWeight: "800",
    color: DESIGN.colors.textPrimary,
    minWidth: 100,
    textAlign: "center",
  },
  offerHint: {
    fontSize: 13,
    color: DESIGN.colors.textSecondary,
    textAlign: "center",
    marginBottom: DESIGN.spacing.xl,
  },
  offerSubmitButton: {
    backgroundColor: DESIGN.colors.brand,
    paddingVertical: DESIGN.spacing.md,
    borderRadius: DESIGN.radius.full,
    alignItems: "center",
    ...DESIGN.shadow.colored(DESIGN.colors.brand),
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  offerSubmitText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
  },
});
