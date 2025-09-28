import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useMutation } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
    UIManager,
    View
} from 'react-native';

import CountryFlag from "react-native-country-flag";

import { Airline, airlineData } from '@/constants/airlineData';
import { City, cityData } from '@/constants/cityData';
import { api } from '@/convex/_generated/api';

const COLORS = {
    primary: '#0A84FF',
    primaryMuted: 'rgba(10, 132, 255, 0.1)',
    background: '#F0F2F5',
    surface: '#FFFFFF',
    text: '#212121',
    textSecondary: '#6D6D72',
    placeholder: '#AEAEB2',
    separator: '#E5E5EA',
    disabled: '#D1D1D6',
    error: '#FF3B30',
    success: '#34C759',
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

export default function TripsScreen() {
    const router = useRouter();
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
            setErrors(prev => ({ ...prev, availableSpace: 'Available space is required.' }));
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
            Alert.alert('Limit Exceeded', `The maximum available space is ${limit} ${unitName}.`);
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
        if (!origin) newErrors.origin = 'Please select a valid origin city from the list.';
        if (!destination) newErrors.destination = 'Please select a valid destination city from the list.';
        if (!availableSpaceValue) newErrors.availableSpace = 'Available space is required.';
        if (!airline) newErrors.airline = 'Please select an airline.'; 
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;
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
                    arrivalDate: date.toISOString().split('T')[0],
                    availableSpace: `${availableSpaceValue} ${availableSpaceUnit}`,
                    acceptedItemTypes: acceptedItemTypes.join(', '),
                    airline: airline!.name,
                });
                // Alert.alert('Success!', `Your trip has been shared.\n${assistanceStatus}`);
            }
            router.back();
        } catch (error) {
            console.error(`Failed to ${isEditMode ? 'update' : 'create'} trip:`, error);
            Alert.alert('Error', `Could not ${isEditMode ? 'update' : 'share'} your trip. Please try again.`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleItemTypeSelect = (item: string) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setAcceptedItemTypes(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
    }
    
    const filteredAirlines = airlineData.filter(item => item.name.toLowerCase().includes(airlineSearch.toLowerCase()));
    const isFormComplete = origin && destination && availableSpaceValue && airline;
    const headerTitle = isEditMode ? 'Edit Trip' : 'New Trip';
    const submitButtonText = isEditMode ? 'Save' : 'Share';

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.headerAction} onPress={() => router.back()} disabled={isSubmitting}>
                    <Ionicons name="chevron-back" size={32} color={isSubmitting ? COLORS.disabled : COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{headerTitle}</Text>
                <View style={styles.headerAction}>
                     <TouchableOpacity
                        style={[styles.shareButton, (!isFormComplete || isSubmitting) && styles.shareButtonDisabled]}
                        disabled={!isFormComplete || isSubmitting}
                        onPress={handleSubmit}>
                        {isSubmitting ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.shareButtonText}>{isEditMode ? 'Save' : 'Share'}</Text>}
                    </TouchableOpacity>
                </View>
            </View>
            
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <View style={isSubmitting && styles.contentDisabled}>
                    <View style={styles.formSection}>
                        <View style={styles.sectionHeader}>
                            <MaterialCommunityIcons name="airplane-marker" size={24} color={COLORS.primary} />
                            {/* --- CHANGE: Renamed "Your Itinerary" --- */}
                            <Text style={styles.sectionTitle}>Travel Route</Text>
                        </View>
                        <View style={styles.routeContainer}>
                            {/* --- CHANGE: Added a View with gap for spacing --- */}
                            <View style={{ flex: 1, gap: 16 }}>
                                <View>
                                    <View style={[styles.inputContainer, !!errors.origin && styles.errorBorder]}>
                                        <TextInput
                                            placeholder="From" placeholderTextColor={COLORS.placeholder} value={originQuery}
                                            onChangeText={(text) => handleSearchChange(text, 'origin')} style={styles.inputText}
                                            editable={!isEditMode}
                                        />
                                    </View>
                                    {activeSuggestionType === 'origin' && suggestions.length > 0 && (
                                        <View style={styles.suggestionsContainer}>
                                            {suggestions.map((item) => (
                                                <TouchableOpacity key={item.name + item.countryCode} style={styles.suggestionItem} onPress={() => onSelectCity(item, 'origin')}>
                                                    <CountryFlag isoCode={item.countryCode.toLowerCase()} size={20} style={styles.flagStyle} />
                                                    <Text style={styles.suggestionText}>{item.name}, {item.country}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    )}
                                </View>
                                <View>
                                    <View style={[styles.inputContainer, !!errors.destination && styles.errorBorder]}>
                                        <TextInput
                                            placeholder="To" placeholderTextColor={COLORS.placeholder} value={destinationQuery}
                                            onChangeText={(text) => handleSearchChange(text, 'destination')} style={styles.inputText}
                                            editable={!isEditMode}
                                        />
                                    </View>
                                    {activeSuggestionType === 'destination' && suggestions.length > 0 && (
                                         <View style={styles.suggestionsContainer}>
                                            {suggestions.map((item) => (
                                                <TouchableOpacity key={item.name + item.countryCode} style={styles.suggestionItem} onPress={() => onSelectCity(item, 'destination')}>
                                                     <CountryFlag isoCode={item.countryCode.toLowerCase()} size={20} style={styles.flagStyle} />
                                                     <Text style={styles.suggestionText}>{item.name}, {item.country}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            </View>
                            <TouchableOpacity onPress={handleSwapLocations} style={styles.swapButton} disabled={isEditMode}>
                                <Ionicons name="swap-vertical" size={24} color={isEditMode ? COLORS.disabled : COLORS.primary} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.formSection}>
                         <View style={styles.sectionHeader}>
                            <MaterialCommunityIcons name="calendar-clock" size={24} color={COLORS.primary} />
                            <Text style={styles.sectionTitle}>Trip Details</Text>
                        </View>
                         <View style={styles.inputGroup}>
                            <View style={styles.inputSectionHalf}>
                                <Text style={styles.label}>Arrival Date<Text style={{ color: COLORS.error }}> *</Text></Text>
                                <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.inputContainer} disabled={isEditMode}>
                                    <Text style={[styles.inputText, isEditMode && {color: COLORS.disabled}]}>{date.toLocaleDateString()}</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.inputSectionHalf}>
                                {/* --- CHANGE: Removed "(Optional)" and added a required asterisk --- */}
                                <Text style={styles.label}>
                                    Airline <Text style={{ color: COLORS.error }}>*</Text>
                                </Text>
                                {/* --- CHANGE: Added conditional error border style --- */}
                                <TouchableOpacity 
                                    onPress={() => setAirlineModalVisible(true)} 
                                    style={[styles.inputContainer, !!errors.airline && styles.errorBorder]}
                                >
                                    <Text style={airline ? styles.inputText : styles.placeholderText} numberOfLines={1}>
                                        {airline?.name ?? 'Select'}
                                    </Text>
                                </TouchableOpacity>
                                {/* --- CHANGE: Added the error text display --- */}
                                {errors.airline && <Text style={styles.errorText}>{errors.airline}</Text>}
                            </View>
                        </View>
                    </View>

                    <View style={styles.formSection}>
                        <View style={styles.sectionHeader}>
                             <FontAwesome5 name="luggage-cart" size={18} color={COLORS.primary} />
                            <Text style={styles.sectionTitle}>Available Space<Text style={{ color: COLORS.error }}> *</Text></Text>
                        </View>
                        <View style={styles.spaceInputRow}>
                            <View style={[styles.inputContainer, { flex: 1 }, !!errors.availableSpace && styles.errorBorder]}>
                                <TextInput
                                    style={styles.spaceValueInput} placeholder="e.g., 5"
                                    placeholderTextColor={COLORS.placeholder} value={availableSpaceValue}
                                    onChangeText={handleAvailableSpaceChange} keyboardType="numeric"
                                />
                            </View>
                            <View style={styles.unitSelector}>
                                <TouchableOpacity style={[styles.unitButton, availableSpaceUnit === 'gr' && styles.unitButtonSelected]} onPress={() => setAvailableSpaceUnit('gr')}>
                                    <Text style={[styles.unitButtonText, availableSpaceUnit === 'gr' && styles.unitButtonTextSelected]}>gr</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.unitButton, availableSpaceUnit === 'kg' && styles.unitButtonSelected]} onPress={() => setAvailableSpaceUnit('kg')}>
                                    <Text style={[styles.unitButtonText, availableSpaceUnit === 'kg' && styles.unitButtonTextSelected]}>kg</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        {errors.availableSpace && <Text style={styles.errorText}>{errors.availableSpace}</Text>}
                    </View>

                    <View style={styles.formSection}>
                         <View style={styles.sectionHeader}>
                            <MaterialCommunityIcons name="package-variant-closed" size={24} color={COLORS.primary} />
                            <Text style={styles.sectionTitle}>Accepted Items<Text style={{ color: COLORS.error }}> *</Text></Text>
                        </View>
                        <View style={styles.itemTypeGrid}>
                             {itemTypesData.map(item => (
                                <TouchableOpacity
                                    key={item.name}
                                    style={[styles.itemTypeChip, acceptedItemTypes.includes(item.name) && styles.itemTypeChipSelected]}
                                    onPress={() => handleItemTypeSelect(item.name)}
                                >
                                    <MaterialCommunityIcons name={item.icon as any} size={24} color={acceptedItemTypes.includes(item.name) ? COLORS.primary : COLORS.textSecondary} />
                                    <Text style={[styles.itemTypeChipText, acceptedItemTypes.includes(item.name) && styles.itemTypeChipTextSelected]}>{item.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                         <View style={styles.infoBox}>
                             <Ionicons name="information-circle-outline" size={20} color={COLORS.textSecondary} />
                             <Text style={styles.infoBoxText}>For special items (Pets, Cigars, etc.), please verify airline and country regulations.</Text>
                         </View>
                    </View>

                     {/* FUTURE FEATURE TTO ADD - ASSISTING ELDERLY AND TOUR GUIDE */}

                     {/* <View style={styles.formSection}>
                         <View style={styles.sectionHeader}>
                            <MaterialCommunityIcons name="account-heart-outline" size={24} color={COLORS.primary} />
                            <Text style={styles.sectionTitle}>Community Assistance</Text>
                        </View>
                        <View style={styles.assistanceContainer}>
                            <Text style={styles.assistanceText}>Offer to help elderly or people in need?</Text>
                            <Switch
                                trackColor={{ false: COLORS.disabled, true: COLORS.success }}
                                thumbColor={COLORS.surface}
                                ios_backgroundColor={COLORS.disabled}
                                onValueChange={setIsOfferingAssistance}
                                value={isOfferingAssistance}
                            />
                        </View>
                    </View> */}

                    <TouchableOpacity
                        style={[styles.bottomSubmitButton, (!isFormComplete || isSubmitting) && styles.shareButtonDisabled]}
                        disabled={!isFormComplete || isSubmitting}
                        onPress={handleSubmit}>
                        {isSubmitting 
                            ? <ActivityIndicator size="small" color={COLORS.surface} /> 
                            : <Text style={styles.bottomSubmitButtonText}>{submitButtonText}</Text>
                        }
                    </TouchableOpacity>

                </View>
            </ScrollView>

            {showDatePicker && (<DateTimePicker mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} value={date} onChange={onDateChange} minimumDate={new Date()} />)}
            
            <Modal animationType="fade" transparent={true} visible={airlineModalVisible} onRequestClose={() => setAirlineModalVisible(false)}>
                <Pressable style={styles.modalBackdrop} onPress={() => setAirlineModalVisible(false)}>
                    <Pressable style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Airline</Text>
                            <View style={styles.modalSearchContainer}>
                                <Ionicons name="search-outline" size={20} color={COLORS.placeholder} style={styles.modalSearchIcon}/>
                                <TextInput 
                                    placeholder="Search airline..."
                                    placeholderTextColor={COLORS.placeholder}
                                    value={airlineSearch}
                                    onChangeText={setAirlineSearch}
                                    style={styles.modalSearchInput}
                                />
                            </View>
                        </View>
                        <ScrollView style={styles.modalScrollView}>
                            {filteredAirlines.map(item => (
                                <TouchableOpacity key={item.name}
                                    style={[styles.dropdownItem, airline?.name === item.name && styles.dropdownItemSelected]}
                                    onPress={() => { setAirline(item); setAirlineModalVisible(false); setAirlineSearch(''); }}>
                                    <Text style={[styles.dropdownItemText, airline?.name === item.name && styles.dropdownItemSelectedText]}>{item.name}</Text>
                                    {airline?.name === item.name && <Ionicons name="checkmark-circle" size={22} color={COLORS.primary}/>}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: {
        backgroundColor: COLORS.surface,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between', // Ensures items are spaced out
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 5 : 5,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.separator,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 3,
    },
    // --- CHANGE: New styles for balancing the header ---
    headerAction: {
        minWidth: 80, // Gives space for the button
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        color: COLORS.text,
        fontSize: 18,
        fontWeight: '600'
    },
    shareButton: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        alignSelf: 'flex-end', // Aligns button to the right of its container
    },
    shareButtonDisabled: { backgroundColor: COLORS.disabled },
    shareButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
    scrollContent: { padding: 16, paddingBottom: 40 }, // Added more bottom padding
    contentDisabled: { opacity: 0.5 },
    formSection: {
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 3,
    },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { color: COLORS.text, fontSize: 20, fontWeight: 'bold', marginLeft: 8 },
    routeContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    swapButton: { padding: 8, borderRadius: 100, backgroundColor: COLORS.primaryMuted },
    inputGroup: { flexDirection: 'row', gap: 16 },
    inputSection: { flex: 1 }, // This style is no longer used for spacing
    inputSectionHalf: { flex: 1 },
    label: { color: COLORS.textSecondary, fontSize: 15, fontWeight: '500', marginBottom: 8 },
    inputContainer: {
        backgroundColor: COLORS.background,
        flexDirection: 'row',
        alignItems: 'center',
        height: 52,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.separator,
    },
    errorBorder: { borderColor: COLORS.error, borderWidth: 1.5 },
    errorText: { color: COLORS.error, fontSize: 13, marginTop: 6 },
    inputText: { color: COLORS.text, fontSize: 16, flex: 1 },
    placeholderText: { color: COLORS.placeholder, fontSize: 16, flex: 1 },
    suggestionsContainer: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        marginTop: 8, // --- CHANGE: Increased spacing
        borderWidth: 1,
        borderColor: COLORS.separator,
        overflow: 'hidden',
  
    },
    suggestionItem: { padding: 14, flexDirection: 'row', alignItems: 'center' },
    flagStyle: { marginRight: 12, borderRadius: 3 },
    suggestionText: { color: COLORS.text, fontSize: 16 },
    spaceInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    spaceValueInput: { color: COLORS.text, fontSize: 16, flex: 1, height: '100%' },
    unitSelector: {
        flexDirection: 'row',
        backgroundColor: COLORS.background,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.separator,
    },
    unitButton: { paddingVertical: 15, paddingHorizontal: 22 },
    unitButtonSelected: { backgroundColor: COLORS.primaryMuted },
    unitButtonText: { color: COLORS.textSecondary, fontWeight: '600', fontSize: 16 },
    unitButtonTextSelected: { color: COLORS.primary },
    itemTypeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    itemTypeChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: COLORS.separator,
    },
    itemTypeChipSelected: {
        backgroundColor: COLORS.primaryMuted,
        borderColor: COLORS.primary,
    },
    itemTypeChipText: {
        color: COLORS.textSecondary,
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8,
    },
    itemTypeChipTextSelected: {
        color: COLORS.primary,
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        borderRadius: 10,
        padding: 12,
        marginTop: 16,
    },
    infoBoxText: {
        color: COLORS.textSecondary,
        fontSize: 13,
        marginLeft: 8,
        flex: 1,
    },
    assistanceContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    assistanceText: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: '500',
        flex: 1,
        marginRight: 16,
    },
    modalBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
    modalContent: {
        backgroundColor: COLORS.surface,
        borderRadius: 24,
        padding: 0,
        width: '90%',
        maxHeight: '70%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 10,
        overflow: 'hidden'
    },
    modalHeader: {
        padding: 20,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.separator
    },
    modalTitle: { color: COLORS.text, fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
    modalSearchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        borderRadius: 10,
        paddingHorizontal: 10,
        marginTop: 16,
    },
    modalSearchIcon: { marginRight: 8 },
    modalSearchInput: { flex: 1, height: 44, color: COLORS.text, fontSize: 16 },
    modalScrollView: { paddingHorizontal: 20 },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.separator,
        justifyContent: 'space-between',
    },
    dropdownItemText: {
        color: COLORS.text,
        fontSize: 16,
        marginLeft: 12,
        flex: 1,
    },
    dropdownItemSelected: {},
    dropdownItemSelectedText: {
        fontWeight: 'bold',
        color: COLORS.primary
    },
    bottomSubmitButton: {
        backgroundColor: COLORS.primary,
        height: 52,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16, // Space above the button
    },
    bottomSubmitButtonText: {
        color: COLORS.surface,
        fontSize: 18,
        fontWeight: 'bold',
    },
});