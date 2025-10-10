import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Button,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Toast from 'react-native-toast-message';

// 👇 FIXED: Added a 'type' for the component's props
type StarRatingProps = {
  rating: number;
  setRating: (rating: number) => void;
  size?: number;
};

// A simple, reusable star rating component
const StarRating = ({ rating, setRating, size = 32 }: StarRatingProps) => {
  return (
    <View style={styles.starContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity key={star} onPress={() => setRating(star)}>
          <Text style={{ fontSize: size, color: star <= rating ? '#FFD700' : '#d1d5db' }}>
            ★
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const ReviewScreen = () => {
  const router = useRouter();
  const { negotiationId } = useLocalSearchParams<{ negotiationId: string }>();
  
  const [overallRating, setOverallRating] = useState(0);
  const [communicationRating, setCommunicationRating] = useState(0);
  const [punctualityRating, setPunctualityRating] = useState(0);
  const [itemConditionRating, setItemConditionRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reviewDetails = useQuery(
    api.reviews.getDetailsForReview,
    negotiationId ? { negotiationId: negotiationId as Id<'negotiations'> } : 'skip'
  );

  const createReview = useMutation(api.reviews.createReview);

  const handleSubmitReview = async () => {
    if (overallRating === 0) {
      Alert.alert('Overall Rating Required', 'Please provide an overall star rating.');
      return;
    }
    setIsSubmitting(true);
    try {
      await createReview({
        negotiationId: negotiationId as Id<'negotiations'>,
        overallRating,
        communicationRating,
        punctualityRating,
        itemConditionRating,
        comment: comment || undefined,
      });
      Toast.show({
        type: 'success',
        text1: 'Review Submitted!',
        text2: 'Thank you for your feedback.',
      });
      router.back();
    } catch (error) {
      Alert.alert('Error', (error as Error).message || 'Failed to submit review. Please try again.');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!reviewDetails) {
    return <ActivityIndicator style={styles.loader} size="large" />;
  }

  // With the backend fixed, these types will now be correct
  const { otherUser, request, isReviewingTraveler } = reviewDetails;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Leave a Review</Text>
        <Text style={styles.subtitle}>
          How was your deal with <Text style={styles.bold}>{otherUser.fullname}</Text> for the{' '}
          <Text style={styles.bold}>{request.productName}</Text>?
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Overall Rating*</Text>
        <StarRating rating={overallRating} setRating={setOverallRating} size={40} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Detailed Feedback (Optional)</Text>
        <View style={styles.criteriaRow}>
          <Text>Communication</Text>
          <StarRating rating={communicationRating} setRating={setCommunicationRating} size={28} />
        </View>
        <View style={styles.criteriaRow}>
          <Text>Punctuality</Text>
          <StarRating rating={punctualityRating} setRating={setPunctualityRating} size={28} />
        </View>
        {isReviewingTraveler && (
          <View style={styles.criteriaRow}>
            <Text>Item Condition</Text>
            <StarRating rating={itemConditionRating} setRating={setItemConditionRating} size={28} />
          </View>
        )}
      </View>

      <TextInput
        style={styles.commentInput}
        placeholder="Share more details about your experience..."
        multiline
        value={comment}
        onChangeText={setComment}
      />
      
      <Button
        title={isSubmitting ? 'Submitting...' : 'Submit Review'}
        onPress={handleSubmitReview}
        disabled={overallRating === 0 || isSubmitting}
      />
    </View>
  );
};

// Styles remain the same
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8fafc',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    color: '#475569',
    textAlign: 'center',
    marginTop: 8,
  },
  bold: {
    fontWeight: '600',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  starContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  criteriaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  commentInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 15,
    minHeight: 100,
    textAlignVertical: 'top',
    fontSize: 16,
    marginBottom: 20,
  },
});

export default ReviewScreen;