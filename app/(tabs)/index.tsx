/**
 * PeykLink Home Screen - Premium Airbnb + Logistics Design 2026
 *
 * Features:
 * - Scroll-driven header animations (Brand collapses, Search persists)
 * - Sticky search bar and tabs
 * - Premium shimmer skeleton loading
 * - 3D card interactions
 * - Modern gradient accents
 * - Micro-interactions everywhere
 *
 * * UPGRADES 2026:
 * - [REMOVED] Replaced FlatList with Shopify FlashList for 60fps performance -> Reverted to FlatList for stability
 * - Replaced Vector Icons with Lucide (Cleaner strokes)
 * - Added React Native Skia for True Glassmorphism (BackdropBlur)
 * - Fixed Header Jitter using Absolute Positioning + Content Padding technique
 * - OVERHAUL: Header layout animates heights to remove whitespace
 * - OVERHAUL: Logo redesigned with Skia
 *
 * * FIXES & REQUESTS (implemented by Senior Dev):
 * - [FIX] MOVED "Recent Travelers" Header into Absolute Wrapper to fix "Space Bug"
 * - [REMOVED] Added Scroll-To-Top logic when clearing filters -> Removed per request, replaced with FAB
 * - [UPGRADE] "Popular Cities" redesigned to "Cubic 3D Glass" style (Airbnb 2026 trend)
 * - [FIX] Recalculated Header Heights to ensure sticky tabs sit flush
 * - Logo moved to LEFT (Modern Standard) and made larger
 * - Replaced "Product Categories" with "Popular Cities" (Logic Pivot)
 * - Removed whitespace between Tabs and Feed
 * - Added Double-Tap to Scroll Top logic on Tabs
 * - [NEW] KeyboardAvoidingView added to Search Modal
 * - [FIX] FAB moved up by +70px to escape bottom Nav Bar occlusion
 * - [OVERHAUL] Search Modal merged with SearchBar.tsx styles. LayoutAnimation removed for 100% stability.
 * - [OVERHAUL] Search Pill redesigned to match Airbnb exactly ("Where to?" + "Anywhere")
 * - [OVERHAUL] Header Scroll logic smoothed out with TranslateY.
 * - [FIX] SV Senior Dev: Fixed 1:1 Scroll Interpolation Math to completely remove whitespace void under tabs.
 * - [FIX] SV Senior Dev: Bound Skia Canvas backdrop height to scrollY to prevent blurring feed items.
 * * * PRESENTATION DAY FIXES (SV Senior Dev):
 * - [FIX] Added missing `Image` import from react-native.
 * - [FIX] Added missing `cityBackgroundImage` and `imageOverlay` styles.
 * - [UPGRADE] Added true Airbnb "Ambient + Key Light" dual-shadow system to DESIGN and components.
 * - [FIX] Added conditional `{safeCity.image && ...}` rendering to prevent crash on "Anywhere" card.
 * - [FIX] Resolved Heterogeneous Union TS Errors in map loop using targeted permissive casting (`DestinationShape`).
 * - [UPDATE] Commented out Skia ModernLogo, replaced with Image placeholder `BrandLogo`.
 * - [UPDATE] Increased `LOGO_AREA_HEIGHT` to 84px to add generous padding around custom asset logo.
 */

import Request from "@/components/Request";
import Trip from "@/components/Trip";
import { City, cityData } from "@/constants/cityData";
import { api } from "@/convex/_generated/api";

// [NEW] Lucide Icons - Replacing Feather/Ionicons for standard modern look
import {
  ArrowUp,
  ArrowUpLeft,
  Circle,
  MapPin,
  Package,
  Plane,
  Search,
  X,
  XCircle,
} from "lucide-react-native";

import { useQuery } from "convex/react";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image, // [FIX SV Senior Dev] Added critical missing import for images
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import CountryFlag from "react-native-country-flag";
import Animated, {
  Easing,
  Extrapolation,
  FadeIn,
  FadeInDown,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import {
  BackdropBlur,
  Canvas,
  Fill,
  Rect,
  RoundedRect,
  LinearGradient as SkiaLinearGradient,
  vec,
} from "@shopify/react-native-skia";

// === TRANSLATION ===
import "@/i18n";
import { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

// ============================================================================
// DESIGN SYSTEM - Premium 2026
// ============================================================================
const DESIGN = {
  colors: {
    background: "#FFFFFF",
    backgroundSecondary: "#F7F7F7",
    backgroundTertiary: "#F0F0F0",
    surface: "#FFFFFF",
    textPrimary: "#111827", // [CHANGED] Merged from SearchBar.tsx
    textSecondary: "#6B7280", // [CHANGED] Merged from SearchBar.tsx
    textTertiary: "#9CA3AF",
    textInverse: "#FFFFFF",
    brand: "#FF385C",
    brandLight: "rgba(255, 56, 92, 0.1)",
    brandGradient: ["#FF385C", "#E31C5F"] as const,
    accent: "#00A699",
    accentLight: "rgba(0, 166, 153, 0.1)",
    accentGradient: ["#00A699", "#008489"] as const,
    border: "#E8E8E8",
    shimmer: "#E8E8E8",
    shimmerHighlight: "#F5F5F5",
    inputBg: "#F3F4F6", // [NEW] Merged from SearchBar.tsx
    primaryBlue: "#3B82F6", // [NEW] For Origin Pin
    secondaryGreen: "#10B981", // [NEW] For Dest Pin
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
      shadowColor: "rgba(50, 50, 93, 0.15)", // [CHANGED] Merged from SearchBar.tsx
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 5,
    },
    // [OVERHAUL SV Senior Dev] Airbnb Ambient + Key Light dual-shadow system
    airbnbAmbient: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.04,
      shadowRadius: 24,
      elevation: 2, // Soft wide base on Android
    },
    airbnbKey: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
      elevation: 6, // Sharp immediate edge on Android
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
// DATA: POPULAR CITIES
// ============================================================================
const POPULAR_DESTINATIONS = [
  {
    id: "istanbul",
    name: "Istanbul",
    image: require("@/assets/images/destinations/istanbul.png"),
  },
  {
    id: "berlin",
    name: "Berlin",
    image: require("@/assets/images/destinations/berlin.png"),
  },
  {
    id: "newyork",
    name: "New York",
    image: require("@/assets/images/destinations/new-york.png"),
  },
  {
    id: "paris",
    name: "Paris",
    image: require("@/assets/images/destinations/paris.png"),
  },
  {
    id: "tokyo",
    name: "Tokyo",
    image: require("@/assets/images/destinations/tokyo.png"),
  },
  {
    id: "moscow",
    name: "Moscow",
    image: require("@/assets/images/destinations/moscow.png"),
  },
] as const;

type TabType = "trips" | "requests";
type CityId = (typeof POPULAR_DESTINATIONS)[number]["id"];

// [NEW SV Senior Dev] Permissive shape to fix TypeScript Union errors when mapping
type DestinationShape = {
  id: string;
  name: string;
  image?: any;
  icon?: any;
  countryCode?: string | null;
};

interface SearchModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: () => void;
  originSearch: string;
  setOriginSearch: (text: string) => void;
  destinationSearch: string;
  setDestinationSearch: (text: string) => void;
  t: TFunction;
}

// ============================================================================
// ANIMATED SHIMMER COMPONENTS
// ============================================================================
const ShimmerEffect: React.FC<{
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: any;
}> = ({ width, height, borderRadius = DESIGN.radius.sm, style }) => {
  const shimmerTranslate = useSharedValue(-1);

  React.useEffect(() => {
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
          width: width as any,
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
      <ShimmerEffect width={48} height={48} borderRadius={24} />
      <View style={styles.skeletonHeaderText}>
        <ShimmerEffect width={120} height={14} />
        <ShimmerEffect width={80} height={10} style={{ marginTop: 6 }} />
      </View>
      <ShimmerEffect width={60} height={26} borderRadius={13} />
    </View>
    <View style={styles.skeletonRoute}>
      <ShimmerEffect width={60} height={44} borderRadius={8} />
      <ShimmerEffect width={100} height={8} />
      <ShimmerEffect width={60} height={44} borderRadius={8} />
    </View>
    <ShimmerEffect
      width="100%"
      height={52}
      borderRadius={DESIGN.radius.md}
      style={{ marginTop: 16 }}
    />
  </Animated.View>
);

const SkeletonLoader: React.FC = () => (
  <View style={styles.skeletonContainer}>
    {[0, 1, 2].map((i) => (
      <SkeletonCard key={i} index={i} />
    ))}
  </View>
);

// ============================================================================
// 3D PRESSABLE CARD COMPONENT
// ============================================================================
const Card3D: React.FC<{
  children: React.ReactNode;
  onPress?: () => void;
  style?: any;
  disabled?: boolean;
}> = ({ children, onPress, style, disabled }) => {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scale.value = withSpring(0.95, { damping: 10, stiffness: 300 });
  };

  const handlePressOut = () => {
    if (disabled) return;
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
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
      <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
    </Pressable>
  );
};

// ============================================================================
// LOGO COMPONENT
// ============================================================================
/* [UPDATE SV Senior Dev] Commented out old Skia logo per your request, preserving code.
const ModernLogo = () => (
  <View style={{ width: 34, height: 34 }}>
    <Canvas style={{ flex: 1 }}>
      <RoundedRect x={0} y={0} width={34} height={34} r={10}>
        <SkiaLinearGradient
          start={vec(0, 0)}
          end={vec(34, 34)}
          colors={["#FF385C", "#E31C5F"]}
        />
      </RoundedRect>
      <RoundedRect x={8} y={8} width={18} height={4} r={2} color="white" />
      <RoundedRect x={8} y={8} width={4} height={18} r={2} color="white" />
      <RoundedRect x={8} y={15} width={14} height={4} r={2} color="white" />
      <RoundedRect x={18} y={8} width={4} height={11} r={2} color="white" />
    </Canvas>
  </View>
);
*/

// [NEW SV Senior Dev] Image placeholder for your custom logo asset
const BrandLogo = () => (
  <View style={styles.logoContainer}>
    <Image
      // 👇 Drop your image in the assets folder and update this path!
      source={require("@/assets/images/logo.png")}
      style={styles.customLogoImage}
    />
  </View>
);

// ============================================================================
// EMPTY STATE COMPONENT
// ============================================================================
const EmptyState: React.FC<{
  type: TabType;
  t: TFunction;
  onCreatePress?: () => void;
}> = ({ type, t, onCreatePress }) => {
  const isTrips = type === "trips";
  const gradientColors = isTrips
    ? DESIGN.colors.brandGradient
    : DESIGN.colors.accentGradient;
  const lightColor = isTrips
    ? DESIGN.colors.brandLight
    : DESIGN.colors.accentLight;
  const IconComponent = isTrips ? Plane : Package;
  const displayType = isTrips
    ? t("trips").toLowerCase()
    : t("requests").toLowerCase();

  const buttonScale = useSharedValue(1);

  const handlePressIn = () => (buttonScale.value = withSpring(0.95));
  const handlePressOut = () => (buttonScale.value = withSpring(1));
  const buttonAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  return (
    <Animated.View entering={FadeIn.springify()} style={styles.emptyContainer}>
      <LinearGradient
        colors={[lightColor, "transparent"]}
        style={styles.emptyGradient}
      />
      <View style={[styles.emptyIconCircle, { backgroundColor: lightColor }]}>
        <IconComponent
          size={40}
          color={isTrips ? DESIGN.colors.brand : DESIGN.colors.accent}
        />
      </View>
      <Text style={styles.emptyTitle}>
        {t("no_items_found", { type: displayType })}
      </Text>
      <Text style={styles.emptySubtitle}>
        {t("no_items_subtitle", { type: displayType })}
      </Text>
      {onCreatePress && (
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={onCreatePress}
        >
          <Animated.View style={buttonAnimStyle}>
            <LinearGradient
              colors={gradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.emptyActionButton}
            >
              <Text
                style={{
                  color: DESIGN.colors.textInverse,
                  fontSize: 18,
                  marginRight: 4,
                }}
              >
                +
              </Text>
              <Text style={styles.emptyActionText}>
                {/* FIXED: Mapped properly to json hierarchy */}
                {isTrips
                  ? t("empty_states.create_trip")
                  : t("empty_states.create_request")}
              </Text>
            </LinearGradient>
          </Animated.View>
        </Pressable>
      )}
    </Animated.View>
  );
};

// ============================================================================
// SEARCH MODAL COMPONENT [OVERHAULED TO MATCH SEARCHBAR.TSX]
// ============================================================================
const SearchModal: React.FC<SearchModalProps> = ({
  visible,
  onClose,
  onApply,
  originSearch,
  setOriginSearch,
  destinationSearch,
  setDestinationSearch,
  t,
}) => {
  const [activeField, setActiveField] = useState<"origin" | "destination">(
    "origin",
  );

  const getSuggestions = (): City[] => {
    const query = activeField === "origin" ? originSearch : destinationSearch;
    if (!query || query.length < 1) return [];
    return cityData
      .filter(
        (city) =>
          city.name.toLowerCase().startsWith(query.toLowerCase()) ||
          city.country.toLowerCase().startsWith(query.toLowerCase()),
      )
      .slice(0, 6);
  };

  const suggestions = getSuggestions();

  const handleSelectCity = (city: City) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (activeField === "origin") {
      setOriginSearch(city.name);
      setActiveField("destination");
    } else {
      setDestinationSearch(city.name);
    }
  };

  const handleClear = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOriginSearch("");
    setDestinationSearch("");
    setActiveField("origin");
  };

  const handleApply = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onApply();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        {/* Simple Modal Header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.modalCloseBtn}
            accessibilityLabel={t("close")}
          >
            <X size={24} color={DESIGN.colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            style={styles.modalBody}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* [OVERHAUL SV Senior Dev] The Elevated Card wrapped in ambient shadow for dual layer effect */}
            <View
              style={[
                styles.expandedWrapperAmbient,
                DESIGN.shadow.airbnbAmbient,
              ]}
            >
              <View style={[styles.expandedWrapper, DESIGN.shadow.airbnbKey]}>
                <View style={styles.expandedHeader}>
                  <Text style={styles.headerTitle}>{t("filter_route")}</Text>
                  <TouchableOpacity onPress={handleClear}>
                    <Text style={styles.cancelText}>{t("clear")}</Text>
                  </TouchableOpacity>
                </View>

                {/* Origin Input */}
                <View
                  style={[
                    styles.inputRow,
                    activeField === "origin" && styles.inputRowActive,
                  ]}
                >
                  <Circle
                    size={14}
                    color={DESIGN.colors.primaryBlue}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.modalInput}
                    placeholder={t("origin_city")}
                    placeholderTextColor={DESIGN.colors.textTertiary}
                    value={originSearch}
                    onChangeText={setOriginSearch}
                    onFocus={() => setActiveField("origin")}
                    autoFocus
                  />
                  {originSearch.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setOriginSearch("")}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <XCircle size={18} color={DESIGN.colors.textTertiary} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Destination Input */}
                <View
                  style={[
                    styles.inputRow,
                    activeField === "destination" && styles.inputRowActive,
                  ]}
                >
                  <MapPin
                    size={16}
                    color={DESIGN.colors.secondaryGreen}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.modalInput}
                    placeholder={t("destination_city")}
                    placeholderTextColor={DESIGN.colors.textTertiary}
                    value={destinationSearch}
                    onChangeText={setDestinationSearch}
                    onFocus={() => setActiveField("destination")}
                  />
                  {destinationSearch.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setDestinationSearch("")}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <XCircle size={18} color={DESIGN.colors.textTertiary} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>

            {/* Suggestions (Cleaned up to match new style) */}
            {suggestions.length > 0 && (
              <Animated.View
                entering={FadeInDown.springify()}
                style={styles.suggestionsContainer}
              >
                {suggestions.map((city, index) => (
                  <TouchableOpacity
                    key={`${city.name}-${index}`}
                    style={styles.suggestionItem}
                    onPress={() => handleSelectCity(city)}
                  >
                    <CountryFlag
                      isoCode={city.countryCode || "US"}
                      size={16}
                      style={{ marginRight: 16, borderRadius: 2 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.suggestionCityText}>
                        {t(city.name)}
                      </Text>
                      <Text style={styles.suggestionCountryText}>
                        {t(city.country)}
                      </Text>
                    </View>
                    <ArrowUpLeft size={16} color={DESIGN.colors.textTertiary} />
                  </TouchableOpacity>
                ))}
              </Animated.View>
            )}
          </ScrollView>

          {/* Apply Button */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={handleApply}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={DESIGN.colors.brandGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.applyButtonGradient}
              >
                <Search size={20} color={DESIGN.colors.textInverse} />
                <Text style={styles.applyButtonText}>{t("search")}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function Index() {
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nextLang = i18n.language?.startsWith("en") ? "tr" : "en";
    i18n.changeLanguage(nextLang);
  };

  const [activeTab, setActiveTab] = useState<TabType>("trips");
  const [originSearch, setOriginSearch] = useState("");
  const [destinationSearch, setDestinationSearch] = useState("");
  const [selectedCity, setSelectedCity] = useState<CityId | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const lastTapRef = useRef<number>(0);

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // === HEADER LAYOUT CONSTANTS ===
  // [FIX SV Senior Dev] Increased from 60 to 84 to give logo breathing room before scroll collapse
  const LOGO_AREA_HEIGHT = 84;
  const SEARCH_AREA_HEIGHT = 68;
  const CITY_AREA_HEIGHT = 150;
  const TABS_AREA_HEIGHT = 56;
  const SECTION_HEADER_HEIGHT = 48;
  const STATUS_BAR =
    Platform.OS === "android" ? StatusBar.currentHeight || 24 : 0;

  const HEADER_FULL_HEIGHT =
    STATUS_BAR +
    LOGO_AREA_HEIGHT +
    SEARCH_AREA_HEIGHT +
    CITY_AREA_HEIGHT +
    TABS_AREA_HEIGHT +
    SECTION_HEADER_HEIGHT;

  // [FIX] 1. Logo Animation Math Synced 1:1 with Scroll to eliminate void
  const logoAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, LOGO_AREA_HEIGHT * 0.8], // Fades out slightly before fully collapsed
      [1, 0],
      Extrapolation.CLAMP,
    );
    const translateY = interpolate(
      scrollY.value,
      [0, LOGO_AREA_HEIGHT],
      [0, -20], // Smoother upward shift
      Extrapolation.CLAMP,
    );
    // [FIX] 1:1 Height reduction vs Scroll
    const height = interpolate(
      scrollY.value,
      [0, LOGO_AREA_HEIGHT],
      [LOGO_AREA_HEIGHT, 0],
      Extrapolation.CLAMP,
    );
    return {
      height,
      opacity,
      transform: [{ translateY }],
      overflow: "hidden",
    };
  });

  // [FIX] 2. City Chips Animation Math Synced 1:1 (Starts exactly when Logo finishes)
  const cityAnimatedStyle = useAnimatedStyle(() => {
    // [FIX] 1:1 Height reduction vs Scroll
    const height = interpolate(
      scrollY.value,
      [LOGO_AREA_HEIGHT, LOGO_AREA_HEIGHT + CITY_AREA_HEIGHT],
      [CITY_AREA_HEIGHT, 0],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      scrollY.value,
      [LOGO_AREA_HEIGHT, LOGO_AREA_HEIGHT + CITY_AREA_HEIGHT * 0.6],
      [1, 0],
      Extrapolation.CLAMP,
    );
    return { height, opacity, overflow: "hidden" };
  });

  // [FIX] 3. Dynamic Backdrop bounds to prevent Skia from blurring the scrolling feed
  const headerBgAnimatedStyle = useAnimatedStyle(() => {
    const totalCollapsibleHeight = LOGO_AREA_HEIGHT + CITY_AREA_HEIGHT;
    const height = interpolate(
      scrollY.value,
      [0, totalCollapsibleHeight], // 0 to 234
      [HEADER_FULL_HEIGHT, HEADER_FULL_HEIGHT - totalCollapsibleHeight], // Shrinks container physically
      Extrapolation.CLAMP,
    );
    return { height };
  });

  const searchContainerStyle = useAnimatedStyle(() => {
    return { zIndex: 10 };
  });

  // [FIX] 5. FAB Animation Style - Moves out of the way of the nav bar
  const fabAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [300, 400],
      [0, 1],
      Extrapolation.CLAMP,
    );
    const translateY = interpolate(
      scrollY.value,
      [300, 400],
      [20, 0],
      Extrapolation.CLAMP,
    );
    const pointerEvents = scrollY.value > 350 ? "auto" : "none";
    return {
      opacity,
      transform: [{ translateY }],
      pointerEvents: pointerEvents as any,
    };
  });

  const trips = useQuery(api.trips.getFeedTrips);
  const requests = useQuery(api.requests.getFeedRequests);

  const onRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  }, []);

  const handleTabChange = (tab: TabType) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (activeTab === tab && now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    } else if (activeTab !== tab) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setActiveTab(tab);
      setSelectedCity(null);
    }
    lastTapRef.current = now;
  };

  const handleCitySelect = (cityId: CityId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCity(selectedCity === cityId ? null : cityId);
  };

  const scrollToTop = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const openSearchModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsSearchModalOpen(true);
  };

  const closeSearchModal = () => {
    setIsSearchModalOpen(false);
    Keyboard.dismiss();
  };

  const handleSearchApply = () => {
    closeSearchModal();
  };

  if (trips === undefined || requests === undefined) {
    return (
      <View style={styles.container}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="transparent"
          translucent
        />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingHeader}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 20,
                paddingHorizontal: 24,
              }}
            >
              <ShimmerEffect width={34} height={34} borderRadius={10} />
              <ShimmerEffect
                width={120}
                height={24}
                style={{ marginLeft: 10 }}
              />
            </View>
            <ShimmerEffect
              width={SCREEN_WIDTH - 48}
              height={56}
              borderRadius={DESIGN.radius.full}
              style={{ marginHorizontal: 24 }}
            />
          </View>
          <SkeletonLoader />
        </SafeAreaView>
      </View>
    );
  }

  type TripType = (typeof trips)[number];
  type RequestType = (typeof requests)[number];
  const isTripsActive = activeTab === "trips";

  const filterItem = (item: TripType | RequestType) => {
    const matchesOrigin =
      originSearch === "" ||
      item.originCity.toLowerCase().includes(originSearch.toLowerCase());
    const matchesDest =
      destinationSearch === "" ||
      item.destinationCity
        .toLowerCase()
        .includes(destinationSearch.toLowerCase());
    let matchesCity = true;
    if (selectedCity) {
      const cityData = POPULAR_DESTINATIONS.find((c) => c.id === selectedCity);
      if (cityData) {
        const cityQuery = cityData.name.toLowerCase();
        const origin = item.originCity.toLowerCase();
        const dest = item.destinationCity.toLowerCase();
        matchesCity = origin.includes(cityQuery) || dest.includes(cityQuery);
      }
    }
    return matchesOrigin && matchesDest && matchesCity;
  };

  const filteredTrips = trips.filter(filterItem);
  const filteredRequests = requests.filter(filterItem);
  const dataToRender = isTripsActive ? filteredTrips : filteredRequests;

  const getSearchDisplayText = () => {
    if (originSearch && destinationSearch)
      return `${originSearch} → ${destinationSearch}`;
    if (originSearch) return `${t("from")} ${originSearch}`;
    if (destinationSearch) return `${t("to")} ${destinationSearch}`;
    return t("where_to"); // [CHANGED] Updated to Airbnb standard
  };

  const hasActiveFilters = originSearch || destinationSearch;

  const renderFeedItem = ({ item }: any) => (
    <View style={styles.feedItemWrapper}>
      {isTripsActive ? (
        <Trip trip={item as TripType} />
      ) : (
        <Request request={item as RequestType} />
      )}
    </View>
  );

  const renderStickySectionHeader = () => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        <View
          style={[
            styles.sectionIcon,
            {
              backgroundColor: isTripsActive
                ? DESIGN.colors.brandLight
                : DESIGN.colors.accentLight,
            },
          ]}
        >
          {isTripsActive ? (
            <Plane size={16} color={DESIGN.colors.brand} />
          ) : (
            <Package size={16} color={DESIGN.colors.accent} />
          )}
        </View>
        <Text style={styles.sectionTitle}>
          {isTripsActive ? t("recent_travelers") : t("recent_requests")}
        </Text>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{dataToRender.length}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      <View style={styles.absoluteHeaderWrapper}>
        {/* [FIX] Dynamic Animated Header Backdrop to stop Canvas from bleeding over the feed */}
        <Animated.View style={[styles.headerBackground, headerBgAnimatedStyle]}>
          <Canvas style={{ flex: 1 }}>
            <Rect
              x={0}
              y={0}
              width={SCREEN_WIDTH}
              height={HEADER_FULL_HEIGHT}
              color="rgba(255,255,255,0.85)"
            />
            <BackdropBlur blur={20}>
              <Fill color="rgba(255, 255, 255, 0.4)" />
            </BackdropBlur>
          </Canvas>
          <View style={styles.headerBorderBottom} />
        </Animated.View>

        <SafeAreaView>
          {/* 1. BRAND HEADER */}
          <Animated.View
            style={[styles.brandHeaderContainer, logoAnimatedStyle]}
          >
            <View style={styles.brandHeaderContent}>
              {/* [UPDATE SV Senior Dev] Replaced Skia component with Image Placeholder */}
              <BrandLogo />
              <Text style={styles.brandTitle}>PeykLink</Text>
              <TouchableOpacity
                style={styles.langButton}
                onPress={toggleLanguage}
                activeOpacity={0.8}
              >
                <Text style={styles.langButtonText}>
                  {i18n.language?.startsWith("en") ? "EN" : "TR"}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* 2. SEARCH PILL [OVERHAUL: AIRBNB STYLE] */}
          {/* [UPGRADE SV Senior Dev] Applied Dual Layer Shadow wrapper to search container */}
          <Animated.View
            style={[searchContainerStyle, DESIGN.shadow.airbnbAmbient]}
          >
            <TouchableOpacity
              style={[styles.searchPill, DESIGN.shadow.airbnbKey]}
              onPress={openSearchModal}
              activeOpacity={0.9}
            >
              <Search
                size={20}
                color={DESIGN.colors.textPrimary}
                style={{ marginRight: 14 }}
              />
              <View style={styles.searchPillContent}>
                <Text style={styles.searchPillTitle}>
                  {getSearchDisplayText()}
                </Text>
                <Text style={styles.searchPillSubtitle}>
                  {hasActiveFilters
                    ? t("tap_to_edit")
                    : t("anywhere_any_route")}
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* 3. POPULAR CITIES */}
          <Animated.View style={cityAnimatedStyle}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cityContainer}
            >
              {POPULAR_DESTINATIONS.map((city) => {
                const isSelected = selectedCity === city.id;

                // [FIX SV Senior Dev] Safe type casting for dynamic mapping of Heterogeneous Union keys
                const safeCity = city as DestinationShape;
                const IconComp = safeCity.icon;

                return (
                  // [UPGRADE SV Senior Dev] Outer wrapper gets Ambient shadow, Inner Card3D gets Key Shadow
                  <View key={city.id} style={DESIGN.shadow.airbnbAmbient}>
                    <Card3D
                      onPress={() => handleCitySelect(city.id)} // [NOTE] city.id remains strictly typed!
                      style={[
                        styles.cubicCityCard,
                        DESIGN.shadow.airbnbKey, // Applies tight edge shadow
                        isSelected && styles.cubicCityCardActive,
                      ]}
                    >
                      {/* Background Image [FIX SV Senior Dev] Wrapped safely using DestinationShape interface */}
                      {safeCity.image && (
                        <View style={StyleSheet.absoluteFill}>
                          <Image
                            source={safeCity.image}
                            style={styles.cityBackgroundImage}
                            resizeMode="cover"
                          />
                          {/* [FIX SV Senior Dev] Dark overlay defined in styles to make text more readable */}
                          <View style={styles.imageOverlay} />
                        </View>
                      )}

                      {/* Your existing Skia Selection Gradient */}
                      {isSelected && (
                        <View style={StyleSheet.absoluteFill}>
                          <Canvas style={{ flex: 1 }}>
                            <RoundedRect
                              x={0}
                              y={0}
                              width={100}
                              height={120}
                              r={16}
                            >
                              <SkiaLinearGradient
                                start={vec(0, 0)}
                                end={vec(100, 120)}
                                colors={[
                                  "rgba(255, 56, 92, 0.8)",
                                  "rgba(227, 28, 95, 0.8)",
                                ]}
                              />
                            </RoundedRect>
                          </Canvas>
                        </View>
                      )}

                      <View style={styles.cubicCityContent}>
                        {/* If it's the "Anywhere" card, you might still want the Icon */}
                        {!safeCity.image && IconComp && (
                          <IconComp
                            size={32}
                            color={isSelected ? "white" : "white"}
                          />
                        )}

                        <Text
                          style={[
                            styles.cubicCityText,
                            { color: "white" }, // Keep text white since it's over an image
                            isSelected && styles.cubicCityTextActive,
                          ]}
                        >
                          {t(city.name)}
                        </Text>
                      </View>
                    </Card3D>
                  </View>
                );
              })}
            </ScrollView>
          </Animated.View>

          {/* 4. TABS */}
          <View style={styles.tabBarContainer}>
            <View style={styles.tabBarInner}>
              <TouchableOpacity
                style={[styles.tabItem, isTripsActive && styles.tabItemActive]}
                onPress={() => handleTabChange("trips")}
                activeOpacity={0.8}
              >
                <Plane
                  size={16}
                  color={
                    isTripsActive
                      ? DESIGN.colors.textPrimary
                      : DESIGN.colors.textSecondary
                  }
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.tabText,
                    isTripsActive && styles.tabTextActive,
                  ]}
                >
                  {t("travelers")}
                </Text>
              </TouchableOpacity>
              <View style={styles.tabDivider} />
              <TouchableOpacity
                style={[styles.tabItem, !isTripsActive && styles.tabItemActive]}
                onPress={() => handleTabChange("requests")}
                activeOpacity={0.8}
              >
                <Package
                  size={16}
                  color={
                    !isTripsActive
                      ? DESIGN.colors.textPrimary
                      : DESIGN.colors.textSecondary
                  }
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.tabText,
                    !isTripsActive && styles.tabTextActive,
                  ]}
                >
                  {t("senders")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {renderStickySectionHeader()}
        </SafeAreaView>
      </View>

      <SafeAreaView style={styles.safeArea}>
        <AnimatedFlatList
          ref={flatListRef}
          data={dataToRender}
          renderItem={renderFeedItem}
          keyExtractor={(item: any) => item._id}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.flatListContent,
            { paddingTop: HEADER_FULL_HEIGHT },
          ]}
          ListEmptyComponent={<EmptyState type={activeTab} t={t} />}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={DESIGN.colors.brand}
              colors={[DESIGN.colors.brand]}
              progressViewOffset={HEADER_FULL_HEIGHT}
            />
          }
        />
      </SafeAreaView>

      {/* [FIX] FAB moved safely above Navigation Bar */}
      <Animated.View style={[styles.fabContainer, fabAnimatedStyle]}>
        <TouchableOpacity
          style={styles.fabButton}
          onPress={scrollToTop}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={DESIGN.colors.brandGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fabGradient}
          >
            <ArrowUp size={24} color={DESIGN.colors.textInverse} />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      <SearchModal
        visible={isSearchModalOpen}
        onClose={closeSearchModal}
        onApply={handleSearchApply}
        originSearch={originSearch}
        setOriginSearch={setOriginSearch}
        destinationSearch={destinationSearch}
        setDestinationSearch={setDestinationSearch}
        t={t}
      />
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DESIGN.colors.background },
  safeArea: { flex: 1 },
  shimmerGradient: { width: 200, height: "100%" },
  loadingHeader: {
    paddingTop:
      Platform.OS === "android"
        ? (StatusBar.currentHeight || 0) + DESIGN.spacing.sm + 10
        : DESIGN.spacing.md,
    paddingBottom: DESIGN.spacing.md,
    backgroundColor: DESIGN.colors.background,
  },
  absoluteHeaderWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  // [FIX] Added headerBackground container style to bound the Canvas visually
  headerBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: -1,
    overflow: "hidden", // Crucial: This explicitly cuts off the Skia canvas overflow
  },
  headerBorderBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "transparent",
  }, // Handled by glass effect natively now

  brandHeaderContainer: {
    justifyContent: "center",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0,
  },
  brandHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: DESIGN.spacing.lg,
    // [FIX SV Senior Dev] Increased height and added vertical padding for full visibility
    height: 84,
    paddingVertical: 12,
    gap: DESIGN.spacing.sm,
  },
  // [NEW SV Senior Dev] Container explicitly defining the box for your asset image
  logoContainer: {
    width: 40, // [UPDATE] Scaled down from 48 for a tighter, refined look
    height: 40, // [UPDATE] Scaled down from 48
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12, // [UPDATE] Added rounded edges (Squircle look)
    overflow: "hidden", // [UPDATE] Forces the image to respect the rounded corners
    backgroundColor: DESIGN.colors.surface, // Gives it a clean white base before image loads
    ...DESIGN.shadow.sm, // Adds a tiny drop shadow to make the rounded badge pop
  },
  // [NEW SV Senior Dev] Ensures the image scales elegantly
  customLogoImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover", // [CHANGED] Swapped to 'cover' so it completely fills the rounded box
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: DESIGN.colors.textPrimary,
    letterSpacing: -0.5,
  },

  // [OVERHAUL] AIRBNB STYLE SEARCH PILL
  searchPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: DESIGN.colors.surface,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginHorizontal: DESIGN.spacing.lg,
    marginVertical: 6,
    borderRadius: 30, // Fully rounded
  },
  searchPillContent: { flex: 1 },
  searchPillTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: DESIGN.colors.textPrimary,
  },
  searchPillSubtitle: {
    fontSize: 12,
    color: DESIGN.colors.textSecondary,
    marginTop: 2,
  },

  cityContainer: {
    paddingHorizontal: DESIGN.spacing.lg,
    paddingVertical: 10,
    gap: 16,
  },
  cubicCityCard: {
    width: 100,
    height: 120,
    backgroundColor: DESIGN.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: DESIGN.colors.border,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  cubicCityCardActive: {
    borderWidth: 0,
    ...DESIGN.shadow.colored(DESIGN.colors.brand),
  },
  // [FIX SV Senior Dev] Proper absolute styles to cover background
  cityBackgroundImage: {
    width: "100%",
    height: "100%",
  },
  // [FIX SV Senior Dev] Dark gradient/overlay so white text pops
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
  },
  cubicCityContent: { alignItems: "center", justifyContent: "center", gap: 12 },
  cubicFlagShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cubicCityText: {
    fontSize: 13,
    fontWeight: "600",
    color: DESIGN.colors.textSecondary,
    textAlign: "center",
    // [FIX SV Senior Dev] Extra text shadow to guarantee contrast
    textShadowColor: "rgba(0, 0, 0, 0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cubicCityTextActive: { color: "white", fontWeight: "700" },

  tabBarContainer: {
    paddingHorizontal: DESIGN.spacing.lg,
    paddingBottom: 4,
    paddingTop: 0,
  },
  tabBarInner: {
    flexDirection: "row",
    backgroundColor: DESIGN.colors.backgroundSecondary,
    borderRadius: DESIGN.radius.lg,
    padding: 4,
    alignItems: "center",
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: DESIGN.radius.md,
  },
  tabItemActive: {
    backgroundColor: DESIGN.colors.surface,
    ...DESIGN.shadow.sm,
    shadowOpacity: 0.05,
  },
  tabDivider: {
    width: 1,
    height: 16,
    backgroundColor: DESIGN.colors.border,
    marginHorizontal: 4,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: DESIGN.colors.textSecondary,
  },
  tabTextActive: { color: DESIGN.colors.textPrimary },

  sectionHeader: {
    paddingHorizontal: DESIGN.spacing.lg,
    paddingVertical: 12,
    backgroundColor: "transparent",
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: DESIGN.spacing.sm,
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: DESIGN.colors.textPrimary,
    flex: 1,
  },
  countBadge: {
    backgroundColor: DESIGN.colors.backgroundSecondary,
    paddingHorizontal: DESIGN.spacing.sm,
    paddingVertical: 2,
    borderRadius: DESIGN.radius.full,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: DESIGN.colors.textSecondary,
  },

  flatListContent: { paddingBottom: 120 },
  feedItemWrapper: { marginBottom: 0 },

  // [FIX] FAB positioned safely above standard bottom nav bars (110 on iOS)
  fabContainer: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 110 : 90,
    right: 24,
    zIndex: 999,
  },
  fabButton: {
    borderRadius: 28,
    ...DESIGN.shadow.colored(DESIGN.colors.brand),
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: DESIGN.spacing.xl,
    paddingVertical: DESIGN.spacing.xxl,
    marginHorizontal: DESIGN.spacing.lg,
    marginTop: DESIGN.spacing.lg,
    backgroundColor: DESIGN.colors.surface,
    borderRadius: DESIGN.radius.xl,
    borderWidth: 1,
    borderColor: DESIGN.colors.border,
    overflow: "hidden",
  },
  emptyGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: DESIGN.spacing.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: DESIGN.colors.textPrimary,
    textAlign: "center",
    marginBottom: DESIGN.spacing.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    color: DESIGN.colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: DESIGN.spacing.lg,
  },
  emptyActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: DESIGN.spacing.sm,
    paddingVertical: DESIGN.spacing.sm + 2,
    paddingHorizontal: DESIGN.spacing.lg,
    borderRadius: DESIGN.radius.full,
  },
  emptyActionText: {
    fontSize: 14,
    fontWeight: "600",
    color: DESIGN.colors.textInverse,
  },

  skeletonContainer: {
    paddingHorizontal: DESIGN.spacing.lg,
    paddingTop: DESIGN.spacing.lg,
  },
  skeletonCard: {
    backgroundColor: DESIGN.colors.surface,
    borderRadius: DESIGN.radius.lg,
    padding: DESIGN.spacing.md,
    marginBottom: DESIGN.spacing.md,
    borderWidth: 1,
    borderColor: DESIGN.colors.border,
  },
  skeletonHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: DESIGN.spacing.md,
  },
  skeletonHeaderText: { flex: 1, marginLeft: DESIGN.spacing.md },
  skeletonRoute: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: DESIGN.spacing.sm,
  },

  // [OVERHAUL] MODAL STYLES MERGED FROM SEARCHBAR.TSX
  modalContainer: {
    flex: 1,
    backgroundColor: DESIGN.colors.backgroundSecondary,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: DESIGN.spacing.md,
    paddingVertical: DESIGN.spacing.sm,
    backgroundColor: "transparent",
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DESIGN.colors.surface,
    borderRadius: 20,
    ...DESIGN.shadow.sm,
  },
  modalBody: {
    flex: 1,
    paddingTop: DESIGN.spacing.md,
    paddingHorizontal: DESIGN.spacing.lg,
  },

  // [ADDED SV Senior Dev] The outer Ambient shell for the Modal card
  expandedWrapperAmbient: {
    marginBottom: DESIGN.spacing.lg,
  },
  // The Card from SearchBar.tsx (Now acts as the Key layer)
  expandedWrapper: {
    backgroundColor: DESIGN.colors.surface,
    borderRadius: 20,
    padding: 20,
  },
  expandedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerTitle: {
    fontWeight: "700",
    fontSize: 20,
    color: DESIGN.colors.textPrimary,
  },
  cancelText: {
    color: DESIGN.colors.textSecondary,
    fontWeight: "600",
    fontSize: 14,
    textDecorationLine: "underline",
  },

  // The Inputs from SearchBar.tsx
  inputRow: {
    backgroundColor: DESIGN.colors.inputBg,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 52,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "transparent",
  },
  inputRowActive: {
    borderColor: DESIGN.colors.brand,
    backgroundColor: DESIGN.colors.surface,
    ...DESIGN.shadow.sm,
  },
  inputIcon: { marginRight: 12 },
  modalInput: {
    flex: 1,
    fontSize: 15,
    color: DESIGN.colors.textPrimary,
    fontWeight: "500",
  },

  // Suggestions matched to new style
  suggestionsContainer: {
    backgroundColor: DESIGN.colors.surface,
    borderRadius: 20,
    padding: 10,
    ...DESIGN.shadow.md,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DESIGN.colors.border,
  },
  suggestionCityText: {
    fontSize: 15,
    fontWeight: "600",
    color: DESIGN.colors.textPrimary,
  },
  suggestionCountryText: {
    fontSize: 13,
    color: DESIGN.colors.textSecondary,
    marginTop: 2,
  },

  modalFooter: {
    padding: DESIGN.spacing.lg,
    paddingBottom:
      Platform.OS === "ios" ? DESIGN.spacing.xl : DESIGN.spacing.lg,
    backgroundColor: DESIGN.colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: DESIGN.colors.border,
  },
  applyButton: {
    borderRadius: DESIGN.radius.md,
    overflow: "hidden",
    ...DESIGN.shadow.colored(DESIGN.colors.brand),
  },
  applyButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: DESIGN.spacing.md,
    gap: DESIGN.spacing.sm,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: DESIGN.colors.textInverse,
  },
  langButton: {
    marginLeft: "auto", // Pushes the button to the far right
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: DESIGN.colors.surface,
    borderRadius: 16, // Squircle look
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DESIGN.colors.border,
    ...DESIGN.shadow.airbnbKey, // Uses your SV Senior Dev shadow system
  },
  langButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: DESIGN.colors.textPrimary,
    letterSpacing: 0.5,
  },
});
