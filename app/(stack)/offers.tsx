// app/(stack)/offers.tsx

import { useAuth } from "@clerk/clerk-expo";
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import * as Haptics from 'expo-haptics';
import { Image } from "expo-image";
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import CountryFlag from "react-native-country-flag";

import { MessageInput } from '@/components/Message';
import { cityData } from "@/constants/cityData";
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

// === TRANSLATION IMPORT ===
import { useTranslation } from 'react-i18next';

const PALETTE = {
    backgroundGradient: ['#F7F8FA', '#FFFFFF'] as const,
    surface: '#FFFFFF',
    shadow: 'rgba(100, 100, 111, 0.25)',
    primary: '#3B82F6',
    secondary: '#10B981',
    textPrimary: '#1F2937',
    textSecondary: '#6B7280',
    historyIcon: '#ed7c04ff',
    primaryGradient: ['#38BDF8', '#3B82F6'] as const,
    border: '#D1D5DB',
    ratingStar: '#FBBF24',
    destructive: '#EF4444',
    success: '#10B981',
    warning: '#F59E0B',
};

const REQUEST_PALETTE = {
    primaryGradient: ['#34D399', '#10B981'] as const,
    primary: '#10B981',
    reward: '#10B981',
};

// Helper to find country code
const getCountryCode = (cityName: string) => {
    const city = cityData.find(c => c.name === cityName);
    return city ? city.countryCode : 'US'; 
};

export default function OfferDetailScreen() {
    const router = useRouter();
    const { userId } = useAuth();
    // Initialize Translation
    const { t, i18n } = useTranslation();

    const params = useLocalSearchParams();
    const negotiationId = params.id as Id<"negotiations">;
    
    // --- State ---
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [negotiateModalVisible, setNegotiateModalVisible] = useState(false);
    const [newFee, setNewFee] = useState('');
    const [isCodeVisible, setIsCodeVisible] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [isImageViewVisible, setImageViewVisible] = useState(false);

    // --- Queries ---
    const threadData = useQuery(api.offers.getOfferThreadDetails, { negotiationId });
    const currentUser = useQuery(api.users.getUserByClerkId, userId ? { clerkId: userId } : "skip");
    const order = useQuery(
        api.orders.getOrderByNegotiation,
        threadData?.negotiation.status === 'paid' 
            ? { negotiationId: threadData.negotiation._id } 
            : "skip"
    );

    // --- Mutations ---
    const acceptOffer = useMutation(api.offers.acceptOffer);
    const rejectOffer = useMutation(api.offers.rejectOffer);
    const cancelOffer = useMutation(api.offers.cancelOffer);
    const createCounterOffer = useMutation(api.offers.createCounterOffer);

    const latestOfferForQuery = threadData?.offers?.[threadData.offers.length - 1];
    const messages = useQuery(
        api.messages.getMessages,
        threadData?.negotiation.status === 'paid' ? { negotiationId : threadData.negotiation._id } : "skip"
    );

    // --- Memos ---
    const { iAmTheRequester, wasLatestOfferSentByMe, isNegotiationActive, finalStatusMessage } = useMemo(() => {
        if (!currentUser || !threadData || !threadData.requester || !threadData.traveler) {
            return { isNegotiationActive: false, finalStatusMessage: '' };
        }
        const { offers, requester, traveler } = threadData;
        const latestOffer = offers[offers.length - 1];

        const iAmTheRequester = currentUser._id === requester._id;
        const wasLatestOfferSentByMe = currentUser._id === latestOffer.senderId;
        const isNegotiationActive = threadData.negotiation.status === 'pending';
        let finalStatusMessage = '';
        if (!isNegotiationActive) {
            const actionTaker = latestOffer.senderId === requester._id ? traveler : requester;
            const actionTakerName = actionTaker._id === currentUser._id ? "You" : actionTaker.username;
            // Localized Status Message
            finalStatusMessage = t('offer.status.closed_desc', { name: actionTakerName, status: threadData.negotiation.status });
        }
        return { iAmTheRequester, wasLatestOfferSentByMe, isNegotiationActive, finalStatusMessage };
    }, [currentUser, threadData, t]); // Added t to deps

    const decryptedCode = useQuery(
        api.orders.getDecryptedCode,
        order && iAmTheRequester ? { orderId: order._id } : "skip"
    );

    // --- Handlers ---
    const onRefresh = useCallback(() => {
        setRefreshing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setTimeout(() => {
            setRefreshing(false);
        }, 1000);
    }, []);

    // NEW: Helper for profile navigation
    const handleProfilePress = (profileId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/user/${profileId}`);
    };

    // Helper for relative time
    const formatRelativeTime = (timestamp: number): string => {
        const now = new Date();
        const past = new Date(timestamp);
        const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);
        const minutes = Math.floor(diffInSeconds / 60);
        if (minutes < 1) return t('offer.history.now');
        if (minutes < 60) return t('offer.history.ago_m', { count: minutes });
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return t('offer.history.ago_h', { count: hours });
        return past.toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' });
    };

    // Loading State
    if (threadData === undefined || currentUser === undefined) {
        return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
    }
    // Error States
    if (currentUser === null) {
        return (
            <View style={styles.loadingContainer}>
                <Ionicons name="alert-circle-outline" size={60} color={COLORS.error} />
                <Text style={styles.errorText}>{t('offer.loading_error')}</Text>
                <TouchableOpacity 
                    onPress={() => {
                        // NEW: Added Haptics
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.back();
                    }} 
                    style={styles.errorButton}
                >
                    <Text style={styles.buttonTextPrimary}>{t('offer.btn_go_back')}</Text>
                </TouchableOpacity>
            </View>
        );
    }
    if (threadData === null || !threadData.requester || !threadData.traveler || !threadData.trip || !threadData.negotiation || !threadData.request ) {
        return (
            <View style={styles.loadingContainer}>
                <Ionicons name="alert-circle-outline" size={60} color={COLORS.error} />
                <Text style={styles.errorText}>{t('offer.loading_data_error')}</Text>
                <TouchableOpacity 
                    onPress={() => {
                        // NEW: Added Haptics
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.back();
                    }} 
                    style={styles.errorButton}
                >
                    <Text style={styles.buttonTextPrimary}>{t('offer.btn_go_back')}</Text>
                </TouchableOpacity>
            </View>
        );      
    }

    const { request, offers, requester, traveler, trip, negotiation } = threadData;
    const latestOffer = offers[offers.length - 1];
    const otherUser = iAmTheRequester ? traveler : requester;

    // --- Action Handlers ---
    const handleNegotiate = async () => {
        if (!currentUser) return;
        const fee = parseFloat(newFee);
        if (isNaN(fee) || fee <= 0) {
            Alert.alert(t('offer.alerts.invalid_amount'), t('offer.alerts.enter_valid_fee'));
            return;
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); 
        setIsSubmitting(true);
        try {
            await createCounterOffer({ negotiationId: negotiation._id, newFee: fee });
            setNegotiateModalVisible(false);
            setNewFee('');
        } catch (error) {
            Alert.alert(t('offer.alerts.error_title'), t('offer.alerts.send_offer_error'));
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleAccept = async () => {
        if (!currentUser) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); 
        setIsSubmitting(true);
        try {
            await acceptOffer({ offerId: latestOffer._id });
        } catch (error) {
            Alert.alert(t('offer.alerts.error_title'), t('offer.alerts.accept_error'), [{ text: "OK" }]);
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    }
    
    const handleReject = async () => {
        if (!currentUser) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); 
        setIsSubmitting(true);
        try {
            await rejectOffer({ offerId: latestOffer._id });
            Alert.alert(t('offer.alerts.reject_title'), t('offer.alerts.reject_msg'), [{ text: "OK", onPress: () => router.back() }]);
        } catch (error) {
            Alert.alert(t('offer.alerts.error_title'), t('offer.alerts.reject_error'), [{ text: "OK" }]);
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleCancel = async () => {
        if (!currentUser) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); 
        setIsSubmitting(true);
        try {
            await cancelOffer({ offerId: latestOffer._id });
            Alert.alert(t('offer.alerts.cancel_title'), t('offer.alerts.cancel_msg'), [{ text: "OK", onPress: () => router.back() }]);
        } catch (error) {
            Alert.alert(t('offer.alerts.error_title'), t('offer.alerts.cancel_error'), [{ text: "OK" }]);
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleProductLink = async () => {
        if (!request.productURL) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
            let url = request.productURL;
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
            }
            await WebBrowser.openBrowserAsync(url);
        } catch (error) {
            Alert.alert(t('offer.alerts.url_error', { url: request.productURL }));
        }
    };

    // --- Role-Based Status Logic ---
    let statusIcon: React.ComponentProps<typeof Ionicons>['name'] = 'help-circle-outline';
    let statusTitle = '';
    let statusDescription = '';
    let statusTheme = 'info';

    if (negotiation.status === 'pending') {
        if (wasLatestOfferSentByMe) {
            statusIcon = 'time-outline';
            statusTitle = t('offer.status.offer_sent');
            statusDescription = iAmTheRequester 
                ? t('offer.status.waiting_traveler', { name: traveler.username })
                : t('offer.status.waiting_requester', { name: requester.username });
            statusTheme = 'pending';
        } else {
            statusIcon = 'sparkles-outline';
            statusTitle = t('offer.status.action_required');
            statusDescription = iAmTheRequester
                ? t('offer.status.action_traveler', { name: traveler.username })
                : t('offer.status.action_requester', { name: requester.username });
            statusTheme = 'action';
        }
    } else if (negotiation.status === 'accepted') {
        if (iAmTheRequester) {
            statusIcon = 'card-outline';
            statusTitle = t('offer.status.offer_accepted');
            statusDescription = t('offer.status.offer_accepted_desc');
            statusTheme = 'success';
        } else {
            statusIcon = 'hourglass-outline';
            statusTitle = t('offer.status.waiting_payment');
            statusDescription = t('offer.status.waiting_payment_desc', { name: requester.username });
            statusTheme = 'pending';
        }
    } else if (negotiation.status === 'paid') {
        statusIcon = 'chatbubbles-outline';
        statusTitle = t('offer.status.payment_secured');
        statusDescription = iAmTheRequester
            ? t('offer.status.payment_secured_requester')
            : t('offer.status.payment_secured_traveler');
        statusTheme = 'success';
    } else if (negotiation.status === 'completed') {
        statusIcon = 'checkmark-done-circle';
        statusTitle = t('offer.status.completed');
        statusDescription = t('offer.status.completed_desc');
        statusTheme = 'success';
    } else { // rejected or cancelled
        statusIcon = 'close-circle-outline';
        statusTitle = t('offer.status.closed');
        statusDescription = finalStatusMessage;
        statusTheme = 'rejected';
    }

    const getStatusHubStyle = () => {
        switch (statusTheme) {
            case 'action': return styles.statusHub_action;
            case 'pending': return styles.statusHub_pending;
            case 'success': return styles.statusHub_success;
            case 'rejected': return styles.statusHub_rejected;
            default: return styles.statusHub_info;
        }
    };

    // Helper for formatting date (localized)
    const formatDate = (dateString: number) => new Date(dateString).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' });

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 24 : 24} 
        >
            <View style={styles.header}>
                <TouchableOpacity 
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.back();
                    }} 
                    disabled={isSubmitting}
                >
                    <Ionicons name="arrow-back" size={26} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{request.productName}</Text>
                <View style={{ width: 26 }} />
            </View>

            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
            >

                {/* --- STATUS HUB --- */}
                <View style={[styles.statusHub, getStatusHubStyle()]}>
                    <Ionicons name={statusIcon} size={28} color={COLORS.white} style={styles.statusHubIcon} />
                    <View style={styles.statusHubTextContainer}>
                        <Text style={styles.statusHubTitle}>{statusTitle}</Text>
                        <Text style={styles.statusHubDescription}>{statusDescription}</Text>
                    </View>
                </View>

                {/* DELIVERY CODE SECTION */}
                {negotiation.status === 'paid' && iAmTheRequester && (
                <View style={styles.codeSection}>
                    <Text style={styles.codeSectionTitle}>{t('offer.delivery_code.title')}</Text>
                    <View style={styles.codeDisplayBox}>
                        <Text style={styles.codeText}>
                            {isCodeVisible ? decryptedCode : '••••••'}
                        </Text>
                        <TouchableOpacity 
                            onPress={() => {
                                Haptics.selectionAsync();
                                setIsCodeVisible(!isCodeVisible);
                            }}
                        >
                            <Ionicons 
                                name={isCodeVisible ? 'eye-off-outline' : 'eye-outline'} 
                                size={26} 
                                color={COLORS.primary} 
                            />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.warningBox}>
                        <Ionicons name="shield-checkmark-outline" size={24} color={COLORS.red} />
                        <Text style={styles.warningText}>
                            {t('offer.delivery_code.warning')}
                        </Text>
                    </View>
                </View>
                )}

                {/* --- CHAT HISTORY --- */}
                <Text style={styles.historyTitle}>
                    {negotiation.status === 'paid' ? t('offer.history.chat') : t('offer.history.negotiation')}
                </Text>
                
                <View style={styles.historyContainer}>
                    {offers.map((offer) => {
                        const isMe = offer.senderId === currentUser._id;
                        const senderImage = (isMe ? currentUser.imageURL : otherUser.imageURL) ?? '';
                        
                        const BubbleContent = (
                            <View style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble]}>
                                <Text style={[styles.bubbleFee, isMe ? styles.myBubbleText : styles.theirBubbleText]}>${offer.proposedFee.toFixed(2)}</Text>
                                <Text style={[styles.bubbleTime, isMe ? styles.myBubbleText : styles.theirBubbleText]}>{formatRelativeTime(offer._creationTime)}</Text>
                            </View>
                        );
                        
                        // CHANGED: Made Avatar Pressable for navigation
                        const Avatar = (
                            <TouchableOpacity onPress={() => handleProfilePress(offer.senderId)} activeOpacity={0.7}>
                                <Image source={senderImage} style={styles.bubbleAvatar} />
                            </TouchableOpacity>
                        );

                        return (
                            <View key={offer._id} style={[styles.bubbleContainer, isMe ? styles.myBubbleContainer : styles.theirBubbleContainer]}>
                                {isMe ? (<>{BubbleContent}{Avatar}</>) : (<>{Avatar}{BubbleContent}</>)}
                            </View>
                        );
                    })}

                    {negotiation.status === 'paid' && messages && messages.map((msg) =>{
                        const isMe = msg.senderId === currentUser._id;
                        const sender = isMe ? currentUser : otherUser;
                        const senderImage = sender.imageURL ?? '';

                        const BubbleContent = (
                            <View style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble, styles.chatBubble]}>
                                <Text style={[styles.chatText, isMe ? styles.myBubbleText : styles.theirBubbleText]}>{msg.text}</Text>
                                <Text style={[styles.bubbleTime, isMe ? styles.myBubbleText : styles.theirBubbleText]}>{formatRelativeTime(msg._creationTime)}</Text>
                            </View>
                        );

                        // CHANGED: Made Avatar Pressable for navigation
                        const Avatar = (
                            <TouchableOpacity onPress={() => handleProfilePress(msg.senderId)} activeOpacity={0.7}>
                                <Image source={senderImage} style={styles.bubbleAvatar} />
                            </TouchableOpacity>
                        );

                        return (
                            <View key={msg._id} style={[styles.bubbleContainer, isMe ? styles.myBubbleContainer : styles.theirBubbleContainer]}>
                                {isMe ? (<>{BubbleContent}{Avatar}</>) : (<>{Avatar}{BubbleContent}</>)}
                            </View>
                        );
                    })}
                </View>

                <View style={styles.detailsDivider} />
                
                {/* --- MODERN TRIP DETAILS --- */}
                <View style={styles.modernCard}>
                    <LinearGradient
                        colors={['#F7F8FA', '#FFFFFF']}
                        style={styles.modernCardContent}
                    >
                        <View style={styles.modernCardHeader}>
                            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                <Ionicons name="airplane" size={18} color={PALETTE.primary} />
                                <Text style={styles.modernCardTitle}>{t('offer.trip_details.title')}</Text>
                            </View>
                            <Text style={styles.modernDate}>{formatDate(trip.arrivalDate)}</Text>
                        </View>

                        <View style={styles.tripRouteContainer}>
                             <View style={styles.locationPoint}>
                                <CountryFlag isoCode={getCountryCode(trip.originCity)} size={18} />
                                <Text style={styles.locationCity}>{trip.originCity}</Text>
                                <Text style={styles.locationLabel}>{t('offer.trip_details.origin')}</Text>
                             </View>
                             
                             <View style={styles.routeLine}>
                                <View style={[styles.dot, {backgroundColor: PALETTE.primary}]} />
                                <View style={[styles.dashedLine, {borderColor: PALETTE.primary}]} />
                                <Ionicons name="airplane" size={16} color={PALETTE.primary} style={styles.routeIcon} />
                                <View style={[styles.dashedLine, {borderColor: PALETTE.primary}]} />
                                <View style={[styles.dot, {backgroundColor: PALETTE.primary}]} />
                             </View>

                             <View style={styles.locationPoint}>
                                <CountryFlag isoCode={getCountryCode(trip.destinationCity)} size={18} />
                                <Text style={styles.locationCity}>{trip.destinationCity}</Text>
                                <Text style={styles.locationLabel}>{t('offer.trip_details.destination')}</Text>
                             </View>
                        </View>

                        <View style={styles.separator} />

                        {/* CHANGED: Made Traveler Info Pressable */}
                        <TouchableOpacity style={styles.travelerSection} onPress={() => handleProfilePress(traveler._id)} activeOpacity={0.7}>
                            <Image source={traveler.imageURL ?? ''} style={styles.avatarSmall} />
                            <View>
                                <Text style={styles.travelerLabel}>{t('offer.trip_details.traveler_label')}</Text>
                                <Text style={styles.travelerName}>{traveler.username}</Text>
                            </View>
                        </TouchableOpacity>
                    </LinearGradient>
                </View>


                {/* --- REQUEST SUMMARY --- */}
                <View style={styles.card}>
                     <View style={cardStyles.cardHeader}>
                         <Ionicons name="cube-outline" size={20} color={COLORS.textSecondary} />
                         <Text style={cardStyles.cardTitle}>{t('offer.summary_title')}</Text>
                     </View>
                     
                     <View style={cardStyles.productBentoContainer}>
                        <View style={cardStyles.productInfoContainer}>
                            <Text style={cardStyles.productName} numberOfLines={2}>{request.productName}</Text>
                            
                            {request.productURL && (
                                <TouchableOpacity style={cardStyles.productLinkButton} onPress={handleProductLink}>
                                    <Ionicons name="link-outline" size={16} color={REQUEST_PALETTE.primary} />
                                    <Text style={cardStyles.productLinkText}>{t('offer.view_product')}</Text>
                                </TouchableOpacity>
                            )}

                             <View style={cardStyles.pillsContainer}>
                                <View style={cardStyles.pillItem}>
                                    <MaterialCommunityIcons name="package-variant-closed" size={14} color={REQUEST_PALETTE.primary} />
                                    <Text style={cardStyles.pillText}>{t('offer.qty', { count: request.quantity })}</Text>
                                </View>
                                {request.productWeight && 
                                    <View style={cardStyles.pillItem}>
                                            <FontAwesome5 name="weight-hanging" size={12} color={REQUEST_PALETTE.primary} />
                                            <Text style={cardStyles.pillText}>{t('offer.wt', { weight: request.productWeight })}</Text>
                                    </View>
                                }
                                {request.itemTypes && 
                                    <View style={cardStyles.pillItem}>
                                            <MaterialCommunityIcons name="tag-outline" size={14} color={REQUEST_PALETTE.primary} />
                                            <Text style={cardStyles.pillText}>{request.itemTypes}</Text>
                                    </View>
                                }
                            </View>
                        </View>

                        {request.imageKey && (
                            <TouchableOpacity 
                                style={cardStyles.productImageContainer} 
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setImageViewVisible(true);
                                }}
                            >
                                <Image
                                    source={{ uri: `https://ts79.space/${request.imageKey}` }}
                                    style={cardStyles.productImage}
                                    contentFit="cover"
                                    transition={300}
                                />
                            </TouchableOpacity>
                        )}
                     </View>

                     <View style={styles.financialRow}>
                        <View style={styles.financialItem}>
                             <Text style={styles.detailLabel}>{t('offer.price')}</Text>
                             <Text style={styles.detailValue}>${request.itemPrice.toFixed(2)}</Text>
                        </View>
                         <View style={styles.financialItem}>
                             <Text style={styles.detailLabel}>{t('offer.fee')}</Text>
                             <Text style={[styles.detailValue, {color: REQUEST_PALETTE.reward}]}>${request.travelerFee.toFixed(2)}</Text>
                        </View>
                     </View>
                </View>
                
                {/* --- CONFIRMATION BUTTONS --- */}
                {iAmTheRequester && negotiation.status === 'accepted' && (
                    <TouchableOpacity
                        style={[styles.floatingConfirmButton, isSubmitting && styles.buttonDisabled]}
                        disabled={isSubmitting}
                        activeOpacity={0.8}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            router.push({
                                pathname: '/(stack)/payment',
                                params: { negotiationId: threadData.negotiation._id }
                            });
                        }}
                    >
                        <Ionicons name="card-outline" size={22} color={COLORS.white} />
                        <Text style={styles.floatingButtonText}>{t('offer.btn_proceed')}</Text>
                    </TouchableOpacity>
                )}
                {!iAmTheRequester && negotiation.status === 'paid' && order && (
                    <TouchableOpacity
                        style={[styles.floatingConfirmButton, isSubmitting && styles.buttonDisabled]}
                        disabled={isSubmitting}
                        activeOpacity={0.8}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            router.push({
                                pathname: '/(stack)/confirm-delivery',
                                params: { negotiationId: threadData.negotiation._id } 
                            });
                        }}
                    >
                        <Ionicons name="checkmark-done-circle-outline" size={22} color={COLORS.white} />
                        <Text style={styles.floatingButtonText}>{t('offer.btn_confirm')}</Text>
                    </TouchableOpacity>
                )}
            </ScrollView>

            {negotiation.status === 'paid' ? (
                <MessageInput negotiationId={negotiation._id} />
            ) : (
                <View style={styles.footer}>
                    {negotiation.status === 'pending' && !wasLatestOfferSentByMe ? (
                        <>
                            {/* 1. REJECT / CANCEL (Ghost Style) */}
                            <TouchableOpacity 
                                style={[styles.decisionButton, styles.decisionButtonDestructive]} 
                                disabled={isSubmitting} 
                                activeOpacity={0.7}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                    iAmTheRequester ? handleCancel() : handleReject();
                                }}
                            >
                                <Ionicons name="close-circle" size={20} color="#EF4444" />
                                <Text style={styles.decisionTextDestructive}>
                                    {iAmTheRequester ? t('offer.actions.cancel') : t('offer.actions.reject')}
                                </Text>
                            </TouchableOpacity>

                            {/* 2. NEGOTIATE (Soft Fill) */}
                            <TouchableOpacity 
                                style={[styles.decisionButton, styles.decisionButtonSecondary]} 
                                disabled={isSubmitting} 
                                activeOpacity={0.7}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setNegotiateModalVisible(true);
                                }}
                            >
                                <Ionicons name="chatbubble-ellipses" size={20} color={COLORS.primary} />
                                <Text style={styles.decisionTextSecondary}>
                                    {t('offer.actions.negotiate')}
                                </Text>
                            </TouchableOpacity>

                            {/* 3. ACCEPT (Hero Gradient) */}
                            <TouchableOpacity 
                                style={[styles.decisionButton, styles.decisionButtonPrimary]} 
                                disabled={isSubmitting} 
                                activeOpacity={0.8}
                                onPress={handleAccept}
                            >
                                <LinearGradient
                                    colors={['#10B981', '#059669']}
                                    style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
                                    start={{ x: 0, y: 0 }} 
                                    end={{ x: 1, y: 1 }}
                                />
                                <Ionicons name="checkmark-circle" size={22} color={COLORS.white} />
                                <Text style={styles.decisionTextPrimary}>
                                    {t('offer.actions.accept')}
                                </Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <View style={styles.footerEmpty} />
                    )}
                </View>
        )}
                        
            <Modal animationType="fade" transparent={true} visible={negotiateModalVisible} onRequestClose={() => setNegotiateModalVisible(false)}>
                <Pressable 
                    style={styles.modalBackdrop} 
                    onPress={() => setNegotiateModalVisible(false)}
                >
                    <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
                        <Text style={styles.modalTitle}>{t('offer.modals.negotiate_title')}</Text>
                        <View style={styles.modalInputContainer}>
                            <Text style={styles.dollarSign}>$</Text>
                            <TextInput 
                                style={styles.modalInput} 
                                placeholder="45" 
                                placeholderTextColor={COLORS.placeholder} 
                                keyboardType="numeric" 
                                value={newFee} 
                                onChangeText={setNewFee} 
                                autoFocus={true} 
                            />
                        </View>
                        <TouchableOpacity 
                            style={[styles.modalButton, isSubmitting && styles.buttonDisabled]} 
                            onPress={handleNegotiate} 
                            disabled={isSubmitting}
                            activeOpacity={0.8}
                        >
                            {isSubmitting ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.buttonTextPrimary}>{t('offer.modals.btn_send_offer')}</Text>}
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>

            <Modal
                animationType="fade"
                transparent={true}
                visible={isImageViewVisible}
                onRequestClose={() => setImageViewVisible(false)}>
                <Pressable 
                    style={cardStyles.imageViewerBackdrop} 
                    onPress={() => {
                        // NEW: Added Haptics on Close
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setImageViewVisible(false);
                    }}
                >
                    <Image
                        source={{ uri: `https://ts79.space/${request.imageKey}` }}
                        style={cardStyles.imageViewerImage}
                        contentFit="contain"
                    />
                </Pressable>
            </Modal>

        </KeyboardAvoidingView>
    );
}

// --- Styles and Constants ---
const COLORS = { 
    primary: '#007AFF',
    background: '#F0F2F5',
    surface: '#FFFFFF',
    text: '#1C1C1E',
    textSecondary: '#6D6D72',
    separator: '#E5E5EA',
    disabled: '#D1D1D6',
    green: '#34C759',
    red: '#FF3B30',
    orange: '#FF9500',
    myBubble: '#007AFF',
    theirBubble: '#E5E5EA',
    placeholder: '#C7C7CC',
    white: '#FFFFFF',
    error: '#FF3B30'
};

const styles = StyleSheet.create({
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background, padding: 20 },
    errorText: { color: COLORS.text, fontSize: 18, fontWeight: '600', marginTop: 16, textAlign: 'center' },
    errorButton: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, marginTop: 20 },
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 50 : 20, paddingBottom: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.separator },
    headerTitle: { color: COLORS.text, fontSize: 17, fontWeight: '600', flex: 1, textAlign: 'center', marginHorizontal: 10 },
    scrollContent: { padding: 16 },
    statusHub: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 20 },
    statusHub_action: { backgroundColor: COLORS.primary },
    statusHub_pending: { backgroundColor: COLORS.orange },
    statusHub_success: { backgroundColor: COLORS.green },
    statusHub_rejected: { backgroundColor: COLORS.red },
    statusHub_info: { backgroundColor: COLORS.textSecondary },
    statusHubIcon: { marginRight: 12 },
    statusHubTextContainer: { flex: 1 },
    statusHubTitle: { color: COLORS.white, fontSize: 17, fontWeight: 'bold', marginBottom: 2 },
    statusHubDescription: { color: COLORS.white, fontSize: 14, lineHeight: 20 },
    detailsDivider: { height: 1, backgroundColor: COLORS.separator, marginVertical: 24 },
    card: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.separator },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    cardTitle: { color: COLORS.text, fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
    
    modernCard: {
        marginBottom: 20,
        borderRadius: 16,
        shadowColor: PALETTE.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
        backgroundColor: COLORS.surface,
    },
    modernCardContent: {
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: PALETTE.border,
    },
    modernCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modernCardTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: PALETTE.textPrimary,
        marginLeft: 8,
        textTransform: 'uppercase',
    },
    modernDate: {
        fontSize: 14,
        fontWeight: '600',
        color: PALETTE.textSecondary,
    },
    tripRouteContainer: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        paddingVertical: 10 
    },
    locationPoint: { alignItems: 'center', flex: 1 },
    locationLabel: { color: COLORS.textSecondary, fontSize: 12, marginTop: 4 },
    locationCity: { color: COLORS.text, fontSize: 16, fontWeight: 'bold' },
    
    routeLine: { 
        flex: 1.5, 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 10,
    },
    dot: { width: 8, height: 8, borderRadius: 4 },
    dashedLine: { height: 1, flex: 1, borderBottomWidth: 1, borderStyle: 'dashed' },
    routeIcon: { marginHorizontal: 8 },
    separator: { height: 1, backgroundColor: COLORS.separator, marginVertical: 12 },
    
    travelerSection: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarSmall: { width: 36, height: 36, borderRadius: 18, marginRight: 10, backgroundColor: COLORS.separator },
    travelerLabel: { fontSize: 10, color: PALETTE.textSecondary, textTransform: 'uppercase', fontWeight: 'bold' },
    travelerName: { fontSize: 15, fontWeight: '600', color: PALETTE.textPrimary },

    financialRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORS.separator },
    financialItem: { alignItems: 'center', flex: 1 },

    detailLabel: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 4 },
    detailValue: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
    linkText: { color: COLORS.primary, fontSize: 15, fontWeight: '500' },
    historyTitle: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600', textTransform: 'uppercase', marginLeft: 8, marginBottom: 8 },
    historyContainer: { paddingBottom: 16 },
    bubbleContainer: { flexDirection: 'row', marginVertical: 8, alignItems: 'flex-end', gap: 8 },
    myBubbleContainer: { justifyContent: 'flex-end' },
    theirBubbleContainer: { justifyContent: 'flex-start' },
    bubbleAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.separator },
    bubble: { maxWidth: '80%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
    myBubble: { backgroundColor: COLORS.myBubble, borderBottomRightRadius: 4 },
    theirBubble: { backgroundColor: COLORS.theirBubble, borderBottomLeftRadius: 4 },
    bubbleFee: { fontSize: 18, fontWeight: 'bold' },
    bubbleTime: { fontSize: 12, opacity: 0.9, marginTop: 4, alignSelf: 'flex-end' },
    chatBubble: { paddingVertical: 8 },
    chatText: { fontSize: 16 },
    myBubbleText: { color: COLORS.white },
    theirBubbleText: { color: COLORS.text },
    
    // --- UPDATED FOOTER STYLES ---
    footer: {
        flexDirection: 'row',
        paddingHorizontal: 20, // Increased padding
        paddingTop: 16,
        paddingBottom: Platform.OS === 'ios' ? 30 : 20,
        backgroundColor: COLORS.surface,
        // Modern Floating Shadow (No Border)
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 20,
        gap: 12, 
        alignItems: 'center',
    },
    footerEmpty: { height: 0 },
    
    // Base Button Shape
    decisionButton: {
        height: 56, // Taller button
        borderRadius: 16, // Softer corners
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        gap: 8,
    },

    // 1. REJECT: Ghost Style
    decisionButtonDestructive: {
        flex: 1.2,
        backgroundColor: '#FEF2F2', // Soft Red Fill
        // No border needed
    },
    decisionTextDestructive: {
        color: '#EF4444',
        fontSize: 15,
        fontWeight: '700',
    },

    // 2. NEGOTIATE: Soft Fill
    decisionButtonSecondary: {
        flex: 1.6,
        backgroundColor: '#EFF6FF', // Soft Blue Fill
    },
    decisionTextSecondary: {
        color: '#3B82F6',
        fontSize: 15,
        fontWeight: '700',
    },

    // 3. ACCEPT: Hero Gradient
    decisionButtonPrimary: {
        flex: 1.6, // Widest
        // Shadow for the primary button only
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    decisionTextPrimary: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800',
    },
    // End Footer Styles

    button: { flex: 1, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    buttonPrimary: { backgroundColor: COLORS.primary },
    buttonSecondary: { backgroundColor: COLORS.separator },
    buttonTextPrimary: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
    buttonTextSecondary: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
    buttonDisabled: { opacity: 0.5 },
    floatingConfirmButton: {
        flexDirection: 'row',
        gap: 8,
        backgroundColor: COLORS.primary,
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 16,
        marginHorizontal: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2, },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    floatingButtonText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: 'bold',
    },
        codeSection: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 16,
        marginTop:0,
        marginVertical: 20,
        borderWidth: 1,
        borderColor: COLORS.separator,
    },
    codeSectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 12,
        textAlign: 'center',
    },
    codeDisplayBox: {
        backgroundColor: COLORS.background,
        borderRadius: 10,
        paddingHorizontal: 20,
        paddingVertical: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    codeText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: COLORS.text,
        letterSpacing: 4, 
    },
    warningBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFBEB', 
        borderRadius: 8,
        padding: 12,
        gap: 10,
    },
    warningText: {
        flex: 1,
        color: '#B45309', 
        fontSize: 14,
        lineHeight: 20,
    },

    modalBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
    modalContent: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 20, width: '90%' },
    modalTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    modalInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, borderRadius: 10, paddingHorizontal: 12, marginBottom: 16, borderWidth: 1, borderColor: COLORS.separator },
    dollarSign: { color: COLORS.text, fontSize: 24, fontWeight: 'bold', marginRight: 4 },
    modalInput: { flex: 1, color: COLORS.text, fontSize: 24, fontWeight: 'bold', height: 50 },
    modalButton: { height: 50, borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.primary },
});

const cardStyles = StyleSheet.create({
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    cardTitle: { color: COLORS.text, fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
    productBentoContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    productInfoContainer: {
        flex: 1, 
        marginRight: 12, 
    },
    productName: { fontSize: 20, fontWeight: 'bold', color: PALETTE.textPrimary, marginBottom: 4 },
    productLinkButton: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingVertical: 4, marginTop: 4 },
    productLinkText: { color: REQUEST_PALETTE.primary, fontWeight: '600', marginLeft: 6 },
    productImageContainer: {
        shadowColor: PALETTE.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 6,
    },
    productImage: {
        width: 90,
        height: 90,
        borderRadius: 12,
        backgroundColor: PALETTE.border,
    },
    pillsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 12, 
    },
    pillItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: PALETTE.backgroundGradient[0], 
        borderRadius: 6,
        paddingVertical: 4,
        paddingHorizontal: 8,
        marginRight: 6,
        marginBottom: 6, 
    },
    pillText: {
        fontSize: 12,
        fontWeight: '500',
        color: PALETTE.textSecondary,
        marginLeft: 5,
    },
    imageViewerBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageViewerImage: {
        width: '90%',
        height: '80%',
        borderRadius: 12,
    },
});