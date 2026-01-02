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
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

// === TRANSLATION IMPORT ===
import { useTranslation } from 'react-i18next';

// --- Colors ---
const COLORS = {
    primary: '#007AFF',
    background: '#F2F2F7',
    card: '#FFFFFF',
    textPrimary: '#000000',
    textSecondary: '#8A8A8E',
    separator: '#E5E5EA',
    green: '#34C759',
    orange: '#FF9500',
    disabled: '#A9A9A9',
    shadow: 'rgba(0,0,0,0.1)'
};

export default function PaymentScreen() {
    const router = useRouter();
    // Initialize Translation
    const { t } = useTranslation();

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
                <Text style={styles.errorText}>{t('payment.loading_error')}</Text>
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
                t('payment.alerts.failed_title'),
                error.message || t('payment.alerts.failed_msg'),
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
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity 
                    onPress={() => router.back()} 
                    disabled={isProcessing}
                    style={styles.backButton}
                >
                    <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('payment.title')}</Text>
                <View style={{ width: 40 }} />
            </View>
            
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Traveler Info Card */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>{t('payment.delivery_partner')}</Text>
                    <View style={styles.card}>
                        <View style={styles.travelerInfo}>
                            <Ionicons name="person-circle-outline" size={50} color={COLORS.primary} />
                            <View style={styles.travelerDetails}>
                                <Text style={styles.travelerName}>{traveler.username}</Text>
                                <Text style={styles.travelerRating}>⭐ 4.8 (12 reviews)</Text>
                            </View>
                        </View>
                        {/* Verified Section Added Here */}
                        <View style={styles.verifiedBadge}>
                            <Ionicons name="shield-checkmark" size={16} color={COLORS.green} />
                            <Text style={styles.verifiedText}>{t('payment.verified_traveler')}</Text>
                        </View>
                    </View>
                </View>
                
                {/* Payment Method Card (Mock) */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>{t('payment.payment_method')}</Text>
                    <TouchableOpacity style={styles.card} disabled={isProcessing}>
                        <View style={styles.paymentMethod}>
                            <View style={styles.cardIcon}>
                                <Ionicons name="card" size={24} color={COLORS.primary} />
                            </View>
                            <View style={styles.cardDetails}>
                                <Text style={styles.cardType}>Visa •••• 4242</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={22} color={COLORS.textSecondary} />
                        </View>
                    </TouchableOpacity>
                </View>
                
                {/* Order Summary Card */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>{t('payment.order_summary')}</Text>
                    <View style={styles.card}>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>{request.productName} (x{request.quantity})</Text>
                            <Text style={styles.summaryValue}>${itemTotal.toFixed(2)}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>{t('payment.delivery_fee')}</Text>
                            <Text style={styles.summaryValue}>${deliveryFee.toFixed(2)}</Text>
                        </View>
                        <View style={styles.separator} />
                        <View style={styles.summaryRow}>
                            <Text style={styles.totalLabel}>{t('payment.total')}</Text>
                            <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
            
            {/* Footer with Pay Button and Security Notice */}
            <View style={styles.footer}>
                <View style={styles.securityNotice}>
                    <Ionicons name="lock-closed" size={16} color={COLORS.textSecondary} />
                    <Text style={styles.securityText}>
                        {t('payment.security_notice')}
                    </Text>
                </View>
                <TouchableOpacity
                    style={[styles.payButton, isProcessing && styles.buttonDisabled]}
                    onPress={handlePayment}
                    disabled={isProcessing}
                >
                    {isProcessing ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.payButtonText}>
                            {t('payment.pay_btn', { amount: total.toFixed(2) })}
                        </Text>
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
                        <Text style={styles.successTitle}>{t('payment.success_title')}</Text>
                        <Text style={styles.successSubtext}>
                            {t('payment.success_msg')}
                        </Text>
                        
                        {/* Delivery Code Display */}
                        <View style={styles.codeContainer}>
                            <Text style={styles.codeLabel}>{t('payment.delivery_code')}</Text>
                            <Text style={styles.codeText}>{deliveryCode}</Text>
                        </View>
                        
                        <TouchableOpacity
                            style={styles.continueButton}
                            onPress={handleSuccessClose}
                        >
                            <Text style={styles.continueButtonText}>{t('payment.view_order_btn')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

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
    errorText: {
        marginTop: 10,
        fontSize: 16,
        color: COLORS.textSecondary,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: COLORS.background,
    },
    backButton: {
        height: 40,
        width: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    headerTitle: {
        color: COLORS.textPrimary,
        fontSize: 20,
        fontWeight: '700',
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 150, // Ensure content isn't hidden by footer
    },
    sectionContainer: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 12,
        paddingHorizontal: 8,
    },
    card: {
        backgroundColor: COLORS.card,
        borderRadius: 12,
        padding: 16,
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
    },
    summaryLabel: {
        color: COLORS.textSecondary,
        fontSize: 16,
    },
    summaryValue: {
        color: COLORS.textPrimary,
        fontSize: 16,
        fontWeight: '500',
    },
    separator: {
        height: 1,
        backgroundColor: COLORS.separator,
        marginVertical: 8,
    },
    totalLabel: {
        color: COLORS.textPrimary,
        fontSize: 18,
        fontWeight: 'bold',
    },
    totalValue: {
        color: COLORS.textPrimary,
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
        color: COLORS.textPrimary,
        fontSize: 17,
        fontWeight: '600',
    },
    travelerRating: {
        color: COLORS.textSecondary,
        fontSize: 14,
        marginTop: 2,
    },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: `${COLORS.green}1A`, // Green with low opacity
        borderRadius: 12,
        paddingVertical: 6,
        paddingHorizontal: 10,
        marginTop: 12,
        alignSelf: 'flex-start', // Don't stretch full width
    },
    verifiedText: {
        color: COLORS.green,
        fontSize: 13,
        fontWeight: '500',
        marginLeft: 6,
    },
    paymentMethod: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardIcon: {
        width: 44,
        height: 44,
        backgroundColor: `${COLORS.primary}1A`, // Primary blue with low opacity
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardDetails: {
        flex: 1,
        marginLeft: 12,
    },
    cardType: {
        color: COLORS.textPrimary,
        fontSize: 16,
        fontWeight: '500',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        backgroundColor: COLORS.card, // White footer for contrast
        borderTopWidth: 1,
        borderTopColor: COLORS.separator,
    },
    securityNotice: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    securityText: {
        color: COLORS.textSecondary,
        fontSize: 13,
        marginLeft: 8,
        textAlign: 'center',
    },
    payButton: {
        backgroundColor: COLORS.primary,
        height: 54,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    payButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    buttonDisabled: {
        backgroundColor: COLORS.disabled,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    successModal: {
        backgroundColor: COLORS.card,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
        alignItems: 'center',
    },
    successIcon: {
        marginBottom: 16,
    },
    successTitle: {
        color: COLORS.textPrimary,
        fontSize: 26,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    successSubtext: {
        color: COLORS.textSecondary,
        fontSize: 16,
        marginBottom: 24,
        textAlign: 'center',
        lineHeight: 22,
    },
    codeContainer: {
        width: '100%',
        backgroundColor: COLORS.background,
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        marginBottom: 24,
    },
    codeLabel: {
        color: COLORS.textSecondary,
        fontSize: 14,
        marginBottom: 8,
    },
    codeText: {
        color: COLORS.primary,
        fontSize: 48,
        fontWeight: 'bold',
        letterSpacing: 8,
    },
    continueButton: {
        backgroundColor: COLORS.primary,
        width: '100%',
        height: 54,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    continueButtonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '600',
    },
});