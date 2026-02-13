// components/Review.tsx
//
// REDESIGN: Logical Storytelling (Airbnb Style)
// Story: "Avatar (Traveler)" -> delivered -> "Image (Product)"

import { Doc } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

// === TRANSLATION IMPORT ===
import { useTranslation } from "react-i18next";

const COLORS = {
  brandPink: "#FF385C",
  textPrimary: "#222222", // Slightly softer black, typical of Airbnb
  textSecondary: "#717171", // Airbnb's classic secondary text color
};

export default function ReviewPrompt({
  negotiation,
  travelerName,
  productImageUrl,
  userAvatarUrl,
}: {
  negotiation: Doc<"negotiations">;
  travelerName?: string;
  productName?: string;
  productImageUrl?: string;
  userAvatarUrl?: string;
}) {
  const router = useRouter();
  const scale = useSharedValue(1);
  const { t } = useTranslation();

  // Fallback to translated "Traveler" if no name is provided
  const displayName =
    travelerName && travelerName !== "Traveler"
      ? travelerName
      : t("cards.traveler_default");

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); // Lighter haptic for standard presses
    router.push({
      pathname: "/(stack)/review",
      params: { negotiationId: negotiation._id },
    });
  };

  // Airbnb uses swift, smooth easing rather than bouncy springs
  const handlePressIn = () => {
    scale.value = withTiming(0.97, {
      duration: 150,
      easing: Easing.out(Easing.cubic),
    });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, {
      duration: 200,
      easing: Easing.out(Easing.cubic),
    });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    // Replaced springify() with a smooth duration-based entrance
    <Animated.View
      entering={FadeInUp.delay(200).duration(500)}
      style={styles.wrapper}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View style={animatedStyle}>
          {/* Layer 1: Ambient Shadow (Large, soft, deep) */}
          <View style={styles.ambientShadow}>
            {/* Layer 2: Key Shadow (Tight, defining edge) */}
            <View style={styles.keyShadow}>
              {/* Inner Container: Clips the gradient and content */}
              <View style={styles.innerContainer}>
                <LinearGradient
                  colors={["#FFFFFF", "#FFF5F6"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />

                <View style={styles.leftCol}>
                  <View style={styles.badge}>
                    <Ionicons name="star" size={10} color="#FFF" />
                    <Text style={styles.badgeText}>
                      {t("review_prompt.badge")}
                    </Text>
                  </View>
                  <Text style={styles.title}>{t("review_prompt.title")}</Text>
                  <Text style={styles.subtitle}>
                    {t("review_prompt.subtitle", { name: displayName })}
                  </Text>
                </View>

                {/* STORYTELLING IMAGES: User -> Product */}
                <View style={styles.visualStory}>
                  <Image
                    source={{ uri: userAvatarUrl }}
                    style={styles.avatar}
                  />

                  <View style={styles.arrowCircle}>
                    <Ionicons name="checkmark" size={10} color="#FFF" />
                  </View>

                  <Image
                    source={{ uri: `https://ts79.space/${productImageUrl}` }}
                    style={styles.productImg}
                  />
                </View>
              </View>
            </View>
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginHorizontal: 20, marginBottom: 20 },

  // Layer 1: Ambient Shadow
  ambientShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    backgroundColor: "transparent",
  },

  // Layer 2: Key Shadow
  keyShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    backgroundColor: "transparent",
  },

  // Content Container (Handles clipping and shape)
  innerContainer: {
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFF",
    overflow: "hidden", // Clips the LinearGradient
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)", // Very subtle border instead of solid pink
  },

  leftCol: { flex: 1, paddingRight: 10 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.brandPink,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6, // Slightly tighter radius
    alignSelf: "flex-start",
    marginBottom: 8,
    gap: 4,
  },
  badgeText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 16,
    fontWeight: "600", // Airbnb often leans on 600 rather than full 700 for lists
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  subtitle: { fontSize: 13, color: COLORS.textSecondary },

  visualStory: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#FFF",
    zIndex: 1,
  },
  arrowCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#00C853",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: -8,
    zIndex: 2,
    borderWidth: 1.5,
    borderColor: "#FFF",
  },
  productImg: {
    width: 36,
    height: 36,
    borderRadius: 8,
    marginLeft: -8,
    borderWidth: 2,
    borderColor: "#FFF",
    zIndex: 0,
  },
});
