// app/(stack)/confirm-delivery.tsx
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

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

        if (!orderData) {
            return (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            );
        }
    
    const handleCodeChange = (value: string, index: number) => {
        if (value.length > 1) return; // Prevent multiple digits
        
        const newCode = [...code];
        newCode[index] = value;
        setCode(newCode);
        
        // Auto-focus next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
        
        // Auto-submit when complete
        if (index === 5 && value) {
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
            Alert.alert("Invalid Code", "Please enter all 6 digits");
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
                        text: "OK", 
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
                [{ text: "OK" }]
            );
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Confirm Delivery</Text>
                <View style={{ width: 24 }} />
            </View>
            
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <Ionicons name="lock-closed" size={60} color={COLORS.primary} />
                </View>
                
                <Text style={styles.title}>Enter Delivery Code</Text>
                <Text style={styles.subtitle}>
                    Ask the requester for their 6-digit delivery code
                </Text>
                
                <View style={styles.codeInputContainer}>
                    {code.map((digit, index) => (
                        <TextInput
                            key={index}
                            ref={(ref) => { inputRefs.current[index] = ref; }}
                            style={[
                                styles.codeInput,
                                digit && styles.codeInputFilled,
                            ]}
                            value={digit}
                            onChangeText={(value) => handleCodeChange(value, index)}
                            onKeyPress={(e) => handleKeyPress(e, index)}
                            keyboardType="number-pad"
                            maxLength={1}
                            autoFocus={index === 0}
                            editable={!isSubmitting}
                        />
                    ))}
                </View>
                
                <View style={styles.infoBox}>
                    <Ionicons name="information-circle" size={20} color={COLORS.textSecondary} />
                    <Text style={styles.infoText}>
                        Once confirmed, funds will be released to your account
                    </Text>
                </View>
            </View>
        </View>
    );
}

const COLORS = {
    primary: '#0A84FF',
    background: '#000000',
    contentBackground: '#1C1C1E',
    card: '#2C2C2E',
    text: '#FFFFFF',
    textSecondary: '#AEAEB2',
    separator: '#38383A',
};

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
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: COLORS.contentBackground,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        color: COLORS.text,
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    subtitle: {
        color: COLORS.textSecondary,
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 40,
    },
    codeInputContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 32,
    },
    codeInput: {
        width: 50,
        height: 60,
        backgroundColor: COLORS.contentBackground,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: COLORS.separator,
        color: COLORS.text,
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    codeInputFilled: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.card,
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: COLORS.contentBackground,
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        width: '100%',
    },
    infoText: {
        color: COLORS.textSecondary,
        fontSize: 14,
        marginLeft: 12,
        flex: 1,
    },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background, padding: 20 },
});