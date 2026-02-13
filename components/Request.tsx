/**
 * Request Component - Airbnb-Level Design
 * Displays a delivery request card in the PeykLink marketplace
 *
 * Design: Clean, flat colors, generous whitespace, clear hierarchy
 *
 * * PRODUCTION FIX (FEB 2026):
 * - [CRITICAL FIX] Removed `entering={FadeInDown}` from root Animated.View.
 *   This was causing the Reanimated "transform overwrite" warning because FadeInDown
 *   uses transform internally, conflicting with parent scroll-driven animated styles.
 * - [FIX] Removed LayoutAnimation.configureNext() from toggleDescription.
 *   LayoutAnimation conflicts with Reanimated on the same render tree.
 * - [CLEANUP] Removed UIManager.setLayoutAnimationEnabledExperimental block (no-op in New Arch).
 */

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useUser } from "@clerk/clerk-expo";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  // [REMOVED] LayoutAnimation - conflicts with Reanimated 4.x, causes transform overwrite warning
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  // [REMOVED] UIManager - was only used for setLayoutAnimationEnabledExperimental (no-op in New Arch)
  View,
} from "react-native";
import CountryFlag from "react-native-country-flag";
// [REMOVED] FadeInDown import - was applied as entering animation on card root,
// caused Reanimated "transform overwrite" warning when parent uses animated scroll styles.
import Animated from "react-native-reanimated";
import Toast from "react-native-toast-message";

// === TRANSLATION ===
import { useTranslation } from "react-i18next";

// [REMOVED] UIManager.setLayoutAnimationEnabledExperimental block.
// Was enabling LayoutAnimation on Android, but LayoutAnimation conflicts with
// Reanimated 4.x on the same render tree. Also a no-op in Expo 50+ / New Architecture.

// ============================================================================
// DESIGN TOKENS - Matching Index Screen
// ============================================================================
const DESIGN = {
  colors: {
    background: "#FFFFFF",
    backgroundSecondary: "#F7F7F7",
    surface: "#FFFFFF",

    textPrimary: "#222222",
    textSecondary: "#717171",
    textTertiary: "#B0B0B0",
    textInverse: "#FFFFFF",

    // Brand colors
    brand: "#FF385C",
    brandLight: "rgba(255, 56, 92, 0.08)",

    // Request accent (teal/green)
    accent: "#00A699",
    accentLight: "rgba(0, 166, 153, 0.08)",
    accentDark: "#008489",

    border: "#EBEBEB",
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
type RequestProps = {
  request: {
    _id: Id<"requests">;
    _creationTime: number;
    description?: string;
    productURL?: string;
    imageKey?: string;
    productWeight?: string;
    originCity: string;
    destinationCity: string;
    itemTypes?: string;
    requiredByDate: number;
    itemPrice: number;
    quantity: number;
    travelerFee: number;
    productName: string;
    originCountry: string;
    destinationCountry: string;
    status: string;
    originCountryCode: string;
    destinationCountryCode: string;
    requester: {
      _id: string;
      username: string;
      image: string;
      rating?: number;
      asRequesterRating?: number;
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
      <Ionicons name="star" size={12} color={DESIGN.colors.rating} />
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
      <Feather name="package" size={16} color={DESIGN.colors.accent} />
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

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function Request({ request }: RequestProps) {
  const { t, i18n } = useTranslation();

  // === DATE FORMATTING ===
  const formattedDate = new Date(request.requiredByDate).toLocaleDateString(
    i18n.language,
    {
      month: "short",
      day: "numeric",
    },
  );

  // === USER & DATA ===
  const { user } = useUser();
  const currentUser = useQuery(
    api.users.getUserByClerkId,
    user ? { clerkId: user?.id } : "skip",
  );

  const { itemTotal } = useMemo(
    () => ({
      itemTotal: request.itemPrice * request.quantity,
    }),
    [request.itemPrice, request.quantity],
  );

  const formatCurrency = (amount: number) => `$${amount.toFixed(0)}`;

  // === STATE ===
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [isOfferModalVisible, setOfferModalVisible] = useState(false);
  const [isDescriptionExpanded, setDescriptionExpanded] = useState(false);
  const [isImageViewVisible, setImageViewVisible] = useState(false);
  const [proposedFee, setProposedFee] = useState(
    request.travelerFee.toFixed(2),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // === MUTATIONS ===
  const deleteRequest = useMutation(api.requests.deleteRequest);
  const createInitialOffer = useMutation(api.offers.createInitialOffer);

  // === COMPUTED ===
  const isLoadingUser = currentUser === undefined;
  const isOwner = currentUser?._id === request.requester._id;
  const isPotentialTraveler = !isLoadingUser && !isOwner;

  const myMatchingTrips = useQuery(
    api.trips.getMyMatchingTrips,
    isPotentialTraveler
      ? {
          originCity: request.originCity,
          destinationCity: request.destinationCity,
        }
      : "skip",
  );
  const isLoadingTrips = myMatchingTrips === undefined;
  const hasMatchingTrip = myMatchingTrips && myMatchingTrips.length > 0;

  // === HANDLERS ===
  const handleProfilePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/user/${request.requester._id}`);
  };

  const handleDeleteConfirm = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      await deleteRequest({ requestId: request._id });
      setDeleteModalVisible(false);
    } catch (error) {
      Alert.alert(t("error"), t("request_component.delete_error"));
    }
  };

  const handleEditConfirm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: "/orders",
      params: { request: JSON.stringify(request) },
    });
    setEditModalVisible(false);
  };

  const handleOpenOfferModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!hasMatchingTrip) {
      Alert.alert(
        t("request_component.no_matching_trip"),
        t("request_component.trip_needed_msg", {
          origin: request.originCity,
          dest: request.destinationCity,
        }),
      );
      return;
    }
    setOfferModalVisible(true);
  };

  const handleSubmitOffer = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSubmitting(true);

    const fee = parseFloat(proposedFee);
    if (isNaN(fee) || fee <= 0) {
      Alert.alert(
        t("request_component.invalid_fee"),
        t("request_component.valid_amount_msg"),
      );
      setIsSubmitting(false);
      return;
    }

    if (!myMatchingTrips || myMatchingTrips.length === 0) {
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await createInitialOffer({
        requestId: request._id,
        tripId: myMatchingTrips[0]._id,
        proposedFee: fee,
      });

      if (result.success && result.negotiationId) {
        setOfferModalVisible(false);
        router.push({
          pathname: "/(stack)/offers",
          params: { id: result.negotiationId },
        });
      } else if (result.reason === "DUPLICATE_OFFER") {
        setOfferModalVisible(false);
        Toast.show({
          type: "info",
          text1: t("request_component.duplicate_offer_title"),
          text2: t("request_component.duplicate_offer_msg"),
        });
      }
    } catch (error) {
      Alert.alert(t("error"), (error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleDescription = () => {
    // [REMOVED] LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    // LayoutAnimation conflicts with Reanimated 4.x - causes transform overwrite warning.
    // The expand/collapse still works via numberOfLines prop change, just without the
    // smooth height animation. This is the same approach used by Airbnb's app.
    setDescriptionExpanded(!isDescriptionExpanded);
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
      Alert.alert(t("error"), t("request_component.url_error"));
    }
  };

  // === RENDER ===
  // [CRITICAL FIX] Removed entering={FadeInDown.duration(400).springify()} from Animated.View below.
  // FadeInDown uses transform (translateY) internally. When this component is rendered
  // inside a parent with scroll-driven animated styles (FlashList + useAnimatedScrollHandler),
  // both compete for the transform property, triggering the Reanimated warning:
  // "Property 'transform' of AnimatedComponent(View) may be overwritten by a layout animation."
  // The card now renders immediately - which is actually faster perceived load.
  return (
    <Animated.View
      style={styles.card}
    >
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
              {t("request_component.modals.delete.title")}
            </Text>
            <Text style={styles.modalText}>
              {t("request_component.modals.delete.text")}
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
              {t("request_component.modals.edit.title")}
            </Text>
            <Text style={styles.modalText}>
              {t("request_component.modals.edit.text")}
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
                <Text style={styles.modalButtonPrimaryText}>{t("edit")}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Image Viewer Modal */}
      <Modal
        animationType="fade"
        transparent
        visible={isImageViewVisible}
        onRequestClose={() => setImageViewVisible(false)}
      >
        <Pressable
          style={styles.imageViewerOverlay}
          onPress={() => setImageViewVisible(false)}
        >
          <Image
            source={{ uri: `https://ts79.space/${request.imageKey}` }}
            style={styles.imageViewerImage}
            contentFit="contain"
          />
          <TouchableOpacity
            style={styles.imageViewerClose}
            onPress={() => setImageViewVisible(false)}
            accessibilityLabel={t("close")}
            accessibilityRole="button"
          >
            <Ionicons
              name="close"
              size={24}
              color={DESIGN.colors.textInverse}
            />
          </TouchableOpacity>
        </Pressable>
      </Modal>

      {/* Offer Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={isOfferModalVisible}
        onRequestClose={() => setOfferModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setOfferModalVisible(false)}
        >
          <Pressable style={styles.offerModalContent}>
            <View style={styles.offerModalHandle} />
            <Text style={styles.modalTitle}>
              {t("request_component.labels.propose_fee")}
            </Text>

            <View style={styles.offerInputContainer}>
              <Text style={styles.offerCurrency}>$</Text>
              <TextInput
                style={styles.offerInput}
                placeholder={request.travelerFee.toFixed(2)}
                placeholderTextColor={DESIGN.colors.textTertiary}
                keyboardType="numeric"
                value={proposedFee}
                onChangeText={setProposedFee}
                autoFocus
                accessibilityLabel={t("request_component.labels.propose_fee")}
              />
            </View>

            <Text style={styles.offerHint}>
              {t("request_component.suggested_fee")}: $
              {request.travelerFee.toFixed(2)}
            </Text>

            <TouchableOpacity
              style={[
                styles.offerSubmitButton,
                isSubmitting && styles.buttonDisabled,
              ]}
              onPress={handleSubmitOffer}
              disabled={isSubmitting}
              accessibilityLabel={t("request_component.labels.send_offer")}
              accessibilityRole="button"
            >
              {isSubmitting ? (
                <ActivityIndicator color={DESIGN.colors.textInverse} />
              ) : (
                <Text style={styles.offerSubmitText}>
                  {t("request_component.labels.send_offer")}
                </Text>
              )}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* === CARD HEADER === */}
      <View style={styles.cardHeader}>
        <TouchableOpacity
          style={styles.userInfo}
          onPress={handleProfilePress}
          accessibilityLabel={`${t("view_profile")}: ${request.requester.username}`}
          accessibilityRole="button"
        >
          <Image
            source={{ uri: request.requester.image }}
            style={styles.avatar}
            cachePolicy="memory-disk"
          />
          <View style={styles.userTextContainer}>
            <Text style={styles.username}>{request.requester.username}</Text>
            <Text style={styles.userSubtext}>
              {t("request_component.labels.requesting_item")}
            </Text>
          </View>
        </TouchableOpacity>

        {isOwner ? (
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
              <Feather
                name="edit-2"
                size={18}
                color={DESIGN.colors.textSecondary}
              />
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
              <Feather name="trash-2" size={18} color={DESIGN.colors.error} />
            </TouchableOpacity>
          </View>
        ) : (
          <RatingBadge rating={request.requester.asRequesterRating} />
        )}
      </View>

      {/* === ROUTE === */}
      <RouteDisplay
        originCode={request.originCountryCode}
        originCity={request.originCity}
        destCode={request.destinationCountryCode}
        destCity={request.destinationCity}
      />

      {/* === PRODUCT INFO === */}
      <View style={styles.productSection}>
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {request.productName}
          </Text>
          {request.productURL && (
            <TouchableOpacity
              style={styles.linkButton}
              onPress={handleProductLink}
              accessibilityLabel={t("request_component.labels.view_product")}
              accessibilityRole="link"
            >
              <Feather
                name="external-link"
                size={12}
                color={DESIGN.colors.accent}
              />
              <Text style={styles.linkText}>
                {t("request_component.labels.view_product")}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        {request.imageKey && (
          <TouchableOpacity
            onPress={() => setImageViewVisible(true)}
            accessibilityLabel={t("view_image")}
            accessibilityRole="button"
          >
            <Image
              source={{ uri: `https://ts79.space/${request.imageKey}` }}
              style={styles.productImage}
              contentFit="cover"
              transition={300}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* === DETAILS BAR === */}
      <View style={styles.detailsBar}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>
            {t("request_component.labels.reward")}
          </Text>
          <Text style={[styles.detailValue, styles.rewardValue]}>
            {formatCurrency(request.travelerFee)}
          </Text>
        </View>
        <View style={styles.detailDivider} />
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>
            {t("request_component.labels.due")}
          </Text>
          <Text style={styles.detailValue}>{formattedDate}</Text>
        </View>
        <View style={styles.detailDivider} />
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>
            {t("request_component.labels.cost")}
          </Text>
          <Text style={styles.detailValue}>{formatCurrency(itemTotal)}</Text>
        </View>
      </View>

      {/* === DESCRIPTION === */}
      {request.description && (
        <View style={styles.descriptionSection}>
          <Text
            style={styles.descriptionText}
            numberOfLines={isDescriptionExpanded ? undefined : 2}
          >
            {request.description}
          </Text>
          <TouchableOpacity
            onPress={toggleDescription}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.showMoreText}>
              {isDescriptionExpanded
                ? t("request_component.labels.show_less")
                : t("request_component.labels.show_more")}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* === ACTION BUTTON === */}
      {isPotentialTraveler && (
        <TouchableOpacity
          style={[
            styles.actionButton,
            isLoadingTrips && styles.buttonDisabled,
            hasMatchingTrip && styles.actionButtonActive,
          ]}
          onPress={handleOpenOfferModal}
          disabled={isLoadingTrips}
          activeOpacity={0.8}
          accessibilityLabel={t("request_component.labels.make_offer")}
          accessibilityRole="button"
        >
          {isLoadingTrips ? (
            <Text style={styles.actionButtonText}>
              {t("request_component.labels.checking_trips")}
            </Text>
          ) : (
            <>
              <Text
                style={[
                  styles.actionButtonText,
                  hasMatchingTrip && styles.actionButtonTextActive,
                ]}
              >
                {t("request_component.labels.make_offer")}
              </Text>
              <Feather
                name="arrow-right"
                size={16}
                color={
                  hasMatchingTrip
                    ? DESIGN.colors.textInverse
                    : DESIGN.colors.textSecondary
                }
              />
            </>
          )}
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  // === CARD ===
  card: {
    backgroundColor: DESIGN.colors.surface,
    marginHorizontal: DESIGN.spacing.lg,
    marginVertical: DESIGN.spacing.sm,
    borderRadius: DESIGN.radius.lg,
    padding: DESIGN.spacing.md,
    borderWidth: 1,
    borderColor: DESIGN.colors.border,
    ...DESIGN.shadow.card,
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
    backgroundColor: DESIGN.colors.accent,
  },
  routeDash: {
    flex: 1,
    height: 1,
    backgroundColor: DESIGN.colors.border,
    marginHorizontal: DESIGN.spacing.xs,
  },

  // === PRODUCT ===
  productSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: DESIGN.spacing.md,
  },
  productInfo: {
    flex: 1,
    paddingRight: DESIGN.spacing.md,
  },
  productName: {
    fontSize: 16,
    fontWeight: "600",
    color: DESIGN.colors.textPrimary,
    lineHeight: 22,
    marginBottom: DESIGN.spacing.sm,
  },
  linkButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: DESIGN.colors.accentLight,
    paddingHorizontal: DESIGN.spacing.sm,
    paddingVertical: DESIGN.spacing.xs,
    borderRadius: DESIGN.radius.sm,
    alignSelf: "flex-start",
    gap: 4,
  },
  linkText: {
    fontSize: 12,
    fontWeight: "600",
    color: DESIGN.colors.accent,
  },
  productImage: {
    width: 64,
    height: 64,
    borderRadius: DESIGN.radius.md,
    backgroundColor: DESIGN.colors.backgroundSecondary,
  },

  // === DETAILS BAR ===
  detailsBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: DESIGN.colors.backgroundSecondary,
    borderRadius: DESIGN.radius.md,
    paddingVertical: DESIGN.spacing.md,
    paddingHorizontal: DESIGN.spacing.sm,
    marginBottom: DESIGN.spacing.md,
  },
  detailItem: {
    flex: 1,
    alignItems: "center",
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: DESIGN.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "700",
    color: DESIGN.colors.textPrimary,
  },
  rewardValue: {
    color: DESIGN.colors.accent,
  },
  detailDivider: {
    width: 1,
    height: 24,
    backgroundColor: DESIGN.colors.border,
  },

  // === DESCRIPTION ===
  descriptionSection: {
    marginBottom: DESIGN.spacing.md,
  },
  descriptionText: {
    fontSize: 14,
    color: DESIGN.colors.textSecondary,
    lineHeight: 20,
  },
  showMoreText: {
    fontSize: 13,
    fontWeight: "600",
    color: DESIGN.colors.accent,
    marginTop: DESIGN.spacing.xs,
  },

  // === ACTION BUTTON ===
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DESIGN.colors.backgroundSecondary,
    borderRadius: DESIGN.radius.md,
    paddingVertical: 14,
    gap: DESIGN.spacing.sm,
    borderWidth: 1,
    borderColor: DESIGN.colors.border,
  },
  actionButtonActive: {
    backgroundColor: DESIGN.colors.accent,
    borderColor: DESIGN.colors.accent,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: DESIGN.colors.textSecondary,
  },
  actionButtonTextActive: {
    color: DESIGN.colors.textInverse,
  },
  buttonDisabled: {
    opacity: 0.6,
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

  // === IMAGE VIEWER ===
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageViewerImage: {
    width: "90%",
    height: "70%",
    borderRadius: DESIGN.radius.md,
  },
  imageViewerClose: {
    position: "absolute",
    top: 60,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  // === OFFER MODAL ===
  offerModalContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: DESIGN.colors.surface,
    borderTopLeftRadius: DESIGN.radius.xl,
    borderTopRightRadius: DESIGN.radius.xl,
    padding: DESIGN.spacing.lg,
    paddingBottom: Platform.OS === "ios" ? 40 : DESIGN.spacing.lg,
  },
  offerModalHandle: {
    width: 40,
    height: 4,
    backgroundColor: DESIGN.colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: DESIGN.spacing.lg,
  },
  offerInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: DESIGN.colors.backgroundSecondary,
    borderRadius: DESIGN.radius.md,
    paddingHorizontal: DESIGN.spacing.md,
    marginTop: DESIGN.spacing.md,
    marginBottom: DESIGN.spacing.sm,
  },
  offerCurrency: {
    fontSize: 24,
    fontWeight: "600",
    color: DESIGN.colors.textSecondary,
    marginRight: DESIGN.spacing.sm,
  },
  offerInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: "600",
    color: DESIGN.colors.textPrimary,
    paddingVertical: DESIGN.spacing.md,
  },
  offerHint: {
    fontSize: 13,
    color: DESIGN.colors.textSecondary,
    textAlign: "center",
    marginBottom: DESIGN.spacing.lg,
  },
  offerSubmitButton: {
    backgroundColor: DESIGN.colors.accent,
    borderRadius: DESIGN.radius.md,
    paddingVertical: 16,
    alignItems: "center",
  },
  offerSubmitText: {
    fontSize: 16,
    fontWeight: "600",
    color: DESIGN.colors.textInverse,
  },
});
