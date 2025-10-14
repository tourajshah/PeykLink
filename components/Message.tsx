// components/Message.tsx

import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { MaterialIcons } from '@expo/vector-icons';
import { useMutation } from 'convex/react';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

const COLORS = { 
    // ... (Your COLORS object)
    primary: '#007AFF',
    background: '#F0F2F5',
    surface: '#FFFFFF',
    text: '#1C1C1E',
    textSecondary: '#6D6D72',
    separator: '#E5E5EA',
    disabled: '#D1D1D6',
    green: '#34C759',
    red: '#FF3B30',
    orange: '#FF9500',
    myBubble: '#007AFF',
    theirBubble: '#E5E5EA',
    placeholder: '#C7C7CC',
    white: '#FFFFFF',
    error: '#FF3B30'
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
            <TouchableOpacity
                disabled={isButtonDisabled}
                style={[
                    styles.sendButton,
                    isButtonDisabled && styles.sendButtonDisabled // Clean conditional style
                ]}
                onPress={handleSendMessage}
            >
                {isSending ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                    <MaterialIcons
                        name='send'
                        size={18} // Adjusted for smaller button
                        color={COLORS.white} // White icon for better contrast
                    />
                )}
            </TouchableOpacity>
        </View>
    );
}

// The new, sleek, and compact styles
const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        backgroundColor: COLORS.surface,
        gap: 8,
        borderTopWidth: 1, // Add a clean separator line
        borderTopColor: COLORS.separator,
    },
    inputContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        justifyContent: 'center',
    },
    textInput: {
        fontSize: 15,
        color: COLORS.text,
        maxHeight: 100,
    },
    sendButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: COLORS.disabled,
    },
});