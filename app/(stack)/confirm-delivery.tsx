// app/(stack)/confirm-delivery.tsx
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView, // <-- Keep this one
    Platform,
    ScrollView, // <-- Added ScrollView
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
// --- FIX: Import SafeAreaView from the correct library ---
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

export default function ConfirmDeliveryScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const negotiationId = params.negotiationId as Id<"negotiations">;
    
    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const inputRefs = useRef<(TextInput | null)[]>([]);
    
    const confirmDelivery = useMutation(api.orders.confirmDelivery);
    
    const orderData = useQuery(api.orders.getOrderByNegotiation, { negotiationId });
    const offerDetails = useQuery(api.offers.getOfferThreadDetails, { negotiationId });

    if (!orderData || !offerDetails) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }
    
    const handleCodeChange = (value: string, index: number) => {
        // Only allow numeric input
        if (value && !/^[0-9]$/.test(value)) {
            return;
        }
        
        const newCode = [...code];
        newCode[index] = value;
        setCode(newCode);
        
        // Auto-focus next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
        
        // Auto-submit when complete
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
    
    const handleSubmit = async (fullCode?: string) => {
        const codeString = fullCode || code.join('');
        
        if (codeString.length !== 6) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert("Invalid Code", "Please enter all 6 digits.");
            return;
        }
        
        setIsSubmitting(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        try {
            await confirmDelivery({
                orderId: orderData._id,
                enteredCode: codeString,
            });
            
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert(
                "Success! 🎉",
                "Delivery confirmed. Funds have been released to your account.",
                [
                    { 
                        text: "Awesome!", 
                        onPress: () => router.replace('/(tabs)/inbox')
                    }
                ]
            );
        } catch (error: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            
            // Clear code on error
            setCode(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
            
            Alert.alert(
                "Incorrect Code",
                error.message || "Please check the code and try again.",
                [{ text: "Try Again" }]
            );
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        // --- FIX: Using SafeAreaView from react-native-safe-area-context ---
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            {/* --- FIX: More robust KeyboardAvoidingView setup --- */}
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardAvoidingContainer}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity 
                        onPress={() => router.back()}
                        style={styles.backButton}
                        disabled={isSubmitting}
                    >
                        <Ionicons name="close" size={26} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Confirm Delivery</Text>
                    <View style={{ width: 40 }} />
                </View>
                
                {/* ScrollView makes the content scrollable when keyboard is up */}
                <ScrollView 
                    contentContainerStyle={styles.scrollContentContainer}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Order Information Card */}
                    <View style={styles.orderInfoCard}>
                        <Ionicons name="wallet-outline" size={38} color={COLORS.primary} style={styles.orderInfoIcon} /> 
                        <View style={styles.orderInfoTextContainer}>
                            <Text style={styles.orderInfoLabel}>Receiving funds for:</Text>
                            <Text style={styles.orderInfoProduct}>{offerDetails.request?.productName}</Text>
                        </View>
                    </View>
                    
                    {/* Main Interaction Card */}
                    <View style={styles.card}>
                        <Ionicons name="key-outline" size={60} color={COLORS.textSecondary} style={{ marginBottom: 16 }} />
                        <Text style={styles.title}>Enter Delivery Code</Text>
                        <Text style={styles.subtitle}>
                            Please ask the requester for the 6-digit code. This confirms delivery and releases your payment!
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
                                    ]}
                                    value={digit}
                                    onChangeText={(value) => handleCodeChange(value, index)}
                                    onKeyPress={(e) => handleKeyPress(e, index)}
                                    keyboardType="number-pad"
                                    maxLength={1}
                                    autoFocus={index === 0}
                                    editable={!isSubmitting}
                                    textContentType="oneTimeCode"
                                />
                            ))}
                        </View>

                        {isSubmitting && <ActivityIndicator style={{ marginTop: 24 }} size="large" color={COLORS.primary} />}
                    </View>
                    
                    {/* Reassured Info Box */}
                    <View style={styles.infoBox}>
                        <Ionicons name="sparkles-outline" size={20} color={COLORS.green} />
                        <Text style={styles.infoText}>
                            Your payment will be processed immediately after successful confirmation!
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// Styles are largely the same, with one key change for the scroll container
const COLORS = {
    primary: '#007AFF',
    secondary: '#FFD700',
    background: '#F2F2F7',
    card: '#FFFFFF',
    textPrimary: '#000000',
    textSecondary: '#8A8A8E',
    separator: '#E5E5EA',
    green: '#34C759',
    red: '#FF3B30',
    disabled: '#C7C7CC',
    shadow: 'rgba(0,0,0,0.08)'
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    keyboardAvoidingContainer: {
        flex: 1,
    },
    loadingContainer: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: COLORS.background 
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
    // --- FIX: Style for ScrollView content ---
    scrollContentContainer: {
        flexGrow: 1, // Allows content to grow and center itself
        justifyContent: 'center', // Centers content vertically
        alignItems: 'center',
        padding: 20,
        paddingBottom: 40, // Extra space at the bottom
    },
    orderInfoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 18,
        marginBottom: 30,
        width: '100%',
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 15,
        elevation: 8,
        borderLeftWidth: 6,
        borderColor: COLORS.green,
    },
    orderInfoIcon: {
        marginRight: 15,
    },
    orderInfoTextContainer: {
        flex: 1,
    },
    orderInfoLabel: {
        fontSize: 15,
        color: COLORS.textSecondary,
        marginBottom: 2,
    },
    orderInfoProduct: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    card: {
        backgroundColor: COLORS.card,
        borderRadius: 24,
        padding: 28,
        width: '100%',
        alignItems: 'center',
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
        marginBottom: 24,
    },
    title: {
        color: COLORS.textPrimary,
        fontSize: 26,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
    },
    subtitle: {
        color: COLORS.textSecondary,
        fontSize: 17,
        textAlign: 'center',
        marginBottom: 36,
        lineHeight: 24,
        paddingHorizontal: 10,
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
        height: 60,
        backgroundColor: COLORS.background,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: COLORS.separator,
        color: COLORS.textPrimary,
        fontSize: 30,
        fontWeight: 'bold',
        textAlign: 'center',
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    codeInputFilled: {
        borderColor: COLORS.primary,
        color: COLORS.primary,
        backgroundColor: `${COLORS.primary}05`,
    },
    codeInputFocused: {
        borderColor: COLORS.primary,
        transform: [{ scale: 1.05 }],
        backgroundColor: COLORS.card,
    },
    disabled: {
        opacity: 0.4,
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        width: '100%',
        justifyContent: 'center',
        backgroundColor: `${COLORS.green}1A`,
        borderRadius: 12,
        paddingHorizontal: 20,
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    infoText: {
        color: COLORS.green,
        fontSize: 15,
        marginLeft: 10,
        textAlign: 'center',
        flex: 1,
        fontWeight: '500',
    },
});