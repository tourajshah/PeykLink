import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { styles } from '@/styles/feed.styles';
import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import AntDesign from '@expo/vector-icons/AntDesign';
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


type RequestProps = {
    request:{
        _id: Id<"requests">;
        _creationTime: number;
        description?: string;
        productURL?: string;
        productWeight?: string;
        originCity?: string;
        destinationCity?: string;
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

    const deleteRequest = useMutation(api.requests.deleteRequest)

    const handleDeleteRequest = async () => {
        try {
            await deleteRequest({ requestId: request._id })
        } catch (error) {
            alert("Error deleting the request")
        }
    }


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
                <TouchableOpacity style={styles.tabContainer} onPress={() => alert('clicked')}>
                    <Text style={[styles.tabText, styles.tabContainer]}>Send Offer</Text>
                </TouchableOpacity>
            </View>
    
    </View>
  )
}