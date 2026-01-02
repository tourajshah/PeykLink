// app/review/[negotiationId].tsx (or wherever your file is)

import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Toast from 'react-native-toast-message';

// --- Colors Palette ---
const COLORS = {
    primary: '#007AFF',
    background: '#F2F2F7',
    card: '#FFFFFF',
    textPrimary: '#1C1C1E',
    textSecondary: '#8E8E93',
    border: '#E5E5EA',
    starFilled: '#FFD700',
    starEmpty: '#E5E5EA',
};

// --- Star Rating Component ---
type StarRatingProps = {
    rating: number;
    setRating: (rating: number) => void;
    size?: number;
};

const StarRating = ({ rating, setRating, size = 32 }: StarRatingProps) => {
    
    const handlePress = (star: number) => {
        // Haptic feedback on selection
        Haptics.selectionAsync(); 
        setRating(star);
    };

    return (
        <View style={styles.starContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity 
                    key={star} 
                    onPress={() => handlePress(star)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
                >
                    <Text style={{ 
                        fontSize: size, 
                        color: star <= rating ? COLORS.starFilled : COLORS.starEmpty,
                        textShadowColor: star <= rating ? 'rgba(255, 215, 0, 0.3)' : 'transparent',
                        textShadowOffset: { width: 0, height: 2 },
                        textShadowRadius: 4
                    }}>
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
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Rating Required', 'Please tap the stars to rate your experience.');
            return;
        }

        setIsSubmitting(true);
        Keyboard.dismiss();

        // Prepare conditional data
        // If reviewing a requester, itemConditionRating is irrelevant (undefined)
        const finalItemCondition = reviewDetails?.isReviewingTraveler ? itemConditionRating : undefined;

        try {
            await createReview({
                negotiationId: negotiationId as Id<'negotiations'>,
                rating: overallRating, 
                communicationRating: communicationRating || undefined,
                punctualityRating: punctualityRating || undefined,
                itemConditionRating: finalItemCondition || undefined, // Only send if Traveler
                comment: comment || undefined,
                status: 'hidden', 
            });

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            
            Toast.show({
                type: 'success',
                text1: 'Review Submitted',
                text2: 'Thanks for helping the community!',
            });
            
            router.back();
        } catch (error) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Error', 'Failed to submit review. Please try again.');
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!reviewDetails) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    const { otherUser, request, isReviewingTraveler } = reviewDetails;

    // --- Dynamic Text Helpers ---
    const headerQuestion = isReviewingTraveler 
        ? `How was your delivery from ${otherUser.fullname}?`
        : `How was your experience with ${otherUser.fullname}?`;
    
    const subText = isReviewingTraveler
        ? `Request: ${request.productName}`
        : `Transaction for: ${request.productName}`;

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                {/* Header Card */}
                <View style={styles.card}>
                    <View style={styles.userInfo}>
                        <Image source={{ uri: otherUser.imageURL }} style={styles.avatar} contentFit="cover" />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.questionText}>
                                {headerQuestion}
                            </Text>
                            <Text style={styles.productText}>
                                {subText}
                            </Text>
                        </View>
                    </View>
                    
                    <View style={styles.divider} />
                    
                    <View style={styles.mainRatingSection}>
                        <Text style={styles.mainRatingLabel}>OVERALL RATING</Text>
                        <StarRating rating={overallRating} setRating={setOverallRating} size={48} />
                        <Text style={styles.ratingHint}>
                            {overallRating === 5 ? "Excellent!" : 
                             overallRating === 4 ? "Very Good" :
                             overallRating === 3 ? "It was okay" :
                             overallRating === 2 ? "Could be better" :
                             overallRating === 1 ? "Poor" : "Tap stars to rate"}
                        </Text>
                    </View>
                </View>

                {/* Detailed Feedback Section */}
                <View style={styles.card}>
                    <Text style={styles.sectionHeader}>
                        {isReviewingTraveler ? "Delivery Details" : "Interaction Details"}
                    </Text>
                    
                    <View style={styles.criteriaRow}>
                        <Text style={styles.criteriaLabel}>Communication</Text>
                        <StarRating rating={communicationRating} setRating={setCommunicationRating} size={28} />
                    </View>
                    
                    <View style={styles.criteriaRow}>
                        <Text style={styles.criteriaLabel}>Punctuality</Text>
                        <StarRating rating={punctualityRating} setRating={setPunctualityRating} size={28} />
                    </View>
                    
                    {/* ONLY SHOW ITEM CONDITION IF RATING A TRAVELER */}
                    {isReviewingTraveler && (
                        <View style={styles.criteriaRow}>
                            <Text style={styles.criteriaLabel}>Item Condition</Text>
                            <StarRating rating={itemConditionRating} setRating={setItemConditionRating} size={28} />
                        </View>
                    )}
                </View>

                {/* Comment Section */}
                <View style={styles.card}>
                    <Text style={styles.sectionHeader}>Additional Comments</Text>
                    <TextInput
                        style={styles.commentInput}
                        placeholder={isReviewingTraveler 
                            ? "Was the item well packed? Was the traveler friendly?" 
                            : "Was the requester easy to meet up with?"
                        }
                        placeholderTextColor={COLORS.textSecondary}
                        multiline
                        value={comment}
                        onChangeText={setComment}
                        maxLength={500}
                    />
                    <Text style={styles.charCount}>{comment.length}/500</Text>
                </View>

            </ScrollView>

            {/* Footer Button */}
            <View style={styles.footer}>
                <TouchableOpacity 
                    style={[styles.submitButton, (overallRating === 0 || isSubmitting) && styles.submitButtonDisabled]}
                    onPress={handleSubmitReview}
                    disabled={overallRating === 0 || isSubmitting}
                >
                    {isSubmitting ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={styles.submitButtonText}>Submit Review</Text>
                    )}
                </TouchableOpacity>
            </View>

        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 100, // Space for footer
    },
    card: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        // Shadow styles
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 16,
        backgroundColor: COLORS.border,
    },
    questionText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textPrimary,
        lineHeight: 22,
    },
    boldName: {
        fontWeight: '700',
    },
    productText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginTop: 4,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginVertical: 16,
    },
    mainRatingSection: {
        alignItems: 'center',
    },
    mainRatingLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.textSecondary,
        letterSpacing: 1,
        marginBottom: 8,
    },
    starContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    ratingHint: {
        marginTop: 8,
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.primary,
    },
    sectionHeader: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 16,
    },
    criteriaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    criteriaLabel: {
        fontSize: 15,
        color: COLORS.textPrimary,
    },
    commentInput: {
        minHeight: 120,
        textAlignVertical: 'top',
        fontSize: 16,
        color: COLORS.textPrimary,
        lineHeight: 24,
    },
    charCount: {
        textAlign: 'right',
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: 8,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.card,
        padding: 16,
        paddingBottom: Platform.OS === 'ios' ? 34 : 20,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    submitButton: {
        backgroundColor: COLORS.primary,
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    submitButtonDisabled: {
        backgroundColor: '#A0CFFF', // Lighter blue
    },
    submitButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
});

export default ReviewScreen;