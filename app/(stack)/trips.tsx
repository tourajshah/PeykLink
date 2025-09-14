import { Ionicons } from '@expo/vector-icons';
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
 background: '#000000',
 contentBackground: '#1C1C1E',
 text: '#FFFFFF',
 textSecondary: '#8E8E93',
 placeholder: '#5A5A5F',
 separator: '#38383A',
 disabled: '#4A4A4E',
 error: '#FF453A', // New color for errors
};

const airlines = [
 { name: 'Turkish Airlines', code: 'TK' },
 { name: 'Pegasus Airlines', code: 'PC' },
 { name: 'Lufthansa', code: 'LH' },
 { name: 'Emirates', code: 'EK' },
 { name: 'Qatar Airways', code: 'QR' },
 { name: 'Other', code: 'Other' },
];
type Airline = typeof airlines[0];
const itemTypes = ["Electronics", "Clothing", "Documents", "Books", "Cosmetics", "Other"];

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

 const [origin, setOrigin] = useState<City | null>(null);
 const [destination, setDestination] = useState<City | null>(null);
 const [date, setDate] = useState(new Date());
 const [availableSpaceValue, setAvailableSpaceValue] = useState('');
 const [availableSpaceUnit, setAvailableSpaceUnit] = useState('kg');
 const [acceptedItemTypes, setAcceptedItemTypes] = useState<string[]>([]);
 const [caption, setCaption] = useState('');
 const [airline, setAirline] = useState<Airline | null>(null);

 const [originQuery, setOriginQuery] = useState('');
 const [destinationQuery, setDestinationQuery] = useState('');
 const [suggestions, setSuggestions] = useState<City[]>([]);
 const [activeSuggestionType, setActiveSuggestionType] = useState<'origin' | 'destination' | null>(null);
 
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [showDatePicker, setShowDatePicker] = useState(false);
 const [itemModalVisible, setItemModalVisible] = useState(false);
 const [airlineModalVisible, setAirlineModalVisible] = useState(false);
 
 // New state to track if user has tried to submit
 const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

 useEffect(() => {
  if (isEditMode && existingTrip) {
   const originCity = existingTrip.originCity ? { name: existingTrip.originCity, country: existingTrip.originCountry, countryCode: existingTrip.originCountryCode } : null;
   const destCity = existingTrip.destinationCity ? { name: existingTrip.destinationCity, country: existingTrip.destinationCountry, countryCode: existingTrip.destinationCountryCode } : null;
   setOrigin(originCity);
   setDestination(destCity);
   setOriginQuery(originCity ? `${originCity.name}, ${originCity.country}`: '');
   setDestinationQuery(destCity ? `${destCity.name}, ${destCity.country}`: '');
   setDate(new Date(existingTrip.arrivalDate));
   setCaption(existingTrip.description || '');
   if (existingTrip.airline) {
    const foundAirline = airlines.find(a => a.name === existingTrip.airline);
    setAirline(foundAirline || { name: existingTrip.airline, code: 'Other' });
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

 const createTrip = useMutation(api.trips.createTrip);
 const updateTrip = useMutation(api.trips.updateTrip);

 const handleSearchChange = (text: string, type: 'origin' | 'destination') => {
  if (type === 'origin') {
   setOriginQuery(text);
   setOrigin(null); // IMPORTANT: Invalidate the city object when the user types
  } else {
   setDestinationQuery(text);
   setDestination(null); // IMPORTANT: Invalidate the city object when the user types
  }
  
  setActiveSuggestionType(type);
  if (text.length > 1) {
   const filtered = cityData.filter(city => 
    city.name.toLowerCase().startsWith(text.toLowerCase()) || 
    city.country.toLowerCase().startsWith(text.toLowerCase())
   ).slice(0, 5);
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
  } else {
   setDestination(city);
   setDestinationQuery(fullText);
  }
  setSuggestions([]);
  setActiveSuggestionType(null);
  Keyboard.dismiss();
 };

 // New handler to validate city input when the user taps away
 const handleCityInputBlur = (type: 'origin' | 'destination') => {
    setTimeout(() => {
        setActiveSuggestionType(null);
        if (type === 'origin') {
            // If the text in the box doesn't match a valid, selected city, clear it.
            if (origin === null && originQuery !== '') {
                setOriginQuery(''); 
                Alert.alert("Invalid City", "Please select a city from the list for your origin.");
            }
        } else { // destination
            if (destination === null && destinationQuery !== '') {
                setDestinationQuery('');
                Alert.alert("Invalid City", "Please select a city from the list for your destination.");
            }
        }
    }, 150); // Small delay to allow tap on suggestion to register
 };

 const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (event.type === 'set') {
     const currentDate = selectedDate || date;
     setDate(currentDate);
    }
 };
 
 const handleSubmit = async () => {
  setHasAttemptedSubmit(true); // Mark that the user has tried to submit

  // Check for invalid city text even if origin/destination objects are null
  if (!origin || !destination || !availableSpaceValue) {
    let errorMessage = "Please fill in all required fields marked with *";
    if (!origin) errorMessage = "Please select a valid origin city from the list.";
    else if (!destination) errorMessage = "Please select a valid destination city from the list.";
    else if (!availableSpaceValue) errorMessage = "Please enter the available space.";
    
    Alert.alert('Missing Information', errorMessage);
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
    //  airline: airline?.name,
    });
    Alert.alert('Success!', 'Your trip has been updated.');
   } else {
    await createTrip({
     originCity: origin.name,
     originCountry: origin.country,
    //  originCountryCode: origin.countryCode,
     destinationCity: destination.name,
     destinationCountry: destination.country,
    //  destinationCountryCode: destination.countryCode,
     arrivalDate: date.toISOString().split('T')[0],
     availableSpace: `${availableSpaceValue} ${availableSpaceUnit}`,
     acceptedItemTypes: acceptedItemTypes.join(', '),
     description: caption,
    //  airline: airline?.name,
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
 
 const isFormComplete = origin && destination && availableSpaceValue;
 const headerTitle = isEditMode ? 'Edit Trip' : 'New Trip';
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
        showsVerticalScrollIndicator={!activeSuggestionType}
    >
     <View style={isSubmitting && styles.contentDisabled}>

      <View style={styles.inputSection}>
       <Text style={styles.label}>From <Text style={{color: COLORS.error}}>*</Text></Text>
       <View style={[styles.inputContainer, (hasAttemptedSubmit && !origin) && styles.errorBorder]}>
        <Ionicons name="airplane-outline" size={22} color={COLORS.textSecondary} style={styles.inputIcon} />
        <TextInput
         placeholder="Origin city"
         placeholderTextColor={COLORS.placeholder}
         value={originQuery}
         onChangeText={(text) => handleSearchChange(text, 'origin')}
         style={styles.inputText}
         onFocus={() => { setSuggestions([]); setActiveSuggestionType('origin'); }}
         onBlur={() => handleCityInputBlur('origin')}
         editable={!isEditMode}
        />
       </View>
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
       <Text style={styles.label}>To <Text style={{color: COLORS.error}}>*</Text></Text>
       <View style={[styles.inputContainer, (hasAttemptedSubmit && !destination) && styles.errorBorder]}>
        <Ionicons name="airplane-outline" size={22} color={COLORS.textSecondary} style={styles.inputIcon} />
        <TextInput
         placeholder="Destination city"
         placeholderTextColor={COLORS.placeholder}
         value={destinationQuery}
         onChangeText={(text) => handleSearchChange(text, 'destination')}
         style={styles.inputText}
         onFocus={() => { setSuggestions([]); setActiveSuggestionType('destination'); }}
         onBlur={() => handleCityInputBlur('destination')}
         editable={!isEditMode}
        />
       </View>
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
      
      <View style={styles.inputGroup}>
       <View style={styles.inputSectionHalf}>
        <Text style={styles.label}>Arrival Date <Text style={{color: COLORS.error}}>*</Text></Text>
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
          {airline?.name ?? 'Select'}
         </Text>
        </TouchableOpacity>
       </View>
      </View>

      <View style={styles.inputSection}>
       <Text style={styles.label}>Available Space <Text style={{color: COLORS.error}}>*</Text></Text>
       <View style={styles.spaceInputRow}>
        <View style={[styles.inputContainer, {flex: 1}, (hasAttemptedSubmit && !availableSpaceValue) && styles.errorBorder]}>
         <Ionicons name="cube-outline" size={22} color={COLORS.textSecondary} style={styles.inputIcon} />
         <TextInput
          style={styles.spaceValueInput}
          placeholder="e.g., 5"
          placeholderTextColor={COLORS.placeholder}
          value={availableSpaceValue}
          onChangeText={setAvailableSpaceValue}
          keyboardType="numeric"
         />
        </View>
        <View style={styles.unitSelector}>
         <TouchableOpacity style={[styles.unitButton, availableSpaceUnit === 'gr' && styles.unitButtonSelected]} onPress={() => setAvailableSpaceUnit('gr')}>
          <Text style={styles.unitButtonText}>gr</Text>
         </TouchableOpacity>
         <TouchableOpacity style={[styles.unitButton, availableSpaceUnit === 'kg' && styles.unitButtonSelected]} onPress={() => setAvailableSpaceUnit('kg')}>
          <Text style={styles.unitButtonText}>kg</Text>
         </TouchableOpacity>
        </View>
       </View>
      </View>
      
      <View style={styles.inputSection}>
        <Text style={styles.label}>Accepted Item Types</Text>
        <TouchableOpacity onPress={() => setItemModalVisible(true)} style={styles.inputContainer}>
          <Ionicons name="file-tray-stacked-outline" size={22} color={COLORS.textSecondary} style={styles.inputIcon} />
          <Text style={acceptedItemTypes.length > 0 ? styles.inputText : styles.placeholderText} numberOfLines={1}>
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
        display="default"
        value={date}
        onChange={onDateChange}
        minimumDate={new Date()}
    />
   )}
   
   <Modal animationType="fade" transparent={true} visible={itemModalVisible} onRequestClose={() => setItemModalVisible(false)}>
    <Pressable style={styles.modalBackdrop} onPress={() => setItemModalVisible(false)}>
     <Pressable style={styles.modalContent}>
      <Text style={styles.modalTitle}>Select Item Types</Text>
      {itemTypes.map(item => (
       <TouchableOpacity key={item}
        style={[styles.dropdownItem, acceptedItemTypes.includes(item) && styles.dropdownItemSelected]}
        onPress={() => setAcceptedItemTypes(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item])}>
        <Text style={styles.suggestionText}>{item}</Text>
       </TouchableOpacity>
      ))}
     </Pressable>
    </Pressable>
   </Modal>
   
   <Modal animationType="fade" transparent={true} visible={airlineModalVisible} onRequestClose={() => setAirlineModalVisible(false)}>
    <Pressable style={styles.modalBackdrop} onPress={() => setAirlineModalVisible(false)}>
     <Pressable style={styles.modalContent}>
      <Text style={styles.modalTitle}>Select Airline</Text>
      {airlines.map(item => (
       <TouchableOpacity key={item.code}
        style={[styles.dropdownItem, airline?.code === item.code && styles.dropdownItemSelected]}
        onPress={() => { setAirline(item); setAirlineModalVisible(false); }}>
        <Text style={styles.suggestionText}>{item.name}</Text>
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
 scrollContent: { padding: 20, paddingBottom: 40 },
 contentDisabled: { opacity: 0.5 },
 inputGroup: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
 inputSection: { marginBottom: 24, zIndex: 10 },
 inputSectionHalf: { flex: 1, marginBottom: 24 },
 label: { color: COLORS.textSecondary, fontSize: 15, fontWeight: '500', marginBottom: 8, paddingLeft: 4 },
 inputContainer: { backgroundColor: COLORS.contentBackground, flexDirection: 'row', alignItems: 'center', height: 52, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: COLORS.separator },
 errorBorder: { borderColor: COLORS.error, borderWidth: 1 }, // New style for error border
 inputIcon: { marginRight: 10 },
 inputText: { color: COLORS.text, fontSize: 16, flex: 1 },
 placeholderText: { color: COLORS.placeholder, fontSize: 16, flex: 1 },
 suggestionsContainer: {
    backgroundColor: COLORS.contentBackground,
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: COLORS.separator,
 },
 suggestionItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: COLORS.separator },
 suggestionText: { color: COLORS.text, fontSize: 16 },
 spaceInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
 spaceValueInput: { color: COLORS.text, fontSize: 16, flex: 1, height: '100%' },
 unitSelector: { flexDirection: 'row', backgroundColor: COLORS.contentBackground, borderRadius: 12, borderWidth: 1, borderColor: COLORS.separator },
 unitButton: { paddingVertical: 15, paddingHorizontal: 22 },
 unitButtonSelected: { backgroundColor: COLORS.primary, borderRadius: 11 },
 unitButtonText: { color: COLORS.text, fontWeight: '600', fontSize: 16 },
 captionInput: { backgroundColor: COLORS.contentBackground, color: COLORS.text, padding: 15, borderRadius: 12, fontSize: 16, minHeight: 120, textAlignVertical: 'top', borderWidth: 1, borderColor: COLORS.separator },
 bottomSubmitButton: { backgroundColor: COLORS.primary, height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
 modalBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' },
 modalContent: { backgroundColor: '#2C2C2E', borderRadius: 14, padding: 16, width: '90%', maxHeight: '80%', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
 modalTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
 dropdownItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.separator },
 dropdownItemSelected: { backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 12, marginHorizontal: -12, paddingVertical: 14 },
});