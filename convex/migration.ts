import { mutation } from "./_generated/server";

export const addRequesterFields = mutation({
  args: {},
  handler: async (ctx) => {
    // 1. Get all users
    const users = await ctx.db.query("users").collect();

    // 2. Loop through them and update if missing
    for (const user of users) {
      if (user.requesterCompletedOrders === undefined) {
        await ctx.db.patch(user._id, {
          requesterCompletedOrders: 0, // Default value
          travelerCompletedOrders: 0,  // Default value
          isVerified: false,           // Default value
          walletBalance: 0,            // Default value
        });
      }
    }
    return `Updated ${users.length} users`;
  },
});