import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { MaterialIcons } from '@expo/vector-icons';
import { useMutation } from 'convex/react';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';


const COLORS = {
    primary: '#007BFF', // Changed
    primary_light: '#4DA3FF', // Added
    primaryMuted: 'rgba(0, 123, 255, 0.2)', // Adjusted to match new primary
    white: '#FFFFFF', // Unchanged
    black: '#000000', // Unchanged
    grey: '#AEAEB2', // Changed
    lightGrey: '#3A3A3C', // Unchanged
    dark: '#1C1C1E', // Added
    background: '#1C1C1E', // Updated to use the new dark color
    card: '#2C2C2E', // Changed
    green: '#30D158',
    greenMuted: 'rgba(48, 209, 88, 0.2)',
    red: '#FF453A',
    redMuted: 'rgba(255, 69, 58, 0.2)',
    gold: '#FFD60A',
    subtleBackground: '#F2F2F7',
    subtleBorder: '#E5E5EA',
    
};

// SHOULD HAVE OFFER ID , TO KNOW WHERE TO SEND THE MESSAGE

type MessageInputProps = {
    negotiationId: Id<'negotiations'>
}


export const MessageInput = ({ negotiationId } : MessageInputProps) => {

    const [message, setMessage] = useState('')
    const [isSending, setIsSending] = useState(false)
    const [isUploading, setIsUploading] = useState(false) // FUTURE FILE UPLOAD
    const [showMediaPicker, setShowMediaPicker] = useState(false) // FUTURE MEDIA UPLOAD

    const sendMessage = useMutation(api.messages.sendMessage)

    const handleSendMessage = async () => {

        if (!message.trim() || isSending) return;

        setIsSending(true)

        try{
            // CALL MUTATION WITH REQUIRED ARGUMENTS
            await sendMessage({
                negotiationId: negotiationId,
                message: message.trim()
            })
            // CLEAR INPUT ON SECCESSFUL SEND
            setMessage('')
        } catch (error) {
            console.error('Failed to send message: ', error)
            Alert.alert("Error", "Could not send your message. Please try again.")
        } finally {
            // LOADING STATE IS TURNED OFF
            setIsSending(false)
        }

    }

    return (
        <View style={styles.container}>
            <View style={styles.inputContainer}>
                <TextInput
                    value={message}
                    onChangeText={setMessage}
                    style={styles.textInput}
                    multiline
                    numberOfLines={3}
                    placeholder='Type your message here ...'
                    placeholderTextColor={COLORS.grey}
                />
            </View>


            <TouchableOpacity
                disabled={!message.trim() || isSending}
                style={[styles.sendButtonActive, (message.trim().length > 0 && !isSending) ? styles.sendButtonActive : styles.sendButtonDeactive]}
                onPress={handleSendMessage}
            >
                {isSending ? (
                    <ActivityIndicator size={24} color={COLORS.primary_light} />
                ) : (
                    <MaterialIcons
                        name='send'
                        size={24}
                        color={COLORS.primary_light}
                    />
                )}
            </TouchableOpacity>
        </View>   
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 20,
        backgroundColor: COLORS.card,
        gap: 10,
    },
    inputContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 8,
        minHeight: 40,
        justifyContent: 'center',
    },
    textInput: {
        color: COLORS.white,
        fontSize: 16,
    },
    sendButton: {
        padding: 4,
    },
    sendButtonActive: {
        opacity: 1, // Correct opacity value
    },
    sendButtonDeactive: {
        opacity: 0.5, // Correct opacity value
    },
});
