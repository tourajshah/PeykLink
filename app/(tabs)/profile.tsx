import { Loader } from '@/components/Loader';
import ReviewItem from '@/components/ReviewItem';
import { COLORS } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import { styles } from '@/styles/profile.styles';
import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import { Image } from "expo-image";
import React, { useEffect, useState } from 'react';
import { FlatList, Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';

export default function Profile() {

  const { signOut, userId } = useAuth()
  const [ isEditModalVisible, setIsEditModalVisible ] = useState(false)

  // GET NUMBER OF ACTIVE REQUESTS AND TRIPS OF THE USER 
  // const myRequests = useQuery(api.requests.getMyRequests);
  

  const currentUser = useQuery(api.users.getUserByClerkId, userId ? { clerkId: userId } : "skip")
  const reviews = useQuery(api.reviews.getUserReviews)

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

  if (!currentUser)  return <Loader />

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.username}>{currentUser.username}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIcon} onPress={() => signOut()}>
            <Ionicons name="log-out-outline" size={24} color={COLORS.white} />
          </TouchableOpacity>

        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.profileInfo}>

          {/* AVATAR AND STATS  */}

          <View style={styles.avatarAndStats}>
            <View style={styles.avatarContainer}>
              <Image
                source={currentUser?.imageURL}
                style={styles.avatar}
                contentFit="cover"
                transition={200}
              />
            </View>

            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>200</Text>
                <Text style={styles.statLabel}>Trips</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>600</Text>
                <Text style={styles.statLabel}>Request</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>200</Text>
                <Text style={styles.statLabel}>deals</Text>
              </View>
            </View>
          </View>
          <Text style={styles.name}>{currentUser?.fullname}</Text>
          {currentUser.bio && <Text style={styles.bio}>{currentUser.bio}</Text>}

          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.editButton} onPress={() => setIsEditModalVisible(true)}>
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity>
              <Ionicons name="share-outline" size={20} color={COLORS.white} />
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
               <Text style={styles.reviewsTitle}>What Others Are Saying</Text>
            ) : null
          )}
          ListEmptyComponent={() => (
            // Shows a message if there are no reviews
            <View style={styles.emptyReviewsContainer}>
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
                  <Ionicons name="close" size={24} color={COLORS.white} />
                </TouchableOpacity>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Name</Text>
                <TextInput
                  style={styles.input}
                  value={editedProfile.fullname}
                  onChangeText={(text) => setEditedProfile((prev) => ({ ...prev, fullname: text }))}
                  placeholderTextColor={COLORS.grey}
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
                  placeholderTextColor={COLORS.grey}
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