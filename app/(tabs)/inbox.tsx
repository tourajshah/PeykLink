// app/(tabs)/inbox.tsx

import { Loader } from "@/components/Loader";
import OfferThreadItem, { OfferThread } from "@/components/Offer";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import React, { useMemo, useState } from "react";
import { FlatList, ListRenderItemInfo, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

// --- All Constants and Styles are in this file ---
const COLORS = {
    primary: '#0A84FF',
    white: '#FFFFFF',
    black: '#000000',
    grey: '#8E8E93',
    lightGrey: '#D1D1D6',
    background: '#F2F2F7',
    card: '#FFFFFF',
};

export default function InboxScreen() {
    const { signOut, userId } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const currentUser = useQuery(api.users.getUserByClerkId, userId ? { clerkId: userId } : "skip")
    
    
    // FIX 1: Changed the types to match the backend arguments ('ByUser', 'ToUser').
    const [activeTab, setActiveTab] = useState<'ByUser' | 'ToUser' | 'all'>('all');

    // FIX 2: Replaced the three separate queries with one dynamic query.
    // This single hook will automatically re-fetch data whenever 'activeTab' changes.
    const threads = useQuery(api.offers.getMyOfferThreads);

    

    // This hook efficiently filters the list only when the data or search query changes.
    const filteredThreads = useMemo(() => {
        // Use the new 'threads' variable which holds the data for the active tab.
        if (!threads) {
            return [];
        }
        
        let threadsToDisplay = threads

        if (activeTab === 'ByUser') {
            threadsToDisplay = threads.filter(t => t.negotiation.creatorId === currentUser?._id)
        } else if (activeTab == "ToUser") {
            threadsToDisplay = threads.filter(t => t.negotiation.creatorId !== currentUser?._id)
        }

        if (!searchQuery) {
            return threadsToDisplay;
        }

        return threadsToDisplay.filter(thread => {
            const query = searchQuery.toLowerCase();
            const usernameMatch = thread.otherUser.username?.toLowerCase().includes(query);
            const productMatch = thread.requestDetails.productName.toLowerCase().includes(query);
            return usernameMatch || productMatch;
        });
    }, [threads, searchQuery, activeTab, currentUser]);

    if (threads === undefined) {
        return <Loader />;
    }

    type OfferThreadType = (typeof filteredThreads)[number];

    const renderOfferThread = ({ item }: ListRenderItemInfo<OfferThread>) => {
        return <OfferThreadItem thread={item} />;
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Inbox</Text>
                <TouchableOpacity onPress={() => signOut()}>
                    <Ionicons name="log-out-outline" size={26} color={COLORS.primary} />
                </TouchableOpacity>
            </View>
            
            {/* NEW: Tab container and buttons */}
            <View style={styles.tabContainer}>
                
                <TouchableOpacity 
                    style={[styles.tab, activeTab === 'ByUser' && styles.activeTab]} 
                    onPress={() => setActiveTab('ByUser')}
                >
                    <Text style={[styles.tabText, activeTab === 'ByUser' && styles.activeTabText]}>By Me</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.tab, activeTab === 'all' && styles.activeTab]} 
                    onPress={() => setActiveTab('all')}
                >
                    <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>All</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.tab, activeTab === 'ToUser' && styles.activeTab]} 
                    onPress={() => setActiveTab('ToUser')}
                >
                    <Text style={[styles.tabText, activeTab === 'ToUser' && styles.activeTabText]}>To Me</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={COLORS.grey} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by user or product..."
                    placeholderTextColor={COLORS.grey}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            <FlatList
                data={filteredThreads}
                renderItem={renderOfferThread}
                keyExtractor={(item) => item.negotiation._id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={<NoItemsFound hasSearch={searchQuery.length > 0} />}
            />
        </View>
    );
}

const NoItemsFound = ({ hasSearch }: { hasSearch: boolean }) => (
    <View style={styles.emptyContainer}>
        <Ionicons 
            name={hasSearch ? "search-circle-outline" : "chatbubbles-outline"} 
            size={80} 
            color={COLORS.lightGrey} 
        />
        <Text style={styles.emptyText}>
            {hasSearch ? "No Results Found" : "Your Inbox is Empty"}
        </Text>
        <Text style={styles.emptySubtext}>
            {hasSearch ? "Try searching for something else." : "New offers from travelers will appear here."}
        </Text>
    </View>
);

// --- All Styles are defined below ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'android' ? 40 : 50,
        paddingBottom: 10,
        backgroundColor: COLORS.card,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: COLORS.lightGrey,
    },
    headerTitle: {
        fontSize: 34,
        fontWeight: 'bold',
        color: COLORS.black,
    },
    // REPLACED: Modern Segmented Control Styles
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#EFEFF4',
        borderRadius: 10,
        marginHorizontal: 16,
        marginTop: 10,
        padding: 4,
        justifyContent: 'space-between',
    },
    tab: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    activeTab: {
        backgroundColor: COLORS.white,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    tabText: {
        color: COLORS.grey,
        fontWeight: '600',
        fontSize: 15,
    },
    activeTabText: {
        color: COLORS.primary,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.card,
        borderRadius: 10,
        marginHorizontal: 16,
        marginTop: 10,
        paddingHorizontal: 10,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        height: 44,
        fontSize: 17,
        color: COLORS.black,
    },
    listContainer: {
        paddingTop: 16,
        paddingBottom: 60,
    },
    emptyContainer: {
        flex: 1,
        height: 500,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    emptyText: {
        fontSize: 22,
        fontWeight: 'bold',
        color: COLORS.black,
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 16,
        color: COLORS.grey,
        marginTop: 8,
        textAlign: 'center',
    },
});
