import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useMutation } from 'convex/react';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
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

const COLORS = {
  primary: '#007BFF',
  white: '#FFFFFF',
  black: '#000000',
  grey: '#808080',
  lightGrey: '#333333', // Darker for modal background
  dark: '#1C1C1E',
  disabled: '#a9a9a9',
  selected: '#333',
};

const itemTypes = ["Electronics", "Clothing", "Documents", "Books", "Cosmetics", "Other"];

// Helper function to convert a country code (e.g., "US") to a flag emoji (🇺🇸)
function getFlagEmoji(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) {
    return '🏳️'; // Default flag
  }
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}


export default function TripsScreen() {
  const router = useRouter();
  const { user } = useUser();

  // --- Form State ---
  const [origin, setOrigin] = useState<City | null>(null);
  const [destination, setDestination] = useState<City | null>(null);
  const [availableSpaceValue, setAvailableSpaceValue] = useState('');
  const [availableSpaceUnit, setAvailableSpaceUnit] = useState('kg');
  const [acceptedItemTypes, setAcceptedItemTypes] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [date, setDate] = useState(new Date());

  // --- UI Control State ---
  const [isSharing, setIsSharing] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [itemDropdownOpen, setItemDropdownOpen] = useState(false);
  
  // --- Modal and Suggestion State ---
  const [isSuggestionModalVisible, setSuggestionModalVisible] = useState(false);
  const [suggestionType, setSuggestionType] = useState<'origin' | 'destination'>('origin');
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<City[]>([]);

  const createTrip = useMutation(api.trips.createTrip);

  const openSuggestionModal = (type: 'origin' | 'destination') => {
    setSuggestionType(type);
    setSearchQuery(type === 'origin' ? origin?.name ?? '' : destination?.name ?? '');
    setSuggestions([]);
    setSuggestionModalVisible(true);
  };
  
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (text.length > 1) {
      const filtered = cityData.filter(city => 
        city.name.toLowerCase().startsWith(text.toLowerCase())
      ).slice(0, 100); // Limit results for performance
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  const onSelectCity = (city: City) => {
    if (suggestionType === 'origin') {
      setOrigin(city);
    } else {
      setDestination(city);
    }
    setSuggestionModalVisible(false);
    setSearchQuery('');
    setSuggestions([]);
  };

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowPicker(Platform.OS === 'ios');
    if (event.type === 'set' && selectedDate) {
      setDate(selectedDate);
      if (Platform.OS === 'android') {
        setShowPicker(false);
      }
    }
  };


  const resetForm = () => {
  setOrigin(null);
  setDestination(null);
  setAvailableSpaceValue('');
  setAvailableSpaceUnit('1'); // Reset to default value
  setAcceptedItemTypes([]);
  setDate(new Date());
  setCaption('');
};


  const handleShare = async () => {
    if (!origin || !destination || !availableSpaceValue) {
      Alert.alert('Invalid Input', 'Please select a valid city for both origin and destination.');
      return;
    }

    try {
      setIsSharing(true);
      await createTrip({
        originCity: origin.name,
        originCountry: origin.country,
        destinationCity: destination.name,
        destinationCountry: destination.country,
        arrivalDate: date.toISOString().split('T')[0],
        availableSpace: `${availableSpaceValue} ${availableSpaceUnit}`,
        acceptedItemTypes: acceptedItemTypes.join(', '),
        description: caption,
      });

      Alert.alert('Success!', 'Your trip has been shared.');

      // reset form so the fields whould be empty

      resetForm();

      router.back();
    } catch (error) {
      console.error('Failed to create trip:', error);
      Alert.alert('Error', 'Could not share your trip. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.contentContainer}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} disabled={isSharing}>
            <Ionicons name="close-outline" size={32} color={isSharing ? COLORS.grey : COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Trip</Text>
          <TouchableOpacity
            style={[styles.shareButton, isSharing && styles.shareButtonDisabled]}
            disabled={isSharing || !origin || !destination}
            onPress={handleShare}>
            {isSharing ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Text style={styles.shareButtonText}>Share</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={[styles.content, isSharing && styles.contentDisabled]}>
            <View style={styles.inputSection}>
              <Text style={styles.label}>From</Text>
              <TouchableOpacity style={styles.input} onPress={() => openSuggestionModal('origin')}>
                <Text style={origin ? styles.inputText : styles.placeholderText}>
                  {origin ? `${getFlagEmoji(origin.countryCode)} ${origin.name}, ${origin.country}` : 'Origin City'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.label}>To</Text>
              <TouchableOpacity style={styles.input} onPress={() => openSuggestionModal('destination')}>
                 <Text style={destination ? styles.inputText : styles.placeholderText}>
                  {destination ? `${getFlagEmoji(destination.countryCode)} ${destination.name}, ${destination.country}` : 'Destination City'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.label}>Trip Details</Text>
              <Pressable onPress={() => setShowPicker(true)}>
                <View style={styles.input} pointerEvents="none">
                  <TextInput style={styles.inputText} value={date.toLocaleDateString()} editable={false} />
                </View>
              </Pressable>
              
              <View style={styles.spaceInputContainer}>
                <TextInput
                  style={[styles.input, styles.spaceValueInput]}
                  placeholder="e.g., 5"
                  placeholderTextColor={COLORS.grey}
                  value={availableSpaceValue}
                  onChangeText={setAvailableSpaceValue}
                  editable={!isSharing}
                  keyboardType="numeric"
                />
                <View style={styles.unitSelector}>
                  <TouchableOpacity
                    style={[styles.unitButton, availableSpaceUnit === 'gr' && styles.unitButtonSelected]}
                    onPress={() => setAvailableSpaceUnit('gr')}>
                    <Text style={styles.unitButtonText}>gr</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.unitButton, availableSpaceUnit === 'kg' && styles.unitButtonSelected]}
                    onPress={() => setAvailableSpaceUnit('kg')}>
                    <Text style={styles.unitButtonText}>kg</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            
            <View style={styles.inputSection}>
              <Text style={styles.label}>Accepted Item Types</Text>
               <TouchableOpacity style={styles.input} onPress={() => setItemDropdownOpen(true)}>
                 <Text style={styles.inputText}>
                   {acceptedItemTypes.length > 0 ? acceptedItemTypes.join(', ') : 'Select item types'}
                 </Text>
               </TouchableOpacity>
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.label}>Caption / Description</Text>
              <TextInput
                style={styles.captionInput}
                placeholder="Add more details..."
                placeholderTextColor={COLORS.grey}
                multiline
                value={caption}
                onChangeText={setCaption}
                editable={!isSharing}
              />
            </View>
          </View>
        </ScrollView>
      </View>
      
      {/* --- MODALS FOR POPUPS --- */}
      {showPicker && (
        <DateTimePicker mode="date" display="spinner" value={date} onChange={onDateChange} minimumDate={new Date()} />
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={isSuggestionModalVisible}
        onRequestClose={() => setSuggestionModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select {suggestionType === 'origin' ? 'Origin' : 'Destination'} City</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Start typing a city name..."
              placeholderTextColor={COLORS.grey}
              value={searchQuery}
              onChangeText={handleSearchChange}
              autoFocus={true}
            />
            <ScrollView keyboardShouldPersistTaps="always">
              {suggestions.map(city => (
                <TouchableOpacity key={`${city.name}-${city.countryCode}`} style={styles.dropdownItem} onPress={() => onSelectCity(city)}>
                  <Text style={styles.suggestionText}>
                    {getFlagEmoji(city.countryCode)} {city.name}, {city.country}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.closeButton} onPress={() => setSuggestionModalVisible(false)}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

       <Modal
        animationType="fade"
        transparent={true}
        visible={itemDropdownOpen}
        onRequestClose={() => setItemDropdownOpen(false)}>
        <Pressable style={styles.modalContainer} onPress={() => setItemDropdownOpen(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Item Types</Text>
            {itemTypes.map(item => (
              <TouchableOpacity
                key={item}
                style={[styles.dropdownItem, acceptedItemTypes.includes(item) && styles.dropdownItemSelected]}
                onPress={() => setAcceptedItemTypes(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item])}>
                <Text style={styles.suggestionText}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
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
  inputSection: { marginBottom: 25, paddingTop: 16 },
  label: { color: COLORS.white, fontSize: 16, fontWeight: '600', marginBottom: 10 },
  input: { backgroundColor: '#2C2C2E', justifyContent: 'center', height: 50, paddingHorizontal: 15, borderRadius: 10, marginBottom: 10 },
  inputText: { color: COLORS.white, fontSize: 16 },
  placeholderText: { color: COLORS.grey, fontSize: 16 },
  spaceInputContainer: { flexDirection: 'row', alignItems: 'center' },
  spaceValueInput: { flex: 1, marginRight: 10 },
  unitSelector: { flexDirection: 'row', backgroundColor: '#2C2C2E', borderRadius: 10 },
  unitButton: { paddingVertical: 15, paddingHorizontal: 20 },
  unitButtonSelected: { backgroundColor: COLORS.primary, borderRadius: 10 },
  unitButtonText: { color: COLORS.white, fontWeight: 'bold' },
  captionInput: { backgroundColor: '#2C2C2E', color: COLORS.white, padding: 15, borderRadius: 10, fontSize: 16, minHeight: 120, textAlignVertical: 'top' },
  // Modal & Dropdown Styles
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