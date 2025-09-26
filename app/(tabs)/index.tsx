import { Loader } from "@/components/Loader";
import Request from "@/components/Request";
import Story from "@/components/Story";
import Trip from "@/components/Trip";
import { STORIES } from "@/constants/mock-data";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  LayoutAnimation,
  ListRenderItemInfo,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// MODIFIED: Light Theme COLORS
const COLORS = {
  primary: '#007BFF', // Stays blue
  white: '#FFFFFF',   // Used for backgrounds
  grey: '#6A6A6A',    // Darker grey for text on light backgrounds
  lightGrey: '#F0F0F0', // Very light grey for card backgrounds
  darkGrey: '#333333',  // Almost black for main text
  red: '#FF3B30',     // Stays red for accents
  background: '#F9F9F9', // Overall app background (off-white)
  borderColor: '#E0E0E0', // Light border for definition
};

export default function Index() {
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'trips' | 'requests'>('trips');
  const [originSearch, setOriginSearch] = useState('');
  const [destinationSearch, setDestinationSearch] = useState('');
  
  // REMOVED: isSearchVisible state is no longer needed

  const trips = useQuery(api.trips.getFeedTrips);
  const requests = useQuery(api.requests.getFeedRequests);

  const prevShowResetButtonRef = useRef(false);

  // MODIFIED: Animate only when reset button visibility changes
  useEffect(() => {
    const currentShowResetButton = (originSearch !== '' || destinationSearch !== '');
    if (currentShowResetButton !== prevShowResetButtonRef.current) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    prevShowResetButtonRef.current = currentShowResetButton;
  }, [originSearch, destinationSearch]); // Removed isSearchVisible from dependencies


  if (trips === undefined || requests === undefined) return <Loader />;

  type TripType = (typeof trips)[number];
  type RequestType = (typeof requests)[number];
  type FeedItem = TripType | RequestType;

  const isTripsActive = activeTab === 'trips';

  const filteredTrips = trips.filter(trip =>
    (originSearch === '' || trip.originCity.toLowerCase().includes(originSearch.toLowerCase())) &&
    (destinationSearch === '' || trip.destinationCity.toLowerCase().includes(destinationSearch.toLowerCase()))
  );

  const filteredRequests = requests.filter(request =>
    (originSearch === '' || request.originCity.toLowerCase().includes(originSearch.toLowerCase())) &&
    (destinationSearch === '' || request.destinationCity.toLowerCase().includes(destinationSearch.toLowerCase()))
  );

  const dataToRender = isTripsActive ? filteredTrips : filteredRequests;
  const noData = dataToRender.length === 0;

  const renderFeedItem = ({ item }: ListRenderItemInfo<FeedItem>) => {
    if (isTripsActive) {
      return <Trip trip={item as TripType} />;
    }
    return <Request request={item as RequestType} />;
  };

  const handleResetSearch = () => {
    setOriginSearch('');
    setDestinationSearch('');
  };

  // REMOVED: toggleSearch function is no longer needed

  const showResetButton = originSearch !== '' || destinationSearch !== '';

  return (
    <View style={styles.container}>
      {/* === MODIFIED: Compact Header (No search icon toggle) === */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>PeykLink</Text>
        <TouchableOpacity onPress={() => signOut()} style={styles.headerButton}>
            <Ionicons name="log-out-outline" size={24} color={COLORS.darkGrey} /> {/* Dark text for light background */}
        </TouchableOpacity>
      </View>

      {/* === MODIFIED: Sticky Control Section is now always visible and compact === */}
      <View style={styles.stickyHeaderContainer}>
        {/* Search Bar is always rendered */}
        <SearchBar
            originSearch={originSearch}
            setOriginSearch={setOriginSearch}
            destinationSearch={destinationSearch}
            setDestinationSearch={setDestinationSearch}
        />
        {showResetButton && (
            <TouchableOpacity onPress={handleResetSearch} style={styles.resetButtonContainer}>
                <Ionicons name="close-circle-outline" size={18} color={COLORS.red} />
                <Text style={styles.resetButtonText}>Reset Filters</Text>
            </TouchableOpacity>
        )}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, isTripsActive && styles.activeTab]}
            onPress={() => setActiveTab('trips')}
          >
            <Text style={[styles.tabText, isTripsActive && styles.activeTabText]}>Trips</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, !isTripsActive && styles.activeTab]}
            onPress={() => setActiveTab('requests')}
          >
            <Text style={[styles.tabText, !isTripsActive && styles.activeTabText]}>Requests</Text>
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
        ListEmptyComponent={<NoItemsFound type={activeTab} />}
        // ListHeaderComponent={<StoriesSection />} // Stories are still part of the scrollable content
      />
    </View>
  );
}


// SearchBar Component (No logic changes, only styles to fit light theme)
type SearchBarProps = {
  originSearch: string;
  setOriginSearch: (text: string) => void;
  destinationSearch: string;
  setDestinationSearch: (text: string) => void;
};

const SearchBar: React.FC<SearchBarProps> = ({
  originSearch,
  setOriginSearch,
  destinationSearch,
  setDestinationSearch,
}) => {
  return (
    <View style={styles.searchBarContainer}>
        <Ionicons name="airplane-outline" size={20} color={COLORS.grey} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Origin"
          placeholderTextColor={COLORS.grey}
          value={originSearch}
          onChangeText={setOriginSearch}
          autoCapitalize="words"
        />
      <View style={styles.separator} />
        <Ionicons name="location-outline" size={20} color={COLORS.grey} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Destination"
          placeholderTextColor={COLORS.grey}
          value={destinationSearch}
          onChangeText={setDestinationSearch}
          autoCapitalize="words"
        />
    </View>
  );
};


// StoriesSection and NoItemsFound components remain the same, but with light theme styles
const StoriesSection = () => {
    return (
      <View style={styles.storiesOuterContainer}>
        <Text style={styles.sectionTitle}>Featured Trips</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.storiesContainer}
        >
          {STORIES.map((story) => (
            <Story key={story.id} story={story} />
          ))}
        </ScrollView>
      </View>
    );
  };
  
  const NoItemsFound = ({ type }: { type: 'trips' | 'requests' }) => (
    <View style={styles.noItemsContainer}>
      <Ionicons name="search-circle-outline" size={80} color={COLORS.borderColor} /> {/* Lighter icon */}
      <Text style={styles.noItemsTitle}>No {type} found</Text>
      <Text style={styles.noItemsSubtitle}>Try adjusting your search filters or check back later!</Text>
    </View>
  );

// STYLES (Converted to Light Theme, compact sizing maintained)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background, // Light background
    paddingTop: Platform.OS === 'android' ? 0 : 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 0,
    backgroundColor: COLORS.background, // Match background
    borderBottomWidth: StyleSheet.hairlineWidth, // Subtle separator
    borderBottomColor: COLORS.borderColor,
  },
  headerTitle: {
    fontSize: 26, // Slightly smaller for more compactness
    fontWeight: 'bold',
    color: COLORS.darkGrey, // Dark text on light background
  },
  headerButton: { // Used for logout button
    padding: 8,
  },
  // Sticky header container for Search and Tabs
  stickyHeaderContainer: {
    backgroundColor: COLORS.background, // Match background
    paddingBottom: 8, // Reduced padding
    zIndex: 1, // Ensure it stays above scrolling content
    borderBottomWidth: StyleSheet.hairlineWidth, // Subtle separator
    borderBottomColor: COLORS.borderColor,
  },
  // === Search Bar Styles ===
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white, // Light card background
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 10, // Good spacing
    borderWidth: 1,
    borderColor: COLORS.borderColor, // Light border
    shadowColor: '#000', // Subtle shadow for depth
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchIcon: {
      paddingLeft: 12,
      color: COLORS.grey, // Darker icon for contrast
  },
  searchInput: {
    flex: 1,
    color: COLORS.darkGrey, // Dark text
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  separator: {
    width: 1,
    height: '50%',
    backgroundColor: COLORS.borderColor, // Light separator
  },
  // === Reset Button Styles ===
  resetButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.1)', // Light red background
    borderRadius: 10,
    marginHorizontal: 'auto',
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    maxWidth: 160, // Slightly wider for better touch target
    borderWidth: 1, // Subtle border
    borderColor: 'rgba(255, 59, 48, 0.2)',
  },
  resetButtonText: {
    color: COLORS.red,
    fontSize: 14, // Slightly larger for readability
    fontWeight: '600',
    marginLeft: 6,
  },
  // === Tab Navigation Styles ===
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white, // Light card background
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 4,
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: COLORS.borderColor, // Light border
    shadowColor: '#000', // Subtle shadow
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.grey, // Darker text for inactive tabs
  },
  activeTabText: {
    color: COLORS.white, // White text on primary background
  },
  // === Stories Section Styles ===
  storiesOuterContainer: {
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 18, // Slightly smaller for more compact layout
    fontWeight: 'bold',
    color: COLORS.darkGrey, // Dark text
    paddingHorizontal: 16,
    marginBottom: 10, // Reduced margin
  },
  storiesContainer: {
    paddingLeft: 16,
    marginBottom: 10,
  },
  // === No Items Found Styles ===
  noItemsContainer: {
    height: 300, // Reduced height
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: COLORS.background, // Match screen background
  },
  noItemsTitle: {
    fontSize: 20, // Slightly smaller
    fontWeight: 'bold',
    color: COLORS.darkGrey, // Dark text
    marginTop: 15,
  },
  noItemsSubtitle: {
    fontSize: 15, // Slightly smaller
    color: COLORS.grey,
    textAlign: 'center',
    marginTop: 8,
  },
  flatListContentContainer: {
    paddingBottom: 60,
    paddingTop: 0,
  },
});