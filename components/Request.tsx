import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useUser } from '@clerk/clerk-expo';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMutation, useQuery } from 'convex/react';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import LottieView from 'lottie-react-native';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, LayoutAnimation, Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import CountryFlag from "react-native-country-flag";
import Animated, { FadeIn } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';

// === TRANSLATION IMPORT ===
import { useTranslation } from 'react-i18next';

// 1. REFINED PALETTE: Matches Index & Trip Screens
const PALETTE = {
    surface: '#FFFFFF',
    shadow: 'rgba(50, 50, 93, 0.15)',
    primary: '#3B82F6', 
    secondary: '#10B981',
    textPrimary: '#111827',
    textSecondary: '#6B7280',
    primaryGradient: ['#0EA5E9', '#2563EB'] as const,
    secondaryActionGradient: ['#10B981', '#059669'] as const, 
    border: '#E5E7EB',
    destructive: '#EF4444',
    ratingStar: '#FBBF24',
    glassBorder: 'rgba(255, 255, 255, 0.3)',
    softBackground: '#F9FAFB',
};

// Specific Green Palette for Requests
const REQUEST_PALETTE = {
    primaryGradient: ['#10B981', '#059669'] as const, // Sharper Green
    primary: '#10B981',
    reward: '#059669', 
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
        requiredByDate: number;
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
            asRequesterRating?: number;
        };
    }
}

// StarDisplay Component
type StarDisplayProps = {
    rating?: number;
    size?: number;
};

const StarDisplay = ({ rating=0, size = 14 }: StarDisplayProps) => {
    // Need translation inside component for "New"
    const { t } = useTranslation();
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
        <MaterialIcons name="star" size={size} color={PALETTE.ratingStar} style={{marginRight: 2}} />
        <Text style={{fontSize: 12, fontWeight: '700', color: '#B45309'}}>{rating > 0 ? rating.toFixed(1) : t('request_component.labels.new')}</Text>
      </View>
    );
};

export default function Request({request}: RequestProps) {
    // Initialize Translation
    const { t, i18n } = useTranslation();

    const formattedDate = new Date(request.requiredByDate).toLocaleDateString(i18n.language, {
        month: 'short', day: 'numeric' 
    });

    const animation = useRef<LottieView>(null);
    // Removed animation speed state complexity for smoother scroll performance in this design
    
    const {user} = useUser();
    const currentUser = useQuery(api.users.getUserByClerkId, user ? {clerkId: user?.id} : "skip");
    
    const { itemTotal } = useMemo(() => {
        const itemTotal = request.itemPrice * request.quantity;
        return { itemTotal };
    }, [request.itemPrice, request.quantity]);

    const formatCurrency = (amount: number) => `$${amount.toFixed(0)}`; // Removed cents for cleaner UI

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
    // 2. BUG FIX: Loading State
    const isLoadingUser = currentUser === undefined;
    const isPotentialTraveler = !isLoadingUser && !isOwner;

    const myMatchingTrips = useQuery(
        api.trips.getMyMatchingTrips,
        isPotentialTraveler ? { originCity: request.originCity, destinationCity: request.destinationCity } : "skip"
    );
    const isLoadingTrips = myMatchingTrips === undefined;

    // Handlers
    const handleProfilePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/user/${request.requester._id}`);
    };

    const handleDeleteWithConfirmation = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        try {
            await deleteRequest({ requestId: request._id });
            setDeleteModalVisible(false);
        } catch (error) {
            alert(t('request_component.delete_error'));
        }
    };
    
    const handleEditWithConfirmation = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push({ pathname: '/orders', params: { request: JSON.stringify(request) } });
        setEditModalVisible(false);
    };

    const handleOpenOfferModal = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (!myMatchingTrips || myMatchingTrips.length === 0) {
            Alert.alert(
                t('request_component.no_matching_trip'),
                t('request_component.trip_needed_msg', { origin: request.originCity, dest: request.destinationCity })
            );
            return;
        }
        setOfferModalVisible(true);
    };

    const handleSubmitOffer = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsSubmitting(true);
        const fee = parseFloat(proposedFee);
        if (isNaN(fee) || fee <= 0) {
            Alert.alert(t('request_component.invalid_fee'), t('request_component.valid_amount_msg'));
            setIsSubmitting(false);
            return;
        }
        
        // Safety check
        if (!myMatchingTrips || myMatchingTrips.length === 0) return;
        
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
                    text1: t('request_component.duplicate_offer_title'),
                    text2: t('request_component.duplicate_offer_msg'),
                })
            }
        } catch (error) {
            Alert.alert("Error", (error as Error).message || t('request_component.offer_sent')); // Using generic success/error msg or specific
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const toggleDescription = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setDescriptionExpanded(!isDescriptionExpanded);
    };

    const handleProductLink = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (!request.productURL) return;
        
        try {
            let url = request.productURL;
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
            }
            await WebBrowser.openBrowserAsync(url);
        } catch (error) {
            Alert.alert(t('request_component.url_error'));
        }
    };

    return (
        <Animated.View style={cardStyles.cardContainer} entering={FadeIn.duration(500)}>
            {/* Confirmation Modals (Same style as Trip) */}
            <Modal animationType='fade' transparent={true} visible={isDeleteModalVisible} onRequestClose={() => setDeleteModalVisible(false)}>
                <View style={cardStyles.modalCenteredView}>
                    <View style={cardStyles.modalView}>
                        <Text style={cardStyles.modalTitle}>{t('request_component.modals.delete.title')}</Text>
                        <Text style={cardStyles.modalText}>{t('request_component.modals.delete.text')}</Text>
                        <View style={cardStyles.modalButtonContainer}>
                            <TouchableOpacity style={[cardStyles.modalButton, cardStyles.modalButtonCancel]} onPress={() => setDeleteModalVisible(false)}>
                                <Text style={cardStyles.modalButtonText}>{t('request_component.modals.delete.cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[cardStyles.modalButton, cardStyles.modalButtonDestructive]} onPress={handleDeleteWithConfirmation}>
                                <Text style={[cardStyles.modalButtonText, {color: '#FFF'}]}>{t('request_component.modals.delete.confirm')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
            
            <Modal animationType='fade' transparent={true} visible={isEditModalVisible} onRequestClose={() => setEditModalVisible(false)}>
                <View style={cardStyles.modalCenteredView}>
                    <View style={cardStyles.modalView}>
                        <Text style={cardStyles.modalTitle}>{t('request_component.modals.edit.title')}</Text>
                        <Text style={cardStyles.modalText}>{t('request_component.modals.edit.text')}</Text>
                        <View style={cardStyles.modalButtonContainer}>
                            <TouchableOpacity style={[cardStyles.modalButton, cardStyles.modalButtonCancel]} onPress={() => setEditModalVisible(false)}>
                                <Text style={cardStyles.modalButtonText}>{t('request_component.modals.edit.cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[cardStyles.modalButton, cardStyles.modalButtonConfirm]} onPress={handleEditWithConfirmation}>
                                <Text style={[cardStyles.modalButtonText, {color: '#FFF'}]}>{t('request_component.modals.edit.confirm')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Image Viewer Modal */}
            <Modal animationType="fade" transparent={true} visible={isImageViewVisible} onRequestClose={() => setImageViewVisible(false)}>
                <Pressable style={cardStyles.imageViewerBackdrop} onPress={() => setImageViewVisible(false)}>
                    <Image source={{ uri: `https://ts79.space/${request.imageKey}` }} style={cardStyles.imageViewerImage} contentFit="contain" />
                </Pressable>
            </Modal>

            {/* === Card Header (Matched Trip) === */}
            <View style={cardStyles.cardHeader}>
                <TouchableOpacity style={cardStyles.travelerInfo} onPress={handleProfilePress}>
                    <Image source={{ uri: request.requester.image }} style={cardStyles.travelerAvatar} cachePolicy="memory-disk"/>
                    <View>
                         <Text style={cardStyles.travelerName}>{request.requester.username}</Text>
                         <Text style={cardStyles.subHeaderText}>{t('request_component.labels.requesting_item')}</Text>
                    </View>
                </TouchableOpacity>

                {isOwner ? (
                    <View style={cardStyles.headerActions}>
                        <TouchableOpacity onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setEditModalVisible(true);
                        }} style={cardStyles.actionIcon}>
                            <MaterialCommunityIcons name='pencil-outline' size={20} color={PALETTE.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setDeleteModalVisible(true);
                        }} style={[cardStyles.actionIcon, {marginLeft: 12}]}>
                            <MaterialCommunityIcons name='trash-can-outline' size={20} color={PALETTE.destructive} />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <StarDisplay rating={request.requester.asRequesterRating} />
                )}
            </View>
            
            {/* === Route Visualization (Matched Trip Layout) === */}
            <View style={cardStyles.routeContainer}>
                <View style={cardStyles.locationBlockLeft}>
                    <Text style={cardStyles.cityCode}>{request.originCountryCode}</Text>
                    <Text style={cardStyles.cityName} numberOfLines={1}>{request.originCity}</Text>
                    <View style={cardStyles.flagWrapper}>
                        <CountryFlag isoCode={request.originCountryCode.toLowerCase()} size={12} />
                    </View>
                </View>

                {/* Animation Center */}
                <View style={cardStyles.routeGraphic}>
                    <LottieView
                        ref={animation}
                        style={cardStyles.lottieIcon}
                        source={require('@/assets/animations/request-animation.json')}
                        autoPlay
                        loop
                    />
                    <View style={cardStyles.dottedLine} />
                </View>

                <View style={cardStyles.locationBlockRight}>
                    <Text style={cardStyles.cityCode}>{request.destinationCountryCode}</Text>
                    <Text style={cardStyles.cityName} numberOfLines={1}>{request.destinationCity}</Text>
                    <View style={cardStyles.flagWrapper}>
                        <CountryFlag isoCode={request.destinationCountryCode.toLowerCase()} size={12} />
                    </View>
                </View>
            </View>

            {/* === Product Info Block === */}
            <View style={cardStyles.productContainer}>
                <View style={cardStyles.productTextColumn}>
                    <Text style={cardStyles.productName} numberOfLines={2}>{request.productName}</Text>
                    {request.productURL && (
                        <TouchableOpacity style={cardStyles.linkButton} onPress={handleProductLink}>
                             <Ionicons name="link" size={12} color={REQUEST_PALETTE.primary} />
                             <Text style={cardStyles.linkText}>{t('request_component.labels.view_product')}</Text>
                        </TouchableOpacity>
                    )}
                </View>
                {request.imageKey && (
                     <TouchableOpacity onPress={() => setImageViewVisible(true)}>
                        <Image
                            source={{ uri: `https://ts79.space/${request.imageKey}` }}
                            style={cardStyles.productThumb}
                            contentFit="cover"
                            transition={300}
                        />
                     </TouchableOpacity>
                )}
            </View>

            {/* === Financial & Details Block (Grey Box) === */}
            <View style={cardStyles.detailsBlock}>
                {/* Reward Highlight */}
                <View style={cardStyles.detailItem}>
                    <Text style={cardStyles.detailLabel}>{t('request_component.labels.reward')}</Text>
                    <Text style={[cardStyles.detailValue, { color: REQUEST_PALETTE.reward }]}>
                        {formatCurrency(request.travelerFee)}
                    </Text>
                </View>
                <View style={cardStyles.detailSeparator} />
                {/* Due Date */}
                <View style={cardStyles.detailItem}>
                    <Text style={cardStyles.detailLabel}>{t('request_component.labels.due')}</Text>
                    <Text style={cardStyles.detailValue}>{formattedDate}</Text>
                </View>
                <View style={cardStyles.detailSeparator} />
                {/* Item Cost */}
                <View style={cardStyles.detailItem}>
                    <Text style={cardStyles.detailLabel}>{t('request_component.labels.cost')}</Text>
                    <Text style={cardStyles.detailValue}>{formatCurrency(itemTotal)}</Text>
                </View>
            </View>
            
            {/* Description (Expandable) */}
            {request.description && (
                <View style={cardStyles.descriptionContainer}>
                    <Text style={cardStyles.descriptionText} numberOfLines={isDescriptionExpanded ? undefined : 2}>
                        {request.description}
                    </Text>
                    <TouchableOpacity onPress={toggleDescription} hitSlop={10}>
                        <Text style={cardStyles.readMoreText}>{isDescriptionExpanded ? t('request_component.labels.show_less') : t('request_component.labels.show_more')}</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* === Action Button (BUG FIXED: No Flashing) === */}
            {isPotentialTraveler && (
                <Pressable onPress={handleOpenOfferModal} disabled={isLoadingTrips} style={{marginTop: 16}}>
                    <LinearGradient 
                        colors={isLoadingTrips ? [PALETTE.textSecondary, PALETTE.textSecondary] : REQUEST_PALETTE.primaryGradient} 
                        style={cardStyles.actionButton}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    >
                        <Text style={cardStyles.actionButtonText}>
                            {isLoadingTrips ? t('request_component.labels.checking_trips') : t('request_component.labels.make_offer')}
                        </Text>
                        {!isLoadingTrips && <FontAwesome5 name="arrow-right" size={14} color="#FFFFFF" style={{marginLeft: 8}} />}
                    </LinearGradient>
                </Pressable>
            )}

            {/* Offer Submission Modal */}
            <Modal transparent={true} visible={isOfferModalVisible} onRequestClose={() => setOfferModalVisible(false)}>
                <Pressable style={cardStyles.modalCenteredView} onPress={() => setOfferModalVisible(false)}>
                    <Pressable style={cardStyles.modalView}>
                        <Text style={cardStyles.modalTitle}>{t('request_component.labels.propose_fee')}</Text>
                        <View style={cardStyles.modalInputContainer}>
                            <Text style={cardStyles.dollarSign}>$</Text>
                            <TextInput 
                                style={cardStyles.modalInput} 
                                placeholder={request.travelerFee.toFixed(2)} 
                                placeholderTextColor={PALETTE.textSecondary} 
                                keyboardType="numeric" 
                                value={proposedFee} 
                                onChangeText={setProposedFee} 
                                autoFocus={true} 
                            />
                        </View>
                        <Pressable onPress={handleSubmitOffer} disabled={isSubmitting}>
                            <LinearGradient 
                                colors={isSubmitting ? [PALETTE.textSecondary, PALETTE.textSecondary] : REQUEST_PALETTE.primaryGradient} 
                                style={cardStyles.modalSubmitButton}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                            >
                                {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={[cardStyles.modalButtonText, {color: '#FFF'}]}>{t('request_component.labels.send_offer')}</Text>}
                            </LinearGradient>
                        </Pressable>
                    </Pressable>
                </Pressable>
            </Modal>
        </Animated.View>
    );
}

// --- STYLESHEET UPDATED to match Trip.tsx ---
const cardStyles = StyleSheet.create({
    cardContainer: { 
        backgroundColor: PALETTE.surface, 
        borderRadius: 24, // Matched Trip
        padding: 20, 
        marginVertical: 10, 
        marginHorizontal: 20, 
        shadowColor: PALETTE.shadow, 
        shadowOffset: { width: 0, height: 12 }, 
        shadowOpacity: 0.1, 
        shadowRadius: 16, 
        elevation: 6,
        borderWidth: 1,
        borderColor: PALETTE.border,
    },
    
    // Header
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    travelerInfo: { flexDirection: 'row', alignItems: 'center' },
    travelerAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12, borderWidth: 1, borderColor: PALETTE.border },
    travelerName: { fontSize: 15, fontWeight: '700', color: PALETTE.textPrimary, marginBottom: 2 },
    subHeaderText: { fontSize: 12, color: PALETTE.textSecondary, fontWeight: '500' },
    headerActions: { flexDirection: 'row', alignItems: 'center' },
    actionIcon: { padding: 4 }, 

    // Route Visualization (Exact copy of Trip for alignment)
    routeContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    locationBlockLeft: { alignItems: 'flex-start', flex: 1 },
    locationBlockRight: { alignItems: 'flex-end', flex: 1 },
    cityCode: { fontSize: 20, fontWeight: '800', color: PALETTE.textPrimary, letterSpacing: 0.5 },
    cityName: { fontSize: 12, color: PALETTE.textSecondary, fontWeight: '500', marginTop: 2, maxWidth: 80 },
    flagWrapper: { marginTop: 6, borderRadius: 2, overflow: 'hidden' },
    
    // Graphic Middle
    routeGraphic: { flex: 1.5, alignItems: 'center', justifyContent: 'center', position: 'relative', height: 40 },
    dottedLine: { position: 'absolute', width: '100%', height: 1, borderBottomWidth: 1, borderColor: '#CBD5E1', borderStyle: 'dashed', zIndex: 0 },
    lottieIcon: { width: 40, height: 40, zIndex: 1, marginBottom: 4 },

    // Product Info
    productContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    productTextColumn: { flex: 1, paddingRight: 10 },
    productName: { fontSize: 16, fontWeight: '700', color: PALETTE.textPrimary, marginBottom: 6 },
    linkButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' },
    linkText: { fontSize: 11, color: REQUEST_PALETTE.primary, fontWeight: '600', marginLeft: 4 },
    productThumb: { width: 60, height: 60, borderRadius: 12, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: PALETTE.border },

    // Details Block (Grey Box)
    detailsBlock: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: PALETTE.softBackground,
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
        justifyContent: 'space-around',
        marginBottom: 12,
    },
    detailItem: { alignItems: 'center', flex: 1 },
    detailLabel: { fontSize: 10, color: PALETTE.textSecondary, textTransform: 'uppercase', fontWeight: '600', marginBottom: 2 },
    detailValue: { fontSize: 13, fontWeight: '700', color: PALETTE.textPrimary },
    detailSeparator: { width: 1, height: 20, backgroundColor: PALETTE.border },
    
    // Description
    descriptionContainer: { marginTop: 0 },
    descriptionText: { color: PALETTE.textSecondary, fontSize: 13, lineHeight: 20 },
    readMoreText: { color: REQUEST_PALETTE.primary, fontWeight: '600', fontSize: 12, marginTop: 2 },

    // Action Button
    actionButton: { 
        borderRadius: 14, 
        paddingVertical: 14, 
        alignItems: 'center', 
        justifyContent: 'center', 
        flexDirection: 'row', 
        shadowColor: REQUEST_PALETTE.primary, 
        shadowOffset: { width: 0, height: 4 }, 
        shadowOpacity: 0.2, 
        shadowRadius: 8, 
        elevation: 4 
    },
    actionButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },

    // Modals
    modalCenteredView: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.4)' },
    modalView: { width: '85%', margin: 20, backgroundColor: PALETTE.surface, borderRadius: 24, padding: 30, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 10 },
    modalTitle: { marginBottom: 10, textAlign: 'center', fontSize: 18, fontWeight: 'bold', color: PALETTE.textPrimary },
    modalText: { marginBottom: 24, textAlign: 'center', color: PALETTE.textSecondary, lineHeight: 22, fontSize: 14 },
    modalInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 12, paddingHorizontal: 15, marginBottom: 20, width: '100%' },
    dollarSign: { fontSize: 18, color: PALETTE.textSecondary, marginRight: 5, fontWeight: '600' },
    modalInput: { flex: 1, color: PALETTE.textPrimary, fontSize: 18, fontWeight: '600', paddingVertical: 14 },
    modalSubmitButton: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', width: '100%', shadowColor: REQUEST_PALETTE.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 8 },
    modalButtonContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', gap: 12 },
    modalButton: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20, flex: 1, alignItems: 'center', justifyContent: 'center' },
    modalButtonCancel: { backgroundColor: '#F3F4F6' },
    modalButtonConfirm: { backgroundColor: REQUEST_PALETTE.primary },
    modalButtonDestructive: { backgroundColor: PALETTE.destructive },
    modalButtonText: { color: PALETTE.textPrimary, fontWeight: '600', fontSize: 14 },

    // Image Viewer
    imageViewerBackdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.9)', justifyContent: 'center', alignItems: 'center' },
    imageViewerImage: { width: '90%', height: '80%', borderRadius: 12 },
});