import { useUploadFile } from "@convex-dev/r2/react";
import { Ionicons } from '@expo/vector-icons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useMutation, useQuery } from 'convex/react';
import * as Haptics from 'expo-haptics'; // 2. IMPORTED Haptics
import { Image } from "expo-image";
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert, // 1. IMPORTED Pressable
    Animated // 1. IMPORTED Animated
    ,

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
    UIManager,
    View
} from 'react-native';

import CountryFlag from "react-native-country-flag";

import { City, cityData } from '@/constants/cityData';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

// === TRANSLATION IMPORT ===
import { useTranslation } from 'react-i18next';

// 3. REFINED PALETTE: Matches the Trip screen quality but uses Green as primary
const COLORS = {
    primary: '#10B981', // Emerald 500
    primaryMuted: '#D1FAE5', // Emerald 100
    background: '#F8FAFC', // Slate 50
    surface: '#FFFFFF',
    text: '#1E293B', // Slate 800
    textSecondary: '#64748B', // Slate 500
    placeholder: '#94A3B8',
    separator: '#E2E8F0',
    disabled: '#CBD5E1',
    error: '#EF4444',
    success: '#10B981',
    inputBackground: '#F1F5F9', // Filled input style
    
    // Kept original keys for compatibility where needed
    green: '#10B981',
    greenMuted: 'rgba(16, 185, 129, 0.1)',
};

const itemTypesData = [
    { name: "Electronics", icon: "cellphone-link", category: "standard" },
    { name: "Clothing", icon: "hanger", category: "standard" },
    { name: "Documents", icon: "file-document-outline", category: "standard" },
    { name: "Books", icon: "book-open-page-variant-outline", category: "standard" },
    { name: "Cosmetics", icon: "bottle-tonic-outline", category: "standard" },
    { name: "Pets", icon: "dog-side", category: "special" },
    // { name: "Alcohol", icon: "bottle-wine-outline", category: "special" },
    { name: "Cigars", icon: "cigar", category: "special" },
    { name: "Medication", icon: "pill", category: "special" },
];

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

// 4. NEW COMPONENT: ScaleButton (Identical to Trip Screen for consistency)
const ScaleButton = ({ onPress, children, style, disabled }: any) => {
    const scaleValue = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        if (disabled) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Animated.spring(scaleValue, { toValue: 0.96, useNativeDriver: true, speed: 20 }).start();
    };

    const handlePressOut = () => {
        if (disabled) return;
        Animated.spring(scaleValue, { toValue: 1, useNativeDriver: true, speed: 20 }).start();
    };

    return (
        <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} disabled={disabled} style={{ width: '100%' }}>
            <Animated.View style={[style, { transform: [{ scale: scaleValue }] }]}>
                {children}
            </Animated.View>
        </Pressable>
    );
};

export default function RequestsScreen() {
    const router = useRouter();
    // Initialize Translation
    const { t, i18n } = useTranslation();

    const params = useLocalSearchParams();
    const { travelerId, tripId } = params;

    const isDirectMode = !!travelerId;
    const targetedTravelerId = isDirectMode ? travelerId as Id<"users"> : undefined;
    const targetedTripId = isDirectMode ? tripId as Id<"trips"> : undefined;

    const tripData = useQuery(
        api.trips.getTripById,
        isDirectMode && targetedTripId ? { tripId: targetedTripId } : "skip"
    );

    const existingRequest = useMemo(() => params.request ? JSON.parse(params.request as string) : null, [params.request]);
    const isEditMode = existingRequest !== null;

    const createDirectRequestAndOffer = useMutation(api.requests.createDirectRequestAndOffer);
    const createRequest = useMutation(api.requests.createRequest);
    const updateRequest = useMutation(api.requests.updateRequest);
    const uploadFile = useUploadFile(api.r2);

    const [productName, setProductName] = useState('');
    const [productURL, setProductURL] = useState('');
    const [selectedFile, setSelectedFile] = useState<ImagePicker.ImagePickerAsset | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [itemPrice, setItemPrice] = useState('');
    const [quantity, setQuantity] = useState('1');
    const [travelerFee, setTravelerFee] = useState('');
    const [origin, setOrigin] = useState<City | null>(null);
    const [destination, setDestination] = useState<City | null>(null);
    const [requiredByDate, setRequiredByDate] = useState(new Date());
    const [productWeight, setProductWeight] = useState('');
    const [weightUnit, setWeightUnit] = useState('gr');
    const [selectedItemTypes, setSelectedItemTypes] = useState<string[]>([]);
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPicker, setShowPicker] = useState(false);
    const [originQuery, setOriginQuery] = useState('');
    const [destinationQuery, setDestinationQuery] = useState('');
    const [suggestions, setSuggestions] = useState<City[]>([]);
    const [activeSuggestionType, setActiveSuggestionType] = useState<'origin' | 'destination' | null>(null);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        if (isEditMode && existingRequest) {
            setProductName(existingRequest.productName || '');
            setProductURL(existingRequest.productURL || '');
            setItemPrice(existingRequest.itemPrice?.toString() || '');
            setQuantity(existingRequest.quantity?.toString() || '1');
            setTravelerFee(existingRequest.travelerFee?.toString() || '');
            const originCity = existingRequest.originCity ? { name: existingRequest.originCity, country: existingRequest.originCountry, countryCode: existingRequest.originCountryCode } : null;
            const destCity = existingRequest.destinationCity ? { name: existingRequest.destinationCity, country: existingRequest.destinationCountry, countryCode: existingRequest.destinationCountryCode } : null;
            setOrigin(originCity);
            setDestination(destCity);
            setOriginQuery(originCity ? `${originCity.name}, ${originCity.country}` : '');
            setDestinationQuery(destCity ? `${destCity.name}, ${destCity.country}` : '');
            setRequiredByDate(new Date(existingRequest.requiredByDate));
            setDescription(existingRequest.description || '');
            const weightParts = (existingRequest.productWeight || '').split(' ');
            if (weightParts.length === 2) {
                setProductWeight(weightParts[0]);
                setWeightUnit(weightParts[1]);
            }
            if (existingRequest.itemTypes) {
                setSelectedItemTypes(existingRequest.itemTypes.split(', '));
            }
        }
    }, [isEditMode, existingRequest]);

    useEffect(() => {
        if (isDirectMode && tripData) {
            const originCity: City = { name: tripData.originCity, country: tripData.originCountry, countryCode: '' };
            const destinationCity: City = { name: tripData.destinationCity, country: tripData.destinationCountry, countryCode: '' };
            setOrigin(originCity);
            setDestination(destinationCity);
            setRequiredByDate(new Date(tripData.arrivalDate));
            setOriginQuery(`${originCity.name}, ${originCity.country}`);
            setDestinationQuery(`${destinationCity.name}, ${destinationCity.country}`);
        }
    }, [isDirectMode, tripData]);

    const handleSearchChange = (text: string, type: 'origin' | 'destination') => {
        if (type === 'origin') {
            setOriginQuery(text); setOrigin(null);
            if (errors.origin) setErrors(prev => ({ ...prev, origin: '' }));
        } else {
            setDestinationQuery(text); setDestination(null);
            if (errors.destination) setErrors(prev => ({ ...prev, destination: '' }));
        }
        setActiveSuggestionType(type);
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        if (text.length > 1) {
            const filtered = cityData.filter(city => city.name.toLowerCase().includes(text.toLowerCase()) || city.country.toLowerCase().includes(text.toLowerCase())).slice(0, 3);
            setSuggestions(filtered);
        } else { setSuggestions([]); }
    };

    const onSelectCity = (city: City, type: 'origin' | 'destination') => {
        Haptics.selectionAsync(); // Feedback
        const fullText = `${city.name}, ${city.country}`;
        if (type === 'origin') {
            setOrigin(city); setOriginQuery(fullText);
            if (errors.origin) setErrors(prev => ({ ...prev, origin: '' }));
        } else {
            setDestination(city); setDestinationQuery(fullText);
            if (errors.destination) setErrors(prev => ({ ...prev, destination: '' }));
        }
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setSuggestions([]); setActiveSuggestionType(null); Keyboard.dismiss();
    };

    // --- ADDED: Swap Functionality (from Trip Screen) ---
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
        if (event.type === 'set' && selectedDate) { setRequiredByDate(selectedDate); }
    };

    const handleImagePick = async () => {
        Haptics.selectionAsync();
        // Request permission to access the media library
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permission.status !== 'granted') {
            Alert.alert('Permission required', 'Please grant permission to access your photo library.');
            return;
        }

        // Launch the image picker
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1], // Square aspect ratio
            quality: 0.8, // Compress image slightly
        });

        if (!result.canceled) {
            setSelectedFile(result.assets[0]);
        }
    };

    const validateForm = () => {
        const newErrors: { [key: string]: string } = {};
        if (!productName) newErrors.productName = t('create_request.errors.product_name');
        if (!itemPrice) newErrors.itemPrice = t('create_request.errors.item_price');
        if (!travelerFee) newErrors.travelerFee = t('create_request.errors.reward');
        if (!origin) newErrors.origin = t('create_request.errors.origin');
        if (!destination) newErrors.destination = t('create_request.errors.destination');
        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        const isFormValid = validateForm();
        if (!isEditMode && !isFormValid) { return }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setIsSubmitting(true);

        let imageKey: string | undefined = undefined
        try {
            if (selectedFile) {

                const mimeType = selectedFile.mimeType || selectedFile.type || 'image/jpeg';
                if (!mimeType.startsWith('image/')) {
                    Alert.alert(
                        t('create_request.errors.invalid_file_type'),
                        t('create_request.errors.invalid_file_msg')
                    );
                    setIsSubmitting(false);
                    return;
                }

                // Fetch the file and convert to blob
                const response = await fetch(selectedFile.uri);
                const blob = await response.blob();


                const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

                if (blob.size > MAX_FILE_SIZE) {
                    Alert.alert(
                        t('create_request.errors.file_too_large'),
                        t('create_request.errors.file_too_large_msg', { size: (blob.size / (1024 * 1024)).toFixed(2) })
                    );
                    setIsSubmitting(false);
                    return;
                }

                const file = new File(
                    [blob],
                    selectedFile.fileName || `image_${Date.now()}.jpg`,
                    { type: mimeType }
                );

                imageKey = await uploadFile(file);
            }
            const requestData = {
                productName, productURL,
                imageKey: imageKey,
                quantity: parseInt(quantity, 10),
                itemPrice: parseFloat(itemPrice),
                travelerFee: parseFloat(travelerFee),
                originCountry: origin!.country, originCity: origin!.name,
                destinationCountry: destination!.country, destinationCity: destination!.name,
                requiredByDate: requiredByDate.getTime(),
                productWeight: `${productWeight} ${weightUnit}`,
                itemTypes: selectedItemTypes.join(', '),
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
                // Alert.alert('Success!', 'Your request has been updated.');
            } else if (isDirectMode) {
                await createDirectRequestAndOffer({
                    ...requestData,
                    visibility: "direct",
                    targetedTravelerId: targetedTravelerId!,
                    tripId: targetedTripId!,
                });
                // Alert.alert('Success!', 'Your direct offer has been sent.');
            } else {
                await createRequest({
                    ...requestData,
                    visibility: "public",
                    targetedTravelerId: undefined,
                });
                // Alert.alert('Success!', 'Your request has been posted.');
            }
            router.back();
        } catch (error) {
            console.error('Failed to submit request:', error);
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            const actionWord = isEditMode ? 'update' : 'post';

            if (errorMessage.includes('too large') || errorMessage.includes('Only images')) {
                Alert.alert(t('create_request.errors.upload_failed'), errorMessage);
            } else {
                Alert.alert(t('create_request.errors.generic_error'), t('create_request.errors.submit_error', { action: actionWord }));
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleItemTypeSelect = (item: string) => {
        Haptics.selectionAsync();
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setSelectedItemTypes(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
    }

    if (isDirectMode && !tripData) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={{ color: COLORS.text, marginTop: 10 }}>{t('create_request.loading_trip')}</Text>
            </View>
        )
    }

    const isFormComplete = productName && itemPrice && travelerFee && origin && destination;
    
    // Dynamic Titles
    const headerTitle = isEditMode 
        ? t('create_request.title_edit') 
        : isDirectMode 
            ? t('create_request.title_direct') 
            : t('create_request.title_new');
            
    const submitButtonText = isEditMode 
        ? t('create_request.btn_save') 
        : isDirectMode 
            ? t('create_request.btn_send') 
            : t('create_request.btn_post');

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            {/* 5. MODERN HEADER: Simplified, removed shadow and duplicate share button */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.headerAction} onPress={() => router.back()} disabled={isSubmitting}>
                    <Ionicons name="close" size={28} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{headerTitle}</Text>
                <View style={styles.headerAction} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <View style={isSubmitting && styles.contentDisabled}>

                    {isDirectMode && tripData?.traveler && (
                        <View style={styles.travelerInfoCard}>
                            <Image source={tripData.traveler.image} style={styles.travelerAvatar} />
                            <View>
                                <Text style={styles.travelerInfoLabel}>{t('create_request.direct_label')}</Text>
                                <Text style={styles.travelerInfoName}>{tripData.traveler.username}</Text>
                            </View>
                            <View style={styles.verifiedBadge}>
                                <Ionicons name="checkmark-circle" size={16} color="#FFF" />
                            </View>
                        </View>
                    )}

                    {/* SECTION 1: Product Details */}
                    <View style={styles.formSection}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.iconContainer}>
                                <MaterialCommunityIcons name="cube-outline" size={20} color={COLORS.primary} />
                            </View>
                            <Text style={styles.sectionTitle}>{t('create_request.sections.product')}</Text>
                        </View>
                        
                        <View style={{ gap: 16 }}>
                            {/* Image Picker: Modern Dashed Area */}
                            <View>
                                {selectedFile ? (
                                    <View style={styles.imagePreviewContainer}>
                                        <Image source={{ uri: selectedFile.uri }} style={styles.imagePreview} />
                                        <TouchableOpacity
                                            style={styles.removeImageButton}
                                            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedFile(null); }}
                                            disabled={isEditMode || isSubmitting}
                                        >
                                            <MaterialCommunityIcons name="close" size={16} color={COLORS.surface} />
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <TouchableOpacity
                                        style={[styles.imagePicker, isEditMode && styles.inputContainerDisabled]}
                                        onPress={handleImagePick}
                                        disabled={isEditMode || isSubmitting}
                                    >
                                        <View style={styles.imagePickerIconCircle}>
                                            <MaterialCommunityIcons name="camera-plus-outline" size={24} color={COLORS.primary} />
                                        </View>
                                        <Text style={[styles.imagePickerText, isEditMode && styles.inputTextDisabled]}>
                                            {t('create_request.labels.upload_image')}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            <View>
                                <View style={[styles.inputWrapper, !!errors.productName && styles.errorBorder]}>
                                    <Text style={styles.inputLabelSmall}>{t('create_request.labels.product_name')}</Text>
                                    <TextInput 
                                        style={styles.inputText} 
                                        placeholder={t('create_request.labels.product_placeholder')}
                                        placeholderTextColor={COLORS.placeholder} 
                                        value={productName} 
                                        onChangeText={setProductName} 
                                        editable={!isEditMode} 
                                    />
                                </View>
                            </View>

                            <View>
                                <View style={styles.inputWrapper}>
                                    <Text style={styles.inputLabelSmall}>{t('create_request.labels.product_link')}</Text>
                                    <TextInput 
                                        style={styles.inputText} 
                                        placeholder={t('create_request.labels.link_placeholder')}
                                        placeholderTextColor={COLORS.placeholder} 
                                        value={productURL} 
                                        onChangeText={setProductURL} 
                                        autoCapitalize="none"
                                        keyboardType="url"
                                    />
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* SECTION 2: Travel Route (Matching Trip Screen Visualization) */}
                    <View style={styles.formSection}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.iconContainer}>
                                <MaterialCommunityIcons name="map-marker-path" size={20} color={COLORS.primary} />
                            </View>
                            <Text style={styles.sectionTitle}>{t('create_request.sections.route')}</Text>
                        </View>
                        
                        <View style={styles.routeContainer}>
                            {/* Route Rail Visualization */}
                            <View style={styles.routeRail}>
                                <View style={styles.railDot} />
                                <View style={styles.railLine} />
                                <View style={styles.railPin} />
                            </View>

                            <View style={{ flex: 1, gap: 16 }}>
                                <View>
                                    <View style={[styles.inputWrapper, !!errors.origin && styles.errorBorder, (isDirectMode || isEditMode) && styles.inputContainerDisabled]}>
                                        <Text style={styles.inputLabelSmall}>{t('create_request.labels.origin')}</Text>
                                        <TextInput
                                            style={[styles.inputText, (isDirectMode || isEditMode) && styles.inputTextDisabled]}
                                            placeholder={t('create_request.labels.city_placeholder')}
                                            placeholderTextColor={COLORS.placeholder}
                                            value={originQuery}
                                            onChangeText={(text) => handleSearchChange(text, 'origin')}
                                            editable={!isEditMode && !isDirectMode}
                                        />
                                    </View>
                                    {activeSuggestionType === 'origin' && suggestions.length > 0 && (
                                        <View style={styles.suggestionsContainer}>
                                            {suggestions.map((item) => (
                                                <TouchableOpacity key={item.name + item.countryCode} style={styles.suggestionItem} onPress={() => onSelectCity(item, 'origin')}>
                                                    <CountryFlag isoCode={item.countryCode.toLowerCase()} size={14} style={styles.flagStyle} />
                                                    <Text style={styles.suggestionText}>{item.name}, {item.country}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    )}
                                </View>

                                <View>
                                    <View style={[styles.inputWrapper, !!errors.destination && styles.errorBorder, (isDirectMode || isEditMode) && styles.inputContainerDisabled]}>
                                        <Text style={styles.inputLabelSmall}>{t('create_request.labels.destination')}</Text>
                                        <TextInput
                                            style={[styles.inputText, (isDirectMode || isEditMode) && styles.inputTextDisabled]}
                                            placeholder={t('create_request.labels.city_placeholder')}
                                            placeholderTextColor={COLORS.placeholder}
                                            value={destinationQuery}
                                            onChangeText={(text) => handleSearchChange(text, 'destination')}
                                            editable={!isEditMode && !isDirectMode}
                                        />
                                    </View>
                                    {activeSuggestionType === 'destination' && suggestions.length > 0 && (
                                        <View style={styles.suggestionsContainer}>
                                            {suggestions.map((item) => (
                                                <TouchableOpacity key={item.name + item.countryCode} style={styles.suggestionItem} onPress={() => onSelectCity(item, 'destination')}>
                                                     <CountryFlag isoCode={item.countryCode.toLowerCase()} size={14} style={styles.flagStyle} />
                                                     <Text style={styles.suggestionText}>{item.name}, {item.country}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            </View>

                            <TouchableOpacity
                                onPress={handleSwapLocations}
                                style={styles.swapButton}
                                disabled={isDirectMode || isEditMode}
                            >
                                <Ionicons name="swap-vertical" size={20} color={(isDirectMode || isEditMode) ? COLORS.disabled : COLORS.primary} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* SECTION 3: Logistics (Date) */}
                    <View style={styles.formSection}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.iconContainer}>
                                <MaterialCommunityIcons name="calendar-clock" size={20} color={COLORS.primary} />
                            </View>
                            <Text style={styles.sectionTitle}>{t('create_request.sections.deadline')}</Text>
                        </View>
                        <View>
                            <TouchableOpacity
                                style={[styles.dateCard, isDirectMode && styles.inputContainerDisabled]}
                                onPress={() => setShowPicker(true)}
                                disabled={isDirectMode}
                            >
                                <View style={styles.dateIconBox}>
                                    <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
                                </View>
                                <View>
                                    <Text style={styles.dateLabel}>{t('create_request.labels.required_by')}</Text>
                                    <Text style={[styles.dateValue, isDirectMode && styles.inputTextDisabled]}>
                                        {/* Localized Date */}
                                        {requiredByDate.toLocaleDateString(i18n.language, { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* SECTION 4: Pricing */}
                    <View style={styles.formSection}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.iconContainer}>
                                <MaterialCommunityIcons name="cash-multiple" size={20} color={COLORS.primary} />
                            </View>
                            <Text style={styles.sectionTitle}>{t('create_request.sections.budget')}</Text>
                        </View>
                        
                        <View style={styles.inputGroup}>
                            <View style={[styles.inputWrapper, { flex: 2 }, !!errors.itemPrice && styles.errorBorder]}>
                                <Text style={styles.inputLabelSmall}>{t('create_request.labels.item_price')}</Text>
                                <TextInput style={styles.inputTextLarge} placeholder="0.00" placeholderTextColor={COLORS.placeholder} value={itemPrice} onChangeText={setItemPrice} keyboardType="numeric" editable={!isEditMode} />
                            </View>
                            <View style={[styles.inputWrapper, { flex: 1 }]}>
                                <Text style={styles.inputLabelSmall}>{t('create_request.labels.qty')}</Text>
                                <TextInput style={styles.inputTextLarge} value={quantity} onChangeText={setQuantity} keyboardType="numeric" textAlign="center" />
                            </View>
                        </View>
                        
                        <View style={[styles.inputWrapper, { marginTop: 16 }, !!errors.travelerFee && styles.errorBorder]}>
                            <Text style={styles.inputLabelSmall}>{t('create_request.labels.reward')}</Text>
                            <TextInput style={styles.inputTextLarge} placeholder={t('create_request.labels.reward_placeholder')} placeholderTextColor={COLORS.placeholder} value={travelerFee} onChangeText={setTravelerFee} keyboardType="numeric" />
                        </View>
                        <Text style={styles.helperText}>{t('create_request.labels.reward_helper')}</Text>
                    </View>

                    {/* SECTION 5: Specs */}
                    <View style={styles.formSection}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.iconContainer}>
                                <MaterialCommunityIcons name="scale" size={20} color={COLORS.primary} />
                            </View>
                            <Text style={styles.sectionTitle}>{t('create_request.sections.specs')}</Text>
                        </View>

                        <Text style={styles.label}>{t('create_request.labels.weight')}</Text>
                        <View style={styles.spaceInputRow}>
                            <View style={[styles.inputWrapper, { flex: 1 }]}>
                                <TextInput
                                    style={styles.inputText}
                                    placeholder={t('create_request.labels.weight_placeholder')}
                                    placeholderTextColor={COLORS.placeholder}
                                    value={productWeight}
                                    onChangeText={setProductWeight}
                                    keyboardType="numeric"
                                    editable={!isEditMode}
                                />
                            </View>
                            
                            {/* Segmented Control for Units */}
                            <View style={styles.segmentedControl}>
                                <Pressable style={[styles.segment, weightUnit === 'gr' && styles.segmentActive]} onPress={() => { Haptics.selectionAsync(); setWeightUnit('gr'); }} disabled={isEditMode}>
                                    <Text style={[styles.segmentText, weightUnit === 'gr' && styles.segmentTextActive]}>{t('create_request.units.gr')}</Text>
                                </Pressable>
                                <Pressable style={[styles.segment, weightUnit === 'kg' && styles.segmentActive]} onPress={() => { Haptics.selectionAsync(); setWeightUnit('kg'); }} disabled={isEditMode}>
                                    <Text style={[styles.segmentText, weightUnit === 'kg' && styles.segmentTextActive]}>{t('create_request.units.kg')}</Text>
                                </Pressable>
                            </View>
                        </View>

                        <Text style={[styles.label, { marginTop: 16 }]}>{t('create_request.sections.category')}</Text>
                        <View style={styles.itemTypeGrid}>
                            {itemTypesData.map(item => (
                                <Pressable
                                    key={item.name}
                                    style={{ width: '48%', marginBottom: 10 }}
                                    onPress={() => handleItemTypeSelect(item.name)}
                                    disabled={isEditMode}
                                >
                                    <View style={[styles.itemTypeChip, selectedItemTypes.includes(item.name) && styles.itemTypeChipSelected]}>
                                        <MaterialCommunityIcons name={item.icon as any} size={20} color={selectedItemTypes.includes(item.name) ? COLORS.primary : COLORS.textSecondary} />
                                        <Text style={[styles.itemTypeChipText, selectedItemTypes.includes(item.name) && styles.itemTypeChipTextSelected]}>
                                            {t(`categories.${item.name}`)}
                                        </Text>
                                    </View>
                                </Pressable>
                            ))}
                        </View>

                        <Text style={[styles.label, { marginTop: 16 }]}>{t('create_request.sections.notes')}</Text>
                        <View style={styles.inputWrapper}>
                            <TextInput style={styles.captionInput} placeholder={t('create_request.labels.notes_placeholder')} placeholderTextColor={COLORS.placeholder} multiline value={description} onChangeText={setDescription} />
                        </View>
                    </View>

                </View>

                <ScaleButton
                    style={[styles.bottomSubmitButton, (!isFormComplete && !isEditMode || isSubmitting) && styles.shareButtonDisabled]}
                    disabled={(!isFormComplete && !isEditMode) || isSubmitting}
                    onPress={handleSubmit}>
                    {isSubmitting ? <ActivityIndicator size="small" color={COLORS.surface} /> : <Text style={styles.bottomSubmitButtonText}>{submitButtonText}</Text>}
                </ScaleButton>

            </ScrollView>

            {showPicker && (<DateTimePicker mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} value={requiredByDate} onChange={onDateChange} minimumDate={new Date()} maximumDate={isDirectMode && tripData ? new Date(tripData.arrivalDate) : undefined} />)}
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    
    // Header
    header: {
        backgroundColor: COLORS.background, // Seamless background
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 10 : 20,
        paddingBottom: 10,
    },
    headerAction: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        color: COLORS.text,
        fontSize: 18,
        fontWeight: '700'
    },
    shareButtonDisabled: { opacity: 0.6 },
    
    scrollContent: { padding: 20, paddingBottom: 60 },
    contentDisabled: { opacity: 0.5 },
    
    // Form Section (Card)
    formSection: {
        backgroundColor: COLORS.surface,
        borderRadius: 24,
        padding: 20,
        marginBottom: 20,
        shadowColor: "#64748B",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    iconContainer: { 
        width: 32, height: 32, borderRadius: 10, 
        backgroundColor: COLORS.primaryMuted, 
        justifyContent: 'center', alignItems: 'center', 
        marginRight: 10 
    },
    sectionTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700' },

    // Input Styles (Filled)
    inputWrapper: {
        backgroundColor: COLORS.inputBackground,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    inputLabelSmall: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 2, textTransform: 'uppercase', fontWeight: '600' },
    inputText: { fontSize: 16, color: COLORS.text, fontWeight: '500', padding: 0 },
    inputTextLarge: { fontSize: 20, color: COLORS.text, fontWeight: '700', padding: 0 },
    
    inputContainerDisabled: { backgroundColor: COLORS.separator, opacity: 0.7 },
    inputTextDisabled: { color: COLORS.textSecondary },
    
    errorBorder: { borderColor: COLORS.error, borderWidth: 1 },
    helperText: { fontSize: 12, color: COLORS.textSecondary, marginTop: 8 },

    // Route Visualization
    routeContainer: { flexDirection: 'row', alignItems: 'stretch' },
    routeRail: { width: 20, alignItems: 'center', paddingVertical: 25, marginRight: 10 },
    railDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
    railLine: { flex: 1, width: 2, backgroundColor: COLORS.separator, marginVertical: 4 },
    railPin: { width: 10, height: 10, borderRadius: 2, backgroundColor: COLORS.textSecondary },
    swapButton: { 
        position: 'absolute', 
        right: 0, 
        top: '40%', 
        backgroundColor: COLORS.surface, 
        width: 36, height: 36, 
        borderRadius: 18, 
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: COLORS.separator,
        shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2
    },

    // Suggestions
    suggestionsContainer: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        marginTop: 4,
        borderWidth: 1,
        borderColor: COLORS.separator,
        overflow: 'hidden',
        zIndex: 10
    },
    suggestionItem: { padding: 14, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.separator },
    flagStyle: { marginRight: 12, borderRadius: 2 },
    suggestionText: { color: COLORS.text, fontSize: 14, fontWeight: '500' },

    // Date Card
    dateCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: COLORS.inputBackground,
        borderRadius: 16, padding: 16
    },
    dateIconBox: { marginRight: 12 },
    dateLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 2 },
    dateValue: { fontSize: 16, color: COLORS.text, fontWeight: '600' },

    // Pricing Layout
    inputGroup: { flexDirection: 'row', gap: 12 },

    // Item Chips & Units
    spaceInputRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    segmentedControl: {
        flexDirection: 'row', backgroundColor: COLORS.inputBackground, padding: 4, borderRadius: 14, height: 56, alignItems: 'center'
    },
    segment: { paddingHorizontal: 20, height: '100%', justifyContent: 'center', borderRadius: 10 },
    segmentActive: { backgroundColor: COLORS.surface, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 },
    segmentText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
    segmentTextActive: { color: COLORS.primary },

    itemTypeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    itemTypeChip: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: COLORS.inputBackground,
        paddingVertical: 12, paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1, borderColor: 'transparent'
    },
    itemTypeChipSelected: { backgroundColor: COLORS.primaryMuted, borderColor: COLORS.primary },
    itemTypeChipText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '500', marginLeft: 8 },
    itemTypeChipTextSelected: { color: COLORS.primary, fontWeight: '600' },

    label: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase' },
    captionInput: { fontSize: 16, color: COLORS.text, minHeight: 80, textAlignVertical: 'top' },

    // Image Picker
    imagePicker: {
        height: 140,
        backgroundColor: COLORS.inputBackground,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: COLORS.separator,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    imagePickerIconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primaryMuted, justifyContent: 'center', alignItems: 'center' },
    imagePickerText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '500' },
    imagePreviewContainer: { width: '100%', height: 200, borderRadius: 16, overflow: 'hidden', position: 'relative' },
    imagePreview: { width: '100%', height: '100%', borderRadius: 16 },
    removeImageButton: {
        position: 'absolute', top: 10, right: 10,
        backgroundColor: 'rgba(0,0,0,0.6)',
        width: 32, height: 32, borderRadius: 16,
        justifyContent: 'center', alignItems: 'center'
    },

    // Traveler Card
    travelerInfoCard: {
        backgroundColor: '#ECFDF5', // Very light green
        borderRadius: 20,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: COLORS.primaryMuted,
    },
    travelerAvatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12, backgroundColor: COLORS.disabled },
    travelerInfoLabel: { color: COLORS.textSecondary, fontSize: 12, marginBottom: 2 },
    travelerInfoName: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
    verifiedBadge: { marginLeft: 'auto', backgroundColor: COLORS.primary, padding: 4, borderRadius: 20 },

    // Submit Button
    bottomSubmitButton: {
        backgroundColor: COLORS.primary,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 10,
    },
    bottomSubmitButtonText: { color: COLORS.surface, fontSize: 18, fontWeight: '700' },
});