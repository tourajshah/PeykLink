import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useUser } from '@clerk/clerk-expo';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMutation, useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { Link, router } from 'expo-router';
import LottieView from 'lottie-react-native';
import { useEffect, useRef, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CountryFlag from "react-native-country-flag";
import Animated, { FadeIn } from 'react-native-reanimated';




const COLORS = {
  primary: '#007BFF',
  white: '#FFFFFF',
  grey: '#AEAEB2',
  dark: '#1C1C1E',
  card: '#2C2C2E',
  // NEW: Added colors for status badges
  status_active: '#34C759', // Green
  status_completed: '#8E8E93', // Grey
  status_pending: '#FF9500', // Orange
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
        airline?: string;
        traveler:{
            _id: string;
            username: string;
            image: string;
        };
    }
}


const getStatusStyle = (status: string) => {
  switch (status.toLowerCase()) {
    case 'active':
      return { backgroundColor: COLORS.status_active };
    case 'completed':
      return { backgroundColor: COLORS.status_completed };
    case 'pending':
      return { backgroundColor: COLORS.status_pending };
    default:
      return { backgroundColor: COLORS.grey };
  }
};


export default function Trip({trip}: TripProps) {

  const formattedDate = new Date(trip.arrivalDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    // OLD FLAG EMOJI WITHOUT IMPORT, DEVICE EMOJI USER

    // function getFlagEmoji(countryCode: string): string {
    //     if (!countryCode || countryCode.length !== 2) {
    //         return '🏳️'; // Default flag
    //     }
    //     const codePoints = countryCode
    //         .toUpperCase()
    //         .split('')
    //         .map(char => 127397 + char.charCodeAt(0));
    //     return String.fromCodePoint(...codePoints);
    // }

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


    const animation = useRef<LottieView>(null);
    useEffect(() => {
        // LOGIC TO ADD PLAY ANIMATION *IF NEEDED*
        // animation.current?.play();
    }, []);

    // DONT REMOVE MIGHT NEED IT LATER

    function MapsTo(arg0: string, arg1: { travelerId: string; tripId: string; }): ((event: import("react-native").GestureResponderEvent) => void) | undefined {
        throw new Error('Function not implemented.');
    }

  return (
    <Animated.View style={cardStyles.cardContainer} entering={FadeIn.duration(500)}>
      {/* === CARD HEADER === */}
      {/* MODAL FOR DELETING */}
      <Modal
        animationType='fade'
        transparent={true}
        visible={isDeleteModalVisible}
        onRequestClose={() => {
            setDeleteModalVisible(!isDeleteModalVisible)
        }}
      >
            <View style={cardStyles.modalCenteredView}>
                    <View style={cardStyles.modalView}>
                        <Text style={cardStyles.modalTitle}>Confirm Deletion</Text>
                        <Text style={cardStyles.modalText}>Are you sure you want to delete this trip? This action cannot be undone.</Text>
                        <View style={cardStyles.modalButtonContainer}>
                            <TouchableOpacity
                                style={[cardStyles.modalButton, cardStyles.modalButtonCancel]}
                                onPress={() => setDeleteModalVisible(false)}
                            >
                                <Text style={cardStyles.modalButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[cardStyles.modalButton, cardStyles.modalButtonConfirm]}
                                onPress={handleDeleteWithConfirmation}
                            >
                                <Text style={cardStyles.modalButtonText}>Confirm</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
      </Modal>
        {/* MODAL FOR EDITING */}
      <Modal
        animationType='fade'
        transparent={true}
        visible={isEditModalVisible}
        onRequestClose={() => {
            setEditModalVisible(!isEditModalVisible)
        }}
      >
            <View style={cardStyles.modalCenteredView}>
                    <View style={cardStyles.modalView}>
                        <Text style={cardStyles.modalTitle}>Confirm Edit</Text>
                        <Text style={cardStyles.modalText}>Are you sure you want to edit this trip? You are going to the editing screen.</Text>
                        <View style={cardStyles.modalButtonContainer}>
                            <TouchableOpacity
                                style={[cardStyles.modalButton, cardStyles.modalButtonCancel]}
                                onPress={() => setEditModalVisible(false)}
                            >
                                <Text style={cardStyles.modalButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[cardStyles.modalButton, cardStyles.modalButtonConfirm]}
                                onPress={handleEditWithConfirmation}
                            >
                                <Text style={cardStyles.modalButtonText}>Confirm</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
      </Modal>

      <View style={cardStyles.cardHeader}>
        <Link href={`/user/${trip.traveler._id}`} asChild>
          <TouchableOpacity style={cardStyles.travelerInfo}>
            <Image
              source={{ uri: trip.traveler.image }}
              style={cardStyles.travelerAvatar}
              contentFit='cover'
              transition={200}
              cachePolicy="memory-disk"
            />
            <Text style={cardStyles.travelerName}>{trip.traveler.username}</Text>
          </TouchableOpacity>
        </Link>
        <View style={cardStyles.headerActions}>
           {/* Your existing logic for showing delete/edit/ellipsis is preserved here */}
           {trip.traveler._id === currentUser?._id ? (
            <>
              <TouchableOpacity onPress={() => setEditModalVisible(true)}>
                <FontAwesome5 name='edit' size={18} color={COLORS.grey} style={{marginRight: 16}} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setDeleteModalVisible(true)}>
                <Ionicons name='trash-outline' size={20} color={COLORS.grey} />
              </TouchableOpacity>
            </>
          ) : (
             <View style={[cardStyles.statusBadge, getStatusStyle(trip.status)]}>
                 <Text style={cardStyles.statusBadgeText}>{trip.status}</Text>
            </View>
          )}
        </View>
      </View>

      {/* === TRAVEL ROUTE VISUALIZATION === */}
      <View style={cardStyles.travelRouteContainer}>
          <View style={cardStyles.locationPoint}>
              <CountryFlag isoCode={trip.originCountryCode.toLowerCase()} size={18} />
              <Text style={cardStyles.cityText}>{trip.originCity}</Text>
              <Text style={cardStyles.countryText}>{trip.originCountry}</Text>
          </View>

          <View style={cardStyles.routeLine}>
            <View style={cardStyles.dot} />
            <View style={cardStyles.dashedLine} />
            <LottieView
                ref={animation}
                style={cardStyles.lottiePlane}
                source={require('@/assets/animations/airplane.json')} // IMPORTANT: Download and place an animation here
                autoPlay
                loop
            />
            <View style={cardStyles.dashedLine} />
            <View style={cardStyles.dot} />
          </View>

          <View style={cardStyles.locationPoint}>
              <CountryFlag isoCode={trip.destinationCountryCode.toLowerCase()} size={18} />
              <Text style={cardStyles.cityText}>{trip.destinationCity}</Text>
              <Text style={cardStyles.countryText}>{trip.destinationCountry}</Text>
          </View>
      </View>

      {/* === DETAILS GRID === */}
      <View style={cardStyles.detailsGrid}>
          <View style={cardStyles.detailItem}>
              <MaterialCommunityIcons name="calendar-clock" size={20} color={COLORS.primary} />
              <Text style={cardStyles.detailLabel}>Arrival Date</Text>
              <Text style={cardStyles.detailValue}>{formattedDate}</Text>
          </View>
          <View style={cardStyles.detailItem}>
              <FontAwesome5 name="luggage-cart" size={20} color={COLORS.primary} />
              <Text style={cardStyles.detailLabel}>Available Space</Text>
              <Text style={cardStyles.detailValue}>{trip.availableSpace}</Text>
          </View>
          {trip.airline && (
            <View style={cardStyles.detailItem}>
                <MaterialIcons name="airlines" size={20} color={COLORS.primary} />
                <Text style={cardStyles.detailLabel}>Airline</Text>
                <Text style={cardStyles.detailValue}>{trip.airline}</Text>
            </View>
          )}
          {trip.acceptedItemTypes && (
            <View style={cardStyles.detailItem}>
                <MaterialCommunityIcons name="package-variant-closed-check" size={20} color={COLORS.primary} />
                <Text style={cardStyles.detailLabel}>Accepts</Text>
                <Text style={cardStyles.detailValue} numberOfLines={1}>{trip.acceptedItemTypes}</Text>
            </View>
          )}
      </View>

       {/* REMOVED DESCRIPTION FOR TRIPS, LOGICALLY ONLY REQUESTERS SHOULD HAVE DESCRIPTION FOR SECURITY */}

       {/* {trip.description && (
        <View style={cardStyles.descriptionContainer}>
            <Text style={cardStyles.descriptionText}>{trip.description}</Text>
        </View>
       )} */}

      {/* === ACTION BUTTON === */}
      {/* Your existing logic for the action button is preserved */}
      {trip.traveler._id !== currentUser?._id && (
        <TouchableOpacity style={cardStyles.actionButton} onPress={handleSendOffer}>
            <Text style={cardStyles.actionButtonText}>Request Delivery</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}


const cardStyles = StyleSheet.create({
    cardContainer: {
        backgroundColor: COLORS.card,
        borderRadius: 24,
        padding: 16,
        marginVertical: 8,
        marginHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    travelerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    travelerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    travelerName: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.white,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusBadge: {
        paddingVertical: 4,
        paddingHorizontal: 12,
        borderRadius: 12,
    },
    statusBadgeText: {
        color: COLORS.white,
        fontSize: 12,
        fontWeight: '700',
    },
    travelRouteContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    locationPoint: {
        alignItems: 'center',
        flex: 1,
    },
    cityText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.white,
        marginTop: 4,
    },
    countryText: {
        fontSize: 13,
        color: COLORS.grey,
    },
    routeLine: {
        flex: 1.5,
        flexDirection: 'row',
        alignItems: 'center',
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.grey,
    },
    dashedLine: {
        height: 1,
        flex: 1,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.grey,
        borderStyle: 'dashed',
    },
    lottiePlane: {
        width: 40,
        height: 40,
    },
    detailsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
        paddingTop: 16,
    },
    detailItem: {
        width: '48%', // Two items per row
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    detailLabel: {
        fontSize: 12,
        color: COLORS.grey,
        marginTop: 4,
    },
    detailValue: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.white,
    },
    descriptionContainer: {
        marginTop: 4,
        marginBottom: 16,
    },
    descriptionText: {
        fontSize: 14,
        color: COLORS.grey,
        lineHeight: 20,
    },
    actionButton: {
        backgroundColor: COLORS.primary,
        borderRadius: 16,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 8,
    },
    actionButtonText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: 'bold',
    },
    modalCenteredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)', // Dim the background
    },
    modalView: {
        margin: 20,
        backgroundColor: COLORS.card,
        borderRadius: 20,
        padding: 25,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)'
    },
    modalTitle: {
        marginBottom: 15,
        textAlign: 'center',
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.white,
    },
    modalText: {
        marginBottom: 20,
        textAlign: 'center',
        color: COLORS.grey,
        lineHeight: 20,
    },
    modalButtonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    modalButton: {
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 20,
        elevation: 2,
        flex: 1,
        marginHorizontal: 5,
    },
    modalButtonCancel: {
        backgroundColor: COLORS.grey,
    },
    modalButtonConfirm: {
        backgroundColor: '#FF3B30', // A destructive red color
    },
    modalButtonText: {
        color: 'white',
        fontWeight: 'bold',
        textAlign: 'center',
    },
});
