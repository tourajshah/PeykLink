import { Loader } from '@/components/Loader';
import Request from "@/components/Request";
import Trip from "@/components/Trip";
import { api } from '@/convex/_generated/api';
import { Feather } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, ListRenderItemInfo, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// 1. A sharp, modern, monochromatic palette for a timeless "digital slate" feel
const PALETTE = {
  background: '#0D0D0D', // Near-black for a deep, focused background
  surface: '#1C1C1C',    // Dark charcoal for secondary elements
  surfaceInverted: '#FFFFFF', // Pure white for the primary "hero" elements
  primary: '#007AFF',    // A vibrant, electric blue for key highlights
  textPrimary: '#FFFFFF',
  textSecondary: '#A1A1A1',
  textOnInverted: '#0D0D0D', // Black text on white surfaces
  border: '#333333',
};

export default function Create() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'trips' | 'requests'>('trips');

  const myTrips = useQuery(api.trips.getMyTrips);
  const myRequests = useQuery(api.requests.getMyRequests);

  if (myTrips === undefined || myRequests === undefined) {
    return <Loader />;
  }

  type TripType = NonNullable<typeof myTrips>[number];
  type RequestType = NonNullable<typeof myRequests>[number];

  const isTripsActive = activeTab === 'trips';
  const dataToRender = isTripsActive ? myTrips : myRequests;

  const renderFeedItem = ({ item }: ListRenderItemInfo<TripType | RequestType>) => {
    if (isTripsActive) {
      return <Trip trip={item as TripType} />;
    }
    return <Request request={item as RequestType} />;
  };

  const ListHeader = () => (
    <>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Start Something New</Text>
        <Text style={styles.subHeader}>Your next adventure or request begins here.</Text>
      </View>
      <View style={styles.separator} />

      {/* 2. Inverted hierarchy cards for a powerful focal point */}
      <View style={styles.cardsContainer}>
        {/* The "Hero" Action Card */}
        <TouchableOpacity
          style={[styles.card, styles.primaryCard]}
          onPress={() => router.navigate("/trips")}
          activeOpacity={0.85}
        >
          <View style={[styles.iconContainer, { backgroundColor: '#F0F0F0' }]}>
            <Feather name="map-pin" size={24} color={PALETTE.textOnInverted} />
          </View>
          <Text style={[styles.cardTitle, { color: PALETTE.textOnInverted }]}>Plan a New Trip</Text>
          <Feather name="arrow-right" style={styles.cardArrow} color={PALETTE.textOnInverted} />
        </TouchableOpacity>

        {/* The Secondary Action Card */}
        <TouchableOpacity
          style={[styles.card, styles.secondaryCard]}
          onPress={() => router.navigate("/orders")}
          activeOpacity={0.85}
        >
          <View style={[styles.iconContainer, { backgroundColor: '#2C2C2C' }]}>
            <Feather name="package" size={24} color={PALETTE.textPrimary} />
          </View>
          <Text style={styles.cardTitle}>Request an Item</Text>
          <Feather name="arrow-right" style={styles.cardArrow} color={PALETTE.textPrimary} />
        </TouchableOpacity>
      </View>
      
      <Text style={styles.listTitle}>Active Posts</Text>
      {/* 3. Perfected, robust Segmented Control that guarantees text centering */}
      <View style={styles.segmentedControlContainer}>
        <TouchableOpacity 
          style={[styles.segmentedTab, isTripsActive && styles.activeTab]} 
          onPress={() => setActiveTab('trips')}
        >
          <Text style={[styles.tabText, isTripsActive && styles.activeTabText]}>My Trips</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.segmentedTab, !isTripsActive && styles.activeTab]} 
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[styles.tabText, !isTripsActive && styles.activeTabText]}>My Requests</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  return (
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
          <Feather name="inbox" size={40} color={PALETTE.border} />
          <Text style={styles.emptyTitle}>Nothing here yet</Text>
          <Text style={styles.emptyText}>
            {`Your active ${isTripsActive ? 'trips' : 'requests'} will be displayed here.`}
          </Text>
        </View>
      }
      // 4. Bottom padding adjusted for a perfect fit
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 80 }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PALETTE.background },
  headerContainer: { paddingTop: 70, paddingBottom: 24 },
  header: { fontSize: 32, fontWeight: '600', color: PALETTE.textPrimary },
  subHeader: { fontSize: 16, color: PALETTE.textSecondary, marginTop: 8 },
  separator: { height: 1, backgroundColor: PALETTE.border, marginBottom: 32 },
  cardsContainer: { flexDirection: 'row', marginBottom: 48, gap: 16 },
  card: {
    flex: 1,
    borderRadius: 24,
    padding: 20,
    minHeight: 180,
    borderWidth: 1,
    borderColor: PALETTE.border,
  },
  primaryCard: { backgroundColor: PALETTE.surfaceInverted },
  secondaryCard: { backgroundColor: PALETTE.surface },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: { fontSize: 18, fontWeight: '600', color: PALETTE.textPrimary },
  cardArrow: { position: 'absolute', bottom: 20, right: 20, fontSize: 24 },
  listTitle: { fontSize: 22, fontWeight: '600', color: PALETTE.textPrimary, marginBottom: 16, paddingHorizontal: 4 },
  segmentedControlContainer: {
    flexDirection: 'row',
    backgroundColor: PALETTE.surface,
    borderRadius: 16,
    height: 54,
    padding: 6,
    marginBottom: 24,
  },
  segmentedTab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  activeTab: { backgroundColor: PALETTE.background },
  tabText: { fontSize: 15, fontWeight: '600', color: PALETTE.textSecondary },
  activeTabText: { color: PALETTE.primary },
  listSeparator: { height: 1, width: '100%', backgroundColor: PALETTE.border },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 16,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: PALETTE.textPrimary },
  emptyText: {
    fontSize: 16,
    color: PALETTE.textSecondary,
    textAlign: 'center',
    maxWidth: '80%',
  },
});