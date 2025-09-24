import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { styles } from '@/styles/feed.styles';
import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import AntDesign from '@expo/vector-icons/AntDesign';
import { useMutation, useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, Text, TextInput, TouchableOpacity, View } from 'react-native';


const COLORS = {
  primary: '#007BFF',
  white: '#FFFFFF',
  grey: '#AEAEB2',
  dark: '#1C1C1E',
  card: '#2C2C2E',
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

  const formattedDate = new Date(request.requiredByDate).toLocaleDateString('en-US', {
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


    const itemTotal = request.itemPrice * request.quantity;
    const travelerFee = request.travelerFee;
    const grandTotal = itemTotal + travelerFee;

    const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;


    const {user} = useUser()

    const currentUser = useQuery(api.users.getUserByClerkId, user ? {clerkId: user?.id} : "skip")

    const isPotentialTraveler = currentUser && currentUser._id !== request.requester._id;

    const createInitialOffer = useMutation(api.offers.createInitialOffer);

    // BOOL ANSWER : HAS MATCHING TRIPS ? YES OR NO 

    // const hasMatchingTrip = useQuery(
    //     api.users.checkUserHasMatchingTrip,
    //     isPotentialTraveler ? {
    //         originCountry: request.originCountry,
    //         destinationCountry: request.destinationCountry,
    //     } : "skip"
    // );

    // GET ALL ARRAY OF THE MATCHING TRIPS

    const myMatchingTrips = useQuery(
        api.trips.getMyMatchingTrips,
        isPotentialTraveler ? {
            originCity: request.originCity,
            destinationCity: request.destinationCity,
        } : "skip"
    );
    
    const isLoadingTrips = myMatchingTrips === undefined;


    const deleteRequest = useMutation(api.requests.deleteRequest)

    const handleDeleteRequest = async () => {
        try {
            await deleteRequest({ requestId: request._id })
        } catch (error) {
            alert("Error deleting the request")
        }
    }


    console.log(`[Request Card: ${request.productName}] Matching Trips Data:`, myMatchingTrips);


    const [isOfferModalVisible, setOfferModalVisible] = useState(false);
    const [proposedFee, setProposedFee] = useState(request.travelerFee.toFixed(2));
    const [isSubmitting, setIsSubmitting] = useState(false);


    const handleOpenOfferModal = () => {
        console.log(`[${request.productName}] handleOpenOfferModal triggered.`);
        if (!myMatchingTrips || myMatchingTrips.length === 0) {
            console.log(`[${request.productName}] Check failed: No trips. Alerting user.`);
            Alert.alert(
                "No Matching Trip",
                "You must have a trip registered from " + request.originCity + " to " + request.destinationCity + " to make an offer."
            );
            return;
        }
        console.log(`[${request.productName}] Check passed. Opening modal.`);
        setOfferModalVisible(true);
    };

    // This new function handles the logic of submitting the offer from the modal.
    const handleSubmitOffer = async () => {
        setIsSubmitting(true);
        const fee = parseFloat(proposedFee);
        if (isNaN(fee) || fee <= 0) {
            Alert.alert("Invalid Fee", "Please enter a valid amount.");
            setIsSubmitting(false);
            return;
        }

        if (!myMatchingTrips || myMatchingTrips.length === 0) {
            Alert.alert("Error", "Could not find a matching trip to submit.");
            setIsSubmitting(false);
            return;
        }
        
        const tripIdforOffer = myMatchingTrips[0]._id;

        try {
            const returnedRequestId = await createInitialOffer({
                requestId: request._id,
                tripId: tripIdforOffer,
                proposedFee: fee,
            });

            setOfferModalVisible(false);
            router.push({
                pathname: '/(stack)/offers',
                params: { id: returnedRequestId }
            });

        } catch (error) {
            console.error(error);
            Alert.alert("Error", (error as Error).message || "Could not send offer.");
        } finally {
            setIsSubmitting(false);
        }
    };


  return (
    <View style={styles.post}>

        <View style={styles.postHeader}>
            <Link href={`/user/${request.requester._id}`} asChild>
                <TouchableOpacity style={styles.postHeaderLeft}>
                    <Image
                        source={{ uri: request.requester.image }}
                        style={styles.postAvatar}
                        contentFit='cover'
                        transition={200}
                        cachePolicy="memory-disk"
                    />
                    <Text style={styles.postUsername}>{request.requester.username}</Text>
                </TouchableOpacity>
            </Link>
            

            {/* if owner show delete button */}
            
            {request.requester._id === currentUser?._id ? (
                <><TouchableOpacity onPress={handleDeleteRequest}>
                      <Ionicons name='trash-outline' size={20} color={COLORS.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                        onPress={() => { // Wrap it in a function
                            router.push({
                            pathname: '/orders', 
                            params: { request: JSON.stringify(request) }
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
            <View style={styles.contentContainer}>
                {/* --- 1. Product Details Section --- */}
                <Text style={styles.productTitle}>{request.productName}</Text>
                
                {/* Secondary details about the product */}
                <View style={styles.productDetailsRow}>
                <Text style={styles.detailChip}>Qty: {request.quantity}</Text>
                {request.productWeight && <Text style={styles.detailChip}>Weight: {request.productWeight}</Text>}
                {request.itemTypes && <Text style={styles.detailChip}>Category: {request.itemTypes}</Text>}
                </View>

                {/* Clickable product link, if it exists */}
                
                
                {/* --- 2. Enhanced Financial Breakdown Card --- */}
                <View style={styles.financialsCard}>
                    <View style={styles.financialsRow}>
                        <View style={styles.postHeaderLeft}>
                            <Ionicons name="pricetag-outline" size={20} color={COLORS.grey} />
                            <Text style={styles.financialsLabel}>Item Total ({formatCurrency(request.itemPrice)} x {request.quantity})</Text>
                        </View>
                        <Text style={styles.financialsValue}>{formatCurrency(itemTotal)}</Text>
                    </View>
                    
                    <View style={styles.financialsRow}>
                        <View style={styles.postHeaderLeft}>
                            <Ionicons name="add-circle-outline" size={20} color={COLORS.grey} />
                            <Text style={styles.financialsLabel}>Traveler Fee</Text>
                        </View>
                        <Text style={styles.financialsValue}>{formatCurrency(travelerFee)}</Text>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.financialsRow}>
                        <View style={styles.postHeaderLeft}>
                            <Ionicons name="wallet-outline" size={20} color={COLORS.primary} />
                            <Text style={styles.totalLabel}>Total Payout</Text>
                        </View>
                        <Text style={styles.totalValue}>{formatCurrency(grandTotal)}</Text>
                    </View>
                </View>

                {/* --- 3. Logistics (Location and Date) --- */}
                <View style={styles.locationRow}>
                <View style={styles.location}>
                    <View style={styles.locationHeader}>
                    <Text style={styles.flagEmoji}>{getFlagEmoji(request.originCountryCode)}</Text>
                    <Text style={styles.locationLabel}>FROM</Text>
                    </View>
                    <Text style={styles.locationCity} numberOfLines={1}>{request.originCity}</Text>
                </View>
                <Ionicons name="airplane-outline" size={24} color={COLORS.primary} style={styles.airplaneIcon} />
                <View style={styles.location}>
                    <View style={styles.locationHeader}>
                    <Text style={styles.flagEmoji}>{getFlagEmoji(request.destinationCountryCode)}</Text>
                    <Text style={styles.locationLabel}>TO</Text>
                    </View>
                    <Text style={styles.locationCity} numberOfLines={1}>{request.destinationCity}</Text>
                </View>
                </View>
                
                <View style={styles.infoRow}>
                    <Ionicons name="calendar-outline" size={18} color={COLORS.grey} />
                    <Text style={styles.infoText}>Deliver by: {formattedDate}</Text>
                </View>
            </View>

            {/* Description */}
            {request.description && (
            <View style={styles.descriptionContainer}>
                <Text style={styles.description}>{request.description}</Text>
            </View>
            )}

            <View style={styles.postActions}>
                {/* Only show the "Request Delivery" button if the current user is NOT the traveler */}
                {isPotentialTraveler && (
                    <TouchableOpacity 
                    disabled={isLoadingTrips}
                    style={[styles.tabContainer, isLoadingTrips && styles.disabledButton]} 
                    onPress={handleOpenOfferModal}>
                        <Text style={[styles.tabText, styles.tabContainer]}>
                            {isLoadingTrips ? 'Checking Trips...' : 'Offer Delivery'}
                        </Text>
                    </TouchableOpacity>
                )}  
            </View>

            <Modal 
                animationType='fade'
                transparent={true}
                visible={isOfferModalVisible}
                onRequestClose={() => setOfferModalVisible(false)}>

                <Pressable style={styles.modalBackdrop} onPress={() => setOfferModalVisible(false)}>
                    <Pressable style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Proposed a Delivery Fee</Text>
                        <View style={styles.modalInputContainer}>
                            <Text style={styles.dollarSign}>$</Text>
                            <TextInput
                                style={styles.modalInput}
                                placeholder={request.travelerFee.toFixed(2)}
                                placeholderTextColor="#636366"
                                keyboardType="numeric"
                                value={proposedFee}
                                onChangeText={setProposedFee}
                                autoFocus={true}
                            />
                        </View>
                        <TouchableOpacity
                            style={[styles.modalButton, isSubmitting && styles.disabledButton]}
                            onPress={handleSubmitOffer}
                            disabled={isSubmitting}
                        >
                            {isSubmitting
                                ? <ActivityIndicator color="#FFFFFF" />
                                : <Text style={styles.modalButtonText}>Send Offer</Text>
                            }
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>
    </View>
  )
}

