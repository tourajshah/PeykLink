import { Loader } from '@/components/Loader'
import { COLORS } from '@/constants/theme'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { styles } from '@/styles/profile.styles'
import { Ionicons } from '@expo/vector-icons'
import { useQuery } from 'convex/react'
import { Image } from 'expo-image'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ScrollView, Text, TouchableOpacity, View } from 'react-native'


export default function UserProfileScreen() {

    const {id} = useLocalSearchParams()
    const router = useRouter();
    

    const profile = useQuery(api.users.getUserProfile, {id: id as Id<"users">})


    if(!profile) return <Loader />

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.white} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{profile.username}</Text>
                <View style={{ width: 24}}></View>

            </View>
        
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.profileInfo}>
                    <View style={styles.avatarAndStats}>
                        {/* AVATAR */}
                        <Image
                        source={profile.imageURL}
                        style={styles.avatar}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        />

                        {/* STATS */}
                        <View style={styles.statsContainer}>
                            <View style={styles.statItem}>
                                <Text style={styles.statNumber}>200</Text>
                                <Text style={styles.statLabel}>Trips</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statNumber}>150</Text>
                                <Text style={styles.statLabel}>Requests</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statNumber}>300</Text>
                                <Text style={styles.statLabel}>Deals</Text>
                            </View>
                        </View>
                    </View>

                    <Text style={styles.name}>{profile.fullname}</Text>
                    {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}    
                </View>
            </ScrollView>
        </View>       
    )
}