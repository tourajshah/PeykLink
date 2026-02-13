// app/(stack)/offers.tsx
//
// REDESIGN: Premium Airbnb-level offer detail screen with:
// - Phase-driven UI (screen transforms based on negotiation.status)
// - Animated step tracker (Uber Eats style progress indicator)
// - Animated shimmer skeleton loading (LinearGradient sweep)
// - REMOVED: 3D card interactions (Replaced with Micro-scale tactile feel)
// - Pulsing live indicators for active states
// - Animated route visualizations with country flags
// - Glassmorphism-lite card effects with subtle glass borders
// - Premium delivery code section with animated digit reveal
// - BlurView glassmorphism for modals (iOS) with spring entrance
// - Modern gradient accents (brand pink #FF385C)
// - Scroll-driven header shadow animation
// - REFINED: Staggered FadeInDown entry (Sleek Glide instead of Spring)
// - Micro-interactions everywhere (haptics, spring presses)
//
// Architecture: Phase-driven rendering — the UI completely transforms based on
// negotiation.status (pending → accepted → paid → completed | rejected/cancelled).
// Each phase shows/hides relevant sections and adapts the footer accordingly.

import { useAuth } from "@clerk/clerk-expo";
import {
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
// REDESIGN: Added BlurView for modal glassmorphism (iOS)
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
// REDESIGN: Added useEffect for animation setup in sub-components
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  // REDESIGN: Added Dimensions for shimmer width calculation
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import CountryFlag from "react-native-country-flag";
// REDESIGN: react-native-reanimated — powers ALL animations (shimmer, 3D cards,
// spring physics, staggered entry, scroll-driven header, step tracker, route viz)
import Animated, {
  Extrapolation,
  FadeIn,
  FadeInDown,
  FadeInUp,
  interpolate,
  Easing as REasing,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { MessageInput } from "@/components/Message";
import { cityData } from "@/constants/cityData";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

// === TRANSLATION IMPORT ===
import { useTranslation } from "react-i18next";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ============================================================================
// REDESIGN: PREMIUM DESIGN SYSTEM — Brand Pink (#FF385C)
// ============================================================================
// Replaces old multi-palette approach (PALETTE, COLORS, REQUEST_PALETTE) with
// a unified design system matching index.tsx, inbox.tsx, and Offer.tsx.
//
// OLD PALETTE (commented out per Rule 1 — DO NOT REMOVE):
// const PALETTE = {
//   backgroundGradient: ["#F7F8FA", "#FFFFFF"] as const,
//   surface: "#FFFFFF",
//   shadow: "rgba(100, 100, 111, 0.25)",
//   primary: "#3B82F6",
//   secondary: "#10B981",
//   textPrimary: "#1F2937",
//   textSecondary: "#6B7280",
//   historyIcon: "#ed7c04ff",
//   primaryGradient: ["#38BDF8", "#3B82F6"] as const,
//   border: "#D1D5DB",
//   ratingStar: "#FBBF24",
//   destructive: "#EF4444",
//   success: "#10B981",
//   warning: "#F59E0B",
// };
//
// OLD REQUEST_PALETTE (commented out per Rule 1 — DO NOT REMOVE):
// const REQUEST_PALETTE = {
//   primaryGradient: ["#34D399", "#10B981"] as const,
//   primary: "#10B981",
//   reward: "#10B981",
// };
//
// OLD COLORS (commented out per Rule 1 — DO NOT REMOVE):
// const COLORS = {
//   primary: "#007AFF",
//   background: "#F0F2F5",
//   surface: "#FFFFFF",
//   text: "#1C1C1E",
//   textSecondary: "#6D6D72",
//   separator: "#E5E5EA",
//   disabled: "#D1D1D6",
//   green: "#34C759",
//   red: "#FF3B30",
//   orange: "#FF9500",
//   myBubble: "#007AFF",
//   theirBubble: "#E5E5EA",
//   placeholder: "#C7C7CC",
//   white: "#FFFFFF",
//   error: "#FF3B30",
// };

const DESIGN = {
  colors: {
    // Backgrounds
    background: "#FFFFFF",
    backgroundSecondary: "#F7F7F7",
    backgroundTertiary: "#F0F0F0",
    surface: "#FFFFFF",

    // Text
    textPrimary: "#222222",
    textSecondary: "#717171",
    textTertiary: "#B0B0B0",
    textInverse: "#FFFFFF",

    // Brand
    brand: "#FF385C",
    brandLight: "rgba(255, 56, 92, 0.1)",
    brandGradient: ["#FF385C", "#E31C5F"] as const,

    // Accent (Teal)
    accent: "#00A699",
    accentLight: "rgba(0, 166, 153, 0.1)",
    accentGradient: ["#00A699", "#008489"] as const,

    // Status
    success: "#10B981",
    successLight: "#ECFDF5",
    successGradient: ["#10B981", "#059669"] as const,
    completedGradient: ["#059669", "#047857"] as const,

    warning: "#F59E0B",
    warningLight: "#FEF3C7",
    warningGradient: ["#F59E0B", "#F97316"] as const,

    danger: "#EF4444",
    dangerLight: "#FEF2F2",
    dangerGradient: ["#EF4444", "#DC2626"] as const,

    // Surfaces
    border: "#EBEBEB",
    divider: "#F0F0F0",
    shimmer: "#EEEEEE",
    shimmerHighlight: "rgba(255,255,255,0.4)",
    glassBorder: "rgba(0,0,0,0.04)",
    disabled: "#D1D1D6",
    placeholder: "#C7C7CC",

    // Chat Bubbles
    myBubble: "#FF385C",
    theirBubble: "#F0F0F0",
    closedGradient: ["#6B7280", "#4B5563"] as const,
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    pill: 9999,
  },
  shadow: {
    sm: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    md: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 4,
    },
    lg: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 6,
    },
  },
};

// Shared spring physics config — slightly underdamped for Airbnb "alive" feel
const SPRING_CONFIG = { damping: 15, stiffness: 400 };

// Status hub gradient colors mapped by theme
const STATUS_GRADIENTS: Record<string, readonly [string, string]> = {
  action: DESIGN.colors.brandGradient,
  pending: DESIGN.colors.warningGradient,
  success: DESIGN.colors.successGradient,
  completed: DESIGN.colors.completedGradient,
  rejected: DESIGN.colors.closedGradient,
  info: DESIGN.colors.closedGradient,
};

// Helper to find country code
const getCountryCode = (cityName: string) => {
  const city = cityData.find((c) => c.name === cityName);
  return city ? city.countryCode : "US";
};

// ============================================================================
// STEP TRACKER: Status → Step Index Mapping
// ============================================================================
const STEP_ICONS = [
  { outline: "chatbubble-ellipses-outline", filled: "chatbubble-ellipses" },
  { outline: "checkmark-circle-outline", filled: "checkmark-circle" },
  { outline: "card-outline", filled: "card" },
  { outline: "gift-outline", filled: "gift" },
] as const;

const getStepIndex = (status: string): number => {
  switch (status) {
    case "pending":
      return 0;
    case "accepted":
      return 1;
    case "paid":
      return 2;
    case "completed":
      return 3;
    case "rejected":
    case "cancelled":
      return -1;
    default:
      return 0;
  }
};

// ============================================================================
// SUB-COMPONENT: SHIMMER EFFECT (Premium Loading Primitive)
// ============================================================================
// Matches ShimmerEffect pattern from index.tsx — LinearGradient sweep animation.
// Used by OfferDetailSkeleton for premium loading state.
const ShimmerEffect = ({
  width,
  height,
  borderRadius = DESIGN.radius.sm,
  style,
}: {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: any;
}) => {
  const shimmerTranslate = useSharedValue(-1);

  useEffect(() => {
    shimmerTranslate.value = withRepeat(
      withTiming(1, { duration: 1500, easing: REasing.ease }),
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
          width: width as any,
          height,
          borderRadius,
          backgroundColor: DESIGN.colors.shimmer,
          overflow: "hidden",
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          {
            position: "absolute",
            top: 0,
            bottom: 0,
            width: SCREEN_WIDTH * 0.5,
          },
          animatedStyle,
        ]}
      >
        <LinearGradient
          colors={[
            "transparent",
            DESIGN.colors.shimmerHighlight,
            "transparent",
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1 }}
        />
      </Animated.View>
    </View>
  );
};

// ============================================================================
// SUB-COMPONENT: OFFER DETAIL SKELETON (Premium Loading State)
// ============================================================================
// Replaces the old basic ActivityIndicator with a full-screen skeleton
// matching the screen layout — step tracker + status hub + cards + bubbles.
const OfferDetailSkeleton = () => (
  <View style={styles.container}>
    {/* Header skeleton */}
    <View style={styles.header}>
      <ShimmerEffect width={26} height={26} borderRadius={13} />
      <ShimmerEffect width={140} height={18} borderRadius={6} />
      <View style={{ width: 26 }} />
    </View>
    <View style={{ padding: 16 }}>
      {/* Step tracker skeleton */}
      <Animated.View entering={FadeIn.delay(0).duration(400)}>
        <ShimmerEffect
          width="100%"
          height={68}
          borderRadius={DESIGN.radius.lg}
          style={{ marginBottom: 16 }}
        />
      </Animated.View>

      {/* Status hub skeleton */}
      <Animated.View entering={FadeIn.delay(100).duration(400)}>
        <ShimmerEffect
          width="100%"
          height={80}
          borderRadius={DESIGN.radius.xl}
          style={{ marginBottom: 20 }}
        />
      </Animated.View>

      {/* Offer bubble skeletons */}
      <Animated.View entering={FadeIn.delay(200).duration(400)}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "flex-start",
            marginBottom: 12,
          }}
        >
          <ShimmerEffect width={30} height={30} borderRadius={15} />
          <ShimmerEffect
            width={100}
            height={44}
            borderRadius={18}
            style={{ marginLeft: 8 }}
          />
        </View>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "flex-end",
            marginBottom: 12,
          }}
        >
          <ShimmerEffect
            width={100}
            height={44}
            borderRadius={18}
            style={{ marginRight: 8 }}
          />
          <ShimmerEffect width={30} height={30} borderRadius={15} />
        </View>
      </Animated.View>

      {/* Trip card skeleton */}
      <Animated.View entering={FadeIn.delay(300).duration(400)}>
        <ShimmerEffect
          width="100%"
          height={180}
          borderRadius={DESIGN.radius.xl}
          style={{ marginBottom: 16 }}
        />
      </Animated.View>

      {/* Request card skeleton */}
      <Animated.View entering={FadeIn.delay(400).duration(400)}>
        <ShimmerEffect
          width="100%"
          height={200}
          borderRadius={DESIGN.radius.xl}
        />
      </Animated.View>
    </View>
  </View>
);

// ============================================================================
// SUB-COMPONENT: PULSING DOT (Live Indicator)
// ============================================================================
// Renders a pulsing dot for active states. Reuses pattern from Offer.tsx.
// Mimics the "live broadcast" indicator used by Instagram, YouTube, etc.
const PulsingDot = ({ color, size = 10 }: { color: string; size?: number }) => {
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.8, { duration: 900, easing: REasing.inOut(REasing.ease) }),
        withTiming(1, { duration: 900, easing: REasing.inOut(REasing.ease) }),
      ),
      -1, // infinite loop
      false,
    );
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: interpolate(pulseScale.value, [1, 1.8], [0.6, 0]),
  }));

  return (
    <View
      style={{
        width: size,
        height: size,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Outer pulsing ring — expands and fades */}
      <Animated.View
        style={[
          {
            position: "absolute",
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
          },
          ringStyle,
        ]}
      />
      {/* Inner static dot — always visible */}
      <View
        style={{
          width: size / 2,
          height: size / 2,
          borderRadius: size / 4,
          backgroundColor: color,
        }}
      />
    </View>
  );
};

// ============================================================================
// SUB-COMPONENT: ANIMATED ROUTE VISUALIZATION
// ============================================================================
// Premium route graphic with pulsing origin dot, animated airplane opacity,
// and country flag support. Reuses pattern from Offer.tsx.
const AnimatedRoute = ({
  originCity,
  destinationCity,
  originCode,
  destCode,
  originLabel,
  destLabel,
}: {
  originCity: string;
  destinationCity: string;
  originCode: string;
  destCode: string;
  originLabel: string;
  destLabel: string;
}) => {
  // Pulsing animation for origin dot (breathing effect)
  const dotPulse = useSharedValue(0.5);
  // Airplane opacity animation (fades in/out to simulate movement)
  const planeOpacity = useSharedValue(0);

  useEffect(() => {
    // Origin dot breathes gently — draws eye to departure
    dotPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: REasing.inOut(REasing.ease) }),
        withTiming(0.5, {
          duration: 1400,
          easing: REasing.inOut(REasing.ease),
        }),
      ),
      -1,
      false,
    );
    // Airplane fades in/out — simulates flight motion
    planeOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: REasing.out(REasing.ease) }),
        withTiming(0.3, { duration: 1500, easing: REasing.in(REasing.ease) }),
      ),
      -1,
      false,
    );
  }, []);

  const dotAnimStyle = useAnimatedStyle(() => ({
    opacity: dotPulse.value,
    transform: [{ scale: interpolate(dotPulse.value, [0.5, 1], [1, 1.4]) }],
  }));

  const planeAnimStyle = useAnimatedStyle(() => ({
    opacity: planeOpacity.value,
  }));

  return (
    <View style={routeStyles.container}>
      {/* Origin side */}
      <View style={routeStyles.endpoint}>
        <CountryFlag isoCode={originCode} size={18} />
        <Text style={routeStyles.cityText}>{originCity}</Text>
        <Text style={routeStyles.label}>{originLabel}</Text>
      </View>

      {/* Animated Route Graphic — center */}
      <View style={routeStyles.graphic}>
        {/* Origin dot (pulsing) */}
        <Animated.View
          style={[
            routeStyles.dot,
            { backgroundColor: DESIGN.colors.brand },
            dotAnimStyle,
          ]}
        />
        {/* Route line */}
        <View style={routeStyles.line} />
        {/* Airplane icon (animated opacity) */}
        <Animated.View style={[{ marginHorizontal: 6 }, planeAnimStyle]}>
          <Ionicons name="airplane" size={16} color={DESIGN.colors.brand} />
        </Animated.View>
        {/* Route line */}
        <View style={routeStyles.line} />
        {/* Destination dot (static, teal for gradient pairing) */}
        <View
          style={[routeStyles.dot, { backgroundColor: DESIGN.colors.accent }]}
        />
      </View>

      {/* Destination side */}
      <View style={[routeStyles.endpoint, { alignItems: "flex-end" }]}>
        <CountryFlag isoCode={destCode} size={18} />
        <Text style={routeStyles.cityText}>{destinationCity}</Text>
        <Text style={routeStyles.label}>{destLabel}</Text>
      </View>
    </View>
  );
};

// ============================================================================
// SUB-COMPONENT: CARD (Revised Press Physics)
// ============================================================================
// REDESIGN: Removed 3D rotation. Now uses "Micro-Scale" tactile feedback (Apple style).
// Subtle scale to 0.98 on press.
const Card3D = ({
  children,
  onPress,
  style,
  disabled,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: any;
  disabled?: boolean;
}) => {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // REDESIGN: Subtle scale instead of deep press + rotation
    scale.value = withTiming(0.98, { duration: 150 });
  };

  const handlePressOut = () => {
    if (disabled) return;
    scale.value = withTiming(1, { duration: 150 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
    >
      <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>
    </Pressable>
  );
};

// ============================================================================
// SUB-COMPONENT: STEP TRACKER (Animated Progress Indicator)
// ============================================================================
// Uber Eats-style horizontal step tracker with 4 steps:
// Offer → Agreed → Paid → Done
// Features: pulsing active indicator, green completed checkmarks,
// colored connecting lines, greyed failed state.
const StepTracker = ({ status }: { status: string }) => {
  const { t } = useTranslation();

  // 2. Define the labels here so 't' is available!
  const STEP_LABELS = [
    t("offer.steps.offer"),
    t("offer.steps.agreed"),
    t("offer.steps.paid"),
    t("offer.steps.done"),
  ];
  const currentStep = getStepIndex(status);
  const isFailed = currentStep === -1;

  // REDESIGN: Changed FadeInDown.springify() to standard Cubic easing for "Sleek Slide"
  return (
    <Animated.View
      entering={FadeInDown.delay(100)
        .duration(500)
        .easing(REasing.out(REasing.cubic))}
      style={stepStyles.container}
    >
      <View style={stepStyles.stepsRow}>
        {STEP_ICONS.map((step, index) => {
          const isCompleted = !isFailed && index < currentStep;
          const isActive = !isFailed && index === currentStep;

          return (
            <React.Fragment key={index}>
              {/* Step circle + label */}
              <View style={stepStyles.stepItem}>
                <View
                  style={[
                    stepStyles.circle,
                    isCompleted && stepStyles.circleCompleted,
                    isActive && stepStyles.circleActive,
                    isFailed && index === 0 && stepStyles.circleFailed,
                  ]}
                >
                  {isCompleted ? (
                    <Ionicons
                      name="checkmark"
                      size={13}
                      color={DESIGN.colors.textInverse}
                    />
                  ) : isActive ? (
                    <Ionicons
                      name={step.filled as any}
                      size={13}
                      color={DESIGN.colors.textInverse}
                    />
                  ) : isFailed && index === 0 ? (
                    <Ionicons
                      name="close"
                      size={13}
                      color={DESIGN.colors.textInverse}
                    />
                  ) : (
                    <Ionicons
                      name={step.outline as any}
                      size={13}
                      color={DESIGN.colors.textTertiary}
                    />
                  )}
                </View>
                {/* Pulsing indicator on active step */}
                {isActive && (
                  <View style={stepStyles.pulseOverlay}>
                    <PulsingDot color={DESIGN.colors.brand} size={8} />
                  </View>
                )}
                <Text
                  style={[
                    stepStyles.label,
                    isCompleted && { color: DESIGN.colors.success },
                    isActive && { color: DESIGN.colors.brand },
                    isFailed && index === 0 && { color: DESIGN.colors.danger },
                  ]}
                >
                  {STEP_LABELS[index]}
                </Text>
              </View>

              {/* Connecting line (not after last step) */}
              {index < STEP_ICONS.length - 1 && (
                <View
                  style={[
                    stepStyles.line,
                    isCompleted && !isFailed && stepStyles.lineCompleted,
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>
    </Animated.View>
  );
};

// ============================================================================
// SUB-COMPONENT: DELIVERY CODE SECTION (Premium Animated Reveal)
// ============================================================================
// Features: individual digit boxes with staggered FadeInDown on reveal,
// eye toggle with haptic feedback, gradient warning banner.
const DeliveryCodeSection = ({
  code,
  isVisible,
  onToggle,
  title,
  warning,
}: {
  code: string;
  isVisible: boolean;
  onToggle: () => void;
  title: string;
  warning: string;
}) => {
  const digits = code ? code.split("") : [];

  // REDESIGN: Sleek slide entry
  return (
    <Animated.View
      entering={FadeInDown.delay(200)
        .duration(500)
        .easing(REasing.out(REasing.cubic))}
      style={codeStyles.container}
    >
      <Text style={codeStyles.title}>{title}</Text>

      <View style={codeStyles.digitRow}>
        {(isVisible ? digits : Array(6).fill("•")).map((char, index) => (
          <Animated.View
            // Key change forces re-mount, triggering entering animation on toggle
            key={`${isVisible ? "v" : "h"}-${index}`}
            entering={FadeInDown.delay(index * 50)
              .duration(300)
              .easing(REasing.out(REasing.cubic))}
            style={codeStyles.digitBox}
          >
            <Text style={codeStyles.digitText}>{char}</Text>
          </Animated.View>
        ))}

        <TouchableOpacity
          onPress={() => {
            Haptics.selectionAsync();
            onToggle();
          }}
          style={codeStyles.eyeButton}
        >
          <Ionicons
            name={isVisible ? "eye-off-outline" : "eye-outline"}
            size={24}
            color={DESIGN.colors.brand}
          />
        </TouchableOpacity>
      </View>

      {/* Gradient warning banner */}
      <LinearGradient
        colors={[DESIGN.colors.warningLight, "#FFFBEB"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={codeStyles.warningBanner}
      >
        <Ionicons name="shield-checkmark-outline" size={22} color="#D97706" />
        <Text style={codeStyles.warningText}>{warning}</Text>
      </LinearGradient>
    </Animated.View>
  );
};

// ============================================================================
// SUB-COMPONENT: ANIMATED FOOTER BUTTON (Spring Press Feedback)
// ============================================================================
// Wraps action buttons with spring-physics press feedback.
// Replaces plain TouchableOpacity with Pressable + reanimated spring.
const AnimatedButton = ({
  children,
  onPress,
  style,
  disabled,
}: {
  children: React.ReactNode;
  onPress: () => void;
  style?: any;
  disabled?: boolean;
}) => {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    if (disabled) return;
    // REDESIGN: Changed from 0.93 to 0.96 for a more subtle, high-end feel
    scale.value = withSpring(0.96, SPRING_CONFIG);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, SPRING_CONFIG);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // FIX: Extract flex-related layout props for the outer Pressable so it
  // participates correctly in flex row layouts (e.g. footer buttons).
  // Without this, the Pressable collapses to zero width and buttons are invisible.
  const flatStyle = StyleSheet.flatten(style) || {};
  const {
    flex,
    flexGrow,
    flexShrink,
    flexBasis,
    width,
    minWidth,
    maxWidth,
    alignSelf,
    margin,
    marginLeft,
    marginRight,
    marginHorizontal,
    ...innerStyle
  } = flatStyle;
  const outerStyle: any = {};
  if (flex !== undefined) outerStyle.flex = flex;
  if (flexGrow !== undefined) outerStyle.flexGrow = flexGrow;
  if (flexShrink !== undefined) outerStyle.flexShrink = flexShrink;
  if (flexBasis !== undefined) outerStyle.flexBasis = flexBasis;
  if (width !== undefined) outerStyle.width = width;
  if (minWidth !== undefined) outerStyle.minWidth = minWidth;
  if (maxWidth !== undefined) outerStyle.maxWidth = maxWidth;
  if (alignSelf !== undefined) outerStyle.alignSelf = alignSelf;
  if (margin !== undefined) outerStyle.margin = margin;
  if (marginLeft !== undefined) outerStyle.marginLeft = marginLeft;
  if (marginRight !== undefined) outerStyle.marginRight = marginRight;
  if (marginHorizontal !== undefined)
    outerStyle.marginHorizontal = marginHorizontal;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={outerStyle}
    >
      <Animated.View style={[innerStyle, animatedStyle]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

// ============================================================================
// MAIN COMPONENT: OFFER DETAIL SCREEN
// ============================================================================
export default function OfferDetailScreen() {
  const router = useRouter();
  const { userId } = useAuth();
  // Initialize Translation
  const { t, i18n } = useTranslation();

  const params = useLocalSearchParams();
  const negotiationId = params.id as Id<"negotiations">;

  // --- State ---
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [negotiateModalVisible, setNegotiateModalVisible] = useState(false);
  const [newFee, setNewFee] = useState("");
  const [isCodeVisible, setIsCodeVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isImageViewVisible, setImageViewVisible] = useState(false);

  // --- Queries ---
  const threadData = useQuery(api.offers.getOfferThreadDetails, {
    negotiationId,
  });
  const currentUser = useQuery(
    api.users.getUserByClerkId,
    userId ? { clerkId: userId } : "skip",
  );
  const orderWithCode = useQuery(
    api.orders.getOrderByNegotiation,
    threadData?.negotiation.status === "paid"
      ? { negotiationId: threadData.negotiation._id }
      : "skip",
  );

  // --- Mutations ---
  const acceptOffer = useMutation(api.offers.acceptOffer);
  const rejectOffer = useMutation(api.offers.rejectOffer);
  const cancelOffer = useMutation(api.offers.cancelOffer);
  const createCounterOffer = useMutation(api.offers.createCounterOffer);

  const latestOfferForQuery =
    threadData?.offers?.[threadData.offers.length - 1];
  const messages = useQuery(
    api.messages.getMessages,
    threadData?.negotiation.status === "paid"
      ? { negotiationId: threadData.negotiation._id }
      : "skip",
  );

  // --- Scroll-Driven Header Animation ---
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Header shadow appears on scroll
  const headerSeparatorStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 30], [0, 1], Extrapolation.CLAMP),
  }));

  // --- Memos ---
  const {
    iAmTheRequester,
    wasLatestOfferSentByMe,
    isNegotiationActive,
    finalStatusMessage,
  } = useMemo(() => {
    if (
      !currentUser ||
      !threadData ||
      !threadData.requester ||
      !threadData.traveler
    ) {
      return { isNegotiationActive: false, finalStatusMessage: "" };
    }
    const { offers, requester, traveler } = threadData;
    const latestOffer = offers[offers.length - 1];

    const iAmTheRequester = currentUser._id === requester._id;
    const wasLatestOfferSentByMe = currentUser._id === latestOffer.senderId;
    const isNegotiationActive = threadData.negotiation.status === "pending";
    let finalStatusMessage = "";
    if (!isNegotiationActive) {
      const actionTaker =
        latestOffer.senderId === requester._id ? traveler : requester;
      const actionTakerName =
        actionTaker._id === currentUser._id ? "You" : actionTaker.username;
      // Localized Status Message
      finalStatusMessage = t("offer.status.closed_desc", {
        name: actionTakerName,
        status: threadData.negotiation.status,
      });
    }
    return {
      iAmTheRequester,
      wasLatestOfferSentByMe,
      isNegotiationActive,
      finalStatusMessage,
    };
  }, [currentUser, threadData, t]); // Added t to deps

  // --- Handlers ---
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  // NEW: Helper for profile navigation
  const handleProfilePress = (profileId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/user/${profileId}`);
  };

  // Helper for relative time
  const formatRelativeTime = (timestamp: number): string => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);
    const minutes = Math.floor(diffInSeconds / 60);
    if (minutes < 1) return t("offer.history.now");
    if (minutes < 60) return t("offer.history.ago_m", { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t("offer.history.ago_h", { count: hours });
    return past.toLocaleDateString(i18n.language, {
      month: "short",
      day: "numeric",
    });
  };

  // Loading State — REDESIGN: Premium shimmer skeleton replaces basic ActivityIndicator
  if (threadData === undefined || currentUser === undefined) {
    return <OfferDetailSkeleton />;
  }
  // Error States
  if (currentUser === null) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons
          name="alert-circle-outline"
          size={60}
          color={DESIGN.colors.danger}
        />
        <Text style={styles.errorText}>{t("offer.loading_error")}</Text>
        <TouchableOpacity
          onPress={() => {
            // NEW: Added Haptics
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={styles.errorButton}
        >
          <Text style={styles.buttonTextPrimary}>{t("offer.btn_go_back")}</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (
    threadData === null ||
    !threadData.requester ||
    !threadData.traveler ||
    !threadData.trip ||
    !threadData.negotiation ||
    !threadData.request
  ) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons
          name="alert-circle-outline"
          size={60}
          color={DESIGN.colors.danger}
        />
        <Text style={styles.errorText}>{t("offer.loading_data_error")}</Text>
        <TouchableOpacity
          onPress={() => {
            // NEW: Added Haptics
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={styles.errorButton}
        >
          <Text style={styles.buttonTextPrimary}>{t("offer.btn_go_back")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { request, offers, requester, traveler, trip, negotiation } =
    threadData;
  const latestOffer = offers[offers.length - 1];
  const otherUser = iAmTheRequester ? traveler : requester;

  // --- Action Handlers ---
  const handleNegotiate = async () => {
    if (!currentUser) return;
    const fee = parseFloat(newFee);
    if (isNaN(fee) || fee <= 0) {
      Alert.alert(
        t("offer.alerts.invalid_amount"),
        t("offer.alerts.enter_valid_fee"),
      );
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSubmitting(true);
    try {
      await createCounterOffer({ negotiationId: negotiation._id, newFee: fee });
      setNegotiateModalVisible(false);
      setNewFee("");
    } catch (error) {
      Alert.alert(
        t("offer.alerts.error_title"),
        t("offer.alerts.send_offer_error"),
      );
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAccept = async () => {
    if (!currentUser) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsSubmitting(true);
    try {
      await acceptOffer({ offerId: latestOffer._id });
    } catch (error) {
      Alert.alert(
        t("offer.alerts.error_title"),
        t("offer.alerts.accept_error"),
        [{ text: "OK" }],
      );
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!currentUser) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setIsSubmitting(true);
    try {
      await rejectOffer({ offerId: latestOffer._id });
      Alert.alert(
        t("offer.alerts.reject_title"),
        t("offer.alerts.reject_msg"),
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (error) {
      Alert.alert(
        t("offer.alerts.error_title"),
        t("offer.alerts.reject_error"),
        [{ text: "OK" }],
      );
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!currentUser) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsSubmitting(true);
    try {
      await cancelOffer({ offerId: latestOffer._id });
      Alert.alert(
        t("offer.alerts.cancel_title"),
        t("offer.alerts.cancel_msg"),
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (error) {
      Alert.alert(
        t("offer.alerts.error_title"),
        t("offer.alerts.cancel_error"),
        [{ text: "OK" }],
      );
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProductLink = async () => {
    if (!request.productURL) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      let url = request.productURL;
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        url = "https://" + url;
      }
      await WebBrowser.openBrowserAsync(url);
    } catch (error) {
      Alert.alert(t("offer.alerts.url_error", { url: request.productURL }));
    }
  };

  // --- Role-Based Status Logic ---
  let statusIcon: React.ComponentProps<typeof Ionicons>["name"] =
    "help-circle-outline";
  let statusTitle = "";
  let statusDescription = "";
  let statusTheme = "info";

  if (negotiation.status === "pending") {
    if (wasLatestOfferSentByMe) {
      statusIcon = "time-outline";
      statusTitle = t("offer.status.offer_sent");
      statusDescription = iAmTheRequester
        ? t("offer.status.waiting_traveler", { name: traveler.username })
        : t("offer.status.waiting_requester", { name: requester.username });
      statusTheme = "pending";
    } else {
      statusIcon = "sparkles-outline";
      statusTitle = t("offer.status.action_required");
      statusDescription = iAmTheRequester
        ? t("offer.status.action_traveler", { name: traveler.username })
        : t("offer.status.action_requester", { name: requester.username });
      statusTheme = "action";
    }
  } else if (negotiation.status === "accepted") {
    if (iAmTheRequester) {
      statusIcon = "card-outline";
      statusTitle = t("offer.status.offer_accepted");
      statusDescription = t("offer.status.offer_accepted_desc");
      statusTheme = "success";
    } else {
      statusIcon = "hourglass-outline";
      statusTitle = t("offer.status.waiting_payment");
      statusDescription = t("offer.status.waiting_payment_desc", {
        name: requester.username,
      });
      statusTheme = "pending";
    }
  } else if (negotiation.status === "paid") {
    statusIcon = "chatbubbles-outline";
    statusTitle = t("offer.status.payment_secured");
    statusDescription = iAmTheRequester
      ? t("offer.status.payment_secured_requester")
      : t("offer.status.payment_secured_traveler");
    statusTheme = "success";
  } else if (negotiation.status === "completed") {
    statusIcon = "checkmark-done-circle";
    statusTitle = t("offer.status.completed");
    statusDescription = t("offer.status.completed_desc");
    statusTheme = "completed";
  } else {
    // rejected or cancelled
    statusIcon = "close-circle-outline";
    statusTitle = t("offer.status.closed");
    statusDescription = finalStatusMessage;
    statusTheme = "rejected";
  }

  // Helper for formatting date (localized)
  const formatDate = (dateString: number) =>
    new Date(dateString).toLocaleDateString(i18n.language, {
      month: "short",
      day: "numeric",
    });

  // ========================================================================
  // REDESIGN: PHASE-DRIVEN RENDER
  // ========================================================================
  // The old monolithic render has been replaced with a phase-driven architecture
  // that conditionally shows/hides sections based on negotiation.status.
  //
  // OLD RENDER NOTE (per Rule 1):
  // The previous implementation used a single ScrollView for all states with:
  // - Static solid-color status hub
  // - Inline offer history + messages without animations
  // - Static trip/request cards without 3D interactions
  // - Basic footer action buttons without spring physics
  // - Plain Modal with rgba backdrop for negotiate input
  // - ActivityIndicator for loading state
  // This has been replaced with the premium phase-driven render below.

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 24 : 24}
    >
      {/* --- ANIMATED HEADER --- */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          disabled={isSubmitting}
          style={styles.headerBackButton}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={DESIGN.colors.textPrimary}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {request.productName}
        </Text>
        <View style={{ width: 40 }} />
      </View>
      {/* Scroll-driven separator — fades in on scroll */}
      <Animated.View style={[styles.headerSeparator, headerSeparatorStyle]} />

      <Animated.ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={DESIGN.colors.brand}
          />
        }
      >
        {/* --- STEP TRACKER --- */}
        <StepTracker status={negotiation.status} />

        {/* --- STATUS HUB (Gradient) --- */}
        <Animated.View
          entering={FadeIn.delay(150).duration(400)}
          style={styles.statusHub}
        >
          <LinearGradient
            colors={
              STATUS_GRADIENTS[statusTheme] || DESIGN.colors.closedGradient
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statusHubGradient}
          >
            <Ionicons
              name={statusIcon}
              size={26}
              color={DESIGN.colors.textInverse}
              style={styles.statusHubIcon}
            />
            <View style={styles.statusHubTextContainer}>
              <Text style={styles.statusHubTitle}>{statusTitle}</Text>
              <Text style={styles.statusHubDescription}>
                {statusDescription}
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* --- DELIVERY CONFIRMATION (TRAVELER) --- */}
        {/* REDESIGN: Moved here per user request to avoid "illogical" floating over chat.
            Also ensures it is visible in the scroll flow for the traveler. */}
        {negotiation.status === "paid" && !iAmTheRequester && orderWithCode && (
          <AnimatedButton
            style={[
              styles.floatingConfirmButton,
              isSubmitting && styles.buttonDisabled,
              { marginBottom: 20 }, // Add spacing below
            ]}
            disabled={isSubmitting}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push({
                pathname: "/(stack)/confirm-delivery",
                params: { negotiationId: threadData.negotiation._id },
              });
            }}
          >
            <LinearGradient
              colors={DESIGN.colors.successGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFill, { borderRadius: 28 }]}
            />
            <Ionicons
              name="checkmark-done-circle-outline"
              size={22}
              color={DESIGN.colors.textInverse}
            />
            <Text style={styles.floatingButtonText}>
              {t("offer.btn_confirm")}
            </Text>
          </AnimatedButton>
        )}

        {/* --- DELIVERY CODE SECTION (Paid phase, requester only) --- */}
        {negotiation.status === "paid" && iAmTheRequester && orderWithCode && (
          <DeliveryCodeSection
            code={orderWithCode.deliveryCode ?? ""}
            isVisible={isCodeVisible}
            onToggle={() => setIsCodeVisible(!isCodeVisible)}
            title={t("offer.delivery_code.title")}
            warning={t("offer.delivery_code.warning")}
          />
        )}

        {/* --- NEGOTIATION / CHAT HISTORY --- */}
        <Animated.View entering={FadeIn.delay(250).duration(300)}>
          <Text style={styles.historyTitle}>
            {negotiation.status === "paid"
              ? t("offer.history.chat")
              : t("offer.history.negotiation")}
          </Text>
        </Animated.View>

        <View style={styles.historyContainer}>
          {/* Offer bubbles with staggered FadeInDown entry */}
          {offers.map((offer, index) => {
            const isMe = offer.senderId === currentUser._id;
            const senderImage =
              (isMe ? currentUser.imageURL : otherUser.imageURL) ?? "";

            const BubbleContent = (
              <View
                style={[
                  styles.bubble,
                  isMe ? styles.myBubble : styles.theirBubble,
                ]}
              >
                <Text
                  style={[
                    styles.bubbleFee,
                    isMe ? styles.myBubbleText : styles.theirBubbleText,
                  ]}
                >
                  ${offer.proposedFee.toFixed(2)}
                </Text>
                <Text
                  style={[
                    styles.bubbleTime,
                    isMe ? styles.myBubbleTime : styles.theirBubbleTime,
                  ]}
                >
                  {formatRelativeTime(offer._creationTime)}
                </Text>
              </View>
            );

            // CHANGED: Made Avatar Pressable for navigation
            const Avatar = (
              <TouchableOpacity
                onPress={() => handleProfilePress(offer.senderId)}
                activeOpacity={0.7}
              >
                <Image source={senderImage} style={styles.bubbleAvatar} />
              </TouchableOpacity>
            );

            // REDESIGN: Sleek slide instead of springify
            return (
              <Animated.View
                key={offer._id}
                entering={FadeInDown.delay(index * 60)
                  .duration(400)
                  .easing(REasing.out(REasing.cubic))}
                style={[
                  styles.bubbleContainer,
                  isMe ? styles.myBubbleContainer : styles.theirBubbleContainer,
                ]}
              >
                {isMe ? (
                  <>
                    {BubbleContent}
                    {Avatar}
                  </>
                ) : (
                  <>
                    {Avatar}
                    {BubbleContent}
                  </>
                )}
              </Animated.View>
            );
          })}

          {/* Chat messages (paid phase only) */}
          {negotiation.status === "paid" &&
            messages &&
            messages.map((msg, index) => {
              const isMe = msg.senderId === currentUser._id;
              const sender = isMe ? currentUser : otherUser;
              const senderImage = sender.imageURL ?? "";

              const BubbleContent = (
                <View
                  style={[
                    styles.bubble,
                    isMe ? styles.myBubble : styles.theirBubble,
                    styles.chatBubble,
                  ]}
                >
                  <Text
                    style={[
                      styles.chatText,
                      isMe ? styles.myBubbleText : styles.theirBubbleText,
                    ]}
                  >
                    {msg.text}
                  </Text>
                  <Text
                    style={[
                      styles.bubbleTime,
                      isMe ? styles.myBubbleTime : styles.theirBubbleTime,
                    ]}
                  >
                    {formatRelativeTime(msg._creationTime)}
                  </Text>
                </View>
              );

              // CHANGED: Made Avatar Pressable for navigation
              const Avatar = (
                <TouchableOpacity
                  onPress={() => handleProfilePress(msg.senderId)}
                  activeOpacity={0.7}
                >
                  <Image source={senderImage} style={styles.bubbleAvatar} />
                </TouchableOpacity>
              );

              // REDESIGN: Sleek slide instead of springify
              return (
                <Animated.View
                  key={msg._id}
                  entering={FadeInDown.delay((offers.length + index) * 40)
                    .duration(400)
                    .easing(REasing.out(REasing.cubic))}
                  style={[
                    styles.bubbleContainer,
                    isMe
                      ? styles.myBubbleContainer
                      : styles.theirBubbleContainer,
                  ]}
                >
                  {isMe ? (
                    <>
                      {BubbleContent}
                      {Avatar}
                    </>
                  ) : (
                    <>
                      {Avatar}
                      {BubbleContent}
                    </>
                  )}
                </Animated.View>
              );
            })}
        </View>

        <View style={styles.detailsDivider} />

        {/* --- MODERN TRIP DETAILS (3D Card + Animated Route) --- */}
        <Card3D style={styles.modernCard}>
          <LinearGradient
            colors={[DESIGN.colors.backgroundSecondary, DESIGN.colors.surface]}
            style={styles.modernCardContent}
          >
            <View style={styles.modernCardHeader}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons
                  name="airplane"
                  size={18}
                  color={DESIGN.colors.brand}
                />
                <Text style={styles.modernCardTitle}>
                  {t("offer.trip_details.title")}
                </Text>
              </View>
              <Text style={styles.modernDate}>
                {formatDate(trip.arrivalDate)}
              </Text>
            </View>

            {/* REDESIGN: AnimatedRoute replaces old static dots+dashes */}
            <AnimatedRoute
              originCity={trip.originCity}
              destinationCity={trip.destinationCity}
              originCode={getCountryCode(trip.originCity)}
              destCode={getCountryCode(trip.destinationCity)}
              originLabel={t("offer.trip_details.origin")}
              destLabel={t("offer.trip_details.destination")}
            />

            <View style={styles.separator} />

            {/* CHANGED: Made Traveler Info Pressable */}
            <TouchableOpacity
              style={styles.travelerSection}
              onPress={() => handleProfilePress(traveler._id)}
              activeOpacity={0.7}
            >
              <Image
                source={traveler.imageURL ?? ""}
                style={styles.avatarSmall}
              />
              <View>
                <Text style={styles.travelerLabel}>
                  {t("offer.trip_details.traveler_label")}
                </Text>
                <Text style={styles.travelerName}>{traveler.username}</Text>
              </View>
            </TouchableOpacity>
          </LinearGradient>
        </Card3D>

        {/* --- REQUEST SUMMARY (3D Card) --- */}
        <Card3D style={styles.requestCard}>
          <View style={styles.requestCardInner}>
            <View style={cardStyles.cardHeader}>
              <Ionicons
                name="cube-outline"
                size={20}
                color={DESIGN.colors.textSecondary}
              />
              <Text style={cardStyles.cardTitle}>
                {t("offer.summary_title")}
              </Text>
            </View>

            <View style={cardStyles.productBentoContainer}>
              <View style={cardStyles.productInfoContainer}>
                <Text style={cardStyles.productName} numberOfLines={2}>
                  {request.productName}
                </Text>

                {request.productURL && (
                  <TouchableOpacity
                    style={cardStyles.productLinkButton}
                    onPress={handleProductLink}
                  >
                    <Ionicons
                      name="link-outline"
                      size={16}
                      color={DESIGN.colors.accent}
                    />
                    <Text style={cardStyles.productLinkText}>
                      {t("offer.view_product")}
                    </Text>
                  </TouchableOpacity>
                )}

                <View style={cardStyles.pillsContainer}>
                  <View style={cardStyles.pillItem}>
                    <MaterialCommunityIcons
                      name="package-variant-closed"
                      size={14}
                      color={DESIGN.colors.accent}
                    />
                    <Text style={cardStyles.pillText}>
                      {t("offer.qty", { count: request.quantity })}
                    </Text>
                  </View>
                  {request.productWeight && (
                    <View style={cardStyles.pillItem}>
                      <FontAwesome5
                        name="weight-hanging"
                        size={12}
                        color={DESIGN.colors.accent}
                      />
                      <Text style={cardStyles.pillText}>
                        {t("offer.wt", { weight: request.productWeight })}
                      </Text>
                    </View>
                  )}
                  {request.itemTypes && (
                    <View style={cardStyles.pillItem}>
                      <MaterialCommunityIcons
                        name="tag-outline"
                        size={14}
                        color={DESIGN.colors.accent}
                      />
                      <Text style={cardStyles.pillText}>
                        {request.itemTypes}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {request.imageKey && (
                <TouchableOpacity
                  style={cardStyles.productImageContainer}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setImageViewVisible(true);
                  }}
                >
                  <Image
                    source={{ uri: `https://ts79.space/${request.imageKey}` }}
                    style={cardStyles.productImage}
                    contentFit="cover"
                    transition={300}
                  />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.financialRow}>
              <View style={styles.financialItem}>
                <Text style={styles.detailLabel}>{t("offer.price")}</Text>
                <Text style={styles.detailValue}>
                  ${request.itemPrice.toFixed(2)}
                </Text>
              </View>
              <View style={styles.financialItem}>
                <Text style={styles.detailLabel}>{t("offer.fee")}</Text>
                <Text
                  style={[styles.detailValue, { color: DESIGN.colors.accent }]}
                >
                  ${request.travelerFee.toFixed(2)}
                </Text>
              </View>
            </View>

            {/* REDESIGN: Added Requester Section to Request Card */}
            <View style={styles.separator} />
            <TouchableOpacity
              style={styles.travelerSection}
              onPress={() => handleProfilePress(requester._id)}
              activeOpacity={0.7}
            >
              <Image
                source={requester.imageURL ?? ""}
                style={styles.avatarSmall}
              />
              <View>
                <Text style={styles.travelerLabel}>
                  {t("offer.requested_by")}
                </Text>
                <Text style={styles.travelerName}>{requester.username}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </Card3D>

        {/* NOTE: Phase-specific CTAs (Proceed to Payment, Confirm Delivery)
         * have been moved OUTSIDE the ScrollView into the sticky footer area
         * so they are always visible without scrolling. */}

        {/* REDESIGN: Removed Duplicate "Completed" Celebration Banner per user request.
            The StatusHub at the top already says "Order Completed". */}
      </Animated.ScrollView>

      {/* --- STICKY PHASE-DRIVEN FOOTER (always visible, never scrolls) --- */}
      {/* Logic:
       * - pending + receiver of latest offer: Reject/Cancel + Negotiate + Accept
       * - pending + sender of latest offer: Empty (waiting for other party)
       * - accepted + requester: "Proceed to Payment" CTA
       * - accepted + traveler: Empty (waiting for payment)
       * - paid: MessageInput for chat + "Confirm Delivery" for traveler
       * - completed / rejected / cancelled: No actions
       */}

      {/* Paid phase: MessageInput for chat */}
      {negotiation.status === "paid" ? (
        <MessageInput negotiationId={negotiation._id} />
      ) : negotiation.status === "accepted" && iAmTheRequester ? (
        /* Accepted phase: "Proceed to Payment" sticky CTA for requester */
        <View style={styles.footer}>
          <AnimatedButton
            style={[
              styles.floatingConfirmButton,
              { flex: 1 },
              isSubmitting && styles.buttonDisabled,
            ]}
            disabled={isSubmitting}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push({
                pathname: "/(stack)/payment",
                params: { negotiationId: threadData.negotiation._id },
              });
            }}
          >
            <LinearGradient
              colors={DESIGN.colors.brandGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFill, { borderRadius: 28 }]}
            />
            <Ionicons
              name="card-outline"
              size={22}
              color={DESIGN.colors.textInverse}
            />
            <Text style={styles.floatingButtonText}>
              {t("offer.btn_proceed")}
            </Text>
          </AnimatedButton>
        </View>
      ) : negotiation.status === "pending" && !wasLatestOfferSentByMe ? (
        /* Pending phase: Receiver of the latest offer — full action set */
        <View style={styles.footer}>
          {/* 1. REJECT / CANCEL (Ghost Style with spring press) */}
          <AnimatedButton
            style={[styles.decisionButton, styles.decisionButtonDestructive]}
            disabled={isSubmitting}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              iAmTheRequester ? handleCancel() : handleReject();
            }}
          >
            <Ionicons
              name="close-circle"
              size={20}
              color={DESIGN.colors.danger}
            />
            <Text style={styles.decisionTextDestructive}>
              {iAmTheRequester
                ? t("offer.actions.cancel")
                : t("offer.actions.reject")}
            </Text>
          </AnimatedButton>

          {/* 2. NEGOTIATE (Soft Fill with spring press) */}
          <AnimatedButton
            style={[styles.decisionButton, styles.decisionButtonSecondary]}
            disabled={isSubmitting}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setNegotiateModalVisible(true);
            }}
          >
            <Ionicons
              name="chatbubble-ellipses"
              size={20}
              color={DESIGN.colors.brand}
            />
            <Text style={styles.decisionTextSecondary}>
              {t("offer.actions.negotiate")}
            </Text>
          </AnimatedButton>

          {/* 3. ACCEPT (Hero Gradient with spring press) */}
          <AnimatedButton
            style={[styles.decisionButton, styles.decisionButtonPrimary]}
            disabled={isSubmitting}
            onPress={handleAccept}
          >
            <LinearGradient
              colors={DESIGN.colors.successGradient}
              style={[
                StyleSheet.absoluteFill,
                { borderRadius: DESIGN.radius.lg },
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <Ionicons
              name="checkmark-circle"
              size={22}
              color={DESIGN.colors.textInverse}
            />
            <Text style={styles.decisionTextPrimary}>
              {t("offer.actions.accept")}
            </Text>
          </AnimatedButton>
        </View>
      ) : null}

      {/* --- NEGOTIATE MODAL (Premium with spring entrance + BlurView) --- */}
      <Modal
        animationType="none"
        transparent={true}
        visible={negotiateModalVisible}
        onRequestClose={() => setNegotiateModalVisible(false)}
      >
        {negotiateModalVisible && (
          <View style={modalStyles.backdrop}>
            {/* Glassmorphism blur layer (iOS only) */}
            {Platform.OS === "ios" && (
              <BlurView
                intensity={25}
                tint="dark"
                style={StyleSheet.absoluteFill}
              />
            )}
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setNegotiateModalVisible(false)}
            />
            {/* Spring-animated modal entrance */}
            <Animated.View
              entering={FadeInUp.springify().damping(18)}
              style={modalStyles.content}
            >
              {/* Gradient accent strip at top */}
              <LinearGradient
                colors={DESIGN.colors.brandGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={modalStyles.accentStrip}
              />
              <Text style={modalStyles.title}>
                {t("offer.modals.negotiate_title")}
              </Text>
              <View style={modalStyles.inputContainer}>
                <Text style={modalStyles.dollarSign}>$</Text>
                <TextInput
                  style={modalStyles.input}
                  placeholder="45"
                  placeholderTextColor={DESIGN.colors.placeholder}
                  keyboardType="numeric"
                  value={newFee}
                  onChangeText={setNewFee}
                  autoFocus={true}
                />
              </View>
              <TouchableOpacity
                style={[
                  modalStyles.button,
                  isSubmitting && styles.buttonDisabled,
                ]}
                onPress={handleNegotiate}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={DESIGN.colors.brandGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    StyleSheet.absoluteFill,
                    { borderRadius: DESIGN.radius.md },
                  ]}
                />
                {isSubmitting ? (
                  <ActivityIndicator color={DESIGN.colors.textInverse} />
                ) : (
                  <Text style={styles.buttonTextPrimary}>
                    {t("offer.modals.btn_send_offer")}
                  </Text>
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>
        )}
      </Modal>

      {/* --- IMAGE VIEWER MODAL --- */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isImageViewVisible}
        onRequestClose={() => setImageViewVisible(false)}
      >
        <Pressable
          style={cardStyles.imageViewerBackdrop}
          onPress={() => {
            // NEW: Added Haptics on Close
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setImageViewVisible(false);
          }}
        >
          <Image
            source={{ uri: `https://ts79.space/${request.imageKey}` }}
            style={cardStyles.imageViewerImage}
            contentFit="contain"
          />
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ============================================================================
// STYLES: MAIN
// ============================================================================
// REDESIGN: Complete style overhaul from iOS blue to brand pink.
// Old styles noted inline where significantly changed.
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: DESIGN.colors.background, // REDESIGN: was COLORS.background (#F0F2F5)
    padding: 20,
  },
  errorText: {
    color: DESIGN.colors.textPrimary,
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    textAlign: "center",
  },
  errorButton: {
    backgroundColor: DESIGN.colors.brand, // REDESIGN: was COLORS.primary (#007AFF)
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: DESIGN.radius.md,
    marginTop: 20,
  },
  container: {
    flex: 1,
    backgroundColor: DESIGN.colors.background, // REDESIGN: was COLORS.background (#F0F2F5)
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 56 : 24,
    paddingBottom: 14,
    backgroundColor: DESIGN.colors.surface,
  },
  headerBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DESIGN.colors.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    color: DESIGN.colors.textPrimary,
    fontSize: 17,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 10,
  },
  // Scroll-driven separator — animates opacity from 0 to 1 on scroll
  headerSeparator: {
    height: 1,
    backgroundColor: DESIGN.colors.border,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },

  // --- STATUS HUB (Gradient) ---
  statusHub: {
    marginBottom: 20,
    borderRadius: DESIGN.radius.xl,
    overflow: "hidden",
    ...DESIGN.shadow.md,
  },
  statusHubGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderRadius: DESIGN.radius.xl,
  },
  statusHubIcon: { marginRight: 14 },
  statusHubTextContainer: { flex: 1 },
  statusHubTitle: {
    color: DESIGN.colors.textInverse,
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 3,
  },
  statusHubDescription: {
    color: DESIGN.colors.textInverse,
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.92,
  },

  // --- DIVIDER ---
  detailsDivider: {
    height: 1,
    backgroundColor: DESIGN.colors.divider,
    marginVertical: 24,
  },

  // --- TRIP DETAILS CARD ---
  modernCard: {
    marginBottom: 20,
    borderRadius: DESIGN.radius.xl,
    backgroundColor: DESIGN.colors.surface,
    ...DESIGN.shadow.md,
  },
  modernCardContent: {
    borderRadius: DESIGN.radius.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: DESIGN.colors.glassBorder,
  },
  modernCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modernCardTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: DESIGN.colors.textPrimary,
    marginLeft: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  modernDate: {
    fontSize: 14,
    fontWeight: "600",
    color: DESIGN.colors.textSecondary,
  },
  separator: {
    height: 1,
    backgroundColor: DESIGN.colors.divider,
    marginVertical: 14,
  },
  travelerSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarSmall: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 10,
    backgroundColor: DESIGN.colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: DESIGN.colors.border,
  },
  travelerLabel: {
    fontSize: 10,
    color: DESIGN.colors.textSecondary,
    textTransform: "uppercase",
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  travelerName: {
    fontSize: 15,
    fontWeight: "600",
    color: DESIGN.colors.textPrimary,
  },

  // --- REQUEST CARD ---
  requestCard: {
    marginBottom: 20,
    borderRadius: DESIGN.radius.xl,
    backgroundColor: DESIGN.colors.surface,
    ...DESIGN.shadow.md,
  },
  requestCardInner: {
    borderRadius: DESIGN.radius.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: DESIGN.colors.glassBorder,
    backgroundColor: DESIGN.colors.surface,
  },

  // --- FINANCIAL ROW ---
  financialRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: DESIGN.colors.divider,
  },
  financialItem: { alignItems: "center", flex: 1 },
  detailLabel: {
    color: DESIGN.colors.textSecondary,
    fontSize: 13,
    marginBottom: 4,
    fontWeight: "500",
  },
  detailValue: {
    color: DESIGN.colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
  },

  // --- HISTORY ---
  historyTitle: {
    color: DESIGN.colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginLeft: 4,
    marginBottom: 10,
  },
  historyContainer: { paddingBottom: 16 },

  // --- CHAT BUBBLES ---
  bubbleContainer: {
    flexDirection: "row",
    marginVertical: 6,
    alignItems: "flex-end",
    gap: 8,
  },
  myBubbleContainer: { justifyContent: "flex-end" },
  theirBubbleContainer: { justifyContent: "flex-start" },
  bubbleAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: DESIGN.colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: DESIGN.colors.border,
  },
  bubble: {
    maxWidth: "78%",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    ...DESIGN.shadow.sm,
  },
  myBubble: {
    backgroundColor: DESIGN.colors.myBubble, // REDESIGN: was COLORS.myBubble (#007AFF)
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: DESIGN.colors.theirBubble,
    borderBottomLeftRadius: 4,
  },
  bubbleFee: {
    fontSize: 20,
    fontWeight: "800",
  },
  bubbleTime: {
    fontSize: 11,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  myBubbleTime: { color: "rgba(255,255,255,0.75)" },
  theirBubbleTime: { color: DESIGN.colors.textTertiary },
  chatBubble: { paddingVertical: 8 },
  chatText: { fontSize: 16, lineHeight: 22 },
  myBubbleText: { color: DESIGN.colors.textInverse },
  theirBubbleText: { color: DESIGN.colors.textPrimary },

  // --- STICKY CTA BAR (for Confirm Delivery above MessageInput in paid phase) ---
  stickyCtaBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: DESIGN.colors.surface,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 8,
  },

  // --- FOOTER ---
  footer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    backgroundColor: DESIGN.colors.surface,
    // Modern Floating Shadow (No Border)
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 20,
    gap: 10,
    alignItems: "center",
  },
  footerEmpty: { height: 0 },

  // Base Button Shape
  decisionButton: {
    height: 54,
    borderRadius: DESIGN.radius.lg,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
    overflow: "hidden",
  },

  // 1. REJECT: Ghost Style
  decisionButtonDestructive: {
    flex: 1.2,
    backgroundColor: DESIGN.colors.dangerLight,
  },
  decisionTextDestructive: {
    color: DESIGN.colors.danger,
    fontSize: 15,
    fontWeight: "700",
  },

  // 2. NEGOTIATE: Soft Fill
  decisionButtonSecondary: {
    flex: 1.6,
    backgroundColor: DESIGN.colors.brandLight,
  },
  decisionTextSecondary: {
    color: DESIGN.colors.brand,
    fontSize: 15,
    fontWeight: "700",
  },

  // 3. ACCEPT: Hero Gradient
  decisionButtonPrimary: {
    flex: 1.6,
    overflow: "hidden",
    // Shadow for the primary button only
    shadowColor: DESIGN.colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  decisionTextPrimary: {
    color: DESIGN.colors.textInverse,
    fontSize: 16,
    fontWeight: "800",
  },

  // --- CELEBRATION BANNER (Completed phase) ---
  celebrationBanner: {
    marginBottom: 16,
    borderRadius: DESIGN.radius.xl,
    overflow: "hidden",
    ...DESIGN.shadow.md,
  },
  celebrationGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
  },
  celebrationTextContainer: {
    flex: 1,
    marginLeft: 14,
  },
  celebrationTitle: {
    color: DESIGN.colors.textInverse,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 4,
  },
  celebrationDescription: {
    color: DESIGN.colors.textInverse,
    fontSize: 14,
    opacity: 0.9,
    lineHeight: 20,
  },

  // --- MISC ---
  buttonTextPrimary: {
    color: DESIGN.colors.textInverse,
    fontSize: 16,
    fontWeight: "700",
  },
  buttonDisabled: { opacity: 0.5 },
  // --- CONFIRM BUTTON ---
  floatingConfirmButton: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 8,
    overflow: "hidden",
    ...DESIGN.shadow.md,
  },
  floatingButtonText: {
    color: DESIGN.colors.textInverse,
    fontSize: 16,
    fontWeight: "800",
  },
});

// ============================================================================
// STYLES: STEP TRACKER
// ============================================================================
const stepStyles = StyleSheet.create({
  container: {
    backgroundColor: DESIGN.colors.surface,
    borderRadius: DESIGN.radius.lg,
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: DESIGN.colors.glassBorder,
    ...DESIGN.shadow.sm,
  },
  stepsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
  },
  stepItem: {
    alignItems: "center",
    width: 56,
  },
  circle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: DESIGN.colors.backgroundTertiary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  circleCompleted: {
    backgroundColor: DESIGN.colors.success,
  },
  circleActive: {
    backgroundColor: DESIGN.colors.brand,
    // Glow effect for active step
    shadowColor: DESIGN.colors.brand,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  circleFailed: {
    backgroundColor: DESIGN.colors.danger,
  },
  pulseOverlay: {
    position: "absolute",
    top: -2,
    right: -2,
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
    color: DESIGN.colors.textTertiary,
    textAlign: "center",
  },
  line: {
    flex: 1,
    height: 2,
    backgroundColor: DESIGN.colors.border,
    marginTop: 14, // Vertically center with circles
    borderRadius: 1,
  },
  lineCompleted: {
    backgroundColor: DESIGN.colors.success,
  },
});

// ============================================================================
// STYLES: ANIMATED ROUTE
// ============================================================================
const routeStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  endpoint: {
    alignItems: "center",
    flex: 1,
  },
  cityText: {
    fontSize: 16,
    fontWeight: "700",
    color: DESIGN.colors.textPrimary,
    marginTop: 2,
  },
  label: {
    color: DESIGN.colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
    fontWeight: "500",
  },
  graphic: {
    flex: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  line: {
    flex: 1,
    height: 1.5,
    backgroundColor: DESIGN.colors.border,
  },
});

// ============================================================================
// STYLES: DELIVERY CODE
// ============================================================================
const codeStyles = StyleSheet.create({
  container: {
    backgroundColor: DESIGN.colors.surface,
    borderRadius: DESIGN.radius.xl,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: DESIGN.colors.glassBorder,
    ...DESIGN.shadow.md,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: DESIGN.colors.textPrimary,
    marginBottom: 16,
    textAlign: "center",
  },
  digitRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
  },
  digitBox: {
    width: 42,
    height: 50,
    borderRadius: DESIGN.radius.md,
    backgroundColor: DESIGN.colors.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: DESIGN.colors.border,
  },
  digitText: {
    fontSize: 24,
    fontWeight: "800",
    color: DESIGN.colors.textPrimary,
  },
  eyeButton: {
    width: 42,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: DESIGN.radius.md,
    padding: 14,
    gap: 10,
  },
  warningText: {
    flex: 1,
    color: "#B45309",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "500",
  },
});

// ============================================================================
// STYLES: NEGOTIATE MODAL
// ============================================================================
const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor:
      Platform.OS === "ios" ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.5)",
  },
  content: {
    backgroundColor: DESIGN.colors.surface,
    borderRadius: DESIGN.radius.xl,
    padding: 24,
    width: "88%",
    overflow: "hidden",
    ...DESIGN.shadow.lg,
  },
  accentStrip: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  title: {
    color: DESIGN.colors.textPrimary,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 20,
    marginTop: 8,
    textAlign: "center",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: DESIGN.colors.backgroundSecondary,
    borderRadius: DESIGN.radius.md,
    paddingHorizontal: 14,
    marginBottom: 18,
    borderWidth: 1.5,
    borderColor: DESIGN.colors.border,
  },
  dollarSign: {
    color: DESIGN.colors.textPrimary,
    fontSize: 26,
    fontWeight: "800",
    marginRight: 6,
  },
  input: {
    flex: 1,
    color: DESIGN.colors.textPrimary,
    fontSize: 26,
    fontWeight: "800",
    height: 56,
  },
  button: {
    height: 52,
    borderRadius: DESIGN.radius.md,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
});

// ============================================================================
// STYLES: REQUEST CARD
// ============================================================================
const cardStyles = StyleSheet.create({
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: {
    color: DESIGN.colors.textPrimary,
    fontSize: 13,
    fontWeight: "800",
    marginLeft: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  productBentoContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  productInfoContainer: {
    flex: 1,
    marginRight: 12,
  },
  productName: {
    fontSize: 20,
    fontWeight: "800",
    color: DESIGN.colors.textPrimary,
    marginBottom: 4,
  },
  productLinkButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingVertical: 4,
    marginTop: 4,
  },
  productLinkText: {
    color: DESIGN.colors.accent, // REDESIGN: was REQUEST_PALETTE.primary
    fontWeight: "600",
    marginLeft: 6,
  },
  productImageContainer: {
    ...DESIGN.shadow.md,
  },
  productImage: {
    width: 90,
    height: 90,
    borderRadius: DESIGN.radius.md,
    backgroundColor: DESIGN.colors.backgroundTertiary,
  },
  pillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
    gap: 6,
  },
  pillItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: DESIGN.colors.backgroundSecondary,
    borderRadius: DESIGN.radius.sm,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: DESIGN.colors.glassBorder,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "600",
    color: DESIGN.colors.textSecondary,
    marginLeft: 5,
  },
  imageViewerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageViewerImage: {
    width: "92%",
    height: "80%",
    borderRadius: DESIGN.radius.lg,
  },
});
