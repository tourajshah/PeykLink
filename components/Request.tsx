import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useUser } from '@clerk/clerk-expo';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons'; // ADDED: For StarDisplay
import { useMutation, useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import LottieView from 'lottie-react-native';
// import LottieView from 'lottie-react-native'; // REMOVED
import { useEffect, useMemo, useRef, useState } from 'react'; // REMOVED: useEffect and useRef
import { ActivityIndicator, Alert, LayoutAnimation, Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import CountryFlag from "react-native-country-flag";
import Animated, { FadeIn } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';


// NEW: Light-mode palette from Trip component
const PALETTE = {
    backgroundGradient: ['#F7F8FA', '#FFFFFF'] as const,
    surface: '#FFFFFF',
    shadow: 'rgba(100, 100, 111, 0.25)',
    primary: '#3B82F6', // Kept for StarDisplay default, though not used elsewhere
    secondary: '#10B981',
    textPrimary: '#1F2937',
    textSecondary: '#6B7280',
    historyIcon: '#ed7c04ff',
    primaryGradient: ['#38BDF8', '#3B82F6'] as const,
    secondaryActionGradient: ['#34D399', '#10B981'] as const, 
    border: '#D1D5DB',
    status_active: '#10B981', 
    status_completed: '#6B7280', 
    status_pending: '#F59E0B', 
    ratingStar: '#FBBF24', 
    destructive: '#EF4444',
};

// NEW: Specific palette for Request component per your rules
const REQUEST_PALETTE = {
    primaryGradient: ['#34D399', '#10B981'] as const,
    primary: '#10B981',
    reward: '#10B981', // Using the new green for rewards
};


type RequestProps = {
    request:{
        _id: Id<"requests">;
        _creationTime: number;
        description?: string;
        productURL?: string;
        imageKey?: string;
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
            rating?: number;
        };
    }
}

// --- ADDED: StarDisplay Component (from Trip) ---
type StarDisplayProps = {
    rating?: number;
    size?: number;
};
const StarDisplay = ({ rating=0, size = 16 }: StarDisplayProps) => (
  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
    {[1, 2, 3, 4, 5].map((star) => {
      if (rating >= star) {
        // Full star
        return <MaterialIcons key={star} name="star" size={size} color={PALETTE.ratingStar} />;
      }
      if (rating >= star - 0.5) {
        // Half star for decimal ratings
        return <MaterialIcons key={star} name="star-half" size={size} color={PALETTE.ratingStar} />;
      }
      // Empty star
      return <MaterialIcons key={star} name="star-border" size={size} color={PALETTE.ratingStar} />;
    })}
  </View>
);

export default function Request({request}: RequestProps) {
    const formattedDate = new Date(request.requiredByDate).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric' // Shortened date
    });

    const animation = useRef<LottieView>(null);
    const [animationSpeed, setAnimationSpeed] = useState(1);

    useEffect(() => {
        // This effect runs on mount AND on every speed change
        if (animationSpeed === 1) {
            // Play forward: from frame 0 to the end (-1 is a special value for 'last frame')
            animation.current?.play(0, -1);
        } else {
            // Play backward: from the end (-1) to frame 0
            animation.current?.play(-1, 0);
        }
    }, [animationSpeed]); // This dependency array is correct

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
    const [isImageViewVisible, setImageViewVisible] = useState(false);
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
            let url = request.productURL;
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
            }
            await WebBrowser.openBrowserAsync(url);
        } catch (error) {
            Alert.alert(`Could not open this URL: ${request.productURL}`);
        }
    };

    return (
        <Animated.View style={cardStyles.cardContainer} entering={FadeIn.duration(500)}>
            {/* Confirmation Modals */}
            <Modal animationType='fade' transparent={true} visible={isDeleteModalVisible} onRequestClose={() => setDeleteModalVisible(false)}>
                <View style={cardStyles.modalCenteredView}>
                    <View style={cardStyles.modalView}>
                        <Text style={cardStyles.modalTitle}>Confirm Deletion</Text>
                        <Text style={cardStyles.modalText}>Are you sure you want to delete this request? This action cannot be undone.</Text>
                        <View style={cardStyles.modalButtonContainer}>
                            <TouchableOpacity style={[cardStyles.modalButton, cardStyles.modalButtonCancel]} onPress={() => setDeleteModalVisible(false)}>
                                <Text style={cardStyles.modalButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[cardStyles.modalButton, cardStyles.modalButtonDestructive]} onPress={handleDeleteWithConfirmation}>
                                <Text style={[cardStyles.modalButtonText, {color: '#FFF'}]}>Confirm</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
            <Modal animationType='fade' transparent={true} visible={isEditModalVisible} onRequestClose={() => setEditModalVisible(false)}>
                <View style={cardStyles.modalCenteredView}>
                    <View style={cardStyles.modalView}>
                        <Text style={cardStyles.modalTitle}>Confirm Edit</Text>
                        <Text style={cardStyles.modalText}>Are you sure you want to edit this request? You will be taken to the editing screen.</Text>
                        <View style={cardStyles.modalButtonContainer}>
                            <TouchableOpacity style={[cardStyles.modalButton, cardStyles.modalButtonCancel]} onPress={() => setEditModalVisible(false)}>
                                <Text style={cardStyles.modalButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[cardStyles.modalButton, cardStyles.modalButtonConfirm]} onPress={handleEditWithConfirmation}>
                                <Text style={[cardStyles.modalButtonText, {color: '#FFF'}]}>Confirm</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Image Viewer Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={isImageViewVisible}
                onRequestClose={() => setImageViewVisible(false)}>
                <Pressable style={cardStyles.imageViewerBackdrop} onPress={() => setImageViewVisible(false)}>
                    <Image
                        source={{ uri: `https://ts79.space/${request.imageKey}` }}
                        style={cardStyles.imageViewerImage}
                        contentFit="contain"
                    />
                </Pressable>
            </Modal>


            {/* Card Header */}
            <View style={cardStyles.cardHeader}>
                <Link href={`/user/${request.requester._id}`} asChild>
                    <TouchableOpacity style={cardStyles.travelerInfo}>
                        <Image source={{ uri: request.requester.image }} style={cardStyles.travelerAvatar} />
                        <Text style={cardStyles.travelerName}>{request.requester.username}</Text>
                    </TouchableOpacity>
                </Link>
                <View style={cardStyles.headerActions}>
                    {isOwner ? (
                        <>
                            <TouchableOpacity onPress={() => setEditModalVisible(true)} style={cardStyles.actionIcon}>
                                <MaterialCommunityIcons name='pencil-outline' size={22} color={PALETTE.textSecondary} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setDeleteModalVisible(true)} style={cardStyles.actionIcon}>
                                <MaterialCommunityIcons name='trash-can-outline' size={22} color={PALETTE.destructive} />
                            </TouchableOpacity>
                        </>
                    ) : (
                        <StarDisplay rating={request.requester.rating} />
                    )}
                </View>
            </View>

            
            {/* --- UPDATED: Product "Bento Box" Layout --- */}
            <View style={cardStyles.productBentoContainer}>
                {/* Left Side: Product Info + COMPACT DETAILS "PILLS" */}
                <View style={cardStyles.productInfoContainer}>
                    <Text style={cardStyles.productName} numberOfLines={3}>{request.productName}</Text>
                    {request.productURL && (
                        <TouchableOpacity style={cardStyles.productLinkButton} onPress={handleProductLink}>
                            <Ionicons name="link-outline" size={16} color={REQUEST_PALETTE.primary} />
                            <Text style={cardStyles.productLinkText}>View Product</Text>
                        </TouchableOpacity>
                    )}

                    {/* --- NEW: Compact Details "Pills" Row --- */}
                    <View style={cardStyles.pillsContainer}>
                        {/* Deliver By */}
                        <View style={cardStyles.pillItem}>
                            <MaterialCommunityIcons name="calendar-clock" size={14} color={REQUEST_PALETTE.primary} />
                            <Text style={cardStyles.pillText}>By: {formattedDate}</Text>
                        </View>

                        {/* Quantity */}
                        <View style={cardStyles.pillItem}>
                            <MaterialCommunityIcons name="package-variant-closed" size={14} color={REQUEST_PALETTE.primary} />
                            <Text style={cardStyles.pillText}>Qty: {request.quantity}</Text>
                        </View>

                        {/* Weight */}
                        {request.productWeight && 
                            <View style={cardStyles.pillItem}>
                                <FontAwesome5 name="weight-hanging" size={12} color={REQUEST_PALETTE.primary} />
                                <Text style={cardStyles.pillText}>Wt: {request.productWeight}</Text>
                            </View>
                        }

                        {/* Category */}
                        {request.itemTypes && 
                            <View style={cardStyles.pillItem}>
                                <MaterialCommunityIcons name="tag-outline" size={14} color={REQUEST_PALETTE.primary} />
                                <Text style={cardStyles.pillText}>{request.itemTypes}</Text>
                            </View>
                        }
                    </View>
                </View>

                {/* Right Side: Product Image (Pressable) */}
                {request.imageKey && (
                    <TouchableOpacity 
                        style={cardStyles.productImageContainer} 
                        onPress={() => setImageViewVisible(true)}
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


            {/* TRAVEL ROUTE (UPDATED) */}
            <View style={cardStyles.travelRouteContainer}>
                <View style={cardStyles.locationPoint}><CountryFlag isoCode={request.originCountryCode.toLowerCase()} size={18} /><Text style={cardStyles.cityText}>{request.originCity}</Text><Text style={cardStyles.countryText}>{request.originCountry}</Text></View>
                <View style={cardStyles.routeLine}>
                    <View style={cardStyles.dot} />
                    <View style={cardStyles.dashedLine} />
                    <LottieView
                        ref={animation}
                        style={cardStyles.lottieIcon}
                        source={require('@/assets/animations/request-animation.json')}
                        autoPlay={false} // Let useEffect handle all plays
                        loop={false}
                        speed={animationSpeed}
                        onAnimationFinish={(isCancelled) => {
                            if (!isCancelled) {
                                setAnimationSpeed(prevSpeed => prevSpeed * -1); // This part is correct
                            }
                        }}
                    />
                    <View style={cardStyles.dashedLine} />
                    <View style={cardStyles.dot} />
                </View>
                <View style={cardStyles.locationPoint}><CountryFlag isoCode={request.destinationCountryCode.toLowerCase()} size={18} /><Text style={cardStyles.cityText}>{request.destinationCity}</Text><Text style={cardStyles.countryText}>{request.destinationCountry}</Text></View>
            </View>


            {/* --- UPDATED: Financial Grid --- */}
            <View style={cardStyles.financialGridContainer}>
                {/* Traveler Reward */}
                <View style={[cardStyles.financialGridItem, cardStyles.financialItem]}>
                    <Text style={cardStyles.financialLabel}>Traveler Reward</Text>
                    <Text style={cardStyles.rewardValue}>{formatCurrency(request.travelerFee)}</Text>
                </View>

                {/* Product Price */}
                <View style={[cardStyles.financialGridItem, cardStyles.financialItem]}>
                    <Text style={cardStyles.financialLabel}>Product Price</Text>
                    <Text style={cardStyles.financialValue}>{formatCurrency(itemTotal)}</Text>
                </View>
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
                    <LinearGradient 
                        colors={isLoadingTrips ? [PALETTE.textSecondary, PALETTE.textSecondary] : REQUEST_PALETTE.primaryGradient} 
                        style={cardStyles.actionButton}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    >
                        <FontAwesome5 name="hand-holding-usd" size={16} color="#FFFFFF" />
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
                            <TextInput style={cardStyles.modalInput} placeholder={request.travelerFee.toFixed(2)} placeholderTextColor={PALETTE.textSecondary} keyboardType="numeric" value={proposedFee} onChangeText={setProposedFee} autoFocus={true}/>
                        </View>
                        <Pressable onPress={handleSubmitOffer} disabled={isSubmitting}>
                            <LinearGradient 
                                colors={isSubmitting ? [PALETTE.textSecondary, PALETTE.textSecondary] : REQUEST_PALETTE.primaryGradient} 
                                style={cardStyles.modalSubmitButton}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                            >
                                {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={[cardStyles.modalButtonText, {color: '#FFF'}]}>Send Offer</Text>}
                            </LinearGradient>
                        </Pressable>
                    </Pressable>
                </Pressable>
            </Modal>
        </Animated.View>
    );
}


// --- STYLESHEET UPDATED ---
const cardStyles = StyleSheet.create({
    cardContainer: { 
        backgroundColor: PALETTE.surface, 
        borderRadius: 16, 
        padding: 14, 
        marginVertical: 10, 
        marginHorizontal: 16, 
        shadowColor: PALETTE.shadow, 
        shadowOffset: { width: 0, height: 6 }, 
        shadowOpacity: 0.35, 
        shadowRadius: 18, 
        elevation: 8,
        borderWidth: 1,
        borderColor: PALETTE.border,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    travelerInfo: { flexDirection: 'row', alignItems: 'center' },
    travelerAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
    travelerName: { fontSize: 16, fontWeight: '600', color: PALETTE.textPrimary },
    headerActions: { flexDirection: 'row', alignItems: 'center' },
    actionIcon: { marginLeft: 16 }, 

    // --- UPDATED: Product Bento Box Styles ---
    productBentoContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    productInfoContainer: {
        flex: 1, // Takes up available space
        marginRight: 12, // Space between text and image
    },
    productName: { fontSize: 22, fontWeight: 'bold', color: PALETTE.textPrimary, marginBottom: 4 },
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
    // --- END: Product Bento Box Styles ---

    // --- NEW: Compact "Pills" Styles (replaces compactDetailRow) ---
    pillsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 12, // Space below the product link
    },
    pillItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: PALETTE.backgroundGradient[0], // Light grey
        borderRadius: 6,
        paddingVertical: 4,
        paddingHorizontal: 8,
        marginRight: 6,
        marginBottom: 6, // For wrapping
    },
    pillText: {
        fontSize: 12,
        fontWeight: '500',
        color: PALETTE.textSecondary,
        marginLeft: 5,
    },
    // --- END: Compact "Pills" Styles ---

    travelRouteContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    locationPoint: { alignItems: 'center', flex: 1, paddingHorizontal: 4 },
    cityText: { fontSize: 16, fontWeight: 'bold', color: PALETTE.textPrimary, marginTop: 4 },
    countryText: { fontSize: 12, color: PALETTE.textSecondary },
    routeLine: { flex: 1.5, flexDirection: 'row', alignItems: 'center' },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: PALETTE.textSecondary },
    dashedLine: { height: 1, flex: 1, borderBottomWidth: 1, borderBottomColor: PALETTE.textSecondary, borderStyle: 'dashed' },
    routeIcon: { marginHorizontal: 10 },

    // --- UPDATED: Renamed to Financial Grid Styles ---
    financialGridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginTop: 16,
        borderTopWidth: 1,
        borderTopColor: PALETTE.border,
        paddingTop: 16,
    },
    financialGridItem: { 
        width: '48%',
        backgroundColor: PALETTE.backgroundGradient[0],
        borderRadius: 12, 
        padding: 10, 
        alignItems: 'center', 
        marginBottom: 12, 
    },
    financialItem: { 
        backgroundColor: `${REQUEST_PALETTE.primary}10`,
    },
    financialLabel: { color: PALETTE.textSecondary, fontSize: 12, textTransform: 'uppercase', fontWeight: '600', marginBottom: 4 },
    financialValue: { color: PALETTE.textPrimary, fontSize: 18, fontWeight: '600' },
    rewardValue: { color: REQUEST_PALETTE.reward, fontSize: 20, fontWeight: 'bold' },
    
    // REMOVED: detailValue and detailLabel are no longer used
    
    descriptionContainer: { 
        marginTop: 4, 
        borderTopWidth: 1, 
        borderTopColor: PALETTE.border,
        paddingTop: 16, 
    },
    descriptionText: { color: PALETTE.textSecondary, fontSize: 14, lineHeight: 21 },
    readMoreText: { color: REQUEST_PALETTE.primary, fontWeight: 'bold', marginTop: 4 },
    actionButton: { 
        borderRadius: 12, 
        paddingVertical: 12, 
        alignItems: 'center', 
        justifyContent: 'center', 
        flexDirection: 'row',
        shadowColor: REQUEST_PALETTE.primary, 
        shadowOffset: { width: 0, height: 4 }, 
        shadowOpacity: 0.3, 
        shadowRadius: 5, 
        elevation: 8 
    },
    actionButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
    modalCenteredView: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: 'rgba(0, 0, 0, 0.5)' 
    },
    modalView: { 
        width: '85%',
        margin: 20, 
        backgroundColor: PALETTE.surface, 
        borderRadius: 16, 
        padding: 25, 
        alignItems: 'center', 
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 2 }, 
        shadowOpacity: 0.25, 
        shadowRadius: 4, 
        elevation: 5,
    },
    modalTitle: { 
        marginBottom: 15, 
        textAlign: 'center', 
        fontSize: 18, 
        fontWeight: 'bold', 
        color: PALETTE.textPrimary 
    },
    modalText: { 
        marginBottom: 20, 
        textAlign: 'center', 
        color: PALETTE.textSecondary, 
        lineHeight: 20 
    },
    modalInputContainer: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: PALETTE.backgroundGradient[0],
        borderRadius: 10, 
        paddingHorizontal: 15, 
        marginBottom: 20, 
        width: '100%' 
    },
    dollarSign: { fontSize: 20, color: PALETTE.textSecondary, marginRight: 5 },
    modalInput: { flex: 1, color: PALETTE.textPrimary, fontSize: 20, paddingVertical: 12 },
    modalSubmitButton: { 
        borderRadius: 12, 
        paddingVertical: 14, 
        alignItems: 'center', 
        width: 200,
        shadowColor: REQUEST_PALETTE.primary, 
        shadowOffset: { width: 0, height: 4 }, 
        shadowOpacity: 0.3, 
        shadowRadius: 5, 
        elevation: 8
    },
    modalButtonContainer: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        width: '100%', 
        marginTop: 10 
    },
    modalButton: { 
        borderRadius: 10, 
        paddingVertical: 10, 
        paddingHorizontal: 20, 
        flex: 1, 
        marginHorizontal: 5, 
        alignItems: 'center' 
    },
    modalButtonCancel: { 
        backgroundColor: PALETTE.border 
    },
    modalButtonConfirm: { 
        backgroundColor: REQUEST_PALETTE.primary 
    },
    modalButtonDestructive: { 
        backgroundColor: PALETTE.destructive
    },
    modalButtonText: { 
        color: PALETTE.textSecondary, 
        fontWeight: 'bold', 
        textAlign: 'center' 
    },

    // --- NEW: Image Viewer Modal Styles ---
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
    lottieIcon: { 
        width: 40,
        height: 40,
        marginHorizontal: 5,
    },
});