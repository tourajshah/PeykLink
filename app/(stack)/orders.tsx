import { Ionicons } from '@expo/vector-icons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useMutation } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
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

const requestItemTypes = ["Electronics", "Clothing", "Documents", "Books", "Cosmetics", "Other"];

function getFlagEmoji(countryCode: string): string {
    if (!countryCode || countryCode.length !== 2) return '🏳️';
    const codePoints = countryCode.toUpperCase().split('').map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
}

// A simple separator component for visual grouping
const FormSeparator = () => <View style={styles.separator} />;

export default function RequestsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const existingRequest = useMemo(() => params.request ? JSON.parse(params.request as string) : null, [params.request]);
    const isEditMode = existingRequest !== null;

    // --- Form State ---
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

    // --- UI Control State ---
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPicker, setShowPicker] = useState(false);
    const [itemTypeModalOpen, setItemTypeModalOpen] = useState(false);
    const [originQuery, setOriginQuery] = useState('');
    const [destinationQuery, setDestinationQuery] = useState('');
    const [suggestions, setSuggestions] = useState<City[]>([]);
    const [activeSuggestionType, setActiveSuggestionType] = useState<'origin' | 'destination' | null>(null);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        // Data population logic for edit mode
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

    const createRequest = useMutation(api.requests.createRequest);
    const updateRequest = useMutation(api.requests.updateRequest);

    // Generic handler to validate a field on blur
    const handleBlur = (field: string, value: any, message: string) => {
        if (!value) {
            setErrors(prev => ({ ...prev, [field]: message }));
        }
    };

    // Generic handler to clear error on change
    const handleChangeText = (field: string, text: string, setter: (text: string) => void) => {
        setter(text);
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const handleSearchChange = (text: string, type: 'origin' | 'destination') => {
        if (type === 'origin') {
            setOriginQuery(text); setOrigin(null);
            if (errors.origin) setErrors(prev => ({ ...prev, origin: '' }));
        } else {
            setDestinationQuery(text); setDestination(null);
            if (errors.destination) setErrors(prev => ({ ...prev, destination: '' }));
        }
        setActiveSuggestionType(type);
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

    const handleSubmit = async () => {
        const isFormValid = validateForm();
        if (!isEditMode && !isFormValid) { return; }

        setIsSubmitting(true);
        try {
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
            } else {
                await createRequest({
                    productName,
                    productURL,
                    quantity: parseInt(quantity, 10),
                    itemPrice: parseFloat(itemPrice),
                    travelerFee: parseFloat(travelerFee),
                    originCountry: origin!.country,
                    originCity: origin!.name,
                    // originCountryCode: origin!.countryCode,
                    destinationCountry: destination!.country,
                    destinationCity: destination!.name,
                    // destinationCountryCode: destination!.countryCode,
                    requiredByDate: requiredByDate.toISOString().split('T')[0],
                    productWeight: `${productWeight} ${weightUnit}`,
                    itemTypes: selectedItemTypes.join(', '),
                    description,
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

    const isFormComplete = productName && itemPrice && travelerFee && origin && destination;
    const headerTitle = isEditMode ? 'Edit Request' : 'New Request';
    const submitButtonText = isEditMode ? 'Save Changes' : 'Post Request';

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} disabled={isSubmitting}><Ionicons name="close-outline" size={32} color={isSubmitting ? COLORS.disabled : COLORS.text} /></TouchableOpacity>
                <Text style={styles.headerTitle}>{headerTitle}</Text>
                <TouchableOpacity style={[styles.shareButton, (!isFormComplete && !isEditMode || isSubmitting) && styles.shareButtonDisabled]} disabled={(!isFormComplete && !isEditMode) || isSubmitting} onPress={handleSubmit}>
                    {isSubmitting ? <ActivityIndicator size="small" color={COLORS.text} /> : <Text style={styles.shareButtonText}>{submitButtonText}</Text>}
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <View style={[styles.content, isSubmitting && styles.contentDisabled]}>

                    <View style={styles.inputSection}>
                        <Text style={styles.label}>Shipping Details</Text>
                        <View>
                            <Text style={styles.subLabel}>Origin <Text style={styles.asterisk}>*</Text></Text>
                            <View style={[styles.inputContainer, !!errors.origin && styles.errorBorder]}>
                                <MaterialCommunityIcons name="airplane-takeoff" size={22} color={COLORS.textSecondary} style={styles.inputIcon} />
                                <TextInput style={styles.inputText} placeholder="Select origin city" placeholderTextColor={COLORS.placeholder} value={originQuery} onChangeText={(text) => handleSearchChange(text, 'origin')} onFocus={() => setActiveSuggestionType('origin')} onBlur={() => handleBlur('origin', origin, 'Please select a valid origin city.')} editable={!isEditMode} />
                            </View>
                            {errors.origin && <Text style={styles.errorText}>{errors.origin}</Text>}
                            {activeSuggestionType === 'origin' && suggestions.length > 0 && (
                                <View style={styles.suggestionsContainer}>{suggestions.map(s => <TouchableOpacity key={s.name + s.countryCode} onPress={() => onSelectCity(s, 'origin')} style={styles.suggestionItem}><Text style={styles.suggestionText}>{getFlagEmoji(s.countryCode)} {s.name}, {s.country}</Text></TouchableOpacity>)}</View>
                            )}
                        </View>
                        <View>
                            <Text style={styles.subLabel}>Destination <Text style={styles.asterisk}>*</Text></Text>
                            <View style={[styles.inputContainer, !!errors.destination && styles.errorBorder]}>
                                <MaterialCommunityIcons name="airplane-landing" size={22} color={COLORS.textSecondary} style={styles.inputIcon} />
                                <TextInput style={styles.inputText} placeholder="Select destination city" placeholderTextColor={COLORS.placeholder} value={destinationQuery} onChangeText={(text) => handleSearchChange(text, 'destination')} onFocus={() => setActiveSuggestionType('destination')} onBlur={() => handleBlur('destination', destination, 'Please select a valid destination city.')} editable={!isEditMode} />
                            </View>
                            {errors.destination && <Text style={styles.errorText}>{errors.destination}</Text>}
                            {activeSuggestionType === 'destination' && suggestions.length > 0 && (
                                <View style={styles.suggestionsContainer}>{suggestions.map(s => <TouchableOpacity key={s.name + s.countryCode} onPress={() => onSelectCity(s, 'destination')} style={styles.suggestionItem}><Text style={styles.suggestionText}>{getFlagEmoji(s.countryCode)} {s.name}, {s.country}</Text></TouchableOpacity>)}</View>
                            )}
                        </View>
                        <Text style={styles.subLabel}>Required By Date</Text>
                        <TouchableOpacity style={styles.inputContainer} onPress={() => setShowPicker(true)}>
                            <Ionicons name="calendar-outline" size={22} color={COLORS.textSecondary} style={styles.inputIcon} />
                            <Text style={styles.inputText}>{requiredByDate.toLocaleDateString()}</Text>
                        </TouchableOpacity>
                    </View>

                    <FormSeparator />

                    <View style={styles.inputSection}>
                        <Text style={styles.label}>Product Details</Text>
                        <View>
                            <Text style={styles.subLabel}>Product Name <Text style={styles.asterisk}>*</Text></Text>
                            <View style={[styles.inputContainer, !!errors.productName && styles.errorBorder]}>
                                <Ionicons name="cube-outline" size={22} color={COLORS.textSecondary} style={styles.inputIcon} />
                                <TextInput style={styles.inputText} placeholder="e.g., iPhone 15 Pro" placeholderTextColor={COLORS.placeholder} value={productName} onChangeText={(text) => handleChangeText('productName', text, setProductName)} onBlur={() => handleBlur('productName', productName, 'Product name is required.')} editable={!isEditMode} />
                            </View>
                            {errors.productName && <Text style={styles.errorText}>{errors.productName}</Text>}
                        </View>
                        <Text style={styles.subLabel}>Product URL</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="link-outline" size={22} color={COLORS.textSecondary} style={styles.inputIcon} />
                            <TextInput style={styles.inputText} placeholder="https://apple.com/iphone" placeholderTextColor={COLORS.placeholder} value={productURL} onChangeText={setProductURL} />
                        </View>
                    </View>

                    <FormSeparator />

                    <View style={styles.inputSection}>
                        <Text style={styles.label}>Purchase Details ($)</Text>
                        <View style={styles.row}>
                            <View style={{ flex: 3 }}>
                                <Text style={styles.subLabel}>Item Price <Text style={styles.asterisk}>*</Text></Text>
                                <View style={[styles.inputContainer, !!errors.itemPrice && styles.errorBorder]}>
                                    <Ionicons name="pricetag-outline" size={22} color={COLORS.textSecondary} style={styles.inputIcon} />
                                    <TextInput style={styles.inputText} placeholder="e.g., 999" placeholderTextColor={COLORS.placeholder} value={itemPrice} onChangeText={(text) => handleChangeText('itemPrice', text, setItemPrice)} onBlur={() => handleBlur('itemPrice', itemPrice, 'Item price is required.')} keyboardType="numeric" editable={!isEditMode} />
                                </View>
                                {errors.itemPrice && <Text style={styles.errorText}>{errors.itemPrice}</Text>}
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.subLabel}>Quantity</Text>
                                <View style={styles.inputContainer}>
                                    <TextInput style={[styles.inputText, { textAlign: 'center' }]} value={quantity} onChangeText={setQuantity} keyboardType="numeric" />
                                </View>
                            </View>
                        </View>
                        <View>
                            <Text style={styles.subLabel}>Traveler Fee (Reward) <Text style={styles.asterisk}>*</Text></Text>
                            <View style={[styles.inputContainer, !!errors.travelerFee && styles.errorBorder]}>
                                <Ionicons name="cash-outline" size={22} color={COLORS.textSecondary} style={styles.inputIcon} />
                                <TextInput style={styles.inputText} placeholder="e.g., 50" placeholderTextColor={COLORS.placeholder} value={travelerFee} onChangeText={(text) => handleChangeText('travelerFee', text, setTravelerFee)} onBlur={() => handleBlur('travelerFee', travelerFee, 'Traveler fee is required.')} keyboardType="numeric" />
                            </View>
                            {errors.travelerFee && <Text style={styles.errorText}>{errors.travelerFee}</Text>}
                        </View>
                    </View>

                    <FormSeparator />

                    <View style={styles.inputSection}>
                        <Text style={styles.label}>Item Specifications (Optional)</Text>
                        <View style={styles.row}>
                            <View style={[styles.inputContainer, { flex: 1 }]}>
                                <Ionicons name="scale-outline" size={22} color={COLORS.textSecondary} style={styles.inputIcon} />
                                <TextInput style={styles.inputText} placeholder="Approx. Weight" placeholderTextColor={COLORS.placeholder} value={productWeight} onChangeText={setProductWeight} keyboardType="numeric" editable={!isEditMode} />
                            </View>
                            <View style={styles.unitSelector}>
                                <TouchableOpacity style={[styles.unitButton, weightUnit === 'gr' && styles.unitButtonSelected]} onPress={() => setWeightUnit('gr')} disabled={isEditMode}><Text style={[styles.unitButtonText, weightUnit === 'gr' && styles.unitButtonTextSelected]}>gr</Text></TouchableOpacity>
                                <TouchableOpacity style={[styles.unitButton, weightUnit === 'kg' && styles.unitButtonSelected]} onPress={() => setWeightUnit('kg')} disabled={isEditMode}><Text style={[styles.unitButtonText, weightUnit === 'kg' && styles.unitButtonTextSelected]}>kg</Text></TouchableOpacity>
                            </View>
                        </View>
                        <TouchableOpacity onPress={() => setItemTypeModalOpen(true)} style={styles.inputContainer} disabled={isEditMode}>
                            <Ionicons name="file-tray-stacked-outline" size={22} color={COLORS.textSecondary} style={styles.inputIcon} />
                            <Text style={selectedItemTypes.length > 0 ? styles.inputText : styles.placeholderText} numberOfLines={1} ellipsizeMode="tail">{selectedItemTypes.length > 0 ? selectedItemTypes.join(', ') : 'Select item category'}</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.inputSection}>
                        <Text style={styles.label}>Additional Notes (Optional)</Text>
                        <TextInput style={styles.captionInput} placeholder="Add more details about the product..." placeholderTextColor={COLORS.placeholder} multiline value={description} onChangeText={setDescription} />
                    </View>

                    <TouchableOpacity style={[styles.bottomSubmitButton, (!isFormComplete && !isEditMode || isSubmitting) && styles.shareButtonDisabled]} disabled={(!isFormComplete && !isEditMode) || isSubmitting} onPress={handleSubmit}>
                        {isSubmitting ? <ActivityIndicator size="small" color={COLORS.text} /> : <Text style={styles.shareButtonText}>{submitButtonText}</Text>}
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {showPicker && (<DateTimePicker mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} value={requiredByDate} onChange={onDateChange} minimumDate={new Date()} themeVariant="dark" />)}

            <Modal animationType="fade" transparent={true} visible={itemTypeModalOpen} onRequestClose={() => setItemTypeModalOpen(false)}>
                <Pressable style={styles.modalBackdrop} onPress={() => setItemTypeModalOpen(false)}>
                    <Pressable style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select Item Category</Text>
                        {requestItemTypes.map(item => (
                            <TouchableOpacity key={item} style={styles.dropdownItem} onPress={() => setSelectedItemTypes(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item])}>
                                <Ionicons name={selectedItemTypes.includes(item) ? "checkbox" : "square-outline"} size={22} color={selectedItemTypes.includes(item) ? COLORS.primary : COLORS.textSecondary} />
                                <Text style={styles.dropdownItemText}>{item}</Text>
                            </TouchableOpacity>
                        ))}
                    </Pressable>
                </Pressable>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background, paddingTop: Platform.OS === 'ios' ? 50 : 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.separator },
    headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: '600' },
    shareButton: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    shareButtonDisabled: { backgroundColor: COLORS.disabled },
    shareButtonText: { color: COLORS.text, fontWeight: 'bold', fontSize: 16 },
    scrollContent: { paddingHorizontal: 16, paddingVertical: 16, paddingBottom: 40 },
    content: {},
    contentDisabled: { opacity: 0.5 },
    inputSection: { marginBottom: 8 },
    label: { color: COLORS.text, fontSize: 18, fontWeight: '600', marginBottom: 16, paddingLeft: 4 },
    subLabel: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '500', marginBottom: 8, paddingLeft: 4 },
    asterisk: { color: COLORS.error },
    inputContainer: { backgroundColor: COLORS.contentBackground, flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: 'transparent', marginBottom: 4 },
    errorBorder: { borderColor: COLORS.error },
    errorText: { color: COLORS.error, fontSize: 13, marginTop: 4, marginBottom: 8, paddingLeft: 4 },
    inputIcon: { marginRight: 10 },
    inputText: { color: COLORS.text, fontSize: 16, flex: 1 },
    placeholderText: { color: COLORS.placeholder, fontSize: 16, flex: 1 },
    row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
    captionInput: { backgroundColor: COLORS.contentBackground, color: COLORS.text, padding: 15, borderRadius: 12, fontSize: 16, minHeight: 120, textAlignVertical: 'top' },
    suggestionsContainer: { backgroundColor: COLORS.contentBackgroundLighter, borderRadius: 12, marginTop: 4, marginBottom: 8, borderWidth: 1, borderColor: COLORS.separator },
    suggestionItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: COLORS.separator },
    suggestionText: { color: COLORS.text, fontSize: 16 },
    unitSelector: { flexDirection: 'row', backgroundColor: COLORS.contentBackground, borderRadius: 12, overflow: 'hidden' },
    unitButton: { paddingVertical: 15, paddingHorizontal: 22 },
    unitButtonSelected: { backgroundColor: COLORS.primary },
    unitButtonText: { color: COLORS.textSecondary, fontWeight: '600', fontSize: 16 },
    unitButtonTextSelected: { color: COLORS.text },
    separator: { height: 1, backgroundColor: COLORS.separator, marginVertical: 20 },
    bottomSubmitButton: { backgroundColor: COLORS.primary, height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 24 },
    modalBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' },
    modalContent: { backgroundColor: COLORS.contentBackgroundLighter, borderRadius: 14, padding: 20, width: '90%', maxHeight: '70%' },
    modalTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
    dropdownItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.separator, justifyContent: 'space-between' },
    dropdownItemText: { color: COLORS.text, fontSize: 16, marginLeft: 12, flex: 1 },
});