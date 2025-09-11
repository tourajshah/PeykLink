import { useUser } from '@clerk/clerk-expo';
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useMutation } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  primary: '#007BFF',
  white: '#FFFFFF',
  black: '#000000',
  grey: '#808080',
  lightGrey: '#333333',
  dark: '#1C1C1E',
  disabled: '#a9a9a9',
  selected: '#333',
};

const requestItemTypes = ["Electronics", "Clothing", "Documents", "Books", "Cosmetics", "Other"];

function getFlagEmoji(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '🏳️';
  const codePoints = countryCode.toUpperCase().split('').map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export default function RequestsScreen() {
  const router = useRouter();
  const { user } = useUser();

  // --- STEP 1: Detect Mode and Get Existing Data ---
  const params = useLocalSearchParams();
  const existingRequest = useMemo(() => {
    return params.request ? JSON.parse(params.request as string) : null;
  }, [params.request]);

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
  const [isSuggestionModalVisible, setSuggestionModalVisible] = useState(false);
  const [suggestionType, setSuggestionType] = useState<'origin' | 'destination'>('origin');
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<City[]>([]);

  // --- STEP 2: Populate Form in Edit Mode ---
  useEffect(() => {
    if (isEditMode) {
      setProductName(existingRequest.productName || '');
      setProductURL(existingRequest.productURL || '');
      setItemPrice(existingRequest.itemPrice?.toString() || '');
      setQuantity(existingRequest.quantity?.toString() || '1');
      setTravelerFee(existingRequest.travelerFee?.toString() || '');
      setOrigin(existingRequest.originCity ? { name: existingRequest.originCity, country: existingRequest.originCountry, countryCode: existingRequest.originCountryCode } : null);
      setDestination(existingRequest.destinationCity ? { name: existingRequest.destinationCity, country: existingRequest.destinationCountry, countryCode: existingRequest.destinationCountryCode } : null);
      setRequiredByDate(new Date(existingRequest.requiredByDate));
      setDescription(existingRequest.description || '');

      // Handle combined weight string
      const weightParts = (existingRequest.productWeight || '').split(' ');
      if (weightParts.length === 2) {
        setProductWeight(weightParts[0]);
        setWeightUnit(weightParts[1]);
      }

      // Handle comma-separated item types
      if (existingRequest.itemTypes) {
        setSelectedItemTypes(existingRequest.itemTypes.split(', '));
      }
    }
  }, [isEditMode, existingRequest]);


  // --- STEP 3: Use Both Mutations ---
  const createRequest = useMutation(api.requests.createRequest);
  const updateRequest = useMutation(api.requests.updateRequest);


  // --- City Suggestion Modal Logic (Unchanged) ---
  const openSuggestionModal = (type: 'origin' | 'destination') => {
    setSuggestionType(type);
    const currentCity = type === 'origin' ? origin : destination;
    setSearchQuery(currentCity?.name ?? '');
    setSuggestions([]);
    setSuggestionModalVisible(true);
  };
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (text.length > 1) {
      const filtered = cityData.filter(city => city.name.toLowerCase().startsWith(text.toLowerCase())).slice(0, 100);
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };
  const onSelectCity = (city: City) => {
    if (suggestionType === 'origin') setOrigin(city);
    else setDestination(city);
    setSuggestionModalVisible(false);
  };
  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowPicker(Platform.OS === 'ios');
    if (event.type === 'set' && selectedDate) {
      setRequiredByDate(selectedDate);
      if (Platform.OS === 'android') setShowPicker(false);
    }
  };

  // --- STEP 4: Unified HandleSubmit Function ---
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (isEditMode) {
        // --- EDIT LOGIC ---
        await updateRequest({
          requestId: existingRequest._id,
          description: description, // Editable field
          quantity: parseInt(quantity, 10), // Editable field
          productURL: productURL,
          travelerFee: parseFloat(travelerFee),
          requiredByDate: requiredByDate.toISOString().split('T')[0],
          
        });
        Alert.alert('Success!', 'Your request has been updated.');
      } else {
        // --- CREATE LOGIC (Unchanged) ---
        if (!productName || !itemPrice || !travelerFee || !origin || !destination) {
          Alert.alert('Missing Information', 'Please fill in all required fields.');
          return;
        }
        await createRequest({
          productName,
          productURL,
          quantity: parseInt(quantity, 10),
          itemPrice: parseFloat(itemPrice),
          travelerFee: parseFloat(travelerFee),
          originCountry: origin.country,
          originCity: origin.name,
          destinationCountry: destination.country,
          destinationCity: destination.name,
          requiredByDate: requiredByDate.toISOString().split('T')[0],
          productWeight: `${productWeight} ${weightUnit}`,
          itemTypes: selectedItemTypes.join(', '),
          description,
        });
        Alert.alert('Success!', 'Your request has been posted.');
      }
      router.back(); // Go back after success in both cases
    } catch (error) {
      console.error('Failed to submit request:', error);
      Alert.alert('Error', `Could not ${isEditMode ? 'update' : 'post'} your request. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // --- STEP 5: Dynamic UI ---
  const headerTitle = isEditMode ? 'Edit Request' : 'New Request';
  const submitButtonText = isEditMode ? 'Save Changes' : 'Share';

  // --- RENDER METHOD (with minor changes for dynamic text) ---
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.contentContainer}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} disabled={isSubmitting}>
            <Ionicons name="close-outline" size={32} color={isSubmitting ? COLORS.grey : COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{headerTitle}</Text>
          <TouchableOpacity
            style={[styles.shareButton, isSubmitting && styles.shareButtonDisabled]}
            disabled={isSubmitting} // Simplified disabled logic for edit mode
            onPress={handleSubmit}>
            {isSubmitting ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Text style={styles.shareButtonText}>{submitButtonText}</Text>}
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={[styles.content, isSubmitting && styles.contentDisabled]}>
            {/* --- Product Details Section --- */}
            {/* In a real app, you'd disable fields you don't want editable */}
            <View style={styles.inputSection}>
              <Text style={styles.label}>Product Details</Text>
              <TextInput style={styles.input} placeholder="Product Name" placeholderTextColor={COLORS.grey} value={productName} onChangeText={setProductName} editable={!isEditMode} />
              <TextInput style={styles.input} placeholder="Product URL (Optional)" placeholderTextColor={COLORS.grey} value={productURL} onChangeText={setProductURL} />
            </View>

             {/* --- Purchase Details Section --- */}
            <View style={styles.inputSection}>
              <Text style={styles.label}>Purchase Details ($)</Text>
              <View style={styles.row}>
                <TextInput style={[styles.input, styles.flexInput]} placeholder="Item Price" placeholderTextColor={COLORS.grey} value={itemPrice} onChangeText={setItemPrice} keyboardType="numeric" editable={!isEditMode} />
                <TextInput style={[styles.input, styles.flexInput]} placeholder="Quantity" placeholderTextColor={COLORS.grey} value={quantity} onChangeText={setQuantity} keyboardType="numeric" />
              </View>
              <TextInput style={styles.input} placeholder="Traveler Fee (Reward)" placeholderTextColor={COLORS.grey} value={travelerFee} onChangeText={setTravelerFee} keyboardType="numeric" />
            </View>

            {/* --- Shipping Details Section --- */}
            <View style={styles.inputSection}>
              <Text style={styles.label}>Shipping Details</Text>
              <TouchableOpacity style={styles.input} onPress={() => openSuggestionModal('origin')} disabled={isEditMode}>
                <Text style={origin ? styles.inputText : styles.placeholderText}>
                  {origin ? `${getFlagEmoji(origin.countryCode)} From: ${origin.name}, ${origin.country}` : 'Origin City'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.input} onPress={() => openSuggestionModal('destination')} disabled={isEditMode}>
                  <Text style={destination ? styles.inputText : styles.placeholderText}>
                  {destination ? `${getFlagEmoji(destination.countryCode)} To: ${destination.name}, ${destination.country}` : 'Destination City'}
                </Text>
              </TouchableOpacity>
              <Pressable onPress={() => setShowPicker(true)}>
                <View style={styles.input} pointerEvents="none">
                  <TextInput style={styles.inputText} value={`Required by: ${requiredByDate.toLocaleDateString()}`} />
                </View>
              </Pressable>
            </View>

            {/* --- Item Specifications & Additional Notes --- */}
            {/* The description is the only other editable field here */}
            <View style={styles.inputSection}>
               <Text style={styles.label}>Additional Notes (Optional)</Text>
               <TextInput style={styles.captionInput} placeholder="Add more details about the product..." placeholderTextColor={COLORS.grey} multiline value={description} onChangeText={setDescription} />
            </View>
          </View>
        </ScrollView>
      </View>
      
      {/* --- MODALS (Unchanged) --- */}
      {showPicker && (<DateTimePicker mode="date" display="spinner" value={requiredByDate} onChange={onDateChange} minimumDate={new Date()} />)}
      <Modal animationType="slide" transparent={true} visible={isSuggestionModalVisible} onRequestClose={() => setSuggestionModalVisible(false)}>
        <View style={styles.modalContainer}><View style={styles.modalContent}><Text style={styles.modalTitle}>Select {suggestionType === 'origin' ? 'Origin' : 'Destination'} City</Text><TextInput style={styles.searchInput} placeholder="Start typing a city name..." placeholderTextColor={COLORS.grey} value={searchQuery} onChangeText={handleSearchChange} autoFocus={true} /><ScrollView keyboardShouldPersistTaps="always">{suggestions.map(city => (<TouchableOpacity key={`${city.name}-${city.countryCode}`} style={styles.dropdownItem} onPress={() => onSelectCity(city)}><Text style={styles.suggestionText}>{getFlagEmoji(city.countryCode)} {city.name}, {city.country}</Text></TouchableOpacity>))}</ScrollView><TouchableOpacity style={styles.closeButton} onPress={() => setSuggestionModalVisible(false)}><Text style={styles.closeButtonText}>Close</Text></TouchableOpacity></View></View>
      </Modal>
      <Modal animationType="fade" transparent={true} visible={itemTypeModalOpen} onRequestClose={() => setItemTypeModalOpen(false)}>
        <Pressable style={styles.modalContainer} onPress={() => setItemTypeModalOpen(false)}><View style={styles.modalContent}><Text style={styles.modalTitle}>Select Item Category</Text>{requestItemTypes.map(item => (<TouchableOpacity key={item} style={[styles.dropdownItem, selectedItemTypes.includes(item) && styles.dropdownItemSelected]} onPress={() => setSelectedItemTypes(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item])}><Text style={styles.suggestionText}>{item}</Text></TouchableOpacity>))}</View></Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.dark },
  contentContainer: { flex: 1, paddingTop: Platform.OS === 'ios' ? 50 : 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#333' },
  headerTitle: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  shareButton: { backgroundColor: COLORS.primary, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8 },
  shareButtonDisabled: { backgroundColor: COLORS.disabled },
  shareButtonText: { color: COLORS.white, fontWeight: 'bold' },
  scrollContent: { paddingBottom: 50, paddingHorizontal: 20 },
  content: {},
  contentDisabled: { opacity: 0.5 },
  inputSection: { marginBottom: 20, paddingTop: 16},
  label: { color: COLORS.white, fontSize: 16, fontWeight: '600', marginBottom: 10 },
  input: { backgroundColor: '#2C2C2E', justifyContent: 'center', height: 50, paddingHorizontal: 15, borderRadius: 10, marginBottom: 10 },
  inputText: { color: COLORS.white, fontSize: 16 },
  placeholderText: { color: COLORS.grey, fontSize: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  flexInput: { flex: 1, marginRight: 10 },
  captionInput: { backgroundColor: '#2C2C2E', color: COLORS.white, padding: 15, borderRadius: 10, fontSize: 16, minHeight: 120, textAlignVertical: 'top' },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContent: { backgroundColor: COLORS.dark, borderRadius: 10, padding: 20, width: '90%', maxHeight: '80%' },
  modalTitle: { color: COLORS.white, fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  searchInput: { backgroundColor: '#2C2C2E', color: COLORS.white, padding: 12, borderRadius: 10, fontSize: 16, marginBottom: 15 },
  dropdownItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: COLORS.lightGrey },
  dropdownItemSelected: { backgroundColor: COLORS.primary, borderRadius: 5 },
  suggestionText: { color: COLORS.white, fontSize: 16 },
  closeButton: { backgroundColor: COLORS.primary, padding: 15, borderRadius: 10, marginTop: 15 },
  closeButtonText: { color: COLORS.white, fontWeight: 'bold', textAlign: 'center', fontSize: 16 },
});
