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
    KeyboardAvoidingView, // Import KeyboardAvoidingView
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
            return { isNegotiationActive: false };
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

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} disabled={isSubmitting}><Ionicons name="close-outline" size={32} color={COLORS.text} /></TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{request.productName}</Text>
                <View style={{ width: 32 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.card}>
                    <View style={styles.cardHeader}><Ionicons name="airplane" size={20} color={COLORS.textSecondary} /><Text style={styles.cardTitle}>Trip Details</Text></View>
                    <View style={styles.travelerInfo}><Image source={traveler.imageURL} style={styles.avatarSmall} /><Text style={styles.detailValue}>Trip by <Text style={{fontWeight: 'bold'}}>{traveler.username}</Text></Text></View>
                    <View style={styles.tripRouteContainer}>
                        <View style={styles.locationPoint}><Text style={styles.locationLabel}>From</Text><Text style={styles.locationCity}>{trip.originCity}</Text><Text style={styles.locationCountry}>{trip.originCountry}</Text></View>
                        <View style={styles.tripLine} />
                        <View style={styles.locationPoint}><Text style={styles.locationLabel}>To</Text><Text style={styles.locationCity}>{trip.destinationCity}</Text><Text style={styles.locationCountry}>{trip.destinationCountry}</Text></View>
                    </View>
                    <View style={styles.dateContainer}><Ionicons name="calendar-outline" size={16} color={COLORS.textSecondary} /><Text style={styles.dateText}>Arrives By {formatDate(trip.arrivalDate)}</Text></View>
                </View>

                <View style={styles.card}>
                    <View style={styles.cardHeader}><Ionicons name="cube-outline" size={20} color={COLORS.textSecondary} /><Text style={styles.cardTitle}>Request Summary</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Item Price:</Text><Text style={styles.detailValue}>${request.itemPrice.toFixed(2)}</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Original Reward:</Text><Text style={styles.detailValue}>${request.travelerFee.toFixed(2)}</Text></View>
                    <View style={styles.separator} />
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Quantity:</Text><Text style={styles.detailValue}>{request.quantity}</Text></View>
                    {request.itemTypes && <View style={styles.detailRow}><Text style={styles.detailLabel}>Category:</Text><Text style={styles.detailValue}>{request.itemTypes}</Text></View>}
                    {request.productWeight && <View style={styles.detailRow}><Text style={styles.detailLabel}>Weight:</Text><Text style={styles.detailValue}>{request.productWeight}</Text></View>}
                    {request.productURL && <TouchableOpacity style={styles.detailRow} onPress={() => Linking.openURL(request.productURL!)}><Text style={styles.detailLabel}>Link:</Text><Text style={styles.linkText}>View Product Online</Text></TouchableOpacity>}
                </View>

                <Text style={styles.historyTitle}>Negotiation History</Text>
                <View style={styles.historyContainer}>
                    {offers.map((offer) => {
                        const isMe = offer.senderId === currentUser._id;
                        const senderImage = isMe ? currentUser.imageURL : (iAmTheRequester ? traveler.imageURL : requester.imageURL);
                        
                        const BubbleContent = (
                            <View style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble]}>
                                <Text style={styles.bubbleFee}>${offer.proposedFee.toFixed(2)}</Text>
                                <Text style={styles.bubbleTime}>{formatRelativeTime(offer._creationTime)}</Text>
                            </View>
                        );
                        
                        const Avatar = <Image source={senderImage} style={styles.bubbleAvatar} />;

                        return (
                            <View key={offer._id} style={[styles.bubbleContainer, isMe ? styles.myBubbleContainer : styles.theirBubbleContainer]}>
                                {isMe ? (
                                    <>
                                        {BubbleContent}
                                        {Avatar}
                                    </>
                                ) : (
                                    <>
                                        {Avatar}
                                        {BubbleContent}
                                    </>
                                )}
                            </View>
                        );
                    })}

                    

                </View>

                
                {iAmTheRequester && negotiation.status === 'accepted' && (
                    <TouchableOpacity
                        style={styles.floatingConfirmButton}
                        onPress={() => router.push({
                            pathname: '/(stack)/payment',
                            params: { negotiationId: threadData.negotiation._id }
                        })}
                    >
                        <Text>OFFER IS ACCEPTED. PAY TO BE ABLE TO CHAT WITH TRAVELER AND TRAVELER STARTS DOING THEIR PART OF THE DEAL</Text>
                    </TouchableOpacity>
                )}


                {/* DISPLAY CHAT MESSAGE IF OFFER IS PAID */}
                {negotiation.status === 'paid' && messages && (
                    <>
                        <Text style={styles.historyTitle}>Chat</Text>
                        <View style={styles.historyContainer}>
                            {messages.map((msg) =>{
                                const isMe = msg.senderId === currentUser._id;
                                const sender = isMe ? currentUser : (iAmTheRequester ? traveler : requester);

                                const BubbleContent = (
                                    <View style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble, styles.chatBubble]}>
                                        <Text style={styles.chatText}>{msg.message}</Text>
                                        <Text style={styles.bubbleTime}>{formatRelativeTime(msg._creationTime)}</Text>
                                    </View>
                                );

                                const Avatar = <Image source={sender.imageURL} style={styles.bubbleAvatar} />;

                                return (
                                    <View key={msg._id} style={[styles.bubbleContainer, isMe ? styles.myBubbleContainer : styles.theirBubbleContainer]}>
                                        {isMe ? (
                                            <>
                                                {BubbleContent}
                                                {Avatar}
                                            </>
                                        ) : (
                                            <>
                                                {Avatar}
                                                {BubbleContent}
                                            </>
                                        )}
                                    </View>
                                )
                            })}

                            {currentUser._id === negotiation.travelerId && negotiation.status === 'paid' && (
                            <TouchableOpacity
                                style={styles.floatingConfirmButton}
                                onPress={() => router.push({
                                    pathname: '/(stack)/confirm-delivery',
                                    params: { negotiationId: negotiation._id }
                                })}
                            >
                                <Text>Confirm Delivery</Text>
                            </TouchableOpacity>
                            )}

                        </View>

                        

                    </>
                )}
            </ScrollView>

            <View style={styles.footer}>
                {negotiation.status === 'pending' ? (
                    iAmTheRequester ? (
                        <>
                            <TouchableOpacity style={[styles.button, styles.buttonSecondary, (wasLatestOfferSentByMe || isSubmitting) && styles.buttonDisabled]} disabled={wasLatestOfferSentByMe || isSubmitting} onPress={handleCancel}><Text style={styles.buttonTextSecondary}>Cancel</Text></TouchableOpacity>
                            <TouchableOpacity style={[styles.button, styles.buttonSecondary, (wasLatestOfferSentByMe || isSubmitting) && styles.buttonDisabled]} disabled={wasLatestOfferSentByMe || isSubmitting} onPress={() => setNegotiateModalVisible(true)}><Text style={styles.buttonTextSecondary}>Negotiate</Text></TouchableOpacity>
                            <TouchableOpacity style={[styles.button, styles.buttonPrimary, (wasLatestOfferSentByMe || isSubmitting) && styles.buttonDisabled]} disabled={wasLatestOfferSentByMe || isSubmitting} onPress={handleAccept}><Text style={styles.buttonTextPrimary}>Accept</Text></TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <TouchableOpacity style={[styles.button, styles.buttonSecondary, (wasLatestOfferSentByMe || isSubmitting) && styles.buttonDisabled]} disabled={wasLatestOfferSentByMe || isSubmitting} onPress={handleReject}><Text style={styles.buttonTextSecondary}>Reject</Text></TouchableOpacity>
                            <TouchableOpacity style={[styles.button, styles.buttonSecondary, (wasLatestOfferSentByMe || isSubmitting) && styles.buttonDisabled]} disabled={wasLatestOfferSentByMe || isSubmitting} onPress={() => setNegotiateModalVisible(true)}><Text style={styles.buttonTextSecondary}>Negotiate</Text></TouchableOpacity>
                            <TouchableOpacity style={[styles.button, styles.buttonPrimary, (wasLatestOfferSentByMe || isSubmitting) && styles.buttonDisabled]} disabled={wasLatestOfferSentByMe || isSubmitting} onPress={handleAccept}><Text style={styles.buttonTextPrimary}>Accept</Text></TouchableOpacity>
                        </>
                    )
                ) : negotiation.status === 'paid' ? (
                    // OFFER IS ACCEPTED / PAID , SHOW CHAT INPUT AND AREA
                    <MessageInput negotiationId={negotiation._id} />
                ) : (
                    // OFFER IS REJECTED / CANCELED , SHOW FINAL STATUS
                    <View style={[styles.statusBanner, styles.statusBannerRejected]}>
                        <Ionicons name={"close-circle"} size={20} color={COLORS.text} />
                        <Text style={styles.statusBannerText}>{finalStatusMessage}</Text>
                    </View>
                )}
            </View>
            
            <Modal animationType="fade" transparent={true} visible={negotiateModalVisible} onRequestClose={() => setNegotiateModalVisible(false)}>
                <Pressable style={styles.modalBackdrop} onPress={() => setNegotiateModalVisible(false)}>
                    <Pressable style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Propose a New Fee</Text>
                        <View style={styles.modalInputContainer}>
                            <Text style={styles.dollarSign}>$</Text>
                            <TextInput style={styles.modalInput} placeholder="45" placeholderTextColor={COLORS.placeholder} keyboardType="numeric" value={newFee} onChangeText={setNewFee} autoFocus={true} />
                        </View>
                        <TouchableOpacity style={[styles.modalButton, isSubmitting && styles.buttonDisabled]} onPress={handleNegotiate} disabled={isSubmitting}>
                            {isSubmitting ? <ActivityIndicator color={COLORS.text} /> : <Text style={styles.buttonTextPrimary}>Send New Offer</Text>}
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>
        </KeyboardAvoidingView>
    );
}

// --- Styles and Constants ---
const COLORS = { primary: '#0A84FF', background: '#000000', contentBackground: '#1C1C1E', card: '#2C2C2E', text: '#FFFFFF', textSecondary: '#AEAEB2', separator: '#38383A', disabled: '#4A4A4E', green: '#30D158', red: '#FF453A', error: '#FF453A', myBubble: '#0A84FF', theirBubble: '#3A3A3C', placeholder: '#636366' };
const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
const formatRelativeTime = (timestamp: number): string => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);
    const minutes = Math.floor(diffInSeconds / 60);
    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return past.toLocaleDateString();
};
const styles = StyleSheet.create({
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background, padding: 20 },
    errorText: { color: COLORS.text, fontSize: 18, fontWeight: '600', marginTop: 16, textAlign: 'center' },
    errorButton: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, marginTop: 20 },
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 50 : 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.separator },
    headerTitle: { color: COLORS.text, fontSize: 17, fontWeight: '600', flex: 1, textAlign: 'center', marginHorizontal: 10 },
    scrollContent: { padding: 16, paddingBottom: 120 },
    card: { backgroundColor: COLORS.contentBackground, borderRadius: 12, padding: 16, marginBottom: 16 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.separator, paddingBottom: 10, marginBottom: 10 },
    cardTitle: { color: COLORS.text, fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
    travelerInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    avatarSmall: { width: 32, height: 32, borderRadius: 16, marginRight: 10, backgroundColor: COLORS.card },
    tripRouteContainer: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 8 },
    locationPoint: { alignItems: 'center', flex: 1 },
    locationLabel: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 2 },
    locationCity: { color: COLORS.text, fontSize: 18, fontWeight: '600' },
    locationCountry: { color: COLORS.textSecondary, fontSize: 14 },
    tripLine: { height: '100%', width: 1, backgroundColor: COLORS.separator },
    dateContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: 12, marginTop: 12, borderTopWidth: 1, borderTopColor: COLORS.separator },
    dateText: { color: COLORS.textSecondary, fontSize: 14, marginLeft: 8 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
    detailLabel: { color: COLORS.textSecondary, fontSize: 15 },
    detailValue: { color: COLORS.text, fontSize: 15, fontWeight: '500', flex: 1, textAlign: 'right' },
    linkText: { color: COLORS.primary, fontSize: 15, fontWeight: '500' },
    separator: { height: 1, backgroundColor: COLORS.separator, marginVertical: 8 },
    historyTitle: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600', textTransform: 'uppercase', marginLeft: 8, marginBottom: 8 },
    historyContainer: { paddingHorizontal: 8 },
    bubbleContainer: { flexDirection: 'row', marginVertical: 8, alignItems: 'flex-end' },
    myBubbleContainer: { justifyContent: 'flex-end' },
    theirBubbleContainer: { justifyContent: 'flex-start' },
    bubbleAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.card, marginHorizontal: 4 },
    bubble: { maxWidth: '80%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
    myBubble: { backgroundColor: COLORS.myBubble, borderBottomRightRadius: 4 },
    theirBubble: { backgroundColor: COLORS.theirBubble, borderBottomLeftRadius: 4 },
    bubbleFee: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
    bubbleTime: { color: COLORS.text, fontSize: 12, opacity: 0.7, marginTop: 4, alignSelf: 'flex-end' },
    chatBubble: {
        paddingVertical: 8,
    },
    chatText: {
        color: COLORS.text,
        fontSize: 16,
    },
    footer: {
        // The footer is no longer absolutely positioned, KeyboardAvoidingView handles it
        flexDirection: 'row',
        padding: 6,
        paddingBottom: Platform.OS === 'ios' ? 30 : 16,
        backgroundColor: COLORS.contentBackground,
        borderTopWidth: 0,
        borderTopColor: COLORS.separator,
        gap: 10
    },
    statusBanner: { flex: 1, height: 52, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    statusBannerAccepted: { backgroundColor: COLORS.green },
    statusBannerRejected: { backgroundColor: COLORS.red },
    statusBannerText: { color: COLORS.text, fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
    button: { flex: 1, height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    buttonPrimary: { backgroundColor: COLORS.primary },
    buttonSecondary: { backgroundColor: COLORS.card },
    buttonTextPrimary: { color: COLORS.text, fontSize: 16, fontWeight: 'bold' },
    buttonTextSecondary: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
    buttonDisabled: { opacity: 0.5 },
    modalBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' },
    modalContent: { backgroundColor: COLORS.card, borderRadius: 14, padding: 20, width: '90%' },
    modalTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    modalInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.contentBackground, borderRadius: 10, paddingHorizontal: 12, marginBottom: 16 },
    dollarSign: { color: COLORS.text, fontSize: 24, fontWeight: 'bold', marginRight: 4 },
    modalInput: { flex: 1, color: COLORS.text, fontSize: 24, fontWeight: 'bold', height: 50 },
    modalButton: { height: 50, borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.primary },
    floatingConfirmButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    marginHorizontal: 16,
},
});