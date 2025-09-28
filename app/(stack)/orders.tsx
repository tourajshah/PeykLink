import { Ionicons } from '@expo/vector-icons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useMutation, useQuery } from 'convex/react';
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    LayoutAnimation,
    Platform,
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
    { name: "Electronics", icon: "laptop-mac" },
    { name: "Clothing", icon: "hanger" },
    { name: "Documents", icon: "file-document-outline" },
    { name: "Books", icon: "book-open-page-variant-outline" },
    { name: "Cosmetics", icon: "bottle-tonic-outline" },
    { name: "Other", icon: "shape-outline" },
];

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function RequestsScreen() {
    const router = useRouter();
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

    const [productName, setProductName] = useState('');
    const [productURL, setProductURL] = useState('');
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
        const fullText = `${city.name}, ${city.country}`;
        if (type === 'origin') {
            setOrigin(city); setOriginQuery(fullText);
            if (errors.origin) setErrors(prev => ({ ...prev, origin: '' }));
        } else {
            setDestination(city); setDestinationQuery(fullText);
            if (errors.destination) setErrors(prev => ({ ...prev, destination: '' }));
        }
        setSuggestions([]); setActiveSuggestionType(null); Keyboard.dismiss();
    };

    const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        setShowPicker(false);
        if (event.type === 'set' && selectedDate) { setRequiredByDate(selectedDate); }
    };

    const validateForm = () => {
        const newErrors: { [key: string]: string } = {};
        if (!productName) newErrors.productName = 'Product name is required.';
        if (!itemPrice) newErrors.itemPrice = 'Item price is required.';
        if (!travelerFee) newErrors.travelerFee = 'Traveler fee is required.';
        if (!origin) newErrors.origin = 'Please select a valid origin city.';
        if (!destination) newErrors.destination = 'Please select a valid destination city.';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        const isFormValid = validateForm();
        if (!isEditMode && !isFormValid) { return; }
        setIsSubmitting(true);
        try {
            const requestData = {
                productName, productURL,
                quantity: parseInt(quantity, 10),
                itemPrice: parseFloat(itemPrice),
                travelerFee: parseFloat(travelerFee),
                originCountry: origin!.country, originCity: origin!.name,
                destinationCountry: destination!.country, destinationCity: destination!.name,
                requiredByDate: requiredByDate.toISOString().split('T')[0],
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
                    requiredByDate: requiredByDate.toISOString().split('T')[0],
                });
                Alert.alert('Success!', 'Your request has been updated.');
            } else if (isDirectMode) {
                await createDirectRequestAndOffer({
                    ...requestData,
                    visibility: "direct",
                    targetedTravelerId: targetedTravelerId!,
                    tripId: targetedTripId!,
                });
                Alert.alert('Success!', 'Your direct offer has been sent.');
            } else {
                await createRequest({
                    ...requestData,
                    visibility: "public",
                    targetedTravelerId: undefined,
                });
                Alert.alert('Success!', 'Your request has been posted.');
            }
            router.back();
        } catch (error) {
            console.error('Failed to submit request:', error);
            Alert.alert('Error', `Could not ${isEditMode ? 'update' : 'post'} your request. Please try again.`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleItemTypeSelect = (item: string) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setSelectedItemTypes(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
    }

    if (isDirectMode && !tripData) {
        return (
            <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background}}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={{color: COLORS.text, marginTop: 10}}>Loading Trip Details...</Text>
            </View>
        )
    }

    const isFormComplete = productName && itemPrice && travelerFee && origin && destination;
    const headerTitle = isEditMode ? 'Edit Request' : isDirectMode ? 'Direct Request' : 'New Request';
    const submitButtonText = isEditMode ? 'Save Changes' : isDirectMode ? 'Send Request' : 'Post Request';

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.headerAction} onPress={() => router.back()} disabled={isSubmitting}>
                    <Ionicons name="chevron-back" size={32} color={isSubmitting ? COLORS.disabled : COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{headerTitle}</Text>
                <View style={styles.headerAction}>
                    <TouchableOpacity
                        style={[styles.shareButton, (!isFormComplete && !isEditMode || isSubmitting) && styles.shareButtonDisabled]}
                        disabled={(!isFormComplete && !isEditMode) || isSubmitting}
                        onPress={handleSubmit}>
                        {isSubmitting ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.shareButtonText}>{isEditMode ? 'Save' : 'Post'}</Text>}
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <View style={isSubmitting && styles.contentDisabled}>
                    
                    {isDirectMode && tripData?.traveler && (
                        <View style={styles.travelerInfoCard}>
                            <Image source={tripData.traveler.image } style={styles.travelerAvatar} />
                            <View>
                                <Text style={styles.travelerInfoLabel}>Sending Direct Request to:</Text>
                                <Text style={styles.travelerInfoName}>{tripData.traveler.username}</Text>
                            </View>
                        </View>
                    )}

                    <View style={styles.formSection}>
                        <View style={styles.sectionHeader}>
                            <MaterialCommunityIcons name="cube-outline" size={24} color={COLORS.primary} />
                            <Text style={styles.sectionTitle}>Product Details</Text>
                        </View>
                        <View style={{ gap: 16 }}>
                            <View>
                                <Text style={styles.label}>Product Name <Text style={{color: COLORS.error}}>*</Text></Text>
                                <View style={[styles.inputContainer, !!errors.productName && styles.errorBorder]}>
                                    <TextInput style={styles.inputText} placeholder="e.g., iPhone 15 Pro" placeholderTextColor={COLORS.placeholder} value={productName} onChangeText={setProductName} editable={!isEditMode} />
                                </View>
                                {errors.productName && <Text style={styles.errorText}>{errors.productName}</Text>}
                            </View>
                            <View>
                                <Text style={styles.label}>Product URL (Optional)</Text>
                                <View style={styles.inputContainer}>
                                    <TextInput style={styles.inputText} placeholder="https://apple.com/iphone" placeholderTextColor={COLORS.placeholder} value={productURL} onChangeText={setProductURL} />
                                </View>
                            </View>
                        </View>
                    </View>

                    <View style={styles.formSection}>
                        <View style={styles.sectionHeader}>
                            <MaterialCommunityIcons name="map-marker-path" size={24} color={COLORS.primary} />
                            <Text style={styles.sectionTitle}>Shipping Route</Text>
                        </View>
                        <View style={{ gap: 16 }}>
                            <View>
                                <Text style={styles.label}>Deliver From (Origin) <Text style={{color: COLORS.error}}>*</Text></Text>
                                <View style={[styles.inputContainer, !!errors.origin && styles.errorBorder, (isDirectMode || isEditMode) && styles.inputContainerDisabled]}>
                                    <TextInput style={[styles.inputText, (isDirectMode || isEditMode) && styles.inputTextDisabled]} placeholder="Select origin city" placeholderTextColor={COLORS.placeholder} value={originQuery} onChangeText={(text) => handleSearchChange(text, 'origin')} editable={!isEditMode && !isDirectMode} />
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
                                {errors.origin && <Text style={styles.errorText}>{errors.origin}</Text>}
                            </View>
                            <View>
                                <Text style={styles.label}>Deliver To (Destination) <Text style={{color: COLORS.error}}>*</Text></Text>
                                <View style={[styles.inputContainer, !!errors.destination && styles.errorBorder, (isDirectMode || isEditMode) && styles.inputContainerDisabled]}>
                                    <TextInput style={[styles.inputText, (isDirectMode || isEditMode) && styles.inputTextDisabled]} placeholder="Select destination city" placeholderTextColor={COLORS.placeholder} value={destinationQuery} onChangeText={(text) => handleSearchChange(text, 'destination')} editable={!isEditMode && !isDirectMode} />
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
                                {errors.destination && <Text style={styles.errorText}>{errors.destination}</Text>}
                            </View>
                            <View>
                                <Text style={styles.label}>Required By Date</Text>
                                <TouchableOpacity style={[styles.inputContainer, isDirectMode && styles.inputContainerDisabled]} onPress={() => setShowPicker(true)} disabled={isDirectMode}>
                                    <Text style={[styles.inputText, isDirectMode && styles.inputTextDisabled]}>{requiredByDate.toLocaleDateString()}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    <View style={styles.formSection}>
                         <View style={styles.sectionHeader}>
                            <MaterialCommunityIcons name="cash-multiple" size={24} color={COLORS.primary} />
                            <Text style={styles.sectionTitle}>Pricing ($)</Text>
                        </View>
                        <View style={styles.inputGroup}>
                            <View style={styles.inputSectionHalf}>
                                <Text style={styles.label}>Item Price <Text style={{color: COLORS.error}}>*</Text></Text>
                                <View style={[styles.inputContainer, !!errors.itemPrice && styles.errorBorder]}>
                                    <TextInput style={styles.inputText} placeholder="e.g., 999" placeholderTextColor={COLORS.placeholder} value={itemPrice} onChangeText={setItemPrice} keyboardType="numeric" editable={!isEditMode} />
                                </View>
                                {errors.itemPrice && <Text style={styles.errorText}>{errors.itemPrice}</Text>}
                            </View>
                            <View style={styles.inputSectionHalf}>
                                <Text style={styles.label}>Quantity</Text>
                                <View style={styles.inputContainer}>
                                    <TextInput style={styles.inputText} value={quantity} onChangeText={setQuantity} keyboardType="numeric" />
                                </View>
                            </View>
                        </View>
                        <View style={{marginTop: 16}}>
                            <Text style={styles.label}>Traveler Fee (Reward) <Text style={{color: COLORS.error}}>*</Text></Text>
                            <View style={[styles.inputContainer, !!errors.travelerFee && styles.errorBorder]}>
                                <TextInput style={styles.inputText} placeholder="e.g., 50" placeholderTextColor={COLORS.placeholder} value={travelerFee} onChangeText={setTravelerFee} keyboardType="numeric" />
                            </View>
                            {errors.travelerFee && <Text style={styles.errorText}>{errors.travelerFee}</Text>}
                        </View>
                    </View>
                    
                    <View style={styles.formSection}>
                        <View style={styles.sectionHeader}>
                            <MaterialCommunityIcons name="ruler-square" size={24} color={COLORS.primary} />
                            <Text style={styles.sectionTitle}>Item Specifications</Text>
                        </View>
                        <Text style={styles.label}>Approx. Weight (Optional)</Text>
                        <View style={styles.spaceInputRow}>
                            <View style={[styles.inputContainer, { flex: 1 }]}>
                                <TextInput style={styles.inputText} placeholder="e.g., 200" placeholderTextColor={COLORS.placeholder} value={productWeight} onChangeText={setProductWeight} keyboardType="numeric" editable={!isEditMode} />
                            </View>
                            <View style={styles.unitSelector}>
                                <TouchableOpacity style={[styles.unitButton, weightUnit === 'gr' && styles.unitButtonSelected]} onPress={() => setWeightUnit('gr')} disabled={isEditMode}><Text style={[styles.unitButtonText, weightUnit === 'gr' && styles.unitButtonTextSelected]}>gr</Text></TouchableOpacity>
                                <TouchableOpacity style={[styles.unitButton, weightUnit === 'kg' && styles.unitButtonSelected]} onPress={() => setWeightUnit('kg')} disabled={isEditMode}><Text style={[styles.unitButtonText, weightUnit === 'kg' && styles.unitButtonTextSelected]}>kg</Text></TouchableOpacity>
                            </View>
                        </View>
                        
                        <Text style={[styles.label, {marginTop: 16}]}>Category (Optional)</Text>
                        <View style={styles.itemTypeGrid}>
                             {itemTypesData.map(item => (
                                <TouchableOpacity
                                    key={item.name}
                                    style={[styles.itemTypeChip, selectedItemTypes.includes(item.name) && styles.itemTypeChipSelected]}
                                    onPress={() => handleItemTypeSelect(item.name)}
                                    disabled={isEditMode}
                                >
                                    <MaterialCommunityIcons name={item.icon as any} size={24} color={selectedItemTypes.includes(item.name) ? COLORS.primary : COLORS.textSecondary} />
                                    <Text style={[styles.itemTypeChipText, selectedItemTypes.includes(item.name) && styles.itemTypeChipTextSelected]}>{item.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                         <Text style={[styles.label, {marginTop: 16}]}>Additional Notes (Optional)</Text>
                         <TextInput style={styles.captionInput} placeholder="Add color, size, or other details..." placeholderTextColor={COLORS.placeholder} multiline value={description} onChangeText={setDescription} />
                    </View>

                </View>
                
                <TouchableOpacity
                    style={[styles.bottomSubmitButton, (!isFormComplete && !isEditMode || isSubmitting) && styles.shareButtonDisabled]}
                    disabled={(!isFormComplete && !isEditMode) || isSubmitting}
                    onPress={handleSubmit}>
                    {isSubmitting ? <ActivityIndicator size="small" color={COLORS.surface} /> : <Text style={styles.bottomSubmitButtonText}>{submitButtonText}</Text>}
                </TouchableOpacity>

            </ScrollView>

            {showPicker && (<DateTimePicker mode="date" display="spinner" value={requiredByDate} onChange={onDateChange} minimumDate={new Date()} maximumDate={isDirectMode && tripData ? new Date(tripData.arrivalDate) : undefined} />)}
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: {
        backgroundColor: COLORS.surface,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 50 : 20,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.separator,
    },
    headerAction: {
        minWidth: 80,
        justifyContent: 'center'
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
        alignSelf: 'flex-end',
    },
    shareButtonDisabled: { backgroundColor: COLORS.disabled },
    shareButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
    scrollContent: { padding: 16, paddingBottom: 40 },
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
    inputContainerDisabled: {
        backgroundColor: COLORS.separator,
    },
    inputTextDisabled: {
        color: COLORS.textSecondary,
    },
    errorBorder: { borderColor: COLORS.error, borderWidth: 1.5 },
    errorText: { color: COLORS.error, fontSize: 13, marginTop: 6 },
    inputText: { color: COLORS.text, fontSize: 16, flex: 1 },
    placeholderText: { color: COLORS.placeholder, fontSize: 16, flex: 1 },
    suggestionsContainer: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        marginTop: 8,
        borderWidth: 1,
        borderColor: COLORS.separator,
        overflow: 'hidden',
        position: 'absolute',
        top: 54,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    suggestionItem: { padding: 14, flexDirection: 'row', alignItems: 'center' },
    flagStyle: { marginRight: 12, borderRadius: 3 },
    suggestionText: { color: COLORS.text, fontSize: 16 },
    inputGroup: { flexDirection: 'row', gap: 16 },
    inputSectionHalf: { flex: 1 },
    spaceInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
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
    captionInput: {
        backgroundColor: COLORS.background,
        color: COLORS.text,
        padding: 16,
        borderRadius: 12,
        fontSize: 16,
        minHeight: 100,
        textAlignVertical: 'top',
        borderWidth: 1,
        borderColor: COLORS.separator,
    },
    bottomSubmitButton: {
        backgroundColor: COLORS.primary,
        height: 52,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16,
    },
    bottomSubmitButtonText: {
        color: COLORS.surface,
        fontSize: 18,
        fontWeight: 'bold',
    },
    travelerInfoCard: {
        backgroundColor: COLORS.primaryMuted,
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.primary,
    },
    travelerAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        marginRight: 12,
        backgroundColor: COLORS.disabled,
    },
    travelerInfoLabel: {
        color: COLORS.textSecondary,
        fontSize: 13,
        fontWeight: '500',
    },
    travelerInfoName: {
        color: COLORS.primary,
        fontSize: 17,
        fontWeight: 'bold',
    },
});