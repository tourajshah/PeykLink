// app/(stack)/confirm-delivery.tsx
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

// === TRANSLATION IMPORT ===
import { useTranslation } from 'react-i18next';

// Consistent Modern Palette
const PALETTE = {
    background: '#F7F8FA',
    surface: '#FFFFFF',
    primary: '#3B82F6',
    secondary: '#10B981',
    textPrimary: '#1F2937',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    shadow: 'rgba(0, 0, 0, 0.08)',
};

export default function ConfirmDeliveryScreen() {
    const router = useRouter();
    // Initialize Translation
    const { t } = useTranslation();

    const params = useLocalSearchParams();
    const negotiationId = params.negotiationId as Id<"negotiations">;
    
    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    
    const [localAttempts, setLocalAttempts] = useState(0);

    const inputRefs = useRef<(TextInput | null)[]>([]);
    // Reference for ScrollView to programmatically scroll if needed
    const scrollViewRef = useRef<ScrollView>(null);
    
    const confirmDelivery = useMutation(api.orders.confirmDelivery);
    
    const orderData = useQuery(api.orders.getOrderByNegotiation, { negotiationId });
    const offerDetails = useQuery(api.offers.getOfferThreadDetails, { negotiationId });

    useEffect(() => {
        if (orderData?.codeAttempts) {
            setLocalAttempts(orderData.codeAttempts);
        }
    }, [orderData?.codeAttempts]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setTimeout(() => {
            setRefreshing(false);
        }, 1200);
    }, []);

    if (!orderData || !offerDetails) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={PALETTE.primary} />
            </View>
        );
    }

    const MAX_ATTEMPTS = 5;
    const attemptsUsed = localAttempts;
    const attemptsRemaining = Math.max(0, MAX_ATTEMPTS - attemptsUsed);
    
    const handleCodeChange = (value: string, index: number) => {
        if (value && !/^[0-9]$/.test(value)) return;
        
        const newCode = [...code];
        newCode[index] = value;
        setCode(newCode);
        
        if (value) {
            Haptics.selectionAsync();
        }
        
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
        
        const isComplete = newCode.every(digit => digit !== '');
        if (isComplete) {
            inputRefs.current[index]?.blur();
            handleSubmit(newCode.join(''));
        }
    };
    
    const handleKeyPress = (e: any, index: number) => {
        if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    // Helper to scroll to the input section when focused
    const scrollToInput = () => {
        // Scroll down slightly to ensure the input isn't hidden behind the keyboard toolbar
        scrollViewRef.current?.scrollTo({ y: 150, animated: true });
    };
    
    const handleSubmit = async (fullCode?: string) => {
        const codeString = fullCode || code.join('');
        
        if (codeString.length !== 6) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert(t('confirm_delivery.alerts.invalid_code_title'), t('confirm_delivery.alerts.invalid_code_msg'));
            return;
        }
        
        setIsSubmitting(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        try {
            const result = await confirmDelivery({
                orderId: orderData._id,
                enteredCode: codeString,
            });

            if (!result.success) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                
                if (result.attempts) {
                    setLocalAttempts(result.attempts);
                }

                setCode(['', '', '', '', '', '']);
                inputRefs.current[0]?.focus();

                Alert.alert(t('confirm_delivery.alerts.incorrect_code_title'), result.message);
                return; 
            }
            
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert(
                t('confirm_delivery.alerts.success_title'),
                t('confirm_delivery.alerts.success_msg'),
                [
                    { 
                        text: t('confirm_delivery.alerts.btn_awesome'), 
                        onPress: () => router.replace('/(tabs)/inbox')
                    }
                ]
            );

        } catch (error: any) {
            console.error(error);
            Alert.alert(t('confirm_delivery.alerts.error_title'), t('confirm_delivery.alerts.error_msg'));
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity 
                    onPress={() => router.back()}
                    style={styles.backButton}
                    disabled={isSubmitting}
                >
                    <Ionicons name="close" size={24} color={PALETTE.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('confirm_delivery.title')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardAvoidingContainer}
                // MODIFIED: Increased offset to account for Header (approx 60) + Status Bar (approx 40)
                keyboardVerticalOffset={Platform.OS === 'ios' ? 110 : 20}
            >
                <ScrollView 
                    ref={scrollViewRef}
                    contentContainerStyle={styles.scrollContentContainer}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PALETTE.primary} />
                    }
                >
                    {/* Order Information Card */}
                    <LinearGradient
                        colors={['#FFFFFF', '#EFF6FF']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.orderInfoCard}
                    >
                        <View style={styles.iconContainer}>
                            <Ionicons name="cube" size={24} color={PALETTE.primary} />
                        </View>
                        <View style={styles.orderInfoTextContainer}>
                            <Text style={styles.orderInfoLabel}>{t('confirm_delivery.delivering_item')}</Text>
                            <Text style={styles.orderInfoProduct} numberOfLines={1}>
                                {offerDetails.request?.productName}
                            </Text>
                        </View>
                    </LinearGradient>
                    
                    {/* Main Code Input Card */}
                    <View style={styles.card}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="shield-checkmark" size={32} color={PALETTE.primary} />
                        </View>
                        
                        <Text style={styles.title}>{t('confirm_delivery.verification_title')}</Text>
                        <Text style={styles.subtitle}>
                            {t('confirm_delivery.verification_desc')}
                        </Text>
                        
                        <View style={[styles.codeInputContainer, isSubmitting && styles.disabled]}>
                            {code.map((digit, index) => (
                                <TextInput
                                    key={index}
                                    ref={(ref) => { inputRefs.current[index] = ref; }}
                                    style={[
                                        styles.codeInput,
                                        code[index] ? styles.codeInputFilled : null,
                                        inputRefs.current[index]?.isFocused() && !isSubmitting ? styles.codeInputFocused : null,
                                        attemptsRemaining <= 2 && styles.codeInputWarning
                                    ]}
                                    value={digit}
                                    onChangeText={(value) => handleCodeChange(value, index)}
                                    onKeyPress={(e) => handleKeyPress(e, index)}
                                    // ADDED: onFocus listener to ensure visibility
                                    onFocus={() => scrollToInput()}
                                    keyboardType="number-pad"
                                    maxLength={1}
                                    autoFocus={index === 0}
                                    editable={!isSubmitting}
                                    textContentType="oneTimeCode"
                                    selectionColor={PALETTE.primary}
                                    placeholder="-"
                                    placeholderTextColor="#D1D5DB"
                                />
                            ))}
                        </View>

                        {/* Attempts Counter */}
                        <View style={styles.attemptsContainer}>
                            {attemptsRemaining <= 2 && (
                                <Ionicons name="warning" size={16} color={PALETTE.error} style={{ marginRight: 6 }} />
                            )}
                            <Text style={[
                                styles.attemptsText, 
                                attemptsRemaining <= 2 ? { color: PALETTE.error } : { color: PALETTE.textSecondary }
                            ]}>
                                {t('confirm_delivery.attempts_remaining', { count: attemptsRemaining })}
                            </Text>
                        </View>

                        {isSubmitting && <ActivityIndicator style={{ marginTop: 24 }} size="large" color={PALETTE.primary} />}
                    </View>
                    
                    {/* Info Footer */}
                    <View style={styles.infoBox}>
                        <Ionicons name="lock-closed" size={18} color={PALETTE.success} />
                        <Text style={styles.infoText}>
                            {t('confirm_delivery.secure_notice')}
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: PALETTE.background,
    },
    keyboardAvoidingContainer: {
        flex: 1,
    },
    loadingContainer: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: PALETTE.background 
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: PALETTE.background,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: PALETTE.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    headerTitle: {
        color: PALETTE.textPrimary,
        fontSize: 17,
        fontWeight: '700',
    },
    scrollContentContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        // MODIFIED: Increased bottom padding to allow scrolling up when keyboard is open
        paddingBottom: 100, 
    },
    orderInfoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
        width: '100%',
        borderWidth: 1,
        borderColor: PALETTE.border,
        shadowColor: PALETTE.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 3,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#DBEAFE', // Light blue
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    orderInfoTextContainer: {
        flex: 1,
    },
    orderInfoLabel: {
        fontSize: 12,
        color: PALETTE.textSecondary,
        marginBottom: 2,
        textTransform: 'uppercase',
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    orderInfoProduct: {
        fontSize: 16,
        fontWeight: '700',
        color: PALETTE.textPrimary,
    },
    card: {
        backgroundColor: PALETTE.surface,
        borderRadius: 24,
        padding: 24,
        width: '100%',
        alignItems: 'center',
        shadowColor: PALETTE.shadow,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 8,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: PALETTE.border,
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        color: PALETTE.textPrimary,
        fontSize: 22,
        fontWeight: '800',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        color: PALETTE.textSecondary,
        fontSize: 15,
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 22,
        paddingHorizontal: 8,
    },
    codeInputContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        maxWidth: 320,
        gap: 8,
    },
    codeInput: {
        flex: 1,
        height: 56,
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: PALETTE.border,
        color: PALETTE.textPrimary,
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        shadowColor: PALETTE.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    codeInputFilled: {
        borderColor: PALETTE.primary,
        backgroundColor: '#EFF6FF',
        color: PALETTE.primary,
    },
    codeInputFocused: {
        borderColor: PALETTE.primary,
        borderWidth: 2,
        backgroundColor: '#FFFFFF',
        transform: [{ scale: 1.05 }],
        shadowColor: PALETTE.primary,
        shadowOpacity: 0.15,
        shadowRadius: 6,
    },
    codeInputWarning: {
        borderColor: PALETTE.error,
        color: PALETTE.error,
        backgroundColor: '#FEF2F2',
    },
    attemptsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 20,
    },
    attemptsText: {
        fontSize: 13,
        fontWeight: '600',
    },
    disabled: {
        opacity: 0.5,
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        width: '100%',
        justifyContent: 'center',
        backgroundColor: '#ECFDF5', // Light green
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#A7F3D0',
    },
    infoText: {
        color: '#047857', // Deep green
        fontSize: 13,
        marginLeft: 8,
        textAlign: 'left',
        flex: 1,
        fontWeight: '600',
        lineHeight: 18,
    },
});