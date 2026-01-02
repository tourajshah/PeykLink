// app/(tabs)/inbox.tsx

import { Loader } from "@/components/Loader";
import OfferThreadItem, { OfferThread } from "@/components/Offer";
import ReviewPrompt from "@/components/Review";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import * as Haptics from 'expo-haptics'; // ADDED: Haptics
import React, { useCallback, useMemo, useState } from "react";
import {
    FlatList,
    LayoutAnimation,
    ListRenderItemInfo,
    Platform,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity, // NEW: For smooth transitions
    UIManager // NEW: For Android Animation support
    ,



    View
} from "react-native";

// === TRANSLATION IMPORT ===
import { useTranslation } from "react-i18next";

// --- Colors ---
const COLORS = {
    primary: '#007AFF',
    white: '#FFFFFF',
    black: '#1C1C1E',
    grey: '#8E8E93',
    lightGrey: '#E5E5EA',
    background: '#F2F2F7',
    card: '#FFFFFF',
    searchBg: '#E4E4E9',
    // CHANGED: Removed yellow warning colors for cleaner look
    reviewContainerBg: '#FFFFFF', 
    reviewContainerBorder: '#E5E5EA',
    textSecondary: '#6C6C70', 
};

// NEW: Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function InboxScreen() {
    const { signOut, userId } = useAuth();
    // Initialize Translation
    const { t } = useTranslation();

    const [searchQuery, setSearchQuery] = useState('');
    const [refreshing, setRefreshing] = useState(false); // ADDED: Refresh state

    const currentUser = useQuery(api.users.getUserByClerkId, userId ? { clerkId: userId } : "skip")
    
    // REDESIGN: Simplified tabs to just Direction (All, Sent, Received). 
    // "Paid" and "Completed" are statuses, not inboxes, so they shouldn't be top-level tabs.
    const [activeTab, setActiveTab] = useState<'ByUser' | 'ToUser' | 'all'>('all');

    const threads = useQuery(api.offers.getMyOfferThreads);
    const notReviewedNegotiations = useQuery(api.reviews.getNotReviewedNegotiations)

    // --- Haptic Tab Switcher & Animation ---
    const handleTabChange = (tab: 'ByUser' | 'ToUser' | 'all') => {
        Haptics.selectionAsync(); // Trigger light haptic feedback
        // NEW: Animate the list transition
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setActiveTab(tab);
    };

    // --- Pull to Refresh Logic ---
    const onRefresh = useCallback(() => {
        setRefreshing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // Convex is real-time, so we just simulate a network check for UX
        setTimeout(() => {
            setRefreshing(false);
        }, 1500);
    }, []);

    const filteredThreads = useMemo(() => {
        if (!threads) return [];
        
        let threadsToDisplay = threads;

        // --- 1. Filter by Tab (Simplified) ---
        switch (activeTab) {
            case 'ByUser': // Sent by me
                threadsToDisplay = threads.filter(t => t.negotiation.creatorId === currentUser?._id);
                break;
            case 'ToUser': // Received by me
                threadsToDisplay = threads.filter(t => t.negotiation.creatorId !== currentUser?._id);
                break;
            case 'all':
            default:
                break;
        }

        // --- 2. Filter by Search Query ---
        if (!searchQuery) {
            return threadsToDisplay;
        }

        return threadsToDisplay.filter(thread => {
            const query = searchQuery.toLowerCase();
            // Added optional chaining just in case
            const usernameMatch = thread.otherUser.username?.toLowerCase().includes(query);
            const productMatch = thread.requestDetails.productName.toLowerCase().includes(query);
            return usernameMatch || productMatch;
        });
    }, [threads, searchQuery, activeTab, currentUser]);

    if (threads === undefined) {
        return <Loader />;
    }

    const renderOfferThread = ({ item }: ListRenderItemInfo<OfferThread>) => {
        return <OfferThreadItem thread={item} />;
    };

    // --- Header Component for FlatList ---
    // This allows the Review Prompt to scroll WITH the list, rather than sticking awkwardly on top.
    const ListHeader = () => (
        <View>
            {/* NEW: Informative Status Bar */}
            <View style={styles.statusBar}>
                <Text style={styles.statusText}>
                    {searchQuery 
                        ? (filteredThreads.length === 1 
                            ? t('inbox.status.found_result', { count: filteredThreads.length }) 
                            : t('inbox.status.found_results', { count: filteredThreads.length }))
                        : (filteredThreads.length === 1 
                            ? t('inbox.status.showing_chat', { count: filteredThreads.length })
                            : t('inbox.status.showing_chats', { count: filteredThreads.length }))
                    }
                </Text>
            </View>

            {notReviewedNegotiations && notReviewedNegotiations.length > 0 && (
                <View style={styles.reviewWrapper}>
                    {/* CHANGED: Passed props correctly to the updated component */}
                    <ReviewPrompt 
                        negotiation={notReviewedNegotiations[0]} 
                        travelerName={notReviewedNegotiations[0].travelerName}
                        productName={notReviewedNegotiations[0].productName}
                        productImageUrl={notReviewedNegotiations[0].productImageUrl}
                        userAvatarUrl={notReviewedNegotiations[0].userAvatarUrl}
                    />
                </View>
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.headerContainer}>
                <View style={styles.headerTopRow}>
                    <Text style={styles.headerTitle}>{t('inbox.title')}</Text>
                    
                    {/* REDESIGN: REMOVED Gear Icon as requested. */}
                    {/* If you ever need to add an action here, use this space for a 'Mark all read' or similar */}
                </View>

                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color={COLORS.grey} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder={t('inbox.search_placeholder')}
                        placeholderTextColor={COLORS.grey}
                        value={searchQuery}
                        onChangeText={(text) => {
                            // NEW: Animate search results filtering
                            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                            setSearchQuery(text);
                        }}
                        clearButtonMode="while-editing"
                    />
                </View>

                {/* REDESIGN: Simplified Tabs with Icons for better UX */}
                <View style={styles.tabContainer}>
                    <FilterPill 
                        label={t('inbox.tabs.all')}
                        icon="file-tray-full-outline" // Added Icon
                        isActive={activeTab === 'all'} 
                        onPress={() => handleTabChange('all')} 
                    />
                    <FilterPill 
                        label={t('inbox.tabs.sent')}
                        icon="paper-plane-outline" // Added Icon
                        isActive={activeTab === 'ByUser'} 
                        onPress={() => handleTabChange('ByUser')} 
                    />
                    <FilterPill 
                        label={t('inbox.tabs.received')}
                        icon="download-outline" // Added Icon
                        isActive={activeTab === 'ToUser'} 
                        onPress={() => handleTabChange('ToUser')} 
                    />
                </View>
            </View>

            <FlatList
                data={filteredThreads}
                renderItem={renderOfferThread}
                keyExtractor={(item) => item.negotiation._id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContainer}
                ListHeaderComponent={ListHeader} // Moved ReviewPrompt here
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
                }
                ListEmptyComponent={
                    <NoItemsFound 
                        hasSearch={searchQuery.length > 0} 
                        activeTab={activeTab} 
                        t={t}
                    />
                }
            />
        </View>
    );
}

// --- Sub-components ---

// UPDATED: FilterPill now accepts an icon for better visual cues
const FilterPill = ({ label, icon, isActive, onPress }: { label: string, icon: keyof typeof Ionicons.glyphMap, isActive: boolean, onPress: () => void }) => (
    <TouchableOpacity 
        style={[styles.filterPill, isActive && styles.filterPillActive]} 
        onPress={onPress}
        activeOpacity={0.7}
    >
        <Ionicons 
            name={icon} 
            size={14} 
            color={isActive ? COLORS.white : COLORS.grey} 
            style={{ marginRight: 6 }}
        />
        <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
            {label}
        </Text>
    </TouchableOpacity>
);

const NoItemsFound = ({ hasSearch, activeTab, t }: { hasSearch: boolean, activeTab: string, t: any }) => {
    let message = t('inbox.empty.no_messages');
    let subMessage = t('inbox.empty.no_new_negotiations');

    if (hasSearch) {
        message = t('inbox.empty.no_results');
        subMessage = t('inbox.empty.adjust_search');
    } else if (activeTab === 'ByUser') {
        message = t('inbox.empty.no_sent');
        subMessage = t('inbox.empty.no_sent_desc');
    } else if (activeTab === 'ToUser') {
        message = t('inbox.empty.no_received');
        subMessage = t('inbox.empty.no_received_desc');
    }

    return (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
                <Ionicons 
                    name={hasSearch ? "search" : "chatbubble-ellipses-outline"} 
                    size={48} 
                    color={COLORS.primary} 
                />
            </View>
            <Text style={styles.emptyText}>{message}</Text>
            <Text style={styles.emptySubtext}>{subMessage}</Text>
        </View>
    );
};

// --- Styles ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    // Header
    headerContainer: {
        backgroundColor: COLORS.card,
        paddingTop: Platform.OS === 'android' ? 12 : 12,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.lightGrey,
        // NEW: Subtle shadow for depth
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
        zIndex: 10,
    },
    headerTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    headerTitle: {
        fontSize: 34,
        fontWeight: '800',
        color: COLORS.black,
        letterSpacing: -0.5,
    },
    // Search
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.searchBg,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 40,
        marginHorizontal: 16,
        marginBottom: 16,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        height: '100%',
        fontSize: 16,
        color: COLORS.black,
    },
    // Filter Tabs
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        gap: 10,
    },
    filterPill: {
        flexDirection: 'row', // NEW: For Icon + Text
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    filterPillActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    filterPillText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.grey,
    },
    filterPillTextActive: {
        color: COLORS.white,
    },
    // NEW: Status Bar Styles
    statusBar: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    statusText: {
        fontSize: 13,
        color: COLORS.textSecondary,
        fontWeight: '500',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    // Review Prompt Wrapper
    reviewWrapper: {
        marginHorizontal: 16,
        marginBottom: 8,
        // CHANGED: Removed yellow warning style for a cleaner card look that matches ReviewPrompt
        backgroundColor: COLORS.reviewContainerBg,
        borderRadius: 20, // Matches ReviewPrompt radius
        borderWidth: 1,
        borderColor: COLORS.reviewContainerBorder,
        // Added shadow to match cards
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
        overflow: 'hidden',
    },
    listContainer: {
        paddingBottom: 100, 
    },
    // Empty State
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
        marginTop: 80,
    },
    emptyIconCircle: { // NEW: Circle bg for icon
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#E5F1FF', // Light blue
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    emptyText: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.black,
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 15,
        color: COLORS.grey,
        textAlign: 'center',
        lineHeight: 22,
    },
});