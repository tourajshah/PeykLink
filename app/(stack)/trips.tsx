/**
 * Create Trip Screen - Premium Airbnb + Logistics Design 2026
 *
 * Features:
 * - Premium DESIGN tokens matching app theme
 * - Gradient accent buttons
 * - 3D press animations
 * - Modern form sections
 * - Premium modal styling
 */

import { Ionicons } from "@expo/vector-icons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useMutation } from "convex/react";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  LayoutAnimation,
  Modal,
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

import { Airline, airlineData } from "@/constants/airlineData";
import { City, cityData } from "@/constants/cityData";
import { api } from "@/convex/_generated/api";

// === TRANSLATION IMPORT ===
import { useTranslation } from "react-i18next";

// ============================================================================
// DESIGN SYSTEM - Premium 2026 (Matching App Theme)
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
    primary: "#3B82F6",
    primaryLight: "rgba(59, 130, 246, 0.1)",
    primaryMuted: "#DBEAFE",
    primaryGradient: ["#3B82F6", "#2563EB"] as const,
    success: "#10B981",
    successLight: "rgba(16, 185, 129, 0.1)",
    warning: "#F59E0B",
    error: "#EF4444",
    errorLight: "rgba(239, 68, 68, 0.1)",
    border: "#E2E8F0",
    borderFocus: "#3B82F6",
    divider: "#E2E8F0",
    disabled: "#CBD5E1",
    placeholder: "#94A3B8",
    glassDark: "rgba(0, 0, 0, 0.5)",
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

const MAX_KG = 100;
const MAX_GR = 100000;

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

export default function TripsScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();

  const params = useLocalSearchParams();
  const existingTrip = useMemo(
    () => (params.trip ? JSON.parse(params.trip as string) : null),
    [params.trip],
  );
  const isEditMode = existingTrip !== null;
  const isInitialMount = useRef(true);

  const [origin, setOrigin] = useState<City | null>(null);
  const [destination, setDestination] = useState<City | null>(null);
  const [date, setDate] = useState(new Date());
  const [availableSpaceValue, setAvailableSpaceValue] = useState("");
  const [availableSpaceUnit, setAvailableSpaceUnit] = useState("kg");
  const [acceptedItemTypes, setAcceptedItemTypes] = useState<string[]>([]);
  const [airline, setAirline] = useState<Airline | null>(null);
  const [airlineSearch, setAirlineSearch] = useState("");
  const [originQuery, setOriginQuery] = useState("");
  const [destinationQuery, setDestinationQuery] = useState("");
  const [suggestions, setSuggestions] = useState<City[]>([]);
  const [activeSuggestionType, setActiveSuggestionType] = useState<
    "origin" | "destination" | null
  >(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [airlineModalVisible, setAirlineModalVisible] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (isEditMode && existingTrip) {
      const originCity = existingTrip.originCity
        ? {
            name: existingTrip.originCity,
            country: existingTrip.originCountry,
            countryCode: existingTrip.originCountryCode,
          }
        : null;
      const destCity = existingTrip.destinationCity
        ? {
            name: existingTrip.destinationCity,
            country: existingTrip.destinationCountry,
            countryCode: existingTrip.destinationCountryCode,
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
      setDate(new Date(existingTrip.arrivalDate));
      if (existingTrip.airline) {
        const foundAirline = airlineData.find(
          (a) => a.name === existingTrip.airline,
        );
        setAirline(foundAirline || { name: existingTrip.airline });
      }
      const spaceParts = (existingTrip.availableSpace || "").split(" ");
      if (spaceParts.length === 2) {
        setAvailableSpaceValue(spaceParts[0]);
        setAvailableSpaceUnit(spaceParts[1]);
      }
      if (existingTrip.acceptedItemTypes) {
        setAcceptedItemTypes(existingTrip.acceptedItemTypes.split(", "));
      }
    }
  }, [isEditMode, existingTrip]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
    } else {
      handleAvailableSpaceChange(availableSpaceValue);
    }
  }, [availableSpaceUnit]);

  const createTrip = useMutation(api.trips.createTrip);
  const updateTrip = useMutation(api.trips.updateTrip);

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
    Haptics.selectionAsync();
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOrigin(destination);
    setDestination(origin);
    setOriginQuery(destinationQuery);
    setDestinationQuery(originQuery);
  };

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (event.type === "set") {
      const currentDate = selectedDate || date;
      setDate(currentDate);
    }
  };

  const handleAvailableSpaceChange = (text: string) => {
    if (text === "") {
      setAvailableSpaceValue("");
      setErrors((prev) => ({
        ...prev,
        availableSpace: t("create_trip.errors.space"),
      }));
      return;
    }
    const numValue = parseFloat(text);
    if (isNaN(numValue)) {
      setAvailableSpaceValue("");
      return;
    }
    const limit = availableSpaceUnit === "kg" ? MAX_KG : MAX_GR;
    const unitName = availableSpaceUnit === "kg" ? "kgs" : "grams";

    if (numValue > limit) {
      Alert.alert(
        t("create_trip.errors.limit_title"),
        t("create_trip.errors.limit_msg", { limit: limit, unit: unitName }),
      );
      setAvailableSpaceValue(limit.toString());
    } else {
      setAvailableSpaceValue(text);
    }
    if (errors.availableSpace) {
      setErrors((prev) => ({ ...prev, availableSpace: "" }));
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!origin) newErrors.origin = t("create_trip.errors.origin");
    if (!destination)
      newErrors.destination = t("create_trip.errors.destination");
    if (!availableSpaceValue)
      newErrors.availableSpace = t("create_trip.errors.space");
    if (!airline) newErrors.airline = t("create_trip.errors.airline");
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    return Object.keys(newErrors).length === 0;
  };

  // =========================================================
  // FIX APPLIED HERE: Removing the finally block to stop
  // background state updates while the screen is unmounting.
  // =========================================================
  const handleSubmit = async () => {
    if (!validateForm()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsSubmitting(true);

    try {
      if (isEditMode) {
        await updateTrip({
          tripId: existingTrip._id,
          availableSpace: `${availableSpaceValue} ${availableSpaceUnit}`,
          acceptedItemTypes: acceptedItemTypes.join(", "),
          airline: airline?.name,
        });
      } else {
        await createTrip({
          originCity: origin!.name,
          originCountry: origin!.country,
          destinationCity: destination!.name,
          destinationCountry: destination!.country,
          arrivalDate: date.getTime(),
          availableSpace: `${availableSpaceValue} ${availableSpaceUnit}`,
          acceptedItemTypes: acceptedItemTypes.join(", "),
          airline: airline!.name,
        });
      }

      // Navigate away immediately.
      // Do NOT set isSubmitting(false) here or in a finally block!
      router.back();
    } catch (error) {
      console.error(
        `Failed to ${isEditMode ? "update" : "create"} trip:`,
        error,
      );
      const actionWord = isEditMode ? "update" : "share";
      Alert.alert(
        t("create_trip.errors.generic_error"),
        t("create_trip.errors.submit_error", { action: actionWord }),
      );

      // ONLY set to false if we caught an error and stay on the screen
      setIsSubmitting(false);
    }
  };

  const handleItemTypeSelect = (item: string) => {
    Haptics.selectionAsync();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setAcceptedItemTypes((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item],
    );
  };

  const filteredAirlines = airlineData.filter((item) =>
    item.name.toLowerCase().includes(airlineSearch.toLowerCase()),
  );
  const isFormComplete =
    origin && destination && availableSpaceValue && airline;

  const headerTitle = isEditMode
    ? t("create_trip.title_edit")
    : t("create_trip.title_plan");
  const submitButtonText = isEditMode
    ? t("create_trip.btn_save")
    : t("create_trip.btn_post");

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
          {/* SECTION 1: VISUAL ROUTE BUILDER */}
          <Reanimated.View
            entering={FadeInDown.delay(100).springify()}
            style={styles.formSection}
          >
            <SectionHeader
              icon="map-marker-path"
              title={t("create_trip.sections.route")}
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
                    ]}
                  >
                    <Text style={styles.inputLabelSmall}>
                      {t("create_trip.labels.origin")}
                    </Text>
                    <TextInput
                      placeholder={t("create_trip.labels.city_placeholder")}
                      placeholderTextColor={DESIGN.colors.placeholder}
                      value={originQuery}
                      onChangeText={(text) =>
                        handleSearchChange(text, "origin")
                      }
                      style={styles.inputText}
                      editable={!isEditMode}
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
                    ]}
                  >
                    <Text style={styles.inputLabelSmall}>
                      {t("create_trip.labels.destination")}
                    </Text>
                    <TextInput
                      placeholder={t("create_trip.labels.city_placeholder")}
                      placeholderTextColor={DESIGN.colors.placeholder}
                      value={destinationQuery}
                      onChangeText={(text) =>
                        handleSearchChange(text, "destination")
                      }
                      style={styles.inputText}
                      editable={!isEditMode}
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
                disabled={isEditMode}
              >
                <Ionicons
                  name="swap-vertical"
                  size={18}
                  color={DESIGN.colors.primary}
                />
              </TouchableOpacity>
            </View>
          </Reanimated.View>

          {/* SECTION 2: TRIP DETAILS (Date & Airline) */}
          <Reanimated.View
            entering={FadeInDown.delay(200).springify()}
            style={styles.formSection}
          >
            <SectionHeader
              icon="ticket-confirmation-outline"
              title={t("create_trip.sections.details")}
            />

            <View style={styles.inputGroup}>
              <View style={styles.inputSectionHalf}>
                <TouchableOpacity
                  onPress={() => setShowDatePicker(true)}
                  style={styles.dateCard}
                  disabled={isEditMode}
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
                      {t("create_trip.labels.arrival_date")}
                    </Text>
                    <Text
                      style={[
                        styles.dateValue,
                        isEditMode && { color: DESIGN.colors.disabled },
                      ]}
                    >
                      {date.toLocaleDateString(i18n.language, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ marginTop: 16 }}>
              <TouchableOpacity
                onPress={() => setAirlineModalVisible(true)}
                style={[
                  styles.airlineCard,
                  !!errors.airline && styles.errorBorder,
                ]}
              >
                <View style={styles.airlineInfo}>
                  <Text style={styles.dateLabel}>
                    {t("create_trip.labels.airline")}
                  </Text>
                  <Text
                    style={
                      airline ? styles.airlineValue : styles.placeholderText
                    }
                    numberOfLines={1}
                  >
                    {airline?.name ?? t("create_trip.labels.select_airline")}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={DESIGN.colors.textSecondary}
                />
              </TouchableOpacity>
              {errors.airline && (
                <Text style={styles.errorText}>{errors.airline}</Text>
              )}
            </View>
          </Reanimated.View>

          {/* SECTION 3: CAPACITY */}
          <Reanimated.View
            entering={FadeInDown.delay(300).springify()}
            style={styles.formSection}
          >
            <SectionHeader
              icon="weight"
              title={t("create_trip.sections.capacity")}
            />

            <View style={styles.capacityContainer}>
              <View
                style={[
                  styles.capacityInputWrapper,
                  !!errors.availableSpace && styles.errorBorder,
                ]}
              >
                <TextInput
                  style={styles.capacityInput}
                  placeholder="0"
                  placeholderTextColor={DESIGN.colors.placeholder}
                  value={availableSpaceValue}
                  onChangeText={handleAvailableSpaceChange}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.segmentedControl}>
                <Pressable
                  style={[
                    styles.segment,
                    availableSpaceUnit === "kg" && styles.segmentActive,
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setAvailableSpaceUnit("kg");
                  }}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      availableSpaceUnit === "kg" && styles.segmentTextActive,
                    ]}
                  >
                    {t("create_trip.units.kg")}
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.segment,
                    availableSpaceUnit === "gr" && styles.segmentActive,
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setAvailableSpaceUnit("gr");
                  }}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      availableSpaceUnit === "gr" && styles.segmentTextActive,
                    ]}
                  >
                    {t("create_trip.units.gr")}
                  </Text>
                </Pressable>
              </View>
            </View>
            {errors.availableSpace && (
              <Text style={styles.errorText}>{errors.availableSpace}</Text>
            )}
          </Reanimated.View>

          {/* SECTION 4: ACCEPTED ITEMS */}
          <Reanimated.View
            entering={FadeInDown.delay(400).springify()}
            style={styles.formSection}
          >
            <SectionHeader
              icon="check-decagram-outline"
              title={t("create_trip.sections.allowed_items")}
            />

            <View style={styles.itemTypeGrid}>
              {itemTypesData.map((item, index) => (
                <Pressable
                  key={item.name}
                  onPress={() => handleItemTypeSelect(item.name)}
                  style={{ width: "48%", marginBottom: 10 }}
                >
                  <View
                    style={[
                      styles.itemCard,
                      acceptedItemTypes.includes(item.name) &&
                        styles.itemCardSelected,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={item.icon as any}
                      size={22}
                      color={
                        acceptedItemTypes.includes(item.name)
                          ? DESIGN.colors.primary
                          : DESIGN.colors.textSecondary
                      }
                    />
                    <Text
                      style={[
                        styles.itemCardText,
                        acceptedItemTypes.includes(item.name) &&
                          styles.itemCardTextSelected,
                      ]}
                    >
                      {t(`categories.${item.name}`)}
                    </Text>
                    {acceptedItemTypes.includes(item.name) && (
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color={DESIGN.colors.primary}
                        style={styles.checkIcon}
                      />
                    )}
                  </View>
                </Pressable>
              ))}
            </View>

            <View style={styles.infoBox}>
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color={DESIGN.colors.primary}
              />
              <Text style={styles.infoBoxText}>
                {t("create_trip.info_warning")}
              </Text>
            </View>
          </Reanimated.View>

          {/* 6. PRIMARY ACTION */}
          <ScaleButton
            disabled={!isFormComplete || isSubmitting}
            onPress={handleSubmit}
            style={[
              styles.bottomSubmitButton,
              (!isFormComplete || isSubmitting) && styles.shareButtonDisabled,
            ]}
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
                    name="airplane"
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
        </View>
      </ScrollView>

      {showDatePicker && (
        <DateTimePicker
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          value={date}
          onChange={onDateChange}
          minimumDate={new Date()}
        />
      )}

      {/* AIRLINE MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={airlineModalVisible}
        onRequestClose={() => setAirlineModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setAirlineModalVisible(false)}
        >
          <Pressable
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>
                {t("create_trip.labels.select_airline")}
              </Text>
            </View>
            <View style={styles.modalSearchContainer}>
              <Ionicons
                name="search-outline"
                size={20}
                color={DESIGN.colors.placeholder}
                style={styles.modalSearchIcon}
              />
              <TextInput
                placeholder={t("create_trip.labels.search_airline_placeholder")}
                placeholderTextColor={DESIGN.colors.placeholder}
                value={airlineSearch}
                onChangeText={setAirlineSearch}
                style={styles.modalSearchInput}
                autoFocus={true}
              />
            </View>
            <ScrollView
              style={styles.modalScrollView}
              keyboardShouldPersistTaps="handled"
            >
              {filteredAirlines.map((item) => (
                <TouchableOpacity
                  key={item.name}
                  style={[
                    styles.dropdownItem,
                    airline?.name === item.name && styles.dropdownItemSelected,
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setAirline(item);
                    setAirlineModalVisible(false);
                    setAirlineSearch("");
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      airline?.name === item.name &&
                        styles.dropdownItemSelectedText,
                    ]}
                  >
                    {item.name}
                  </Text>
                  {airline?.name === item.name && (
                    <Ionicons
                      name="checkmark"
                      size={22}
                      color={DESIGN.colors.primary}
                    />
                  )}
                </TouchableOpacity>
              ))}
              {filteredAirlines.length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>
                    {t("create_trip.errors.no_airline_found", {
                      query: airlineSearch,
                    })}
                  </Text>
                </View>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
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
    marginBottom: DESIGN.spacing.lg,
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

  inputGroup: { flexDirection: "row", gap: DESIGN.spacing.md },
  inputSectionHalf: { flex: 1 },
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

  airlineCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: DESIGN.colors.backgroundSecondary,
    borderRadius: DESIGN.radius.lg,
    padding: DESIGN.spacing.md,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  airlineInfo: { flex: 1 },
  airlineValue: {
    fontSize: 16,
    color: DESIGN.colors.textPrimary,
    fontWeight: "600",
  },
  placeholderText: { color: DESIGN.colors.placeholder, fontSize: 16 },

  capacityContainer: {
    flexDirection: "row",
    gap: DESIGN.spacing.sm,
    alignItems: "center",
  },
  capacityInputWrapper: {
    flex: 1,
    backgroundColor: DESIGN.colors.backgroundSecondary,
    borderRadius: DESIGN.radius.lg,
    paddingHorizontal: DESIGN.spacing.md,
    height: 56,
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  capacityInput: {
    fontSize: 24,
    fontWeight: "700",
    color: DESIGN.colors.textPrimary,
  },
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: DESIGN.colors.backgroundSecondary,
    padding: 4,
    borderRadius: DESIGN.radius.md,
    height: 56,
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
  itemCard: {
    backgroundColor: DESIGN.colors.backgroundSecondary,
    borderRadius: DESIGN.radius.md,
    padding: DESIGN.spacing.md,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  itemCardSelected: {
    backgroundColor: DESIGN.colors.primaryLight,
    borderColor: DESIGN.colors.primary,
  },
  itemCardText: {
    marginLeft: DESIGN.spacing.sm,
    fontSize: 13,
    fontWeight: "500",
    color: DESIGN.colors.textSecondary,
    flex: 1,
  },
  itemCardTextSelected: { color: DESIGN.colors.primary, fontWeight: "600" },
  checkIcon: { marginLeft: "auto" },

  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: DESIGN.colors.primaryLight,
    borderRadius: DESIGN.radius.md,
    padding: DESIGN.spacing.md,
    marginTop: DESIGN.spacing.md,
    gap: DESIGN.spacing.sm,
  },
  infoBoxText: {
    color: DESIGN.colors.primary,
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },

  errorBorder: { borderColor: DESIGN.colors.error, borderWidth: 1.5 },
  errorText: {
    color: DESIGN.colors.error,
    fontSize: 12,
    marginTop: DESIGN.spacing.xs,
    marginLeft: DESIGN.spacing.xs,
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

  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: DESIGN.colors.glassDark,
  },
  modalContent: {
    backgroundColor: DESIGN.colors.surface,
    borderTopLeftRadius: DESIGN.radius.xl,
    borderTopRightRadius: DESIGN.radius.xl,
    height: "80%",
    paddingBottom: 40,
  },
  modalHeader: {
    alignItems: "center",
    padding: DESIGN.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: DESIGN.colors.border,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: DESIGN.colors.disabled,
    borderRadius: 2,
    marginBottom: DESIGN.spacing.sm,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: DESIGN.colors.textPrimary,
  },
  modalSearchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: DESIGN.colors.backgroundSecondary,
    margin: DESIGN.spacing.md,
    borderRadius: DESIGN.radius.md,
    paddingHorizontal: DESIGN.spacing.sm,
  },
  modalSearchIcon: { marginRight: DESIGN.spacing.sm },
  modalSearchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: DESIGN.colors.textPrimary,
  },
  modalScrollView: { paddingHorizontal: DESIGN.spacing.md },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: DESIGN.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: DESIGN.colors.border,
  },
  dropdownItemText: { fontSize: 16, color: DESIGN.colors.textPrimary },
  dropdownItemSelectedText: { color: DESIGN.colors.primary, fontWeight: "600" },
  dropdownItemSelected: { backgroundColor: DESIGN.colors.primaryLight },
  emptyState: { padding: DESIGN.spacing.xxl, alignItems: "center" },
  emptyStateText: { color: DESIGN.colors.textSecondary },
});
