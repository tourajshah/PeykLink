import { Loader } from '@/components/Loader';
import Request from "@/components/Request";
import Trip from "@/components/Trip";
import { api } from '@/convex/_generated/api';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, FlatList, ListRenderItemInfo, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// 1. NEW PALETTE: A clean, minimalist light theme as requested.
const PALETTE = {
  backgroundGradient: ['#F7F8FA', '#FFFFFF'] as const, // Subtle gradient for a non-flat look
  surface: '#FFFFFF',
  shadow: 'rgba(100, 100, 111, 0.15)', // A softer, more realistic shadow color
  primary: '#3B82F6', // A single, consistent primary blue
  secondary: '#10B981', // A single, consistent secondary green
  textPrimary: '#1F2937', // Near-black for high contrast
  textSecondary: '#6B7280', // Medium gray for secondary info
  historyIcon: '#ed7c04ff',
  primaryGradient: ['#38BDF8', '#3B82F6'] as const,
  secondaryActionGradient: ['#34D399', '#10B981'] as const, 
};

export default function Create() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'trips' | 'requests'>('trips');
  const [postStatus, setPostStatus] = useState<'active' | 'archived'>('active');
  
  // 3. HINT STATE: State to manage the visibility of the "how to get back" hint.
  const [showHint, setShowHint] = useState(false);
  const hintAnim = new Animated.Value(0); // For a smooth fade-in/out animation

  useEffect(() => {
    // Animate the hint toast when it should be shown/hidden
    Animated.timing(hintAnim, {
      toValue: showHint ? 1 : 0,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [showHint]);

  const myActiveTrips = useQuery(api.trips.getMyTrips);
  const myActiveRequests = useQuery(api.requests.getMyRequests);

  const myArchivedTrips: TripType[] = [];
  const myArchivedRequests: RequestType[] = [];

  if (myActiveTrips === undefined || myActiveRequests === undefined) return <Loader />;

  type TripType = NonNullable<typeof myActiveTrips>[number];
  type RequestType = NonNullable<typeof myActiveRequests>[number];

  const isTripsActive = activeTab === 'trips';
  const isShowingActive = postStatus === 'active';
  
  const dataToRender = isShowingActive
    ? (isTripsActive ? myActiveTrips : myActiveRequests)
    : (isTripsActive ? myArchivedTrips : myArchivedRequests);

  const handleHistoryToggle = () => {
    const isSwitchingToArchived = postStatus === 'active';
    setPostStatus(isSwitchingToArchived ? 'archived' : 'active');

    // If switching to archived, show the hint.
    if (isSwitchingToArchived) {
      setShowHint(true);
      // Automatically hide the hint after 3 seconds.
      setTimeout(() => setShowHint(false), 3000);
    }
  };

  const renderFeedItem = ({ item }: ListRenderItemInfo<TripType | RequestType>) => {
    if (isTripsActive) return <Trip trip={item as TripType} />;
    return <Request request={item as RequestType} />;
  };

  const ListHeader = () => (
    <>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Get Started</Text>
        <Text style={styles.subHeader}>Your journey begins here. What would you like to do?</Text>
      </View>
      <View style={styles.cardsContainer}>
        {/* Cards now use the new shadow style for a subtle lift */}
        <View style={styles.cardWrapper}>
          <TouchableOpacity style={styles.cardShadow} onPress={() => router.navigate("/trips")} activeOpacity={0.85}>
            <LinearGradient colors={PALETTE.primaryGradient} style={styles.card}>
              <View style={[styles.iconContainer, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}><Feather name="map-pin" size={24} color="#FFFFFF" /></View>
              <Text style={styles.cardTitle}>Plan a New Trip</Text>
              <View style={styles.cardArrowContainer}><Feather name="arrow-right" size={24} color="#FFFFFF" /></View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        <View style={styles.cardWrapper}>
          <TouchableOpacity style={styles.cardShadow} onPress={() => router.navigate("/orders")} activeOpacity={0.85}>
            <LinearGradient colors={PALETTE.secondaryActionGradient} style={styles.card}>
              <View style={[styles.iconContainer, { backgroundColor: 'rgba(0, 0, 0, 0.2)' }]}><Feather name="package" size={24} color="#FFFFFF" /></View>
              <Text style={styles.cardTitle}>Request an Item</Text>
              <View style={styles.cardArrowContainer}><Feather name="arrow-right" size={24} color="#FFFFFF" /></View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.listHeaderContainer}>
        <Text style={styles.listTitle}>{isShowingActive ? 'Active Posts' : 'Archived Posts'}</Text>
        <TouchableOpacity onPress={handleHistoryToggle} style={styles.historyButton}>
          <FontAwesome5 name="history" size={20} color={PALETTE.historyIcon} />
        </TouchableOpacity>
      </View>
      <View style={styles.segmentedControlContainer}>
        {/* Tabs now use the new light theme surface style */}
        <TouchableOpacity style={styles.segmentedTab} onPress={() => setActiveTab('trips')}>
          <Text style={[styles.tabText, isTripsActive && styles.activeTabText]}>My Trips</Text>
          <View style={[styles.countBadge, isTripsActive && styles.activeCountBadge]}>
            <Text style={[styles.countText, isTripsActive && styles.activeCountText]}>
              {isShowingActive ? myActiveTrips.length : myArchivedTrips.length}
            </Text>
          </View>
          {isTripsActive && <LinearGradient colors={PALETTE.primaryGradient} style={styles.activeTabIndicator}/>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.segmentedTab} onPress={() => setActiveTab('requests')}>
          <Text style={[styles.tabText, !isTripsActive && styles.activeTabText]}>My Requests</Text>
          <View style={[styles.countBadge, !isTripsActive && styles.activeCountBadge]}>
            <Text style={[styles.countText, !isTripsActive && styles.activeCountText]}>{isShowingActive ? myActiveRequests.length : myArchivedRequests.length}</Text>
          </View>
          {!isTripsActive && <LinearGradient colors={PALETTE.primaryGradient} style={styles.activeTabIndicator}/>}
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={PALETTE.backgroundGradient} style={{ flex: 1 }}>
        <FlatList
          style={styles.container}
          data={dataToRender}
          renderItem={renderFeedItem}
          keyExtractor={(item) => item._id}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={ListHeader}
          ItemSeparatorComponent={() => <View style={styles.listSeparator} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name={isShowingActive ? "inbox" : "archive"} size={40} color={PALETTE.textSecondary} />
              <Text style={styles.emptyTitle}>{isShowingActive ? 'Nothing active right now' : 'No archived posts'}</Text>
              <Text style={styles.emptyText}>{isShowingActive ? `Your active ${isTripsActive ? 'trips' : 'requests'} will appear here.` : `Your past posts will be shown here.`}</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 80 }}
        />
      </LinearGradient>
      {/* The Hint/Toast Component */}
      <Animated.View style={[styles.hintToast, { opacity: hintAnim, transform: [{ translateY: hintAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
        <Feather name="info" size={18} color="#FFFFFF" />
        <Text style={styles.hintText}>Tap the history icon again to see active posts</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  headerContainer: { paddingTop: 12, paddingBottom: 24, paddingHorizontal: 20 },
  header: { fontSize: 34, fontWeight: '700', color: PALETTE.textPrimary },
  subHeader: { fontSize: 17, color: PALETTE.textSecondary, marginTop: 8 },
  cardsContainer: { flexDirection: 'row', marginBottom: 32, gap: 16, paddingHorizontal: 20 },
  cardWrapper: { flex: 1 },
  card: { flex: 1, borderRadius: 24, padding: 20, minHeight: 180, justifyContent: 'space-between' },
  cardShadow: { flex: 1, shadowColor: PALETTE.shadow, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 1, shadowRadius: 20, elevation: 15, backgroundColor: PALETTE.surface, borderRadius: 24 },
  iconContainer: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#FFFFFF' },
  cardArrowContainer: { alignSelf: 'flex-end', backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 16, width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  listHeaderContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 16, },
  listTitle: { fontSize: 22, fontWeight: '600', color: PALETTE.textPrimary },
  historyButton: { padding: 8, },
  segmentedControlContainer: { flexDirection: 'row', height: 56, marginHorizontal: 20, marginBottom: 16, backgroundColor: PALETTE.surface, borderRadius: 16, shadowColor: PALETTE.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 10, elevation: 5 },
  segmentedTab: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  activeTabIndicator: { position: 'absolute', bottom: 4, height: 3, width: '50%', borderRadius: 3 },
  tabText: { fontSize: 16, fontWeight: '500', color: PALETTE.textSecondary, marginRight: 8 },
  activeTabText: { fontWeight: '600', color: PALETTE.primary },
  countBadge: { backgroundColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, },
  activeCountBadge: { backgroundColor: PALETTE.primary, },
  countText: { fontSize: 13, fontWeight: '600', color: PALETTE.textSecondary, },
  activeCountText: { color: '#FFFFFF', },
  listSeparator: { height: 1, marginHorizontal: 20, backgroundColor: '#E5E7EB' },
  emptyContainer: { paddingVertical: 60, alignItems: 'center', gap: 16, },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: PALETTE.textPrimary },
  emptyText: { fontSize: 16, color: PALETTE.textSecondary, textAlign: 'center', maxWidth: '80%', },
  
  // New styles for the Hint Toast
  hintToast: { position: 'absolute', bottom: 40, left: 20, right: 20, backgroundColor: 'rgba(20, 20, 20, 0.9)', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, },
  hintText: { color: '#FFFFFF', fontWeight: '500', fontSize: 14, flex: 1 },
});