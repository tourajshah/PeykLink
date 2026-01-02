import { Loader } from '@/components/Loader';
import Request from "@/components/Request";
import ReviewItem from '@/components/ReviewItem';
import Trip from "@/components/Trip";
import { api } from '@/convex/_generated/api';
import { useAuth } from "@clerk/clerk-expo";
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import * as Haptics from 'expo-haptics';
import { Image } from "expo-image";
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Easing,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';

// === TRANSLATION IMPORT ===
import { useTranslation } from 'react-i18next';

const { width, height } = Dimensions.get('window');

const formatJoinDate = (timestamp: number, locale: string) => {
  if (!timestamp) return 'Recently';
  const date = new Date(timestamp);
  return date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
};

const PALETTE = {
  background: '#F8FAFC',
  headerGradient: ['#0f172a', '#1e293b'] as const, 
  cardGradient: ['#334155', '#1e293b'] as const,
  primary: '#3B82F6',   
  secondary: '#10B981', 
  gold: '#F59E0B',      
  danger: '#EF4444',
  surface: '#FFFFFF',
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  textLight: '#94A3B8',
  border: '#E2E8F0',
  inputBg: '#F1F5F9',
  overlay: 'rgba(15, 23, 42, 0.6)',
  referralBlue: '#EFF6FF',
};

// --- INTERFACE FOR LIST HEADER PROPS ---
interface ListHeaderProps {
    currentUser: any;
    userStats: any;
    stats: { rating: string | number; orders: number; reliability: string };
    viewMode: 'traveler' | 'requester'; 
    subViewMode: 'active' | 'archived' | 'reviews'; 
    dataCount: number;
    onShare: () => void;
    onSignOut: () => void;
    onCopyUsername: () => void;
    onEditProfile: () => void;
    onOpenWallet: () => void;
    onSettings: () => void; 
    onReferral: () => void; 
    onSupport: () => void;
    onModeSwitch: (mode: 'traveler' | 'requester') => void;
    onSubModeSwitch: (mode: 'active' | 'archived' | 'reviews') => void;
}

// --- EXTRACTED LIST HEADER COMPONENT ---
const ListHeader = ({
    currentUser,
    userStats,
    stats,
    viewMode,
    subViewMode,
    dataCount,
    onShare,
    onSignOut,
    onCopyUsername,
    onEditProfile,
    onOpenWallet,
    onSettings,
    onReferral,
    onSupport,
    onModeSwitch,
    onSubModeSwitch
}: ListHeaderProps) => {
    const { t, i18n } = useTranslation();

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideUpAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
            Animated.spring(slideUpAnim, {
                toValue: 0,
                friction: 6,
                tension: 40,
                useNativeDriver: true,
            })
        ]).start();
    }, []);

    const roleString = viewMode === 'traveler' ? t('profile.tabs.traveler') : t('profile.tabs.shopper');
    const statusString = subViewMode === 'active' ? t('profile.filter.active') : t('profile.filter.history');
    const activeColor = viewMode === 'traveler' ? PALETTE.primary : PALETTE.secondary;

    return (
      <View style={styles.headerContainer}>
        
        {/* === 1. HERO HEADER === */}
        <View style={styles.heroContainer}>
            <LinearGradient
                colors={PALETTE.headerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.heroGradient}
            >
                <View style={styles.textureDots} />

                {/* Navbar */}
                <View style={styles.topBar}>
                    <View style={{flex: 1}}>
                        <Text style={styles.topBarLabel}>{t('profile.title')}</Text>
                        <TouchableOpacity onPress={onCopyUsername} activeOpacity={0.7} style={styles.usernameRow}>
                             <Text style={styles.topBarUsername}>@{currentUser?.username}</Text>
                             <Feather name="copy" size={14} color="rgba(255,255,255,0.4)" style={{marginTop: 2}}/>
                        </TouchableOpacity>
                    </View>
                    
                    <View style={styles.topBarActions}>
                        <TouchableOpacity 
                            style={styles.iconBtnDark} 
                            onPress={onShare}
                        >
                            <Ionicons name="share-social-outline" size={20} color="#FFF" />
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={[styles.iconBtnDark, {backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.2)'}]} 
                            onPress={onSignOut}
                        >
                            <Ionicons name="power" size={20} color="#FF8888" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Profile Identity */}
                <View style={styles.profileRow}>
                    <View style={styles.avatarContainer}>
                        <Image source={currentUser?.imageURL} style={styles.avatar} contentFit="cover" transition={300} />
                        {currentUser?.isVerified && (
                             <View style={styles.badgeWrapper}>
                                 <MaterialCommunityIcons name="check-decagram" size={26} color="#FFF" style={styles.badgeLayerBg} />
                                 <MaterialCommunityIcons name="check-decagram" size={22} color={PALETTE.gold} />
                             </View>
                        )}
                    </View>
                    
                    <View style={styles.profileTexts}>
                        <Text style={styles.profileName} numberOfLines={1} adjustsFontSizeToFit>{currentUser?.fullname}</Text>
                        <Text style={styles.profileJoinDate}>
                            {t('profile.joined', { date: formatJoinDate(userStats.userCreationTime, i18n.language) })}
                        </Text>
                        
                        <TouchableOpacity onPress={onEditProfile} style={styles.editPill}>
                             <Text style={styles.editPillText}>{t('profile.edit_profile')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ADDED: Bio Section */}
                {currentUser?.bio && (
                    <Text style={styles.bioText} numberOfLines={3}>
                        {currentUser.bio}
                    </Text>
                )}

            </LinearGradient>
        </View>

        {/* === 2. DASHBOARD WIDGETS === */}
        <Animated.View style={[styles.dashboardContainer, { opacity: fadeAnim, transform: [{ translateY: slideUpAnim }] }]}>
            
            <Pressable 
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    onOpenWallet();
                }}
                style={({ pressed }) => [
                    styles.walletTouchable,
                    pressed && styles.walletPressed 
                ]}
            >
                <LinearGradient
                    colors={PALETTE.cardGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.walletCard}
                >
                    <View style={styles.walletRowTop}>
                        <View style={{flexDirection:'row', alignItems:'center', gap: 6}}>
                            <Ionicons name="wallet-outline" size={18} color="#94A3B8" />
                            <Text style={styles.walletLabel}>{t('wallet')}</Text>
                        </View>
                        <View style={styles.walletBadge}>
                            <Text style={styles.walletBadgeText}>Basic Level</Text>
                        </View>
                    </View>

                    <View style={styles.walletMain}>
                         <Text style={styles.walletCurrency}>$</Text>
                         <Text style={styles.walletAmount}>{currentUser?.walletBalance?.toFixed(2) || '0.00'}</Text>
                    </View>

                    <View style={styles.walletFooter}>
                        <View>
                            <Text style={styles.walletFooterLabel}>Available</Text>
                            <Text style={styles.walletFooterValue}>${currentUser?.walletBalance?.toFixed(2)}</Text>
                        </View>
                        <View style={styles.dividerVertical} />
                        <View>
                            <Text style={styles.walletFooterLabel}>Escrow/Pending</Text>
                            <Text style={styles.walletFooterValue}>$0.00</Text> 
                        </View>
                         <View style={{flex:1, alignItems:'flex-end'}}>
                             <MaterialCommunityIcons name="arrow-right-circle" size={24} color="rgba(255,255,255,0.3)" />
                         </View>
                    </View>
                </LinearGradient>
            </Pressable>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                    <Text style={styles.statNumber}>{stats?.orders}</Text>
                    <Text style={styles.statLabel}>{viewMode === 'traveler' ? t('profile.stats.deliveries') : t('profile.stats.orders')}</Text>
                </View>
                <View style={styles.statBox}>
                    <View style={{flexDirection:'row', alignItems:'center', gap: 4}}>
                        <Text style={styles.statNumber}>{stats?.rating}</Text>
                        <Ionicons name="star" size={14} color={PALETTE.gold} />
                    </View>
                    <Text style={styles.statLabel}>{t('profile.stats.rating')}</Text>
                </View>
                <View style={styles.statBox}>
                     <Text style={styles.statNumber}>{stats?.reliability}</Text>
                     <Text style={styles.statLabel}>{t('profile.stats.reliability')}</Text>
                </View>
            </View>

        </Animated.View>

        {/* === 3. TABS & FILTERS === */}
        <View style={styles.controlSection}>
            <View style={styles.tabContainer}>
                <TouchableOpacity 
                    style={[styles.tabButton, viewMode === 'traveler' && styles.tabButtonActive, { borderBottomColor: viewMode === 'traveler' ? PALETTE.primary : 'transparent' }]}
                    onPress={() => onModeSwitch('traveler')} 
                >
                    <Text style={[styles.tabText, viewMode === 'traveler' ? { color: PALETTE.primary } : { color: PALETTE.textSecondary }]}>
                        {t('profile.tabs.traveler')}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.tabButton, viewMode === 'requester' && styles.tabButtonActive, { borderBottomColor: viewMode === 'requester' ? PALETTE.secondary : 'transparent' }]}
                    onPress={() => onModeSwitch('requester')}
                >
                    <Text style={[styles.tabText, viewMode === 'requester' ? { color: PALETTE.secondary } : { color: PALETTE.textSecondary }]}>
                        {t('profile.tabs.shopper')}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Centered Filter Pills */}
            <View style={styles.filterRow}>
                {['active', 'archived', 'reviews'].map((fMode) => {
                    const isActive = subViewMode === fMode;
                    const labelKey = fMode === 'active' ? 'active' : (fMode === 'archived' ? 'history' : 'reviews');
                    return (
                        <TouchableOpacity 
                            key={fMode}
                            style={[
                                styles.filterPill, 
                                isActive && { backgroundColor: activeColor, borderColor: activeColor }
                            ]}
                            onPress={() => onSubModeSwitch(fMode as any)}
                        >
                            <Text style={[styles.filterPillText, isActive && { color: '#FFF' }]}>
                                {t(`profile.filter.${labelKey}`)}
                            </Text>
                        </TouchableOpacity>
                    )
                })}
            </View>

             <View style={styles.listHeaderContext}>
                <Text style={styles.contextText}>
                    {subViewMode === 'reviews' 
                        ? t('profile.subtitle.reviews', { count: dataCount || 0, role: roleString })
                        : t('profile.subtitle.items', { count: dataCount || 0, status: statusString })
                    }
                </Text>
            </View>
        </View>

      </View>
    );
};

export default function Profile() {
  const { signOut, userId } = useAuth();
  const { t } = useTranslation();
  
  // Hooks
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isWalletModalVisible, setIsWalletModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // View Modes
  const [viewMode, setViewMode] = useState<'traveler' | 'requester'>('traveler');
  const [subViewMode, setSubViewMode] = useState<'active' | 'archived' | 'reviews'>('active');
  
  const [showToast, setShowToast] = useState(false);
  const toastAnim = useRef(new Animated.Value(0)).current;
  
  // === MODAL ANIMATION REFACTOR ===
  const modalSlide = useRef(new Animated.Value(height)).current;
  const modalBackdropFade = useRef(new Animated.Value(0)).current;

  // Effects
  useEffect(() => {
    Animated.timing(toastAnim, {
        toValue: showToast ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
    }).start();
  }, [showToast]);

  // Logic to Open/Close Modal with Animation
  const openEditModal = () => {
      setIsEditModalVisible(true);
      Animated.parallel([
          Animated.spring(modalSlide, {
              toValue: 0,
              useNativeDriver: true,
              damping: 15,
              stiffness: 100,
              mass: 0.8,
          }),
          Animated.timing(modalBackdropFade, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
          })
      ]).start();
  };

  const closeEditModal = () => {
      Animated.parallel([
          Animated.timing(modalSlide, {
              toValue: height,
              duration: 250,
              easing: Easing.in(Easing.ease),
              useNativeDriver: true,
          }),
          Animated.timing(modalBackdropFade, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
          })
      ]).start(() => {
          setIsEditModalVisible(false);
      });
  };

  // Data Queries
  const currentUser = useQuery(api.users.getUserByClerkId, userId ? { clerkId: userId } : "skip");
  const reviews = useQuery(api.reviews.getUserReviews, currentUser ? { id: currentUser._id } : "skip");
  const userStats = useQuery(api.users.getUserStats, currentUser ? { id: currentUser._id } : 'skip');

  const myActiveTrips = useQuery(api.trips.getMyTrips,{ statuses: ["pending"] });
  const myArchivedTrips = useQuery(api.trips.getMyTrips,{ statuses: ["archived"] });
  const myActiveRequests = useQuery(api.requests.getMyRequests, { statuses: ["pending"] });
  const myArchivedRequests = useQuery(api.requests.getMyRequests, { statuses: ["completed", "archived"] });

  const updateProfile = useMutation(api.users.updateProfile);

  const [editedProfile, setEditedProfile] = useState({ fullname: "", bio: "" });

  useEffect(() => {
    if (currentUser) {
      setEditedProfile({
        fullname: currentUser.fullname || "",
        bio: currentUser.bio || "",
      });
    }
  }, [currentUser]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  }, []);

  if (!currentUser || !userStats || myActiveTrips === undefined || myActiveRequests === undefined) return <Loader />;

  // Data Logic
  type TripType = NonNullable<typeof myActiveTrips>[number];
  type RequestType = NonNullable<typeof myActiveRequests>[number];
  type ReviewType = NonNullable<typeof reviews>[number];
  
  const isTripsActive = viewMode === 'traveler'; 
  
  let dataToRender: (TripType | RequestType | ReviewType)[] = [];
  
  if (subViewMode === 'reviews') {
      const targetRole = viewMode === "traveler" ? "traveler" : "requester"
      dataToRender = (reviews || []).filter((item) => item.review.revieweeRole === targetRole)
  } else if (subViewMode === 'active') {
      dataToRender = isTripsActive ? myActiveTrips : (myActiveRequests || []);
  } else {
      dataToRender = isTripsActive ? (myArchivedTrips || []) : (myArchivedRequests || []);
  }

  const handleModeSwitch = (mode: 'traveler' | 'requester') => {
      if (viewMode !== mode) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setViewMode(mode);
      }
  };

  const handleSubModeSwitch = (mode: 'active' | 'archived' | 'reviews') => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setSubViewMode(mode);
  };

  const handleCopyUsername = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const handleSaveProfile = async () => {
    if (!editedProfile.fullname.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await updateProfile(editedProfile);
    closeEditModal(); 
  };

  const handleShareProfile = async () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      try {
        await Share.share({
            message: `Check out my profile on Grabr! @${currentUser?.username}`,
        });
      } catch (error) { console.log(error); }
  };

  const handleSettings = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log("Nav to settings");
  };

  const handleReferral = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    console.log("Referral trigger");
  };

  const handleSupport = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log("Support trigger");
  };

  const handleSignOut = () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      signOut();
  };

  const getDynamicStats = () => {
    const useTravelerStats = viewMode === 'traveler';
    const rawRating = useTravelerStats ? userStats.userAsTravelerRating : userStats.userAsRequesterRating;
    const rawOrders = useTravelerStats ? userStats.userAsTravelerCompletedOrders : userStats.userAsRequesterCompletedOrders;
    const rawReliability = userStats.userPuncRating; 
    const isNew = !rawOrders || rawOrders === 0;

    return {
        rating: rawRating ? rawRating.toFixed(1) : t('profile.stats.new'),
        orders: rawOrders || 0,
        reliability: isNew ? 'N/A' : (rawReliability ? Math.round(rawReliability) + '%' : '100%') 
    };
  };
  const stats = getDynamicStats();

  const renderFeedItem = ({ item }: { item: any }) => {
    if (subViewMode === 'reviews') return <ReviewItem item={item} />;
    if (viewMode === 'traveler') return <Trip trip={item as TripType} />;
    return <Request request={item as RequestType} />;
  };

  return (
    <View style={styles.container}>
        <FlatList
            style={{flex: 1}}
            data={dataToRender}
            keyExtractor={(item) => {
                if ("review" in item) return item.review._id;
                return item._id
            }}
            renderItem={renderFeedItem}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
                <ListHeader 
                    currentUser={currentUser}
                    userStats={userStats}
                    stats={stats}
                    viewMode={viewMode}
                    subViewMode={subViewMode}
                    dataCount={dataToRender?.length}
                    onShare={handleShareProfile}
                    onSignOut={handleSignOut}
                    onCopyUsername={handleCopyUsername}
                    onEditProfile={openEditModal} 
                    onOpenWallet={() => setIsWalletModalVisible(true)}
                    onSettings={handleSettings}
                    onReferral={handleReferral}
                    onSupport={handleSupport}
                    onModeSwitch={handleModeSwitch}
                    onSubModeSwitch={handleSubModeSwitch}
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
                        <Feather name={subViewMode === 'reviews' ? "message-square" : (subViewMode === 'active' ? "inbox" : "archive")} size={32} color={PALETTE.textSecondary} />
                    </View>
                    <Text style={styles.emptyTitle}>
                        {subViewMode === 'reviews' ? t('profile.empty.no_reviews') : (subViewMode === 'active' ? t('profile.empty.no_active') : t('profile.empty.archive_empty'))}
                    </Text>
                    <Text style={styles.emptyText}>
                        {subViewMode === 'reviews' 
                            ? t('profile.empty.desc_reviews')
                            : (subViewMode === 'active' 
                                ? t('profile.empty.desc_active', { type: viewMode === 'traveler' ? t('trips') : t('requests') })
                                : t('profile.empty.desc_archive'))
                        }
                    </Text>
                </View>
            }
        />

        <Animated.View style={[styles.copyToast, { opacity: toastAnim, transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
            <Feather name="check" size={16} color="#FFF" style={{marginRight: 8}}/>
            <Text style={styles.hintText}>{t('profile.toast.username_copied')}</Text>
        </Animated.View>

        {/* === EDIT PROFILE MODAL === */}
        <Modal 
            visible={isEditModalVisible} 
            transparent={true} 
            animationType="none" 
            onRequestClose={closeEditModal} 
        >
            <TouchableWithoutFeedback onPress={closeEditModal}>
                <Animated.View style={[styles.modalBackdrop, { opacity: modalBackdropFade }]} />
            </TouchableWithoutFeedback>
            
            <Animated.View style={[styles.modalSheet, { transform: [{ translateY: modalSlide }] }]}>
                <View style={styles.dragHandleBar} />

                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{flex:1}}>
                    <View style={styles.sheetHeader}>
                        <Text style={styles.sheetTitle}>{t('profile.modals.edit.title')}</Text>
                        <TouchableOpacity onPress={closeEditModal} style={styles.sheetCloseBtn}>
                             <Ionicons name="close" size={24} color={PALETTE.textPrimary} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView contentContainerStyle={styles.sheetContent}>
                        <View style={styles.editAvatarSection}>
                             <View style={styles.editAvatarWrapper}>
                                 <Image source={currentUser?.imageURL} style={styles.editAvatar} />
                                 <View style={styles.editAvatarOverlay}>
                                     <Ionicons name="camera" size={24} color="#FFF" />
                                 </View>
                             </View>
                             <Text style={styles.changePhotoText}>Tap to change photo</Text>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>{t('profile.modals.edit.fullname_label')}</Text>
                            <TextInput 
                                style={styles.modernInput}
                                value={editedProfile.fullname}
                                onChangeText={(t) => setEditedProfile(p => ({...p, fullname: t}))}
                                placeholder={t('profile.modals.edit.fullname_placeholder')}
                                placeholderTextColor={PALETTE.textLight}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <View style={{flexDirection:'row', justifyContent:'space-between'}}>
                                <Text style={styles.inputLabel}>{t('profile.modals.edit.bio_label')}</Text>
                                <Text style={styles.charCount}>{editedProfile.bio.length}/150</Text>
                            </View>
                            <TextInput 
                                style={[styles.modernInput, styles.textArea]}
                                value={editedProfile.bio}
                                onChangeText={(t) => setEditedProfile(p => ({...p, bio: t}))}
                                multiline
                                maxLength={150}
                                placeholder={t('profile.modals.edit.bio_placeholder')}
                                placeholderTextColor={PALETTE.textLight}
                            />
                        </View>

                        <TouchableOpacity 
                            style={styles.sheetSaveBtn} 
                            onPress={handleSaveProfile} 
                            activeOpacity={0.8}
                        >
                            <Text style={styles.sheetSaveText}>{t('profile.modals.edit.save_btn')}</Text>
                        </TouchableOpacity>

                        <View style={{height: 40}} /> 
                    </ScrollView>
                </KeyboardAvoidingView>
            </Animated.View>
        </Modal>

        {/* WALLET MODAL */}
        <Modal visible={isWalletModalVisible} animationType="fade" transparent={true} onRequestClose={() => setIsWalletModalVisible(false)}>
            <View style={styles.backdrop}>
                <View style={styles.walletModalCard}>
                    <View style={styles.walletModalHeader}>
                          <Text style={styles.walletModalTitle}>{t('profile.modals.wallet.title')}</Text>
                          <TouchableOpacity onPress={() => setIsWalletModalVisible(false)} style={styles.closeCircle}>
                                <Ionicons name="close" size={20} color={PALETTE.textPrimary} />
                          </TouchableOpacity>
                    </View>
                    <View style={styles.emptyWalletContainer}>
                          <View style={styles.emptyWalletIcon}>
                            <Ionicons name="receipt-outline" size={32} color={PALETTE.textLight} />
                          </View>
                          <Text style={styles.emptyWalletTitle}>{t('profile.modals.wallet.empty_title')}</Text>
                          <Text style={styles.emptyWalletText}>{t('profile.modals.wallet.empty_desc')}</Text>
                          <TouchableOpacity style={styles.addFundsButton} disabled>
                            <Text style={styles.addFundsText}>{t('profile.modals.wallet.fund_btn')}</Text>
                          </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
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
  // === 1. HERO HEADER FIXED ===
  heroContainer: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  heroGradient: {
    paddingTop: Platform.OS === 'android' ? 40 : 10,
    paddingHorizontal: 24,
    paddingBottom: 44, 
  },
  textureDots: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'transparent',
      opacity: 0.1,
  },
  topBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 20,
      zIndex: 10,
  },
  topBarLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: '#94A3B8',
      textTransform: 'uppercase',
      letterSpacing: 1.2,
      marginBottom: 2,
  },
  usernameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
  },
  topBarUsername: {
      fontSize: 18,
      fontWeight: '800',
      color: '#F8FAFC',
  },
  topBarActions: {
      flexDirection: 'row',
      gap: 12,
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
  profileRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      marginBottom: 10,
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
      marginBottom: 10,
  },
  editPill: {
      backgroundColor: 'rgba(255,255,255,0.1)',
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 20,
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
  },
  editPillText: {
      color: '#FFF',
      fontSize: 12,
      fontWeight: '600',
  },
  // ADDED: Bio Text Style
  bioText: {
      color: 'rgba(255,255,255,0.8)',
      fontSize: 14,
      lineHeight: 20,
      marginTop: 12,
      fontStyle: 'italic',
  },

  // === 2. DASHBOARD / WIDGETS ===
  dashboardContainer: {
      marginTop: -30, 
      paddingHorizontal: 20,
      gap: 16,
      marginBottom: 24,
  },
  walletTouchable: {
      borderRadius: 24,
      backgroundColor: '#334155', 
      shadowColor: '#0f172a',
      shadowOffset: {width: 0, height: 8},
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 8,
      overflow: 'hidden',
  },
  walletPressed: {
      transform: [{ scale: 0.98 }],
      opacity: 0.95
  },
  walletCard: {
      padding: 20,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
  },
  walletRowTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
  },
  walletLabel: {
      color: '#94A3B8',
      fontSize: 14,
      fontWeight: '600',
      textTransform: 'uppercase',
  },
  walletBadge: {
      backgroundColor: 'rgba(255,255,255,0.1)',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
  },
  walletBadgeText: {
      color: '#FFF',
      fontSize: 10,
      fontWeight: '700',
  },
  walletMain: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 24,
  },
  walletCurrency: {
      color: '#94A3B8',
      fontSize: 20,
      fontWeight: '600',
      marginTop: 4,
      marginRight: 4,
  },
  walletAmount: {
      color: '#FFFFFF',
      fontSize: 36,
      fontWeight: '800',
  },
  walletFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.2)',
      borderRadius: 16,
      padding: 12,
      gap: 12,
  },
  walletFooterLabel: {
      color: '#94A3B8',
      fontSize: 10,
      fontWeight: '600',
      marginBottom: 2,
  },
  walletFooterValue: {
      color: '#FFF',
      fontSize: 14,
      fontWeight: '700',
  },
  dividerVertical: {
      width: 1,
      height: 24,
      backgroundColor: 'rgba(255,255,255,0.1)',
  },

  // Referral Banner
  referralBanner: {
      borderRadius: 20,
      shadowColor: '#3B82F6',
      shadowOffset: {width: 0, height: 4},
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
      backgroundColor: '#EFF6FF',
  },
  referralGradient: {
      padding: 16,
      borderRadius: 20,
  },
  referralContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
  },
  referralIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#FFF',
      alignItems: 'center',
      justifyContent: 'center',
  },
  referralTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: PALETTE.textPrimary,
      marginBottom: 2,
  },
  referralDesc: {
      fontSize: 13,
      color: PALETTE.textSecondary,
  },

  // Stats Grid
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

  // === 3. TABS & FILTERS ===
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
  filterRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 20,
      marginBottom: 8,
  },
  filterPill: {
      paddingVertical: 8,
      paddingHorizontal: 18,
      borderRadius: 20,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#E2E8F0',
  },
  filterPillText: {
      fontSize: 13,
      fontWeight: '600',
      color: PALETTE.textSecondary,
  },
  listHeaderContext: {
      paddingHorizontal: 20,
      marginTop: 8,
      alignItems: 'center',
  },
  contextText: {
      fontSize: 14,
      color: PALETTE.textLight,
      fontWeight: '500',
  },

  // === MODAL STYLES ===
  modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalSheet: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: '85%',
      backgroundColor: '#FFFFFF',
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      shadowColor: '#000',
      shadowOffset: {width: 0, height: -10},
      shadowOpacity: 0.15,
      shadowRadius: 20,
      elevation: 25,
      overflow: 'hidden',
  },
  dragHandleBar: {
      width: 48,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#E2E8F0',
      alignSelf: 'center',
      marginTop: 12,
      marginBottom: 4,
  },
  sheetHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#F1F5F9',
  },
  sheetTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: PALETTE.textPrimary,
  },
  sheetCloseBtn: {
      padding: 8,
      marginRight: -8,
  },
  sheetContent: {
      padding: 24,
  },
  editAvatarSection: {
      alignItems: 'center',
      marginBottom: 32,
  },
  editAvatarWrapper: {
      position: 'relative',
      marginBottom: 12,
  },
  editAvatar: {
      width: 100,
      height: 100,
      borderRadius: 50,
  },
  editAvatarOverlay: {
      position: 'absolute',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.3)',
      borderRadius: 50,
      alignItems: 'center',
      justifyContent: 'center',
  },
  changePhotoText: {
      color: PALETTE.primary,
      fontSize: 14,
      fontWeight: '600',
  },
  inputGroup: {
      marginBottom: 20,
  },
  inputLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: PALETTE.textPrimary,
      marginBottom: 8,
      marginLeft: 4,
  },
  modernInput: {
      backgroundColor: '#F8FAFC',
      borderWidth: 1,
      borderColor: '#E2E8F0',
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: PALETTE.textPrimary,
  },
  textArea: {
      height: 120,
      textAlignVertical: 'top',
      paddingTop: 16,
  },
  charCount: {
      fontSize: 11,
      color: PALETTE.textLight,
      marginBottom: 8,
  },
  sheetSaveBtn: {
      backgroundColor: PALETTE.primary,
      paddingVertical: 16,
      borderRadius: 16,
      alignItems: 'center',
      shadowColor: PALETTE.primary,
      shadowOffset: {width: 0, height: 4},
      shadowOpacity: 0.3,
      shadowRadius: 8,
  },
  sheetSaveText: {
      color: '#FFF',
      fontSize: 16,
      fontWeight: '700',
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
  copyToast: {
      position: 'absolute',
      bottom: 100,
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
  hintText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
  },
  backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
  },
  walletModalCard: {
      backgroundColor: '#FFF',
      width: '100%',
      borderRadius: 24,
      padding: 24,
      maxHeight: 500,
  },
  walletModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24,
  },
  walletModalTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: PALETTE.textPrimary,
  },
  closeCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: '#F1F5F9',
      alignItems: 'center',
      justifyContent: 'center',
  },
  emptyWalletContainer: {
      alignItems: 'center',
      paddingVertical: 32,
  },
  emptyWalletIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: '#F1F5F9',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
  },
  emptyWalletTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: PALETTE.textPrimary,
      marginBottom: 8,
  },
  emptyWalletText: {
      textAlign: 'center',
      color: PALETTE.textSecondary,
      lineHeight: 22,
      marginBottom: 24,
  },
  addFundsButton: {
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 12,
      backgroundColor: '#F1F5F9',
  },
  addFundsText: {
      color: PALETTE.textLight,
      fontWeight: '600',
      fontSize: 14,
  },
});