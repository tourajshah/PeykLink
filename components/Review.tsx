import { Doc } from '@/convex/_generated/dataModel';
import { useRouter } from 'expo-router';
import React from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';

type ReviewPromptProps = {
  negotiation: Doc<"negotiations">
};

const ReviewPrompt = ({ negotiation }: ReviewPromptProps) => {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Review your recent deal!</Text>
      <Text>Please share feedback on your experience.</Text>
      <Button 
        title="Leave a Review"
        onPress={() => router.push({pathname: '/(stack)/review', params: { negotiationId: negotiation._id }})}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 15,
    backgroundColor: '#eef2ff',
    marginHorizontal: 10,
    marginBottom: 10,
    borderRadius: 8
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 5
  }
});

// Make the component available to other files
export default ReviewPrompt;