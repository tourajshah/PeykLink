import { Loader } from "@/components/Loader";
import Request from "@/components/Request";
import Trip from "@/components/Trip";
import { City, cityData } from "@/constants/cityData";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@clerk/clerk-expo";
import { Feather, Ionicons } from "@expo/vector-icons";
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useQuery } from "convex/react";
import * as Haptics from 'expo-haptics';
import React, { useCallback, useState } from "react";
// 1. NEW IMPORTS: Gradient and Flags
import { LinearGradient } from 'expo-linear-gradient';
import {
  Alert // Added Alert for language menu
  ,
  FlatList,
  Keyboard,
  LayoutAnimation,
  ListRenderItemInfo,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View
} from "react-native";
import CountryFlag from "react-native-country-flag";

// === TRANSLATION IMPORTS ===
// Ensure your i18n.js file is imported here so it initializes
import '@/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from "react-i18next";

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// 2. REFINED PALETTE: Copied from Create Screen for consistency
const PALETTE = {
  backgroundGradient: ['#F8FAFC', '#FFFFFF'] as const,
  surface: '#FFFFFF',
  shadow: 'rgba(50, 50, 93, 0.15)', // Tighter shadow
  primary: '#3B82F6',
  secondary: '#10B981',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  historyIcon: '#ed7c04ff',
  primaryGradient: ['#0EA5E9', '#2563EB'] as const, // Blue Gradient
  secondaryActionGradient: ['#10B981', '#059669'] as const, // Green Gradient
  textInverse: '#FFFFFF',
  glassBorder: 'rgba(255, 255, 255, 0.3)',
  inputBg: '#F3F4F6', // Slightly darker than surface for inputs
  borderColor: '#E5E7EB',
  danger: '#EF4444',
};

// === DATA FOR FILTERS ===
const itemTypesData = [
    { name: "Electronics", icon: "cellphone-link", category: "standard" },
    { name: "Clothing", icon: "hanger", category: "standard" },
    { name: "Documents", icon: "file-document-outline", category: "standard" },
    { name: "Books", icon: "book-open-page-variant-outline", category: "standard" },
    { name: "Cosmetics", icon: "bottle-tonic-outline", category: "standard" },
    { name: "Pets", icon: "dog-side", category: "special" },
    { name: "Cigars", icon: "cigar", category: "special" },
    { name: "Medication", icon: "pill", category: "special" },
];

export default function Index() {
  const { signOut } = useAuth();
  
  // === TRANSLATION HOOK ===
  const { t, i18n } = useTranslation();
   
  // 1. All Hooks must be declared BEFORE any return statement
  const [activeTab, setActiveTab] = useState<'trips' | 'requests'>('trips');
  const [originSearch, setOriginSearch] = useState('');
  const [destinationSearch, setDestinationSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null); 
  const [refreshing, setRefreshing] = useState(false);
  
  // NEW STATE: For toggling filters
  const [showFilters, setShowFilters] = useState(false);
   
  const trips = useQuery(api.trips.getFeedTrips);
  const requests = useQuery(api.requests.getFeedRequests);

  const onRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  // === LANGUAGE CHANGE LOGIC ===
  const handleLanguageChange = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      t('change_language'), // Ensure you add "change_language": "Change Language" to your JSONs
      "Select your preferred language",
      [
        { text: "English", onPress: () => changeLang('en') },
        { text: "Türkçe", onPress: () => changeLang('tr') },
        { text: "فارسی", onPress: () => changeLang('fa') },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  const changeLang = async (lang: string) => {
    await AsyncStorage.setItem('language', lang);
    i18n.changeLanguage(lang);
  };

  if (trips === undefined || requests === undefined) return <Loader />;

  type TripType = (typeof trips)[number];
  type RequestType = (typeof requests)[number];
  type FeedItem = TripType | RequestType;

  const isTripsActive = activeTab === 'trips';

  // === FILTER LOGIC ===
  const filterItem = (item: any) => {
    const matchesOrigin = originSearch === '' || item.originCity.toLowerCase().includes(originSearch.toLowerCase());
    const matchesDest = destinationSearch === '' || item.destinationCity.toLowerCase().includes(destinationSearch.toLowerCase());
    
    let matchesCategory = true;
    if (selectedCategory) {
        const typeString = isTripsActive ? item.acceptedItemTypes : item.itemTypes;
        if (typeString) {
            matchesCategory = typeString.toLowerCase().includes(selectedCategory.toLowerCase());
        } else {
            matchesCategory = false; 
        }
    }

    return matchesOrigin && matchesDest && matchesCategory;
  };

  const filteredTrips = trips.filter(filterItem);
  const filteredRequests = requests.filter(filterItem);
  const dataToRender = isTripsActive ? filteredTrips : filteredRequests;
   
  const renderFeedItem = ({ item }: ListRenderItemInfo<FeedItem>) => {
    return (
      <View style={styles.feedItemWrapper}>
        {isTripsActive ? (
          <Trip trip={item as TripType} />
        ) : (
          <Request request={item as RequestType} />
        )}
      </View>
    );
  };

  const handleResetSearch = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOriginSearch('');
    setDestinationSearch('');
    setSelectedCategory(null);
  };

  const handleTabChange = (tab: 'trips' | 'requests') => {
    if (activeTab !== tab) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setActiveTab(tab);
      setSelectedCategory(null); 
    }
  };

  // NEW FUNCTION: Toggle Filters visibility
  const toggleFilters = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setShowFilters(!showFilters);
  };

  return (
    <View style={styles.container}>
      {/* 3. BACKGROUND: Applied LinearGradient */}
      <LinearGradient colors={PALETTE.backgroundGradient} style={styles.gradientFill}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        
        {/* === Header === */}
        <SafeAreaView>
          <View style={styles.header}>
            <View>
               <Text style={styles.headerSubtitle}>{t('welcome_back')}</Text>
               <Text style={styles.headerTitle}>PeykLink</Text>
            </View>
            
            {/* Action Buttons Row */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
                {/* === LANGUAGE BUTTON === */}
                <TouchableOpacity onPress={handleLanguageChange} style={styles.headerIconBtn}>
                    <Ionicons name="globe-outline" size={22} color={PALETTE.textPrimary} />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => signOut()} style={styles.headerIconBtn}>
                    <Ionicons name="log-out-outline" size={22} color={PALETTE.textPrimary} /> 
                </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>

        {/* === Sticky Control Section === */}
        <View style={styles.controlsContainer}>
          
          {/* Modern Search Bar - PASSED t PROP */}
          <ModernSearchBar 
              originSearch={originSearch}
              setOriginSearch={setOriginSearch}
              destinationSearch={destinationSearch}
              setDestinationSearch={setDestinationSearch}
              onReset={handleResetSearch}
              t={t}
          />

          {/* === Filter Toggle Button === */}
          <View style={styles.filterToggleRow}>
              <TouchableOpacity 
                style={styles.filterToggleButton} 
                onPress={toggleFilters}
                activeOpacity={0.7}
              >
                  <Feather name="sliders" size={14} color={PALETTE.textSecondary} />
                  <Text style={styles.filterToggleText}>
                      {selectedCategory 
                        ? `${t('filtered')}: ${t(`categories.${selectedCategory}`)}` 
                        : t('filter_categories')}
                  </Text>
                  <Feather 
                    name={showFilters ? "chevron-up" : "chevron-down"} 
                    size={14} 
                    color={PALETTE.textSecondary} 
                  />
              </TouchableOpacity>
          </View>

          {/* === Category Filter Chips (Conditionally Rendered) === */}
          {showFilters && (
            <View style={styles.filtersWrapper}>
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    contentContainerStyle={styles.filterScrollContainer}
                >
                    {selectedCategory && (
                        <TouchableOpacity 
                            style={styles.resetChip} 
                            onPress={() => setSelectedCategory(null)}
                        >
                            <Ionicons name="close" size={14} color={PALETTE.textInverse} />
                        </TouchableOpacity>
                    )}

                    {itemTypesData.map((type, index) => {
                        const isSelected = selectedCategory === type.name;
                        // Using Palette colors
                        const activeColor = isTripsActive ? PALETTE.primary : PALETTE.secondary;
                        
                        return (
                            <TouchableOpacity 
                                key={index}
                                style={[
                                    styles.filterChip, 
                                    isSelected && { backgroundColor: activeColor, borderColor: activeColor }
                                ]}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    // LOGIC: KEEP ENGLISH VALUE FOR FILTERING
                                    setSelectedCategory(isSelected ? null : type.name);
                                }}
                            >
                                <MaterialCommunityIcons 
                                    name={type.icon as any} 
                                    size={16} 
                                    color={isSelected ? PALETTE.textInverse : PALETTE.textSecondary} 
                                    style={{ marginRight: 6 }}
                                />
                                <Text style={[
                                    styles.filterChipText, 
                                    isSelected && { color: PALETTE.textInverse }
                                ]}>
                                    {/* UI: SHOW TRANSLATED VALUE */}
                                    {t(`categories.${type.name}`)}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>
          )}

          {/* Modern Pill Tabs - Redesigned to use Gradients */}
          <View style={styles.tabContainer}>
            {/* Trip Tab */}
            <TouchableOpacity
              style={styles.tabWrapper}
              onPress={() => handleTabChange('trips')}
              activeOpacity={0.8}
            >
              {isTripsActive ? (
                 <LinearGradient 
                    colors={PALETTE.primaryGradient} 
                    style={styles.activeTabGradient}
                    start={{x: 0, y: 0}} end={{x: 1, y: 1}}
                 >
                    <MaterialCommunityIcons name="airplane" size={20} color={PALETTE.textInverse} style={{ marginRight: 6 }} />
                    <Text style={[styles.tabText, { color: PALETTE.textInverse }]}>{t('trips')}</Text>
                 </LinearGradient>
              ) : (
                <View style={styles.inactiveTab}>
                    <MaterialCommunityIcons name="airplane" size={20} color={PALETTE.textSecondary} style={{ marginRight: 6 }} />
                    <Text style={styles.tabText}>{t('trips')}</Text>
                </View>
              )}
            </TouchableOpacity>
            
            {/* Requests Tab */}
            <TouchableOpacity
              style={styles.tabWrapper}
              onPress={() => handleTabChange('requests')}
              activeOpacity={0.8}
            >
               {!isTripsActive ? (
                 <LinearGradient 
                    colors={PALETTE.secondaryActionGradient} 
                    style={styles.activeTabGradient}
                    start={{x: 0, y: 0}} end={{x: 1, y: 1}}
                 >
                    <Feather name="package" size={18} color={PALETTE.textInverse} style={{ marginRight: 6 }} />
                    <Text style={[styles.tabText, { color: PALETTE.textInverse }]}>{t('requests')}</Text>
                 </LinearGradient>
              ) : (
                <View style={styles.inactiveTab}>
                    <Feather name="package" size={18} color={PALETTE.textSecondary} style={{ marginRight: 6 }} />
                    <Text style={styles.tabText}>{t('requests')}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* === Main Feed === */}
        <FlatList
          data={dataToRender}
          renderItem={renderFeedItem}
          keyExtractor={(item) => item._id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.flatListContentContainer}
          // PASSED t PROP TO NoItemsFound
          ListEmptyComponent={<NoItemsFound type={activeTab} t={t} />}
          keyboardDismissMode="on-drag" 
          keyboardShouldPersistTaps="handled"
          refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PALETTE.primary} />
          }
        />
      </LinearGradient>
    </View>
  );
}

// === MODERN SEARCH BAR COMPONENT ===
type SearchBarProps = {
  originSearch: string;
  setOriginSearch: (text: string) => void;
  destinationSearch: string;
  setDestinationSearch: (text: string) => void;
  onReset: () => void;
  t: any; // Added Translation Prop Type
};

const ModernSearchBar: React.FC<SearchBarProps> = ({
  originSearch,
  setOriginSearch,
  destinationSearch,
  setDestinationSearch,
  onReset,
  t, // Destructured t
}) => {
    const [activeField, setActiveField] = useState<'origin' | 'destination' | null>(null);
    const isExpanded = activeField !== null || originSearch.length > 0 || destinationSearch.length > 0;

    const getSuggestions = () => {
        const query = activeField === 'origin' ? originSearch : destinationSearch;
        if (!query) return [];
        return cityData.filter(city => 
            city.name.toLowerCase().startsWith(query.toLowerCase()) || 
            city.country.toLowerCase().startsWith(query.toLowerCase())
        ).slice(0, 5); 
    };

    const suggestions = getSuggestions();

    const handleSelectCity = (city: City) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (activeField === 'origin') {
            setOriginSearch(city.name);
        } else {
            setDestinationSearch(city.name);
        }
        // Don't close immediately if we just filled one
        if (activeField === 'origin' && !destinationSearch) {
             setActiveField('destination');
        } else {
             setActiveField(null);
             Keyboard.dismiss();
        }
    };

    const handleSwapLocations = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        const tempOrigin = originSearch;
        setOriginSearch(destinationSearch);
        setDestinationSearch(tempOrigin);
    };

    const expandSearchBar = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setActiveField('origin'); 
    };

    const collapseSearchBar = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        onReset();
        setActiveField(null);
        Keyboard.dismiss();
    };

    // Helper to render the dropdown anchored to a field
    const renderDropdown = () => {
        if (!suggestions.length) return null;
        return (
            <View style={styles.anchoredSuggestions}>
                {suggestions.map((city, index) => (
                    <TouchableOpacity 
                        key={`${city.name}-${index}`} 
                        style={styles.suggestionItem}
                        onPress={() => handleSelectCity(city)}
                    >
                        <View style={styles.suggestionIcon}>
                            <CountryFlag isoCode={city.countryCode || 'US'} size={14} />
                        </View>
                        <View>
                            <Text style={styles.suggestionCity}>{city.name}</Text>
                            <Text style={styles.suggestionCountry}>{city.country}</Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>
        );
    };

    return (
        <View style={styles.searchContainer}>
            {!isExpanded ? (
                // === Collapsed View ===
                <View style={styles.searchInputsContainer}>
                      <TouchableOpacity style={styles.collapsedWrapper} onPress={expandSearchBar} activeOpacity={0.9}>
                         <Ionicons name="search" size={20} color={PALETTE.primary} style={{ marginRight: 12 }} />
                         <Text style={styles.collapsedPlaceholder}>{t('where_to')}</Text>
                     </TouchableOpacity>
                </View>
            ) : (
                // === Expanded View (Different Design: Stacked Fields) ===
                <View style={styles.expandedWrapper}>
                    <View style={styles.expandedHeader}>
                        <Text style={styles.expandedTitle}>{t('filter_route')}</Text>
                        <TouchableOpacity onPress={collapseSearchBar} style={styles.cancelButton}>
                            <Text style={styles.cancelText}>{t('clear')}</Text>
                        </TouchableOpacity>
                    </View>
                    
                    {/* Origin Field */}
                    <View style={[styles.inputFieldContainer, activeField === 'origin' && styles.activeFieldStack]}>
                        <View style={[styles.modernInputWrapper, activeField === 'origin' && styles.activeInputBorder]}>
                            <Feather name="circle" size={16} color={PALETTE.primary} style={styles.inputIcon} />
                            <TextInput
                                style={styles.modernInput}
                                placeholder={t('origin_city')}
                                placeholderTextColor={PALETTE.textSecondary}
                                value={originSearch}
                                onChangeText={(text) => {
                                    setOriginSearch(text);
                                    if (activeField !== 'origin') setActiveField('origin'); 
                                }}
                                onFocus={() => setActiveField('origin')}
                                autoFocus={activeField === 'origin' && !originSearch}
                            />
                        </View>
                        {/* Anchored Dropdown for Origin */}
                        {activeField === 'origin' && renderDropdown()}
                    </View>

                    {/* Swap Button (Floating) - FIXED Z-INDEX and POSITION */}
                    <TouchableOpacity style={styles.floatingSwapBtn} onPress={handleSwapLocations} activeOpacity={0.8}>
                         <Ionicons name="swap-vertical" size={16} color={PALETTE.textPrimary} />
                    </TouchableOpacity>

                    {/* Destination Field */}
                    <View style={[styles.inputFieldContainer, activeField === 'destination' && styles.activeFieldStack]}>
                         <View style={[styles.modernInputWrapper, activeField === 'destination' && styles.activeInputBorder]}>
                            <Ionicons name="location-outline" size={18} color={PALETTE.secondary} style={styles.inputIcon} />
                            <TextInput
                                style={styles.modernInput}
                                placeholder={t('destination_city')}
                                placeholderTextColor={PALETTE.textSecondary}
                                value={destinationSearch}
                                onChangeText={(text) => {
                                    setDestinationSearch(text);
                                    if (activeField !== 'destination') setActiveField('destination');
                                }}
                                onFocus={() => setActiveField('destination')}
                            />
                        </View>
                        {/* Anchored Dropdown for Destination */}
                        {activeField === 'destination' && renderDropdown()}
                    </View>

                </View>
            )}
        </View>
    );
};

const NoItemsFound = ({ type, t }: { type: 'trips' | 'requests', t: any }) => {
    // Dynamic color based on type
    const activeColor = type === 'requests' ? PALETTE.secondary : PALETTE.primary;
    // We create a soft background using opacity
    const activeBg = type === 'requests' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)';

    const displayType = type === 'trips' ? t('trips') : t('requests');

    return (
        <View style={styles.noItemsContainer}>
            <View style={[styles.noItemsIconCircle, { backgroundColor: activeBg }]}>
                <Ionicons 
                    name={type === 'trips' ? "airplane" : "cube-outline"} 
                    size={40} 
                    color={activeColor} 
                /> 
            </View>
            <Text style={styles.noItemsTitle}>{t('no_items_found', { type: displayType })}</Text>
            <Text style={styles.noItemsSubtitle}>
                {t('no_items_subtitle', { type: displayType })}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC', 
  },
  gradientFill: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10, // Added padding since StatusBar is translucent
    paddingBottom: 8, // Reduced padding
  },
  headerSubtitle: {
    fontSize: 16,
    color: PALETTE.textSecondary,
    fontWeight: '500',
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 32, // Matches Create Screen
    fontWeight: '800', 
    color: PALETTE.textPrimary,
    letterSpacing: -0.5,
  },
  headerIconBtn: { 
    padding: 10,
    backgroundColor: PALETTE.surface,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: PALETTE.glassBorder, // Glass border
    shadowColor: PALETTE.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  controlsContainer: {
    paddingBottom: 4, 
    zIndex: 10,
  },
  
  // === INDUSTRY STANDARD SEARCH BAR ===
  searchContainer: {
    marginHorizontal: 20,
    marginTop: 8,
    zIndex: 50, 
  },
  // Collapsed is a single card
  searchInputsContainer: {
    backgroundColor: PALETTE.surface,
    borderRadius: 24, 
    borderWidth: 1,
    borderColor: PALETTE.glassBorder,
    shadowColor: PALETTE.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden', 
  },
  collapsedWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
  },
  collapsedPlaceholder: {
      color: PALETTE.textPrimary,
      fontSize: 16,
      fontWeight: '600',
  },

  // Expanded is transparent wrapper holding 2 cards
  expandedWrapper: {
      paddingBottom: 10,
      position: 'relative',
  },
  expandedHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 4,
      paddingTop: 0,
      marginBottom: 12,
  },
  expandedTitle: {
      fontSize: 11,
      fontWeight: '800',
      color: PALETTE.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 1,
  },

  // Individual Input Field Styling
  inputFieldContainer: {
      position: 'relative', 
      marginBottom: 12,
      zIndex: 1, // Default zIndex
  },
  activeFieldStack: {
      zIndex: 100, // Brings the active field (and its dropdown) to front
  },
  modernInputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: PALETTE.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: PALETTE.borderColor,
      height: 54,
      paddingHorizontal: 16,
      shadowColor: PALETTE.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
  },
  activeInputBorder: {
      borderColor: PALETTE.primary,
      borderWidth: 1.5,
  },
  inputIcon: {
      marginRight: 12,
  },
  modernInput: {
    flex: 1,
    fontSize: 15, 
    color: PALETTE.textPrimary,
    fontWeight: '600',
  },

  // Floating Swap Button - FIXED
  floatingSwapBtn: {
      position: 'absolute',
      right: 24, // Aligned with internal padding
      top: 76, // Recalculated to sit perfectly in the gap (Header + Input + Half Margin)
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: PALETTE.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: PALETTE.borderColor,
      zIndex: 200, // IMPORTANT: Higher than activeFieldStack (100)
      shadowColor: PALETTE.shadow,
      shadowOffset: {width: 0, height: 4},
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 10, // High elevation for Android visibility
  },

  divider: {
    height: 1,
    backgroundColor: PALETTE.borderColor,
    width: '100%',
  },
  cancelButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  cancelText: {
    fontSize: 13, 
    fontWeight: '600',
    color: PALETTE.danger,
  },

  // === ANCHORED DROPDOWN ===
  anchoredSuggestions: {
    position: 'absolute',
    top: '100%', 
    left: 0, 
    right: 0, 
    backgroundColor: PALETTE.surface,
    marginTop: 6, // Gap between input and dropdown
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PALETTE.glassBorder,
    shadowColor: PALETTE.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, 
    shadowRadius: 24,
    elevation: 20,
    paddingVertical: 8,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: PALETTE.borderColor,
  },
  suggestionIcon: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  suggestionCity: {
    fontSize: 14,
    fontWeight: '600',
    color: PALETTE.textPrimary,
  },
  suggestionCountry: {
    fontSize: 12,
    color: PALETTE.textSecondary,
  },

  // === NEW STYLE: Filter Toggle Row ===
  filterToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start', // Left aligned
    marginHorizontal: 24, // Aligned with content inside cards
    marginTop: 12,
  },
  filterToggleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 6,
      paddingHorizontal: 10,
      backgroundColor: 'rgba(0,0,0,0.03)', // Very subtle pill
      borderRadius: 20,
  },
  filterToggleText: {
      fontSize: 12,
      fontWeight: '600',
      color: PALETTE.textSecondary,
  },

  // === FILTERS ===
  filtersWrapper: {
      marginTop: 0, // Removed margin since Toggle handles spacing
  },
  filterScrollContainer: {
      paddingHorizontal: 20,
      paddingBottom: 4,
      paddingTop: 8, // Added little top pad for animation clearance
  },
  filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: PALETTE.surface,
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 12, // Softer corners
      marginRight: 8,
      borderWidth: 1,
      borderColor: PALETTE.borderColor,
  },
  filterChipText: {
      fontSize: 13,
      fontWeight: '600',
      color: PALETTE.textPrimary,
  },
  resetChip: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: PALETTE.danger,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
      alignSelf: 'center', 
  },

  // === TABS ===
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: PALETTE.surface,
    borderRadius: 20, 
    marginHorizontal: 20,
    marginVertical: 10, // REDUCED from 16
    padding: 4, // REDUCED from 6
    alignItems: 'center',
    borderWidth: 1,
    borderColor: PALETTE.glassBorder,
    shadowColor: PALETTE.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 8, // Space between tabs
  },
  tabWrapper: {
    flex: 1,
    height: 44, // Fixed height for alignment
    borderRadius: 14,
    overflow: 'hidden', // Essential for Gradient to stay inside border radius
  },
  activeTabGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: PALETTE.textSecondary, 
  },

  // === ITEMS ===
  flatListContentContainer: {
    paddingBottom: 40, 
    paddingTop: 0, // REDUCED from 4 to 0
  },
  feedItemWrapper: {
      marginBottom: 0,
  },

  // === NO ITEMS ===
  noItemsContainer: {
    height: 350, 
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  noItemsIconCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
  },
  noItemsTitle: {
    fontSize: 20, 
    fontWeight: '700',
    color: PALETTE.textPrimary, 
  },
  noItemsSubtitle: {
    fontSize: 14, 
    color: PALETTE.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});