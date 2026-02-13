/**
 * Create Request Screen - Premium Airbnb + Logistics Design 2026
 *
 * Features:
 * - Premium DESIGN tokens matching app theme
 * - Gradient accent buttons (Emerald Green)
 * - 3D press animations
 * - Modern form sections
 * - Premium modal styling
 */

import { useUploadFile } from "@convex-dev/r2/react";
import { Ionicons } from "@expo/vector-icons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useMutation, useQuery } from "convex/react";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import CountryFlag from "react-native-country-flag";
import Reanimated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { City, cityData } from "@/constants/cityData";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

// === TRANSLATION IMPORT ===
import { useTranslation } from "react-i18next";

// ============================================================================
// DESIGN SYSTEM - Premium 2026 (Green Theme for Requests)
// ============================================================================
const DESIGN = {
  colors: {
    background: "#F8FAFC",
    backgroundSecondary: "#F1F5F9",
    surface: "#FFFFFF",
    textPrimary: "#1E293B",
    textSecondary: "#64748B",
    textTertiary: "#94A3B8",
    textInverse: "#FFFFFF",
    primary: "#10B981",
    primaryLight: "rgba(16, 185, 129, 0.1)",
    primaryMuted: "#D1FAE5",
    primaryGradient: ["#10B981", "#059669"] as const,
    success: "#10B981",
    successLight: "rgba(16, 185, 129, 0.1)",
    warning: "#F59E0B",
    error: "#EF4444",
    errorLight: "rgba(239, 68, 68, 0.1)",
    border: "#E2E8F0",
    borderFocus: "#10B981",
    divider: "#E2E8F0",
    disabled: "#CBD5E1",
    placeholder: "#94A3B8",
    glassDark: "rgba(0, 0, 0, 0.5)",
    green: "#10B981",
    greenMuted: "rgba(16, 185, 129, 0.1)",
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
      shadowColor: "#64748B",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    md: {
      shadowColor: "#64748B",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    },
    lg: {
      shadowColor: "#64748B",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
      elevation: 8,
    },
    colored: (color: string) => ({
      shadowColor: color,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 10,
    }),
  },
} as const;

const itemTypesData = [
  { name: "Electronics", icon: "cellphone-link", category: "standard" },
  { name: "Clothing", icon: "hanger", category: "standard" },
  { name: "Documents", icon: "file-document-outline", category: "standard" },
  {
    name: "Books",
    icon: "book-open-page-variant-outline",
    category: "standard",
  },
  { name: "Cosmetics", icon: "bottle-tonic-outline", category: "standard" },
  // ✨ The Fun Stuff ✨
  { name: "Snacks", icon: "food-croissant", category: "standard" },
  { name: "Gifts", icon: "gift-outline", category: "standard" },
  { name: "Vitamins", icon: "pill", category: "special" },
  { name: "Pets", icon: "dog-side", category: "special" },
];

const ScaleButton = ({ onPress, children, style, disabled }: any) => {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
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
      style={{ width: "100%" }}
    >
      <Reanimated.View style={[style, animatedStyle]}>
        {children}
      </Reanimated.View>
    </Pressable>
  );
};

const SectionHeader: React.FC<{
  icon: string;
  title: string;
  iconColor?: string;
}> = ({ icon, title, iconColor = DESIGN.colors.primary }) => (
  <Reanimated.View
    entering={FadeInDown.springify()}
    style={styles.sectionHeader}
  >
    <View style={[styles.iconContainer, { backgroundColor: `${iconColor}15` }]}>
      <MaterialCommunityIcons name={icon as any} size={20} color={iconColor} />
    </View>
    <Text style={styles.sectionTitle}>{title}</Text>
  </Reanimated.View>
);

export default function RequestsScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();

  const params = useLocalSearchParams();
  const { travelerId, tripId } = params;

  const isDirectMode = !!travelerId;
  const targetedTravelerId = isDirectMode
    ? (travelerId as Id<"users">)
    : undefined;
  const targetedTripId = isDirectMode ? (tripId as Id<"trips">) : undefined;

  const tripData = useQuery(
    api.trips.getTripById,
    isDirectMode && targetedTripId ? { tripId: targetedTripId } : "skip",
  );

  const existingRequest = useMemo(
    () => (params.request ? JSON.parse(params.request as string) : null),
    [params.request],
  );
  const isEditMode = existingRequest !== null;

  const createDirectRequestAndOffer = useMutation(
    api.requests.createDirectRequestAndOffer,
  );
  const createRequest = useMutation(api.requests.createRequest);
  const updateRequest = useMutation(api.requests.updateRequest);
  const uploadFile = useUploadFile(api.r2);

  const [productName, setProductName] = useState("");
  const [productURL, setProductURL] = useState("");
  const [selectedFile, setSelectedFile] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [itemPrice, setItemPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [travelerFee, setTravelerFee] = useState("");
  const [origin, setOrigin] = useState<City | null>(null);
  const [destination, setDestination] = useState<City | null>(null);
  const [requiredByDate, setRequiredByDate] = useState(new Date());
  const [productWeight, setProductWeight] = useState("");
  const [weightUnit, setWeightUnit] = useState("gr");
  const [selectedItemTypes, setSelectedItemTypes] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [originQuery, setOriginQuery] = useState("");
  const [destinationQuery, setDestinationQuery] = useState("");
  const [suggestions, setSuggestions] = useState<City[]>([]);
  const [activeSuggestionType, setActiveSuggestionType] = useState<
    "origin" | "destination" | null
  >(null);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (isEditMode && existingRequest) {
      setProductName(existingRequest.productName || "");
      setProductURL(existingRequest.productURL || "");
      setItemPrice(existingRequest.itemPrice?.toString() || "");
      setQuantity(existingRequest.quantity?.toString() || "1");
      setTravelerFee(existingRequest.travelerFee?.toString() || "");
      const originCity = existingRequest.originCity
        ? {
            name: existingRequest.originCity,
            country: existingRequest.originCountry,
            countryCode: existingRequest.originCountryCode,
          }
        : null;
      const destCity = existingRequest.destinationCity
        ? {
            name: existingRequest.destinationCity,
            country: existingRequest.destinationCountry,
            countryCode: existingRequest.destinationCountryCode,
          }
        : null;
      setOrigin(originCity);
      setDestination(destCity);
      setOriginQuery(
        originCity ? `${originCity.name}, ${originCity.country}` : "",
      );
      setDestinationQuery(
        destCity ? `${destCity.name}, ${destCity.country}` : "",
      );
      setRequiredByDate(new Date(existingRequest.requiredByDate));
      setDescription(existingRequest.description || "");
      const weightParts = (existingRequest.productWeight || "").split(" ");
      if (weightParts.length === 2) {
        setProductWeight(weightParts[0]);
        setWeightUnit(weightParts[1]);
      }
      if (existingRequest.itemTypes) {
        setSelectedItemTypes(existingRequest.itemTypes.split(", "));
      }
    }
  }, [isEditMode, existingRequest]);

  useEffect(() => {
    if (isDirectMode && tripData) {
      const originCity: City = {
        name: tripData.originCity,
        country: tripData.originCountry,
        countryCode: "",
      };
      const destinationCity: City = {
        name: tripData.destinationCity,
        country: tripData.destinationCountry,
        countryCode: "",
      };
      setOrigin(originCity);
      setDestination(destinationCity);
      setRequiredByDate(new Date(tripData.arrivalDate));
      setOriginQuery(`${originCity.name}, ${originCity.country}`);
      setDestinationQuery(
        `${destinationCity.name}, ${destinationCity.country}`,
      );
    }
  }, [isDirectMode, tripData]);

  const handleSearchChange = (text: string, type: "origin" | "destination") => {
    if (type === "origin") {
      setOriginQuery(text);
      setOrigin(null);
      if (errors.origin) setErrors((prev) => ({ ...prev, origin: "" }));
    } else {
      setDestinationQuery(text);
      setDestination(null);
      if (errors.destination)
        setErrors((prev) => ({ ...prev, destination: "" }));
    }
    setActiveSuggestionType(type);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (text.length > 1) {
      const filtered = cityData
        .filter(
          (city) =>
            city.name.toLowerCase().includes(text.toLowerCase()) ||
            city.country.toLowerCase().includes(text.toLowerCase()),
        )
        .slice(0, 3);
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  const onSelectCity = (city: City, type: "origin" | "destination") => {
    Haptics.selectionAsync(); // Feedback
    const fullText = `${city.name}, ${city.country}`;
    if (type === "origin") {
      setOrigin(city);
      setOriginQuery(fullText);
      if (errors.origin) setErrors((prev) => ({ ...prev, origin: "" }));
    } else {
      setDestination(city);
      setDestinationQuery(fullText);
      if (errors.destination)
        setErrors((prev) => ({ ...prev, destination: "" }));
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSuggestions([]);
    setActiveSuggestionType(null);
    Keyboard.dismiss();
  };

  const handleSwapLocations = () => {
    if (isDirectMode || isEditMode) return; // Disable swap if locked
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOrigin(destination);
    setDestination(origin);
    setOriginQuery(destinationQuery);
    setDestinationQuery(originQuery);
  };

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowPicker(false);
    if (event.type === "set" && selectedDate) {
      setRequiredByDate(selectedDate);
    }
  };

  const handleImagePick = async () => {
    Haptics.selectionAsync();
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert(
        t("create_request.errors.permission_title"),
        t("create_request.errors.permission_msg"),
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedFile(result.assets[0]);
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!productName)
      newErrors.productName = t("create_request.errors.product_name");
    if (!itemPrice) newErrors.itemPrice = t("create_request.errors.item_price");
    if (!travelerFee) newErrors.travelerFee = t("create_request.errors.reward");
    if (!origin) newErrors.origin = t("create_request.errors.origin");
    if (!destination)
      newErrors.destination = t("create_request.errors.destination");
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    return Object.keys(newErrors).length === 0;
  };

  // =========================================================
  // FIX APPLIED HERE: Removing the finally block
  // =========================================================
  const handleSubmit = async () => {
    const isFormValid = validateForm();
    if (!isEditMode && !isFormValid) {
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsSubmitting(true);

    let imageKey: string | undefined = undefined;
    try {
      if (selectedFile) {
        const mimeType =
          selectedFile.mimeType || selectedFile.type || "image/jpeg";
        if (!mimeType.startsWith("image/")) {
          Alert.alert(
            t("create_request.errors.invalid_file_type"),
            t("create_request.errors.invalid_file_msg"),
          );
          setIsSubmitting(false); // Valid early return
          return;
        }

        const response = await fetch(selectedFile.uri);
        const blob = await response.blob();

        const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

        if (blob.size > MAX_FILE_SIZE) {
          Alert.alert(
            t("create_request.errors.file_too_large"),
            t("create_request.errors.file_too_large_msg", {
              size: (blob.size / (1024 * 1024)).toFixed(2),
            }),
          );
          setIsSubmitting(false); // Valid early return
          return;
        }

        const file = new File(
          [blob],
          selectedFile.fileName || `image_${Date.now()}.jpg`,
          { type: mimeType },
        );

        imageKey = await uploadFile(file);
      }
      const requestData = {
        productName,
        productURL,
        imageKey: imageKey,
        quantity: parseInt(quantity, 10),
        itemPrice: parseFloat(itemPrice),
        travelerFee: parseFloat(travelerFee),
        originCountry: origin!.country,
        originCity: origin!.name,
        destinationCountry: destination!.country,
        destinationCity: destination!.name,
        requiredByDate: requiredByDate.getTime(),
        productWeight: `${productWeight} ${weightUnit}`,
        itemTypes: selectedItemTypes.join(", "),
        description,
      };

      if (isEditMode) {
        await updateRequest({
          requestId: existingRequest._id,
          description,
          quantity: parseInt(quantity, 10),
          productURL,
          travelerFee: parseFloat(travelerFee),
          requiredByDate: requiredByDate.getTime(),
        });
      } else if (isDirectMode) {
        await createDirectRequestAndOffer({
          ...requestData,
          visibility: "direct",
          targetedTravelerId: targetedTravelerId!,
          tripId: targetedTripId!,
        });
      } else {
        await createRequest({
          ...requestData,
          visibility: "public",
          targetedTravelerId: undefined,
        });
      }

      // SUCCESS: Navigate away immediately
      router.back();
    } catch (error) {
      console.error("Failed to submit request:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : t("create_request.errors.unknown_error");
      const actionWord = isEditMode ? "update" : "post";

      if (
        errorMessage.includes("too large") ||
        errorMessage.includes("Only images")
      ) {
        Alert.alert(
          t("create_request.errors.upload_failed"),
          t("create_request.errors.permission_msg"),
        );
      } else {
        Alert.alert(
          t("create_request.errors.generic_error"),
          t("create_request.errors.submit_error", { action: actionWord }),
        );
      }

      // ONLY stop loading if an error occurs so the user can try again
      setIsSubmitting(false);
    }
  };

  const handleItemTypeSelect = (item: string) => {
    Haptics.selectionAsync();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedItemTypes((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item],
    );
  };

  if (isDirectMode && !tripData) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: DESIGN.colors.background,
        }}
      >
        <ActivityIndicator size="large" color={DESIGN.colors.primary} />
        <Text style={{ color: DESIGN.colors.textPrimary, marginTop: 10 }}>
          {t("create_request.loading_trip")}
        </Text>
      </View>
    );
  }

  const isFormComplete =
    productName && itemPrice && travelerFee && origin && destination;

  const headerTitle = isEditMode
    ? t("create_request.title_edit")
    : isDirectMode
      ? t("create_request.title_direct")
      : t("create_request.title_new");

  const submitButtonText = isEditMode
    ? t("create_request.btn_save")
    : isDirectMode
      ? t("create_request.btn_send")
      : t("create_request.btn_post");

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <Reanimated.View entering={FadeIn.duration(300)} style={styles.header}>
        <TouchableOpacity
          style={styles.headerAction}
          onPress={() => router.back()}
          disabled={isSubmitting}
        >
          <View style={styles.headerCloseBtn}>
            <Ionicons
              name="close"
              size={20}
              color={DESIGN.colors.textPrimary}
            />
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{headerTitle}</Text>
        <View style={styles.headerAction} />
      </Reanimated.View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={isSubmitting && styles.contentDisabled}>
          {isDirectMode && tripData?.traveler && (
            <Reanimated.View
              entering={FadeInDown.springify()}
              style={styles.travelerInfoCard}
            >
              <Image
                source={tripData.traveler.image}
                style={styles.travelerAvatar}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.travelerInfoLabel}>
                  {t("create_request.direct_label")}
                </Text>
                <Text style={styles.travelerInfoName}>
                  {tripData.traveler.username}
                </Text>
              </View>
              <View style={styles.verifiedBadge}>
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={DESIGN.colors.textInverse}
                />
              </View>
            </Reanimated.View>
          )}

          {/* SECTION 1: Product Details */}
          <Reanimated.View
            entering={FadeInDown.delay(100).springify()}
            style={styles.formSection}
          >
            <SectionHeader
              icon="cube-outline"
              title={t("create_request.sections.product")}
            />

            <View style={{ gap: 16 }}>
              <View>
                {selectedFile ? (
                  <View style={styles.imagePreviewContainer}>
                    <Image
                      source={{ uri: selectedFile.uri }}
                      style={styles.imagePreview}
                    />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedFile(null);
                      }}
                      disabled={isEditMode || isSubmitting}
                    >
                      <MaterialCommunityIcons
                        name="close"
                        size={16}
                        color={DESIGN.colors.textInverse}
                      />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.imagePicker,
                      isEditMode && styles.inputContainerDisabled,
                    ]}
                    onPress={handleImagePick}
                    disabled={isEditMode || isSubmitting}
                  >
                    <View style={styles.imagePickerIconCircle}>
                      <MaterialCommunityIcons
                        name="camera-plus-outline"
                        size={24}
                        color={DESIGN.colors.primary}
                      />
                    </View>
                    <Text
                      style={[
                        styles.imagePickerText,
                        isEditMode && styles.inputTextDisabled,
                      ]}
                    >
                      {t("create_request.labels.upload_image")}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <View>
                <View
                  style={[
                    styles.inputWrapper,
                    !!errors.productName && styles.errorBorder,
                  ]}
                >
                  <Text style={styles.inputLabelSmall}>
                    {t("create_request.labels.product_name")}
                  </Text>
                  <TextInput
                    style={styles.inputText}
                    placeholder={t("create_request.labels.product_placeholder")}
                    placeholderTextColor={DESIGN.colors.placeholder}
                    value={productName}
                    onChangeText={setProductName}
                    editable={!isEditMode}
                  />
                </View>
              </View>

              <View>
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabelSmall}>
                    {t("create_request.labels.product_link")}
                  </Text>
                  <TextInput
                    style={styles.inputText}
                    placeholder={t("create_request.labels.link_placeholder")}
                    placeholderTextColor={DESIGN.colors.placeholder}
                    value={productURL}
                    onChangeText={setProductURL}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                </View>
              </View>
            </View>
          </Reanimated.View>

          {/* SECTION 2: Travel Route */}
          <Reanimated.View
            entering={FadeInDown.delay(200).springify()}
            style={styles.formSection}
          >
            <SectionHeader
              icon="map-marker-path"
              title={t("create_request.sections.route")}
            />

            <View style={styles.routeContainer}>
              <View style={styles.routeRail}>
                <View style={styles.railDot} />
                <View style={styles.railLine} />
                <View style={styles.railPin} />
              </View>

              <View style={{ flex: 1, gap: 16 }}>
                <View>
                  <View
                    style={[
                      styles.inputWrapper,
                      !!errors.origin && styles.errorBorder,
                      (isDirectMode || isEditMode) &&
                        styles.inputContainerDisabled,
                    ]}
                  >
                    <Text style={styles.inputLabelSmall}>
                      {t("create_request.labels.origin")}
                    </Text>
                    <TextInput
                      style={[
                        styles.inputText,
                        (isDirectMode || isEditMode) &&
                          styles.inputTextDisabled,
                      ]}
                      placeholder={t("create_request.labels.city_placeholder")}
                      placeholderTextColor={DESIGN.colors.placeholder}
                      value={originQuery}
                      onChangeText={(text) =>
                        handleSearchChange(text, "origin")
                      }
                      editable={!isEditMode && !isDirectMode}
                    />
                  </View>
                  {activeSuggestionType === "origin" &&
                    suggestions.length > 0 && (
                      <Reanimated.View
                        entering={FadeIn.duration(200)}
                        style={styles.suggestionsContainer}
                      >
                        {suggestions.map((item) => (
                          <TouchableOpacity
                            key={item.name + item.countryCode}
                            style={styles.suggestionItem}
                            onPress={() => onSelectCity(item, "origin")}
                          >
                            <CountryFlag
                              isoCode={item.countryCode.toLowerCase()}
                              size={14}
                              style={styles.flagStyle}
                            />
                            <Text style={styles.suggestionText}>
                              {item.name}, {item.country}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </Reanimated.View>
                    )}
                </View>

                <View>
                  <View
                    style={[
                      styles.inputWrapper,
                      !!errors.destination && styles.errorBorder,
                      (isDirectMode || isEditMode) &&
                        styles.inputContainerDisabled,
                    ]}
                  >
                    <Text style={styles.inputLabelSmall}>
                      {t("create_request.labels.destination")}
                    </Text>
                    <TextInput
                      style={[
                        styles.inputText,
                        (isDirectMode || isEditMode) &&
                          styles.inputTextDisabled,
                      ]}
                      placeholder={t("create_request.labels.city_placeholder")}
                      placeholderTextColor={DESIGN.colors.placeholder}
                      value={destinationQuery}
                      onChangeText={(text) =>
                        handleSearchChange(text, "destination")
                      }
                      editable={!isEditMode && !isDirectMode}
                    />
                  </View>
                  {activeSuggestionType === "destination" &&
                    suggestions.length > 0 && (
                      <Reanimated.View
                        entering={FadeIn.duration(200)}
                        style={styles.suggestionsContainer}
                      >
                        {suggestions.map((item) => (
                          <TouchableOpacity
                            key={item.name + item.countryCode}
                            style={styles.suggestionItem}
                            onPress={() => onSelectCity(item, "destination")}
                          >
                            <CountryFlag
                              isoCode={item.countryCode.toLowerCase()}
                              size={14}
                              style={styles.flagStyle}
                            />
                            <Text style={styles.suggestionText}>
                              {item.name}, {item.country}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </Reanimated.View>
                    )}
                </View>
              </View>

              <TouchableOpacity
                onPress={handleSwapLocations}
                style={styles.swapButton}
                disabled={isDirectMode || isEditMode}
              >
                <Ionicons
                  name="swap-vertical"
                  size={18}
                  color={
                    isDirectMode || isEditMode
                      ? DESIGN.colors.disabled
                      : DESIGN.colors.primary
                  }
                />
              </TouchableOpacity>
            </View>
          </Reanimated.View>

          {/* SECTION 3: Logistics (Date) */}
          <Reanimated.View
            entering={FadeInDown.delay(300).springify()}
            style={styles.formSection}
          >
            <SectionHeader
              icon="calendar-clock"
              title={t("create_request.sections.deadline")}
            />
            <View>
              <TouchableOpacity
                style={[
                  styles.dateCard,
                  isDirectMode && styles.inputContainerDisabled,
                ]}
                onPress={() => setShowPicker(true)}
                disabled={isDirectMode}
              >
                <View style={styles.dateIconBox}>
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={DESIGN.colors.primary}
                  />
                </View>
                <View>
                  <Text style={styles.dateLabel}>
                    {t("create_request.labels.required_by")}
                  </Text>
                  <Text
                    style={[
                      styles.dateValue,
                      isDirectMode && styles.inputTextDisabled,
                    ]}
                  >
                    {requiredByDate.toLocaleDateString(i18n.language, {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </Reanimated.View>

          {/* SECTION 4: Pricing */}
          <Reanimated.View
            entering={FadeInDown.delay(400).springify()}
            style={styles.formSection}
          >
            <SectionHeader
              icon="cash-multiple"
              title={t("create_request.sections.budget")}
            />

            <View style={styles.inputGroup}>
              <View
                style={[
                  styles.inputWrapper,
                  { flex: 2 },
                  !!errors.itemPrice && styles.errorBorder,
                ]}
              >
                <Text style={styles.inputLabelSmall}>
                  {t("create_request.labels.item_price")}
                </Text>
                <TextInput
                  style={styles.inputTextLarge}
                  placeholder="0.00"
                  placeholderTextColor={DESIGN.colors.placeholder}
                  value={itemPrice}
                  onChangeText={setItemPrice}
                  keyboardType="numeric"
                  editable={!isEditMode}
                />
              </View>
              <View style={[styles.inputWrapper, { flex: 1 }]}>
                <Text style={styles.inputLabelSmall}>
                  {t("create_request.labels.qty")}
                </Text>
                <TextInput
                  style={styles.inputTextLarge}
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="numeric"
                  textAlign="center"
                />
              </View>
            </View>

            <View
              style={[
                styles.inputWrapper,
                { marginTop: 16 },
                !!errors.travelerFee && styles.errorBorder,
              ]}
            >
              <Text style={styles.inputLabelSmall}>
                {t("create_request.labels.reward")}
              </Text>
              <TextInput
                style={styles.inputTextLarge}
                placeholder={t("create_request.labels.reward_placeholder")}
                placeholderTextColor={DESIGN.colors.placeholder}
                value={travelerFee}
                onChangeText={setTravelerFee}
                keyboardType="numeric"
              />
            </View>
            <Text style={styles.helperText}>
              {t("create_request.labels.reward_helper")}
            </Text>
          </Reanimated.View>

          {/* SECTION 5: Specs */}
          <Reanimated.View
            entering={FadeInDown.delay(500).springify()}
            style={styles.formSection}
          >
            <SectionHeader
              icon="scale"
              title={t("create_request.sections.specs")}
            />

            <Text style={styles.label}>
              {t("create_request.labels.weight")}
            </Text>
            <View style={styles.spaceInputRow}>
              <View style={[styles.inputWrapper, { flex: 1 }]}>
                <TextInput
                  style={styles.inputText}
                  placeholder={t("create_request.labels.weight_placeholder")}
                  placeholderTextColor={DESIGN.colors.placeholder}
                  value={productWeight}
                  onChangeText={setProductWeight}
                  keyboardType="numeric"
                  editable={!isEditMode}
                />
              </View>

              <View style={styles.segmentedControl}>
                <Pressable
                  style={[
                    styles.segment,
                    weightUnit === "gr" && styles.segmentActive,
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setWeightUnit("gr");
                  }}
                  disabled={isEditMode}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      weightUnit === "gr" && styles.segmentTextActive,
                    ]}
                  >
                    {t("create_request.units.gr")}
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.segment,
                    weightUnit === "kg" && styles.segmentActive,
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setWeightUnit("kg");
                  }}
                  disabled={isEditMode}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      weightUnit === "kg" && styles.segmentTextActive,
                    ]}
                  >
                    {t("create_request.units.kg")}
                  </Text>
                </Pressable>
              </View>
            </View>

            <Text style={[styles.label, { marginTop: 16 }]}>
              {t("create_request.sections.category")}
            </Text>
            <View style={styles.itemTypeGrid}>
              {itemTypesData.map((item) => (
                <Pressable
                  key={item.name}
                  style={{ width: "48%", marginBottom: 10 }}
                  onPress={() => handleItemTypeSelect(item.name)}
                  disabled={isEditMode}
                >
                  <View
                    style={[
                      styles.itemTypeChip,
                      selectedItemTypes.includes(item.name) &&
                        styles.itemTypeChipSelected,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={item.icon as any}
                      size={20}
                      color={
                        selectedItemTypes.includes(item.name)
                          ? DESIGN.colors.primary
                          : DESIGN.colors.textSecondary
                      }
                    />
                    <Text
                      style={[
                        styles.itemTypeChipText,
                        selectedItemTypes.includes(item.name) &&
                          styles.itemTypeChipTextSelected,
                      ]}
                    >
                      {t(`categories.${item.name}`)}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.label, { marginTop: 16 }]}>
              {t("create_request.sections.notes")}
            </Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.captionInput}
                placeholder={t("create_request.labels.notes_placeholder")}
                placeholderTextColor={DESIGN.colors.placeholder}
                multiline
                value={description}
                onChangeText={setDescription}
              />
            </View>
          </Reanimated.View>
        </View>

        <ScaleButton
          style={[
            styles.bottomSubmitButton,
            ((!isFormComplete && !isEditMode) || isSubmitting) &&
              styles.shareButtonDisabled,
          ]}
          disabled={(!isFormComplete && !isEditMode) || isSubmitting}
          onPress={handleSubmit}
        >
          <LinearGradient
            colors={DESIGN.colors.primaryGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.submitGradient}
          >
            {isSubmitting ? (
              <ActivityIndicator
                size="small"
                color={DESIGN.colors.textInverse}
              />
            ) : (
              <>
                <Ionicons
                  name="cube-outline"
                  size={20}
                  color={DESIGN.colors.textInverse}
                />
                <Text style={styles.bottomSubmitButtonText}>
                  {submitButtonText}
                </Text>
              </>
            )}
          </LinearGradient>
        </ScaleButton>
      </ScrollView>

      {showPicker && (
        <DateTimePicker
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          value={requiredByDate}
          onChange={onDateChange}
          minimumDate={new Date()}
          maximumDate={
            isDirectMode && tripData
              ? new Date(tripData.arrivalDate)
              : undefined
          }
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DESIGN.colors.background },

  header: {
    backgroundColor: DESIGN.colors.background,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: DESIGN.spacing.lg,
    paddingTop: Platform.OS === "ios" ? DESIGN.spacing.sm : DESIGN.spacing.lg,
    paddingBottom: DESIGN.spacing.sm,
  },
  headerAction: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: DESIGN.colors.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: DESIGN.colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  shareButtonDisabled: { opacity: 0.6 },

  scrollContent: { padding: DESIGN.spacing.lg, paddingBottom: 60 },
  contentDisabled: { opacity: 0.5 },

  formSection: {
    backgroundColor: DESIGN.colors.surface,
    borderRadius: DESIGN.radius.xl,
    padding: DESIGN.spacing.lg,
    marginBottom: DESIGN.spacing.lg,
    ...DESIGN.shadow.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: DESIGN.spacing.md,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: DESIGN.radius.sm,
    justifyContent: "center",
    alignItems: "center",
    marginRight: DESIGN.spacing.sm,
  },
  sectionTitle: {
    color: DESIGN.colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
  },

  inputWrapper: {
    backgroundColor: DESIGN.colors.backgroundSecondary,
    borderRadius: DESIGN.radius.md,
    paddingHorizontal: DESIGN.spacing.md,
    paddingVertical: DESIGN.spacing.sm + 2,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  inputLabelSmall: {
    fontSize: 11,
    color: DESIGN.colors.textSecondary,
    marginBottom: 2,
    textTransform: "uppercase",
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  inputText: {
    fontSize: 16,
    color: DESIGN.colors.textPrimary,
    fontWeight: "500",
    padding: 0,
  },
  inputTextLarge: {
    fontSize: 22,
    color: DESIGN.colors.textPrimary,
    fontWeight: "700",
    padding: 0,
  },

  inputContainerDisabled: {
    backgroundColor: DESIGN.colors.border,
    opacity: 0.7,
  },
  inputTextDisabled: { color: DESIGN.colors.textSecondary },

  errorBorder: { borderColor: DESIGN.colors.error, borderWidth: 1.5 },
  helperText: {
    fontSize: 12,
    color: DESIGN.colors.textSecondary,
    marginTop: DESIGN.spacing.sm,
  },

  routeContainer: { flexDirection: "row", alignItems: "stretch" },
  routeRail: {
    width: 20,
    alignItems: "center",
    paddingVertical: 28,
    marginRight: DESIGN.spacing.sm,
  },
  railDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: DESIGN.colors.primary,
  },
  railLine: {
    flex: 1,
    width: 2,
    backgroundColor: DESIGN.colors.border,
    marginVertical: 4,
  },
  railPin: {
    width: 12,
    height: 12,
    borderRadius: 3,
    backgroundColor: DESIGN.colors.textSecondary,
  },
  swapButton: {
    position: "absolute",
    right: 0,
    top: "40%",
    backgroundColor: DESIGN.colors.surface,
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: DESIGN.colors.border,
    ...DESIGN.shadow.sm,
  },

  suggestionsContainer: {
    backgroundColor: DESIGN.colors.surface,
    borderRadius: DESIGN.radius.md,
    marginTop: DESIGN.spacing.xs,
    borderWidth: 1,
    borderColor: DESIGN.colors.border,
    overflow: "hidden",
    ...DESIGN.shadow.sm,
  },
  suggestionItem: {
    padding: DESIGN.spacing.md,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: DESIGN.colors.border,
  },
  flagStyle: { marginRight: DESIGN.spacing.sm, borderRadius: 2 },
  suggestionText: {
    color: DESIGN.colors.textPrimary,
    fontSize: 14,
    fontWeight: "500",
  },

  dateCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: DESIGN.colors.backgroundSecondary,
    borderRadius: DESIGN.radius.lg,
    padding: DESIGN.spacing.md,
  },
  dateIconBox: {
    width: 44,
    height: 44,
    borderRadius: DESIGN.radius.sm,
    backgroundColor: DESIGN.colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: DESIGN.spacing.sm,
  },
  dateLabel: {
    fontSize: 12,
    color: DESIGN.colors.textSecondary,
    marginBottom: 2,
  },
  dateValue: {
    fontSize: 16,
    color: DESIGN.colors.textPrimary,
    fontWeight: "600",
  },

  inputGroup: { flexDirection: "row", gap: DESIGN.spacing.sm },

  spaceInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: DESIGN.spacing.sm,
  },
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: DESIGN.colors.backgroundSecondary,
    padding: 4,
    borderRadius: DESIGN.radius.md,
    height: 50,
    alignItems: "center",
  },
  segment: {
    paddingHorizontal: DESIGN.spacing.lg,
    height: "100%",
    justifyContent: "center",
    borderRadius: DESIGN.radius.sm,
  },
  segmentActive: {
    backgroundColor: DESIGN.colors.surface,
    ...DESIGN.shadow.sm,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "600",
    color: DESIGN.colors.textSecondary,
  },
  segmentTextActive: { color: DESIGN.colors.primary },

  itemTypeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  itemTypeChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: DESIGN.colors.backgroundSecondary,
    paddingVertical: DESIGN.spacing.sm + 2,
    paddingHorizontal: DESIGN.spacing.sm,
    borderRadius: DESIGN.radius.md,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  itemTypeChipSelected: {
    backgroundColor: DESIGN.colors.primaryLight,
    borderColor: DESIGN.colors.primary,
  },
  itemTypeChipText: {
    color: DESIGN.colors.textSecondary,
    fontSize: 13,
    fontWeight: "500",
    marginLeft: DESIGN.spacing.sm,
  },
  itemTypeChipTextSelected: { color: DESIGN.colors.primary, fontWeight: "600" },

  label: {
    color: DESIGN.colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: DESIGN.spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  captionInput: {
    fontSize: 16,
    color: DESIGN.colors.textPrimary,
    minHeight: 80,
    textAlignVertical: "top",
  },

  imagePicker: {
    height: 140,
    backgroundColor: DESIGN.colors.backgroundSecondary,
    borderRadius: DESIGN.radius.lg,
    borderWidth: 2,
    borderColor: DESIGN.colors.border,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    gap: DESIGN.spacing.sm,
  },
  imagePickerIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: DESIGN.colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  imagePickerText: {
    color: DESIGN.colors.textSecondary,
    fontSize: 14,
    fontWeight: "500",
  },
  imagePreviewContainer: {
    width: "100%",
    height: 200,
    borderRadius: DESIGN.radius.lg,
    overflow: "hidden",
    position: "relative",
  },
  imagePreview: {
    width: "100%",
    height: "100%",
    borderRadius: DESIGN.radius.lg,
  },
  removeImageButton: {
    position: "absolute",
    top: DESIGN.spacing.sm,
    right: DESIGN.spacing.sm,
    backgroundColor: "rgba(0,0,0,0.6)",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },

  travelerInfoCard: {
    backgroundColor: DESIGN.colors.primaryLight,
    borderRadius: DESIGN.radius.xl,
    padding: DESIGN.spacing.md,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: DESIGN.spacing.lg,
    borderWidth: 1,
    borderColor: DESIGN.colors.primaryMuted,
  },
  travelerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: DESIGN.spacing.sm,
    backgroundColor: DESIGN.colors.disabled,
  },
  travelerInfoLabel: {
    color: DESIGN.colors.textSecondary,
    fontSize: 12,
    marginBottom: 2,
  },
  travelerInfoName: {
    color: DESIGN.colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  verifiedBadge: {
    backgroundColor: DESIGN.colors.primary,
    padding: DESIGN.spacing.xs,
    borderRadius: DESIGN.radius.full,
  },

  bottomSubmitButton: {
    borderRadius: DESIGN.radius.xl,
    overflow: "hidden",
    marginTop: DESIGN.spacing.sm,
    ...DESIGN.shadow.colored(DESIGN.colors.primary),
  },
  submitGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: DESIGN.spacing.sm,
    height: 56,
  },
  bottomSubmitButtonText: {
    color: DESIGN.colors.textInverse,
    fontSize: 17,
    fontWeight: "700",
  },
});
