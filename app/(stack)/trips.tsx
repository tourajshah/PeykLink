import { Ionicons } from '@expo/vector-icons';
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
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

import { Airline, airlineData } from '@/constants/airlineData';
import { City, cityData } from '@/constants/cityData';
import { api } from '@/convex/_generated/api';

const COLORS = {
    primary: '#0A84FF',
    primaryMuted: 'rgba(10, 132, 255, 0.2)',
    background: '#000000',
    contentBackground: '#1C1C1E',
    contentBackgroundLighter: '#2C2C2E',
    text: '#FFFFFF',
    textSecondary: '#AEAEB2',
    placeholder: '#636366',
    separator: '#38383A',
    disabled: '#4A4A4E',
    error: '#FF453A',
};

const itemTypes = ["Electronics", "Clothing", "Documents", "Books", "Cosmetics", "Other"];
const MAX_KG = 100;
const MAX_GR = 100000;
const isInitialMount = useRef(true);


function getFlagEmoji(countryCode: string): string {
    if (!countryCode || countryCode.length !== 2) return '🏳️';
    const codePoints = countryCode.toUpperCase().split('').map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
}

export default function TripsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const existingTrip = useMemo(() => params.trip ? JSON.parse(params.trip as string) : null, [params.trip]);
    const isEditMode = existingTrip !== null;

    // --- State Management ---
    const [origin, setOrigin] = useState<City | null>(null);
    const [destination, setDestination] = useState<City | null>(null);
    const [date, setDate] = useState(new Date());
    const [availableSpaceValue, setAvailableSpaceValue] = useState('');
    const [availableSpaceUnit, setAvailableSpaceUnit] = useState('kg');
    const [acceptedItemTypes, setAcceptedItemTypes] = useState<string[]>([]);
    const [caption, setCaption] = useState('');
    const [airline, setAirline] = useState<Airline | null>(null);
    const [airlineSearch, setAirlineSearch] = useState('');
    const [originQuery, setOriginQuery] = useState('');
    const [destinationQuery, setDestinationQuery] = useState('');
    const [suggestions, setSuggestions] = useState<City[]>([]);
    const [activeSuggestionType, setActiveSuggestionType] = useState<'origin' | 'destination' | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [itemModalVisible, setItemModalVisible] = useState(false);
    const [airlineModalVisible, setAirlineModalVisible] = useState(false);
    
    // --- Validation Change: State to hold specific field errors ---
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        if (isEditMode && existingTrip) {
            const originCity = existingTrip.originCity ? { name: existingTrip.originCity, country: existingTrip.originCountry, countryCode: existingTrip.originCountryCode } : null;
            const destCity = existingTrip.destinationCity ? { name: existingTrip.destinationCity, country: existingTrip.destinationCountry, countryCode: existingTrip.destinationCountryCode } : null;
            setOrigin(originCity);
            setDestination(destCity);
            setOriginQuery(originCity ? `${originCity.name}, ${originCity.country}` : '');
            setDestinationQuery(destCity ? `${destCity.name}, ${destCity.country}` : '');
            setDate(new Date(existingTrip.arrivalDate));
            setCaption(existingTrip.description || '');
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
    
    // --- Validation Change: Re-validate space when unit changes ---
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
        } else {
            // This now only runs AFTER the first render, when the user actually changes the unit
            handleAvailableSpaceChange(availableSpaceValue);
        }
    }, [availableSpaceUnit]);

    const createTrip = useMutation(api.trips.createTrip);
    const updateTrip = useMutation(api.trips.updateTrip);

    const handleSearchChange = (text: string, type: 'origin' | 'destination') => {
        if (type === 'origin') {
            setOriginQuery(text);
            setOrigin(null);
            if (errors.origin) setErrors(prev => ({ ...prev, origin: '' }));
        } else {
            setDestinationQuery(text);
            setDestination(null);
            if (errors.destination) setErrors(prev => ({ ...prev, destination: '' }));
        }

        setActiveSuggestionType(type);
        if (text.length > 1) {
            const filtered = cityData.filter(city =>
                city.name.toLowerCase().includes(text.toLowerCase()) ||
                city.country.toLowerCase().includes(text.toLowerCase())
            // --- UI Change: Showing fewer suggestions to prevent overlap issues ---
            ).slice(0, 3);
            setSuggestions(filtered);
        } else {
            setSuggestions([]);
        }
    };

    const onSelectCity = (city: City, type: 'origin' | 'destination') => {
        const fullText = `${city.name}, ${city.country}`;
        if (type === 'origin') {
            setOrigin(city);
            setOriginQuery(fullText);
            if (errors.origin) setErrors(prev => ({ ...prev, origin: '' }));
        } else {
            setDestination(city);
            setDestinationQuery(fullText);
            if (errors.destination) setErrors(prev => ({ ...prev, destination: '' }));
        }
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
    
    // --- Validation Change: New function to handle space input with limits ---
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

    // --- Validation Change: Central validation logic ---
    const validateForm = () => {
        const newErrors: { [key: string]: string } = {};
        if (!origin) newErrors.origin = 'Please select a valid origin city from the list.';
        if (!destination) newErrors.destination = 'Please select a valid destination city from the list.';
        if (!availableSpaceValue) newErrors.availableSpace = 'Available space is required.';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };


    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }
        
        setIsSubmitting(true);
        try {
            if (isEditMode) {
                await updateTrip({
                    tripId: existingTrip._id,
                    availableSpace: `${availableSpaceValue} ${availableSpaceUnit}`,
                    description: caption,
                    acceptedItemTypes: acceptedItemTypes.join(', '),
                    airline: airline?.name,
                });
                Alert.alert('Success!', 'Your trip has been updated.');
            } else {
                await createTrip({
                    originCity: origin!.name,
                    originCountry: origin!.country,
                    // originCountryCode: origin!.countryCode,
                    destinationCity: destination!.name,
                    destinationCountry: destination!.country,
                    // destinationCountryCode: destination!.countryCode,
                    arrivalDate: date.toISOString().split('T')[0],
                    availableSpace: `${availableSpaceValue} ${availableSpaceUnit}`,
                    acceptedItemTypes: acceptedItemTypes.join(', '),
                    description: caption,
                    airline: airline?.name,
                });
                Alert.alert('Success!', 'Your trip has been shared.');
            }
            router.back();
        } catch (error) {
            console.error(`Failed to ${isEditMode ? 'update' : 'create'} trip:`, error);
            Alert.alert('Error', `Could not ${isEditMode ? 'update' : 'share'} your trip. Please try again.`);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const filteredAirlines = airlineData.filter(item => 
        item.name.toLowerCase().includes(airlineSearch.toLowerCase())
    );

    const isFormComplete = origin && destination && availableSpaceValue;
    const headerTitle = isEditMode ? 'Edit Trip' : 'Share a New Trip';
    const submitButtonText = isEditMode ? 'Save Changes' : 'Share Trip';

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} disabled={isSubmitting}>
                    <Ionicons name="close-outline" size={32} color={isSubmitting ? COLORS.disabled : COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{headerTitle}</Text>
                <TouchableOpacity
                    style={[styles.shareButton, (!isFormComplete || isSubmitting) && styles.shareButtonDisabled]}
                    disabled={!isFormComplete || isSubmitting}
                    onPress={handleSubmit}>
                    {isSubmitting ? <ActivityIndicator size="small" color={COLORS.text} /> : <Text style={styles.shareButtonText}>{submitButtonText}</Text>}
                </TouchableOpacity>
            </View>
            
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View style={isSubmitting && styles.contentDisabled}>
                    <View style={styles.locationContainer}>
                        <View style={{ flex: 1 }}>
                            <View style={styles.inputSection}>
                                <Text style={styles.label}>From <Text style={{ color: COLORS.error }}>*</Text></Text>
                                <View style={[styles.inputContainer, !!errors.origin && styles.errorBorder]}>
                                    <MaterialCommunityIcons name="airplane-takeoff" size={22} color={COLORS.textSecondary} style={styles.inputIcon} />
                                    <TextInput
                                        placeholder="Origin city"
                                        placeholderTextColor={COLORS.placeholder}
                                        value={originQuery}
                                        onChangeText={(text) => handleSearchChange(text, 'origin')}
                                        style={styles.inputText}
                                        onFocus={() => { setSuggestions([]); setActiveSuggestionType('origin'); }}
                                        onBlur={() => { if (!origin) setErrors(prev => ({...prev, origin: 'Please select a valid city from the list.'})) }}
                                        editable={!isEditMode}
                                    />
                                </View>
                                {errors.origin && <Text style={styles.errorText}>{errors.origin}</Text>}
                                {activeSuggestionType === 'origin' && suggestions.length > 0 && (
                                    <View style={styles.suggestionsContainer}>
                                        {suggestions.map((item) => (
                                            <TouchableOpacity key={item.name + item.countryCode} style={styles.suggestionItem} onPress={() => onSelectCity(item, 'origin')}>
                                                <Text style={styles.suggestionText}>{getFlagEmoji(item.countryCode)} {item.name}, {item.country}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>

                            <View style={styles.inputSection}>
                                <Text style={styles.label}>To <Text style={{ color: COLORS.error }}>*</Text></Text>
                                <View style={[styles.inputContainer, !!errors.destination && styles.errorBorder]}>
                                    <MaterialCommunityIcons name="airplane-landing" size={22} color={COLORS.textSecondary} style={styles.inputIcon} />
                                    <TextInput
                                        placeholder="Destination city"
                                        placeholderTextColor={COLORS.placeholder}
                                        value={destinationQuery}
                                        onChangeText={(text) => handleSearchChange(text, 'destination')}
                                        style={styles.inputText}
                                        onFocus={() => { setSuggestions([]); setActiveSuggestionType('destination'); }}
                                        onBlur={() => { if (!destination) setErrors(prev => ({...prev, destination: 'Please select a valid city from the list.'})) }}
                                        editable={!isEditMode}
                                    />
                                </View>
                                {errors.destination && <Text style={styles.errorText}>{errors.destination}</Text>}
                                {activeSuggestionType === 'destination' && suggestions.length > 0 && (
                                    <View style={styles.suggestionsContainer}>
                                        {suggestions.map((item) => (
                                            <TouchableOpacity key={item.name + item.countryCode} style={styles.suggestionItem} onPress={() => onSelectCity(item, 'destination')}>
                                                <Text style={styles.suggestionText}>{getFlagEmoji(item.countryCode)} {item.name}, {item.country}</Text>
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

                    <View style={styles.inputGroup}>
                        <View style={styles.inputSectionHalf}>
                            <Text style={styles.label}>Arrival Date <Text style={{ color: COLORS.error }}>*</Text></Text>
                            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.inputContainer} disabled={isEditMode}>
                                <Ionicons name="calendar-outline" size={22} color={COLORS.textSecondary} style={styles.inputIcon} />
                                <Text style={styles.inputText}>{date.toLocaleDateString()}</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.inputSectionHalf}>
                            <Text style={styles.label}>Airline</Text>
                            <TouchableOpacity onPress={() => setAirlineModalVisible(true)} style={styles.inputContainer}>
                                <Ionicons name="paper-plane-outline" size={22} color={COLORS.textSecondary} style={styles.inputIcon} />
                                <Text style={airline ? styles.inputText : styles.placeholderText} numberOfLines={1}>
                                    {airline?.name ?? 'Select Airline'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.inputSection}>
                        <Text style={styles.label}>Available Space <Text style={{ color: COLORS.error }}>*</Text></Text>
                        <View style={styles.spaceInputRow}>
                            <View style={[styles.inputContainer, { flex: 1 }, !!errors.availableSpace && styles.errorBorder]}>
                                <Ionicons name="cube-outline" size={22} color={COLORS.textSecondary} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.spaceValueInput}
                                    placeholder="e.g., 5"
                                    placeholderTextColor={COLORS.placeholder}
                                    value={availableSpaceValue}
                                    onChangeText={handleAvailableSpaceChange}
                                    keyboardType="numeric"
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

                    <View style={styles.inputSection}>
                        <Text style={styles.label}>Accepted Item Types</Text>
                        <TouchableOpacity onPress={() => setItemModalVisible(true)} style={styles.inputContainer}>
                            <Ionicons name="file-tray-stacked-outline" size={22} color={COLORS.textSecondary} style={styles.inputIcon} />
                            <Text style={acceptedItemTypes.length > 0 ? styles.inputText : styles.placeholderText} numberOfLines={1} ellipsizeMode="tail">
                                {acceptedItemTypes.length > 0 ? acceptedItemTypes.join(', ') : 'Select item types'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.inputSection}>
                        <Text style={styles.label}>Caption / Description (Optional)</Text>
                        <TextInput
                            style={styles.captionInput}
                            placeholder="Add more details about your trip..."
                            placeholderTextColor={COLORS.placeholder}
                            multiline value={caption} onChangeText={setCaption}
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.bottomSubmitButton, (!isFormComplete || isSubmitting) && styles.shareButtonDisabled]}
                        disabled={!isFormComplete || isSubmitting}
                        onPress={handleSubmit}>
                        {isSubmitting ? <ActivityIndicator size="small" color={COLORS.text} /> : <Text style={styles.shareButtonText}>{submitButtonText}</Text>}
                    </TouchableOpacity>

                </View>
            </ScrollView>

            {showDatePicker && (
                <DateTimePicker
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    value={date}
                    onChange={onDateChange}
                    minimumDate={new Date()}
                    themeVariant="dark" // For better dark mode integration
                />
            )}
            
            {/* --- Modals with Improved Styling --- */}
            <Modal animationType="fade" transparent={true} visible={itemModalVisible} onRequestClose={() => setItemModalVisible(false)}>
                <Pressable style={styles.modalBackdrop} onPress={() => setItemModalVisible(false)}>
                    <Pressable style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select Item Types</Text>
                        {itemTypes.map(item => (
                            <TouchableOpacity key={item}
                                style={styles.dropdownItem}
                                onPress={() => setAcceptedItemTypes(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item])}>
                                <Ionicons name={acceptedItemTypes.includes(item) ? "checkbox" : "square-outline"} size={22} color={acceptedItemTypes.includes(item) ? COLORS.primary : COLORS.textSecondary} />
                                <Text style={styles.dropdownItemText}>{item}</Text>
                            </TouchableOpacity>
                        ))}
                    </Pressable>
                </Pressable>
            </Modal>
            
            {/* --- UI/UX Revamp: Airline Modal with Search Functionality --- */}
            <Modal animationType="fade" transparent={true} visible={airlineModalVisible} onRequestClose={() => setAirlineModalVisible(false)}>
                <Pressable style={styles.modalBackdrop} onPress={() => setAirlineModalVisible(false)}>
                    <Pressable style={styles.modalContent}>
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
                        <ScrollView style={styles.modalScrollView}>
                            {filteredAirlines.map(item => (
                                <TouchableOpacity key={item.name}
                                    style={[styles.dropdownItem, airline?.name === item.name && styles.dropdownItemSelected]}
                                    onPress={() => { setAirline(item); setAirlineModalVisible(false); setAirlineSearch(''); }}>
                                    <Text style={[styles.dropdownItemText, airline?.name === item.name && styles.dropdownItemSelectedText]}>{item.name}</Text>
                                    {airline?.name === item.name && <Ionicons name="checkmark" size={20} color={COLORS.text}/>}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

        </KeyboardAvoidingView>
    );
}

// --- UI/UX Revamp: Refined StyleSheet for a Cohesive and Modern Design ---
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background, paddingTop: Platform.OS === 'ios' ? 50 : 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.separator },
    headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: '600' },
    shareButton: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    shareButtonDisabled: { backgroundColor: COLORS.disabled },
    shareButtonText: { color: COLORS.text, fontWeight: 'bold', fontSize: 16 },
    scrollContent: { paddingHorizontal: 16, paddingVertical: 24, paddingBottom: 40 },
    contentDisabled: { opacity: 0.5 },
    locationContainer: { flexDirection: 'row', alignItems: 'center' }, // Removed zIndex
    swapButton: { padding: 8, marginLeft: 8, alignSelf: 'center', marginTop: 16 },
    inputGroup: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
    inputSection: { marginBottom: 20, flex: 1 },
    inputSectionHalf: { flex: 1, marginBottom: 20 },
    label: { color: COLORS.textSecondary, fontSize: 15, fontWeight: '500', marginBottom: 8, paddingLeft: 4 },
    inputContainer: { backgroundColor: COLORS.contentBackground, flexDirection: 'row', alignItems: 'center', height: 52, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: 'transparent' },
    errorBorder: { borderColor: COLORS.error },
    errorText: { color: COLORS.error, fontSize: 13, marginTop: 6, paddingLeft: 4 },
    inputIcon: { marginRight: 10 },
    inputText: { color: COLORS.text, fontSize: 16, flex: 1 },
    placeholderText: { color: COLORS.placeholder, fontSize: 16, flex: 1 },
    // --- UI Change: Suggestions now push content down ---
    suggestionsContainer: {
        backgroundColor: COLORS.contentBackgroundLighter,
        borderRadius: 12,
        marginTop: 4,
        borderWidth: 1,
        borderColor: COLORS.separator,
    },
    suggestionItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: COLORS.separator },
    suggestionText: { color: COLORS.text, fontSize: 16 },
    spaceInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    spaceValueInput: { color: COLORS.text, fontSize: 16, flex: 1, height: '100%' },
    unitSelector: { flexDirection: 'row', backgroundColor: COLORS.contentBackground, borderRadius: 12, overflow: 'hidden' },
    unitButton: { paddingVertical: 15, paddingHorizontal: 22 },
    unitButtonSelected: { backgroundColor: COLORS.primary },
    unitButtonText: { color: COLORS.textSecondary, fontWeight: '600', fontSize: 16 },
    unitButtonTextSelected: { color: COLORS.text },
    captionInput: { backgroundColor: COLORS.contentBackground, color: COLORS.text, padding: 15, borderRadius: 12, fontSize: 16, minHeight: 120, textAlignVertical: 'top' },
    bottomSubmitButton: { backgroundColor: COLORS.primary, height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
    // --- Modal Styles ---
    modalBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' },
    modalContent: { backgroundColor: COLORS.contentBackgroundLighter, borderRadius: 14, padding: 20, width: '90%', maxHeight: '70%', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
    modalTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
    modalSearchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.contentBackground, borderRadius: 10, paddingHorizontal: 10, marginBottom: 12 },
    modalSearchIcon: { marginRight: 8 },
    modalSearchInput: { flex: 1, height: 44, color: COLORS.text, fontSize: 16 },
    modalScrollView: { flexShrink: 1 },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
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
    dropdownItemSelected: { backgroundColor: COLORS.primaryMuted, borderRadius: 8, paddingHorizontal: 12, marginHorizontal: -12, },
    dropdownItemSelectedText: { fontWeight: '600', color: COLORS.text },
});