// app/(stack)/offers.tsx

import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Linking,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

import { MessageInput } from '@/components/Message';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';


export default function OfferDetailScreen() {
    const router = useRouter();
    const { userId } = useAuth();
    const params = useLocalSearchParams();
    const negotiationId = params.id as Id<"negotiations">;
    
    // --- All Hooks are now grouped at the top level ---
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [negotiateModalVisible, setNegotiateModalVisible] = useState(false);
    const [newFee, setNewFee] = useState('');
    const [isCodeVisible, setIsCodeVisible] = useState(false);

    const threadData = useQuery(api.offers.getOfferThreadDetails, { negotiationId });
    const currentUser = useQuery(api.users.getUserByClerkId, userId ? { clerkId: userId } : "skip");
    const order = useQuery(
        api.orders.getOrderByNegotiation,
        threadData?.negotiation.status === 'paid' 
            ? { negotiationId: threadData.negotiation._id } 
            : "skip"
    );

    
    
    const acceptOffer = useMutation(api.offers.acceptOffer);
    const rejectOffer = useMutation(api.offers.rejectOffer);
    const cancelOffer = useMutation(api.offers.cancelOffer);
    const createCounterOffer = useMutation(api.offers.createCounterOffer);

    const latestOfferForQuery = threadData?.offers?.[threadData.offers.length - 1];
    const messages = useQuery(
        api.messages.getMessages,
        threadData?.negotiation.status === 'paid' ? { negotiationId : threadData.negotiation._id } : "skip"
    );

    // This hook will now run on every render, which is the correct pattern.
    const { iAmTheRequester, wasLatestOfferSentByMe, isNegotiationActive, finalStatusMessage } = useMemo(() => {
        // This internal guard safely handles initial renders when data is not yet available.
        if (!currentUser || !threadData || !threadData.requester || !threadData.traveler) {
            return { isNegotiationActive: false ,
                finalStatusMessage: ''
            };
        }
        const { offers, requester, traveler } = threadData;
        const latestOffer = offers[offers.length - 1];

        // QUERY WILL RUN IF STATUS IS ACCEPTED/PAID IF NOT IT WILL SKIP

        const iAmTheRequester = currentUser._id === requester._id;
        const wasLatestOfferSentByMe = currentUser._id === latestOffer.senderId;
        const isNegotiationActive = threadData.negotiation.status === 'pending';
        let finalStatusMessage = '';
        if (!isNegotiationActive) {
            const actionTaker = latestOffer.senderId === requester._id ? traveler : requester;
            const actionTakerName = actionTaker._id === currentUser._id ? "You" : actionTaker.username;
            finalStatusMessage = `${actionTakerName} ${threadData.negotiation.status} this offer.`;
        }
        return { iAmTheRequester, wasLatestOfferSentByMe, isNegotiationActive, finalStatusMessage };
    }, [currentUser, threadData]);

        const decryptedCode = useQuery(
        api.orders.getDecryptedCode,
        // Only run this query if we have an order and I'm the requester
        order && iAmTheRequester ? { orderId: order._id } : "skip"
        );

    // --- Loading and Error Gatekeeper (comes AFTER all hooks) ---
    if (threadData === undefined || currentUser === undefined) {
        return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
    }
    if (currentUser === null) {
        return (
            <View style={styles.loadingContainer}>
                <Ionicons name="alert-circle-outline" size={60} color={COLORS.error} />
                <Text style={styles.errorText}>Could not identify current user.</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.errorButton}><Text style={styles.buttonTextPrimary}>Go Back</Text></TouchableOpacity>
            </View>
        );
    }
    if (threadData === null || !threadData.requester || !threadData.traveler || !threadData.trip || !threadData.negotiation || !threadData.request ) {
        return (
            <View style={styles.loadingContainer}>
                <Ionicons name="alert-circle-outline" size={60} color={COLORS.error} />
                <Text style={styles.errorText}>Offer data could not be loaded.</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.errorButton}><Text style={styles.buttonTextPrimary}>Go Back</Text></TouchableOpacity>
            </View>
        );      
    }

    // --- Data is now guaranteed to be valid ---
    const { request, offers, requester, traveler, trip, negotiation } = threadData;
    const latestOffer = offers[offers.length - 1];
    const otherUser = iAmTheRequester ? traveler : requester;


    // --- Fully Implemented Event Handlers ---
    const handleNegotiate = async () => {
        if (!currentUser) return;
        const fee = parseFloat(newFee);
        if (isNaN(fee) || fee <= 0) {
            Alert.alert("Invalid Amount", "Please enter a valid fee.");
            return;
        }
        setIsSubmitting(true);
        try {
            await createCounterOffer({ negotiationId: negotiation._id, newFee: fee });
            setNegotiateModalVisible(false);
            setNewFee('');
        } catch (error) {
            Alert.alert("Error", "Could not send the offer. Please try again.");
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleAccept = async () => {
        if (!currentUser) return;
        setIsSubmitting(true);
        try {
            await acceptOffer({ offerId: latestOffer._id });
            // router.push({
            //     pathname: '/(stack)/payment',
            //     params: { negotiationId: threadData.negotiation._id }
            // })
        } catch (error) {
            Alert.alert("Error", "Could not accept the offer.", [{ text: "OK" }]);
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    }
    
    const handleReject = async () => {
        if (!currentUser) return;
        setIsSubmitting(true);
        try {
            await rejectOffer({ offerId: latestOffer._id });
            Alert.alert("Offer Rejected", "You have rejected this offer.", [{ text: "OK", onPress: () => router.back() }]);
        } catch (error) {
            Alert.alert("Error", "Could not reject the offer.", [{ text: "OK" }]);
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleCancel = async () => {
        if (!currentUser) return;
        setIsSubmitting(true);
        try {
            await cancelOffer({ offerId: latestOffer._id });
            Alert.alert("Request Cancelled", "You have cancelled this request.", [{ text: "OK", onPress: () => router.back() }]);
        } catch (error) {
            Alert.alert("Error", "Could not cancel the request.", [{ text: "OK" }]);
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    }

    // --- Status Hub Content Logic ---
    let statusIcon: React.ComponentProps<typeof Ionicons>['name'] = 'help-circle-outline';
    let statusTitle = '';
    let statusDescription = '';
    let statusTheme = 'info';

    if (negotiation.status === 'pending') {
        if (wasLatestOfferSentByMe) {
            statusIcon = 'time-outline';
            statusTitle = 'Offer Sent';
            statusDescription = `Waiting for ${otherUser.username} to respond to your offer.`;
            statusTheme = 'pending';
        } else {
            statusIcon = 'sparkles-outline';
            statusTitle = 'Awaiting Your Action';
            statusDescription = 'Review the latest offer and choose to accept, reject, or propose a new fee.';
            statusTheme = 'action';
        }
    } else if (negotiation.status === 'accepted') {
        if (iAmTheRequester) {
            statusIcon = 'card-outline';
            statusTitle = 'Offer Accepted! Final Step';
            statusDescription = 'Proceed to payment to finalize the deal. This will open a private chat with the traveler.';
            statusTheme = 'success';
        } else {
            statusIcon = 'time-outline';
            statusTitle = 'Offer Accepted!';
            statusDescription = `Waiting for ${otherUser.username} to complete the payment. The chat will be enabled once payment is confirmed.`;
            statusTheme = 'pending';
        }
    } else if (negotiation.status === 'paid') {
        statusIcon = 'chatbubbles-outline';
        statusTitle = 'Deal is On!';
        statusDescription = iAmTheRequester
            ? "Payment secured. Chat with your traveler below. IMPORTANT: Do not share the confirmation code until you've received your item."
            : "Payment secured. Chat with the requester below. IMPORTANT: Remember to ask for the confirmation code upon successful delivery.";
        statusTheme = 'success';
    } else { // 'rejected' or 'cancelled'
        statusIcon = 'close-circle-outline';
        statusTitle = 'Offer Closed';
        statusDescription = finalStatusMessage;
        statusTheme = 'rejected';
    }

    // FIX: Helper function to get the correct style object in a type-safe way
    const getStatusHubStyle = () => {
        switch (statusTheme) {
            case 'action': return styles.statusHub_action;
            case 'pending': return styles.statusHub_pending;
            case 'success': return styles.statusHub_success;
            case 'rejected': return styles.statusHub_rejected;
            default: return styles.statusHub_info;
        }
    };



    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 24 : 24} 
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} disabled={isSubmitting}><Ionicons name="arrow-back" size={26} color={COLORS.text} /></TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{request.productName}</Text>
                <View style={{ width: 26 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* --- THE NEW STATUS HUB --- */}
                {/* FIX: Use the helper function for type-safe dynamic styles */}
                <View style={[styles.statusHub, getStatusHubStyle()]}>
                    <Ionicons name={statusIcon} size={28} color={COLORS.white} style={styles.statusHubIcon} />
                    <View style={styles.statusHubTextContainer}>
                        <Text style={styles.statusHubTitle}>{statusTitle}</Text>
                        <Text style={styles.statusHubDescription}>{statusDescription}</Text>
                    </View>
                </View>

                {/* DELIVERY CODE VISIBLE ONLY FOR REQUESTER*/}

                {negotiation.status === 'paid' && iAmTheRequester && (
                <View style={styles.codeSection}>
                    <Text style={styles.codeSectionTitle}>Your Delivery Code</Text>
                    <View style={styles.codeDisplayBox}>
                        <Text style={styles.codeText}>
                            {isCodeVisible ? decryptedCode : '••••••'}
                        </Text>
                        <TouchableOpacity onPress={() => setIsCodeVisible(!isCodeVisible)}>
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
                            IMPORTANT: Only share this code with the traveler AFTER you have received and inspected your item.
                        </Text>
                    </View>
                </View>
                )}

                {/* --- NEGOTIATION & CHAT HISTORY --- */}
                <Text style={styles.historyTitle}>
                    {negotiation.status === 'paid' ? 'Chat History' : 'Negotiation History'}
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
                        
                        const Avatar = <Image source={senderImage} style={styles.bubbleAvatar} />;

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
                                <Text style={[styles.chatText, isMe ? styles.myBubbleText : styles.theirBubbleText]}>{msg.message}</Text>
                                <Text style={[styles.bubbleTime, isMe ? styles.myBubbleText : styles.theirBubbleText]}>{formatRelativeTime(msg._creationTime)}</Text>
                            </View>
                        );

                        const Avatar = <Image source={senderImage} style={styles.bubbleAvatar} />;

                        return (
                            <View key={msg._id} style={[styles.bubbleContainer, isMe ? styles.myBubbleContainer : styles.theirBubbleContainer]}>
                                {isMe ? (<>{BubbleContent}{Avatar}</>) : (<>{Avatar}{BubbleContent}</>)}
                            </View>
                        );
                    })}


                </View>

                {/* --- TRIP & REQUEST DETAILS --- */}
                <View style={styles.detailsDivider} />
                
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="airplane-outline" size={20} color={COLORS.textSecondary} />
                        <Text style={styles.cardTitle}>Trip Details</Text>
                    </View>
                    <View style={styles.travelerInfo}>
                        {/* FIX: Provide a fallback empty string for the image URL */}
                        <Image source={traveler.imageURL ?? ''} style={styles.avatarSmall} />
                        <Text style={styles.detailValue}>Trip by <Text style={{fontWeight: 'bold'}}>{traveler.username}</Text></Text>
                        <Ionicons name="checkmark-circle" size={18} color={COLORS.green} style={{marginLeft: 6}} />
                    </View>
                    <View style={styles.tripRouteContainer}>
                        <View style={styles.locationPoint}><Text style={styles.locationLabel}>From</Text><Text style={styles.locationCity}>{trip.originCity}</Text></View>
                        <Ionicons name="arrow-forward-circle-outline" size={24} color={COLORS.primary} />
                        <View style={styles.locationPoint}><Text style={styles.locationLabel}>To</Text><Text style={styles.locationCity}>{trip.destinationCity}</Text></View>
                    </View>
                    <View style={styles.dateContainer}><Ionicons name="calendar-outline" size={16} color={COLORS.textSecondary} /><Text style={styles.dateText}>Arrives By {formatDate(trip.arrivalDate)}</Text></View>
                </View>

                <View style={styles.card}>
                    <View style={styles.cardHeader}><Ionicons name="cube-outline" size={20} color={COLORS.textSecondary} /><Text style={styles.cardTitle}>Request Summary</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Item Price:</Text><Text style={styles.detailValue}>${request.itemPrice.toFixed(2)}</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Original Reward:</Text><Text style={styles.detailValue}>${request.travelerFee.toFixed(2)}</Text></View>
                    {request.productURL && <TouchableOpacity style={styles.detailRow} onPress={() => Linking.openURL(request.productURL!)}><Text style={styles.detailLabel}>Product Link:</Text><Text style={styles.linkText}>View Online</Text></TouchableOpacity>}
                </View>
                
                {iAmTheRequester && negotiation.status === 'accepted' && (
                    <TouchableOpacity
                        style={[styles.floatingConfirmButton, isSubmitting && styles.buttonDisabled]}
                        disabled={isSubmitting}
                        onPress={() => router.push({
                            pathname: '/(stack)/payment',
                            params: { negotiationId: threadData.negotiation._id }
                        })}
                    >
                        <Ionicons name="card-outline" size={22} color={COLORS.white} />
                        <Text style={styles.floatingButtonText}>Proceed to Payment</Text>
                    </TouchableOpacity>
                )}
                {!iAmTheRequester && negotiation.status === 'paid' && order && (
                    <TouchableOpacity
                        style={[styles.floatingConfirmButton, isSubmitting && styles.buttonDisabled]}
                        disabled={isSubmitting}
                        onPress={() => router.push({
                            pathname: '/(stack)/confirm-delivery',
                            params: { negotiationId: threadData.negotiation._id } 
                        })}
                    >
                        <Ionicons name="checkmark-done-circle-outline" size={22} color={COLORS.white} />
                        <Text style={styles.floatingButtonText}>Confirm Delivery</Text>
                    </TouchableOpacity>
                )}
            </ScrollView>

            {negotiation.status === 'paid' ? (
                <MessageInput negotiationId={negotiation._id} />
            ) : (
                <View style={styles.footer}>
                    {negotiation.status === 'pending' && !wasLatestOfferSentByMe ? (
                        iAmTheRequester ? (
                            <>
                                <TouchableOpacity style={[styles.button, styles.buttonSecondary]} disabled={isSubmitting} onPress={handleCancel}><Text style={styles.buttonTextSecondary}>Cancel</Text></TouchableOpacity>
                                <TouchableOpacity style={[styles.button, styles.buttonSecondary]} disabled={isSubmitting} onPress={() => setNegotiateModalVisible(true)}><Text style={styles.buttonTextSecondary}>Negotiate</Text></TouchableOpacity>
                                <TouchableOpacity style={[styles.button, styles.buttonPrimary]} disabled={isSubmitting} onPress={handleAccept}><Text style={styles.buttonTextPrimary}>Accept</Text></TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <TouchableOpacity style={[styles.button, styles.buttonSecondary]} disabled={isSubmitting} onPress={handleReject}><Text style={styles.buttonTextSecondary}>Reject</Text></TouchableOpacity>
                                <TouchableOpacity style={[styles.button, styles.buttonSecondary]} disabled={isSubmitting} onPress={() => setNegotiateModalVisible(true)}><Text style={styles.buttonTextSecondary}>Negotiate</Text></TouchableOpacity>
                                <TouchableOpacity style={[styles.button, styles.buttonPrimary]} disabled={isSubmitting} onPress={handleAccept}><Text style={styles.buttonTextPrimary}>Accept</Text></TouchableOpacity>
                            </>
                        )
                    ) : (
                        <View style={styles.footerEmpty} />
                    )}
                </View>
        )}
                        
            <Modal animationType="fade" transparent={true} visible={negotiateModalVisible} onRequestClose={() => setNegotiateModalVisible(false)}>
                <Pressable style={styles.modalBackdrop} onPress={() => setNegotiateModalVisible(false)}>
                    <Pressable style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Propose a New Fee</Text>
                        <View style={styles.modalInputContainer}>
                            <Text style={styles.dollarSign}>$</Text>
                            <TextInput style={styles.modalInput} placeholder="45" placeholderTextColor={COLORS.placeholder} keyboardType="numeric" value={newFee} onChangeText={setNewFee} autoFocus={true} />
                        </View>
                        <TouchableOpacity style={[styles.modalButton, isSubmitting && styles.buttonDisabled]} onPress={handleNegotiate} disabled={isSubmitting}>
                            {isSubmitting ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.buttonTextPrimary}>Send New Offer</Text>}
                        </TouchableOpacity>
                    </Pressable>
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
const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const formatRelativeTime = (timestamp: number): string => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);
    const minutes = Math.floor(diffInSeconds / 60);
    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return past.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
    travelerInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    avatarSmall: { width: 32, height: 32, borderRadius: 16, marginRight: 10, backgroundColor: COLORS.separator },
    tripRouteContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
    locationPoint: { alignItems: 'center', flex: 1 },
    locationLabel: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 2 },
    locationCity: { color: COLORS.text, fontSize: 18, fontWeight: '600' },
    dateContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: 12, marginTop: 12, borderTopWidth: 1, borderTopColor: COLORS.separator },
    dateText: { color: COLORS.textSecondary, fontSize: 14, marginLeft: 8 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
    detailLabel: { color: COLORS.textSecondary, fontSize: 15 },
    detailValue: { color: COLORS.text, fontSize: 15, fontWeight: '500' },
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
    footer: {
        flexDirection: 'row',
        paddingLeft: 8,
        paddingRight:8,
        paddingBottom: Platform.OS === 'ios' ? 16 : 8,
        backgroundColor: COLORS.surface,
        borderTopWidth: 1,
        borderTopColor: COLORS.separator,
        gap: 10
    },
    footerEmpty: { height: 0 },
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
        letterSpacing: 4, // Spreads out the numbers/dots
    },
    warningBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFBEB', // A light yellow warning color
        borderRadius: 8,
        padding: 12,
        gap: 10,
    },
    warningText: {
        flex: 1,
        color: '#B45309', // A darker orange/brown for text
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