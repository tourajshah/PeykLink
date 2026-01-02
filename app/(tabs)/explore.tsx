import { Loader } from "@/components/Loader";
import { api } from "@/convex/_generated/api";
import { Feather, FontAwesome5, Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useMutation, useQuery } from "convex/react";
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from "expo-router";
import LottieView from 'lottie-react-native';
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    FlatList,
    ImageBackground,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    UIManager,
    View
} from "react-native";
import CountryFlag from "react-native-country-flag";
import Toast from 'react-native-toast-message';

// === TRANSLATION IMPORT ===
import { useTranslation } from "react-i18next";

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get('window');

// 1. PALETTE
const PALETTE = {
    background: '#F8F9FA', 
    surface: '#FFFFFF',
    shadow: 'rgba(50, 50, 93, 0.15)',
    primary: '#3B82F6', 
    textPrimary: '#111827',
    textSecondary: '#6B7280',
    textTertiary: '#9CA3AF',
    border: '#E5E7EB',
    glassBorder: 'rgba(255, 255, 255, 0.3)',
    softBackground: '#F9FAFB',
    destructive: '#EF4444',
    ratingStar: '#FBBF24',
    secondary: '#10B981', // For Verified Badge
    // Gradients
    primaryGradient: ['#0EA5E9', '#2563EB'] as const,
    greenGradient: ['#10B981', '#059669'] as const,
    pulseGradient: ['#1E293B', '#0F172A'] as const,
    // New: "Travel Fund" Gradient
    fundGradient: ['#059669', '#047857'] as const, 
};

// GREEN PALETTE
const REQUEST_PALETTE = {
    primaryGradient: ['#10B981', '#059669'] as const, 
    primary: '#10B981',
    reward: '#059669', 
    softBg: '#ECFDF5',
};

// 2. COMPONENT: ScaleButton
const ScaleButton = ({ onPress, children, style, disabled = false }: { onPress?: () => void, children: React.ReactNode, style?: any, disabled?: boolean }) => {
    const scaleValue = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        if (disabled || !onPress) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Animated.spring(scaleValue, { 
            toValue: 0.96,
            useNativeDriver: true,
            speed: 40,
            bounciness: 10,
        }).start();
    };

    const handlePressOut = () => {
        if (disabled || !onPress) return;
        Animated.spring(scaleValue, { 
            toValue: 1, 
            useNativeDriver: true,
            speed: 40,
            bounciness: 10,
        }).start();
    };

    return (
        <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} style={style} disabled={disabled}>
            <Animated.View style={{ transform: [{ scale: scaleValue }] }}>{children}</Animated.View>
        </Pressable>
    );
};

// 3. COMPONENT: Job Card (Request)
const JobCard = ({ request }: { request: any }) => {
    const router = useRouter();
    const { t } = useTranslation(); // Translation Hook

    // Modal States
    const [isImageViewVisible, setImageViewVisible] = useState(false);
    const [isOfferModalVisible, setOfferModalVisible] = useState(false);
    const [proposedFee, setProposedFee] = useState(request.travelerFee.toFixed(0));
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Mutation
    const createInitialOffer = useMutation(api.offers.createInitialOffer);
    
    // We need matching trips to make an offer
    const myMatchingTrips = useQuery(api.trips.getMyMatchingTrips, { 
        originCity: request.originCity, 
        destinationCity: request.destinationCity 
    });

    const handleProfileClick = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/user/${request.requester._id}`);
    };

    const handleOpenOfferModal = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (!myMatchingTrips || myMatchingTrips.length === 0) {
            Alert.alert(
                t('alerts.no_matching_trip'),
                t('alerts.need_trip_msg', { origin: request.originCity, dest: request.destinationCity })
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
            Alert.alert(t('alerts.invalid_fee'), t('alerts.enter_valid_amount'));
            setIsSubmitting(false);
            return;
        }

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
                setOfferModalVisible(false);
                Toast.show({
                    type:'info',
                    text1: t('alerts.offer_exists'),
                    text2: t('alerts.offer_exists_msg'),
                });
            }
        } catch (error) {
            Alert.alert(t('alerts.error'), t('alerts.send_offer_error'));
        } finally {
            setIsSubmitting(false);
        }
    };

    // Calculate item total for display
    const itemTotal = request.itemPrice * (request.quantity || 1);
    
    // Format Date for Translations
    const dateFormatted = new Date(request.requiredByDate).toLocaleDateString(undefined, {month:'short', day:'numeric'});

    return (
        <View style={styles.cardContainer}>
             {/* === Image Viewer Modal === */}
             <Modal animationType="fade" transparent={true} visible={isImageViewVisible} onRequestClose={() => setImageViewVisible(false)}>
                <Pressable style={styles.imageViewerBackdrop} onPress={() => setImageViewVisible(false)}>
                    <Image source={{ uri: `https://ts79.space/${request.imageKey}` }} style={styles.imageViewerImage} contentFit="contain" />
                    <TouchableOpacity style={styles.closeImageBtn} onPress={() => setImageViewVisible(false)}>
                        <Feather name="x" size={24} color="white" />
                    </TouchableOpacity>
                </Pressable>
            </Modal>

            {/* === Offer Modal === */}
            <Modal transparent={true} visible={isOfferModalVisible} onRequestClose={() => setOfferModalVisible(false)} animationType="slide">
                <Pressable style={styles.modalCenteredView} onPress={() => setOfferModalVisible(false)}>
                    <Pressable style={styles.modalView}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t('modals.make_offer_title')}</Text>
                            <TouchableOpacity onPress={() => setOfferModalVisible(false)}>
                                <Feather name="x" size={24} color={PALETTE.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        
                        <Text style={styles.modalSubtitle}>{t('modals.make_offer_subtitle')}</Text>

                        <View style={styles.modalInputContainer}>
                            <Text style={styles.dollarSign}>$</Text>
                            <TextInput 
                                style={styles.modalInput} 
                                placeholder={request.travelerFee.toFixed(0)} 
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
                                style={styles.modalSubmitButton}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                            >
                                {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.modalButtonText}>{t('modals.send_offer_btn')}</Text>}
                            </LinearGradient>
                        </Pressable>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Header: User & Status */}
            <View style={styles.cardHeader}>
                <TouchableOpacity style={styles.travelerInfo} onPress={handleProfileClick}>
                      <View style={styles.avatarWrapper}>
                        <Image source={{ uri: request.requester.image }} style={styles.avatar} contentFit="cover" transition={200} />
                        {request.requester.isVerified && (
                            <View style={styles.verifiedBadge}>
                                <Ionicons name="checkmark" size={8} color="#FFF" />
                            </View>
                        )}
                      </View>
                      <View>
                          <Text style={styles.userName}>{request.requester.username}</Text>
                          <Text style={styles.subHeaderText}>{t('cards.requesting_item')}</Text>
                      </View>
                </TouchableOpacity>
                
                <View style={styles.dateBadge}>
                     <Feather name="clock" size={10} color="#C2410C" style={{marginRight: 4}}/>
                    <Text style={styles.dateText}>{t('cards.due_date', { date: dateFormatted })}</Text>
                </View>
            </View>

            {/* Route Visualization */}
            <View style={styles.routeContainer}>
                <View style={styles.locationBlockLeft}>
                    <Text style={styles.cityCode}>{request.originCountryCode}</Text>
                    <Text style={styles.cityName} numberOfLines={1}>{request.originCity}</Text>
                    <View style={styles.flagWrapper}>
                        <CountryFlag isoCode={request.originCountryCode?.toLowerCase() || 'us'} size={12}/>
                    </View>
                </View>

                <View style={styles.routeGraphic}>
                    <View style={styles.dottedLine} />
                    <View style={[styles.lottiePlaceholder, {backgroundColor: '#ECFDF5'}]}>
                        <MaterialCommunityIcons name="shopping-outline" size={18} color={REQUEST_PALETTE.primary} />
                    </View>
                </View>

                <View style={styles.locationBlockRight}>
                    <Text style={styles.cityCode}>{request.destinationCountryCode}</Text>
                    <Text style={styles.cityName} numberOfLines={1}>{request.destinationCity}</Text>
                    <View style={styles.flagWrapper}>
                        <CountryFlag isoCode={request.destinationCountryCode?.toLowerCase() || 'us'} size={12}/>
                    </View>
                </View>
            </View>

            {/* Product Info - CLICKABLE IMAGE */}
            <View style={styles.productContainer}>
                <View style={styles.productTextColumn}>
                    <Text style={styles.productName} numberOfLines={2}>{request.productName}</Text>
                    <Text style={styles.productPrice}>{t('cards.item_price')} <Text style={{fontWeight:'700'}}>${request.itemPrice}</Text></Text>
                </View>
                {request.imageKey && (
                    <TouchableOpacity onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setImageViewVisible(true);
                    }}>
                        <Image 
                            source={{ uri: `https://ts79.space/${request.imageKey}` }} 
                            style={styles.productThumb} 
                            contentFit="cover"
                            transition={200}
                        />
                        <View style={styles.zoomIcon}>
                            <Feather name="maximize-2" size={10} color="#FFF" />
                        </View>
                    </TouchableOpacity>
                )}
            </View>

            {/* Financial Details Block */}
            <View style={styles.detailsBlock}>
                 <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>{t('cards.reward')}</Text>
                    <Text style={[styles.detailValue, { color: REQUEST_PALETTE.reward }]}>${request.travelerFee}</Text>
                 </View>
                 <View style={styles.detailSeparator} />
                 <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>{t('cards.total_cost')}</Text>
                    <Text style={styles.detailValue}>${itemTotal}</Text>
                 </View>
            </View>
            
            {/* Action Button - TRIGGERS OFFER MODAL */}
            <View style={{marginTop: 12}}>
                <ScaleButton onPress={handleOpenOfferModal}>
                    <LinearGradient 
                        colors={REQUEST_PALETTE.primaryGradient}
                        start={{ x: 0, y: 0 }} 
                        end={{ x: 1, y: 1 }} 
                        style={styles.actionButton}
                    >
                        <Text style={styles.actionButtonText}>{t('cards.make_offer')}</Text>
                        <FontAwesome5 name="arrow-right" size={12} color="#FFFFFF" style={{marginLeft: 8}}/>
                    </LinearGradient>
                </ScaleButton>
            </View>
        </View>
    );
};

// 4. COMPONENT: Incoming Traveler Card (Trip)
const IncomingTravelerCard = ({ trip }: { trip: any }) => {
    const router = useRouter();
    const { t } = useTranslation();
    const formattedDate = new Date(trip.arrivalDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

    const handleProfileClick = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/user/${trip.traveler._id}`);
    };

    const handleRequest = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push({ 
            pathname: '/(stack)/orders', 
            params: { tripId: trip._id, travelerId: trip.traveler._id } 
        });
    }

    return (
        <ScaleButton onPress={handleRequest} style={styles.tripCardContainer}>
            {/* Header: User info */}
            <View style={styles.cardHeader}>
                <TouchableOpacity style={styles.travelerInfo} onPress={handleProfileClick}>
                    <View style={styles.avatarWrapper}>
                        <Image source={{ uri: trip.traveler.image }} style={styles.avatar} contentFit="cover" />
                        {trip.traveler.isVerified && (
                            <View style={styles.verifiedBadge}>
                                <Ionicons name="checkmark" size={8} color="#FFF" />
                            </View>
                        )}
                    </View>
                    <View>
                        <Text style={styles.userName}>{trip.traveler.username}</Text>
                        <Text style={styles.subHeaderText}>{trip.airline || t('cards.traveler_default')}</Text>
                    </View>
                </TouchableOpacity>
                
                <View style={[styles.dateBadge, {backgroundColor: '#F1F5F9', borderColor: 'transparent'}]}>
                    <Text style={[styles.dateText, {color: PALETTE.textPrimary, fontWeight:'700'}]}>{formattedDate}</Text>
                </View>
            </View>

            {/* Route Visualization */}
            <View style={styles.routeContainer}>
                <View style={styles.locationBlockLeft}>
                    <Text style={styles.cityCode}>{trip.originCountryCode || 'ORG'}</Text>
                    <Text style={styles.cityName} numberOfLines={1}>{trip.originCity}</Text>
                    <View style={styles.flagWrapper}>
                         <CountryFlag isoCode={trip.originCountryCode?.toLowerCase() || 'us'} size={12} />
                    </View>
                </View>

                {/* Flight Graphic with Lottie */}
                <View style={styles.routeGraphic}>
                     <LottieView 
                        style={{width: 36, height: 36, zIndex: 1, marginBottom: 4}} 
                        source={require('@/assets/animations/airplane.json')} 
                        autoPlay 
                        loop 
                    />
                    <View style={styles.dottedLine} />
                </View>

                <View style={styles.locationBlockRight}>
                    <Text style={styles.cityCode}>{trip.destinationCountryCode || 'DST'}</Text>
                    <Text style={styles.cityName} numberOfLines={1}>{trip.destinationCity}</Text>
                    <View style={styles.flagWrapper}>
                         <CountryFlag isoCode={trip.destinationCountryCode?.toLowerCase() || 'us'} size={12} />
                    </View>
                </View>
            </View>

            {/* Details Block */}
            <View style={styles.detailsBlock}>
                <View style={styles.detailItem}>
                    <MaterialCommunityIcons name="bag-suitcase" size={14} color={PALETTE.primary} />
                    <Text style={[styles.detailValue, {marginLeft: 4}]}>{trip.availableSpace}</Text>
                </View>
                <View style={styles.detailSeparator} />
                <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>
                        <Text style={{color: PALETTE.primary}}>{t('cards.available')} </Text>
                        {t('cards.for_requests')}
                    </Text>
                </View>
            </View>

            {/* Action Button */}
            <View style={{marginTop: 12}}>
                 <View style={[styles.actionButton, {backgroundColor: '#EFF6FF', borderRadius: 14}]}> 
                    <Text style={[styles.actionButtonText, {color: PALETTE.primary}]}>{t('cards.request_delivery')}</Text>
                </View>
            </View>
        </ScaleButton>
    );
};


export default function MatchesScreen() {
    const router = useRouter(); 
    const { t } = useTranslation(); // Translation Hook for Main Screen
    const [refreshing, setRefreshing] = useState(false);

    // Queries
    const recommendedRequests = useQuery(api.requests.getRecommendedRequests);
    const recommendedTrips = useQuery(api.trips.getRecommendedTrips);

    const onRefresh = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 1200);
    }, []);

    // Logic: Calculate total potential earnings
    const totalPotential = useMemo(() => {
        if (!recommendedRequests) return 0;
        return recommendedRequests.reduce((sum, item) => sum + (item.travelerFee || 0), 0);
    }, [recommendedRequests]);

    // Loading State
    if (recommendedRequests === undefined || recommendedTrips === undefined) {
        return <Loader />;
    }

    const hasRequests = recommendedRequests.length > 0;
    const hasTrips = recommendedTrips.length > 0;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
            
            {/* === Background Image for "Exploration" Vibe === */}
            <ImageBackground 
                source={require('@/assets/images/world-map-bg.png')} 
                style={styles.backgroundImage}
                imageStyle={{ opacity: 0.05, resizeMode: 'cover' }}
            >
                <SafeAreaView style={{ flex: 1 }}>
                    
                    {/* === Header === */}
                    <View style={styles.header}>
                        <View style={{flex: 1}}>
                            <Text style={styles.headerTitle}>{t('explore.title')}</Text>
                            <Text style={styles.headerSubtitle}>{t('explore.subtitle')}</Text>
                        </View>
                         <LottieView 
                            source={require('@/assets/animations/globe.json')} 
                            style={{width: 50, height: 50}}
                            autoPlay
                            loop
                        />
                    </View>

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PALETTE.primary} />}
                    >

                        {/* === MARKET PULSE (Renamed to 'Your Network') === */}
                        {/* Fix: Separated shadow container from gradient container to remove white transparency glitch */}
                        <View style={styles.pulseContainer}>
                            <View style={styles.pulseShadowWrapper}>
                                <LinearGradient 
                                    colors={['rgba(30, 41, 59, 0.95)', 'rgba(15, 23, 42, 0.9)']} 
                                    start={{x:0, y:0}} 
                                    end={{x:1, y:1}} 
                                    style={styles.pulseCard}
                                >
                                    <View style={styles.pulseHeader}>
                                        <View style={styles.liveIndicator}>
                                            <View style={styles.liveDot} />
                                            <Text style={styles.liveText}>{t('explore.network')}</Text>
                                        </View>
                                    </View>
                                    
                                    <View style={styles.pulseStatsRow}>
                                        <View style={styles.pulseStatItem}>
                                            <Text style={styles.pulseStatValue}>{recommendedTrips.length}</Text>
                                            <Text style={styles.pulseStatLabel}>{t('explore.matched_travelers')}</Text>
                                        </View>
                                        <View style={styles.pulseDivider} />
                                        <View style={styles.pulseStatItem}>
                                            <Text style={styles.pulseStatValue}>{recommendedRequests.length}</Text>
                                            <Text style={styles.pulseStatLabel}>{t('explore.open_requests')}</Text>
                                        </View>
                                    </View>
                                    
                                    <Ionicons name="globe-outline" size={100} color="rgba(255,255,255,0.05)" style={styles.pulseBgIcon} />
                                </LinearGradient>
                            </View>
                        </View>

                        {/* === Section 1: Incoming Travelers === */}
                        <View style={styles.sectionContainer}>
                             <View style={styles.sectionHeaderRow}>
                                <Text style={styles.sectionTitle}>{t('explore.incoming_travelers')}</Text>
                                {hasTrips && <Text style={styles.sectionCount}>{recommendedTrips.length}</Text>}
                             </View>
                             <Text style={styles.sectionDesc}>{t('explore.incoming_desc')}</Text>

                             {hasTrips ? (
                                <FlatList
                                    horizontal
                                    data={recommendedTrips}
                                    keyExtractor={item => item._id}
                                    renderItem={({ item }) => <IncomingTravelerCard trip={item} />}
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.horizontalList}
                                    snapToInterval={width * 0.75 + 16}
                                    decelerationRate="fast"
                                />
                             ) : (
                                 /* SLEEK MODERN EMPTY STATE FOR TRAVELERS (RADAR STYLE - BLUE) */
                                 <View style={styles.emptyContainer}>
                                     <View style={styles.emptyDashedBox}>
                                         <View style={styles.emptyIconCircle}>
                                             {/* Changed icon color to Blue to distinguish from Green Jobs section */}
                                             <MaterialCommunityIcons name="radar" size={32} color={PALETTE.primary} />
                                         </View>
                                         <Text style={styles.emptyTitle}>{t('empty_states.no_incoming')}</Text>
                                         <Text style={styles.emptySubtitle}>{t('empty_states.scanning_network')}</Text>
                                         
                                         {/* Call To Action - Request Something */}
                                         <TouchableOpacity 
                                            style={styles.emptyMiniBtn} 
                                            onPress={() => {
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                router.push('/(tabs)/create');
                                            }}
                                         >
                                                <Text style={styles.emptyMiniBtnText}>{t('empty_states.create_request')}</Text>
                                                <Feather name="plus" size={14} color={PALETTE.primary} />
                                         </TouchableOpacity>
                                     </View>
                                 </View>
                             )}
                        </View>

                        {/* === Section 2: Delivery Jobs === */}
                        <View style={styles.sectionContainer}>
                            <View style={styles.sectionHeaderRow}>
                                <Text style={styles.sectionTitle}>{t('explore.delivery_jobs')}</Text>
                                {hasRequests && <Text style={styles.sectionCount}>{recommendedRequests.length}</Text>}
                            </View>
                            
                            {/* === TRAVEL FUND (Wallet-Style Redesign) === */}
                            {/* Fix: Uses Deep Green Gradient & Wallet Layout from Profile Screen */}
                            {hasRequests && (
                                <View style={styles.walletStyleCard}>
                                    <LinearGradient 
                                        colors={PALETTE.fundGradient} 
                                        start={{x: 0, y: 0}} 
                                        end={{x: 1, y: 1}} 
                                        style={styles.walletGradientBg}
                                    >
                                        <View style={styles.walletContentRow}>
                                            <View>
                                                <View style={{flexDirection:'row', alignItems:'center', opacity: 0.9, marginBottom: 4}}>
                                                    <Ionicons name="wallet-outline" size={16} color="#FFF" style={{marginRight: 6}}/>
                                                    <Text style={styles.walletLabel}>{t('explore.potential_earnings')}</Text>
                                                </View>
                                                <Text style={styles.walletValue}>${totalPotential}</Text>
                                            </View>
                                            <View style={styles.walletActionBadge}>
                                                <Feather name="arrow-up-right" size={20} color="#047857" />
                                            </View>
                                        </View>
                                    </LinearGradient>
                                </View>
                            )}
                            
                            {!hasRequests && <Text style={styles.sectionDesc}>{t('explore.delivery_desc')}</Text>}

                            {hasRequests ? (
                                <View style={styles.verticalList}>
                                    {recommendedRequests.map(request => (
                                        <JobCard key={request._id} request={request} />
                                    ))}
                                </View>
                            ) : (
                                /* SLEEK MODERN EMPTY STATE FOR JOBS (TICKET STYLE - GREEN) */
                                /* Updated: Uses Green Palette for differentiation */
                                <TouchableOpacity 
                                    style={styles.emptyStateWrapper} 
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                        router.push('/(tabs)/create');
                                    }}
                                    activeOpacity={0.9}
                                >
                                    <LinearGradient colors={['#F0FDF4', '#DCFCE7']} style={styles.emptyStateTicket}>
                                        <View style={styles.ticketLeft}>
                                            <View style={styles.ticketIconBg}>
                                                <MaterialIcons name="add-road" size={28} color={REQUEST_PALETTE.primary} />
                                            </View>
                                        </View>
                                        
                                        <View style={styles.ticketDashedLine} />

                                        <View style={styles.ticketRight}>
                                            <Text style={styles.emptyStateTitle}>{t('empty_states.no_jobs')}</Text>
                                            <Text style={styles.emptyStateDesc}>{t('empty_states.unlock_earnings')}</Text>
                                            
                                            <View style={styles.ticketActionRow}>
                                                <Text style={styles.ticketActionText}>{t('empty_states.create_trip')}</Text>
                                                <Feather name="arrow-right" size={14} color={REQUEST_PALETTE.primary} />
                                            </View>
                                        </View>

                                        {/* CSS Decor: Circles for ticket holes */}
                                        <View style={[styles.ticketHole, styles.ticketHoleTop]} />
                                        <View style={[styles.ticketHole, styles.ticketHoleBottom]} />
                                    </LinearGradient>
                                </TouchableOpacity>
                            )}
                        </View>
                        
                        <View style={{height: 100}} />
                    </ScrollView>
                </SafeAreaView>
            </ImageBackground>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: PALETTE.background },
    backgroundImage: { flex: 1, width: '100%', height: '100%' },

    // Header (Spacing Reduced)
    header: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 0, // Removed bottom padding to pull content up
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: '800',
        color: PALETTE.textPrimary,
        letterSpacing: -1,
    },
    headerSubtitle: {
        fontSize: 15,
        color: PALETTE.textSecondary,
        marginTop: 4,
        fontWeight: '500'
    },

    // PULSE SECTION (Layout Tightened & Fixed Transparency)
    pulseContainer: {
        paddingHorizontal: 20,
        marginBottom: 16, 
        marginTop: 12,    
    },
    // New Wrapper to handle Shadow separately from Gradient
    pulseShadowWrapper: {
        borderRadius: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
        backgroundColor: 'transparent', // Ensures no white background color
    },
    pulseCard: {
        borderRadius: 24,
        padding: 20,
        // Removed shadow from here to prevent white box glitch
        position: 'relative',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)'
    },
    pulseBgIcon: {
        position: 'absolute',
        right: -20,
        bottom: -20,
        opacity: 0.2
    },
    pulseHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    liveIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.4)'
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#10B981',
        marginRight: 6
    },
    liveText: {
        color: '#10B981',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5
    },
    pulseStatsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
    },
    pulseStatItem: {
        alignItems: 'center',
    },
    pulseStatValue: {
        fontSize: 28,
        fontWeight: '800',
        color: '#FFFFFF',
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: {width: 0, height: 2},
        textShadowRadius: 4
    },
    pulseStatLabel: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 4,
        fontWeight: '600'
    },
    pulseDivider: {
        width: 1,
        height: 30,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },

    // Sections
    scrollContent: { paddingBottom: 40 },
    sectionContainer: { marginBottom: 24 }, // Reduced section spacing
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        gap: 8,
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: PALETTE.textPrimary,
    },
    sectionCount: {
        backgroundColor: '#E5E7EB',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        fontSize: 12,
        fontWeight: '700',
        color: PALETTE.textSecondary,
        overflow: 'hidden',
    },
    sectionDesc: {
        fontSize: 14,
        color: PALETTE.textSecondary,
        paddingHorizontal: 20,
        marginBottom: 16,
    },

    // TRAVEL FUND (Wallet Style Harmony)
    walletStyleCard: {
        marginHorizontal: 20,
        marginBottom: 20,
        shadowColor: PALETTE.secondary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 6,
    },
    walletGradientBg: {
        borderRadius: 24,
        padding: 24,
    },
    walletContentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    walletLabel: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
    },
    walletValue: {
        color: '#FFFFFF',
        fontSize: 32,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    walletActionBadge: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.1,
        shadowRadius: 4
    },

    // SHARED CARD STYLES
    cardContainer: {
        backgroundColor: PALETTE.surface,
        borderRadius: 24,
        shadowColor: PALETTE.shadow,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
        elevation: 6,
        borderWidth: 1,
        borderColor: PALETTE.border,
        padding: 16,
    },
    tripCardContainer: {
        backgroundColor: PALETTE.surface,
        borderRadius: 24,
        shadowColor: PALETTE.shadow,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
        elevation: 6,
        borderWidth: 1,
        borderColor: PALETTE.border,
        padding: 16,
        width: width * 0.75, // Horizontal card width
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    travelerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1
    },
    avatarWrapper: {
        position: 'relative',
        marginRight: 10,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: PALETTE.border
    },
    verifiedBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: PALETTE.secondary,
        width: 14,
        height: 14,
        borderRadius: 7,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#FFF',
    },
    userName: {
        fontSize: 15,
        fontWeight: '700',
        color: PALETTE.textPrimary,
        marginBottom: 2
    },
    subHeaderText: {
        fontSize: 12,
        color: PALETTE.textSecondary,
        fontWeight: '500'
    },
    dateBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF7ED',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FFEDD5',
    },
    dateText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#C2410C',
    },

    // ROUTE VISUALIZATION
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
        fontSize: 18,
        fontWeight: '800',
        color: PALETTE.textPrimary,
        letterSpacing: 0.5,
    },
    cityName: {
        fontSize: 12,
        color: PALETTE.textSecondary,
        fontWeight: '500',
        marginTop: 2,
    },
    flagWrapper: {
        marginTop: 4,
        borderRadius: 2,
        overflow: 'hidden',
    },
    routeGraphic: {
        flex: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        height: 36,
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
    lottiePlaceholder: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginBottom: 4
    },

    // DETAILS BLOCK
    detailsBlock: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: PALETTE.softBackground,
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
        justifyContent: 'space-around',
        marginBottom: 4, 
    },
    detailItem: {
        alignItems: 'center',
        flexDirection: 'row',
    },
    detailLabel: {
        fontSize: 10,
        color: PALETTE.textSecondary,
        textTransform: 'uppercase',
        fontWeight: '600',
        marginRight: 6
    },
    detailValue: {
        fontSize: 13,
        fontWeight: '700',
        color: PALETTE.textPrimary,
    },
    detailSeparator: {
        width: 1,
        height: 16,
        backgroundColor: PALETTE.border,
        marginHorizontal: 10
    },

    // PRODUCT SPECIFIC
    productContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    productTextColumn: {
        flex: 1,
        paddingRight: 10,
    },
    productName: {
        fontSize: 15,
        fontWeight: '700',
        color: PALETTE.textPrimary,
        marginBottom: 4,
    },
    productPrice: {
        fontSize: 12,
        color: PALETTE.textSecondary,
    },
    productThumb: {
        width: 50,
        height: 50,
        borderRadius: 10,
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: PALETTE.border
    },
    zoomIcon: {
        position: 'absolute',
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderTopLeftRadius: 6,
        borderBottomRightRadius: 10,
        padding: 2
    },

    // BUTTONS
    actionButton: {
        borderRadius: 14,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    actionButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },

    // LISTS
    horizontalList: {
        paddingHorizontal: 20,
        gap: 16,
        paddingBottom: 10,
    },
    verticalList: {
        paddingHorizontal: 20,
        gap: 16,
    },

    // MODAL STYLES (Added for Offer & Image)
    imageViewerBackdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.9)', justifyContent: 'center', alignItems: 'center' },
    imageViewerImage: { width: '90%', height: '80%', borderRadius: 12 },
    closeImageBtn: { position: 'absolute', top: 50, right: 20, padding: 10 },

    modalCenteredView: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
    modalView: { backgroundColor: PALETTE.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, width: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 5 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 20, fontWeight: '800', color: PALETTE.textPrimary },
    modalSubtitle: { fontSize: 14, color: PALETTE.textSecondary, marginBottom: 20 },
    modalInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 12, paddingHorizontal: 15, marginBottom: 20 },
    dollarSign: { fontSize: 20, color: PALETTE.textPrimary, fontWeight: '700', marginRight: 8 },
    modalInput: { flex: 1, fontSize: 24, fontWeight: '700', color: PALETTE.textPrimary, paddingVertical: 16 },
    modalSubmitButton: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
    modalButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

    // === NEW SLEEK EMPTY STATES STYLES ===
    
    // 1. Radar Style (Incoming Travelers) - BLUE THEME
    emptyContainer: {
        paddingHorizontal: 20,
    },
    emptyDashedBox: {
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        borderStyle: 'dashed',
        backgroundColor: '#F8FAFC', // Very subtle background
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyIconCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: PALETTE.textPrimary,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 13,
        color: PALETTE.textSecondary,
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 20,
        maxWidth: '80%',
    },
    emptyMiniBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    emptyMiniBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: PALETTE.primary,
        marginRight: 6,
    },

    // 2. Ticket Style (Delivery Jobs) - GREEN THEME
    emptyStateWrapper: {
        paddingHorizontal: 20,
    },
    emptyStateTicket: {
        flexDirection: 'row',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#BBF7D0', // Green-200 Border
        overflow: 'hidden',
        height: 120, // Fixed height for ticket look
        alignItems: 'center',
    },
    ticketLeft: {
        width: 80,
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ECFDF5', // Green-50
    },
    ticketIconBg: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    ticketDashedLine: {
        height: '80%',
        width: 1,
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderStyle: 'dashed',
    },
    ticketRight: {
        flex: 1,
        paddingHorizontal: 20,
        justifyContent: 'center',
    },
    emptyStateTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: PALETTE.textPrimary,
        marginBottom: 4,
    },
    emptyStateDesc: {
        fontSize: 12,
        color: PALETTE.textSecondary,
        lineHeight: 18,
        marginBottom: 12,
    },
    ticketActionRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    ticketActionText: {
        fontSize: 12,
        fontWeight: '700',
        color: REQUEST_PALETTE.primary, // Green text
        marginRight: 6,
    },
    // CSS shapes for ticket holes
    ticketHole: {
        position: 'absolute',
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: PALETTE.background, // Match screen background to look like a hole
        borderWidth: 1,
        borderColor: '#BBF7D0', // Match ticket border
        left: 70, // Position over the divider line
        zIndex: 2,
    },
    ticketHoleTop: {
        top: -11, // Half outside
    },
    ticketHoleBottom: {
        bottom: -11, // Half outside
    },
});