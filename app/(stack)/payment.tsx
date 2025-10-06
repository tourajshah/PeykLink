// app/(stack)/payment.tsx
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

export default function PaymentScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const negotiationId = params.negotiationId as Id<"negotiations">;
    
    const [isProcessing, setIsProcessing] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [deliveryCode, setDeliveryCode] = useState<string>('');
    
    const createOrder = useMutation(api.orders.createOrder);
    
    // Fetch negotiation details (you'll need to create this query)
    const negotiationDetails = useQuery(
        api.offers.getOfferThreadDetails, 
        { negotiationId }
    );
    
    if (!negotiationDetails) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }
    
    const { negotiation, request, traveler } = negotiationDetails;

    if (!negotiation || !request || !traveler) {
        return (
            <View style={styles.loadingContainer}>
                <Ionicons name="alert-circle-outline" size={60} color={COLORS.primary} />
                <Text>Error in payment.</Text>
            </View>
        );      
    }

    const itemTotal = request.itemPrice * request.quantity;
    const deliveryFee = negotiation.proposedFee;
    const total = itemTotal + deliveryFee;
    
    const handlePayment = async () => {
        try {
            setIsProcessing(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            
            // Simulate payment processing delay
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Create order (mock payment)
            const result = await createOrder({ negotiationId });
            
            // Success!
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setDeliveryCode(result.deliveryCode);
            setShowSuccessModal(true);
            
        } catch (error: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert(
                "Payment Failed",
                error.message || "Could not process payment. Please try again.",
                [{ text: "OK" }]
            );
            console.error(error);
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleSuccessClose = () => {
        setShowSuccessModal(false);
        // Navigate to order/chat screen
        router.replace({
            pathname: '/(stack)/offers',
            params: { id: negotiationId }
        });
    };
    
    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity 
                    onPress={() => router.back()} 
                    disabled={isProcessing}
                >
                    <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Payment</Text>
                <View style={{ width: 24 }} />
            </View>
            
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Order Summary Card */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Order Summary</Text>
                    
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>
                            {request.productName}
                        </Text>
                        <Text style={styles.summaryValue}>
                            ${request.itemPrice.toFixed(2)}
                        </Text>
                    </View>
                    
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>
                            Quantity: {request.quantity}
                        </Text>
                        <Text style={styles.summaryValue}>
                            ${itemTotal.toFixed(2)}
                        </Text>
                    </View>
                    
                    <View style={styles.separator} />
                    
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Delivery Fee</Text>
                        <Text style={styles.summaryValue}>
                            ${deliveryFee.toFixed(2)}
                        </Text>
                    </View>
                    
                    <View style={styles.separator} />
                    
                    <View style={styles.summaryRow}>
                        <Text style={styles.totalLabel}>Total</Text>
                        <Text style={styles.totalValue}>
                            ${total.toFixed(2)}
                        </Text>
                    </View>
                </View>
                
                {/* Traveler Info Card */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Delivery By</Text>
                    <View style={styles.travelerInfo}>
                        <Ionicons name="person-circle" size={40} color={COLORS.primary} />
                        <View style={styles.travelerDetails}>
                            <Text style={styles.travelerName}>{traveler.username}</Text>
                            <Text style={styles.travelerRating}>⭐ 4.8 (12 reviews)</Text>
                        </View>
                    </View>
                </View>
                
                {/* Payment Method Card (Mock) */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Payment Method</Text>
                    <View style={styles.paymentMethod}>
                        <View style={styles.cardIcon}>
                            <Ionicons name="card" size={24} color={COLORS.primary} />
                        </View>
                        <View style={styles.cardDetails}>
                            <Text style={styles.cardType}>Visa •••• 4242</Text>
                            <Text style={styles.cardSubtext}>Expires 12/25</Text>
                        </View>
                        <TouchableOpacity disabled={isProcessing}>
                            <Text style={styles.changeText}>Change</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                
                {/* Security Notice */}
                <View style={styles.securityNotice}>
                    <Ionicons name="shield-checkmark" size={20} color={COLORS.green} />
                    <Text style={styles.securityText}>
                        Your payment is held securely until delivery is confirmed
                    </Text>
                </View>
            </ScrollView>
            
            {/* Pay Button */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.payButton, isProcessing && styles.buttonDisabled]}
                    onPress={handlePayment}
                    disabled={isProcessing}
                >
                    {isProcessing ? (
                        <ActivityIndicator color={COLORS.text} />
                    ) : (
                        <>
                            <Ionicons name="lock-closed" size={20} color={COLORS.text} />
                            <Text style={styles.payButtonText}>
                                Pay ${total.toFixed(2)}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
            
            {/* Success Modal with Delivery Code */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={showSuccessModal}
                onRequestClose={handleSuccessClose}
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.successModal}>
                        <View style={styles.successIcon}>
                            <Ionicons name="checkmark-circle" size={80} color={COLORS.green} />
                        </View>
                        
                        <Text style={styles.successTitle}>Payment Successful!</Text>
                        <Text style={styles.successSubtext}>
                            Your order has been confirmed
                        </Text>
                        
                        {/* Delivery Code Display */}
                        <View style={styles.codeContainer}>
                            <Text style={styles.codeLabel}>Delivery Code</Text>
                            <Text style={styles.codeText}>{deliveryCode}</Text>
                            <Text style={styles.codeInstruction}>
                                Share this code with the traveler when you receive your item
                            </Text>
                        </View>
                        
                        <View style={styles.warningBox}>
                            <Ionicons name="information-circle" size={20} color={COLORS.orange} />
                            <Text style={styles.warningText}>
                                Keep this code secure. The traveler needs it to receive payment.
                            </Text>
                        </View>
                        
                        <TouchableOpacity
                            style={styles.continueButton}
                            onPress={handleSuccessClose}
                        >
                            <Text style={styles.continueButtonText}>Continue to Chat</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// --- Styles ---
const COLORS = {
    primary: '#0A84FF',
    background: '#000000',
    contentBackground: '#1C1C1E',
    card: '#2C2C2E',
    text: '#FFFFFF',
    textSecondary: '#AEAEB2',
    separator: '#38383A',
    green: '#30D158',
    orange: '#FF9F0A',
    disabled: '#4A4A4E',
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 50 : 20,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.separator,
    },
    headerTitle: {
        color: COLORS.text,
        fontSize: 18,
        fontWeight: '600',
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 100,
    },
    card: {
        backgroundColor: COLORS.contentBackground,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    cardTitle: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
    },
    summaryLabel: {
        color: COLORS.textSecondary,
        fontSize: 15,
    },
    summaryValue: {
        color: COLORS.text,
        fontSize: 15,
        fontWeight: '500',
    },
    separator: {
        height: 1,
        backgroundColor: COLORS.separator,
        marginVertical: 8,
    },
    totalLabel: {
        color: COLORS.text,
        fontSize: 18,
        fontWeight: 'bold',
    },
    totalValue: {
        color: COLORS.text,
        fontSize: 18,
        fontWeight: 'bold',
    },
    travelerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    travelerDetails: {
        marginLeft: 12,
    },
    travelerName: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: '600',
    },
    travelerRating: {
        color: COLORS.textSecondary,
        fontSize: 14,
        marginTop: 2,
    },
    paymentMethod: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardIcon: {
        width: 50,
        height: 35,
        backgroundColor: COLORS.card,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardDetails: {
        flex: 1,
        marginLeft: 12,
    },
    cardType: {
        color: COLORS.text,
        fontSize: 15,
        fontWeight: '500',
    },
    cardSubtext: {
        color: COLORS.textSecondary,
        fontSize: 13,
        marginTop: 2,
    },
    changeText: {
        color: COLORS.primary,
        fontSize: 15,
        fontWeight: '500',
    },
    securityNotice: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.contentBackground,
        borderRadius: 8,
        padding: 12,
        marginTop: 8,
    },
    securityText: {
        color: COLORS.textSecondary,
        fontSize: 13,
        marginLeft: 8,
        flex: 1,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        paddingBottom: Platform.OS === 'ios' ? 30 : 16,
        backgroundColor: COLORS.background,
        borderTopWidth: 1,
        borderTopColor: COLORS.separator,
    },
    payButton: {
        backgroundColor: COLORS.primary,
        height: 54,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    payButtonText: {
        color: COLORS.text,
        fontSize: 18,
        fontWeight: 'bold',
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    successModal: {
        backgroundColor: COLORS.contentBackground,
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
    },
    successIcon: {
        marginBottom: 16,
    },
    successTitle: {
        color: COLORS.text,
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    successSubtext: {
        color: COLORS.textSecondary,
        fontSize: 16,
        marginBottom: 24,
    },
    codeContainer: {
        width: '100%',
        backgroundColor: COLORS.card,
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
        marginBottom: 16,
    },
    codeLabel: {
        color: COLORS.textSecondary,
        fontSize: 14,
        marginBottom: 8,
    },
    codeText: {
        color: COLORS.text,
        fontSize: 48,
        fontWeight: 'bold',
        letterSpacing: 8,
        marginBottom: 12,
    },
    codeInstruction: {
        color: COLORS.textSecondary,
        fontSize: 13,
        textAlign: 'center',
    },
    warningBox: {
        flexDirection: 'row',
        backgroundColor: COLORS.card,
        borderRadius: 8,
        padding: 12,
        marginBottom: 24,
        width: '100%',
    },
    warningText: {
        color: COLORS.textSecondary,
        fontSize: 13,
        marginLeft: 8,
        flex: 1,
    },
    continueButton: {
        backgroundColor: COLORS.primary,
        width: '100%',
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    continueButtonText: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: 'bold',
    },
});