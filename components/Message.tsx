// components/Message.tsx
//
// REDESIGN: Updated COLORS to match unified brand pink (#FF385C) palette.
// Aligns with the premium design system used across all screens.

import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { MaterialIcons } from '@expo/vector-icons';
import { useMutation } from 'convex/react';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

// OLD COLORS (commented out per Rule 1 — DO NOT REMOVE):
// const COLORS = { 
//     // ... (Your COLORS object)
//     primary: '#007AFF',
//     background: '#F0F2F5',
//     surface: '#FFFFFF',
//     text: '#1C1C1E',
//     textSecondary: '#6D6D72',
//     separator: '#E5E5EA',
//     disabled: '#D1D1D6',
//     green: '#34C759',
//     red: '#FF3B30',
//     orange: '#FF9500',
//     myBubble: '#007AFF',
//     theirBubble: '#E5E5EA',
//     placeholder: '#C7C7CC',
//     white: '#FFFFFF',
//     error: '#FF3B30'
// };

// REDESIGN: Unified brand palette matching offers.tsx, inbox.tsx, Offer.tsx
const COLORS = {
    brand: '#FF385C',           // REDESIGN: was #007AFF (iOS blue)
    brandGradient: ['#FF385C', '#E31C5F'] as const,
    background: '#F7F7F7',      // REDESIGN: warmer background
    surface: '#FFFFFF',
    text: '#222222',            // REDESIGN: warmer black
    textSecondary: '#717171',
    separator: '#EBEBEB',       // REDESIGN: softer separator
    disabled: '#D1D1D6',
    placeholder: '#B0B0B0',     // REDESIGN: softer placeholder
    white: '#FFFFFF',
};

type MessageInputProps = {
    negotiationId: Id<'negotiations'>
}

export const MessageInput = ({ negotiationId }: MessageInputProps) => {
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const sendMessage = useMutation(api.messages.sendMessage);
    const [isUploading, setIsUploading] = useState(false) // FUTURE FILE UPLOAD
    const [showMediaPicker, setShowMediaPicker] = useState(false) // FUTURE MEDIA UPLOAD

    const handleSendMessage = async () => {
        if (!message.trim() || isSending) return;
        setIsSending(true);
        try {
            await sendMessage({
                negotiationId: negotiationId,
                message: message.trim()
            });
            setMessage('');
        } catch (error) {
            console.error('Failed to send message: ', error);
            Alert.alert("Error", "Could not send your message. Please try again.");
        } finally {
            setIsSending(false);
        }
    }

    const isButtonDisabled = !message.trim() || isSending;

    return (
        // NO KeyboardAvoidingView here!
        <View style={styles.container}>
            <View style={styles.inputContainer}>
                <TextInput
                    value={message}
                    onChangeText={setMessage}
                    style={styles.textInput}
                    multiline
                    placeholder='Message...'
                    placeholderTextColor={COLORS.placeholder}
                />
            </View>
            {/* REDESIGN: Gradient send button matching brand palette */}
            <TouchableOpacity
                disabled={isButtonDisabled}
                style={[
                    styles.sendButton,
                    isButtonDisabled && styles.sendButtonDisabled // Clean conditional style
                ]}
                onPress={handleSendMessage}
            >
                {isButtonDisabled ? (
                    isSending ? (
                        <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                        <MaterialIcons
                            name='send'
                            size={18} // Adjusted for smaller button
                            color={COLORS.white} // White icon for better contrast
                        />
                    )
                ) : (
                    <View style={styles.sendButtonGradientWrapper}>
                        <LinearGradient
                            colors={COLORS.brandGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFill}
                        />
                        {isSending ? (
                            <ActivityIndicator size="small" color={COLORS.white} />
                        ) : (
                            <MaterialIcons
                                name='send'
                                size={18}
                                color={COLORS.white}
                            />
                        )}
                    </View>
                )}
            </TouchableOpacity>
        </View>
    );
}

// The new, sleek, and compact styles
// REDESIGN: Updated colors from iOS blue to brand pink palette
const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        paddingBottom: 12,
        backgroundColor: COLORS.surface,
        gap: 8,
        borderTopWidth: 1, // Add a clean separator line
        borderTopColor: COLORS.separator,
    },
    inputContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
        borderRadius: 22,
        paddingHorizontal: 16,
        paddingVertical: 8,
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.04)', // Glassmorphism-lite border
    },
    textInput: {
        fontSize: 15,
        color: COLORS.text,
        maxHeight: 100,
    },
    sendButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: COLORS.disabled, // Default disabled bg
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    sendButtonDisabled: {
        backgroundColor: COLORS.disabled,
    },
    // REDESIGN: Gradient wrapper for active send button
    sendButtonGradientWrapper: {
        width: 38,
        height: 38,
        borderRadius: 19,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
});
