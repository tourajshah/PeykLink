import Request from "@/components/Request";
import ReviewItem from "@/components/ReviewItem";
import Trip from "@/components/Trip";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@clerk/clerk-expo";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

// === TRANSLATION IMPORT ===
import { useTranslation } from "react-i18next";

// === CLIPBOARD IMPORT (Bug Fix: actually copy to clipboard) ===
import * as Clipboard from "expo-clipboard";

const { width, height } = Dimensions.get("window");

const STATUSBAR_HEIGHT =
  Platform.OS === "ios" ? 50 : (StatusBar.currentHeight || 24) + 8;

// Modified to accept a localized fallback string for "Recently"
const formatJoinDate = (
  timestamp: number,
  locale: string,
  fallbackRecently: string,
) => {
  if (!timestamp) return fallbackRecently;
  const date = new Date(timestamp);
  return date.toLocaleDateString(locale, { month: "long", year: "numeric" });
};

// === PALETTE (Airbnb/Grabr Style) ===
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
  inputBg: "#F7F7F7",
  cardShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 4,
  },
};

// === SHIMMER SKELETON COMPONENT ===
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

// === ANIMATED COUNT-UP STAT VALUE ===
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

// === QUICK ACTION BUTTON COMPONENT ===
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

// === ANIMATED FILTER PILL COMPONENT ===
const AnimatedPill = ({
  isActive,
  activeColor,
  onPress,
  children,
}: {
  isActive: boolean;
  activeColor: string;
  onPress: () => void;
  children: React.ReactNode;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.93,
      friction: 4,
      tension: 50,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 50,
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
        style={[
          styles.pill,
          isActive && {
            backgroundColor: activeColor,
            borderColor: activeColor,
            shadowColor: activeColor,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 3,
          },
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
};

// --- INTERFACE FOR LIST HEADER PROPS ---
interface ListHeaderProps {
  currentUser: any;
  userStats: any;
  stats: { rating: string | number; orders: number; reliability: string };
  viewMode: "traveler" | "requester";
  subViewMode: "active" | "archived" | "reviews";
  dataCount: number;
  onShare: () => void;
  onSignOut: () => void;
  onCopyUsername: () => void;
  onEditProfile: () => void;
  onOpenWallet: () => void;
  onSettings: () => void;
  onReferral: () => void;
  onSupport: () => void;
  onModeSwitch: (mode: "traveler" | "requester") => void;
  onSubModeSwitch: (mode: "active" | "archived" | "reviews") => void;
  scrollY: Animated.Value;
}

// --- EXTRACTED LIST HEADER COMPONENT ---
const ListHeader = ({
  currentUser,
  userStats,
  stats,
  viewMode,
  subViewMode,
  dataCount,
  onShare,
  onSignOut,
  onCopyUsername,
  onEditProfile,
  onOpenWallet,
  onSettings,
  onReferral,
  onSupport,
  onModeSwitch,
  onSubModeSwitch,
  scrollY,
}: ListHeaderProps) => {
  const { t, i18n } = useTranslation();

  // Animations
  const walletScale = useRef(new Animated.Value(1)).current;
  const shareScale = useRef(new Animated.Value(1)).current;
  const settingsScale = useRef(new Animated.Value(1)).current;
  const statScale1 = useRef(new Animated.Value(1)).current;
  const statScale2 = useRef(new Animated.Value(1)).current;
  const statScale3 = useRef(new Animated.Value(1)).current;
  const toggleAnim = useRef(new Animated.Value(0)).current;
  const TOGGLE_CONTAINER_WIDTH = width - 40 - 8;

  useEffect(() => {
    Animated.spring(toggleAnim, {
      toValue: viewMode === "traveler" ? 0 : 1,
      friction: 8,
      tension: 60,
      useNativeDriver: true,
    }).start();
  }, [viewMode]);

  const toggleTranslateX = toggleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, TOGGLE_CONTAINER_WIDTH / 2],
  });

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

  const activeColor =
    viewMode === "traveler" ? PALETTE.brandPink : PALETTE.brandTeal;

  return (
    <View style={styles.headerContainer}>
      {/* === 1. HERO HEADER === */}
      <View style={styles.heroContainer}>
        <Animated.View
          style={[styles.identitySection, { opacity: headerOpacity }]}
        >
          <TouchableOpacity onPress={() => onEditProfile()} activeOpacity={0.9}>
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
                  source={currentUser?.imageURL}
                  style={[styles.avatarLarge, styles.avatarGlow]}
                  contentFit="cover"
                  transition={500}
                />
              </Animated.View>

              {/* Premium Verified Badge */}
              {currentUser?.isVerified && (
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
          </TouchableOpacity>

          <View style={styles.nameBlock}>
            <Text style={styles.heroName}>{currentUser?.fullname}</Text>
          </View>

          <View style={styles.metaRow}>
            <TouchableOpacity
              onPress={onCopyUsername}
              style={styles.metaItem}
              activeOpacity={0.7}
            >
              <Text style={styles.metaText}>@{currentUser?.username}</Text>
              <Feather name="copy" size={11} color={PALETTE.textLight} />
            </TouchableOpacity>
            <Text style={styles.metaDot}>{"\u00B7"}</Text>
            <View style={styles.metaItem}>
              <Feather name="calendar" size={11} color={PALETTE.textLight} />
              <Text style={styles.metaText}>
                {formatJoinDate(
                  userStats.userCreationTime,
                  i18n.language,
                  t("profile.recently"),
                )}
              </Text>
            </View>
          </View>

          {currentUser?.bio && (
            <View style={styles.bioContainer}>
              <Text
                style={styles.bioText}
                numberOfLines={3}
                ellipsizeMode="tail"
              >
                {currentUser.bio}
              </Text>
            </View>
          )}
        </Animated.View>
      </View>

      {/* === QUICK ACTION ROW === */}
      <View style={styles.quickActionsRow}>
        <QuickActionButton
          icon="edit-3"
          label={t("profile.quick_actions.edit")}
          onPress={onEditProfile}
          color={PALETTE.brandPink}
        />
        <QuickActionButton
          icon="users"
          label={t("profile.quick_actions.invite")}
          onPress={onReferral}
          color={PALETTE.brandTeal}
        />
        <QuickActionButton
          icon="headphones"
          label={t("profile.quick_actions.support")}
          onPress={onSupport}
          color={PALETTE.gold}
        />
        <QuickActionButton
          icon="log-out"
          label={t("profile.quick_actions.logout")}
          onPress={onSignOut}
          color={PALETTE.danger}
        />
      </View>

      {/* === 2. WALLET CARD === */}
      <View style={styles.sectionPadding}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            onOpenWallet();
          }}
          onPressIn={() => onPressIn(walletScale)}
          onPressOut={() => onPressOut(walletScale)}
        >
          <Animated.View
            style={[
              styles.walletCardNew,
              { transform: [{ scale: walletScale }] },
            ]}
          >
            <LinearGradient
              colors={
                viewMode === "traveler"
                  ? PALETTE.brandGradient
                  : PALETTE.tealGradient
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.walletAccentStripe}
            />

            <View style={styles.walletCardBody}>
              <View style={styles.walletCardTop}>
                <View style={styles.walletLabelRow}>
                  <View
                    style={[
                      styles.walletIconBg,
                      {
                        backgroundColor:
                          viewMode === "traveler" ? "#FFF0F3" : "#E6FFFA",
                      },
                    ]}
                  >
                    <Ionicons name="wallet" size={18} color={activeColor} />
                  </View>
                  <Text style={styles.walletCardTitle}>
                    {t("profile.wallet.balance")}
                  </Text>
                </View>
                <Feather
                  name="chevron-right"
                  size={20}
                  color={PALETTE.textLight}
                />
              </View>

              <View style={styles.walletCardBalance}>
                <Text style={styles.walletCurrency}>$</Text>
                <Text style={[styles.walletAmount, { color: activeColor }]}>
                  {currentUser?.walletBalance?.toFixed(2) || "0.00"}
                </Text>
              </View>

              <View style={styles.walletCardActions}>
                <TouchableOpacity
                  style={[
                    styles.walletActionPill,
                    {
                      borderColor: activeColor,
                      flex: 1,
                      justifyContent: "center",
                    },
                  ]}
                  disabled
                  activeOpacity={0.7}
                >
                  <Feather
                    name="arrow-down-left"
                    size={14}
                    color={activeColor}
                  />
                  <Text
                    style={[styles.walletActionText, { color: activeColor }]}
                  >
                    {t("profile.wallet.withdraw_funds")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </Pressable>
      </View>

      {/* === 3. STATS GRID === */}
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
                value={stats?.orders}
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
                value={stats?.rating}
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
                value={stats?.reliability}
                style={styles.statValue}
              />
              <Text style={styles.statLabel}>
                {t("profile.stats.reliability")}
              </Text>
            </View>
          </Animated.View>
        </Pressable>
      </Animated.View>

      {/* === 4. TABS & FILTER PILLS === */}
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

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {["active", "archived", "reviews"].map((fMode) => {
            const isActive = subViewMode === fMode;
            return (
              <AnimatedPill
                key={fMode}
                isActive={isActive}
                activeColor={activeColor}
                onPress={() => onSubModeSwitch(fMode as any)}
              >
                <Text style={[styles.pillText, isActive && { color: "#FFF" }]}>
                  {t(
                    `profile.filter.${fMode === "archived" ? "history" : fMode}`,
                  )}
                </Text>
              </AnimatedPill>
            );
          })}
        </ScrollView>

        <View style={styles.contextHeader}>
          <Text style={styles.contextTitle}>
            {subViewMode === "reviews"
              ? t("profile.context.reviews")
              : subViewMode === "active"
                ? t("profile.context.active_items")
                : t("profile.context.history")}
          </Text>
          <Text style={styles.contextCount}>
            {t("profile.context.items_count", { count: dataCount })}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default function Profile() {
  const { signOut, userId } = useAuth();
  const { t } = useTranslation();

  const scrollY = useRef(new Animated.Value(0)).current;

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isWalletModalVisible, setIsWalletModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [viewMode, setViewMode] = useState<"traveler" | "requester">(
    "traveler",
  );
  const [subViewMode, setSubViewMode] = useState<
    "active" | "archived" | "reviews"
  >("active");

  const [showToast, setShowToast] = useState(false);
  const toastAnim = useRef(new Animated.Value(0)).current;

  const modalSlide = useRef(new Animated.Value(height)).current;
  const modalBackdropFade = useRef(new Animated.Value(0)).current;

  const saveBtnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(toastAnim, {
      toValue: showToast ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [showToast]);

  const openEditModal = () => {
    setIsEditModalVisible(true);
    Animated.parallel([
      Animated.spring(modalSlide, {
        toValue: 0,
        useNativeDriver: true,
        damping: 15,
        stiffness: 100,
        mass: 0.8,
      }),
      Animated.timing(modalBackdropFade, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeEditModal = () => {
    Animated.parallel([
      Animated.timing(modalSlide, {
        toValue: height,
        duration: 250,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(modalBackdropFade, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsEditModalVisible(false);
    });
  };

  const currentUser = useQuery(
    api.users.getUserByClerkId,
    userId ? { clerkId: userId } : "skip",
  );
  const reviews = useQuery(
    api.reviews.getUserReviews,
    currentUser ? { id: currentUser._id } : "skip",
  );
  const userStats = useQuery(
    api.users.getUserStats,
    currentUser ? { id: currentUser._id } : "skip",
  );

  const myActiveTrips = useQuery(api.trips.getMyTrips, {
    statuses: ["Active"],
  });
  const myArchivedTrips = useQuery(api.trips.getMyTrips, {
    statuses: ["archived"],
  });
  const myActiveRequests = useQuery(api.requests.getMyRequests, {
    statuses: ["Active"],
  });
  const myArchivedRequests = useQuery(api.requests.getMyRequests, {
    statuses: ["completed", "archived"],
  });

  const updateProfile = useMutation(api.users.updateProfile);

  const [editedProfile, setEditedProfile] = useState({ fullname: "", bio: "" });

  useEffect(() => {
    if (currentUser) {
      setEditedProfile({
        fullname: currentUser.fullname || "",
        bio: currentUser.bio || "",
      });
    }
  }, [currentUser]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  }, []);

  if (
    !currentUser ||
    !userStats ||
    myActiveTrips === undefined ||
    myActiveRequests === undefined
  )
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
          style={{ width: 80, height: 80, borderRadius: 40, marginBottom: 20 }}
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
        <SkeletonItem
          style={{
            width: "100%",
            height: 180,
            borderRadius: 20,
            marginBottom: 20,
          }}
        />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <SkeletonItem style={{ flex: 1, height: 80, borderRadius: 12 }} />
          <SkeletonItem style={{ flex: 1, height: 80, borderRadius: 12 }} />
          <SkeletonItem style={{ flex: 1, height: 80, borderRadius: 12 }} />
        </View>
      </View>
    );

  type TripType = NonNullable<typeof myActiveTrips>[number];
  type RequestType = NonNullable<typeof myActiveRequests>[number];
  type ReviewType = NonNullable<typeof reviews>[number];

  const isTripsActive = viewMode === "traveler";

  let dataToRender: (TripType | RequestType | ReviewType)[] = [];

  if (subViewMode === "reviews") {
    const targetRole = viewMode === "traveler" ? "traveler" : "requester";
    dataToRender = (reviews || []).filter(
      (item) => item.review.revieweeRole === targetRole,
    );
  } else if (subViewMode === "active") {
    dataToRender = isTripsActive ? myActiveTrips : myActiveRequests || [];
  } else {
    dataToRender = isTripsActive
      ? myArchivedTrips || []
      : myArchivedRequests || [];
  }

  const handleModeSwitch = (mode: "traveler" | "requester") => {
    if (viewMode !== mode) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setViewMode(mode);
    }
  };

  const handleSubModeSwitch = (mode: "active" | "archived" | "reviews") => {
    Haptics.selectionAsync();
    setSubViewMode(mode);
  };

  const handleCopyUsername = () => {
    Clipboard.setStringAsync(`@${currentUser?.username}`);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const handleSaveProfile = async () => {
    if (!editedProfile.fullname.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await updateProfile(editedProfile);
    closeEditModal();
  };

  const handleShareProfile = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: t("profile.share_msg", { name: currentUser?.username }),
      });
    } catch (error) {
      console.log(error);
    }
  };

  const handleSettings = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log("Nav to settings");
  };

  const handleReferral = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    console.log("Referral trigger");
  };

  const handleSupport = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log("Support trigger");
  };

  const handleSignOut = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    signOut();
  };

  const getDynamicStats = () => {
    const useTravelerStats = viewMode === "traveler";
    const rawRating = useTravelerStats
      ? userStats.userAsTravelerRating
      : userStats.userAsRequesterRating;
    const rawOrders = useTravelerStats
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

  const renderFeedItem = ({ item }: { item: any }) => {
    if (subViewMode === "reviews") return <ReviewItem item={item} />;
    if (viewMode === "traveler") return <Trip trip={item as TripType} />;
    return <Request request={item as RequestType} />;
  };

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
          <Image
            source={currentUser?.imageURL}
            style={styles.stickyAvatar}
            contentFit="cover"
          />
          <Text style={styles.stickyHeaderTitle}>{currentUser.fullname}</Text>
          {currentUser?.isVerified && (
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
        data={dataToRender}
        keyExtractor={(item) => {
          if ("review" in item) return item.review._id;
          return item._id;
        }}
        renderItem={renderFeedItem}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
        ListHeaderComponent={
          <ListHeader
            currentUser={currentUser}
            userStats={userStats}
            stats={stats}
            viewMode={viewMode}
            subViewMode={subViewMode}
            dataCount={dataToRender?.length}
            onShare={handleShareProfile}
            onSignOut={handleSignOut}
            onCopyUsername={handleCopyUsername}
            onEditProfile={openEditModal}
            onOpenWallet={() => setIsWalletModalVisible(true)}
            onSettings={handleSettings}
            onReferral={handleReferral}
            onSupport={handleSupport}
            onModeSwitch={handleModeSwitch}
            onSubModeSwitch={handleSubModeSwitch}
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
                name={
                  subViewMode === "reviews"
                    ? "message-square"
                    : subViewMode === "active"
                      ? "inbox"
                      : "archive"
                }
                size={32}
                color={PALETTE.textSecondary}
              />
            </View>
            <Text style={styles.emptyTitle}>
              {subViewMode === "reviews"
                ? t("profile.empty.no_reviews")
                : subViewMode === "active"
                  ? t("profile.empty.no_active")
                  : t("profile.empty.archive_empty")}
            </Text>
            <Text style={styles.emptyText}>
              {subViewMode === "reviews"
                ? t("profile.empty.desc_reviews")
                : subViewMode === "active"
                  ? t("profile.empty.desc_active", {
                      type:
                        viewMode === "traveler" ? t("trips") : t("requests"),
                    })
                  : t("profile.empty.desc_archive")}
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

      <Modal
        visible={isEditModalVisible}
        transparent={true}
        animationType="none"
        onRequestClose={closeEditModal}
      >
        <TouchableWithoutFeedback onPress={closeEditModal}>
          <Animated.View
            style={[styles.modalBackdrop, { opacity: modalBackdropFade }]}
          />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.modalSheet,
            { transform: [{ translateY: modalSlide }] },
          ]}
        >
          <View style={styles.dragHandleBar} />

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1 }}
          >
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {t("profile.modals.edit.title")}
              </Text>
              <TouchableOpacity
                onPress={closeEditModal}
                style={styles.sheetCloseBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color={PALETTE.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.sheetContent}>
              <View style={styles.editAvatarSection}>
                <View style={styles.editAvatarWrapper}>
                  <Image
                    source={currentUser?.imageURL}
                    style={styles.editAvatar}
                  />
                  <View style={styles.editAvatarOverlay}>
                    <Ionicons name="camera" size={24} color="#FFF" />
                  </View>
                </View>
                <Text style={styles.changePhotoText}>
                  {t("profile.modals.edit.change_photo")}
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {t("profile.modals.edit.fullname_label")}
                </Text>
                <TextInput
                  style={styles.modernInput}
                  value={editedProfile.fullname}
                  onChangeText={(txt) =>
                    setEditedProfile((p) => ({ ...p, fullname: txt }))
                  }
                  placeholder={t("profile.modals.edit.fullname_placeholder")}
                  placeholderTextColor={PALETTE.textLight}
                />
              </View>

              <View style={styles.inputGroup}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Text style={styles.inputLabel}>
                    {t("profile.modals.edit.bio_label")}
                  </Text>
                  <Text style={styles.charCount}>
                    {editedProfile.bio.length}/150
                  </Text>
                </View>
                <TextInput
                  style={[styles.modernInput, styles.textArea]}
                  value={editedProfile.bio}
                  onChangeText={(txt) =>
                    setEditedProfile((p) => ({ ...p, bio: txt }))
                  }
                  multiline
                  maxLength={150}
                  placeholder={t("profile.modals.edit.bio_placeholder")}
                  placeholderTextColor={PALETTE.textLight}
                />
              </View>

              <Pressable
                onPress={handleSaveProfile}
                onPressIn={() => {
                  Animated.spring(saveBtnScale, {
                    toValue: 0.97,
                    friction: 4,
                    tension: 40,
                    useNativeDriver: true,
                  }).start();
                }}
                onPressOut={() => {
                  Animated.spring(saveBtnScale, {
                    toValue: 1,
                    friction: 4,
                    tension: 40,
                    useNativeDriver: true,
                  }).start();
                }}
              >
                <Animated.View
                  style={[
                    styles.sheetSaveBtn,
                    { transform: [{ scale: saveBtnScale }] },
                  ]}
                >
                  <Text style={styles.sheetSaveText}>
                    {t("profile.modals.edit.save_btn")}
                  </Text>
                </Animated.View>
              </Pressable>

              <TouchableOpacity
                style={styles.logoutBtn}
                onPress={handleSignOut}
              >
                <Text style={styles.logoutText}>
                  {t("profile.modals.edit.logout")}
                </Text>
              </TouchableOpacity>

              <View style={{ height: 40 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        </Animated.View>
      </Modal>

      <Modal
        visible={isWalletModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsWalletModalVisible(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.walletModalCard}>
            <View style={styles.walletModalHeader}>
              <Text style={styles.walletModalTitle}>
                {t("profile.modals.wallet.title")}
              </Text>
              <TouchableOpacity
                onPress={() => setIsWalletModalVisible(false)}
                style={styles.closeCircle}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color={PALETTE.textPrimary} />
              </TouchableOpacity>
            </View>
            <View style={styles.emptyWalletContainer}>
              <View style={styles.emptyWalletIcon}>
                <Ionicons
                  name="receipt-outline"
                  size={32}
                  color={PALETTE.textLight}
                />
              </View>
              <Text style={styles.emptyWalletTitle}>
                {t("profile.modals.wallet.empty_title")}
              </Text>
              <Text style={styles.emptyWalletText}>
                {t("profile.modals.wallet.empty_desc")}
              </Text>
              <TouchableOpacity style={styles.addFundsButton} disabled>
                <Text style={styles.addFundsText}>
                  {t("profile.modals.wallet.fund_btn")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    justifyContent: "flex-end",
    gap: 10,
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
    justifyContent: "space-around",
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
  sectionPadding: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  walletCardNew: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    ...PALETTE.cardShadow,
  },
  walletAccentStripe: {
    height: 4,
    width: "100%",
  },
  walletCardBody: {
    padding: 20,
  },
  walletCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  walletIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  walletCardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: PALETTE.textSecondary,
  },
  walletCardBalance: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  walletCurrency: {
    fontSize: 20,
    fontWeight: "600",
    color: PALETTE.textSecondary,
    marginTop: 4,
    marginRight: 2,
  },
  walletAmount: {
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: -1,
  },
  walletCardActions: {
    flexDirection: "row",
    gap: 12,
  },
  walletActionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E2E2",
  },
  walletActionText: {
    fontSize: 13,
    fontWeight: "600",
    color: PALETTE.textSecondary,
  },
  walletLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
  filterScroll: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    gap: 10,
  },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E2E2E2",
    backgroundColor: "#FFF",
    marginRight: 8,
  },
  pillText: {
    fontSize: 14,
    fontWeight: "600",
    color: PALETTE.textPrimary,
  },
  contextHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    marginTop: 10,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "92%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 25,
  },
  dragHandleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E0E0E0",
    alignSelf: "center",
    marginTop: 12,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F7F7F7",
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: PALETTE.textPrimary,
  },
  sheetCloseBtn: {
    padding: 4,
  },
  sheetContent: {
    padding: 24,
  },
  editAvatarSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  editAvatarWrapper: {
    position: "relative",
    marginBottom: 12,
  },
  editAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  editAvatarOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  changePhotoText: {
    color: PALETTE.textPrimary,
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: PALETTE.textSecondary,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  modernInput: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: PALETTE.textPrimary,
  },
  textArea: {
    height: 120,
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: 12,
    color: PALETTE.textLight,
    marginBottom: 8,
  },
  sheetSaveBtn: {
    backgroundColor: PALETTE.brandPink,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  sheetSaveText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
  logoutBtn: {
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F0F0F0",
    borderRadius: 12,
  },
  logoutText: {
    color: PALETTE.textPrimary,
    fontWeight: "600",
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
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  walletModalCard: {
    backgroundColor: "#FFF",
    width: "100%",
    borderRadius: 24,
    padding: 24,
    maxHeight: 500,
  },
  walletModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  walletModalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: PALETTE.textPrimary,
  },
  closeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F7F7F7",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyWalletContainer: {
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyWalletIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F7F7F7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyWalletTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: PALETTE.textPrimary,
    marginBottom: 8,
  },
  emptyWalletText: {
    textAlign: "center",
    color: PALETTE.textSecondary,
    lineHeight: 22,
    marginBottom: 24,
  },
  addFundsButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: "#F7F7F7",
  },
  addFundsText: {
    color: PALETTE.textLight,
    fontWeight: "600",
    fontSize: 14,
  },
});
