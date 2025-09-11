import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { styles } from '@/styles/feed.styles';
import { useUser } from '@clerk/clerk-expo';
import { AntDesign, Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { Link, router } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';


const COLORS = {
  primary: '#007BFF',
  white: '#FFFFFF',
  grey: '#AEAEB2',
  dark: '#1C1C1E',
  card: '#2C2C2E',
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
        traveler:{
            _id: string;
            username: string;
            image: string;
        };
    }
}


export default function Trip({trip}: TripProps) {

  const formattedDate = new Date(trip.arrivalDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    function getFlagEmoji(countryCode: string): string {
        if (!countryCode || countryCode.length !== 2) {
            return '🏳️'; // Default flag
        }
        const codePoints = countryCode
            .toUpperCase()
            .split('')
            .map(char => 127397 + char.charCodeAt(0));
        return String.fromCodePoint(...codePoints);
    }

    const {user} = useUser()

    const currentUser = useQuery(api.users.getUserByClerkId, user ? {clerkId: user?.id} : "skip")

    const deleteTrip = useMutation(api.trips.deleteTrip)

    const handleDeleteTrip = async () => {
        try {
            await deleteTrip({ tripId: trip._id })
        } catch (error) {
            alert("Error deleting the trip")
        }
    }

  return (
    <View style={styles.post}>

        <View style={styles.postHeader}>
            <Link href={"/"}>
                <TouchableOpacity style={styles.postHeaderLeft}>
                    <Image
                        source={{ uri: trip.traveler.image }}
                        style={styles.postAvatar}
                        contentFit='cover'
                        transition={200}
                        cachePolicy="memory-disk"
                    />
                    <Text style={styles.postUsername}>{trip.traveler.username}</Text>
                </TouchableOpacity>
            </Link>
            
            {/* if owner show delete button */}

            {trip.traveler._id === currentUser?._id ? (
                <><TouchableOpacity onPress={handleDeleteTrip}>
                      <Ionicons name='trash-outline' size={20} color={COLORS.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                        onPress={() => { // Wrap it in a function
                            router.push({
                            pathname: '/trips', 
                            params: { trip: JSON.stringify(trip) }
                            });
                        }}
                        >
                          <AntDesign name='edit' size={20} color={COLORS.primary} />
                    </TouchableOpacity></>
            ) : (
                <TouchableOpacity>
                    <Ionicons name='ellipsis-horizontal' size={20} color={COLORS.white} />
                </TouchableOpacity>
            )}

            
        </View>

            {/* show trip details here */}

            {/* --- Trip Details Section (Completed) --- */}
            <View style={styles.detailsContainer}>
                {/* From -> To Block */}
                <View style={styles.locationRow}>
                    <View style={styles.location}>
                        <View style={styles.locationHeader}>
                        <Text style={styles.flagEmoji}>{getFlagEmoji(trip.originCountryCode)}</Text>
                        <Text style={styles.locationLabel}>FROM</Text>
                        </View>
                        <Text style={styles.locationCity} numberOfLines={1}>{trip.originCity}</Text>
                        <Text style={styles.locationCountry} numberOfLines={1}>{trip.originCountry}</Text>
                    </View>

                    <Ionicons name="airplane-outline" size={24} color={COLORS.primary} style={styles.airplaneIcon} />

                    <View style={styles.location}>
                        <View style={styles.locationHeader}>
                        <Text style={styles.flagEmoji}>{getFlagEmoji(trip.destinationCountryCode)}</Text>
                        <Text style={styles.locationLabel}>TO</Text>
                        </View>
                        <Text style={styles.locationCity} numberOfLines={1}>{trip.destinationCity}</Text>
                        <Text style={styles.locationCountry} numberOfLines={1}>{trip.destinationCountry}</Text>
                    </View>
                    </View>

                    {/* Divider */}
                    <View style={styles.divider} />

                    {/* Secondary Info Rows */}
                    <View style={styles.infoContainer}>
                    <View style={styles.infoRow}>
                        <Ionicons name="calendar-outline" size={18} color={COLORS.grey} />
                        <Text style={styles.infoText}>Arrives by: {formattedDate}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Ionicons name="briefcase-outline" size={18} color={COLORS.grey} />
                        <Text style={styles.infoText}>Available space: {trip.availableSpace}</Text>
                    </View>
                    {trip.acceptedItemTypes && (
                        <View style={styles.infoRow}>
                        <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.grey} />
                        <Text style={styles.infoText}>Accepts: {trip.acceptedItemTypes}</Text>
                        </View>
                    )}
                </View>
            </View>
            

            {/* Description */}
            {trip.description && (
            <View style={styles.descriptionContainer}>
                <Text style={styles.description}>{trip.description}</Text>
            </View>
            )}

            <View style={styles.postActions}>
                <TouchableOpacity style={styles.tabContainer} onPress={() => alert('clicked')}>
                    <Text style={[styles.tabText, styles.tabContainer]}>Send Offer</Text>
                </TouchableOpacity>
            </View>
    
    </View>
  )
}