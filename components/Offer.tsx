// components/Offer.tsx

import { api } from '@/convex/_generated/api';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// --- UPDATED Color Palette ---
const COLORS = {
    primary: '#007BFF', // Changed
    primary_light: '#4DA3FF', // Added
    primaryMuted: 'rgba(0, 123, 255, 0.2)', // Adjusted to match new primary
    white: '#FFFFFF', // Unchanged
    black: '#000000', // Unchanged
    grey: '#AEAEB2', // Changed
    lightGrey: '#3A3A3C', // Unchanged
    dark: '#1C1C1E', // Added
    background: '#1C1C1E', // Updated to use the new dark color
    card: '#2C2C2E', // Changed
    green: '#30D158',
    greenMuted: 'rgba(48, 209, 88, 0.2)',
    red: '#FF453A',
    redMuted: 'rgba(255, 69, 58, 0.2)',
    gold: '#FFD60A',
    subtleBackground: '#F2F2F7',
    subtleBorder: '#E5E5EA',
};

// --- Gradient Colors for Backgrounds (Updated to use new card color) ---
const GRADIENTS = {
    trip: ['#007BFF25', COLORS.card] as const,
    request: ['#10B98125', COLORS.card] as const,
};


// --- Type Definitions (Unchanged) ---

export type OfferThread = {
    requestDetails: { productName: string };
    tripDetails: {
        originCity: string;
        destinationCity: string;
        arrivalDate: string;
    };
    otherUser: { _id?: Id<"users">; username?: string; image?: string };
    negotiation: Doc<"negotiations">;
    latestOffer: Doc<"offers">;
};

type OfferThreadItemProps = {
    thread: OfferThread;
};


// --- Helper Functions (Unchanged) ---
const formatDisplayDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatRelativeTime = (timestamp: number) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);
    const minutes = Math.floor(diffInSeconds / 60);
    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    return past.toLocaleDateString();
};


export default function OfferThreadItem({ thread }: OfferThreadItemProps) {
    // --- Animation Setup ---
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);


    const { user: clerkUser } = useUser();
    const currentUser = useQuery(api.users.getUserByClerkId, clerkUser ? { clerkId: clerkUser.id } : "skip");

    const offerContext = React.useMemo(() => {
        if (!currentUser) return null;
        return currentUser._id.toString() === thread.negotiation.travelerId ? 'TRIP' : 'REQUEST';
    }, [currentUser, thread.negotiation]);

    const isTrip = offerContext === 'TRIP';

    const { contextText, contextIcon } = React.useMemo(() => ({
        contextText: isTrip ? 'Trip Offer' : 'Request Offer',
        contextIcon: (isTrip ? 'airplane-outline' : 'cube-outline') as keyof typeof Ionicons.glyphMap,
    }), [offerContext]);

    // Borders have been completely removed from this logic.
    const { statusLabel, feeText, statusColor, needsAction, directionIcon } = React.useMemo(() => {
        if (!currentUser) return {};
        const { negotiation, latestOffer } = thread;
        const didISendLatestOffer = currentUser?._id === latestOffer.senderId;
        const feeText = `$${negotiation.proposedFee}`;

        let statusLabel = '', statusColor = COLORS.grey;
        let needsAction = false, directionIcon: keyof typeof Ionicons.glyphMap = didISendLatestOffer ? 'arrow-up-circle-outline' : 'arrow-down-circle-outline';

        switch (negotiation.status) {
            case 'pending':
                if (didISendLatestOffer) {
                    statusLabel = 'Offer Sent';
                    statusColor = COLORS.primary;
                } else {
                    statusLabel = 'NEW OFFER';
                    statusColor = COLORS.gold;
                    needsAction = true;
                }
                break;
            case 'accepted':
                statusLabel = 'Deal Made';
                statusColor = COLORS.green;
                directionIcon = 'checkmark-circle-outline';
                break;
            case 'rejected':
                statusLabel = 'Rejected';
                statusColor = COLORS.red;
                directionIcon = 'close-circle-outline';
                break;
            case 'cancelled':
                statusLabel = 'Cancelled';
                directionIcon = 'remove-circle-outline';
                break;
        }
        return { statusLabel, feeText, statusColor, needsAction, directionIcon };
    }, [thread, currentUser]);

    const handleNavigation = () => {
        router.push({
            pathname: '/(stack)/offers',
            params: { id: thread.negotiation._id },
        });
    };

    const gradientColors = isTrip ? GRADIENTS.trip : GRADIENTS.request;
    const travelerAvatar = isTrip ? currentUser?.imageURL : thread.otherUser.image;

    return (
        <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity onPress={handleNavigation} style={styles.shadowContainer}>
                <LinearGradient
                    colors={gradientColors}
                    start={{ x: 0, y: 1 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.cardContainer}
                >
                    {/* --- CARD HEADER --- */}
                    <View style={styles.cardHeader}>
                        <View style={styles.userInfoContainer}>
                            <Image source={{ uri: thread.otherUser.image }} style={styles.avatar} contentFit="cover" />
                            <View style={styles.userInfo}>
                                <Text style={styles.username}>{thread.otherUser.username}</Text>
                                <Text style={styles.timestamp}>{formatRelativeTime(thread.latestOffer._creationTime)}</Text>
                            </View>
                        </View>
                        <View style={styles.contextTag}>
                            <Ionicons name={contextIcon} size={14} color={COLORS.grey} />
                            <Text style={styles.contextText}>{contextText}</Text>
                        </View>
                    </View>

                    {/* --- OFFER DETAILS --- */}
                    <View style={styles.offerDetailsContainer}>
                        <Text style={styles.productName} numberOfLines={2}>
                            {thread.requestDetails.productName}
                        </Text>
                        <View style={styles.tripInfoContainer}>
                            <Image source={{ uri: travelerAvatar }} style={styles.smallAvatar} contentFit="cover" />
                            <Text style={styles.tripInfoText} numberOfLines={1}>
                                {thread.tripDetails.originCity} → {thread.tripDetails.destinationCity}
                                <Text style={styles.dateText}> on {formatDisplayDate(thread.tripDetails.arrivalDate)}</Text>
                            </Text>
                        </View>
                    </View>

                    {/* --- FOOTER with CONSISTENT LAYOUT --- */}
                    <View style={styles.cardFooter}>
                        {needsAction ? (
                            <LinearGradient colors={['#FFD60A', '#FFA800']} style={styles.statusTag}>
                                <Ionicons name="sparkles-outline" size={16} color={COLORS.black} />
                                <Text style={styles.statusTagText}>{statusLabel}</Text>
                            </LinearGradient>
                        ) : (
                            <View style={styles.statusChip}>
                                <Ionicons name={directionIcon as any} size={16} color={statusColor} />
                                <Text style={[styles.statusLabel, { color: statusColor }]}>{statusLabel}</Text>
                            </View>
                        )}

                        <Text style={[styles.rewardText, { color: statusColor }]}>{feeText}</Text>
                    </View>
                </LinearGradient>
            </TouchableOpacity>
        </Animated.View>
    );
}


// --- StyleSheet using solid, theme-agnostic colors ---
const styles = StyleSheet.create({
    shadowContainer: {
        marginHorizontal: 16,
        marginVertical: 10,
        borderRadius: 28,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        elevation: 16,
    },
    cardContainer: {
        borderRadius: 28,
        padding: 16,
        backgroundColor: COLORS.card, // Set a solid background color
        overflow: 'hidden',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    userInfoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 12,
        borderWidth: 2,
        borderColor: COLORS.subtleBorder,
    },
    userInfo: {
        flex: 1,
    },
    username: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.white, // Kept as white for dark theme text
    },
    timestamp: {
        fontSize: 14,
        color: COLORS.grey,
        marginTop: 2,
    },
    contextTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)', // Kept subtle dark theme value
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 8,
        marginLeft: 8,
    },
    contextText: {
        color: COLORS.grey,
        fontSize: 12,
        fontWeight: '500',
        marginLeft: 4,
    },
    offerDetailsContainer: {
        marginBottom: 16,
    },
    productName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: COLORS.white, // Kept as white for dark theme text
        marginBottom: 12,
        lineHeight: 28,
    },
    tripInfoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.2)', // Kept subtle dark theme value
        padding: 10,
        borderRadius: 12,
    },
    smallAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        marginRight: 10,
    },
    tripInfoText: {
        fontSize: 16,
        color: COLORS.white, // Kept as white for dark theme text
        flex: 1,
    },
    dateText: {
        color: COLORS.grey,
        fontWeight: '500',
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 12,
        borderTopWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)', // Kept subtle dark theme value
    },
    statusChip: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusLabel: {
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    statusTag: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 30,
    },
    statusTagText: {
        color: COLORS.black,
        fontSize: 16,
        fontWeight: '800',
        marginLeft: 6,
    },
    rewardText: {
        fontSize: 28,
        fontWeight: '900',
    },
});