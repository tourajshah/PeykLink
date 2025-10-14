import { Loader } from '@/components/Loader';
import ReviewItem from '@/components/ReviewItem'; // Assuming you have this component
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// --- Color Palette ---
// Added here for a self-contained example
const COLORS = {
  surface: '#FFFFFF',
  shadow: 'rgba(100, 100, 111, 0.15)',
  primary: '#3B82F6',
  secondary: '#10B981',
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
};

// --- Helper Function ---
// Formats the timestamp into a readable "Month Year" format
const formatJoinDate = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
};


export default function UserProfileScreen() {

    const {id} = useLocalSearchParams();
    const router = useRouter();
    
    // --- Data Fetching ---
    const profile = useQuery(api.users.getUserProfile, {id: id as Id<"users">});
    const userStats = useQuery(api.users.getUserStats, profile ? {id: profile._id} : 'skip');
    // Added reviews query for a more complete profile
    const reviews = useQuery(api.reviews.getUserReviews, profile ? {id: profile._id} : 'skip');


    // Updated loading state to wait for all data
    if(!profile || !userStats || !reviews) return <Loader />

    return (
        <View style={styles.container}>
            {/* HEADER */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.headerIcon} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={26} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{profile.fullname}</Text>
                {/* Placeholder for a "more options" button, maintains balance */}
                <TouchableOpacity style={styles.headerIcon}>
                    <Ionicons name="ellipsis-horizontal" size={26} color={COLORS.textPrimary} />
                </TouchableOpacity>
            </View>
        
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContentContainer}>
                {/* PROFILE INFO CARD */}
                <View style={styles.profileCard}>
                    <View style={styles.profileHeader}>
                        <Image
                            source={profile.imageURL}
                            style={styles.avatar}
                            contentFit="cover"
                            transition={200}
                        />
                        <View style={styles.profileHeaderText}>
                            <View style={styles.nameContainer}>
                                <Text style={styles.name}>{profile.fullname}</Text>
                                {/* Placeholder for the verified badge */}
                                <View style={styles.verifiedBadge}>
                                    <Ionicons name="checkmark-circle" size={22} color={COLORS.secondary} />
                                </View>
                            </View>
                            <Text style={styles.username}>@{profile.username}</Text>
                        </View>
                    </View>
                    
                    {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}

                    {/* STATS CONTAINER */}
                    <View style={styles.statsContainer}>
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>{userStats.userCompletedOrders}</Text>
                            <Text style={styles.statLabel}>Deals</Text>
                        </View>
                        <View style={styles.statSeparator} />
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>
                                <Ionicons name="star" size={16} color="#FFC700" /> {userStats.userRating.toFixed(1)}
                            </Text>
                            <Text style={styles.statLabel}>Rating</Text>
                        </View>
                        <View style={styles.statSeparator} />
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>{formatJoinDate(userStats.userCreationTime)}</Text>
                            <Text style={styles.statLabel}>Joined</Text>
                        </View>
                    </View>

                    {/* ACTION BUTTONS */}
                </View>

                {/* USER'S REVIEWS */}
                <FlatList
                    data={reviews}
                    scrollEnabled={false}
                    keyExtractor={(item) => item.review._id}
                    renderItem={({ item }) => <ReviewItem item={item} />}
                    ListHeaderComponent={() => (
                        reviews && reviews.length > 0 ? (
                           <Text style={styles.reviewsTitle}>Feedback & Reviews</Text>
                        ) : null
                    )}
                    ListEmptyComponent={() => (
                        <View style={styles.emptyReviewsContainer}>
                            <Text style={styles.reviewsTitle}>Feedback & Reviews</Text>
                            <Text style={styles.emptyReviewsText}>No reviews yet for {profile.fullname}.</Text>
                        </View>
                    )}
                />
            </ScrollView>
        </View>      
    )
}

// --- Stylesheet ---
// A consistent, modern stylesheet for the public profile view.
const styles = StyleSheet.create({
  // --- Main Container ---
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  scrollContentContainer: {
    padding: 16,
    paddingTop: 8,
  },

  // --- Header ---
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12, // Adjust for safe area
    paddingBottom: 12,
    backgroundColor: '#F7F8FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  headerIcon: {
    padding: 4,
  },

  // --- Profile Info Card ---
  profileCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  profileHeaderText: {
    marginLeft: 16,
    flex: 1,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  verifiedBadge: {
    marginLeft: 8,
  },
  username: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  bio: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: 20,
  },

  // --- Stats Display ---
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F7F8FA',
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statSeparator: {
    width: 1,
    backgroundColor: '#E5E7EB',
    height: '100%',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  // --- Action Buttons ---
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  messageButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  messageButtonText: {
    color: COLORS.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  iconButton: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },

  // --- Reviews Section ---
  reviewsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  emptyReviewsContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
  },
  emptyReviewsText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
});