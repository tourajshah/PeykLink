import { Loader } from '@/components/Loader';
import ReviewItem from '@/components/ReviewItem';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'; // Added MaterialCommunityIcons
import { useQuery } from 'convex/react';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient'; // Added LinearGradient
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    FlatList,
    Platform,
    RefreshControl,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

// === TRANSLATION IMPORT ===
// Assuming you have this set up, otherwise we use hardcoded strings for now
// import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

const formatJoinDate = (timestamp: number) => {
  if (!timestamp) return 'Recently';
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

// Updated Palette to match Dashboard
const PALETTE = {
  background: '#F8FAFC',
  headerGradient: ['#0f172a', '#1e293b'] as const, 
  primary: '#3B82F6',   
  secondary: '#10B981', 
  gold: '#F59E0B',      
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  textLight: '#94A3B8',
  border: '#E2E8F0',
  surface: '#FFFFFF',
  shadow: 'rgba(100, 100, 111, 0.08)',
};

// --- INTERFACE FOR LIST HEADER PROPS ---
interface ListHeaderProps {
    profile: any;
    userStats: any;
    stats: { rating: string | number; orders: number; reliability: string } | null;
    viewMode: 'traveler' | 'requester';
    reviewCount: number;
    onBack: () => void;
    onShare: () => void;
    onCopyUsername: () => void;
    onModeSwitch: (mode: 'traveler' | 'requester') => void;
}

// --- EXTRACTED LIST HEADER COMPONENT ---
const ListHeader = ({
    profile,
    userStats,
    stats,
    viewMode,
    reviewCount,
    onBack,
    onShare,
    onCopyUsername,
    onModeSwitch
}: ListHeaderProps) => {
    
    // Animation refs (Simple fade in for entrance)
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
        }).start();
    }, []);

    return (
        <View style={styles.headerContainer}>
            
            {/* 1. HERO HEADER (Dark Gradient) */}
            <View style={styles.heroContainer}>
                <LinearGradient
                    colors={PALETTE.headerGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={styles.heroGradient}
                >
                    <View style={styles.textureDots} />

                    {/* TOP BAR */}
                    <View style={styles.topBar}>
                        <TouchableOpacity 
                            style={styles.iconBtnDark} 
                            onPress={onBack}
                        >
                            <Ionicons name="arrow-back" size={20} color="#FFF" />
                        </TouchableOpacity>
                        
                        <Text style={styles.topBarTitle}>PROFILE</Text>

                        <TouchableOpacity 
                            style={styles.iconBtnDark} 
                            onPress={onShare}
                        >
                            <Ionicons name="share-social-outline" size={20} color="#FFF" />
                        </TouchableOpacity>
                    </View>

                    {/* IDENTITY SECTION */}
                    <View style={styles.profileRow}>
                        <View style={styles.avatarContainer}>
                            <Image source={profile.imageURL} style={styles.avatar} contentFit="cover" transition={300} />
                            {profile.isVerified && (
                                /* Layered Badge for Border Effect */
                                <View style={styles.badgeWrapper}>
                                    <MaterialCommunityIcons name="check-decagram" size={26} color="#FFF" style={styles.badgeLayerBg} />
                                    <MaterialCommunityIcons name="check-decagram" size={22} color={PALETTE.gold} />
                                </View>
                            )}
                        </View>
                        
                        <View style={styles.profileTexts}>
                            <Text style={styles.profileName} numberOfLines={1} adjustsFontSizeToFit>
                                {profile.fullname}
                            </Text>
                            <Text style={styles.profileJoinDate}>
                                Joined {formatJoinDate(userStats.userCreationTime)}
                            </Text>
                            
                            <TouchableOpacity onPress={onCopyUsername} style={styles.usernamePill}>
                                <Text style={styles.usernameText}>@{profile.username}</Text>
                                <Feather name="copy" size={12} color="rgba(255,255,255,0.6)" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Bio (Optional display inside header for clean look) */}
                    {profile.bio && (
                        <Text style={styles.bioText} numberOfLines={2}>
                            {profile.bio}
                        </Text>
                    )}

                </LinearGradient>
            </View>

            {/* 2. STATS DASHBOARD (Floating Grid) */}
            <Animated.View style={[styles.dashboardContainer, { opacity: fadeAnim }]}>
                <View style={styles.statsGrid}>
                    <View style={styles.statBox}>
                        <Text style={styles.statNumber}>{stats?.orders}</Text>
                        <Text style={styles.statLabel}>{viewMode === 'traveler' ? 'Deliveries' : 'Orders'}</Text>
                    </View>
                    <View style={styles.statBox}>
                        <View style={{flexDirection:'row', alignItems:'center', gap: 4}}>
                            <Text style={styles.statNumber}>{stats?.rating}</Text>
                            {stats?.rating !== 'New' && <Ionicons name="star" size={14} color={PALETTE.gold} />}
                        </View>
                        <Text style={styles.statLabel}>Rating</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statNumber}>{stats?.reliability}</Text>
                        <Text style={styles.statLabel}>Reliability</Text>
                    </View>
                </View>
            </Animated.View>

            {/* 3. TABS (Traveler | Shopper) */}
            <View style={styles.controlSection}>
                <View style={styles.tabContainer}>
                    <TouchableOpacity 
                        style={[
                            styles.tabButton, 
                            viewMode === 'traveler' && styles.tabButtonActive,
                            { borderBottomColor: viewMode === 'traveler' ? PALETTE.primary : 'transparent' }
                        ]}
                        onPress={() => onModeSwitch('traveler')} 
                    >
                        <Text style={[
                            styles.tabText, 
                            viewMode === 'traveler' ? { color: PALETTE.primary } : { color: PALETTE.textSecondary }
                        ]}>
                            Traveler
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[
                            styles.tabButton, 
                            viewMode === 'requester' && styles.tabButtonActive,
                            { borderBottomColor: viewMode === 'requester' ? PALETTE.secondary : 'transparent' }
                        ]}
                        onPress={() => onModeSwitch('requester')}
                    >
                        <Text style={[
                            styles.tabText, 
                            viewMode === 'requester' ? { color: PALETTE.secondary } : { color: PALETTE.textSecondary }
                        ]}>
                            Shopper
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Subtitle / Count */}
                <View style={styles.listHeaderContext}>
                    <Text style={styles.contextText}>
                        {reviewCount} reviews as {viewMode === 'traveler' ? 'traveler' : 'shopper'}
                    </Text>
                </View>
            </View>
        </View>
    );
};

export default function UserProfileScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    
    // --- HOOKS START ---
    const [viewMode, setViewMode] = useState<'traveler' | 'requester'>('traveler');
    const [refreshing, setRefreshing] = useState(false);
    
    // Toast State for Copy Username
    const [showToast, setShowToast] = useState(false);
    const toastAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(toastAnim, {
            toValue: showToast ? 1 : 0,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [showToast]);

    const profile = useQuery(api.users.getUserProfile, { id: id as Id<"users"> });
    const userStats = useQuery(api.users.getUserStats, profile ? { id: profile._id } : 'skip');
    const reviews = useQuery(api.reviews.getUserReviews, profile ? { id: profile._id } : 'skip');

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setTimeout(() => {
            setRefreshing(false);
        }, 1500);
    }, []);

    // --- LOADING CHECK ---
    if (!profile || !userStats || !reviews) return <Loader />;

    // --- LOGIC ---
    // Filter reviews based on the active tab (Traveler vs Shopper)
    const targetRole = viewMode === 'traveler' ? 'traveler' : 'requester';
    
    const filteredReviews = reviews.filter((item) => item.review.revieweeRole === targetRole);

    // --- HANDLERS ---

    const handleModeSwitch = (mode: 'traveler' | 'requester') => {
        if (viewMode !== mode) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setViewMode(mode);
        }
    };

    const handleShareProfile = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
          await Share.share({
              message: `Check out ${profile?.fullname}'s profile on GrabrApp!`,
          });
        } catch (error) {
            console.log(error);
        }
    };

    const handleCopyUsername = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
    };

    // --- STATS LOGIC ---
    const getDynamicStats = () => {
        if (!userStats) return null;
    
        const isTraveler = viewMode === 'traveler';
        const rawRating = isTraveler ? userStats.userAsTravelerRating : userStats.userAsRequesterRating;
        const rawOrders = isTraveler ? userStats.userAsTravelerCompletedOrders : userStats.userAsRequesterCompletedOrders;
        const rawReliability = userStats.userPuncRating; 
    
        const isNew = !rawOrders || rawOrders === 0;
    
        return {
            rating: rawRating ? rawRating.toFixed(1) : 'New',
            orders: rawOrders || 0,
            reliability: isNew ? 'N/A' : (rawReliability ? Math.round(rawReliability) + '%' : '100%') 
        };
    };

    const stats = getDynamicStats();

    return (
        <View style={styles.container}>
            <FlatList
                data={filteredReviews} 
                keyExtractor={(item) => item.review._id}
                renderItem={({ item }) => <ReviewItem item={item} />}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                    <ListHeader 
                        profile={profile}
                        userStats={userStats}
                        stats={stats}
                        viewMode={viewMode}
                        reviewCount={filteredReviews.length} 
                        onBack={() => router.back()}
                        onShare={handleShareProfile}
                        onCopyUsername={handleCopyUsername}
                        onModeSwitch={handleModeSwitch}
                    />
                }
                ListFooterComponent={<View style={{height: 100}} />} 
                ItemSeparatorComponent={() => <View style={{height: 16}} />}
                contentContainerStyle={{ paddingBottom: 40 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PALETTE.textSecondary} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconBg}>
                            <Ionicons name="chatbubble-ellipses-outline" size={32} color={PALETTE.textSecondary} />
                        </View>
                        <Text style={styles.emptyTitle}>No Reviews Yet</Text>
                        <Text style={styles.emptyText}>
                            {profile.fullname} hasn't received any reviews as a {viewMode === 'traveler' ? 'traveler' : 'shopper'} yet.
                        </Text>
                    </View>
                }
            />

            {/* COPIED TOAST */}
            <Animated.View style={[styles.toast, { opacity: toastAnim, transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
                <Feather name="check" size={16} color="#FFF" style={{marginRight: 8}}/>
                <Text style={styles.toastText}>Username Copied</Text>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerContainer: {
    marginBottom: 8,
  },
  // === HERO HEADER (Matched to Dashboard) ===
  heroContainer: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  heroGradient: {
    paddingTop: Platform.OS === 'android' ? 40 : 10,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  textureDots: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'transparent',
      opacity: 0.1,
  },
  topBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
      zIndex: 10,
  },
  topBarTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: '#94A3B8',
      textTransform: 'uppercase',
      letterSpacing: 1.2,
  },
  iconBtnDark: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.1)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)',
  },
  
  // === PROFILE IDENTITY ===
  profileRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      marginBottom: 16,
  },
  avatarContainer: {
      position: 'relative',
  },
  avatar: {
      width: 84,
      height: 84,
      borderRadius: 42,
      borderWidth: 3,
      borderColor: 'rgba(255,255,255,0.1)',
  },
  badgeWrapper: {
      position: 'absolute',
      bottom: -4,
      right: -4,
      width: 26,
      height: 26,
      justifyContent: 'center',
      alignItems: 'center',
  },
  badgeLayerBg: {
      position: 'absolute',
      // Background layer
  },
  profileTexts: {
      flex: 1,
      justifyContent: 'center',
  },
  profileName: {
      fontSize: 22,
      fontWeight: '700',
      color: '#FFFFFF',
      marginBottom: 4,
      letterSpacing: 0.3,
  },
  profileJoinDate: {
      fontSize: 13,
      color: '#94A3B8',
      marginBottom: 8,
  },
  usernamePill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.1)',
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 12,
      alignSelf: 'flex-start',
      gap: 6,
  },
  usernameText: {
      color: '#FFF',
      fontSize: 12,
      fontWeight: '600',
  },
  bioText: {
      color: 'rgba(255,255,255,0.8)',
      fontSize: 14,
      lineHeight: 20,
      marginTop: 4,
      fontStyle: 'italic',
  },

  // === DASHBOARD STATS (Floating Grid) ===
  dashboardContainer: {
      marginTop: -30, 
      paddingHorizontal: 20,
      marginBottom: 24,
  },
  statsGrid: {
      flexDirection: 'row',
      gap: 12,
  },
  statBox: {
      flex: 1,
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: 12,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#64748B',
      shadowOffset: {width: 0, height: 2},
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
  },
  statNumber: {
      fontSize: 18,
      fontWeight: '800',
      color: PALETTE.textPrimary,
      marginBottom: 4,
  },
  statLabel: {
      fontSize: 10,
      color: PALETTE.textSecondary,
      fontWeight: '600',
      textTransform: 'uppercase',
      textAlign: 'center',
  },

  // === TABS ===
  controlSection: {
      paddingHorizontal: 0,
  },
  tabContainer: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#E2E8F0',
      marginBottom: 16,
  },
  tabButton: {
      flex: 1, 
      alignItems: 'center',
      paddingVertical: 14,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
  },
  tabButtonActive: {
      // Color handled inline
  },
  tabText: {
      fontSize: 15,
      fontWeight: '600',
  },
  listHeaderContext: {
      paddingHorizontal: 20,
      alignItems: 'center',
      marginBottom: 8,
  },
  contextText: {
      fontSize: 14,
      color: PALETTE.textLight,
      fontWeight: '500',
  },

  // === MISC ===
  emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
      marginHorizontal: 20,
      marginTop: 20,
  },
  emptyIconBg: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: '#F1F5F9',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
  },
  emptyTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: PALETTE.textPrimary,
      marginBottom: 8,
  },
  emptyText: {
      fontSize: 15,
      color: PALETTE.textSecondary,
      textAlign: 'center',
      maxWidth: 280,
      lineHeight: 22,
  },
  toast: {
      position: 'absolute',
      bottom: 40,
      alignSelf: 'center',
      backgroundColor: '#1E293B',
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 24,
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 2},
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 6,
      zIndex: 100,
  },
  toastText: {
      color: '#FFF',
      fontWeight: '600',
      fontSize: 14,
  }
});