import { Loader } from '@/components/Loader';
import Request from "@/components/Request";
import Trip from "@/components/Trip";
import { COLORS } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import { Feather } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, ListRenderItemInfo, StyleSheet, Text, TouchableOpacity, View } from 'react-native';


export default function Create() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'trips' | 'requests'>('trips');

  // 1. Fetch the user's own data, not the general feed
  const myTrips = useQuery(api.trips.getMyTrips);
  const myRequests = useQuery(api.requests.getMyRequests);

  // Show a loader while data is being fetched for the first time
  if (myTrips === undefined || myRequests === undefined) {
    return <Loader />;
  }

  // 2. Define types based on the correct query return types for type safety
  type TripType = NonNullable<typeof myTrips>[number];
  type RequestType = NonNullable<typeof myRequests>[number];
  
  const isTripsActive = activeTab === 'trips';
  const dataToRender = isTripsActive ? myTrips : myRequests;

  // Render function for each item in the FlatList
  const renderFeedItem = ({ item }: ListRenderItemInfo<TripType | RequestType>) => {
    if (isTripsActive) {
      return <Trip trip={item as TripType} />;
    }
    return <Request request={item as RequestType} />;
  };

  // Header component that contains everything above the list
  const ListHeader = () => (
    <>
      <Text style={styles.header}>Create & Manage</Text>
      <Text style={styles.subHeader}>Choose an option to create a new post or see your existing ones below.</Text>

      {/* Card for creating a new trip */}
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.navigate("/trips")}
      >
        <Feather name="map-pin" size={32} color="#fff" />
        <View style={styles.cardTextContainer}>
          <Text style={styles.cardTitle}>Create a Trip</Text>
          <Text style={styles.cardDescription}>Organize and share your travel plans.</Text>
        </View>
      </TouchableOpacity>

      {/* Card for creating a new request/order */}
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.navigate("/orders")}
      >
        <Feather name="package" size={32} color="#fff" />
        <View style={styles.cardTextContainer}>
          <Text style={styles.cardTitle}>Post a Request</Text>
          <Text style={styles.cardDescription}>Request items you need from travelers.</Text>
        </View>
      </TouchableOpacity>

      {/* 3. Tab switcher for the user's posts */}
      <View style={styles.listHeaderContainer}>
        <Text style={styles.listHeader}>My Active Posts</Text>
      </View>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, isTripsActive && styles.activeTab]}
          onPress={() => setActiveTab('trips')}
        >
          <Text style={[styles.tabText, isTripsActive && styles.activeTabText]}>My Trips</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, !isTripsActive && styles.activeTab]}
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[styles.tabText, !isTripsActive && styles.activeTabText]}>My Requests</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    // 4. Use FlatList as the main scrollable container
    <FlatList
      style={styles.container}
      data={dataToRender}
      renderItem={renderFeedItem}
      keyExtractor={(item) => item._id}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={ListHeader}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {`You have no active ${isTripsActive ? 'trips' : 'requests'}.`}
          </Text>
        </View>
      }
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 60 }}
    />
  );
}

// StyleSheet for all the components on this screen
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
    paddingTop: 60,
  },
  subHeader: {
    fontSize: 16,
    color: '#a0a0a0',
    textAlign: 'center',
    marginBottom: 40,
  },
  card: {
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
    elevation: 8,
  },
  cardTextContainer: {
    marginLeft: 20,
    flex: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  cardDescription: {
    fontSize: 14,
    color: '#a0a0a0',
    marginTop: 4,
  },
  listHeaderContainer: {
    marginTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  listHeader: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#1e1e1e',
    borderRadius: 30,
    marginVertical: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 30,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    color: '#a0a0a0',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#fff',
  },
  emptyContainer: {
    height: 200, 
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#a0a0a0',
  },
});
