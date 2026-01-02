import { Doc } from '@/convex/_generated/dataModel';
import { FontAwesome5, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics'; // CHANGED: Added Haptics
import { Image } from 'expo-image';
import { router } from 'expo-router'; // CHANGED: Added router for navigation
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'; // CHANGED: Added TouchableOpacity

// NEW: Modern color palette consistent with previous components
const PALETTE = {
  surface: '#FFFFFF',
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  star: '#FBBF24',
  primary: '#3B82F6', 
  travelerBadge: '#E0F2FE', 
  travelerText: '#0284C7', 
  requesterBadge: '#ECFDF5', 
  requesterText: '#059669', 
  subRatingIcon: '#9CA3AF',
};

// 👇 1. DEFINE the types for the StarDisplay component's props
type StarDisplayProps = {
  rating: number;
  size?: number;
};

// 👇 2. APPLY the types to the component's props
const StarDisplay = ({ rating, size = 14 }: StarDisplayProps) => (
  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
    {[1, 2, 3, 4, 5].map((star) => {
      const name = star <= rating ? 'star' : 'star-border';
      const color = star <= rating ? PALETTE.star : '#D1D5DB';
      return <MaterialIcons key={star} name={name} size={size} color={color} style={{ marginRight: -1 }} />;
    })}
  </View>
);

// Define the types for the props this component will receive
type ReviewItemProps = {
  item: {
    review: Doc<'reviews'>;
    reviewer: Doc<'users'> | null;
  };
};

const ReviewItem = ({ item }: ReviewItemProps) => {
  const { review, reviewer } = item;

  // CHANGED: Added check for hidden status to prevent rendering "bugged" or unwanted reviews
  if (!reviewer || review.status === 'hidden') {
    return null;
  }

  const reviewDate = new Date(review.createdAt || review._creationTime).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  // NEW: Navigation handler with Haptics
  const handleProfilePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/user/${reviewer._id}`);
  };

  const isTravelerReview = review.revieweeRole === 'traveler';
  
  const RoleBadge = () => (
    <View style={[
      styles.roleBadge, 
      isTravelerReview ? styles.roleBadgeTraveler : styles.roleBadgeRequester
    ]}>
      <FontAwesome5 
        name={isTravelerReview ? "plane" : "box-open"} 
        size={8} // Reduced slightly for better alignment
        color={isTravelerReview ? PALETTE.travelerText : PALETTE.requesterText} 
        style={{ marginRight: 4 }}
      />
      <Text style={[
        styles.roleBadgeText,
        isTravelerReview ? styles.roleBadgeTextTraveler : styles.roleBadgeTextRequester
      ]}>
        {isTravelerReview ? 'Traveler' : 'Requester'}
      </Text>
    </View>
  );

  const SubRating = ({ icon, label, value }: { icon: any, label: string, value?: number }) => {
    if (!value) return null;
    return (
      <View style={styles.subRatingContainer}>
        <MaterialCommunityIcons name={icon} size={14} color={PALETTE.subRatingIcon} style={{marginRight: 4}} />
        <Text style={styles.subRatingLabel}>{label}:</Text>
        <Text style={styles.subRatingValue}>{value.toFixed(1)}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        {/* CHANGED: Wrapped Image in TouchableOpacity for profile navigation */}
        <TouchableOpacity onPress={handleProfilePress} activeOpacity={0.7}>
            <Image 
              source={{ uri: reviewer.imageURL }} 
              style={styles.avatar} 
              contentFit="cover"
            />
        </TouchableOpacity>

        <View style={styles.headerText}>
          {/* CHANGED: Improved name row layout to handle long names */}
          <View style={styles.nameRow}>
            <Text 
                style={styles.name} 
                numberOfLines={1} 
                ellipsizeMode='tail'
            >
                {reviewer.fullname}
            </Text>
            <RoleBadge />
          </View>
          <Text style={styles.date}>{reviewDate}</Text>
        </View>
        
        {/* Main Rating - Big and Bold */}
        <View style={styles.mainRatingColumn}>
            <Text style={styles.bigRatingText}>{review.rating.toFixed(1)}</Text>
            <StarDisplay rating={review.rating} size={16} />
        </View>
      </View>

      <View style={styles.subRatingsRow}>
        {isTravelerReview ? (
          <>
            <SubRating icon="package-variant-closed" label="Condition" value={review.itemConditionRating} />
            <SubRating icon="clock-outline" label="Punctuality" value={review.punctualityRating} />
            <SubRating icon="message-outline" label="Comm" value={review.communicationRating} />
          </>
        ) : (
          <>
             <SubRating icon="message-outline" label="Communication" value={review.communicationRating} />
             <SubRating icon="clock-outline" label="Punctuality" value={review.punctualityRating} />
          </>
        )}
      </View>

      <View style={styles.divider} />

      {review.comment && (
        <Text style={styles.comment}>
          {review.comment}
        </Text>
      )}
    </View>
  );
};

// Styles updated for Modern UI/UX and Industry Standards
const styles = StyleSheet.create({
  container: {
    backgroundColor: PALETTE.surface,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.5)', 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center', // CHANGED: Ensures vertical center alignment of avatar and text
    marginBottom: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    backgroundColor: '#F3F4F6', 
  },
  headerText: {
    flex: 1, // Takes remaining space
    justifyContent: 'center',
    paddingRight: 8, // CHANGED: Added padding to prevent text hitting the rating stars
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    width: '100%', // CHANGED: Ensures container takes full width of parent
  },
  name: {
    fontWeight: '700',
    fontSize: 15,
    color: PALETTE.textPrimary,
    marginRight: 8,
    flexShrink: 1, // CHANGED: Critical for long names. Allows text to shrink before badge
  },
  date: {
    color: PALETTE.textSecondary,
    fontSize: 12,
  },
  
  // Badge Styles
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3, // CHANGED: increased slightly for better vertical centering
    borderRadius: 6,
    // CHANGED: Added flexShrink to badge to prevent it from vanishing on extremely small screens
    flexShrink: 0, 
  },
  roleBadgeTraveler: { backgroundColor: PALETTE.travelerBadge },
  roleBadgeRequester: { backgroundColor: PALETTE.requesterBadge },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    includeFontPadding: false, // CHANGED: Android fix for vertical text alignment
  },
  roleBadgeTextTraveler: { color: PALETTE.travelerText },
  roleBadgeTextRequester: { color: PALETTE.requesterText },

  // Main Rating Column Styles
  mainRatingColumn: {
      alignItems: 'flex-end',
      justifyContent: 'center',
      minWidth: 50, // CHANGED: Fixed width to prevent jitter
  },
  bigRatingText: {
      fontSize: 18,
      fontWeight: '800',
      color: PALETTE.textPrimary,
      lineHeight: 22,
  },

  // Sub-ratings Styles
  subRatingsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    marginBottom: 12,
  },
  subRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12, // CHANGED: Standardized spacing
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
  },
  subRatingLabel: {
    fontSize: 11,
    color: PALETTE.textSecondary,
    marginRight: 4,
    fontWeight: '500',
  },
  subRatingValue: {
    fontSize: 11,
    fontWeight: '700',
    color: PALETTE.textPrimary,
  },

  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginBottom: 12,
  },

  comment: {
    fontSize: 14,
    color: '#4B5563', 
    lineHeight: 22,
  },
});

export default ReviewItem;