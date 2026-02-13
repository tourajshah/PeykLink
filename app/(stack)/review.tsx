import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated";
import Toast from "react-native-toast-message";

const COLORS = {
  brandPink: "#FF385C",
  brandPinkLight: "#FFF0F3",
  background: "#F7F7F7",
  card: "#FFFFFF",
  textPrimary: "#222222",
  textSecondary: "#717171",
  border: "#EBEBEB",
  starFilled: "#FFB800",
  starEmpty: "#E0E0E0",
  buttonGradientStart: "#FF385C",
  buttonGradientEnd: "#FF6B6B",
  buttonDisabledStart: "#FFB3C1",
  buttonDisabledEnd: "#FFCDD2",
  successGreen: "#34C759",
};

const SPRING_CONFIG = { damping: 24, stiffness: 350, mass: 0.8 };

type AnimatedStarProps = {
  index: number;
  isActive: boolean;
  size: number;
  onPress: () => void;
};

const AnimatedStar = ({
  index,
  isActive,
  size,
  onPress,
}: AnimatedStarProps) => {
  const scale = useSharedValue(1);
  useEffect(() => {
    if (isActive) {
      scale.value = withSequence(
        withSpring(1.15, { damping: 14, stiffness: 300 }),
        withSpring(1, { damping: 20, stiffness: 250 }),
      );
    } else {
      scale.value = withSpring(1, SPRING_CONFIG);
    }
  }, [isActive]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
    >
      <Animated.View style={animStyle}>
        <Ionicons
          name={isActive ? "star" : "star-outline"}
          size={size}
          color={isActive ? COLORS.starFilled : COLORS.starEmpty}
        />
      </Animated.View>
    </Pressable>
  );
};

type StarRatingProps = {
  rating: number;
  setRating: (rating: number) => void;
  size?: number;
};

const StarRating = ({ rating, setRating, size = 32 }: StarRatingProps) => {
  const handlePress = (star: number) => {
    Haptics.selectionAsync();
    setRating(star);
  };
  return (
    <View style={styles.starContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <AnimatedStar
          key={star}
          index={star}
          isActive={star <= rating}
          size={size}
          onPress={() => handlePress(star)}
        />
      ))}
    </View>
  );
};

const CompletionProgress = ({
  overallRating,
  communicationRating,
  punctualityRating,
  itemConditionRating,
  comment,
  isReviewingTraveler,
}: any) => {
  const { t } = useTranslation();
  const totalFields = isReviewingTraveler ? 5 : 4;
  let filledCount = 0;
  if (overallRating > 0) filledCount++;
  if (communicationRating > 0) filledCount++;
  if (punctualityRating > 0) filledCount++;
  if (isReviewingTraveler && itemConditionRating > 0) filledCount++;
  if (comment.length > 0) filledCount++;

  const progress = filledCount / totalFields;
  const progressWidth = useSharedValue(0);

  useEffect(() => {
    progressWidth.value = withSpring(progress, { damping: 24, stiffness: 200 });
  }, [progress]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%` as any,
  }));

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressBar, barStyle]}>
          <LinearGradient
            colors={[COLORS.brandPink, COLORS.starFilled]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ flex: 1, borderRadius: 2 }}
          />
        </Animated.View>
      </View>
      <Text style={styles.progressText}>
        {t("review.progress_complete", { percent: Math.round(progress * 100) })}
      </Text>
    </View>
  );
};

const RatingHint = ({ rating }: { rating: number }) => {
  const { t } = useTranslation();

  return (
    <Animated.Text
      key={rating}
      entering={FadeIn.duration(200).springify()}
      exiting={FadeOut.duration(100)}
      style={[
        styles.ratingHint,
        rating >= 4 && { color: COLORS.successGreen },
        rating > 0 && rating < 3 && { color: COLORS.brandPink },
      ]}
    >
      {t(`review.hints.${rating}`, { defaultValue: t("review.hints.0") })}
    </Animated.Text>
  );
};

const ReviewScreen = () => {
  const router = useRouter();
  const { negotiationId } = useLocalSearchParams<{ negotiationId: string }>();
  const { t } = useTranslation();

  const [overallRating, setOverallRating] = useState(0);
  const [communicationRating, setCommunicationRating] = useState(0);
  const [punctualityRating, setPunctualityRating] = useState(0);
  const [itemConditionRating, setItemConditionRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reviewDetails = useQuery(
    api.reviews.getDetailsForReview,
    negotiationId
      ? { negotiationId: negotiationId as Id<"negotiations"> }
      : "skip",
  );
  const createReview = useMutation(api.reviews.createReview);

  const buttonScale = useSharedValue(1);
  const buttonAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const handleSubmitReview = async () => {
    if (overallRating === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        t("review.alerts.rating_required_title"),
        t("review.alerts.rating_required_msg"),
      );
      return;
    }

    setIsSubmitting(true);
    Keyboard.dismiss();
    const finalItemCondition = reviewDetails?.isReviewingTraveler
      ? itemConditionRating
      : undefined;

    try {
      await createReview({
        negotiationId: negotiationId as Id<"negotiations">,
        rating: overallRating,
        communicationRating: communicationRating || undefined,
        punctualityRating: punctualityRating || undefined,
        itemConditionRating: finalItemCondition || undefined,
        comment: comment || undefined,
        status: "hidden",
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({
        type: "success",
        text1: t("review.alerts.submit_success_title"),
        text2: t("review.alerts.submit_success_msg"),
      });

      // Navigate away immediately.
      // Do NOT set isSubmitting(false) here or in a finally block!
      router.back();
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        t("review.alerts.submit_error_title"),
        t("review.alerts.submit_error_msg"),
      );
      // ONLY set to false if we caught an error and stay on the screen
      setIsSubmitting(false);
    }
  };

  if (!reviewDetails) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={COLORS.brandPink} />
      </View>
    );
  }

  const { otherUser, request, isReviewingTraveler } = reviewDetails;
  const headerQuestion = isReviewingTraveler
    ? t("review.questions.delivery", { name: otherUser.fullname })
    : t("review.questions.experience", { name: otherUser.fullname });
  const subText = isReviewingTraveler
    ? t("review.subtext.request", { name: request.productName })
    : t("review.subtext.transaction", { name: request.productName });
  const isButtonDisabled = overallRating === 0 || isSubmitting;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <CompletionProgress
        overallRating={overallRating}
        communicationRating={communicationRating}
        punctualityRating={punctualityRating}
        itemConditionRating={itemConditionRating}
        comment={comment}
        isReviewingTraveler={isReviewingTraveler}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeInDown.delay(100).springify().damping(20)}
          style={styles.card}
        >
          <LinearGradient
            colors={[COLORS.brandPinkLight, "transparent"]}
            style={styles.cardGradientAccent}
          />
          <View style={styles.userInfo}>
            <Image
              source={{ uri: otherUser.imageURL }}
              style={styles.avatar}
              contentFit="cover"
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.questionText}>{headerQuestion}</Text>
              <Text style={styles.productText}>{subText}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.mainRatingSection}>
            <Text style={styles.mainRatingLabel}>
              {t("review.labels.overall")}
            </Text>
            <StarRating
              rating={overallRating}
              setRating={setOverallRating}
              size={48}
            />
            <RatingHint rating={overallRating} />
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(200).springify().damping(20)}
          style={styles.card}
        >
          <Text style={styles.sectionHeader}>
            {isReviewingTraveler
              ? t("review.headers.delivery")
              : t("review.headers.interaction")}
          </Text>
          <View style={styles.criteriaRow}>
            <Text style={styles.criteriaLabel}>
              {t("review.labels.communication")}
            </Text>
            <StarRating
              rating={communicationRating}
              setRating={setCommunicationRating}
              size={28}
            />
          </View>
          <View style={styles.criteriaRow}>
            <Text style={styles.criteriaLabel}>
              {t("review.labels.punctuality")}
            </Text>
            <StarRating
              rating={punctualityRating}
              setRating={setPunctualityRating}
              size={28}
            />
          </View>
          {isReviewingTraveler && (
            <View style={styles.criteriaRow}>
              <Text style={styles.criteriaLabel}>
                {t("review.labels.item_condition")}
              </Text>
              <StarRating
                rating={itemConditionRating}
                setRating={setItemConditionRating}
                size={28}
              />
            </View>
          )}
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(300).springify().damping(20)}
          style={styles.card}
        >
          <Text style={styles.sectionHeader}>
            {t("review.headers.comments")}
          </Text>
          <TextInput
            style={styles.commentInput}
            placeholder={
              isReviewingTraveler
                ? t("review.placeholders.traveler")
                : t("review.placeholders.requester")
            }
            placeholderTextColor={COLORS.textSecondary}
            multiline
            value={comment}
            onChangeText={setComment}
            maxLength={500}
          />
          <View style={styles.charCountRow}>
            <View style={styles.charCountBar}>
              <View
                style={[
                  styles.charCountFill,
                  { width: `${(comment.length / 500) * 100}%` },
                  comment.length > 400 && { backgroundColor: COLORS.brandPink },
                ]}
              />
            </View>
            <Text
              style={[
                styles.charCount,
                comment.length > 400 && { color: COLORS.brandPink },
              ]}
            >
              {comment.length}/500
            </Text>
          </View>
        </Animated.View>
      </ScrollView>

      <Animated.View
        entering={FadeInDown.delay(400).springify()}
        style={styles.footer}
      >
        <Pressable
          onPress={handleSubmitReview}
          onPressIn={() => {
            if (!isButtonDisabled)
              buttonScale.value = withSpring(0.98, SPRING_CONFIG);
          }}
          onPressOut={() => {
            buttonScale.value = withSpring(1, SPRING_CONFIG);
          }}
          onResponderTerminate={() => {
            buttonScale.value = withSpring(1, SPRING_CONFIG);
          }}
          disabled={isButtonDisabled}
        >
          <Animated.View style={buttonAnimStyle}>
            <LinearGradient
              colors={
                isButtonDisabled
                  ? [COLORS.buttonDisabledStart, COLORS.buttonDisabledEnd]
                  : [COLORS.buttonGradientStart, COLORS.buttonGradientEnd]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitButton}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {t("review.buttons.submit")}
                </Text>
              )}
            </LinearGradient>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: "hidden",
    marginRight: 10,
  },
  progressBar: { height: "100%", borderRadius: 2, overflow: "hidden" },
  progressText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
    minWidth: 80,
    textAlign: "right",
  },
  scrollContent: { padding: 16, paddingBottom: 100 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardGradientAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  userInfo: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 16,
    backgroundColor: COLORS.border,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  questionText: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  productText: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 16 },
  mainRatingSection: { alignItems: "center" },
  mainRatingLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textSecondary,
    letterSpacing: 1.5,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  starContainer: { flexDirection: "row", gap: 10 },
  ratingHint: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.brandPink,
  },
  sectionHeader: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  criteriaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  criteriaLabel: { fontSize: 15, color: COLORS.textPrimary, fontWeight: "500" },
  commentInput: {
    minHeight: 120,
    textAlignVertical: "top",
    fontSize: 16,
    color: COLORS.textPrimary,
    lineHeight: 24,
  },
  charCountRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  charCountBar: {
    flex: 1,
    height: 3,
    backgroundColor: COLORS.border,
    borderRadius: 1.5,
    marginRight: 10,
    overflow: "hidden",
  },
  charCountFill: {
    height: "100%",
    backgroundColor: COLORS.starFilled,
    borderRadius: 1.5,
  },
  charCount: { fontSize: 12, color: COLORS.textSecondary, fontWeight: "500" },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.card,
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButton: {
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.brandPink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  submitButtonText: {
    color: "#FFF",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
});

export default ReviewScreen;
