// components/Offer.tsx

import { api } from '@/convex/_generated/api';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// --- Revamped & Expanded Color Palette ---
const COLORS = {
    primary: '#0A84FF',        // A vibrant blue for calls to action
    primaryMuted: 'rgba(10, 132, 255, 0.2)', // A softer blue for backgrounds
    white: '#FFFFFF',
    black: '#000000',
    grey: '#8E8E93',           // For secondary text
    lightGrey: '#3A3A3C',       // For borders and dividers
    background: '#000000',
    card: '#1C1C1E',           // Dark card background
    green: '#30D158',
    greenMuted: 'rgba(48, 209, 88, 0.2)',
    red: '#FF453A',
    redMuted: 'rgba(255, 69, 58, 0.2)',
    gold: '#FFD60A'             // For pending/new offer status
};

// --- Type Definitions (No Changes Needed) ---
type OfferWithSender = Doc<"offers"> & { requesterId: Id<"users"> };

type OfferThread = {
    _id: string;
    requestDetails: { productName: string };
    tripDetails: {
        originCity: string;
        destinationCity: string;
        arrivalDate: string;
    };
    otherUser: { _id?: Id<"users">; username?: string; image?: string };
    latestOffer: OfferWithSender;
    offerCount: number;
};

type OfferThreadItemProps = {
    thread: OfferThread;
};

// --- Helper Functions (No Changes Needed) ---
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
    const { user: clerkUser } = useUser();
    const currentUser = useQuery(api.users.getUserByClerkId, clerkUser ? { clerkId: clerkUser.id } : "skip");

    // --- Enhanced Status Logic ---
    // This now returns a background color for our status "pill"
    const { statusText, statusColor, statusBgColor, statusIcon, needsAction } = React.useMemo(() => {
        if (!currentUser) return {}; 
        const { latestOffer } = thread;
        const didISendLatestOffer = currentUser?._id && latestOffer.requesterId === currentUser._id;
        
        let statusText = '';
        let statusColor = COLORS.grey;
        let statusBgColor = COLORS.lightGrey; // Default background
        let statusIcon: keyof typeof Ionicons.glyphMap = 'help-circle-outline';
        let needsAction = false;

        switch (latestOffer.status) {
            case 'pending':
                if (didISendLatestOffer) {
                    statusText = `You Offered: $${latestOffer.proposedFee}`;
                    statusIcon = 'arrow-up-circle-outline';
                } else {
                    statusText = `New Offer: $${latestOffer.proposedFee}`;
                    statusColor = COLORS.primary; // Use a distinct color for incoming offers
                    statusBgColor = COLORS.primaryMuted;
                    statusIcon = 'sparkles-outline';
                    needsAction = true;
                }
                break;
            case 'accepted':
                statusText = 'Offer Accepted';
                statusColor = COLORS.green;
                statusBgColor = COLORS.greenMuted;
                statusIcon = 'checkmark-circle';
                break;
            case 'rejected':
                statusText = 'Offer Rejected';
                statusColor = COLORS.red;
                statusBgColor = COLORS.redMuted;
                statusIcon = 'close-circle';
                break;
            case 'cancelled':
                statusText = 'Offer Cancelled';
                statusIcon = 'remove-circle-outline';
                break;
        }
        return { statusText, statusColor, statusBgColor, statusIcon, needsAction };
    }, [thread.latestOffer, currentUser]);

    if (!currentUser) {
        return null; // Or a loading skeleton
    }

    const handleNavigation = () => {
        router.push({
            pathname: '/(stack)/offers',
            params: { id: thread._id }
        });
    };

    return (
        <TouchableOpacity style={styles.cardContainer} onPress={handleNavigation}>
            {/* --- CARD HEADER: User Info & Timestamp --- */}
            <View style={styles.cardHeader}>
                <Image
                    source={{ uri: thread.otherUser.image }}
                    style={styles.avatar}
                    contentFit="cover"
                />
                 {needsAction && <View style={styles.unreadDot} />}
                <View style={styles.userInfo}>
                    <Text style={styles.username}>{thread.otherUser.username}</Text>
                    <Text style={styles.timestamp}>{formatRelativeTime(thread.latestOffer._creationTime)}</Text>
                </View>
            </View>

            {/* --- CARD BODY: Product & Trip Details --- */}
            <View style={styles.cardBody}>
                <View style={styles.detailRow}>
                    <Ionicons name="cube-outline" size={20} color={COLORS.grey} style={styles.detailIcon} />
                    <Text style={styles.productName} numberOfLines={1}>
                        {thread.requestDetails.productName}
                    </Text>
                </View>
                <View style={styles.detailRow}>
                    <Ionicons name="airplane-outline" size={20} color={COLORS.grey} style={styles.detailIcon} />
                    <Text style={styles.tripInfoText} numberOfLines={1}>
                        {thread.tripDetails.originCity} → {thread.tripDetails.destinationCity}
                        <Text style={styles.dateText}> on {formatDisplayDate(thread.tripDetails.arrivalDate)}</Text>
                    </Text>
                </View>
            </View>

            {/* --- CARD FOOTER: Status Pill --- */}
            <View style={[styles.statusPill, { backgroundColor: statusBgColor }]}>
                <Ionicons name={statusIcon as any} size={16} color={statusColor} style={styles.statusIcon} />
                <Text style={[styles.statusText, { color: statusColor }]}>
                    {statusText}
                </Text>
            </View>
        </TouchableOpacity>
    );
}


// --- Completely Revamped StyleSheet for a Modern Look ---
const styles = StyleSheet.create({
    cardContainer: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        marginHorizontal: 16,
        marginVertical: 8,
        padding: 16,
        // Subtle shadow for iOS
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        // Subtle shadow for Android
        elevation: 5,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 12,
        borderWidth: 2,
        borderColor: COLORS.lightGrey,
    },
    userInfo: {
        flex: 1,
    },
    username: {
        fontSize: 17,
        fontWeight: '600',
        color: COLORS.white,
    },
    timestamp: {
        fontSize: 13,
        color: COLORS.grey,
    },
    unreadDot: {
        position: 'absolute',
        top: -2,
        left: -2,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: COLORS.primary,
        borderWidth: 2,
        borderColor: COLORS.card,
    },
    cardBody: {
        marginBottom: 16,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    detailIcon: {
        marginRight: 10,
    },
    productName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.white,
        flex: 1,
    },
    tripInfoText: {
        fontSize: 15,
        color: COLORS.white,
        flex: 1,
    },
    dateText: {
        color: COLORS.grey,
        fontWeight: '500',
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
    },
    statusIcon: {
        marginRight: 8,
    },
    statusText: {
        fontSize: 15,
        fontWeight: '600',
    },
});