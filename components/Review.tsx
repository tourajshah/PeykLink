import { Doc } from '@/convex/_generated/dataModel';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics'; // NEW: Imported Haptics
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Modern Light Theme Colors
const COLORS = {
  cardBg: '#FFFFFF',
  textPrimary: '#000000', // True black for high contrast
  textSecondary: '#8E8E93', // Standard iOS secondary gray
  accent: '#FFD60A', // Gold/Yellow for stars
  accentBg: 'rgba(255, 214, 10, 0.15)', // Transparent yellow
  buttonBg: '#1C1C1E', // Slightly off-black for a softer "modern" dark mode feel on light
  buttonText: '#FFFFFF',
  border: 'rgba(0, 0, 0, 0.05)', // Much subtler border for "Glass" feel
  shadow: '#000000',
  success: '#34C759', // Green for Price/Success
  subtleFill: '#F2F2F7', // For placeholders
};

type ReviewPromptProps = {
  negotiation: Doc<"negotiations">;
  // New Optional Props to make it "Informative" based on your Schema
  travelerName?: string; 
  productName?: string;
  productImageUrl?: string; // Derived from requests.imageKey
  userAvatarUrl?: string;   // Derived from users.imageURL
};

const ReviewPrompt = ({ 
    negotiation, 
    travelerName = "Traveler", // Default fallback
    productName = "your item", // Default fallback
    productImageUrl,
    userAvatarUrl
}: ReviewPromptProps) => {
  const router = useRouter();

  // Helper to format currency (assuming USD for now based on 'proposedFee')
  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0, // Industry Standard: Remove .00 if not needed for cleaner look
    maximumFractionDigits: 0,
  }).format(negotiation.proposedFee || 0);

  const handlePress = () => {
    // NEW: Haptic feedback for "Tactile" experience
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    router.push({
        pathname: '/(stack)/review', 
        params: { negotiationId: negotiation._id }
    });
  };

  return (
    <View style={styles.container}>
        {/* Header Section: User Info & Status */}
        <View style={styles.headerRow}>
            <View style={styles.userInfo}>
                {/* User Avatar or Fallback Icon */}
                <View style={styles.avatarContainer}>
                    {userAvatarUrl ? (
                        <Image source={{ uri: userAvatarUrl }} style={styles.avatarImage} />
                    ) : (
                        <Ionicons name="person" size={12} color={COLORS.textSecondary} />
                    )}
                </View>
                {/* UPDATED: Added flex-shrink to handle long names gracefully */}
                <Text style={styles.userNameText} numberOfLines={1} ellipsizeMode="tail">
                    Review <Text style={styles.boldName}>{travelerName}</Text>
                </Text>
            </View>
            
            {/* Price Badge */}
            <View style={styles.priceBadge}>
                <Text style={styles.priceText}>{formattedPrice}</Text>
            </View>
        </View>

        {/* Divider - Made subtler */}
        <View style={styles.divider} />

        {/* Main Content: Product Context */}
        <View style={styles.contentContainer}>
            {/* Product Image or Icon Box */}
            <View style={styles.iconBox}>
                {productImageUrl ? (
                     <Image source={{ uri: `https://ts79.space/${productImageUrl}`  }} style={styles.productImage} />
                ) : (
                     <Ionicons name="cube-outline" size={20} color={COLORS.textSecondary} />
                )}
            </View>
            
            <View style={styles.textStack}>
                 <Text style={styles.title}>Order Completed</Text>
                 <Text style={styles.subtitle} numberOfLines={1} ellipsizeMode="tail">
                    How was <Text style={{color: COLORS.textPrimary}}>{productName}</Text>?
                 </Text>
            </View>
        </View>

        {/* Footer: Action Button */}
        <TouchableOpacity 
            style={styles.actionButton}
            activeOpacity={0.8} // Higher opacity for "Solid" feel
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={handlePress}
        >
            <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((_, i) => (
                    <Ionicons key={i} name="star" size={10} color={COLORS.accent} />
                ))}
            </View>
            <Text style={styles.actionButtonText}>Rate Experience</Text> 
            <Ionicons name="arrow-forward" size={14} color={COLORS.buttonText} />
        </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.cardBg,
    padding: 14, // Reduced from 16 for a more compact, sleek feel
    // REMOVED: External margins/radius/shadow to let the parent container control layout
    // This fixes the "double box" look when inside InboxScreen
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1, // Takes available space to prevent pushing PriceBadge
    marginRight: 8, // Spacing from PriceBadge
  },
  avatarContainer: {
    width: 24, // Smaller, minimalist avatar
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.subtleFill,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 0.5, // Tiny border for definition
    borderColor: 'rgba(0,0,0,0.05)',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  userNameText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
    flexShrink: 1, // Allows text to shrink if needed
  },
  boldName: {
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  priceBadge: {
    backgroundColor: '#F2FCF5', // Very light green
    paddingHorizontal: 8,
    paddingVertical: 3, // Thinner badge
    borderRadius: 6,
    // Removed border for cleaner "Flat" look, kept background
  },
  priceText: {
    fontSize: 11, // Smaller, discrete
    fontWeight: '600',
    color: COLORS.success,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 12,
    opacity: 0.6, // Softer divider
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14, // Reduced margin
  },
  iconBox: {
    width: 42, // Slightly smaller
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.subtleFill,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  textStack: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 4, // Safety padding
  },
  title: {
    fontSize: 15, // Slightly refined size
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 16,
    fontWeight: '400',
  },
  actionButton: {
    backgroundColor: COLORS.buttonBg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10, // Compact height
    paddingHorizontal: 14,
    borderRadius: 14,
    // Subtle shadow for the button to make it "pop"
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 1, // Tighter gap for stars
    opacity: 0.9,
  },
  actionButtonText: {
    color: COLORS.buttonText,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.1,
    textAlign: 'center',
    flex: 1,
  },
});

export default ReviewPrompt;