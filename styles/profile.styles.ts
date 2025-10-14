import { StyleSheet } from 'react-native';


const COLORS = {
  backgroundGradient: ['#F7F8FA', '#FFFFFF'] as const, // Subtle gradient for a non-flat look
  surface: '#FFFFFF',
  shadow: 'rgba(100, 100, 111, 0.15)', // A softer, more realistic shadow color
  primary: '#3B82F6', // A single, consistent primary blue
  secondary: '#10B981', // A single, consistent secondary green
  textPrimary: '#1F2937', // Near-black for high contrast
  textSecondary: '#6B7280', // Medium gray for secondary info
  historyIcon: '#ed7c04ff',
  primaryGradient: ['#38BDF8', '#3B82F6'] as const,
  secondaryActionGradient: ['#34D399', '#10B981'] as const, 
};

export const styles = StyleSheet.create({
  // --- Main Container ---
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA', // Use the lighter gradient color for background
  },
  scrollContentContainer: {
    padding: 16,
    paddingTop: 8,
  },

  // --- Header ---
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50, // Adjust for safe area
    paddingBottom: 12,
    backgroundColor: '#F7F8FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  headerIcon: {
    padding: 4,
  },

  // --- Profile Info Card ---
  profileCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  profileHeaderText: {
    marginLeft: 16,
    flex: 1,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  verifiedBadge: {
    marginLeft: 8,
  },
  username: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  bio: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: 20,
  },

  // --- Stats Display ---
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F7F8FA',
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statSeparator: {
    width: 1,
    backgroundColor: '#E5E7EB',
    height: '100%',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  // --- Action Buttons ---
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  editButtonText: {
    color: COLORS.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  iconButton: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },

  // --- Reviews Section ---
  reviewsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  emptyReviewsContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
  },
  emptyReviewsText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 8,
  },

  // --- Edit Profile Modal ---
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    padding: 24,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F7F8FA',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    fontSize: 16,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    color: COLORS.surface,
    fontSize: 16,
    fontWeight: 'bold',
  },
});