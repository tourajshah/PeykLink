import { Loader } from "@/components/Loader";
import Request from "@/components/Request";
import Story from "@/components/Story";
import Trip from "@/components/Trip";
import { STORIES } from "@/constants/mock-data";
import { COLORS } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { useState } from "react";
import { FlatList, ListRenderItemInfo, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { styles } from "../../styles/feed.styles";


export default function Index() {
  const {signOut}=useAuth()
  const [activeTab, setActiveTab] = useState<'trips' | 'requests'>('trips')


  const trips = useQuery(api.trips.getFeedTrips)
  const requests = useQuery(api.requests.getFeedRequests)

  if(trips === undefined || requests === undefined) return <Loader />

  type TripType = (typeof trips)[number];
  type RequestType = (typeof requests)[number];
  type FeedItem = TripType | RequestType;
  
  const isTripsActive = activeTab === 'trips';
  const dataToRender = isTripsActive ? trips : requests;
  const noData = dataToRender.length === 0


  const renderFeedItem = ({ item }: ListRenderItemInfo<FeedItem>) => {
    if (isTripsActive) {
      return <Trip trip={item as TripType} />;
    }
    return <Request request={item as RequestType} />;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>PeykLink</Text>
        <TouchableOpacity onPress={() => signOut()}>
          <Ionicons name="log-out-outline" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>


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
        

      <FlatList 
        data={dataToRender}
        renderItem={renderFeedItem}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle = {{ paddingBottom: 60 }}
        ListEmptyComponent={<NoItemsFound type={activeTab} />}
        ListHeaderComponent={<StoriesSection />}
      />
    </View>
  );
}

const StoriesSection = () => {
  return (
    <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.storiesContainer}
      >
        {STORIES.map((story) => (
          <Story key={story.id} story={story} />
        ))}
      </ScrollView>
  )
}

const NoItemsFound = ({ type }: { type: 'trips' | 'requests' }) => (
  <View
    style={{
      height: 400, 
      backgroundColor: COLORS.background,
      justifyContent: 'center',
      alignItems: 'center',
    }}
  >
    <Text style={{ fontSize: 28, color: COLORS.primary }}>
      {`No ${type} yet`}
    </Text>
  </View>
);
