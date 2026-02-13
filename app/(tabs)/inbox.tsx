// app/(tabs)/inbox.tsx

import OfferThreadItem from "@/components/Offer";
import ReviewPrompt from "@/components/Review";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import {
  Dimensions,
  LayoutAnimation,
  Platform,
  Pressable,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import ReAnimated, {
  Extrapolation,
  interpolate,
  LinearTransition,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

// === TRANSLATION ===
import { useTranslation } from "react-i18next";

const { width } = Dimensions.get("window");
const STATUSBAR_HEIGHT =
  Platform.OS === "ios" ? 50 : (StatusBar.currentHeight || 24) + 8;

const TITLE_AREA_HEIGHT = 60;
const HEADER_TOTAL_HEIGHT = STATUSBAR_HEIGHT + 185;

export default function InboxScreen() {
  const { userId } = useAuth();
  const { t } = useTranslation();

  const scrollY = useSharedValue(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const searchBorder = useSharedValue(0);

  const currentUser = useQuery(
    api.users.getUserByClerkId,
    userId ? { clerkId: userId } : "skip",
  );
  const [activeTab, setActiveTab] = useState<"Requests" | "Trips" | "All">(
    "All",
  );

  const threads = useQuery(api.offers.getMyOfferThreads);
  const notReviewedNegotiations = useQuery(
    api.reviews.getNotReviewedNegotiations,
  );

  const filteredThreads = useMemo(() => {
    if (!threads || !currentUser) return [];

    let result = threads;

    if (activeTab === "Requests")
      result = result.filter(
        (t) => t.negotiation.requesterId === currentUser._id,
      );
    else if (activeTab === "Trips")
      result = result.filter(
        (t) => t.negotiation.travelerId !== currentUser._id,
      );

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.otherUser.username?.toLowerCase().includes(q) ||
          t.requestDetails.productName.toLowerCase().includes(q) ||
          t.tripDetails.originCity.toLowerCase().includes(q) ||
          t.tripDetails.destinationCity.toLowerCase().includes(q),
      );
    }

    const getPriority = (t: any) => {
      const { status } = t.negotiation;
      const isMeSender = t.latestOffer.senderId === currentUser._id;

      if (status === "pending" && !isMeSender) return 0;
      if (status === "pending" && isMeSender) return 1;
      if (status === "accepted") return 2;
      if (status === "paid") return 3;
      if (status === "completed") return 4;
      if (status === "rejected") return 5;
      return 6;
    };

    return result.sort((a, b) => {
      const pA = getPriority(a);
      const pB = getPriority(b);
      if (pA !== pB) return pA - pB;
      return b.latestOffer._creationTime - a.latestOffer._creationTime;
    });
  }, [threads, searchQuery, activeTab, currentUser]);

  const handleTabChange = (tab: any) => {
    Haptics.selectionAsync();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveTab(tab);
  };

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const headerAnimatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [0, TITLE_AREA_HEIGHT],
      [0, -TITLE_AREA_HEIGHT],
      Extrapolation.CLAMP,
    );
    return {
      transform: [{ translateY }],
    };
  });

  const titleAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, TITLE_AREA_HEIGHT / 1.5],
      [1, 0],
      Extrapolation.CLAMP,
    );
    return {
      opacity,
    };
  });

  const searchAnimatedStyle = useAnimatedStyle(() => ({
    borderColor: withTiming(
      searchBorder.value === 1 ? "#FF385C" : "transparent",
      { duration: 200 },
    ),
    transform: [{ scale: withSpring(searchBorder.value === 1 ? 1.02 : 1) }],
  }));

  return (
    <View style={styles.container}>
      <ReAnimated.View style={[styles.absoluteHeader, headerAnimatedStyle]}>
        <BlurView intensity={90} tint="light" style={styles.headerBlur}>
          <View style={styles.headerInner}>
            <ReAnimated.View
              style={[styles.headerTitleRow, titleAnimatedStyle]}
            >
              <Text style={styles.headerTitle}>{t("inbox.title")}</Text>
            </ReAnimated.View>

            <ReAnimated.View
              style={[styles.searchContainer, searchAnimatedStyle]}
            >
              <Ionicons name="search" size={20} color="#717171" />
              <TextInput
                style={styles.searchInput}
                placeholder={t("inbox.search_placeholder")}
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onFocus={() => {
                  searchBorder.value = 1;
                }}
                onBlur={() => {
                  searchBorder.value = 0;
                }}
              />
            </ReAnimated.View>

            <View style={styles.tabContainer}>
              {["All", "Requests", "Trips"].map((tab) => (
                <Pressable
                  key={tab}
                  onPress={() => handleTabChange(tab)}
                  style={[styles.pill, activeTab === tab && styles.pillActive]}
                >
                  <Text
                    style={[
                      styles.pillText,
                      activeTab === tab && { color: "#FFF" },
                    ]}
                  >
                    {t(`inbox.tabs.${tab.toLowerCase()}`)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </BlurView>
      </ReAnimated.View>

      <ReAnimated.FlatList
        data={filteredThreads}
        itemLayoutAnimation={LinearTransition}
        keyExtractor={(item) => item.negotiation._id}
        renderItem={({ item }) => (
          <OfferThreadItem thread={item} currentUserId={currentUser?._id} />
        )}
        contentContainerStyle={[
          styles.listContainer,
          { paddingTop: HEADER_TOTAL_HEIGHT },
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {notReviewedNegotiations?.[0] && (
              <ReviewPrompt
                negotiation={notReviewedNegotiations[0]}
                travelerName={notReviewedNegotiations[0].travelerName}
                productImageUrl={notReviewedNegotiations[0].productImageUrl}
                userAvatarUrl={notReviewedNegotiations[0].userAvatarUrl}
              />
            )}
            <Text style={styles.sectionHeader}>
              {activeTab === "All"
                ? t("inbox.section.recent_activity")
                : activeTab === "Requests"
                  ? t("inbox.section.my_orders")
                  : t("inbox.section.my_trips")}
            </Text>
          </View>
        }
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        removeClippedSubviews={false}
        windowSize={10}
        maxToRenderPerBatch={10}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => setRefreshing(false)}
            tintColor="#FF385C"
            progressViewOffset={HEADER_TOTAL_HEIGHT}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  absoluteHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  headerBlur: {
    paddingTop: STATUSBAR_HEIGHT,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  headerInner: { paddingBottom: 12 },
  headerTitleRow: {
    height: TITLE_AREA_HEIGHT,
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: "800",
    color: "#1A1A1A",
    letterSpacing: -1,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 30,
    paddingHorizontal: 16,
    height: 46,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    color: "#1A1A1A",
    height: "100%",
  },
  tabContainer: { flexDirection: "row", paddingHorizontal: 20, gap: 10 },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#F7F7F7",
  },
  pillActive: { backgroundColor: "#1A1A1A" },
  pillText: { fontSize: 14, fontWeight: "600", color: "#1A1A1A" },
  listContainer: { paddingBottom: 100 },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: "#717171",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginLeft: 20,
    marginBottom: 8,
    marginTop: 4,
  },
});
