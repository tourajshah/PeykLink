import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics'; // 1. NEW IMPORT: For tactile feedback
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
// 2. IMPORT TRANSLATION HOOK
import { useTranslation } from 'react-i18next';

// 2. REFINED PALETTE: Adjusted for higher contrast and "Glass" effects inside cards
const PALETTE = {
  backgroundGradient: ['#F8FAFC', '#FFFFFF'] as const, // Cooler, cleaner white/grey
  surface: '#FFFFFF',
  shadow: 'rgba(50, 50, 93, 0.15)', // Tighter, more modern shadow
  primary: '#3B82F6',
  secondary: '#10B981',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  historyIcon: '#ed7c04ff',
  primaryGradient: ['#0EA5E9', '#2563EB'] as const, // Sharper Blue Gradient
  secondaryActionGradient: ['#10B981', '#059669'] as const, // Sharper Green Gradient
  textInverse: '#FFFFFF',
  glassBorder: 'rgba(255, 255, 255, 0.3)', // For the modern border effect
};

// 3. NEW COMPONENT: ScaleButton
// This wraps the cards to provide the "Bento Box" shrink animation + Haptics on press.
const ScaleButton = ({ onPress, children, style }: { onPress: () => void, children: React.ReactNode, style?: any }) => {
  const scaleValue = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    // Haptic feedback immediately on touch
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(scaleValue, {
      toValue: 0.96, // Shrink to 96%
      useNativeDriver: true,
      speed: 40,
      bounciness: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 10,
    }).start();
  };

  return (
    <Pressable 
      onPress={onPress} 
      onPressIn={handlePressIn} 
      onPressOut={handlePressOut} 
      style={{ flex: 1 }}
    >
      <Animated.View style={[style, { transform: [{ scale: scaleValue }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

export default function Create() {
  const router = useRouter();
  // INITIALIZE TRANSLATION
  const { t } = useTranslation();
  
  // --- PRESERVED CODE BLOCK START ---
  // The user requested to remove the lists as they are in the Profile tab.
  // I am commenting these out to preserve the code as per Rule #1.
  /*
  const [activeTab, setActiveTab] = useState<'trips' | 'requests'>('trips');
  const [postStatus, setPostStatus] = useState<'active' | 'archived'>('active');
  const [showHint, setShowHint] = useState(false);
  const hintAnim = new Animated.Value(0);

  useEffect(() => {
    Animated.timing(hintAnim, {
      toValue: showHint ? 1 : 0,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [showHint]);

  const myActiveTrips = useQuery(api.trips.getMyTrips);
  const myActiveRequests = useQuery(api.requests.getMyRequests);
  const myArchivedTrips: TripType[] = [];
  const myArchivedRequests: RequestType[] = [];

  if (myActiveTrips === undefined || myActiveRequests === undefined) return <Loader />;

  type TripType = NonNullable<typeof myActiveTrips>[number];
  type RequestType = NonNullable<typeof myActiveRequests>[number];

  const isTripsActive = activeTab === 'trips';
  const isShowingActive = postStatus === 'active';
  
  const dataToRender = isShowingActive
    ? (isTripsActive ? myActiveTrips : myActiveRequests)
    : (isTripsActive ? myArchivedTrips : myArchivedRequests);

  const handleHistoryToggle = () => {
    const isSwitchingToArchived = postStatus === 'active';
    setPostStatus(isSwitchingToArchived ? 'archived' : 'active');
    if (isSwitchingToArchived) {
      setShowHint(true);
      setTimeout(() => setShowHint(false), 3000);
    }
  };
  */
  // --- PRESERVED CODE BLOCK END ---

  const handleNavigation = (path: "/trips" | "/orders") => {
    // 4. FEATURE: Haptic feedback confirmation before navigation
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.navigate(path);
  };

  return (
    <View style={styles.container}>
      {/* Background Gradient for subtle depth */}
      <LinearGradient colors={PALETTE.backgroundGradient} style={styles.gradientFill}>
        
        {/* HEADER: Clean, large typography. No clutter. */}
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>{t('create_new')}</Text>
          <Text style={styles.headerSubtitle}>{t('connect_prompt')}</Text>
        </View>

        {/* MAIN CONTENT: 50/50 Split Grid (No Scroll) */}
        <View style={styles.gridContainer}>
          
          {/* --- OPTION 1: TRAVELER CARD --- */}
          <View style={styles.cardContainer}>
            <ScaleButton onPress={() => handleNavigation("/trips")} style={styles.cardShadow}>
              <LinearGradient 
                colors={PALETTE.primaryGradient} 
                start={{x: 0, y: 0}} 
                end={{x: 1, y: 1}} 
                style={styles.card}
              >
                {/* Top Row: Icon + Arrow */}
                <View style={styles.cardTopRow}>
                  <View style={styles.iconCircle}>
                    <Ionicons name="airplane" size={28} color={PALETTE.textInverse} style={{transform: [{rotate: '-45deg'}]}} />
                  </View>
                  <View style={styles.actionBadge}>
                      <Feather name="arrow-right" size={20} color={PALETTE.textInverse} />
                  </View>
                </View>

                {/* Middle Row: Main Text */}
                <View style={styles.cardTextContent}>
                  <Text style={styles.cardTitle}>{t('post_trip')}</Text>
                  <Text style={styles.cardDescription}>
                    {t('post_trip_desc')}
                  </Text>
                </View>

                {/* Bottom Row: Informative Pills (Feature Highlights) */}
                <View style={styles.pillsRow}>
                  <View style={styles.pill}>
                    <Feather name="dollar-sign" size={12} color="#FFFFFF" />
                    <Text style={styles.pillText}>{t('earn_money')}</Text>
                  </View>
                  <View style={styles.pill}>
                    <Feather name="users" size={12} color="#FFFFFF" />
                    <Text style={styles.pillText}>{t('meet_locals')}</Text>
                  </View>
                </View>

                {/* Decorative Background Element */}
                <Ionicons name="map-outline" size={120} color="rgba(255,255,255,0.1)" style={styles.bgIcon} />
              </LinearGradient>
            </ScaleButton>
          </View>

          {/* --- OPTION 2: REQUESTER CARD --- */}
          <View style={styles.cardContainer}>
            <ScaleButton onPress={() => handleNavigation("/orders")} style={styles.cardShadow}>
              <LinearGradient 
                colors={PALETTE.secondaryActionGradient} 
                start={{x: 0, y: 0}} 
                end={{x: 1, y: 1}} 
                style={styles.card}
              >
                <View style={styles.cardTopRow}>
                  <View style={styles.iconCircle}>
                    <MaterialCommunityIcons name="shopping" size={28} color={PALETTE.textInverse} />
                  </View>
                  <View style={styles.actionBadge}>
                      <Feather name="arrow-right" size={20} color={PALETTE.textInverse} />
                  </View>
                </View>

                <View style={styles.cardTextContent}>
                  <Text style={styles.cardTitle}>{t('make_request')}</Text>
                  <Text style={styles.cardDescription}>
                    {t('make_request_desc')}
                  </Text>
                </View>

                <View style={styles.pillsRow}>
                  <View style={styles.pill}>
                    <Feather name="globe" size={12} color="#FFFFFF" />
                    <Text style={styles.pillText}>{t('shop_global')}</Text>
                  </View>
                  <View style={styles.pill}>
                    <Feather name="shield" size={12} color="#FFFFFF" />
                    <Text style={styles.pillText}>{t('secure_escrow')}</Text>
                  </View>
                </View>

                {/* Decorative Background Element */}
                <Ionicons name="cube-outline" size={120} color="rgba(255,255,255,0.1)" style={styles.bgIcon} />
              </LinearGradient>
            </ScaleButton>
          </View>

        </View>

        {/* FOOTER: Trust Signal (Industry Standard) */}
        <View style={styles.footer}>
          <Feather name="lock" size={14} color={PALETTE.textSecondary} />
          <Text style={styles.footerText}>{t('footer_trust')}</Text>
        </View>

      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  // Structure
  container: { flex: 1 },
  gradientFill: { flex: 1, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 },
  
  // Header
  headerContainer: { marginTop: 12, marginBottom: 24 },
  headerTitle: { fontSize: 32, fontWeight: '800', color: PALETTE.textPrimary, letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 16, color: PALETTE.textSecondary, marginTop: 6, fontWeight: '500' },

  // Grid Layout
  gridContainer: { flex: 1, gap: 20 }, // Gap creates the separation between the two big cards
  cardContainer: { flex: 1 }, // Ensures both cards take equal height (50/50 split)

  // Card Styling
  cardShadow: {
    flex: 1,
    borderRadius: 24,
    shadowColor: PALETTE.primary, // Colored shadow for glow effect
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10, // Android shadow
    backgroundColor: PALETTE.surface, // Fallback
  },
  card: {
    flex: 1,
    borderRadius: 24,
    padding: 24,
    justifyContent: 'space-between', // Pushes content to edges
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: PALETTE.glassBorder, // Subtle glass border
  },
  
  // Card Internal Layout
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  
  // Icon Styles
  iconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255,255,255,0.2)', // Glass effect background
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  actionBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Typography inside Cards
  cardTextContent: { marginTop: 10 },
  cardTitle: { 
    fontSize: 26, 
    fontWeight: '700', 
    color: '#FFFFFF', 
    marginBottom: 8,
    letterSpacing: -0.5 
  },
  cardDescription: { 
    fontSize: 15, 
    color: 'rgba(255,255,255,0.9)', 
    lineHeight: 22,
    fontWeight: '500',
    maxWidth: '90%'
  },

  // Feature Pills (The "Informative" part)
  pillsRow: { flexDirection: 'row', gap: 8, marginTop: 'auto' }, // Pushed to bottom
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)', // Transparent pill
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  pillText: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },

  // Background Decoration
  bgIcon: {
    position: 'absolute',
    right: -20,
    bottom: -20,
    transform: [{ rotate: '-10deg' }]
  },

  // Footer
  footer: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    gap: 6, 
    marginTop: 20, 
    opacity: 0.6 
  },
  footerText: { fontSize: 12, color: PALETTE.textSecondary, fontWeight: '500' }
});