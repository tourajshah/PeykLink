import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useMutation } from 'convex/react';
import * as Haptics from 'expo-haptics'; // 2. IMPORTED: For tactile feedback
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated // 1. IMPORTED: For custom animations
    ,

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
    UIManager,
    View
} from 'react-native';

import CountryFlag from "react-native-country-flag";

import { Airline, airlineData } from '@/constants/airlineData';
import { City, cityData } from '@/constants/cityData';
import { api } from '@/convex/_generated/api';

// === TRANSLATION IMPORT ===
import { useTranslation } from 'react-i18next';

// 3. REFINED PALETTE: Modern, clean, high-contrast
const COLORS = {
    primary: '#3B82F6', // Modern Blue
    primaryMuted: '#DBEAFE', // Soft blue background
    background: '#F8FAFC', // Slate-50 (Cool white)
    surface: '#FFFFFF',
    text: '#1E293B', // Slate-800
    textSecondary: '#64748B', // Slate-500
    placeholder: '#94A3B8',
    separator: '#E2E8F0',
    disabled: '#CBD5E1',
    error: '#EF4444',
    success: '#10B981',
    inputBackground: '#F1F5F9', // Very light grey for inputs
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

const MAX_KG = 100;
const MAX_GR = 100000;

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

// 4. NEW COMPONENT: Scalable Button for tactile feel
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

export default function TripsScreen() {
    const router = useRouter();
    // Initialize Translation
    const { t, i18n } = useTranslation();

    const params = useLocalSearchParams();
    const existingTrip = useMemo(() => params.trip ? JSON.parse(params.trip as string) : null, [params.trip]);
    const isEditMode = existingTrip !== null;
    const isInitialMount = useRef(true);

    // --- State Management ---
    const [origin, setOrigin] = useState<City | null>(null);
    const [destination, setDestination] = useState<City | null>(null);
    const [date, setDate] = useState(new Date());
    const [availableSpaceValue, setAvailableSpaceValue] = useState('');
    const [availableSpaceUnit, setAvailableSpaceUnit] = useState('kg');
    const [acceptedItemTypes, setAcceptedItemTypes] = useState<string[]>([]);
    const [airline, setAirline] = useState<Airline | null>(null);
    const [airlineSearch, setAirlineSearch] = useState('');
    const [originQuery, setOriginQuery] = useState('');
    const [destinationQuery, setDestinationQuery] = useState('');
    const [suggestions, setSuggestions] = useState<City[]>([]);
    const [activeSuggestionType, setActiveSuggestionType] = useState<'origin' | 'destination' | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [airlineModalVisible, setAirlineModalVisible] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    // const [isOfferingAssistance, setIsOfferingAssistance] = useState(false);

    useEffect(() => {
        if (isEditMode && existingTrip) {
            const originCity = existingTrip.originCity ? { name: existingTrip.originCity, country: existingTrip.originCountry, countryCode: existingTrip.originCountryCode } : null;
            const destCity = existingTrip.destinationCity ? { name: existingTrip.destinationCity, country: existingTrip.destinationCountry, countryCode: existingTrip.destinationCountryCode } : null;
            setOrigin(originCity);
            setDestination(destCity);
            setOriginQuery(originCity ? `${originCity.name}, ${originCity.country}` : '');
            setDestinationQuery(destCity ? `${destCity.name}, ${destCity.country}` : '');
            setDate(new Date(existingTrip.arrivalDate));
            if (existingTrip.airline) {
                const foundAirline = airlineData.find(a => a.name === existingTrip.airline);
                setAirline(foundAirline || { name: existingTrip.airline });
            }
            const spaceParts = (existingTrip.availableSpace || '').split(' ');
            if (spaceParts.length === 2) {
                setAvailableSpaceValue(spaceParts[0]);
                setAvailableSpaceUnit(spaceParts[1]);
            }
            if (existingTrip.acceptedItemTypes) {
                setAcceptedItemTypes(existingTrip.acceptedItemTypes.split(', '));
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
            const filtered = cityData.filter(city =>
                city.name.toLowerCase().includes(text.toLowerCase()) ||
                city.country.toLowerCase().includes(text.toLowerCase())
            ).slice(0, 3);
            setSuggestions(filtered);
        } else {
            setSuggestions([]);
        }
    };

    const onSelectCity = (city: City, type: 'origin' | 'destination') => {
        Haptics.selectionAsync(); // Feedback on selection
        const fullText = `${city.name}, ${city.country}`;
        if (type === 'origin') {
            setOrigin(city); setOriginQuery(fullText);
            if (errors.origin) setErrors(prev => ({ ...prev, origin: '' }));
        } else {
            setDestination(city); setDestinationQuery(fullText);
            if (errors.destination) setErrors(prev => ({ ...prev, destination: '' }));
        }
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setSuggestions([]);
        setActiveSuggestionType(null);
        Keyboard.dismiss();
    };

    const handleSwapLocations = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); // Heavier impact for swap
        // Animate layout changes
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setOrigin(destination);
        setDestination(origin);
        setOriginQuery(destinationQuery);
        setDestinationQuery(originQuery);
    };

    const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (event.type === 'set') {
            const currentDate = selectedDate || date;
            setDate(currentDate);
        }
    };
    
    const handleAvailableSpaceChange = (text: string) => {
        if (text === '') {
            setAvailableSpaceValue('');
            setErrors(prev => ({ ...prev, availableSpace: t('create_trip.errors.space') }));
            return;
        }
        const numValue = parseFloat(text);
        if (isNaN(numValue)) {
            setAvailableSpaceValue('');
            return;
        }
        const limit = availableSpaceUnit === 'kg' ? MAX_KG : MAX_GR;
        const unitName = availableSpaceUnit === 'kg' ? 'kgs' : 'grams';
        
        if (numValue > limit) {
            Alert.alert(
                t('create_trip.errors.limit_title'), 
                t('create_trip.errors.limit_msg', { limit: limit, unit: unitName })
            );
            setAvailableSpaceValue(limit.toString());
        } else {
            setAvailableSpaceValue(text);
        }
        if (errors.availableSpace) {
            setErrors(prev => ({ ...prev, availableSpace: '' }));
        }
    };

    const validateForm = () => {
        const newErrors: { [key: string]: string } = {};
        if (!origin) newErrors.origin = t('create_trip.errors.origin');
        if (!destination) newErrors.destination = t('create_trip.errors.destination');
        if (!availableSpaceValue) newErrors.availableSpace = t('create_trip.errors.space');
        if (!airline) newErrors.airline = t('create_trip.errors.airline'); 
        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setIsSubmitting(true);
        try {
            // const assistanceStatus = isOfferingAssistance ? 'Traveler is offering assistance.' : 'Traveler is not offering assistance.';
            if (isEditMode) {
                await updateTrip({
                    tripId: existingTrip._id,
                    availableSpace: `${availableSpaceValue} ${availableSpaceUnit}`,
                    acceptedItemTypes: acceptedItemTypes.join(', '),
                    airline: airline?.name,
                });
                // Alert.alert('Success!', `Your trip has been updated.\n${assistanceStatus}`);
            } else {
                await createTrip({
                    originCity: origin!.name, originCountry: origin!.country,
                    destinationCity: destination!.name, destinationCountry: destination!.country,
                    arrivalDate: date.getTime(),
                    availableSpace: `${availableSpaceValue} ${availableSpaceUnit}`,
                    acceptedItemTypes: acceptedItemTypes.join(', '),
                    airline: airline!.name,
                });
                // Alert.alert('Success!', `Your trip has been shared.\n${assistanceStatus}`);
            }
            router.back();
        } catch (error) {
            console.error(`Failed to ${isEditMode ? 'update' : 'create'} trip:`, error);
            const actionWord = isEditMode ? 'update' : 'share';
            Alert.alert(t('create_trip.errors.generic_error'), t('create_trip.errors.submit_error', { action: actionWord }));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleItemTypeSelect = (item: string) => {
        Haptics.selectionAsync();
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setAcceptedItemTypes(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
    }
    
    const filteredAirlines = airlineData.filter(item => item.name.toLowerCase().includes(airlineSearch.toLowerCase()));
    const isFormComplete = origin && destination && availableSpaceValue && airline;
    
    const headerTitle = isEditMode ? t('create_trip.title_edit') : t('create_trip.title_plan');
    const submitButtonText = isEditMode ? t('create_trip.btn_save') : t('create_trip.btn_post');

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            {/* 5. MODERN HEADER: Cleaner text-based header with no shadow */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.headerAction} onPress={() => router.back()} disabled={isSubmitting}>
                    <Ionicons name="close" size={28} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{headerTitle}</Text>
                {/* Visual placeholder to balance header */}
                <View style={styles.headerAction} />
            </View>
            
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <View style={isSubmitting && styles.contentDisabled}>
                    
                    {/* SECTION 1: VISUAL ROUTE BUILDER */}
                    <View style={styles.formSection}>
                        <View style={styles.sectionHeader}>
                             <View style={styles.iconContainer}>
                                <MaterialCommunityIcons name="map-marker-path" size={20} color={COLORS.primary} />
                             </View>
                            <Text style={styles.sectionTitle}>{t('create_trip.sections.route')}</Text>
                        </View>
                        
                        <View style={styles.routeContainer}>
                            {/* Visual Rail: Circle -> Line -> Pin */}
                            <View style={styles.routeRail}>
                                <View style={styles.railDot} />
                                <View style={styles.railLine} />
                                <View style={styles.railPin} />
                            </View>

                            <View style={{ flex: 1, gap: 20 }}>
                                <View>
                                    <View style={[styles.inputWrapper, !!errors.origin && styles.errorBorder]}>
                                        <Text style={styles.inputLabelSmall}>{t('create_trip.labels.origin')}</Text>
                                        <TextInput
                                            placeholder={t('create_trip.labels.city_placeholder')} placeholderTextColor={COLORS.placeholder} value={originQuery}
                                            onChangeText={(text) => handleSearchChange(text, 'origin')} style={styles.inputText}
                                            editable={!isEditMode}
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
                                    <View style={[styles.inputWrapper, !!errors.destination && styles.errorBorder]}>
                                        <Text style={styles.inputLabelSmall}>{t('create_trip.labels.destination')}</Text>
                                        <TextInput
                                            placeholder={t('create_trip.labels.city_placeholder')} placeholderTextColor={COLORS.placeholder} value={destinationQuery}
                                            onChangeText={(text) => handleSearchChange(text, 'destination')} style={styles.inputText}
                                            editable={!isEditMode}
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

                            <TouchableOpacity onPress={handleSwapLocations} style={styles.swapButton} disabled={isEditMode}>
                                <Ionicons name="swap-vertical" size={20} color={COLORS.primary} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* SECTION 2: TRIP DETAILS (Date & Airline) */}
                    <View style={styles.formSection}>
                         <View style={styles.sectionHeader}>
                            <View style={styles.iconContainer}>
                                <MaterialCommunityIcons name="ticket-confirmation-outline" size={20} color={COLORS.primary} />
                            </View>
                            <Text style={styles.sectionTitle}>{t('create_trip.sections.details')}</Text>
                        </View>
                        
                         <View style={styles.inputGroup}>
                            <View style={styles.inputSectionHalf}>
                                <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateCard} disabled={isEditMode}>
                                    <View style={styles.dateIconBox}><Ionicons name="calendar-outline" size={20} color={COLORS.primary} /></View>
                                    <View>
                                        <Text style={styles.dateLabel}>{t('create_trip.labels.arrival_date')}</Text>
                                        <Text style={[styles.dateValue, isEditMode && {color: COLORS.disabled}]}>
                                            {/* Localized Date */}
                                            {date.toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </View>
                        
                        <View style={{ marginTop: 16 }}>
                             <TouchableOpacity 
                                 onPress={() => setAirlineModalVisible(true)} 
                                 style={[styles.airlineCard, !!errors.airline && styles.errorBorder]}
                             >
                                 <View style={styles.airlineInfo}>
                                    <Text style={styles.dateLabel}>{t('create_trip.labels.airline')}</Text>
                                    <Text style={airline ? styles.airlineValue : styles.placeholderText} numberOfLines={1}>
                                         {airline?.name ?? t('create_trip.labels.select_airline')}
                                    </Text>
                                 </View>
                                 <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
                             </TouchableOpacity>
                             {errors.airline && <Text style={styles.errorText}>{errors.airline}</Text>}
                        </View>
                    </View>

                    {/* SECTION 3: CAPACITY */}
                    <View style={styles.formSection}>
                        <View style={styles.sectionHeader}>
                             <View style={styles.iconContainer}>
                                <FontAwesome5 name="weight-hanging" size={16} color={COLORS.primary} />
                            </View>
                            <Text style={styles.sectionTitle}>{t('create_trip.sections.capacity')}</Text>
                        </View>
                        
                        <View style={styles.capacityContainer}>
                            <View style={[styles.capacityInputWrapper, !!errors.availableSpace && styles.errorBorder]}>
                                <TextInput
                                    style={styles.capacityInput} placeholder="0"
                                    placeholderTextColor={COLORS.placeholder} value={availableSpaceValue}
                                    onChangeText={handleAvailableSpaceChange} keyboardType="numeric"
                                />
                            </View>
                            
                            {/* Modern Segmented Control */}
                            <View style={styles.segmentedControl}>
                                <Pressable style={[styles.segment, availableSpaceUnit === 'kg' && styles.segmentActive]} onPress={() => { Haptics.selectionAsync(); setAvailableSpaceUnit('kg'); }}>
                                    <Text style={[styles.segmentText, availableSpaceUnit === 'kg' && styles.segmentTextActive]}>{t('create_trip.units.kg')}</Text>
                                </Pressable>
                                <Pressable style={[styles.segment, availableSpaceUnit === 'gr' && styles.segmentActive]} onPress={() => { Haptics.selectionAsync(); setAvailableSpaceUnit('gr'); }}>
                                    <Text style={[styles.segmentText, availableSpaceUnit === 'gr' && styles.segmentTextActive]}>{t('create_trip.units.gr')}</Text>
                                </Pressable>
                            </View>
                        </View>
                        {errors.availableSpace && <Text style={styles.errorText}>{errors.availableSpace}</Text>}
                    </View>

                    {/* SECTION 4: ACCEPTED ITEMS */}
                    <View style={styles.formSection}>
                         <View style={styles.sectionHeader}>
                            <View style={styles.iconContainer}>
                                <MaterialCommunityIcons name="check-decagram-outline" size={20} color={COLORS.primary} />
                            </View>
                            <Text style={styles.sectionTitle}>{t('create_trip.sections.allowed_items')}</Text>
                        </View>
                        
                        <View style={styles.itemTypeGrid}>
                             {itemTypesData.map(item => (
                                <Pressable
                                    key={item.name}
                                    onPress={() => handleItemTypeSelect(item.name)}
                                    style={{ width: '48%', marginBottom: 10 }} // Grid logic
                                >
                                    <View style={[styles.itemCard, acceptedItemTypes.includes(item.name) && styles.itemCardSelected]}>
                                        <MaterialCommunityIcons name={item.icon as any} size={22} color={acceptedItemTypes.includes(item.name) ? COLORS.primary : COLORS.textSecondary} />
                                        <Text style={[styles.itemCardText, acceptedItemTypes.includes(item.name) && styles.itemCardTextSelected]}>
                                            {t(`categories.${item.name}`)}
                                        </Text>
                                        {acceptedItemTypes.includes(item.name) && <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} style={styles.checkIcon} />}
                                    </View>
                                </Pressable>
                            ))}
                        </View>
                         <View style={styles.infoBox}>
                             <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.primary} />
                             <Text style={styles.infoBoxText}>{t('create_trip.info_warning')}</Text>
                          </View>
                    </View>

                    {/* 6. PRIMARY ACTION: Sticky-feel bottom button */}
                    <ScaleButton
                        disabled={!isFormComplete || isSubmitting}
                        onPress={handleSubmit}
                        style={[styles.bottomSubmitButton, (!isFormComplete || isSubmitting) && styles.shareButtonDisabled]}
                    >
                         {isSubmitting 
                            ? <ActivityIndicator size="small" color={COLORS.surface} /> 
                            : <Text style={styles.bottomSubmitButtonText}>{submitButtonText}</Text>
                        }
                    </ScaleButton>

                </View>
            </ScrollView>

            {showDatePicker && (<DateTimePicker mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} value={date} onChange={onDateChange} minimumDate={new Date()} />)}
            
            {/* AIRLINE MODAL */}
            <Modal animationType="slide" transparent={true} visible={airlineModalVisible} onRequestClose={() => setAirlineModalVisible(false)}>
                <Pressable style={styles.modalBackdrop} onPress={() => setAirlineModalVisible(false)}>
                    <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}> 
                        <View style={styles.modalHeader}>
                            <View style={styles.modalHandle} />
                            <Text style={styles.modalTitle}>{t('create_trip.labels.select_airline')}</Text>
                        </View>
                         <View style={styles.modalSearchContainer}>
                            <Ionicons name="search-outline" size={20} color={COLORS.placeholder} style={styles.modalSearchIcon}/>
                            <TextInput 
                                placeholder={t('create_trip.labels.search_airline_placeholder')}
                                placeholderTextColor={COLORS.placeholder}
                                value={airlineSearch}
                                onChangeText={setAirlineSearch}
                                style={styles.modalSearchInput}
                                autoFocus={true}
                            />
                        </View>
                        <ScrollView style={styles.modalScrollView} keyboardShouldPersistTaps="handled">
                            {filteredAirlines.map(item => (
                                <TouchableOpacity key={item.name}
                                    style={[styles.dropdownItem, airline?.name === item.name && styles.dropdownItemSelected]}
                                    onPress={() => { 
                                        Haptics.selectionAsync(); 
                                        setAirline(item); 
                                        setAirlineModalVisible(false); 
                                        setAirlineSearch(''); 
                                    }}>
                                    <Text style={[styles.dropdownItemText, airline?.name === item.name && styles.dropdownItemSelectedText]}>{item.name}</Text>
                                    {airline?.name === item.name && <Ionicons name="checkmark" size={22} color={COLORS.primary}/>}
                                </TouchableOpacity>
                            ))}
                            {filteredAirlines.length === 0 && (
                                <View style={styles.emptyState}>
                                    <Text style={styles.emptyStateText}>{t('create_trip.errors.no_airline_found', { query: airlineSearch })}</Text>
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
    
    // Sections
    formSection: {
        backgroundColor: COLORS.surface,
        borderRadius: 24, // Softer corners
        padding: 20,
        marginBottom: 20,
        // iOS Shadow
        shadowColor: "#64748B",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        // Android Elevation
        elevation: 2,
    },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    iconContainer: { 
        width: 32, height: 32, borderRadius: 10, 
        backgroundColor: COLORS.primaryMuted, 
        justifyContent: 'center', alignItems: 'center', 
        marginRight: 10 
    },
    sectionTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
    
    // Route Visualization
    routeContainer: { flexDirection: 'row', alignItems: 'stretch' },
    routeRail: { width: 20, alignItems: 'center', paddingVertical: 25, marginRight: 10 },
    railDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
    railLine: { flex: 1, width: 2, backgroundColor: COLORS.separator, marginVertical: 4 },
    railPin: { width: 10, height: 10, borderRadius: 2, backgroundColor: COLORS.textSecondary },
    
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

    // Date & Airline Cards
    inputGroup: { flexDirection: 'row', gap: 16 },
    inputSectionHalf: { flex: 1 },
    dateCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: COLORS.inputBackground,
        borderRadius: 16, padding: 16
    },
    dateIconBox: { marginRight: 12 },
    dateLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 2 },
    dateValue: { fontSize: 16, color: COLORS.text, fontWeight: '600' },
    
    airlineCard: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: COLORS.inputBackground,
        borderRadius: 16, padding: 16,
    },
    airlineInfo: { flex: 1 },
    airlineValue: { fontSize: 16, color: COLORS.text, fontWeight: '600' },
    placeholderText: { color: COLORS.placeholder, fontSize: 16 },

    // Capacity
    capacityContainer: { flexDirection: 'row', gap: 12, alignItems: 'center' },
    capacityInputWrapper: {
        flex: 1, backgroundColor: COLORS.inputBackground, borderRadius: 16, paddingHorizontal: 16, height: 56, justifyContent: 'center'
    },
    capacityInput: { fontSize: 20, fontWeight: '700', color: COLORS.text },
    segmentedControl: {
        flexDirection: 'row', backgroundColor: COLORS.inputBackground, padding: 4, borderRadius: 14, height: 56, alignItems: 'center'
    },
    segment: { paddingHorizontal: 20, height: '100%', justifyContent: 'center', borderRadius: 10 },
    segmentActive: { backgroundColor: COLORS.surface, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 },
    segmentText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
    segmentTextActive: { color: COLORS.primary },

    // Items Grid
    itemTypeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    itemCard: {
        backgroundColor: COLORS.inputBackground,
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'transparent'
    },
    itemCardSelected: {
        backgroundColor: '#EFF6FF', // Light blue
        borderColor: COLORS.primary
    },
    itemCardText: { marginLeft: 10, fontSize: 14, fontWeight: '500', color: COLORS.textSecondary },
    itemCardTextSelected: { color: COLORS.primary, fontWeight: '600' },
    checkIcon: { marginLeft: 'auto' },

    infoBox: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#EFF6FF', borderRadius: 12, padding: 12, marginTop: 16,
        gap: 10
    },
    infoBoxText: { color: COLORS.primary, fontSize: 12, flex: 1, lineHeight: 18 },

    // Errors
    errorBorder: { borderWidth: 1, borderColor: COLORS.error },
    errorText: { color: COLORS.error, fontSize: 12, marginTop: 6, marginLeft: 4 },

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

    // Modal
    modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContent: {
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        height: '80%',
        paddingBottom: 40
    },
    modalHeader: { alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.separator },
    modalHandle: { width: 40, height: 4, backgroundColor: COLORS.disabled, borderRadius: 2, marginBottom: 12 },
    modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
    modalSearchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.inputBackground, margin: 16, borderRadius: 12, paddingHorizontal: 12 },
    modalSearchIcon: { marginRight: 8 },
    modalSearchInput: { flex: 1, height: 48, fontSize: 16, color: COLORS.text },
    modalScrollView: { paddingHorizontal: 16 },
    dropdownItem: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.separator
    },
    dropdownItemText: { fontSize: 16, color: COLORS.text },
    dropdownItemSelectedText: { color: COLORS.primary, fontWeight: '600' },
    dropdownItemSelected: {},
    emptyState: { padding: 40, alignItems: 'center' },
    emptyStateText: { color: COLORS.textSecondary }
});