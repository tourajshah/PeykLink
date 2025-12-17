import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { getAuthenticatedUser } from './users';

export const sendMessage = mutation ({
    args: {
        negotiationId: v.id("negotiations"),
        message: v.string(),
    },
    handler: async (ctx, args) => {
        const currentUser = await getAuthenticatedUser(ctx);

        const negotiation = await ctx.db.get(args.negotiationId);
        if (!negotiation) {
            throw new Error ("Offer not found");
        }

        if (currentUser._id !== negotiation.requesterId && currentUser._id !== negotiation.travelerId) {
            throw new Error ("You are not authorized to post in this chat.")
        }

        if (negotiation.status !== "accepted" && negotiation.status !== "paid") {
            throw new Error("You can only chat on accepted and paid offer.");
        }

        await ctx.db.insert("messages", {
            negotiationId: args.negotiationId,
            senderId: currentUser._id,
            type: "text",
            text: args.message,
        })
    }
})

export const getMessages = query ({
    args: { negotiationId: v.id("negotiations")},
    handler: async (ctx, args) => {
        return ctx.db.query("messages").withIndex("by_negotiationId", (q) => q.eq("negotiationId", args.negotiationId)).collect();
    }
})