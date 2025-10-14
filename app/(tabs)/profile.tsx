import { Loader } from '@/components/Loader';
import ReviewItem from '@/components/ReviewItem';
import { api } from '@/convex/_generated/api';
import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import { Image } from "expo-image";
import React, { useEffect, useState } from 'react';
import { FlatList, Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';

// Helper function to format the timestamp
const formatJoinDate = (timestamp: number) => {
  const date = new Date(timestamp);
  // Formats the date to "Mon Year", e.g., "Oct 2025"
  return date.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
};


const COLORS = {
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

export default function Profile() {

  const { signOut, userId } = useAuth()
  const [ isEditModalVisible, setIsEditModalVisible ] = useState(false)

  // GET NUMBER OF ACTIVE REQUESTS AND TRIPS OF THE USER 
  // const myRequests = useQuery(api.requests.getMyRequests);
  

  const currentUser = useQuery(api.users.getUserByClerkId, userId ? { clerkId: userId } : "skip")
  const reviews = useQuery(api.reviews.getUserReviews, currentUser ? {id: currentUser._id} : "skip")
  const userStats = useQuery(api.users.getUserStats, currentUser ? { id: currentUser._id } : 'skip')

  const [editedProfile, setEditedProfile] = useState({
    fullname: currentUser?.fullname || "",
    bio: currentUser?.bio || "",
  })

  useEffect(() => {
    if (currentUser) {
      setEditedProfile({
        fullname: currentUser.fullname || "",
        bio: currentUser.bio || "",
      });
    }
  }, [currentUser]);

  const updateProfile = useMutation(api.users.updateProfile)

  const handleSaveProfile = async () => {
    await updateProfile(editedProfile);
    setIsEditModalVisible(false);
  }

  if (!currentUser || !userStats)  return <Loader />

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity style={styles.headerIcon} onPress={() => signOut()}>
          <Ionicons name="log-out-outline" size={26} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContentContainer}>
        {/* PROFILE INFO CARD */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <Image
              source={currentUser?.imageURL}
              style={styles.avatar}
              contentFit="cover"
              transition={200}
            />
            <View style={styles.profileHeaderText}>
              <View style={styles.nameContainer}>
                <Text style={styles.name}>{currentUser?.fullname}</Text>
                {/* This is the placeholder for the verified badge. 
                  You would need a field like `currentUser.isVerified` from your backend.
                */}
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={22} color={COLORS.secondary} />
                </View>
              </View>
              <Text style={styles.username}>@{currentUser.username}</Text>
            </View>
          </View>
          
          {currentUser.bio && <Text style={styles.bio}>{currentUser.bio}</Text>}

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
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.editButton} onPress={() => setIsEditModalVisible(true)}>
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="share-outline" size={22} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ADD REVIEWS OF THE USER HERE , AND MAKE A FUNC*/}

        <FlatList
          data={reviews}
          scrollEnabled={false} // Keeps the ScrollView in control
          keyExtractor={(item) => item.review._id}
          renderItem={({ item }) => <ReviewItem item={item} />} // This is the "recipe"
          ListHeaderComponent={() => (
            // Adds a title above the reviews list
            reviews && reviews.length > 0 ? (
               <Text style={styles.reviewsTitle}>Feedback & Reviews</Text>
            ) : null
          )}
          ListEmptyComponent={() => (
            // Shows a message if there are no reviews
            <View style={styles.emptyReviewsContainer}>
                <Text style={styles.reviewsTitle}>Feedback & Reviews</Text>
                <Text style={styles.emptyReviewsText}>No reviews yet.</Text>
            </View>
          )}
        />
      </ScrollView>

      {/* EDIT PROFILE MODAL */}

      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        transparent={true} 
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalContainer}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Profile</Text>
                <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                  <Ionicons name="close" size={28} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  value={editedProfile.fullname}
                  onChangeText={(text) => setEditedProfile((prev) => ({ ...prev, fullname: text }))}
                  placeholder="Enter your full name"
                  placeholderTextColor={COLORS.textSecondary}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Bio</Text>
                <TextInput
                  style={[styles.input, styles.bioInput]}
                  value={editedProfile.bio}
                  onChangeText={(text) => setEditedProfile((prev) => ({ ...prev, bio: text }))}
                  multiline
                  numberOfLines={4}
                  placeholder="Tell us a bit about yourself"
                  placeholderTextColor={COLORS.textSecondary}
                />
              </View>

              <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal> 
    </View>
  )
}

export const styles = StyleSheet.create({
  // --- Main Container ---
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA', // Use the lighter gradient color for background
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
    fontSize: 22,
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
  editButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  editButtonText: {
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
    paddingVertical: 20,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
  },
  emptyReviewsText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 8,
  },

  // --- Edit Profile Modal ---
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    padding: 24,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F7F8FA',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    fontSize: 16,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    color: COLORS.surface,
    fontSize: 16,
    fontWeight: 'bold',
  },
});