import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useUser } from '@clerk/clerk-expo';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AntDesign from '@expo/vector-icons/AntDesign';
import { useMutation, useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import LottieView from 'lottie-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, LayoutAnimation, Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import CountryFlag from "react-native-country-flag";
import Animated, { FadeIn } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';




const COLORS = {
    primary: '#007BFF',
    primary_light: '#4DA3FF',
    white: '#FFFFFF',
    grey: '#AEAEB2',
    dark: '#1C1C1E',
    card: '#2C2C2E',
    reward: '#34C759',
};

type RequestProps = {
    request:{
        _id: Id<"requests">;
        _creationTime: number;
        description?: string;
        productURL?: string;
        productWeight?: string;
        originCity: string;
        destinationCity: string;
        itemTypes?: string;
        requiredByDate: string;
        itemPrice: number;
        quantity: number;
        travelerFee: number;
        productName: string;
        originCountry: string;
        destinationCountry: string;
        status: string;
        originCountryCode: string;
        destinationCountryCode: string;
        requester:{
            _id: string;
            username: string;
            image: string;
        };
    }
}

export default function Request({request}: RequestProps) {
    const animation = useRef<LottieView>(null);
    useEffect(() => {
        // animation.current?.play();
    }, []);

    const formattedDate = new Date(request.requiredByDate).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
    });

    const {user} = useUser();
    const currentUser = useQuery(api.users.getUserByClerkId, user ? {clerkId: user?.id} : "skip");
    
    const { itemTotal } = useMemo(() => {
        const itemTotal = request.itemPrice * request.quantity;
        return { itemTotal };
    }, [request.itemPrice, request.quantity]);

    const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

    const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
    const [isEditModalVisible, setEditModalVisible] = useState(false);
    const [isOfferModalVisible, setOfferModalVisible] = useState(false);
    const [isDescriptionExpanded, setDescriptionExpanded] = useState(false);
    const [proposedFee, setProposedFee] = useState(request.travelerFee.toFixed(2));
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const deleteRequest = useMutation(api.requests.deleteRequest);
    const createInitialOffer = useMutation(api.offers.createInitialOffer);
    
    const isOwner = currentUser?._id === request.requester._id;
    const isPotentialTraveler = currentUser && !isOwner;

    const myMatchingTrips = useQuery(
        api.trips.getMyMatchingTrips,
        isPotentialTraveler ? { originCity: request.originCity, destinationCity: request.destinationCity } : "skip"
    );
    const isLoadingTrips = myMatchingTrips === undefined;

    // Handlers
    const handleDeleteWithConfirmation = async () => {
        try {
            await deleteRequest({ requestId: request._id });
            setDeleteModalVisible(false);
        } catch (error) {
            alert("Error deleting the request");
        }
    };
    
    const handleEditWithConfirmation = () => {
        router.push({ pathname: '/orders', params: { request: JSON.stringify(request) } });
        setEditModalVisible(false);
    };

    const handleOpenOfferModal = () => {
        if (!myMatchingTrips || myMatchingTrips.length === 0) {
            Alert.alert(
                "No Matching Trip",
                `You need a trip from ${request.originCity} to ${request.destinationCity} to make an offer.`
            );
            return;
        }
        setOfferModalVisible(true);
    };

    const handleSubmitOffer = async () => {
        setIsSubmitting(true);
        const fee = parseFloat(proposedFee);
        if (isNaN(fee) || fee <= 0) {
            Alert.alert("Invalid Fee", "Please enter a valid amount.");
            setIsSubmitting(false);
            return;
        }
        if (!myMatchingTrips || myMatchingTrips.length === 0) {
            setIsSubmitting(false);
            return;
        }
        
        const tripIdforOffer = myMatchingTrips[0]._id;
        try {
            const result = await createInitialOffer({
                requestId: request._id,
                tripId: tripIdforOffer,
                proposedFee: fee,
            });
            if (result.success && result.negotiationId) {
                setOfferModalVisible(false);
                router.push({ pathname: '/(stack)/offers', params: { id: result.negotiationId } });
            } else if (result.reason === "DUPLICATE_OFFER") {
                setOfferModalVisible(false)
                setIsSubmitting(false)
                Toast.show({
                    type:'info',
                    text1:'You Already Have an Offer',
                    text2:'You can view your existing offer in the inbox.',

                })
            }
        } catch (error) {
            Alert.alert("Error", (error as Error).message || "Could not send offer.");
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const toggleDescription = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setDescriptionExpanded(!isDescriptionExpanded);
    };

    const handleProductLink = async () => {
        if (!request.productURL) return;
        
        try {
            await WebBrowser.openBrowserAsync('https://' + request.productURL);
        } catch (error) {
            Alert.alert(`Could not open this URL: ${request.productURL}`);
        }
    };

    return (
        <Animated.View style={cardStyles.cardContainer} entering={FadeIn.duration(500)}>
            {/* Confirmation Modals */}
            <Modal animationType='fade' transparent={true} visible={isDeleteModalVisible} onRequestClose={() => setDeleteModalVisible(false)}>
                <View style={cardStyles.modalCenteredView}><View style={cardStyles.modalView}><Text style={cardStyles.modalTitle}>Confirm Deletion</Text><Text style={cardStyles.modalText}>Are you sure you want to delete this request? This action cannot be undone.</Text><View style={cardStyles.modalButtonContainer}><TouchableOpacity style={[cardStyles.modalButton, cardStyles.modalButtonCancel]} onPress={() => setDeleteModalVisible(false)}><Text style={cardStyles.modalButtonText}>Cancel</Text></TouchableOpacity><TouchableOpacity style={[cardStyles.modalButton, cardStyles.modalButtonConfirm]} onPress={handleDeleteWithConfirmation}><Text style={cardStyles.modalButtonText}>Confirm</Text></TouchableOpacity></View></View></View>
            </Modal>
            <Modal animationType='fade' transparent={true} visible={isEditModalVisible} onRequestClose={() => setEditModalVisible(false)}>
                <View style={cardStyles.modalCenteredView}><View style={cardStyles.modalView}><Text style={cardStyles.modalTitle}>Confirm Edit</Text><Text style={cardStyles.modalText}>Are you sure you want to edit this request? You will be taken to the editing screen.</Text><View style={cardStyles.modalButtonContainer}><TouchableOpacity style={[cardStyles.modalButton, cardStyles.modalButtonCancel]} onPress={() => setEditModalVisible(false)}><Text style={cardStyles.modalButtonText}>Cancel</Text></TouchableOpacity><TouchableOpacity style={[cardStyles.modalButton, cardStyles.modalButtonConfirm]} onPress={handleEditWithConfirmation}><Text style={cardStyles.modalButtonText}>Confirm</Text></TouchableOpacity></View></View></View>
            </Modal>

            {/* Card Header */}
            <View style={cardStyles.cardHeader}>
                <Link href={`/user/${request.requester._id}`} asChild><TouchableOpacity style={cardStyles.travelerInfo}><Image source={{ uri: request.requester.image }} style={cardStyles.travelerAvatar} /><Text style={cardStyles.travelerName}>{request.requester.username}</Text></TouchableOpacity></Link>
                <View style={cardStyles.headerActions}>
                    {isOwner ? (<><TouchableOpacity onPress={() => setEditModalVisible(true)}><AntDesign name='edit' size={20} color={COLORS.grey} style={{ marginRight: 16 }} /></TouchableOpacity><TouchableOpacity onPress={() => setDeleteModalVisible(true)}><Ionicons name='trash-outline' size={20} color={COLORS.grey} /></TouchableOpacity></>) : (<TouchableOpacity><Ionicons name='ellipsis-horizontal' size={20} color={COLORS.white} /></TouchableOpacity>)}
                </View>
            </View>
            
            <View style={cardStyles.productHeaderContainer}>
                <Text style={cardStyles.productName}>{request.productName}</Text>
                {request.productURL && (
                    <TouchableOpacity style={cardStyles.productLinkButton} onPress={handleProductLink}>
                        <Ionicons name="link-outline" size={16} color={COLORS.primary} />
                        <Text style={cardStyles.productLinkText}>View Product</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* TRAVEL ROUTE */}
            <View style={cardStyles.travelRouteContainer}>
                <View style={cardStyles.locationPoint}><CountryFlag isoCode={request.originCountryCode.toLowerCase()} size={18} /><Text style={cardStyles.cityText}>{request.originCity}</Text><Text style={cardStyles.countryText}>{request.originCountry}</Text></View>
                <View style={cardStyles.routeLine}><View style={cardStyles.dot} /><View style={cardStyles.dashedLine} /><LottieView ref={animation} style={cardStyles.lottiePlane} source={require('@/assets/animations/airplane.json')} autoPlay loop /><View style={cardStyles.dashedLine} /><View style={cardStyles.dot} /></View>
                <View style={cardStyles.locationPoint}><CountryFlag isoCode={request.destinationCountryCode.toLowerCase()} size={18} /><Text style={cardStyles.cityText}>{request.destinationCity}</Text><Text style={cardStyles.countryText}>{request.destinationCountry}</Text></View>
            </View>

            {/* FINANCIALS */}
            <View style={cardStyles.financialsContainer}>
                <View style={cardStyles.financialItem}>
                    <Text style={cardStyles.financialLabel}>Traveler Reward</Text>
                    <Text style={cardStyles.rewardValue}>{formatCurrency(request.travelerFee)}</Text>
                </View>
                <View style={cardStyles.financialItem}>
                    <Text style={cardStyles.financialLabel}>Product Price</Text>
                    <Text style={cardStyles.financialValue}>{formatCurrency(itemTotal)}</Text>
                </View>
            </View>
            
            {/* DETAILS (Redesigned Dashboard Style) */}
            <View style={cardStyles.detailsContainer}>
                <View style={cardStyles.detailItem}>
                    <MaterialCommunityIcons name="calendar-clock" size={20} color={COLORS.primary} style={{marginBottom: 4}}/>
                    <Text style={cardStyles.detailValue} numberOfLines={1}>{formattedDate.split(',')[0]}</Text>
                    <Text style={cardStyles.detailLabel}>DELIVER BY</Text>
                </View>
                <View style={cardStyles.detailItem}>
                    <MaterialCommunityIcons name="package-variant-closed" size={20} color={COLORS.primary} style={{marginBottom: 4}}/>
                    <Text style={cardStyles.detailValue}>{request.quantity}</Text>
                    <Text style={cardStyles.detailLabel}>QUANTITY</Text>
                </View>
                {request.productWeight && 
                    <View style={cardStyles.detailItem}>
                        <FontAwesome5 name="weight-hanging" size={18} color={COLORS.primary} style={{marginBottom: 4}}/>
                        <Text style={cardStyles.detailValue} numberOfLines={1}>{request.productWeight}</Text>
                        <Text style={cardStyles.detailLabel}>WEIGHT</Text>
                    </View>
                }
                {request.itemTypes && 
                    <View style={cardStyles.detailItem}>
                        <MaterialCommunityIcons name="tag-outline" size={20} color={COLORS.primary} style={{marginBottom: 4}}/>
                        <Text style={cardStyles.detailValue} numberOfLines={1}>{request.itemTypes}</Text>
                        <Text style={cardStyles.detailLabel}>CATEGORY</Text>
                    </View>
                }
            </View>

            {/* DESCRIPTION */}
            {request.description && (
                <View style={cardStyles.descriptionContainer}>
                    <Text style={cardStyles.descriptionText} numberOfLines={isDescriptionExpanded ? undefined : 2}>{request.description}</Text>
                    <TouchableOpacity onPress={toggleDescription}><Text style={cardStyles.readMoreText}>{isDescriptionExpanded ? 'Read Less' : 'Read More'}</Text></TouchableOpacity>
                </View>
            )}

            {/* Action Button */}
            {isPotentialTraveler && (
                <Pressable onPress={handleOpenOfferModal} disabled={isLoadingTrips} style={{marginTop: 16}}>
                    <LinearGradient colors={isLoadingTrips ? [COLORS.grey, COLORS.grey] : [COLORS.primary_light, COLORS.primary]} style={cardStyles.actionButton}>
                        <FontAwesome5 name="hand-holding-usd" size={16} color={COLORS.white} />
                        <Text style={cardStyles.actionButtonText}>{isLoadingTrips ? 'Checking Trips...' : 'Offer Delivery'}</Text>
                    </LinearGradient>
                </Pressable>
            )}

            {/* Offer Submission Modal */}
            <Modal transparent={true} visible={isOfferModalVisible} onRequestClose={() => setOfferModalVisible(false)}>
                <Pressable style={cardStyles.modalCenteredView} onPress={() => setOfferModalVisible(false)}>
                    <Pressable style={cardStyles.modalView}>
                        <Text style={cardStyles.modalTitle}>Propose a Delivery Fee</Text>
                        <View style={cardStyles.modalInputContainer}>
                            <Text style={cardStyles.dollarSign}>$</Text>
                            <TextInput style={cardStyles.modalInput} placeholder={request.travelerFee.toFixed(2)} placeholderTextColor={COLORS.grey} keyboardType="numeric" value={proposedFee} onChangeText={setProposedFee} autoFocus={true}/>
                        </View>
                        <Pressable onPress={handleSubmitOffer} disabled={isSubmitting}>
                            <LinearGradient colors={isSubmitting ? [COLORS.grey, COLORS.grey] : [COLORS.primary_light, COLORS.primary]} style={cardStyles.modalSubmitButton}>
                                {isSubmitting ? <ActivityIndicator color={COLORS.white} /> : <Text style={cardStyles.modalButtonText}>Send Offer</Text>}
                            </LinearGradient>
                        </Pressable>
                    </Pressable>
                </Pressable>
            </Modal>
        </Animated.View>
    );
}


const cardStyles = StyleSheet.create({
    cardContainer: { backgroundColor: COLORS.card, borderRadius: 24, padding: 16, marginVertical: 8, marginHorizontal: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    travelerInfo: { flexDirection: 'row', alignItems: 'center' },
    travelerAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
    travelerName: { fontSize: 16, fontWeight: '600', color: COLORS.white },
    headerActions: { flexDirection: 'row', alignItems: 'center' },
    productHeaderContainer: { marginBottom: 16 },
    productName: { fontSize: 22, fontWeight: 'bold', color: COLORS.white },
    productLinkButton: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingVertical: 4, marginTop: 4 },
    productLinkText: { color: COLORS.primary, fontWeight: '600', marginLeft: 6 },
    travelRouteContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    locationPoint: { alignItems: 'center', flex: 1, paddingHorizontal: 4 },
    cityText: { fontSize: 16, fontWeight: 'bold', color: COLORS.white, marginTop: 4 },
    countryText: { fontSize: 12, color: COLORS.grey },
    routeLine: { flex: 1.5, flexDirection: 'row', alignItems: 'center' },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.grey },
    dashedLine: { height: 1, flex: 1, borderBottomWidth: 1, borderBottomColor: COLORS.grey, borderStyle: 'dashed' },
    lottiePlane: { width: 40, height: 40 },
    financialsContainer: { marginTop: 16, flexDirection: 'row', justifyContent: 'space-around', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
    financialItem: { alignItems: 'center', flex: 1 },
    financialLabel: { color: COLORS.grey, fontSize: 12, textTransform: 'uppercase', fontWeight: '600', marginBottom: 4 },
    financialValue: { color: COLORS.white, fontSize: 18, fontWeight: '600' },
    rewardValue: { color: COLORS.reward, fontSize: 20, fontWeight: 'bold' },
    detailsContainer: { marginTop: 16, flexDirection: 'row', justifyContent: 'space-around', borderBottomWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', paddingBottom: 16 },
    detailItem: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
    detailValue: { fontSize: 13, fontWeight: '600', color: COLORS.white, textAlign: 'center' },
    detailLabel: { fontSize: 10, color: COLORS.grey, textTransform: 'uppercase', fontWeight: 'bold', marginTop: 2 },
    descriptionContainer: { marginTop: 12 },
    descriptionText: { color: COLORS.grey, fontSize: 14, lineHeight: 21 },
    readMoreText: { color: COLORS.primary, fontWeight: 'bold', marginTop: 4 },
    actionButton: { borderRadius: 16, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
    actionButtonText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
    modalCenteredView: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.7)' },
    modalView: { width: '85%', backgroundColor: COLORS.card, borderRadius: 20, padding: 25, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.white, marginBottom: 15 },
    modalText: { marginBottom: 20, textAlign: 'center', color: COLORS.grey, lineHeight: 20 },
    modalInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.dark, borderRadius: 10, paddingHorizontal: 15, marginBottom: 20, width: '100%' },
    dollarSign: { fontSize: 20, color: COLORS.grey, marginRight: 5 },
    modalInput: { flex: 1, color: COLORS.white, fontSize: 20, paddingVertical: 12 },
    modalSubmitButton: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', width: 200 },
    modalButtonContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 10 },
    modalButton: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20, flex: 1, marginHorizontal: 5, alignItems: 'center' },
    modalButtonCancel: { backgroundColor: COLORS.grey },
    modalButtonConfirm: { backgroundColor: COLORS.primary },
    modalButtonText: { color: 'white', fontWeight: 'bold', textAlign: 'center' },
});