import { Doc } from '@/convex/_generated/dataModel';
import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

// 👇 1. DEFINE the types for the StarDisplay component's props
type StarDisplayProps = {
  rating: number;
  size?: number;
};

// 👇 2. APPLY the types to the component's props
const StarDisplay = ({ rating, size = 16 }: StarDisplayProps) => (
  <View style={{ flexDirection: 'row' }}>
    {[1, 2, 3, 4, 5].map((star) => (
      <Text key={star} style={{ fontSize: size, color: star <= rating ? '#FFD700' : '#d1d5db' }}>
        ★
      </Text>
    ))}
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

  if (!reviewer) {
    return null;
  }

  const reviewDate = new Date(review._creationTime).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={reviewer.imageURL} style={styles.avatar} />
        <View style={styles.headerText}>
          <Text style={styles.name}>{reviewer.fullname}</Text>
          <Text style={styles.date}>{reviewDate}</Text>
        </View>
        <StarDisplay rating={review.rating} />
      </View>
      {review.comment && <Text style={styles.comment}>{review.comment}</Text>}
    </View>
  );
};

// Styles remain the same
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 15,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  name: {
    fontWeight: '600',
    fontSize: 16,
  },
  date: {
    color: '#64748b',
    fontSize: 12,
  },
  comment: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
  },
});

export default ReviewItem;