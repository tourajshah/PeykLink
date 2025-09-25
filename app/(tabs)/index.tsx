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
  Dimensions,
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
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';


// ENABLE LAYOUTANIMATION FOR ANDROID

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

const COLORS = {
  primary: '#007BFF',
  white: '#FFFFFF',
  grey: '#AEAEB2',
  dark: '#1C1C1E',
  card: '#2C2C2E',
  red: '#FF3B30',
  background: '#121212',
};

const { width } = Dimensions.get('window')

export default function Index() {
  const {signOut}=useAuth()
  const [activeTab, setActiveTab] = useState<'trips' | 'requests'>('trips')
  const [originSearch, setOriginSearch] = useState('')
  const [destinationSearch, setDestinationSearch] = useState('')


  const trips = useQuery(api.trips.getFeedTrips)
  const requests = useQuery(api.requests.getFeedRequests)

  const prevShowResetButtonRef = useRef(false)

  useEffect(() => {
      const currentShowResetButton = (originSearch !== '' || destinationSearch !== '')
      if (currentShowResetButton !== prevShowResetButtonRef.current) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
      }
      prevShowResetButtonRef.current = currentShowResetButton
    }, [originSearch, destinationSearch])

    const tabPosition = useSharedValue(0)
    const animatedIndicatorStyle = useAnimatedStyle(() => {
      return {
        transform: [{ translateX: tabPosition.value}],
      }
    })

    const onTabPress = (tab: 'trips' | 'requests') => {
      setActiveTab(tab)
      const newPosition = tab === 'trips' ? 0 : (width - 32) / 2
      tabPosition.value = withTiming(newPosition, { duration: 250 })
    }
  

  if(trips === undefined || requests === undefined) return <Loader />

  type TripType = (typeof trips)[number];
  type RequestType = (typeof requests)[number];
  type FeedItem = TripType | RequestType;
  
  const isTripsActive = activeTab === 'trips';

  const filteredTrips = trips.filter(trip =>
    (originSearch === '' || trip.originCity.toLowerCase().includes(originSearch.toLowerCase())) &&
    (destinationSearch === '' || trip.destinationCity.toLowerCase().includes(destinationSearch.toLowerCase()))
  )

  const filteredRequests = requests.filter(request =>
    (originSearch === '' || request.originCity.toLowerCase().includes(originSearch.toLowerCase())) &&
    (destinationSearch === '' || request.destinationCity.toLowerCase().includes(destinationSearch.toLowerCase()))

  )

  const dataToRender = isTripsActive ? trips : requests;
  const noData = dataToRender.length === 0


  const renderFeedItem = ({ item }: ListRenderItemInfo<FeedItem>) => {
    if (isTripsActive) {
      return <Trip trip={item as TripType} />;
    }
    return <Request request={item as RequestType} />;
  };

  const handleResetSearch = () => {
    setOriginSearch('')
    setDestinationSearch('')
  }

  const showResetButton = originSearch !== '' || destinationSearch !== ''

return (
    <View style={styles.container}>
      {/* === Header === */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>PeykLink</Text>
        <TouchableOpacity onPress={() => signOut()} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={26} color={COLORS.grey} />
        </TouchableOpacity>
      </View>

      {/* === Sticky Control Section === */}
      <View style={styles.stickyHeaderContainer}>
        <SearchBar
          originSearch={originSearch}
          setOriginSearch={setOriginSearch}
          destinationSearch={destinationSearch}
          setDestinationSearch={setDestinationSearch}
        />

        {showResetButton && (
          <TouchableOpacity onPress={handleResetSearch} style={styles.resetButtonContainer}>
            <Ionicons name="close-circle-outline" size={20} color={COLORS.red} />
            <Text style={styles.resetButtonText}>Reset Filters</Text>
          </TouchableOpacity>
        )}

        {/* MODIFIED: New Animated Tab Container */}
        <View style={styles.tabContainer}>
          <Animated.View style={[styles.tabIndicator, animatedIndicatorStyle]} />
          <TouchableOpacity
            style={styles.tab}
            onPress={() => onTabPress('trips')}
          >
            <Text style={[styles.tabText, isTripsActive && styles.activeTabText]}>Trips</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => onTabPress('requests')}
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
        contentContainerStyle={styles.flatListContentContainer} // Changed to a named style
        ListEmptyComponent={<NoItemsFound type={activeTab} />}
        // ListHeaderComponent={<StoriesSection />}
      />
    </View>
  );
}


// SearchBar Component (Styling refined)
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
      <View style={styles.searchInputGroup}>
        <Ionicons name="airplane-outline" size={20} color={COLORS.grey} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Origin"
          placeholderTextColor={COLORS.grey}
          value={originSearch}
          onChangeText={setOriginSearch}
          autoCapitalize="words"
        />
      </View>
      <View style={styles.separator} />
      <View style={styles.searchInputGroup}>
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
    </View>
  );
};


// StoriesSection component (Now with a title)
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


// NoItemsFound component (Styling enhanced)
const NoItemsFound = ({ type }: { type: 'trips' | 'requests' }) => (
  <View style={styles.noItemsContainer}>
    <Ionicons name="search-circle-outline" size={80} color={COLORS.card} />
    <Text style={styles.noItemsTitle}>No {type} found</Text>
    <Text style={styles.noItemsSubtitle}>Try adjusting your search filters or check back later!</Text>
  </View>
);


// STYLES
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: Platform.OS === 'android' ? 25 : 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  logoutButton: {
    padding: 8,
  },
  stickyHeaderContainer: {
    paddingBottom: 10,
    backgroundColor: COLORS.background,
  },
  // === Search Bar Styles ===
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  searchInputGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: COLORS.white,
    fontSize: 16,
    paddingVertical: 0,
  },
  separator: {
    width: 1,
    height: '60%',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  // === Reset Button Styles (MODIFIED) ===
  resetButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Centered horizontally
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    borderRadius: 12,
    marginHorizontal: 'auto', // Auto margins for centering
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    maxWidth: 150, // Limit width so it doesn't span whole screen
  },
  resetButtonText: {
    color: COLORS.red,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  // === Animated Tab Navigation Styles ===
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.grey,
    // REMOVED: transition: 'color 0.3s', // This was the error
  },
  activeTabText: {
    color: COLORS.white,
  },
  tabIndicator: {
    position: 'absolute',
    height: '100%',
    width: '50%',
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    zIndex: 0,
  },
  // === Stories Section Styles ===
  storiesOuterContainer: {
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  storiesContainer: {
    paddingLeft: 16,
  },
  // === No Items Found Styles ===
  noItemsContainer: {
    height: 400,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  noItemsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.white,
    marginTop: 15,
  },
  noItemsSubtitle: {
    fontSize: 16,
    color: COLORS.grey,
    textAlign: 'center',
    marginTop: 8,
  },
  // NEW: FlatList content container style for bottom padding
  flatListContentContainer: {
    paddingBottom: 60, // Add space for the bottom tab bar
    paddingTop: 0,
  }
});