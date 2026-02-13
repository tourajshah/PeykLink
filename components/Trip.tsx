/**
 * Trip Component - Airbnb-Level Design (2026 Upgrade)
 * Displays a traveler's trip card in the PeykLink marketplace
 *
 * Design: Liquid Glass, Skia Shadows, Lucide Icons
 *
 * * SENIOR DEV FIXES:
 * - [CRITICAL] REMOVED `entering={FadeInDown}` prop. This was fighting with `useAnimatedStyle`
 * for control of the `transform` property, causing the infinite loop and crash.
 * - [CLEANUP] Removed `UIManager.setLayoutAnimationEnabledExperimental` (No-op in New Arch).
 * - [PERF] Kept Skia and Blur, but ensured animation logic is isolated to interaction only.
 */

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useUser } from "@clerk/clerk-expo";
// [CHANGED] Replacing standard icons with Lucide for 2026 aesthetics
// import { Feather, Ionicons } from "@expo/vector-icons";
import {
  ArrowRight,
  Briefcase,
  Calendar,
  Edit2,
  Plane,
  Star,
  Trash2,
} from "lucide-react-native";

import { useMutation, useQuery } from "convex/react";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  // [REMOVED] UIManager (Deprecated/No-op in New Arch)
  View,
  useWindowDimensions,
} from "react-native";
import CountryFlag from "react-native-country-flag";
// [MODIFIED] Added interaction hooks for the tactile "Squish" animation
import Animated, {
  // [REMOVED] FadeInDown (Caused Crash)
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

// [ADDED] 2026 Visual Stack
import {
  Canvas,
  RoundedRect,
  Shadow as SkiaShadow,
} from "@shopify/react-native-skia";
import { BlurView } from "expo-blur";

// === TRANSLATION ===
import { useTranslation } from "react-i18next";

// [SENIOR DEV NOTE] Removed UIManager block. It is a no-op in Expo 50+ / New Architecture
// and contributes to bundle bloat/warnings.

// ============================================================================
// DESIGN TOKENS - Matching Index Screen
// ============================================================================
const DESIGN = {
  colors: {
    // [MODIFIED] Surface needs to be transparent for Glass effect, handled in styles
    background: "#FFFFFF",
    backgroundSecondary: "#F7F7F7",
    surface: "#FFFFFF",

    textPrimary: "#222222",
    textSecondary: "#717171",
    textTertiary: "#B0B0B0",
    textInverse: "#FFFFFF",

    // Brand colors (for trips - coral/red)
    brand: "#FF385C",
    brandLight: "rgba(255, 56, 92, 0.08)",

    // Accent (teal for secondary)
    accent: "#00A699",
    accentLight: "rgba(0, 166, 153, 0.08)",

    border: "rgba(235, 235, 235, 0.6)", // [MODIFIED] Softer border for glass
    borderFocus: "#222222",
    divider: "#DDDDDD",

    success: "#008A05",
    warning: "#E07912",
    error: "#C13515",

    rating: "#FFB400",
    ratingBg: "#FFF8E6",

    overlay: "rgba(0, 0, 0, 0.5)",
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },

  radius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },

  // [NOTE] These native shadows are disabled in styles in favor of Skia
  shadow: {
    card: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      // elevation: 3,
    },
    elevated: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      // elevation: 8,
    },
  },
} as const;

// ============================================================================
// TYPES
// ============================================================================
type TripProps = {
  trip: {
    _id: Id<"trips">;
    _creationTime: number;
    acceptedItemTypes?: string;
    arrivalDate: number;
    originCountry: string;
    originCity: string;
    destinationCountry: string;
    destinationCity: string;
    status: string;
    availableSpace: string;
    originCountryCode: string;
    destinationCountryCode: string;
    airline: string;
    traveler: {
      _id: string;
      username: string;
      image: string;
      rating?: number;
      asTravelerrating?: number;
    };
  };
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

// Rating Badge Component
const RatingBadge: React.FC<{ rating?: number }> = ({ rating = 0 }) => {
  const { t } = useTranslation();

  return (
    <View style={styles.ratingBadge}>
      {/* [CHANGED] Ionicons -> Lucide Star */}
      <Star
        size={12}
        color={DESIGN.colors.rating}
        fill={DESIGN.colors.rating}
      />
      <Text style={styles.ratingText}>
        {rating > 0 ? rating.toFixed(1) : t("new")}
      </Text>
    </View>
  );
};

// Route Display Component
const RouteDisplay: React.FC<{
  originCode: string;
  originCity: string;
  destCode: string;
  destCity: string;
}> = ({ originCode, originCity, destCode, destCity }) => (
  <View style={styles.routeContainer}>
    <View style={styles.locationBlock}>
      <View style={styles.flagContainer}>
        <CountryFlag isoCode={originCode.toLowerCase()} size={14} />
      </View>
      <View style={styles.locationTextBlock}>
        <Text style={styles.countryCode}>{originCode}</Text>
        <Text style={styles.cityName} numberOfLines={1}>
          {originCity}
        </Text>
      </View>
    </View>

    <View style={styles.routeLine}>
      <View style={styles.routeDot} />
      <View style={styles.routeDash} />
      <View style={styles.planeIcon}>
        {/* [CHANGED] Ionicons -> Lucide Plane */}
        <Plane size={16} color={DESIGN.colors.brand} strokeWidth={2.5} />
      </View>
      <View style={styles.routeDash} />
      <View style={[styles.routeDot, styles.routeDotEnd]} />
    </View>

    <View style={[styles.locationBlock, styles.locationBlockEnd]}>
      <View style={styles.locationTextBlock}>
        <Text style={[styles.countryCode, styles.textRight]}>{destCode}</Text>
        <Text style={[styles.cityName, styles.textRight]} numberOfLines={1}>
          {destCity}
        </Text>
      </View>
      <View style={styles.flagContainer}>
        <CountryFlag isoCode={destCode.toLowerCase()} size={14} />
      </View>
    </View>
  </View>
);

// Item Tag Component
const ItemTag: React.FC<{ label: string }> = ({ label }) => (
  <View style={styles.tag}>
    <Text style={styles.tagText}>{label}</Text>
  </View>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function Trip({ trip }: TripProps) {
  const { t, i18n } = useTranslation();
  // [ADDED] Dimensions for Skia Canvas calculation
  const { width: windowWidth } = useWindowDimensions();
  // Calculate exact card width (Screen width - Margins) to render shadow correctly
  const CARD_WIDTH = windowWidth - DESIGN.spacing.lg * 2;
  // Estimate height or make it dynamic. For MVP, we fix the canvas largely enough.
  const CANVAS_HEIGHT = 280;

  // === ANIMATIONS ===
  // [ADDED] Shared Value for the "Squish" press effect
  const scale = useSharedValue(1);

  // Reanimated style that listens to the scale value
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // === DATE FORMATTING ===
  const formattedDate = new Date(trip.arrivalDate).toLocaleDateString(
    i18n.language,
    { month: "short", day: "numeric" },
  );

  // === ACCEPTED ITEMS ===
  const acceptedItems = useMemo(() => {
    if (!trip.acceptedItemTypes) return [];
    return trip.acceptedItemTypes.split(",").map((item) => item.trim());
  }, [trip.acceptedItemTypes]);

  // === USER & DATA ===
  const { user } = useUser();
  const currentUser = useQuery(
    api.users.getUserByClerkId,
    user ? { clerkId: user?.id } : "skip",
  );
  const deleteTrip = useMutation(api.trips.deleteTrip);

  // === STATE ===
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [isEditModalVisible, setEditModalVisible] = useState(false);

  // === COMPUTED ===
  const isLoadingUser = currentUser === undefined;
  const isOwnTrip = currentUser?._id === trip.traveler._id;

  // === HANDLERS ===
  const handleProfilePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/user/${trip.traveler._id}`);
  };

  const handleDeleteConfirm = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      await deleteTrip({ tripId: trip._id });
      setDeleteModalVisible(false);
    } catch (error) {
      alert(t("trip_component.delete_error"));
    }
  };

  const handleEditConfirm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: "/trips", params: { trip: JSON.stringify(trip) } });
    setEditModalVisible(false);
  };

  const handleSendRequest = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: "/(stack)/orders",
      params: {
        travelerId: trip.traveler._id,
        tripId: trip._id,
      },
    });
  };

  // === ANIMATION HANDLERS ===
  const onPressIn = () => {
    scale.value = withSpring(0.98, { damping: 10, stiffness: 200 });
  };
  const onPressOut = () => {
    scale.value = withSpring(1, { damping: 10, stiffness: 200 });
  };

  // === RENDER ===
  return (
    <View style={styles.cardContainer}>
      {/* [ADDED] Skia Shadow Layer 
          This renders behind the card. We use absolute positioning.
          Airbnb Style: Two shadows. One large ambient, one tight key.
       */}
      {/* [FIXED] Changed from StyleSheet.absoluteFill to negative margins. 
           This "bleeds" the canvas out so the shadow isn't clipped by the container. */}
      <Canvas
        style={{
          position: "absolute",
          top: -40,
          left: -40,
          right: -40,
          bottom: -40,
        }}
      >
        <RoundedRect
          // [FIXED] Added +40 to x/y to account for the negative margin offset
          x={DESIGN.spacing.lg + 40}
          y={DESIGN.spacing.sm + 40}
          width={CARD_WIDTH}
          height={CANVAS_HEIGHT}
          r={DESIGN.radius.lg}
          color="rgba(0,0,0,0)" // Invisible rect, just for shadow
        >
          {/* Ambient Shadow (Soft, Spread) */}
          <SkiaShadow dx={0} dy={12} blur={24} color="rgba(0,0,0,0.08)" />
          {/* Key Shadow (Tight, Definitive) */}
          <SkiaShadow dx={0} dy={4} blur={4} color="rgba(0,0,0,0.04)" />
        </RoundedRect>
      </Canvas>

      {/* [MODIFIED] Added animatedStyle to support the "Squish" effect */}
      {/* [CRITICAL FIX] Removed `entering` prop. This was the cause of the Reanimated/Layout conflict. */}
      <Animated.View style={[styles.card, animatedStyle]}>
        {/* [ADDED] Wrapped content in Pressable to drive the animation */}
        <Pressable
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          delayLongPress={200} // Prevent accidental long press blocking scroll
          style={{ flex: 1 }}
        >
          {/* [ADDED] Glassmorphism Blur Layer */}
          {/* Note: On Android, you might need to enable 'experimentalBlurMethod' if this is slow, but usually fine for cards */}
          <BlurView
            intensity={20}
            tint="light"
            style={StyleSheet.absoluteFill}
          />

          {/* Delete Modal */}
          <Modal
            animationType="fade"
            transparent
            visible={isDeleteModalVisible}
            onRequestClose={() => setDeleteModalVisible(false)}
          >
            <Pressable
              style={styles.modalOverlay}
              onPress={() => setDeleteModalVisible(false)}
            >
              <Pressable style={styles.modalContent}>
                <Text style={styles.modalTitle}>
                  {t("trip_component.modals.delete.title")}
                </Text>
                <Text style={styles.modalText}>
                  {t("trip_component.modals.delete.text")}
                </Text>
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalButtonSecondary}
                    onPress={() => setDeleteModalVisible(false)}
                    accessibilityLabel={t("cancel")}
                    accessibilityRole="button"
                  >
                    <Text style={styles.modalButtonSecondaryText}>
                      {t("cancel")}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalButtonDestructive}
                    onPress={handleDeleteConfirm}
                    accessibilityLabel={t("delete")}
                    accessibilityRole="button"
                  >
                    <Text style={styles.modalButtonDestructiveText}>
                      {t("delete")}
                    </Text>
                  </TouchableOpacity>
                </View>
              </Pressable>
            </Pressable>
          </Modal>

          {/* Edit Modal */}
          <Modal
            animationType="fade"
            transparent
            visible={isEditModalVisible}
            onRequestClose={() => setEditModalVisible(false)}
          >
            <Pressable
              style={styles.modalOverlay}
              onPress={() => setEditModalVisible(false)}
            >
              <Pressable style={styles.modalContent}>
                <Text style={styles.modalTitle}>
                  {t("trip_component.modals.edit.title")}
                </Text>
                <Text style={styles.modalText}>
                  {t("trip_component.modals.edit.text")}
                </Text>
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalButtonSecondary}
                    onPress={() => setEditModalVisible(false)}
                    accessibilityLabel={t("cancel")}
                    accessibilityRole="button"
                  >
                    <Text style={styles.modalButtonSecondaryText}>
                      {t("cancel")}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalButtonPrimary}
                    onPress={handleEditConfirm}
                    accessibilityLabel={t("edit")}
                    accessibilityRole="button"
                  >
                    <Text style={styles.modalButtonPrimaryText}>
                      {t("edit")}
                    </Text>
                  </TouchableOpacity>
                </View>
              </Pressable>
            </Pressable>
          </Modal>

          {/* === CARD HEADER === */}
          <View style={styles.cardHeader}>
            <TouchableOpacity
              style={styles.userInfo}
              onPress={handleProfilePress}
              accessibilityLabel={`${t("view_profile")}: ${trip.traveler.username}`}
              accessibilityRole="button"
            >
              <Image
                source={{ uri: trip.traveler.image }}
                style={styles.avatar}
                contentFit="cover"
                transition={200}
                cachePolicy="memory-disk"
              />
              <View style={styles.userTextContainer}>
                <Text style={styles.username}>{trip.traveler.username}</Text>
                {trip.airline && (
                  <Text style={styles.userSubtext}>{trip.airline}</Text>
                )}
              </View>
            </TouchableOpacity>

            {isOwnTrip ? (
              <View style={styles.ownerActions}>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setEditModalVisible(true);
                  }}
                  style={styles.iconButton}
                  accessibilityLabel={t("edit")}
                  accessibilityRole="button"
                >
                  {/* [CHANGED] Feather -> Lucide Edit2 */}
                  <Edit2 size={18} color={DESIGN.colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setDeleteModalVisible(true);
                  }}
                  style={styles.iconButton}
                  accessibilityLabel={t("delete")}
                  accessibilityRole="button"
                >
                  {/* [CHANGED] Feather -> Lucide Trash2 */}
                  <Trash2 size={18} color={DESIGN.colors.error} />
                </TouchableOpacity>
              </View>
            ) : (
              <RatingBadge rating={trip.traveler.asTravelerrating} />
            )}
          </View>

          {/* === ROUTE === */}
          <RouteDisplay
            originCode={trip.originCountryCode}
            originCity={trip.originCity}
            destCode={trip.destinationCountryCode}
            destCity={trip.destinationCity}
          />

          {/* === DETAILS BAR === */}
          <View style={styles.detailsBar}>
            <View style={styles.detailItem}>
              {/* [CHANGED] Feather -> Lucide Calendar */}
              <Calendar size={14} color={DESIGN.colors.brand} />
              <Text style={styles.detailValue}>{formattedDate}</Text>
            </View>
            <View style={styles.detailDivider} />
            <View style={styles.detailItem}>
              {/* [CHANGED] Feather -> Lucide Briefcase */}
              <Briefcase size={14} color={DESIGN.colors.brand} />
              <Text style={styles.detailValue}>{trip.availableSpace}</Text>
            </View>
          </View>

          {/* === ACCEPTED ITEMS === */}
          {acceptedItems.length > 0 && (
            <View style={styles.tagsContainer}>
              {acceptedItems.slice(0, 4).map((item, index) => (
                <ItemTag key={index} label={t(`categories.${item}`)} />
              ))}
              {acceptedItems.length > 4 && (
                <View style={styles.moreTag}>
                  <Text style={styles.moreTagText}>
                    +{acceptedItems.length - 4}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* === ACTION BUTTON === */}
          {!isLoadingUser && !isOwnTrip && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleSendRequest}
              activeOpacity={0.8}
              accessibilityLabel={t("trip_component.labels.request_delivery")}
              accessibilityRole="button"
            >
              <Text style={styles.actionButtonText}>
                {t("trip_component.labels.request_delivery")}
              </Text>
              {/* [CHANGED] Feather -> Lucide ArrowRight */}
              <ArrowRight size={16} color={DESIGN.colors.textInverse} />
            </TouchableOpacity>
          )}
        </Pressable>
      </Animated.View>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  // === CARD ===
  // [ADDED] Container for the Skia Canvas layering
  cardContainer: {
    // We need this container to hold the absolute Canvas and the Card
    marginBottom: DESIGN.spacing.sm, // Push next item down
  },
  card: {
    // [MODIFIED] Changed to support glass effect
    backgroundColor: "rgba(255, 255, 255, 0.85)", // 85% opacity for BlurView to shine through
    marginHorizontal: DESIGN.spacing.lg,
    marginVertical: DESIGN.spacing.sm,
    borderRadius: DESIGN.radius.lg,
    padding: DESIGN.spacing.md,
    borderWidth: 1,
    borderColor: DESIGN.colors.border,
    overflow: "hidden", // Needed so BlurView respects border radius

    // [MODIFIED] Removed native shadows, as Skia handles them now for better quality
    // ...DESIGN.shadow.card,
  },

  // === HEADER ===
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: DESIGN.spacing.md,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: DESIGN.spacing.md,
    backgroundColor: DESIGN.colors.backgroundSecondary,
  },
  userTextContainer: {
    flex: 1,
  },
  username: {
    fontSize: 15,
    fontWeight: "600",
    color: DESIGN.colors.textPrimary,
    marginBottom: 2,
  },
  userSubtext: {
    fontSize: 13,
    color: DESIGN.colors.textSecondary,
  },
  ownerActions: {
    flexDirection: "row",
    gap: DESIGN.spacing.sm,
  },
  iconButton: {
    padding: DESIGN.spacing.sm,
  },

  // === RATING ===
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: DESIGN.colors.ratingBg,
    paddingHorizontal: DESIGN.spacing.sm,
    paddingVertical: DESIGN.spacing.xs,
    borderRadius: DESIGN.radius.sm,
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "600",
    color: DESIGN.colors.textPrimary,
  },

  // === ROUTE ===
  routeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: DESIGN.spacing.md,
    paddingVertical: DESIGN.spacing.sm,
  },
  locationBlock: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  locationBlockEnd: {
    justifyContent: "flex-end",
  },
  flagContainer: {
    width: 28,
    height: 28,
    borderRadius: DESIGN.radius.sm,
    backgroundColor: DESIGN.colors.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  locationTextBlock: {
    marginHorizontal: DESIGN.spacing.sm,
  },
  countryCode: {
    fontSize: 18,
    fontWeight: "700",
    color: DESIGN.colors.textPrimary,
    letterSpacing: 0.5,
  },
  cityName: {
    fontSize: 12,
    color: DESIGN.colors.textSecondary,
    marginTop: 2,
    maxWidth: 70,
  },
  textRight: {
    textAlign: "right",
  },
  routeLine: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: DESIGN.spacing.sm,
  },
  routeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: DESIGN.colors.textSecondary,
  },
  routeDotEnd: {
    backgroundColor: DESIGN.colors.brand,
  },
  routeDash: {
    flex: 1,
    height: 1,
    backgroundColor: DESIGN.colors.border,
    marginHorizontal: DESIGN.spacing.xs,
  },
  planeIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: DESIGN.colors.brandLight,
    alignItems: "center",
    justifyContent: "center",
  },

  // === DETAILS BAR ===
  detailsBar: {
    flexDirection: "row",
    alignItems: "center",
    // [MODIFIED] Translucent background for internal elements to pop
    backgroundColor: "rgba(247, 247, 247, 0.6)",
    borderRadius: DESIGN.radius.md,
    paddingVertical: DESIGN.spacing.md,
    paddingHorizontal: DESIGN.spacing.md,
    marginBottom: DESIGN.spacing.md,
  },
  detailItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: DESIGN.spacing.sm,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: DESIGN.colors.textPrimary,
  },
  detailDivider: {
    width: 1,
    height: 20,
    backgroundColor: DESIGN.colors.border,
  },

  // === TAGS ===
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: DESIGN.spacing.sm,
    marginBottom: DESIGN.spacing.md,
  },
  tag: {
    backgroundColor: DESIGN.colors.backgroundSecondary,
    borderRadius: DESIGN.radius.sm,
    paddingHorizontal: DESIGN.spacing.sm,
    paddingVertical: DESIGN.spacing.xs,
    borderWidth: 1,
    borderColor: DESIGN.colors.border,
  },
  tagText: {
    fontSize: 12,
    color: DESIGN.colors.textSecondary,
    fontWeight: "500",
  },
  moreTag: {
    paddingHorizontal: DESIGN.spacing.sm,
    paddingVertical: DESIGN.spacing.xs,
  },
  moreTagText: {
    fontSize: 12,
    color: DESIGN.colors.textSecondary,
    fontWeight: "500",
  },

  // === ACTION BUTTON ===
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DESIGN.colors.brand,
    borderRadius: DESIGN.radius.md,
    paddingVertical: 14,
    gap: DESIGN.spacing.sm,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: DESIGN.colors.textInverse,
  },

  // === MODALS ===
  modalOverlay: {
    flex: 1,
    backgroundColor: DESIGN.colors.overlay,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "85%",
    backgroundColor: DESIGN.colors.surface,
    borderRadius: DESIGN.radius.xl,
    padding: DESIGN.spacing.lg,
    ...DESIGN.shadow.elevated,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: DESIGN.colors.textPrimary,
    textAlign: "center",
    marginBottom: DESIGN.spacing.sm,
  },
  modalText: {
    fontSize: 14,
    color: DESIGN.colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: DESIGN.spacing.lg,
  },
  modalActions: {
    flexDirection: "row",
    gap: DESIGN.spacing.md,
  },
  modalButtonSecondary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: DESIGN.radius.md,
    backgroundColor: DESIGN.colors.backgroundSecondary,
    alignItems: "center",
  },
  modalButtonSecondaryText: {
    fontSize: 15,
    fontWeight: "600",
    color: DESIGN.colors.textPrimary,
  },
  modalButtonPrimary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: DESIGN.radius.md,
    backgroundColor: DESIGN.colors.textPrimary,
    alignItems: "center",
  },
  modalButtonPrimaryText: {
    fontSize: 15,
    fontWeight: "600",
    color: DESIGN.colors.textInverse,
  },
  modalButtonDestructive: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: DESIGN.radius.md,
    backgroundColor: DESIGN.colors.error,
    alignItems: "center",
  },
  modalButtonDestructiveText: {
    fontSize: 15,
    fontWeight: "600",
    color: DESIGN.colors.textInverse,
  },
});
