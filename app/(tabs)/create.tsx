/**
 * Create Screen - Premium Launch Pad 2026
 *
 * Features:
 * - 3D card interactions with spring physics (Reanimated)
 * - Staggered entrance animations (FadeInDown, FadeInRight)
 * - Animated action arrows (micro-interactions)
 * - Card accent shimmer strips
 * - "Or" binary-choice separator (Airbnb pattern)
 * - Lottie accent animations (airplane.json, request-animation.json)
 * - Premium gradient accents
 * - Glassmorphism effects
 * - Haptic feedback everywhere
 * - Accessibility labels (accessibilityRole, accessibilityLabel)
 * - Android ripple feedback (android_ripple)
 *
 * REMOVALS (user-requested, each documented below):
 * - Header "+" icon badge: Non-dynamic, bloated screen layout
 * - CommunityPulseBanner / PulsingDot: Static "Gezginler aktif" text, not backed by real-time data
 * - AnimatedDivider with flash icon: Replaced by clean OrSeparator (Airbnb binary-choice pattern)
 * - Footer Trust Text: Removed completely to declutter (User feedback: "Amateur")
 * - Header Verified Badge: Removed (User feedback: "Why is it needed? Airbnb wouldn't do this")
 */

import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics"; // 1. NEW IMPORT: For tactile feedback
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import LottieView from "lottie-react-native";
import React, { useEffect } from "react";
import {
  Dimensions,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
// 2. IMPORT TRANSLATION HOOK
import { useTranslation } from "react-i18next";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInRight,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context"; // Recommended for precise safe area handling

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ============================================================================
// DESIGN SYSTEM - Premium 2026 (Create Screen)
// ============================================================================

// 2. REFINED PALETTE: Upgraded to structured DESIGN system for premium consistency.
// Matches Explore screen's organizational pattern but with Create-specific identity.
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

    // Brand (Traveler/Trip card)
    brand: "#FF385C",
    brandLight: "rgba(255, 56, 92, 0.1)",
    brandGradient: ["#FF385C", "#E31C5F"] as const,

    // Accent (Requester/Request card)
    accent: "#00A699",
    accentLight: "rgba(0, 166, 153, 0.1)",
    accentGradient: ["#00A699", "#008489"] as const,

    // Status
    success: "#00A86B",
    successLight: "rgba(0, 168, 107, 0.1)",

    // UI
    border: "#E8E8E8",
    divider: "#EBEBEB",
    shimmer: "#E8E8E8",
    shimmerHighlight: "#F5F5F5",

    // Glass
    glassLight: "rgba(255, 255, 255, 0.8)",
    glassBorder: "rgba(255, 255, 255, 0.3)", // For the modern border effect

    // Live indicator
    live: "#00D26A",
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
    md: 14,
    lg: 20,
    xl: 28,
    full: 9999,
  },

  shadow: {
    sm: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 3,
    },
    md: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 5,
    },
    lg: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 24,
      elevation: 10,
    },
    colored: (color: string) => ({
      shadowColor: color,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 8,
    }),
  },
} as const;

// ============================================================================
// ANIMATED COMPONENTS
// ============================================================================

// 3. Card3D Component (Upgraded from ScaleButton)
// This wraps the cards to provide premium 3D press animation with spring physics + Haptics.
// Replaces the original ScaleButton with Reanimated's useSharedValue + withSpring for
// natural, physics-based animations with perspective transforms and elevation changes.
//
// ENHANCEMENTS APPLIED:
// - Spring physics refined to { damping: 18, stiffness: 300 } for organic Airbnb-style motion
// - Added accessibilityLabel + accessibilityRole="button" for screen reader support (P0 a11y)
// - Added android_ripple for native Material feedback on Android alongside haptics
const Card3D: React.FC<{
  children: React.ReactNode;
  onPress: () => void;
  style?: any;
  delay?: number;
  accessibilityLabel?: string; // 5. NEW PROP: Screen reader support
}> = ({ children, onPress, style, delay = 0, accessibilityLabel }) => {
  const scale = useSharedValue(1);
  // rotateX/rotateY are infrastructure for future gesture-based tilt (currently inert at 0deg)
  const rotateX = useSharedValue(0);
  const rotateY = useSharedValue(0);
  const elevation = useSharedValue(1);

  const handlePressIn = () => {
    // Haptic feedback immediately on touch
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // 6. REFINED: Softer spring { damping: 18, stiffness: 300 } for organic motion
    // Previous { damping: 15, stiffness: 400 } was too snappy/mechanical
    scale.value = withSpring(0.97, { damping: 18, stiffness: 300 });
    elevation.value = withSpring(0.5);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 18, stiffness: 300 });
    elevation.value = withSpring(1);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { perspective: 1000 },
      { rotateX: `${rotateX.value}deg` },
      { rotateY: `${rotateY.value}deg` },
    ],
    opacity: interpolate(elevation.value, [0.5, 1], [0.95, 1]),
  }));

  return (
    <Animated.View
      entering={FadeInDown.delay(delay).springify()}
      style={{ flex: 1 }} // Force container to flex
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={{ flex: 1 }}
        // 7. NEW: Accessibility for screen readers
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        // 8. NEW: Native Android Material ripple feedback
        android_ripple={{ color: "rgba(255,255,255,0.15)", borderless: false }}
      >
        <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
      </Pressable>
    </Animated.View>
  );
};

// ============================================================================
// REMOVED COMPONENTS (User-requested removals, documented here per Rule #1)
// ============================================================================
//
// --- PulsingDot: REMOVED ---
// Was a pulsing green dot animation (scale + opacity loop). Only consumer was
// CommunityPulseBanner. With the banner removed, this component has zero usage.
//
// --- CommunityPulseBanner: REMOVED ---
// Displayed a static "Gezginler su anda aktif" (Travelers are active now) badge.
// Problem: The text was hardcoded / not backed by real-time user count data.
// It faked dynamism while consuming ~40px of vertical space, directly causing
// the text clipping issue on the second card. Removed by user request.
//
// --- AnimatedDivider: REMOVED ---
// Was a gradient-line divider with a pulsing flash icon in the center.
// Problem: Visually heavy (~44px) for what should be a simple binary-choice separator.
// Replaced by OrSeparator -- the Airbnb pattern for binary choices ("or" between
// horizontal lines). Saves ~16px vertical space and communicates intent more clearly.
// ============================================================================

// Animated Arrow Component - Repeating horizontal translate for tappability hint
const AnimatedArrow: React.FC = () => {
  const translateX = useSharedValue(0);

  useEffect(() => {
    translateX.value = withRepeat(
      withSequence(
        withTiming(4, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Animated.View style={[styles.arrowCircle, animatedStyle]}>
      <Feather
        name="arrow-up-right"
        size={20}
        color={DESIGN.colors.textInverse}
      />
    </Animated.View>
  );
};

// Card Accent Shimmer - Thin animated gradient strip at card top
const CardAccentShimmer: React.FC = () => {
  const shimmerTranslate = useSharedValue(-1);

  useEffect(() => {
    shimmerTranslate.value = withRepeat(
      withTiming(1, { duration: 2500, easing: Easing.ease }),
      -1,
      false,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          shimmerTranslate.value,
          [-1, 1],
          [-SCREEN_WIDTH, SCREEN_WIDTH],
        ),
      },
    ],
  }));

  return (
    <View style={styles.accentShimmerContainer}>
      <Animated.View style={[styles.accentShimmerBar, animatedStyle]}>
        <LinearGradient
          colors={["transparent", "rgba(255,255,255,0.4)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

// 9. OrSeparator - Clean binary-choice indicator (Airbnb pattern)
// Replaces AnimatedDivider. A centered "or" between two hairlines communicates
// "pick one of two options" instantly -- the standard Airbnb pattern for binary
// choices (e.g. "Continue with Email" / or / "Continue with Phone").
// Uses only ~28px vertical space vs the previous divider's ~44px.
const OrSeparator: React.FC = () => {
  const { t } = useTranslation();
  return (
    <Animated.View
      entering={FadeIn.delay(400).springify()}
      style={styles.orContainer}
    >
      <View style={styles.orLine} />
      <View style={styles.orBadge}>
        <Text style={styles.orText}>{t("create_screen.or")}</Text>
      </View>
      <View style={styles.orLine} />
    </Animated.View>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function Create() {
  const router = useRouter();
  // INITIALIZE TRANSLATION
  const { t } = useTranslation();

  // Use safe area insets to handle notches and bottom bars correctly
  const insets = useSafeAreaInsets();

  // --- PRESERVED CODE BLOCK START ---
  // The user requested to remove the lists as they are in the Profile tab.
  // I am commenting these out to preserve the code as per Rule #1.
  /*
  const [activeTab, setActiveTab] = useState<'trips' | 'requests'>('trips');
  const [postStatus, setPostStatus] = useState<'active' | 'archived'>('active');
  const [showHint, setShowHint] = useState(false);
  const hintAnim = new Animated.Value(0);

  useEffect(() => {
    Animated.timing(hintAnim, {
      toValue: showHint ? 1 : 0,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [showHint]);

  const myActiveTrips = useQuery(api.trips.getMyTrips);
  const myActiveRequests = useQuery(api.requests.getMyRequests);
  const myArchivedTrips: TripType[] = [];
  const myArchivedRequests: RequestType[] = [];

  if (myActiveTrips === undefined || myActiveRequests === undefined) return <Loader />;

  type TripType = NonNullable<typeof myActiveTrips>[number];
  type RequestType = NonNullable<typeof myActiveRequests>[number];

  const isTripsActive = activeTab === 'trips';
  const isShowingActive = postStatus === 'active';
  
  const dataToRender = isShowingActive
    ? (isTripsActive ? myActiveTrips : myActiveRequests)
    : (isTripsActive ? myArchivedTrips : myArchivedRequests);

  const handleHistoryToggle = () => {
    const isSwitchingToArchived = postStatus === 'active';
    setPostStatus(isSwitchingToArchived ? 'archived' : 'active');
    if (isSwitchingToArchived) {
      setShowHint(true);
      setTimeout(() => setShowHint(false), 3000);
    }
  };
  */
  // --- PRESERVED CODE BLOCK END ---

  const handleNavigation = (path: "/trips" | "/orders") => {
    // 4. FEATURE: Haptic feedback confirmation before navigation
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.navigate(path);
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={DESIGN.colors.background}
      />

      {/* FIXED PADDING: 
         - Top: max(safeArea, 20) + small spacing
         - Bottom: max(safeArea, 20) + 80. The +80 accounts for the Bottom Tab Bar height 
           which is overlapping your cards. 
      */}
      <View
        style={[
          styles.contentContainer,
          {
            paddingTop: Math.max(insets.top, 20) + DESIGN.spacing.sm,
            paddingBottom: Math.max(insets.bottom, 20) + 80,
          },
        ]}
      >
        {/* HEADER: Cleaned up. Removed Verified Badge. + Commented out title fully */}
        {/* <View style={styles.header}>
          <Animated.Text
            entering={FadeInDown.delay(100).springify()}
            style={styles.headerTitle}
          >
            {t("create_new")}
          </Animated.Text>
        </View> */}

        {/* MAIN CONTENT: 50/50 Split Grid (No Scroll) */}
        {/* Using flex:1 here ensures cards stretch to fill available height */}
        <View style={styles.gridContainer}>
          {/* --- OPTION 1: TRAVELER CARD --- */}
          <Card3D
            onPress={() => handleNavigation("/trips")}
            style={[
              styles.cardShadow,
              DESIGN.shadow.colored(DESIGN.colors.brand),
            ]}
            delay={300}
            accessibilityLabel={t("post_trip")}
          >
            <LinearGradient
              colors={DESIGN.colors.brandGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.card}
            >
              {/* Accent Shimmer Strip */}
              <CardAccentShimmer />

              {/* Shine Effect Overlay */}
              <LinearGradient
                colors={["rgba(255,255,255,0.12)", "transparent"]}
                style={styles.shineOverlay}
              />

              {/* Top Row: Icon + Animated Arrow */}
              <View style={styles.cardTopRow}>
                <View style={styles.iconCircle}>
                  <Ionicons
                    name="airplane"
                    size={24}
                    color={DESIGN.colors.textInverse}
                    style={{ transform: [{ rotate: "-45deg" }] }}
                  />
                </View>
                <AnimatedArrow />
              </View>

              {/* Middle Row: Main Text */}
              <View style={styles.cardTextContent}>
                <Text style={styles.cardTitle}>{t("post_trip")}</Text>
                {/* REMOVED numberOfLines={2} to prevent truncation if space allows */}
                <Text style={styles.cardDescription}>
                  {t("post_trip_desc")}
                </Text>
              </View>

              {/* Bottom Row: Animated Feature Pills */}
              <View style={styles.pillsRow}>
                <Animated.View
                  entering={FadeInRight.delay(500).springify()}
                  style={styles.pill}
                >
                  <Feather name="dollar-sign" size={12} color="#FFFFFF" />
                  <Text style={styles.pillText}>{t("earn_money")}</Text>
                </Animated.View>
                <Animated.View
                  entering={FadeInRight.delay(600).springify()}
                  style={styles.pill}
                >
                  <Feather name="users" size={12} color="#FFFFFF" />
                  <Text style={styles.pillText}>{t("meet_locals")}</Text>
                </Animated.View>
              </View>

              {/* Lottie Background Decoration */}
              <View style={styles.lottieContainer}>
                <LottieView
                  source={require("@/assets/animations/trip-create-animation.json")}
                  style={styles.lottieBg}
                  autoPlay
                  loop
                  speed={0.5}
                />
              </View>
            </LinearGradient>
          </Card3D>

          {/* REPLACED: AnimatedDivider -> OrSeparator (Airbnb binary-choice pattern) */}
          <OrSeparator />

          {/* --- OPTION 2: REQUESTER CARD --- */}
          <Card3D
            onPress={() => handleNavigation("/orders")}
            style={[
              styles.cardShadow,
              DESIGN.shadow.colored(DESIGN.colors.accent),
            ]}
            delay={450}
            accessibilityLabel={t("make_request")}
          >
            <LinearGradient
              colors={DESIGN.colors.accentGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.card}
            >
              {/* Accent Shimmer Strip */}
              <CardAccentShimmer />

              {/* Shine Effect Overlay */}
              <LinearGradient
                colors={["rgba(255,255,255,0.12)", "transparent"]}
                style={styles.shineOverlay}
              />

              <View style={styles.cardTopRow}>
                <View style={styles.iconCircle}>
                  <MaterialCommunityIcons
                    name="shopping"
                    size={24}
                    color={DESIGN.colors.textInverse}
                  />
                </View>
                <AnimatedArrow />
              </View>

              <View style={styles.cardTextContent}>
                <Text style={styles.cardTitle}>{t("make_request")}</Text>
                {/* REMOVED numberOfLines={2} */}
                <Text style={styles.cardDescription}>
                  {t("make_request_desc")}
                </Text>
              </View>

              <View style={styles.pillsRow}>
                <Animated.View
                  entering={FadeInRight.delay(650).springify()}
                  style={styles.pill}
                >
                  <Feather name="globe" size={12} color="#FFFFFF" />
                  <Text style={styles.pillText}>{t("shop_global")}</Text>
                </Animated.View>
                <Animated.View
                  entering={FadeInRight.delay(750).springify()}
                  style={styles.pill}
                >
                  <Feather name="shield" size={12} color="#FFFFFF" />
                  <Text style={styles.pillText}>{t("secure_escrow")}</Text>
                </Animated.View>
              </View>

              {/* Lottie Background Decoration */}
              <View style={styles.lottieContainer}>
                <LottieView
                  source={require("@/assets/animations/request-create-animation.json")}
                  style={styles.lottieBg}
                  autoPlay
                  loop
                  speed={0.5}
                />
              </View>
            </LinearGradient>
          </Card3D>
        </View>

        {/* FOOTER: Removed "Trust" text to prevent visual clutter and overlap */}
      </View>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  // Structure
  container: {
    flex: 1,
    backgroundColor: DESIGN.colors.background,
  },
  contentContainer: {
    flex: 1, // Ensures full height usage
    paddingHorizontal: DESIGN.spacing.lg,
    // paddingTop/Bottom handled via inline styles using SafeAreaInsets + TabBar Height
  },

  // === HEADER ===
  // Cleaned up: Removed badge styles, simple title.
  header: {
    marginBottom: DESIGN.spacing.sm,
    // Reduced height requirement, letting it flow naturally
  },
  headerTitle: {
    fontSize: 30, // Reduced from 32
    fontWeight: "800",
    color: DESIGN.colors.textPrimary,
    letterSpacing: -1,
  },

  // === GRID LAYOUT ===
  gridContainer: {
    flex: 1, // Crucial: This pushes the cards to fill available space
    gap: DESIGN.spacing.md, // Clean gap handling
  },

  // === CARD STYLING ===
  cardShadow: {
    flex: 1, // Crucial: Each card takes 50% of the gridContainer
    borderRadius: DESIGN.radius.xl,
    backgroundColor: DESIGN.colors.surface,
  },
  card: {
    flex: 1,
    borderRadius: DESIGN.radius.xl,
    // FIX: Reduced padding from lg (24) to 20 to give text more room
    padding: 20,
    justifyContent: "space-between",
    position: "relative",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: DESIGN.colors.glassBorder,
  },

  // Shine Effect Overlay
  shineOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    opacity: 0.5,
  },

  // === ACCENT SHIMMER ===
  accentShimmerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    overflow: "hidden",
    borderTopLeftRadius: DESIGN.radius.xl,
    borderTopRightRadius: DESIGN.radius.xl,
    zIndex: 1,
  },
  accentShimmerBar: {
    width: 100,
    height: "100%",
  },

  // === CARD INTERNAL LAYOUT ===
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  // Icon Styles
  iconCircle: {
    width: 44, // FIX: Reduced from 48 to 44 to save vertical space
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  arrowCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },

  // Typography inside Cards
  cardTextContent: {
    marginTop: DESIGN.spacing.xs, // FIX: Reduced marginTop from sm to xs
    flexShrink: 1,
  },
  cardTitle: {
    fontSize: 24, // FIX: Reduced from 26 to 24
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4, // FIX: Reduced from sm (8) to 4
    letterSpacing: -0.5,
  },
  cardDescription: {
    fontSize: 14, // FIX: Reduced from 15 to 14
    color: "rgba(255,255,255,0.95)",
    lineHeight: 20, // FIX: Reduced line height
    fontWeight: "500",
    maxWidth: "95%",
  },

  // Feature Pills
  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: DESIGN.spacing.sm,
    marginTop: "auto",
    paddingTop: DESIGN.spacing.sm, // Add a little breathing room from text
    flexShrink: 0,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  pillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  // Lottie Background Decoration
  lottieContainer: {
    position: "absolute",
    right: -20,
    bottom: -20,
    width: 140,
    height: 140,
    opacity: 0.15,
    transform: [{ rotate: "-10deg" }],
  },
  lottieBg: {
    width: 140,
    height: 140,
  },

  // === "OR" SEPARATOR ===
  orContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8, // FIX: Reduced vertical padding for separator
    gap: DESIGN.spacing.md,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: DESIGN.colors.divider,
  },
  orBadge: {
    paddingHorizontal: DESIGN.spacing.md,
    paddingVertical: 2, // Compact badge
    borderRadius: DESIGN.radius.full,
    backgroundColor: DESIGN.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: DESIGN.colors.border,
  },
  orText: {
    fontSize: 13,
    fontWeight: "600",
    color: DESIGN.colors.textSecondary,
    textTransform: "lowercase",
  },
});
