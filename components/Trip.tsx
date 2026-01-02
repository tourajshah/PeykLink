import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useUser } from '@clerk/clerk-expo';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMutation, useQuery } from 'convex/react';
import * as Haptics from 'expo-haptics'; // NEW: Imported Haptics
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import LottieView from 'lottie-react-native';
import { useMemo, useRef, useState } from 'react'; // Removed unused useEffect
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CountryFlag from "react-native-country-flag";
import Animated, { FadeIn } from 'react-native-reanimated';

// === TRANSLATION IMPORT ===
import { useTranslation } from 'react-i18next';

// 1. REFINED PALETTE: Matches Index & Create Screens exactly
const PALETTE = {
    surface: '#FFFFFF',
    shadow: 'rgba(50, 50, 93, 0.15)', 
    primary: '#3B82F6',
    secondary: '#10B981',
    textPrimary: '#111827',
    textSecondary: '#6B7280',
    primaryGradient: ['#0EA5E9', '#2563EB'] as const, // Sharper Blue
    secondaryActionGradient: ['#10B981', '#059669'] as const,
    border: '#E5E7EB', // Subtle grey border
    destructive: '#EF4444',
    ratingStar: '#FBBF24',
    glassBorder: 'rgba(255, 255, 255, 0.3)',
    softBackground: '#F9FAFB', // For details block
};

type TripProps = {
    trip: {
        _id: Id<"trips">;
        _creationTime: number;
        description?: string;
        acceptedItemTypes?: string;
        arrivalDate: number;
        originCountry: string;
        originCity: string;
        destinationCountry: string;
        destinationCity: string;
        status: string;
        availableSpace: string;
        originCountryCode: string;
        destinationCountryCode: string;
        airline: string;
        traveler: {
            _id: string;
            username: string;
            image: string;
            rating?: number;
            asTravelerrating: number;
        };
    }
}

export default function Trip({ trip }: TripProps) {
    // Initialize Translation
    const { t, i18n } = useTranslation();

    const formattedDate = new Date(trip.arrivalDate).toLocaleDateString(i18n.language, {
        month: 'short',
        day: 'numeric',
    });

    const acceptedItems = useMemo(() => {
        if (!trip.acceptedItemTypes) return [];
        return trip.acceptedItemTypes.split(',').map(item => item.trim());
    }, [trip.acceptedItemTypes]);

    const { user } = useUser();
    const currentUser = useQuery(api.users.getUserByClerkId, user ? { clerkId: user?.id } : "skip");
    const deleteTrip = useMutation(api.trips.deleteTrip);

    const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
    const [isEditModalVisible, setEditModalVisible] = useState(false);

    // NEW: Function to handle Profile Click with Haptics and Navigation
    const handleProfilePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // Using router.push instead of Link component to allow Haptic execution before navigation
        router.push(`/user/${trip.traveler._id}`);
    };

    const handleDeleteWithConfirmation = () => {
        // NEW: Heavy haptic for destructive action confirmation
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        handleDeleteTrip();
        setDeleteModalVisible(false);
    };

    const handleEditWithConfirmation = () => {
        // NEW: Medium haptic for edit confirmation
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push({ pathname: '/trips', params: { trip: JSON.stringify(trip) } });
        setEditModalVisible(false);
    };

    const handleDeleteTrip = async () => {
        try {
            await deleteTrip({ tripId: trip._id });
        } catch (error) {
            alert(t('trip_component.delete_error'));
        }
    };

    const handleSendOffer = async () => {
        // NEW: Medium haptic for primary action
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            router.push({
                pathname: '/(stack)/orders',
                params: {
                    travelerId: trip.traveler._id,
                    tripId: trip._id
                }
            });
        } catch (error) {
            alert(t('trip_component.offer_error'));
        }
    };
    
    type StarDisplayProps = {
        rating?: number;
        size?: number;
    };

    const StarDisplay = ({ rating = 0, size = 14 }: StarDisplayProps) => (
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
        <MaterialIcons name="star" size={size} color={PALETTE.ratingStar} style={{marginRight: 2}} />
        <Text style={{fontSize: 12, fontWeight: '700', color: '#B45309'}}>{rating > 0 ? rating.toFixed(1) : t('trip_component.labels.new')}</Text>
      </View>
    );

    const animation = useRef<LottieView>(null);

    // 2. BUG FIX: User Loading State
    // We check if currentUser is undefined. If so, we are still loading.
    const isLoadingUser = currentUser === undefined;
    const isOwnTrip = currentUser?._id === trip.traveler._id;

    return (
    <Animated.View style={cardStyles.cardContainer} entering={FadeIn.duration(500)}>
        
        {/* === Delete Modal === */}
        <Modal 
            animationType='fade' 
            transparent={true} 
            visible={isDeleteModalVisible} 
            onRequestClose={() => setDeleteModalVisible(false)}
        >
            <View style={cardStyles.modalCenteredView}>
                <View style={cardStyles.modalView}>
                    <Text style={cardStyles.modalTitle}>{t('trip_component.modals.delete.title')}</Text>
                    <Text style={cardStyles.modalText}>{t('trip_component.modals.delete.text')}</Text>
                    <View style={cardStyles.modalButtonContainer}>
                        <TouchableOpacity style={[cardStyles.modalButton, cardStyles.modalButtonCancel]} onPress={() => setDeleteModalVisible(false)}>
                            <Text style={cardStyles.modalButtonText}>{t('trip_component.modals.delete.cancel')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[cardStyles.modalButton, cardStyles.modalButtonConfirm]} onPress={handleDeleteWithConfirmation}>
                            <Text style={[cardStyles.modalButtonText, {color: '#FFF'}]}>{t('trip_component.modals.delete.confirm')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>

        {/* === Edit Modal === */}
        <Modal 
            animationType='fade' 
            transparent={true} 
            visible={isEditModalVisible} 
            onRequestClose={() => setEditModalVisible(false)}
        >
            <View style={cardStyles.modalCenteredView}>
                <View style={cardStyles.modalView}>
                    <Text style={cardStyles.modalTitle}>{t('trip_component.modals.edit.title')}</Text>
                    <Text style={cardStyles.modalText}>{t('trip_component.modals.edit.text')}</Text>
                    <View style={cardStyles.modalButtonContainer}>
                        <TouchableOpacity style={[cardStyles.modalButton, cardStyles.modalButtonCancel]} onPress={() => setEditModalVisible(false)}>
                            <Text style={cardStyles.modalButtonText}>{t('trip_component.modals.edit.cancel')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[cardStyles.modalButton, cardStyles.modalButtonConfirm]} onPress={handleEditWithConfirmation}>
                            <Text style={[cardStyles.modalButtonText, {color: '#FFF'}]}>{t('trip_component.modals.edit.confirm')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>

        {/* === Card Header === */}
        <View style={cardStyles.cardHeader}>
            <TouchableOpacity style={cardStyles.travelerInfo} onPress={handleProfilePress}>
                <Image 
                    source={{ uri: trip.traveler.image }} 
                    style={cardStyles.travelerAvatar} 
                    contentFit='cover' 
                    transition={200} 
                    cachePolicy="memory-disk"
                />
                <View>
                    <Text style={cardStyles.travelerName}>{trip.traveler.username}</Text>
                    {/* Airline moved here for better space usage */}
                    {trip.airline ? (
                        <Text style={cardStyles.airlineText}>{trip.airline}</Text>
                    ) : null}
                </View>
            </TouchableOpacity>

            {isOwnTrip ? (
                <View style={cardStyles.headerActions}>
                    <TouchableOpacity style={cardStyles.actionIcon} onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setEditModalVisible(true);
                    }}>
                        <MaterialCommunityIcons name="pencil-outline" size={20} color={PALETTE.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[cardStyles.actionIcon, { marginLeft: 12 }]} onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setDeleteModalVisible(true);
                    }}>
                        <MaterialCommunityIcons name="trash-can-outline" size={20} color={PALETTE.destructive} />
                    </TouchableOpacity>
                </View>
            ) : (
                <StarDisplay rating={trip.traveler.asTravelerrating} />
            )}
        </View>

        {/* === Travel Route Visualization (The "Ticket" Look) === */}
        <View style={cardStyles.routeContainer}>
            <View style={cardStyles.locationBlockLeft}>
                <Text style={cardStyles.cityCode}>{trip.originCountryCode}</Text>
                <Text style={cardStyles.cityName} numberOfLines={1}>{trip.originCity}</Text>
                <View style={cardStyles.flagWrapper}>
                     <CountryFlag isoCode={trip.originCountryCode.toLowerCase()} size={12} />
                </View>
            </View>

            {/* Animation Center */}
            <View style={cardStyles.routeGraphic}>
                <LottieView 
                    ref={animation} 
                    style={cardStyles.lottiePlane} 
                    source={require('@/assets/animations/airplane.json')} 
                    autoPlay 
                    loop 
                />
                <View style={cardStyles.dottedLine} />
            </View>

            <View style={cardStyles.locationBlockRight}>
                <Text style={cardStyles.cityCode}>{trip.destinationCountryCode}</Text>
                <Text style={cardStyles.cityName} numberOfLines={1}>{trip.destinationCity}</Text>
                <View style={cardStyles.flagWrapper}>
                     <CountryFlag isoCode={trip.destinationCountryCode.toLowerCase()} size={12} />
                </View>
            </View>
        </View>

        {/* === Core Details Block (Grey Background) === */}
        <View style={cardStyles.detailsBlock}>
            <View style={cardStyles.detailItem}>
                <MaterialCommunityIcons name="calendar-month" size={16} color={PALETTE.primary} />
                <Text style={cardStyles.detailValue}>{formattedDate}</Text>
            </View>
            <View style={cardStyles.detailSeparator} />
            <View style={cardStyles.detailItem}>
                <MaterialCommunityIcons name="bag-suitcase" size={16} color={PALETTE.primary} />
                <Text style={cardStyles.detailValue}>{trip.availableSpace}</Text>
            </View>
        </View>

        {/* === Accepted Items === */}
        {acceptedItems.length > 0 && (
            <View style={cardStyles.tagsContainer}>
                {acceptedItems.slice(0, 3).map((item, index) => (
                    <View key={index} style={cardStyles.tag}>
                         <Text style={cardStyles.tagText}>{t(`categories.${item}`)}</Text>
                    </View>
                ))}
                {acceptedItems.length > 3 && (
                     <Text style={cardStyles.moreTagsText}>+{acceptedItems.length - 3}</Text>
                )}
            </View>
        )}
        
        {/* === Action Button (BUG FIXED: No Flashing) === */}
        {/* Only render if user is loaded AND it's not their own trip */}
        {!isLoadingUser && !isOwnTrip && (
            <TouchableOpacity onPress={handleSendOffer} style={{marginTop: 16}} activeOpacity={0.9}>
                <LinearGradient 
                    colors={PALETTE.primaryGradient} 
                    start={{ x: 0, y: 0 }} 
                    end={{ x: 1, y: 1 }} 
                    style={cardStyles.actionButton}
                >
                    <Text style={cardStyles.actionButtonText}>{t('trip_component.labels.request_delivery')}</Text>
                    <FontAwesome5 name="arrow-right" size={14} color="#FFFFFF" style={{marginLeft: 8}}/>
                </LinearGradient>
            </TouchableOpacity>
        )}

    </Animated.View>
    );
}


const cardStyles = StyleSheet.create({
    cardContainer: { 
        backgroundColor: PALETTE.surface, 
        borderRadius: 24, // Matches Index screen cards
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
    cardHeader: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start', 
        marginBottom: 16 
    },
    travelerInfo: { 
        flexDirection: 'row', 
        alignItems: 'center' 
    },
    travelerAvatar: { 
        width: 40, 
        height: 40, 
        borderRadius: 20, 
        marginRight: 12,
        borderWidth: 1,
        borderColor: PALETTE.border
    },
    travelerName: { 
        fontSize: 15, 
        fontWeight: '700', 
        color: PALETTE.textPrimary,
        marginBottom: 2,
    },
    airlineText: { 
        color: PALETTE.textSecondary, 
        fontSize: 12, 
        fontWeight: '500' 
    },
    headerActions: { 
        flexDirection: 'row', 
        alignItems: 'center' 
    },
    actionIcon: { 
        padding: 4 
    },

    // Route Visualization
    routeContainer: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        marginBottom: 16,
    },
    locationBlockLeft: {
        alignItems: 'flex-start',
        flex: 1,
    },
    locationBlockRight: {
        alignItems: 'flex-end',
        flex: 1,
    },
    cityCode: {
        fontSize: 20,
        fontWeight: '800',
        color: PALETTE.textPrimary,
        letterSpacing: 0.5,
    },
    cityName: {
        fontSize: 12,
        color: PALETTE.textSecondary,
        fontWeight: '500',
        marginTop: 2,
        maxWidth: 80,
    },
    flagWrapper: {
        marginTop: 6,
        borderRadius: 2,
        overflow: 'hidden',
    },
    
    // Graphic Middle
    routeGraphic: {
        flex: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        height: 40,
    },
    dottedLine: {
        position: 'absolute',
        width: '100%',
        height: 1,
        borderBottomWidth: 1,
        borderColor: '#CBD5E1',
        borderStyle: 'dashed',
        zIndex: 0,
    },
    lottiePlane: {
        width: 36,
        height: 36,
        zIndex: 1,
        marginBottom: 4, // Lifts the plane slightly above the line visual
    },

    // Details Block
    detailsBlock: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: PALETTE.softBackground,
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 16,
        justifyContent: 'space-around',
        marginBottom: 12,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    detailValue: {
        fontSize: 13,
        fontWeight: '600',
        color: PALETTE.textPrimary,
    },
    detailSeparator: {
        width: 1,
        height: 16,
        backgroundColor: PALETTE.border,
    },

    // Tags
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        alignItems: 'center',
    },
    tag: {
        backgroundColor: '#F3F4F6',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    tagText: {
        fontSize: 11,
        color: PALETTE.textSecondary,
        fontWeight: '500',
    },
    moreTagsText: {
        fontSize: 11,
        color: PALETTE.textSecondary,
        fontWeight: '500',
        marginLeft: 2,
    },

    // Action Button
    actionButton: { 
        borderRadius: 14, 
        paddingVertical: 14, 
        alignItems: 'center', 
        justifyContent: 'center', 
        flexDirection: 'row', 
        shadowColor: PALETTE.primary, 
        shadowOffset: { width: 0, height: 4 }, 
        shadowOpacity: 0.2, 
        shadowRadius: 8, 
        elevation: 4 
    },
    actionButtonText: { 
        color: '#FFFFFF', 
        fontSize: 15, 
        fontWeight: '700', 
    },

    // Modal Styles (Preserved but styled)
    modalCenteredView: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: 'rgba(0, 0, 0, 0.4)' 
    },
    modalView: { 
        margin: 20, 
        width: '85%',
        backgroundColor: PALETTE.surface, 
        borderRadius: 24, 
        padding: 30, 
        alignItems: 'center', 
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 10 }, 
        shadowOpacity: 0.25, 
        shadowRadius: 20, 
        elevation: 10,
    },
    modalTitle: { 
        marginBottom: 10, 
        textAlign: 'center', 
        fontSize: 18, 
        fontWeight: 'bold', 
        color: PALETTE.textPrimary 
    },
    modalText: { 
        marginBottom: 24, 
        textAlign: 'center', 
        color: PALETTE.textSecondary, 
        lineHeight: 22,
        fontSize: 14
    },
    modalButtonContainer: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        width: '100%',
        gap: 12
    },
    modalButton: { 
        borderRadius: 12, 
        paddingVertical: 12, 
        paddingHorizontal: 20, 
        flex: 1, 
        alignItems: 'center', 
        justifyContent: 'center'
    },
    modalButtonCancel: { 
        backgroundColor: '#F3F4F6' 
    },
    modalButtonConfirm: { 
        backgroundColor: PALETTE.destructive 
    },
    modalButtonText: { 
        color: PALETTE.textPrimary, 
        fontWeight: '600', 
        fontSize: 14
    },
});