// components/Offer.tsx
//
// REDESIGN: Premium Airbnb-level card redesign
// - Static, clean Route Visualization (No loop animations)
// - Contextual Status colors
// - Tight Apple-style spring physics

import { Doc, Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { memo } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

// === TRANSLATION IMPORT ===
import { useTranslation } from "react-i18next";

const COLORS = {
  background: "#FFFFFF",
  card: "#FFFFFF",
  textPrimary: "#222222",
  textSecondary: "#717171",
  textTertiary: "#B0B0B0",
  border: "#EBEBEB",
  divider: "#F0F0F0",
  brandPink: "#FF385C",
  brandPinkLight: "#FFF0F3",
  brandTeal: "#008489",
  success: "#34C759",
  successBg: "#E4F9E9",
  warning: "#FF9500",
  warningBg: "#FFF4E5",
  danger: "#FF3B30",
  dangerBg: "#FFEBEE",
  purple: "#AF52DE",
  purpleBg: "#F3E5F5",
  neutralBg: "#F7F7F7",
};

const SPRING_CONFIG = { damping: 20, stiffness: 300, mass: 1 };

export type OfferThread = {
  requestDetails: { productName: string };
  tripDetails: {
    originCity: string;
    originCountryCode?: string;
    destinationCity: string;
    destinationCountryCode?: string;
    arrivalDate: string | number;
  };
  otherUser: { _id?: Id<"users">; username?: string; image?: string };
  negotiation: Doc<"negotiations">;
  latestOffer: Doc<"offers">;
};

type OfferThreadItemProps = {
  thread: OfferThread;
  index?: number;
  currentUserId?: Id<"users">;
};

const formatDisplayDate = (dateString: string | number, locale: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString(locale, { month: "short", day: "numeric" });
};

const formatRelativeTime = (timestamp: number, t: any) => {
  const now = new Date();
  const past = new Date(timestamp);
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);
  const minutes = Math.floor(diffInSeconds / 60);
  if (minutes < 1) return t("offer_thread.time.just_now");
  if (minutes < 60) return t("offer_thread.time.mins_ago", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("offer_thread.time.hours_ago", { count: hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return t("offer_thread.time.days_ago", { count: days });
  return past.toLocaleDateString();
};

const countryCodeToFlag = (code?: string): string => {
  if (!code || code.length !== 2) return "";
  const codePoints = code
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

const StaticRoute = ({
  originCity,
  destinationCity,
  originCountryCode,
  destinationCountryCode,
}: {
  originCity: string;
  destinationCity: string;
  originCountryCode?: string;
  destinationCountryCode?: string;
}) => {
  const originFlag = countryCodeToFlag(originCountryCode);
  const destFlag = countryCodeToFlag(destinationCountryCode);

  return (
    <View style={styles.routeContainer}>
      <View style={styles.routeEndpoint}>
        {originFlag ? <Text style={styles.flagEmoji}>{originFlag}</Text> : null}
        <Text style={styles.cityText}>{originCity}</Text>
      </View>

      <View style={styles.routeGraphic}>
        <View style={[styles.routeDot, styles.routeDotOrigin]} />
        <View style={styles.routeLine} />
        <Ionicons
          name="airplane"
          size={14}
          color={COLORS.textTertiary}
          style={{ marginHorizontal: 4 }}
        />
        <View style={styles.routeLine} />
        <View style={[styles.routeDot, styles.routeDotDest]} />
      </View>

      <View style={[styles.routeEndpoint, { alignItems: "flex-end" }]}>
        {destFlag ? <Text style={styles.flagEmoji}>{destFlag}</Text> : null}
        <Text style={styles.cityText}>{destinationCity}</Text>
      </View>
    </View>
  );
};

const OfferThreadItem = memo(function OfferThreadItem({
  thread,
  index = 0,
  currentUserId,
}: OfferThreadItemProps) {
  const { t, i18n } = useTranslation();
  const cardScale = useSharedValue(1);

  const isTrip = thread.negotiation.travelerId === currentUserId;

  const { statusConfig, feeText, isActionRequired } = React.useMemo(() => {
    const defaultConfig = {
      label: "",
      color: COLORS.textSecondary,
      bg: COLORS.neutralBg,
      icon: "ellipse",
    };

    if (!currentUserId)
      return {
        statusConfig: defaultConfig,
        feeText: "",
        isActionRequired: false,
      };

    const { negotiation, latestOffer } = thread;
    const didISendLatestOffer = currentUserId === latestOffer.senderId;
    const feeText = `$${negotiation.proposedFee}`;

    let statusConfig = { ...defaultConfig };
    let isActionRequired = false;

    switch (negotiation.status) {
      case "pending":
        if (didISendLatestOffer) {
          statusConfig = {
            label: t("offer_thread.status.offer_sent"),
            color: COLORS.brandPink,
            bg: COLORS.brandPinkLight,
            icon: "paper-plane",
          };
        } else {
          statusConfig = {
            label: t("offer_thread.status.reply_needed"),
            color: COLORS.warning,
            bg: COLORS.warningBg,
            icon: "alert-circle",
          };
          isActionRequired = true;
        }
        break;
      case "accepted":
        statusConfig = {
          label: t("offer_thread.status.awaiting_payment"),
          color: COLORS.success,
          bg: COLORS.successBg,
          icon: "checkmark-circle",
        };
        isActionRequired = true;
        break;
      case "paid":
        statusConfig = {
          label: t("offer_thread.status.in_progress"),
          color: COLORS.purple,
          bg: COLORS.purpleBg,
          icon: "wallet",
        };
        break;
      case "completed":
        statusConfig = {
          label: t("offer_thread.status.delivered"),
          color: COLORS.textPrimary,
          bg: COLORS.border,
          icon: "checkmark-done-circle",
        };
        break;
      case "rejected":
        statusConfig = {
          label: t("offer_thread.status.declined"),
          color: COLORS.danger,
          bg: COLORS.dangerBg,
          icon: "close-circle",
        };
        break;
      case "cancelled":
        statusConfig = {
          label: t("offer_thread.status.cancelled"),
          color: COLORS.textSecondary,
          bg: COLORS.neutralBg,
          icon: "ban",
        };
        break;
    }
    return { statusConfig, feeText, isActionRequired };
  }, [thread, currentUserId, t]);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const handlePressIn = () => {
    cardScale.value = withSpring(0.98, SPRING_CONFIG);
  };

  const handlePressOut = () => {
    cardScale.value = withSpring(1, SPRING_CONFIG);
  };

  const handleNavigation = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: "/(stack)/offers",
      params: { id: thread.negotiation._id },
    });
  };

  const handleProfilePress = () => {
    if (thread.otherUser._id) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push(`/user/${thread.otherUser._id}`);
    }
  };

  return (
    <Animated.View>
      <Pressable
        onPress={handleNavigation}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.container}
      >
        <Animated.View style={[styles.cardShadow, cardAnimatedStyle]}>
          <View style={styles.cardClip}>
            <LinearGradient
              colors={
                isTrip
                  ? [COLORS.brandTeal, "#2DDAE0"]
                  : [COLORS.brandPink, COLORS.brandTeal]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.gradientStrip}
            />

            <View style={styles.card}>
              {/* --- TOP ROW --- */}
              <View style={styles.headerRow}>
                <View style={styles.contextBadge}>
                  <Ionicons
                    name={isTrip ? "airplane" : "bag-handle"}
                    size={12}
                    color={COLORS.textSecondary}
                  />
                  <Text style={styles.contextText}>
                    {isTrip
                      ? t("offer_thread.trip_request")
                      : t("offer_thread.my_order")}
                  </Text>
                </View>
                <View style={styles.priceContainer}>
                  <Text style={styles.priceLabel}>
                    {t("offer_thread.offer_label")}
                  </Text>
                  <Text style={styles.priceValue}>{feeText}</Text>
                </View>
              </View>

              {/* --- MIDDLE ROW --- */}
              <View style={styles.bodyContent}>
                <Text style={styles.productName} numberOfLines={1}>
                  {thread.requestDetails.productName}
                </Text>

                <StaticRoute
                  originCity={thread.tripDetails.originCity}
                  destinationCity={thread.tripDetails.destinationCity}
                  originCountryCode={thread.tripDetails.originCountryCode}
                  destinationCountryCode={
                    thread.tripDetails.destinationCountryCode
                  }
                />

                <Text style={styles.dateText}>
                  {t("offer_thread.arrives")}{" "}
                  {formatDisplayDate(
                    thread.tripDetails.arrivalDate,
                    i18n.language,
                  )}
                </Text>
              </View>

              <View style={styles.divider} />

              {/* --- FOOTER --- */}
              <View style={styles.footerRow}>
                <TouchableOpacity
                  style={styles.userSection}
                  onPress={handleProfilePress}
                  activeOpacity={0.7}
                >
                  <Image
                    source={{ uri: thread.otherUser.image }}
                    style={styles.avatar}
                    contentFit="cover"
                  />
                  <View>
                    <Text style={styles.username}>
                      {thread.otherUser.username}
                    </Text>
                    <Text style={styles.timestamp}>
                      {formatRelativeTime(thread.latestOffer._creationTime, t)}
                    </Text>
                  </View>
                </TouchableOpacity>

                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: statusConfig.bg },
                    isActionRequired && styles.statusPillUrgent,
                  ]}
                >
                  <Ionicons
                    name={statusConfig.icon as any}
                    size={14}
                    color={statusConfig.color}
                  />
                  <Text
                    style={[styles.statusText, { color: statusConfig.color }]}
                  >
                    {statusConfig.label}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
});

export default OfferThreadItem;

const styles = StyleSheet.create({
  container: { marginHorizontal: 16, marginVertical: 8 },
  cardShadow: {
    borderRadius: 20,
    backgroundColor: COLORS.card,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  cardClip: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  gradientStrip: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    zIndex: 1,
  },
  card: { backgroundColor: COLORS.card, padding: 16, paddingLeft: 20 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  contextBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.neutralBg,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  contextText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: "500" },
  priceContainer: { alignItems: "flex-end" },
  priceLabel: {
    fontSize: 10,
    textTransform: "uppercase",
    color: COLORS.textTertiary,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  priceValue: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.brandPink,
    marginTop: -2,
  },
  bodyContent: { marginBottom: 16 },
  productName: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  routeContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  routeEndpoint: { alignItems: "flex-start", minWidth: 50 },
  flagEmoji: { fontSize: 16, marginBottom: 2 },
  cityText: { fontSize: 14, fontWeight: "600", color: COLORS.textPrimary },
  routeGraphic: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 12,
  },
  routeDot: { width: 6, height: 6, borderRadius: 3 },
  routeDotOrigin: { backgroundColor: COLORS.brandPink },
  routeDotDest: { backgroundColor: COLORS.brandTeal },
  routeLine: { flex: 1, height: 1.5, backgroundColor: COLORS.border },
  dateText: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  divider: { height: 1, backgroundColor: COLORS.divider, marginBottom: 12 },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  userSection: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.neutralBg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  username: { fontSize: 14, fontWeight: "600", color: COLORS.textPrimary },
  timestamp: { fontSize: 12, color: COLORS.textSecondary },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 5,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
  statusPillUrgent: { borderColor: "rgba(255, 149, 0, 0.4)" },
  statusText: { fontSize: 12, fontWeight: "700", includeFontPadding: false },
});
