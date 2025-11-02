import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useUser } from '@clerk/clerk-expo';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMutation, useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, router } from 'expo-router';
import LottieView from 'lottie-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CountryFlag from "react-native-country-flag";
import Animated, { FadeIn } from 'react-native-reanimated';

// NEW: Modern, light-mode color palette
const PALETTE = {
    backgroundGradient: ['#F7F8FA', '#FFFFFF'] as const, // Subtle gradient for a non-flat look
    surface: '#FFFFFF',
    shadow: 'rgba(100, 100, 111, 0.25)', // Increased shadow opacity for more depth
    primary: '#3B82F6', // A single, consistent primary blue
    secondary: '#10B981', // A single, consistent secondary green
    textPrimary: '#1F2937', // Near-black for high contrast
    textSecondary: '#6B7280', // Medium gray for secondary info
    historyIcon: '#ed7c04ff',
    primaryGradient: ['#38BDF8', '#3B82F6'] as const,
    secondaryActionGradient: ['#34D399', '#10B981'] as const, 
    border: '#D1D5DB', // Slightly darker border for better definition
    // Status colors for light mode
    status_active: '#10B981',      // Green
    status_completed: '#6B7280',  // Grey
    status_pending: '#F59E0B',      // Amber/Orange
    ratingStar: '#FBBF24',        // Gold for ratings
    destructive: '#EF4444',       // Red for delete actions
};


type TripProps = {
    trip:{
        _id: Id<"trips">;
        _creationTime: number;
        description?: string;
        acceptedItemTypes?: string;
        arrivalDate: string;
        originCountry: string;
        originCity: string;
        destinationCountry: string;
        destinationCity: string;
        status: string;
        availableSpace: string;
        originCountryCode: string;
        destinationCountryCode: string;
        airline: string;
        traveler:{
            _id: string;
            username: string;
            image: string;
            rating?: number;
        };
    }
}

// UPDATED: Status styles now use the new light-mode PALETTE
const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
        case 'active':
            return { backgroundColor: PALETTE.status_active };
        case 'completed':
            return { backgroundColor: PALETTE.status_completed };
        case 'pending':
            return { backgroundColor: PALETTE.status_pending };
        default:
            return { backgroundColor: PALETTE.textSecondary };
    }
};


export default function Trip({trip}: TripProps) {

    const formattedDate = new Date(trip.arrivalDate).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });

    const acceptedItems = useMemo(() => {
        if (!trip.acceptedItemTypes) return [];
        return trip.acceptedItemTypes.split(',').map(item => item.trim());
    }, [trip.acceptedItemTypes]);

    const {user} = useUser()
    const currentUser = useQuery(api.users.getUserByClerkId, user ? {clerkId: user?.id} : "skip")
    const deleteTrip = useMutation(api.trips.deleteTrip)

    const [isDeleteModalVisible, setDeleteModalVisible] = useState(false)
    const [isEditModalVisible, setEditModalVisible] = useState(false)

    const handleDeleteWithConfirmation = () => {
        handleDeleteTrip()
        setDeleteModalVisible(false)
    }

    const handleEditWithConfirmation = () => {
        router.push({ pathname: '/trips', params: { trip: JSON.stringify(trip) } })
        setEditModalVisible(false)
    }

    const handleDeleteTrip = async () => {
        try {
            await deleteTrip({ tripId: trip._id })
        } catch (error) {
            alert("Error deleting the trip")
        }
    }

    const handleSendOffer = async () => {
        try {
            router.push({
                pathname:'/(stack)/orders',
                params: {
                    travelerId: trip.traveler._id,
                    tripId: trip._id
                }
            })
        } catch (error) {
            alert("Error sending offer")
        }
    }
    
    type StarDisplayProps = {
        rating?: number;
        size?: number;
    };

    // --- UPGRADED StarDisplay Component ---
    // Now uses MaterialIcons for a cleaner look and supports decimal ratings (e.g., 4.5)
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

    const animation = useRef<LottieView>(null);
    useEffect(() => {
        // animation.current?.play();
    }, []);

    function MapsTo(arg0: string, arg1: { travelerId: string; tripId: string; }): ((event: import("react-native").GestureResponderEvent) => void) | undefined {
        throw new Error('Function not implemented.');
    }

    return (
    <Animated.View style={cardStyles.cardContainer} entering={FadeIn.duration(500)}>
        {/* Modals updated with light theme styles */}
        <Modal animationType='fade' transparent={true} visible={isDeleteModalVisible} onRequestClose={() => setDeleteModalVisible(false)}>
            <View style={cardStyles.modalCenteredView}><View style={cardStyles.modalView}><Text style={cardStyles.modalTitle}>Confirm Deletion</Text><Text style={cardStyles.modalText}>Are you sure you want to delete this trip? This action cannot be undone.</Text><View style={cardStyles.modalButtonContainer}><TouchableOpacity style={[cardStyles.modalButton, cardStyles.modalButtonCancel]} onPress={() => setDeleteModalVisible(false)}><Text style={cardStyles.modalButtonText}>Cancel</Text></TouchableOpacity><TouchableOpacity style={[cardStyles.modalButton, cardStyles.modalButtonConfirm]} onPress={handleDeleteWithConfirmation}><Text style={[cardStyles.modalButtonText, {color: '#FFF'}]}>Confirm</Text></TouchableOpacity></View></View></View>
        </Modal>
        <Modal animationType='fade' transparent={true} visible={isEditModalVisible} onRequestClose={() => setEditModalVisible(false)}>
            <View style={cardStyles.modalCenteredView}><View style={cardStyles.modalView}><Text style={cardStyles.modalTitle}>Confirm Edit</Text><Text style={cardStyles.modalText}>Are you sure you want to edit this trip? You will be taken to the editing screen.</Text><View style={cardStyles.modalButtonContainer}><TouchableOpacity style={[cardStyles.modalButton, cardStyles.modalButtonCancel]} onPress={() => setEditModalVisible(false)}><Text style={cardStyles.modalButtonText}>Cancel</Text></TouchableOpacity><TouchableOpacity style={[cardStyles.modalButton, cardStyles.modalButtonConfirm]} onPress={handleEditWithConfirmation}><Text style={[cardStyles.modalButtonText, {color: '#FFF'}]}>Confirm</Text></TouchableOpacity></View></View></View>
        </Modal>

        {/* Card Header */}
        <View style={cardStyles.cardHeader}>
            <Link href={`/user/${trip.traveler._id}`} asChild><TouchableOpacity style={cardStyles.travelerInfo}><Image source={{ uri: trip.traveler.image }} style={cardStyles.travelerAvatar} contentFit='cover' transition={200} cachePolicy="memory-disk"/><Text style={cardStyles.travelerName}>{trip.traveler.username}</Text></TouchableOpacity></Link>
            {trip.traveler._id === currentUser?._id ? (
                // IF owner, show Edit and Delete buttons
                <View style={cardStyles.headerActions}>
                    <TouchableOpacity style={cardStyles.actionIcon} onPress={() => setEditModalVisible(true)}>
                        <MaterialCommunityIcons name="pencil-outline" size={22} color={PALETTE.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={cardStyles.actionIcon} onPress={() => setDeleteModalVisible(true)}>
                        <MaterialCommunityIcons name="trash-can-outline" size={22} color={PALETTE.destructive} />
                    </TouchableOpacity>
                </View>
            ) : (
                // IF NOT owner, show the star rating
                <StarDisplay rating={trip.traveler.rating} />
            )}
        </View>

        {/* Travel Route Visualization */}
        <View style={cardStyles.travelRouteContainer}>
            <View style={cardStyles.locationPoint}><CountryFlag isoCode={trip.originCountryCode.toLowerCase()} size={16} /><Text style={cardStyles.cityText}>{trip.originCity}</Text><Text style={cardStyles.countryText}>{trip.originCountry}</Text></View>
            <View style={cardStyles.routeLine}><View style={cardStyles.dot} /><View style={cardStyles.dashedLine} /><LottieView ref={animation} style={cardStyles.lottiePlane} source={require('@/assets/animations/airplane.json')} autoPlay loop /><View style={cardStyles.dashedLine} /><View style={cardStyles.dot} /></View>
            <View style={cardStyles.locationPoint}><CountryFlag isoCode={trip.destinationCountryCode.toLowerCase()} size={16} /><Text style={cardStyles.cityText}>{trip.destinationCity}</Text><Text style={cardStyles.countryText}>{trip.destinationCountry}</Text></View>
        </View>
        
        {/* Airline Info */}
        {trip.airline && (<View style={cardStyles.airlineInfoContainer}><MaterialIcons name="airplanemode-active" size={14} color={PALETTE.textSecondary} /><Text style={cardStyles.airlineText}>{trip.airline}</Text></View>)}

        {/* Divider */}
        <View style={cardStyles.divider} />

        {/* Core Details Container */}
        <View style={cardStyles.detailsContainer}>
            <View style={cardStyles.detailItem}><MaterialCommunityIcons name="calendar-month-outline" size={20} color={PALETTE.primary} /><View style={cardStyles.detailTextContainer}><Text style={cardStyles.detailLabel}>Arrival Date</Text><Text style={cardStyles.detailValue}>{formattedDate}</Text></View></View>
            <View style={cardStyles.detailItem}><MaterialCommunityIcons name="bag-carry-on" size={20} color={PALETTE.primary} /><View style={cardStyles.detailTextContainer}><Text style={cardStyles.detailLabel}>Free Space</Text><Text style={cardStyles.detailValue}>{trip.availableSpace}</Text></View></View>
        </View>

        {/* Accepted Items Section */}
        {acceptedItems.length > 0 && (
            <View style={cardStyles.acceptedItemsContainer}>
                <MaterialCommunityIcons name="package-variant-closed-check" size={18} color={PALETTE.primary} />
                <Text style={cardStyles.acceptedItemsText}>
                    Accepts: {acceptedItems.join(' • ')}
                </Text>
            </View>
        )}
        
        {/* Action Button */}
        {trip.traveler._id !== currentUser?._id && (
            <TouchableOpacity onPress={handleSendOffer} style={{marginTop: 16}} activeOpacity={0.8}> {/* Changed to TouchableOpacity for better feedback */}
                <LinearGradient colors={PALETTE.primaryGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={cardStyles.actionButton}>
                    <FontAwesome5 name="paper-plane" size={16} color="#FFFFFF" solid/>
                    <Text style={cardStyles.actionButtonText}>Request Delivery</Text>
                </LinearGradient>
            </TouchableOpacity>
        )}
    </Animated.View>
    );
}


const cardStyles = StyleSheet.create({
    cardContainer: { 
        backgroundColor: PALETTE.surface, 
        borderRadius: 16, 
        padding: 14, 
        marginVertical: 10, // Increased marginVertical slightly to give more breathing room
        marginHorizontal: 16, 
        shadowColor: PALETTE.shadow, 
        shadowOffset: { width: 0, height: 6 }, // Increased shadow offset for more depth
        shadowOpacity: 0.35, // Increased shadow opacity further
        shadowRadius: 18, // Increased shadow radius for a softer, more spread-out shadow
        elevation: 8, // Increased elevation for Android
        borderWidth: 1,
        borderColor: PALETTE.border, // Slightly darker border
    },
    cardHeader: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 12 
    },
    travelerInfo: { 
        flexDirection: 'row', 
        alignItems: 'center' 
    },
    travelerAvatar: { 
        width: 36, 
        height: 36, 
        borderRadius: 18, 
        marginRight: 10 
    },
    travelerName: { 
        fontSize: 15, 
        fontWeight: '600', 
        color: PALETTE.textPrimary 
    },
    headerActions: { 
        flexDirection: 'row', 
        alignItems: 'center' 
    },
    statusBadge: { 
        paddingVertical: 4, 
        paddingHorizontal: 12, 
        borderRadius: 12 
    },
    statusBadgeText: { 
        color: '#FFFFFF', 
        fontSize: 12, 
        fontWeight: '700' 
    },
    actionIcon: { marginLeft: 16 }, // Provides spacing between the edit and delete icons
    travelRouteContainer: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between',
    },
    locationPoint: { 
        alignItems: 'center', 
        flex: 1, 
        paddingHorizontal: 4 
    },
    cityText: { 
        fontSize: 16, 
        fontWeight: 'bold', 
        color: PALETTE.textPrimary, 
        marginTop: 4 
    },
    countryText: { 
        fontSize: 12, 
        color: PALETTE.textSecondary 
    },
    routeLine: { 
        flex: 1.5, 
        flexDirection: 'row', 
        alignItems: 'center' 
    },
    dot: { 
        width: 6, 
        height: 6, 
        borderRadius: 3, 
        backgroundColor: PALETTE.textSecondary 
    },
    dashedLine: { 
        height: 1, 
        flex: 1, 
        borderBottomWidth: 1, 
        borderBottomColor: PALETTE.textSecondary, 
        borderStyle: 'dashed' 
    },
    lottiePlane: { 
        width: 32, 
        height: 32 
    },
    airlineInfoContainer: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'center', 
    },
    airlineText: { 
        color: PALETTE.textSecondary, 
        fontSize: 12, 
        marginLeft: 4, 
        fontWeight: '500' 
    },
    divider: {
        height: 1,
        backgroundColor: PALETTE.border,
        marginVertical: 10, // Adjusted vertical margin
    },
    detailsContainer: { 
        flexDirection: 'row', 
        justifyContent: 'space-around', 
        alignItems: 'center',
        marginBottom: 8, // Added a small bottom margin
    },
    detailItem: { 
        flex: 1, 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'flex-start', 
        paddingLeft: 10, 
    },
    detailTextContainer: { 
        marginLeft: 8, 
        alignItems: 'flex-start' 
    },
    detailLabel: { 
        fontSize: 11, 
        color: PALETTE.textSecondary, 
        marginBottom: 2, 
        textTransform: 'uppercase', 
        fontWeight: '600' 
    },
    detailValue: { 
        fontSize: 13, 
        fontWeight: '600', 
        color: PALETTE.textPrimary 
    },
    acceptedItemsContainer: {
        marginTop: 10, // Reduced top margin slightly
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: `${PALETTE.primary}15`, // Slightly more opaque primary background for visibility
        borderRadius: 10,
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    acceptedItemsText: {
        flex: 1,
        color: PALETTE.textPrimary,
        fontSize: 12,
        fontWeight: '500',
        marginLeft: 8,
    },
    actionButton: { 
        borderRadius: 12, 
        paddingVertical: 12, 
        alignItems: 'center', 
        justifyContent: 'center', 
        flexDirection: 'row', 
        shadowColor: PALETTE.primary, 
        shadowOffset: { width: 0, height: 4 }, 
        shadowOpacity: 0.3, 
        shadowRadius: 5, 
        elevation: 8 
    },
    actionButtonText: { 
        color: '#FFFFFF', 
        fontSize: 16, 
        fontWeight: 'bold', 
        marginLeft: 10 
    },
    modalCenteredView: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: 'rgba(0, 0, 0, 0.5)' 
    },
    modalView: { 
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
    modalButtonContainer: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        width: '100%' 
    },
    modalButton: { 
        borderRadius: 10, 
        paddingVertical: 10, 
        paddingHorizontal: 20, 
        elevation: 2, 
        flex: 1, 
        marginHorizontal: 5 
    },
    modalButtonCancel: { 
        backgroundColor: PALETTE.border 
    },
    modalButtonConfirm: { 
        backgroundColor: PALETTE.destructive 
    },
    modalButtonText: { 
        color: PALETTE.textSecondary, 
        fontWeight: 'bold', 
        textAlign: 'center' 
    },
});