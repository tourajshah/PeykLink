import { COLORS } from "@/constants/theme";
import { Dimensions, Platform, StyleSheet } from "react-native";

const { width } = Dimensions.get("window");

export const styles = StyleSheet.create({
  // --- YOUR ORIGINAL STYLES (UNCHANGED) ---
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: "JetBrainsMono-Medium",
    color: COLORS.primary,
  },
  storiesContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface,
  },
  storyWrapper: {
    alignItems: "center",
    marginHorizontal: 8,
    width: 72,
  },
  storyRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    padding: 2,
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.primary,
    marginBottom: 4,
  },
  noStory: {
    borderColor: COLORS.grey,
  },
  storyAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  storyUsername: {
    color: COLORS.white,
    fontSize: 12,
    fontFamily: "JetBrainsMono-Regular",
    marginTop: 4,
  },
  post: {
    marginVertical: 12,
    backgroundColor: COLORS.surface, // Give the post a slight background color
    borderRadius: 16,
    marginHorizontal: 16,
  },
  postHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12, // Add padding top
    marginBottom: 12,
  },
  postHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  postUsername: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "500",
  },
  postImage: {
    width: "100%", // Make image responsive to container
    height: width - 32, // Adjust height based on container width
  },
  postFooter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  postActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  postActionsLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionIcon: {
    marginRight: 16,
  },
  likes: {
    color: COLORS.white,
    fontWeight: "600",
    marginTop: 8,
  },
  caption: {
    color: COLORS.white,
    marginTop: 4,
  },
  viewComments: {
    color: COLORS.grey,
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: Platform.OS === "android" ? 24 : 48,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.surface,
  },
  modalTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
  },
  commentsList: {
    flex: 1,
  },
  commentContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.surface,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentUsername: {
    color: COLORS.white,
    fontWeight: "500",
    marginBottom: 4,
  },
  commentText: {
    color: COLORS.white,
    fontSize: 14,
    lineHeight: 20,
  },
  commentTime: {
    color: COLORS.grey,
    fontSize: 12,
    marginTop: 4,
  },
  commentInput: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.surface,
  },

  // --- NEW STYLES FOR DETAILED TRIP CARD (ADDED BELOW) ---
  detailsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 15,
  },
  location: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  flagEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  locationLabel: {
    color: COLORS.grey,
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  locationCity: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  locationCountry: {
    color: COLORS.grey,
    fontSize: 14,
    textAlign: 'center',
  },
  airplaneIcon: {
    marginHorizontal: 10,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.surfaceLight, // Use a lighter surface color for the line
    marginVertical: 10,
  },
  infoContainer: {
    paddingHorizontal: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    color: COLORS.grey,
    marginLeft: 10,
    fontSize: 14,
  },
  descriptionContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceLight,
    marginTop: 5,
  },
  description: {
    color: COLORS.white,
    fontSize: 14,
    lineHeight: 20,
  },

  tabContainer: {
  flexDirection: 'row',
  justifyContent: 'space-around',
  backgroundColor: COLORS.background,
  paddingVertical: 10,
  borderBottomWidth: 0,
  borderBottomColor: COLORS.grey, // Or another subtle color
},
tab: {
  paddingVertical: 8,
  paddingHorizontal: 20,
  borderRadius: 20,
},
activeTab: {
  backgroundColor: COLORS.primary, // A highlight color for the active tab
},
tabText: {
  color: COLORS.white, // Default text color
  fontSize: 16,
  fontWeight: '600',
},
activeTabText: {
  color: COLORS.white, // Or a different color for active text if needed
},

contentContainer: {
  paddingHorizontal: 15,
  paddingBottom: 10,
},
productTitle: {
  fontSize: 24,
  fontWeight: 'bold',
  color: COLORS.white,
  marginBottom: 10,
},
productDetailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
},
detailChip: {
    backgroundColor: COLORS.dark,
    color: COLORS.grey,
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
    overflow: 'hidden', // for iOS
},
linkButton: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 15,
},
linkText: {
  color: COLORS.primary,
  marginLeft: 8,
  fontSize: 16,
},

// --- Financial Card Styles ---
financialsCard: {
  backgroundColor: COLORS.dark,
  borderRadius: 12,
  padding: 15,
  marginVertical: 10,
},
financialsRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginVertical: 8,
},
financialsLabel: {
  color: COLORS.grey,
  fontSize: 16,
  marginLeft: 10,
},
financialsValue: {
  color: COLORS.white,
  fontSize: 16,
  fontWeight: '500',
},
totalLabel: {
  color: COLORS.white, // Emphasize the total label
  fontSize: 16,
  fontWeight: 'bold',
  marginLeft: 10,
},
totalValue: {
  color: COLORS.primary, // Use a bright color for the total
  fontSize: 20,
  fontWeight: 'bold',
},

});

