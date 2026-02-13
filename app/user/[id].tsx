import ReviewItem from "@/components/ReviewItem";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  Platform,
  Pressable,
  RefreshControl,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// === TRANSLATION IMPORT ===
import { useTranslation } from "react-i18next";

const { width } = Dimensions.get("window");

const STATUSBAR_HEIGHT =
  Platform.OS === "ios" ? 50 : (StatusBar.currentHeight || 24) + 8;

const formatJoinDate = (
  timestamp: number,
  locale: string,
  fallbackRecently: string,
) => {
  if (!timestamp) return fallbackRecently;
  const date = new Date(timestamp);
  return date.toLocaleDateString(locale, { month: "long", year: "numeric" });
};

// === PALETTE (Airbnb/Grabr Style — Matched to profile.tsx) ===
const PALETTE = {
  background: "#FFFFFF",
  secondaryBg: "#F7F7F7",
  brandPink: "#FF385C",
  brandTeal: "#008489",
  brandGradient: ["#FF385C", "#BD1E59"] as const,
  tealGradient: ["#008489", "#005C63"] as const,
  gold: "#FFB400",
  danger: "#EF4444",
  textPrimary: "#222222",
  textSecondary: "#717171",
  textLight: "#B0B0B0",
  border: "#DDDDDD",
  cardShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 4,
  },
};

// === SHIMMER SKELETON COMPONENT (Matched to profile.tsx) ===
const SkeletonItem = ({ style }: { style: any }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );
    pulseLoop.start();

    const shimmerLoop = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    );
    shimmerLoop.start();

    return () => {
      pulseLoop.stop();
      shimmerLoop.stop();
    };
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const shimmerTranslateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });

  return (
    <Animated.View
      style={[
        { backgroundColor: "#E0E0E0", opacity, overflow: "hidden" },
        style,
      ]}
    >
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          width: width * 0.35,
          backgroundColor: "rgba(255,255,255,0.25)",
          transform: [{ translateX: shimmerTranslateX }],
        }}
      />
    </Animated.View>
  );
};

// === ANIMATED COUNT-UP STAT VALUE (Matched to profile.tsx) ===
const AnimatedStatValue = ({
  value,
  style,
}: {
  value: string | number;
  style: any;
}) => {
  const countAnim = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState<string>("0");

  useEffect(() => {
    const strVal = String(value);
    const numericPart = parseFloat(strVal.replace("%", ""));
    const hasPercent = strVal.includes("%");
    const hasDecimal = strVal.includes(".");

    if (isNaN(numericPart)) {
      setDisplay(strVal);
      return;
    }

    countAnim.setValue(0);
    Animated.timing(countAnim, {
      toValue: numericPart,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    const id = countAnim.addListener(({ value: v }) => {
      if (hasDecimal) {
        setDisplay(v.toFixed(1) + (hasPercent ? "%" : ""));
      } else {
        setDisplay(Math.round(v) + (hasPercent ? "%" : ""));
      }
    });

    return () => countAnim.removeListener(id);
  }, [value]);

  return <Text style={style}>{display}</Text>;
};

// === QUICK ACTION BUTTON COMPONENT (Public Profile Actions) ===
const QuickActionButton = ({
  icon,
  label,
  onPress,
  color = PALETTE.textPrimary,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  color?: string;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Haptics.selectionAsync();
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      friction: 4,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={[styles.quickActionItem, { transform: [{ scale: scaleAnim }] }]}
      >
        <View style={styles.quickActionIcon}>
          <Feather name={icon as any} size={20} color={color} />
        </View>
        <Text style={styles.quickActionLabel}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
};

// --- INTERFACE FOR LIST HEADER PROPS ---
interface ListHeaderProps {
  profile: any;
  userStats: any;
  stats: {
    rating: string | number;
    orders: number;
    reliability: string;
  } | null;
  viewMode: "traveler" | "requester";
  reviewCount: number;
  onBack: () => void;
  onShare: () => void;
  onReport: () => void;
  onCopyUsername: () => void;
  onModeSwitch: (mode: "traveler" | "requester") => void;
  scrollY: Animated.Value;
}

// --- EXTRACTED LIST HEADER COMPONENT ---
const ListHeader = ({
  profile,
  userStats,
  stats,
  viewMode,
  reviewCount,
  onBack,
  onShare,
  onReport,
  onCopyUsername,
  onModeSwitch,
  scrollY,
}: ListHeaderProps) => {
  const { t, i18n } = useTranslation();

  // Header action button scales
  const backScale = useRef(new Animated.Value(1)).current;
  const shareScale = useRef(new Animated.Value(1)).current;

  // Stat card spring scales
  const statScale1 = useRef(new Animated.Value(1)).current;
  const statScale2 = useRef(new Animated.Value(1)).current;
  const statScale3 = useRef(new Animated.Value(1)).current;

  // Toggle sliding indicator animation
  const toggleAnim = useRef(new Animated.Value(0)).current;
  const TOGGLE_CONTAINER_WIDTH = width - 40 - 8;

  // Animate toggle sliding indicator when viewMode changes
  useEffect(() => {
    Animated.spring(toggleAnim, {
      toValue: viewMode === "traveler" ? 0 : 1,
      friction: 8,
      tension: 60,
      useNativeDriver: true,
    }).start();
  }, [viewMode]);

  // Toggle indicator translateX
  const toggleTranslateX = toggleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, TOGGLE_CONTAINER_WIDTH / 2],
  });

  // 3D/Spring Physics for pressable items
  const onPressIn = (scaleRef: Animated.Value) => {
    Animated.spring(scaleRef, {
      toValue: 0.93,
      friction: 4,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const onPressOut = (scaleRef: Animated.Value) => {
    Animated.spring(scaleRef, {
      toValue: 1,
      friction: 4,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  // Scroll Interpolations
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [1, 0.3],
    extrapolate: "clamp",
  });

  const avatarScale = scrollY.interpolate({
    inputRange: [-50, 0, 100],
    outputRange: [1.15, 1, 0.85],
    extrapolate: "clamp",
  });

  const avatarTranslateY = scrollY.interpolate({
    inputRange: [-80, 0, 100],
    outputRange: [-15, 0, 20],
    extrapolate: "clamp",
  });

  const statsOpacity = scrollY.interpolate({
    inputRange: [-20, 0, 50],
    outputRange: [0.6, 1, 1],
    extrapolate: "clamp",
  });

  const statsTranslateY = scrollY.interpolate({
    inputRange: [-20, 0],
    outputRange: [10, 0],
    extrapolate: "clamp",
  });

  return (
    <View style={styles.headerContainer}>
      <View style={styles.heroContainer}>
        <View style={styles.topActionRow}>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              onBack();
            }}
            onPressIn={() => onPressIn(backScale)}
            onPressOut={() => onPressOut(backScale)}
          >
            <Animated.View
              style={[styles.circleBtn, { transform: [{ scale: backScale }] }]}
            >
              <Ionicons
                name="arrow-back"
                size={22}
                color={PALETTE.textPrimary}
              />
            </Animated.View>
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              onShare();
            }}
            onPressIn={() => onPressIn(shareScale)}
            onPressOut={() => onPressOut(shareScale)}
          >
            <Animated.View
              style={[styles.circleBtn, { transform: [{ scale: shareScale }] }]}
            >
              <Ionicons
                name="share-outline"
                size={22}
                color={PALETTE.textPrimary}
              />
            </Animated.View>
          </Pressable>
        </View>

        <Animated.View
          style={[styles.identitySection, { opacity: headerOpacity }]}
        >
          <View style={styles.avatarWrapper}>
            <Animated.View
              style={{
                transform: [
                  { scale: avatarScale },
                  { translateY: avatarTranslateY },
                ],
              }}
            >
              <Image
                source={profile?.imageURL}
                style={[styles.avatarLarge, styles.avatarGlow]}
                contentFit="cover"
                transition={500}
              />
            </Animated.View>

            {profile?.isVerified && (
              <View style={styles.verifiedBadgeContainer}>
                <LinearGradient
                  colors={PALETTE.brandGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.verifiedBadgeGradient}
                >
                  <Ionicons name="checkmark" size={14} color="#FFF" />
                </LinearGradient>
              </View>
            )}
          </View>

          <View style={styles.nameBlock}>
            <Text style={styles.heroName}>{profile?.fullname}</Text>
          </View>

          <View style={styles.metaRow}>
            <TouchableOpacity
              onPress={onCopyUsername}
              style={styles.metaItem}
              activeOpacity={0.7}
            >
              <Text style={styles.metaText}>@{profile?.username}</Text>
              <Feather name="copy" size={11} color={PALETTE.textLight} />
            </TouchableOpacity>
            <Text style={styles.metaDot}>{"\u00B7"}</Text>
            <View style={styles.metaItem}>
              <Feather name="calendar" size={11} color={PALETTE.textLight} />
              <Text style={styles.metaText}>
                {formatJoinDate(
                  userStats?.userCreationTime,
                  i18n.language,
                  t("profile.recently"),
                )}
              </Text>
            </View>
          </View>

          {profile?.bio && (
            <View style={styles.bioContainer}>
              <Text
                style={styles.bioText}
                numberOfLines={3}
                ellipsizeMode="tail"
              >
                {profile.bio}
              </Text>
            </View>
          )}
        </Animated.View>
      </View>

      <View style={styles.quickActionsRow}>
        <QuickActionButton
          icon="share-2"
          label={t("profile.public.share")}
          onPress={onShare}
          color={PALETTE.brandTeal}
        />
        <QuickActionButton
          icon="flag"
          label={t("profile.public.report")}
          onPress={onReport}
          color={PALETTE.danger}
        />
      </View>

      <Animated.View
        style={[
          styles.statsRow,
          {
            opacity: statsOpacity,
            transform: [{ translateY: statsTranslateY }],
          },
        ]}
      >
        <Pressable
          style={styles.statCard}
          onPressIn={() => onPressIn(statScale1)}
          onPressOut={() => onPressOut(statScale1)}
        >
          <Animated.View
            style={[
              styles.statCardInner,
              { transform: [{ scale: statScale1 }] },
            ]}
          >
            <View style={[styles.statIconBg, { backgroundColor: "#FFF5F7" }]}>
              <Feather name="package" size={20} color={PALETTE.brandPink} />
            </View>
            <View>
              <AnimatedStatValue
                value={stats?.orders ?? 0}
                style={styles.statValue}
              />
              <Text style={styles.statLabel}>
                {viewMode === "traveler"
                  ? t("profile.stats.deliveries")
                  : t("profile.stats.orders")}
              </Text>
            </View>
          </Animated.View>
        </Pressable>

        <View style={styles.statDivider} />

        <Pressable
          style={styles.statCard}
          onPressIn={() => onPressIn(statScale2)}
          onPressOut={() => onPressOut(statScale2)}
        >
          <Animated.View
            style={[
              styles.statCardInner,
              { transform: [{ scale: statScale2 }] },
            ]}
          >
            <View style={[styles.statIconBg, { backgroundColor: "#FFF9E6" }]}>
              <Ionicons name="star" size={20} color={PALETTE.gold} />
            </View>
            <View>
              <AnimatedStatValue
                value={stats?.rating ?? 0}
                style={styles.statValue}
              />
              <Text style={styles.statLabel}>{t("profile.stats.rating")}</Text>
            </View>
          </Animated.View>
        </Pressable>

        <View style={styles.statDivider} />

        <Pressable
          style={styles.statCard}
          onPressIn={() => onPressIn(statScale3)}
          onPressOut={() => onPressOut(statScale3)}
        >
          <Animated.View
            style={[
              styles.statCardInner,
              { transform: [{ scale: statScale3 }] },
            ]}
          >
            <View style={[styles.statIconBg, { backgroundColor: "#E6FFFA" }]}>
              <Feather name="clock" size={20} color={PALETTE.brandTeal} />
            </View>
            <View>
              <AnimatedStatValue
                value={stats?.reliability ?? "N/A"}
                style={styles.statValue}
              />
              <Text style={styles.statLabel}>
                {t("profile.stats.reliability")}
              </Text>
            </View>
          </Animated.View>
        </Pressable>
      </Animated.View>

      <View style={styles.tabsSection}>
        <View style={styles.toggleContainer}>
          <Animated.View
            style={[
              styles.slidingIndicator,
              {
                width: TOGGLE_CONTAINER_WIDTH / 2,
                transform: [{ translateX: toggleTranslateX }],
              },
            ]}
          />
          <TouchableOpacity
            style={styles.toggleBtn}
            onPress={() => onModeSwitch("traveler")}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.toggleText,
                viewMode === "traveler" && styles.toggleTextActive,
              ]}
            >
              {t("profile.tabs.traveler")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.toggleBtn}
            onPress={() => onModeSwitch("requester")}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.toggleText,
                viewMode === "requester" && { color: PALETTE.brandTeal },
              ]}
            >
              {t("profile.tabs.shopper")}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.contextHeader}>
          <Text style={styles.contextTitle}>
            {t("profile.public.reviews_title")}
          </Text>
          <Text style={styles.contextCount}>
            {reviewCount === 1
              ? t("profile.public.review_count_single", { count: reviewCount })
              : t("profile.public.review_count_plural", { count: reviewCount })}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { t } = useTranslation();

  const scrollY = useRef(new Animated.Value(0)).current;

  const [viewMode, setViewMode] = useState<"traveler" | "requester">(
    "traveler",
  );
  const [refreshing, setRefreshing] = useState(false);

  const [showToast, setShowToast] = useState(false);
  const toastAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(toastAnim, {
      toValue: showToast ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [showToast]);

  const profile = useQuery(api.users.getUserProfile, {
    id: id as Id<"users">,
  });
  const userStats = useQuery(
    api.users.getUserStats,
    profile ? { id: profile._id } : "skip",
  );
  const reviews = useQuery(
    api.reviews.getUserReviews,
    profile ? { id: profile._id } : "skip",
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  }, []);

  if (!profile || !userStats || !reviews)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#FFF",
          paddingTop: 60,
          paddingHorizontal: 20,
        }}
      >
        <SkeletonItem
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            marginBottom: 20,
          }}
        />
        <SkeletonItem
          style={{
            width: "60%",
            height: 30,
            borderRadius: 8,
            marginBottom: 10,
          }}
        />
        <SkeletonItem
          style={{
            width: "40%",
            height: 20,
            borderRadius: 8,
            marginBottom: 40,
          }}
        />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <SkeletonItem style={{ flex: 1, height: 80, borderRadius: 12 }} />
          <SkeletonItem style={{ flex: 1, height: 80, borderRadius: 12 }} />
          <SkeletonItem style={{ flex: 1, height: 80, borderRadius: 12 }} />
        </View>
      </View>
    );

  const targetRole = viewMode === "traveler" ? "traveler" : "requester";
  const filteredReviews = reviews.filter(
    (item) => item.review.revieweeRole === targetRole,
  );

  const handleModeSwitch = (mode: "traveler" | "requester") => {
    if (viewMode !== mode) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setViewMode(mode);
    }
  };

  const handleShareProfile = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: t("profile.share_msg", { name: profile?.fullname }),
      });
    } catch (error) {
      console.log(error);
    }
  };

  const handleCopyUsername = () => {
    Clipboard.setStringAsync(`@${profile?.username}`);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const handleReport = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Using Alert for a professional UI confirmation
    Alert.alert(
      t("profile.public.report_title"),
      t("profile.public.report_message"),
      [
        { text: t("trip_component.modals.delete.cancel"), style: "cancel" },
        {
          text: t("profile.public.report"),
          style: "destructive",
          onPress: () => {
            // Your logic for reporting the user would go here
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            console.log("User reported");
          },
        },
      ],
    );
  };

  const getDynamicStats = () => {
    if (!userStats) return null;

    const isTraveler = viewMode === "traveler";
    const rawRating = isTraveler
      ? userStats.userAsTravelerRating
      : userStats.userAsRequesterRating;
    const rawOrders = isTraveler
      ? userStats.userAsTravelerCompletedOrders
      : userStats.userAsRequesterCompletedOrders;
    const rawReliability = userStats.userPuncRating;

    const isNew = !rawOrders || rawOrders === 0;

    return {
      rating: rawRating ? rawRating.toFixed(1) : t("profile.stats.new"),
      orders: rawOrders || 0,
      reliability: isNew
        ? "N/A"
        : rawReliability
          ? Math.round(rawReliability) + "%"
          : "100%",
    };
  };

  const stats = getDynamicStats();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <Animated.View
        style={[
          styles.stickyHeaderBg,
          {
            opacity: scrollY.interpolate({
              inputRange: [80, 150],
              outputRange: [0, 1],
              extrapolate: "clamp",
            }),
          },
        ]}
      >
        <Animated.View
          style={[
            styles.stickyHeaderInner,
            {
              transform: [
                {
                  translateY: scrollY.interpolate({
                    inputRange: [80, 150],
                    outputRange: [10, 0],
                    extrapolate: "clamp",
                  }),
                },
              ],
            },
          ]}
        >
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color={PALETTE.textPrimary} />
          </TouchableOpacity>
          <Image
            source={profile?.imageURL}
            style={styles.stickyAvatar}
            contentFit="cover"
          />
          <Text style={styles.stickyHeaderTitle}>{profile.fullname}</Text>
          {profile?.isVerified && (
            <LinearGradient
              colors={PALETTE.brandGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.stickyVerifiedBadge}
            >
              <Ionicons name="checkmark" size={9} color="#FFF" />
            </LinearGradient>
          )}
        </Animated.View>
      </Animated.View>

      <Animated.FlatList
        style={{ flex: 1 }}
        data={filteredReviews}
        keyExtractor={(item) => item.review._id}
        renderItem={({ item }) => <ReviewItem item={item} />}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
        ListHeaderComponent={
          <ListHeader
            profile={profile}
            userStats={userStats}
            stats={stats}
            viewMode={viewMode}
            reviewCount={filteredReviews.length}
            onBack={() => router.back()}
            onShare={handleShareProfile}
            onReport={handleReport}
            onCopyUsername={handleCopyUsername}
            onModeSwitch={handleModeSwitch}
            scrollY={scrollY}
          />
        }
        ListFooterComponent={<View style={{ height: 100 }} />}
        ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
        contentContainerStyle={{
          paddingBottom: 40,
          paddingTop: 0,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={PALETTE.brandPink}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBg}>
              <Feather
                name="message-square"
                size={32}
                color={PALETTE.textSecondary}
              />
            </View>
            <Text style={styles.emptyTitle}>
              {t("profile.public.empty_reviews_title")}
            </Text>
            <Text style={styles.emptyText}>
              {t("profile.public.empty_reviews_desc", {
                name: profile.fullname,
                role:
                  viewMode === "traveler"
                    ? t("profile.tabs.traveler").toLowerCase()
                    : t("profile.tabs.shopper").toLowerCase(),
              })}
            </Text>
          </View>
        }
      />

      <Animated.View
        style={[
          styles.copyToast,
          {
            opacity: toastAnim,
            transform: [
              {
                translateY: toastAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Feather
          name="check"
          size={16}
          color="#FFF"
          style={{ marginRight: 8 }}
        />
        <Text style={styles.hintText}>
          {t("profile.toast.username_copied")}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PALETTE.background,
  },
  headerContainer: {
    backgroundColor: PALETTE.background,
  },
  stickyHeaderBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: Platform.OS === "ios" ? 90 : 80,
    backgroundColor: "rgba(255,255,255,0.97)",
    zIndex: 100,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    paddingTop: Platform.OS === "ios" ? 44 : 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  stickyHeaderInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
  },
  stickyAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  stickyHeaderTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: PALETTE.textPrimary,
  },
  stickyVerifiedBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  heroContainer: {
    paddingTop: STATUSBAR_HEIGHT,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  topActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F7F7F7",
    borderWidth: 1,
    borderColor: "#EBEBEB",
    alignItems: "center",
    justifyContent: "center",
  },
  identitySection: {},
  avatarWrapper: {
    position: "relative",
    alignSelf: "flex-start",
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarLarge: {
    width: 84,
    height: 84,
    borderRadius: 42,
  },
  avatarGlow: {
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  verifiedBadgeContainer: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
    borderRadius: 14,
    shadowColor: PALETTE.brandPink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  verifiedBadgeGradient: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  nameBlock: {
    marginBottom: 4,
  },
  heroName: {
    fontSize: 28,
    fontWeight: "800",
    color: PALETTE.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
    flexWrap: "wrap",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    fontWeight: "500",
    color: PALETTE.textSecondary,
  },
  metaDot: {
    fontSize: 14,
    fontWeight: "700",
    color: PALETTE.textLight,
    marginHorizontal: 2,
  },
  bioContainer: {
    backgroundColor: "#F9F9F9",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 2,
  },
  bioText: {
    fontSize: 14,
    color: PALETTE.textPrimary,
    lineHeight: 18,
    opacity: 0.85,
  },
  quickActionsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 40,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  quickActionItem: {
    alignItems: "center",
    gap: 6,
  },
  quickActionIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#F7F7F7",
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: PALETTE.textSecondary,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
  },
  statCardInner: {
    alignItems: "center",
    gap: 6,
  },
  statIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: PALETTE.textPrimary,
    textAlign: "center",
  },
  statLabel: {
    fontSize: 12,
    color: PALETTE.textSecondary,
    textAlign: "center",
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#EBEBEB",
  },
  tabsSection: {
    marginBottom: 10,
  },
  toggleContainer: {
    flexDirection: "row",
    marginHorizontal: 20,
    backgroundColor: "#F7F7F7",
    borderRadius: 30,
    padding: 4,
    marginBottom: 20,
    position: "relative",
  },
  slidingIndicator: {
    position: "absolute",
    top: 4,
    left: 4,
    bottom: 4,
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 26,
    position: "relative",
    overflow: "hidden",
    zIndex: 1,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "600",
    color: PALETTE.textSecondary,
    zIndex: 2,
  },
  toggleTextActive: {
    color: PALETTE.brandPink,
  },
  contextHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    marginTop: 2,
    marginBottom: 10,
  },
  contextTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: PALETTE.textPrimary,
  },
  contextCount: {
    fontSize: 13,
    color: PALETTE.textSecondary,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    marginHorizontal: 20,
  },
  emptyIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F7F7F7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: PALETTE.textPrimary,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: PALETTE.textSecondary,
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 22,
  },
  copyToast: {
    position: "absolute",
    bottom: 100,
    alignSelf: "center",
    backgroundColor: "#222",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 100,
  },
  hintText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
