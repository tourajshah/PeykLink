// components/ReviewItem.tsx
//
// REDESIGN: Premium review display card with:
// - Unified brand pink (#FF385C) palette (was Tailwind blue #3B82F6)
// - FadeInDown entry animation with stagger support
// - Animated star cascade on mount (stars fill in sequence)
// - Visual rating progress bar next to numeric rating
// - Glassmorphism-lite sub-rating pills (semi-transparent bg with subtle border)
// - Premium card with gradient accent line at top and softer shadows
// - Avatar micro-interaction (spring scale on press)
// - Larger border radius (20px) matching Offer.tsx card style

import { Doc } from "@/convex/_generated/dataModel";
import {
    FontAwesome5,
    MaterialCommunityIcons,
    MaterialIcons,
} from "@expo/vector-icons";
import * as Haptics from "expo-haptics"; // CHANGED: Added Haptics
import { Image } from "expo-image";
import { router } from "expo-router"; // CHANGED: Added router for navigation
import React, { useEffect } from "react";
// REDESIGN: Added Pressable for avatar spring micro-interaction
// OLD: import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Pressable, StyleSheet, Text, View } from "react-native";
// NEW: react-native-reanimated for entry animation, star cascade, avatar spring
import Animated, {
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSequence,
    withSpring,
    withTiming
} from "react-native-reanimated";
// NEW: LinearGradient for gradient accent line at top of card
import { LinearGradient } from "expo-linear-gradient";

// === TRANSLATION ===
import { useTranslation } from "react-i18next";

// --- REDESIGN: UNIFIED BRAND PALETTE ---
// Replaces old Tailwind-based palette with Airbnb-style brand pink for consistency.
// OLD PALETTE (commented out per Rule 1 — DO NOT REMOVE):
// const PALETTE = {
//   surface: '#FFFFFF',
//   textPrimary: '#1F2937',
//   textSecondary: '#6B7280',
//   border: '#E5E7EB',
//   star: '#FBBF24',
//   primary: '#3B82F6',
//   travelerBadge: '#E0F2FE',
//   travelerText: '#0284C7',
//   requesterBadge: '#ECFDF5',
//   requesterText: '#059669',
//   subRatingIcon: '#9CA3AF',
// };
const PALETTE = {
  surface: "#FFFFFF",
  textPrimary: "#222222", // REDESIGN: Warmer black matching app palette
  textSecondary: "#717171", // REDESIGN: Softer grey
  border: "#EBEBEB", // REDESIGN: Softer border
  star: "#FFB800", // REDESIGN: Richer gold (was #FBBF24)
  starEmpty: "#E0E0E0", // NEW: Empty star color
  brandPink: "#FF385C", // NEW: Primary accent (was #3B82F6 Tailwind blue)
  brandTeal: "#008489", // NEW: Secondary for gradient end
  travelerBadge: "#E0F2FE",
  travelerText: "#0284C7",
  requesterBadge: "#ECFDF5",
  requesterText: "#059669",
  subRatingIcon: "#9CA3AF",
  // NEW: Sub-rating pill glassmorphism-lite
  subRatingBg: "rgba(247, 247, 247, 0.8)", // Semi-transparent for glass effect
  subRatingBorder: "rgba(0, 0, 0, 0.04)",
};

// NEW: Spring config for avatar press
const SPRING_CONFIG = { damping: 15, stiffness: 150, mass: 0.8 };

// ============================================================
// NEW SUB-COMPONENT: ANIMATED STAR DISPLAY
// ============================================================
// Stars fill in sequence on mount — creates a cascade reveal effect.
// 👇 1. DEFINE the types for the StarDisplay component's props
type StarDisplayProps = {
  rating: number;
  size?: number;
};

// REDESIGN: Replaced static StarDisplay with animated version
// OLD StarDisplay (commented out per Rule 1):
// const StarDisplay = ({ rating, size = 14 }: StarDisplayProps) => (
//   <View style={{ flexDirection: 'row', alignItems: 'center' }}>
//     {[1, 2, 3, 4, 5].map((star) => {
//       const name = star <= rating ? 'star' : 'star-border';
//       const color = star <= rating ? PALETTE.star : '#D1D5DB';
//       return <MaterialIcons key={star} name={name} size={size} color={color} style={{ marginRight: -1 }} />;
//     })}
//   </View>
// );

// 👇 2. APPLY the types to the component's props
const StarDisplay = ({ rating, size = 14 }: StarDisplayProps) => (
  <View style={{ flexDirection: "row", alignItems: "center" }}>
    {[1, 2, 3, 4, 5].map((star) => (
      <CascadeStar
        key={star}
        index={star}
        isActive={star <= rating}
        size={size}
      />
    ))}
  </View>
);

// Individual star with cascade fill-in animation on mount
const CascadeStar = ({
  index,
  isActive,
  size,
}: {
  index: number;
  isActive: boolean;
  size: number;
}) => {
  const scale = useSharedValue(0.6);
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    // Staggered animation — each star appears with a slight delay
    const delay = index * 60; // 60ms stagger per star
    scale.value = withDelay(
      delay,
      withSpring(1, { damping: 12, stiffness: 180 }),
    );
    opacity.value = withDelay(delay, withTiming(1, { duration: 200 }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[animStyle, { marginRight: -1 }]}>
      <MaterialIcons
        name={isActive ? "star" : "star-border"}
        size={size}
        color={isActive ? PALETTE.star : PALETTE.starEmpty}
      />
    </Animated.View>
  );
};

// ============================================================
// NEW SUB-COMPONENT: VISUAL RATING BAR
// ============================================================
// Small horizontal progress bar filled proportionally to the rating.
// Displays next to the numeric rating for quick visual scanning.
const RatingBar = ({ rating }: { rating: number }) => {
  const fillWidth = useSharedValue(0);

  useEffect(() => {
    fillWidth.value = withSpring((rating / 5) * 100, {
      damping: 20,
      stiffness: 100,
    });
  }, [rating]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${fillWidth.value}%` as any,
  }));

  return (
    <View style={styles.ratingBarTrack}>
      <Animated.View style={[styles.ratingBarFill, barStyle]}>
        <LinearGradient
          colors={[PALETTE.star, "#FFCC33"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1, borderRadius: 2 }}
        />
      </Animated.View>
    </View>
  );
};

// Define the types for the props this component will receive
type ReviewItemProps = {
  item: {
    review: Doc<"reviews">;
    reviewer: Doc<"users"> | null;
  };
  index?: number; // NEW: Optional index for staggered entry animation
};

const ReviewItem = ({ item, index = 0 }: ReviewItemProps) => {
  const { t, i18n } = useTranslation();
  const { review, reviewer } = item;

  // CHANGED: Added check for hidden status to prevent rendering "bugged" or unwanted reviews
  if (!reviewer || review.status === "hidden") {
    return null;
  }

  // UPDATED: Dynamically uses i18n.language for formatting the date based on user's active locale
  const reviewDate = new Date(
    review.createdAt || review._creationTime,
  ).toLocaleDateString(i18n.language || "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  // NEW: Shared value for avatar spring press micro-interaction
  const avatarScale = useSharedValue(1);

  const avatarAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: avatarScale.value }],
  }));

  // NEW: Navigation handler with Haptics + spring feedback
  const handleProfilePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    avatarScale.value = withSequence(
      withSpring(0.9, SPRING_CONFIG),
      withSpring(1, SPRING_CONFIG),
    );
    router.push(`/user/${reviewer._id}`);
  };

  const isTravelerReview = review.revieweeRole === "traveler";

  const RoleBadge = () => (
    <View
      style={[
        styles.roleBadge,
        isTravelerReview ? styles.roleBadgeTraveler : styles.roleBadgeRequester,
      ]}
    >
      <FontAwesome5
        name={isTravelerReview ? "plane" : "box-open"}
        size={8} // Reduced slightly for better alignment
        color={isTravelerReview ? PALETTE.travelerText : PALETTE.requesterText}
        style={{ marginRight: 4 }}
      />
      <Text
        style={[
          styles.roleBadgeText,
          isTravelerReview
            ? styles.roleBadgeTextTraveler
            : styles.roleBadgeTextRequester,
        ]}
      >
        {isTravelerReview ? t("traveler") : t("requester")}
      </Text>
    </View>
  );

  const SubRating = ({
    icon,
    label,
    value,
  }: {
    icon: any;
    label: string;
    value?: number;
  }) => {
    if (!value) return null;
    return (
      // REDESIGN: Glassmorphism-lite pill — semi-transparent bg with subtle border
      <View style={styles.subRatingContainer}>
        <MaterialCommunityIcons
          name={icon}
          size={14}
          color={PALETTE.subRatingIcon}
          style={{ marginRight: 4 }}
        />
        <Text style={styles.subRatingLabel}>{label}:</Text>
        <Text style={styles.subRatingValue}>{value.toFixed(1)}</Text>
      </View>
    );
  };

  return (
    // NEW: FadeInDown entry animation — staggered per index for list rendering
    <Animated.View
      entering={FadeInDown.delay(Math.min(index * 80, 400))
        .springify()
        .damping(18)}
    >
      <View style={styles.container}>
        {/* NEW: Gradient accent line at top of card */}
        <LinearGradient
          colors={[PALETTE.brandPink, PALETTE.brandTeal]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientAccentLine}
        />

        {/* Header Section */}
        <View style={styles.header}>
          {/* REDESIGN: Avatar with spring micro-interaction on press */}
          {/* OLD: Wrapped Image in TouchableOpacity for profile navigation */}
          <Pressable
            onPress={handleProfilePress}
            onPressIn={() => {
              avatarScale.value = withSpring(0.92, SPRING_CONFIG);
            }}
            onPressOut={() => {
              avatarScale.value = withSpring(1, SPRING_CONFIG);
            }}
          >
            <Animated.View style={avatarAnimStyle}>
              <Image
                source={{ uri: reviewer.imageURL }}
                style={styles.avatar}
                contentFit="cover"
              />
            </Animated.View>
          </Pressable>

          <View style={styles.headerText}>
            {/* CHANGED: Improved name row layout to handle long names */}
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
                {reviewer.fullname}
              </Text>
              <RoleBadge />
            </View>
            <Text style={styles.date}>{reviewDate}</Text>
          </View>

          {/* Main Rating — Big number + animated stars + progress bar */}
          <View style={styles.mainRatingColumn}>
            <Text style={styles.bigRatingText}>{review.rating.toFixed(1)}</Text>
            {/* REDESIGN: Animated star cascade replaces static stars */}
            <StarDisplay rating={review.rating} size={14} />
            {/* NEW: Visual rating bar for quick scanning */}
            <RatingBar rating={review.rating} />
          </View>
        </View>

        <View style={styles.subRatingsRow}>
          {isTravelerReview ? (
            <>
              <SubRating
                icon="package-variant-closed"
                label={t("condition")}
                value={review.itemConditionRating}
              />
              <SubRating
                icon="clock-outline"
                label={t("punctuality")}
                value={review.punctualityRating}
              />
              <SubRating
                icon="message-outline"
                label={t("comm")}
                value={review.communicationRating}
              />
            </>
          ) : (
            <>
              <SubRating
                icon="message-outline"
                label={t("communication")}
                value={review.communicationRating}
              />
              <SubRating
                icon="clock-outline"
                label={t("punctuality")}
                value={review.punctualityRating}
              />
            </>
          )}
        </View>

        <View style={styles.divider} />

        {review.comment && <Text style={styles.comment}>{review.comment}</Text>}
      </View>
    </Animated.View>
  );
};

// ============================================================
// STYLES
// ============================================================
// Styles updated for Modern UI/UX and Industry Standards
const styles = StyleSheet.create({
  container: {
    backgroundColor: PALETTE.surface,
    padding: 16,
    paddingTop: 20, // NEW: Extra top padding for gradient accent line
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 20, // REDESIGN: Larger radius (was 16) matching Offer.tsx
    overflow: "hidden", // NEW: Clips gradient accent line
    borderWidth: 1,
    borderColor: PALETTE.border,
    // REDESIGN: Softer, deeper shadow matching Airbnb card depth
    // OLD: shadowOpacity: 0.05, shadowRadius: 8, elevation: 2
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  // NEW: Gradient accent line at top of card
  gradientAccentLine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  header: {
    flexDirection: "row",
    alignItems: "center", // CHANGED: Ensures vertical center alignment of avatar and text
    marginBottom: 12,
  },
  avatar: {
    width: 46, // REDESIGN: Slightly larger (was 44)
    height: 46,
    borderRadius: 23,
    marginRight: 12,
    backgroundColor: "#F3F4F6",
    borderWidth: 1, // NEW: Subtle border for definition
    borderColor: PALETTE.border,
  },
  headerText: {
    flex: 1, // Takes remaining space
    justifyContent: "center",
    paddingRight: 8, // CHANGED: Added padding to prevent text hitting the rating stars
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
    width: "100%", // CHANGED: Ensures container takes full width of parent
  },
  name: {
    fontWeight: "700",
    fontSize: 15,
    color: PALETTE.textPrimary,
    marginRight: 8,
    flexShrink: 1, // CHANGED: Critical for long names. Allows text to shrink before badge
  },
  date: {
    color: PALETTE.textSecondary,
    fontSize: 12,
  },

  // Badge Styles — unchanged structure
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 3, // CHANGED: increased slightly for better vertical centering
    borderRadius: 6,
    // CHANGED: Added flexShrink to badge to prevent it from vanishing on extremely small screens
    flexShrink: 0,
  },
  roleBadgeTraveler: { backgroundColor: PALETTE.travelerBadge },
  roleBadgeRequester: { backgroundColor: PALETTE.requesterBadge },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    includeFontPadding: false, // CHANGED: Android fix for vertical text alignment
  },
  roleBadgeTextTraveler: { color: PALETTE.travelerText },
  roleBadgeTextRequester: { color: PALETTE.requesterText },

  // Main Rating Column Styles
  mainRatingColumn: {
    alignItems: "flex-end",
    justifyContent: "center",
    minWidth: 55, // REDESIGN: Slightly wider for rating bar (was 50)
  },
  bigRatingText: {
    fontSize: 20, // REDESIGN: Slightly larger (was 18)
    fontWeight: "800",
    color: PALETTE.textPrimary,
    lineHeight: 24,
  },
  // NEW: Visual rating progress bar
  ratingBarTrack: {
    width: "100%",
    height: 3,
    backgroundColor: PALETTE.border,
    borderRadius: 1.5,
    marginTop: 4,
    overflow: "hidden",
  },
  ratingBarFill: {
    height: "100%",
    borderRadius: 1.5,
    overflow: "hidden",
  },

  // Sub-ratings Styles — REDESIGN: Glassmorphism-lite pills
  subRatingsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
    marginBottom: 12,
  },
  subRatingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10, // REDESIGN: Slightly tighter (was 12)
    // REDESIGN: Glassmorphism-lite — semi-transparent bg with subtle border
    // OLD: backgroundColor: '#F9FAFB', no border
    backgroundColor: PALETTE.subRatingBg,
    paddingHorizontal: 8,
    paddingVertical: 5, // REDESIGN: Slightly more padding (was 4)
    borderRadius: 8, // REDESIGN: Rounder (was 6)
    marginTop: 4,
    borderWidth: 1, // NEW: Subtle border for glass effect
    borderColor: PALETTE.subRatingBorder,
  },
  subRatingLabel: {
    fontSize: 11,
    color: PALETTE.textSecondary,
    marginRight: 4,
    fontWeight: "500",
  },
  subRatingValue: {
    fontSize: 11,
    fontWeight: "700",
    color: PALETTE.textPrimary,
  },

  divider: {
    height: 1,
    backgroundColor: PALETTE.border, // REDESIGN: Uses palette constant (was #F3F4F6)
    marginBottom: 12,
  },

  comment: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 22,
  },
});

export default ReviewItem;
