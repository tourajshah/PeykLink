// components/Offer.tsx

import { api } from '@/convex/_generated/api';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import * as Haptics from 'expo-haptics'; // CHANGED: Added Haptics import
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// --- NEW LIGHT THEME PALETTE ---
const COLORS = {
    background: '#F2F2F7',      // iOS Grouped Background
    card: '#FFFFFF',            // Pure White
    textPrimary: '#000000',     // Main text
    textSecondary: '#6C6C70',   // Subtitles
    border: '#E5E5EA',          // Separators
    
    // Accents
    primary: '#007AFF',         // iOS Blue
    primaryBg: '#E5F1FF',       // Light Blue bg
    
    success: '#34C759',         // Green
    successBg: '#E4F9E9',       // Light Green bg
    
    warning: '#FF9500',         // Orange
    warningBg: '#FFF4E5',       // Light Orange bg
    
    danger: '#FF3B30',          // Red
    dangerBg: '#FFEBEE',        // Light Red bg
    
    neutralBg: '#F2F2F7',
};

// --- Types (Unchanged) ---
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

// --- Helpers ---
const formatDisplayDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatRelativeTime = (timestamp: number) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);
    const minutes = Math.floor(diffInSeconds / 60);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return past.toLocaleDateString();
};

export default function OfferThreadItem({ thread }: OfferThreadItemProps) {
    // Animation
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(10)).current; // Slide up effect

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(translateY, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]).start();
    }, []);

    const { user: clerkUser } = useUser();
    const currentUser = useQuery(api.users.getUserByClerkId, clerkUser ? { clerkId: clerkUser.id } : "skip");

    // Logic
    const offerContext = React.useMemo(() => {
        if (!currentUser) return null;
        return currentUser._id.toString() === thread.negotiation.travelerId ? 'TRIP' : 'REQUEST';
    }, [currentUser, thread.negotiation]);

    const isTrip = offerContext === 'TRIP';

    const { statusConfig, feeText, directionIcon, isActionRequired } = React.useMemo(() => {
        // --- FIX: Default values must match the full shape ---
        const defaultConfig = { label: '', color: COLORS.textSecondary, bg: COLORS.neutralBg, icon: 'ellipse' };
        
        if (!currentUser) return { 
            statusConfig: defaultConfig, 
            feeText: '', 
            directionIcon: 'help-circle-outline', 
            isActionRequired: false 
        };
        
        const { negotiation, latestOffer } = thread;
        const didISendLatestOffer = currentUser?._id === latestOffer.senderId;
        const feeText = `$${negotiation.proposedFee}`;
        
        // Configuration for the status pill
        let statusConfig = { label: '', color: COLORS.textSecondary, bg: COLORS.neutralBg, icon: 'ellipse' };
        let isActionRequired = false;
        let directionIcon = didISendLatestOffer ? 'arrow-up-outline' : 'arrow-down-outline';

        switch (negotiation.status) {
            case 'pending':
                if (didISendLatestOffer) {
                    statusConfig = { label: 'Offer Sent', color: COLORS.primary, bg: COLORS.primaryBg, icon: 'paper-plane' };
                } else {
                    statusConfig = { label: 'Action Needed', color: COLORS.warning, bg: COLORS.warningBg, icon: 'alert-circle' };
                    isActionRequired = true;
                }
                break;
            case 'accepted':
                statusConfig = { label: 'Accepted', color: COLORS.success, bg: COLORS.successBg, icon: 'checkmark-circle' };
                directionIcon = 'checkmark-done-outline';
                break;
            case 'paid':
                // New "Paid" State - Purple Theme
                statusConfig = { label: 'Paid & Processing', color: '#AF52DE', bg: '#F3E5F5', icon: 'wallet' };
                directionIcon = 'card-outline';
                break;
            case 'completed':
                // New "Completed" State - Dark/Neutral Theme (Final State)
                statusConfig = { label: 'Delivered', color: COLORS.textPrimary, bg: COLORS.border, icon: 'checkmark-done-circle' };
                directionIcon = 'gift-outline';
                break;
            case 'rejected':
                statusConfig = { label: 'Declined', color: COLORS.danger, bg: COLORS.dangerBg, icon: 'close-circle' };
                directionIcon = 'close-outline';
                break;
            case 'cancelled':
                statusConfig = { label: 'Cancelled', color: COLORS.textSecondary, bg: COLORS.neutralBg, icon: 'ban' };
                break;
        }
        return { statusConfig, feeText, directionIcon, isActionRequired };
    }, [thread, currentUser]);

    const handleNavigation = () => {
        // CHANGED: Added Haptic feedback for main card press
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({
            pathname: '/(stack)/offers',
            params: { id: thread.negotiation._id },
        });
    };

    // NEW: Handler for profile press
    const handleProfilePress = () => {
        if (thread.otherUser._id) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push(`/user/${thread.otherUser._id}`);
        }
    };

    return (
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY }] }}>
            <TouchableOpacity 
                onPress={handleNavigation} 
                style={styles.container} 
                activeOpacity={0.7}
            >
                <View style={styles.card}>
                    
                    {/* --- TOP ROW: Context & Price --- */}
                    <View style={styles.headerRow}>
                        <View style={styles.contextBadge}>
                            <Ionicons 
                                name={isTrip ? 'airplane' : 'cube'} 
                                size={12} 
                                color={COLORS.textSecondary} 
                            />
                            <Text style={styles.contextText}>
                                {isTrip ? 'Your Trip' : 'Your Request'}
                            </Text>
                        </View>
                        <View style={styles.priceContainer}>
                            <Text style={styles.priceLabel}>Offer</Text>
                            <Text style={styles.priceValue}>{feeText}</Text>
                        </View>
                    </View>

                    {/* --- MIDDLE ROW: Product & Route Visual --- */}
                    <View style={styles.bodyContent}>
                        <Text style={styles.productName} numberOfLines={1}>
                            {thread.requestDetails.productName}
                        </Text>

                        {/* Visual Route Indicator */}
                        <View style={styles.routeRow}>
                            <Text style={styles.cityText}>{thread.tripDetails.originCity}</Text>
                            
                            <View style={styles.routeGraphic}>
                                <View style={styles.dot} />
                                <View style={styles.dashLine} />
                                <Ionicons name="airplane" size={12} color={COLORS.primary} style={{ marginHorizontal: 4 }} />
                                <View style={styles.dashLine} />
                                <View style={styles.dot} />
                            </View>

                            <Text style={styles.cityText}>{thread.tripDetails.destinationCity}</Text>
                        </View>
                        <Text style={styles.dateText}>
                            Arrives {formatDisplayDate(thread.tripDetails.arrivalDate)}
                        </Text>
                    </View>

                    {/* --- DIVIDER --- */}
                    <View style={styles.divider} />

                    {/* --- FOOTER: User & Status --- */}
                    <View style={styles.footerRow}>
                        {/* CHANGED: Wrapped user section in TouchableOpacity for profile navigation */}
                        <TouchableOpacity 
                            style={styles.userSection} 
                            onPress={handleProfilePress}
                            activeOpacity={0.7}
                        >
                            <Image 
                                source={{ uri: thread.otherUser.image }} 
                                style={styles.avatar} 
                                contentFit="cover" 
                            />
                            <View>
                                <Text style={styles.username}>{thread.otherUser.username}</Text>
                                <Text style={styles.timestamp}>
                                    {formatRelativeTime(thread.latestOffer._creationTime)}
                                </Text>
                            </View>
                        </TouchableOpacity>

                        {/* Status Pill */}
                        <View style={[styles.statusPill, { backgroundColor: statusConfig.bg }]}>
                            <Ionicons 
                                name={statusConfig.icon as any} 
                                size={14} 
                                color={statusConfig.color} 
                            />
                            <Text style={[styles.statusText, { color: statusConfig.color }]}>
                                {statusConfig.label}
                            </Text>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 16,
        marginVertical: 8,
        // Shadow for iOS
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        // Shadow for Android
        elevation: 3,
    },
    card: {
        backgroundColor: COLORS.card,
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    // Header
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    contextBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.neutralBg,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        gap: 4,
    },
    contextText: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    priceContainer: {
        alignItems: 'flex-end',
    },
    priceLabel: {
        fontSize: 10,
        textTransform: 'uppercase',
        color: COLORS.textSecondary,
        fontWeight: '600',
    },
    priceValue: {
        fontSize: 20,
        fontWeight: '800',
        color: COLORS.primary, // Blue price pops on white
        marginTop: -2,
    },
    // Body
    bodyContent: {
        marginBottom: 16,
    },
    productName: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 8,
    },
    routeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    cityText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    routeGraphic: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 12,
    },
    dot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: COLORS.border,
    },
    dashLine: {
        flex: 1,
        height: 1,
        backgroundColor: COLORS.border,
    },
    dateText: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    // Footer
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginBottom: 12,
    },
    footerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    userSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.neutralBg,
    },
    username: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    timestamp: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 4,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '700',
        // CHANGED: Added includeFontPadding for Android alignment fix
        includeFontPadding: false, 
    },
});