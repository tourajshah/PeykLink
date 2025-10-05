import React from 'react';
import { Text, View } from 'react-native';



const PALETTE = {
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


export default function Ex() {
  return (
    <View>
      <Text>Market</Text>
    </View>
  )
}