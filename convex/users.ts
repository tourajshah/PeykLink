import { v } from "convex/values";
import { mutation, MutationCtx, query, QueryCtx, } from "./_generated/server";

export const createUser = mutation({
    args:{
        username: v.string(),
        fullname: v.string(),
        email: v.string(),
        bio: v.optional(v.string()),
        imageURL: v.string(),
        clerkId: v.string(),
    },

    handler: async(ctx, args) => {


        const existingUser = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
            .first()

        if (existingUser) return
        
        await ctx.db.insert("users", {
            username: args.username,
            fullname: args.fullname,
            email: args.email,
            bio: args.bio,
            imageURL: args.imageURL,
            rating: 0,
            asTravelerRating : 0,
            asRequesterRating: 0,
            communicationRating: 0,
            punctualityRating: 0,
            itemConditionRating: 0,
            clerkId: args.clerkId,
            completedOrders: 0,
            travelerCompletedOrders: 0,
            requesterCompletedOrders: 0,
            walletBalance: 0,
            isVerified: false,
        })
    }
  
});


export const getUserByClerkId = query({
    args: { clerkId: v.string() },
    handler: async (ctx, args) => {

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
            .unique()
            
        return user

    }
})



export async function getAuthenticatedUser(ctx: QueryCtx | MutationCtx) {
    
    const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
            .first()

        if (!currentUser) throw new Error("User not found")
    
        return currentUser
}



export const updateProfile = mutation ({
    args: {
        fullname: v.string(),
        bio: v.optional(v.string()),

    },
    handler: async (ctx, args) => {

        const currentUser = await getAuthenticatedUser(ctx);

        await ctx.db.patch(currentUser._id, {
            fullname: args.fullname,
            bio: args.bio,
        })
    },
})


export const getUserProfile = query({
    args: {id: v.id("users")},
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.id)

        if(!user) throw new Error ("User not found")
        
        return user;
    }
})


export const checkUserHasMatchingTrip = query({
    args: {
        originCountry: v.string(),
        destinationCountry: v.string(),
    },
    handler: async (ctx, args) => {
        const currentUser = await getAuthenticatedUser(ctx);
        if (!currentUser) {
            return false
        }

        const matchingTrip = await ctx.db 
            .query("trips")
            .withIndex("by_travelerId", (q) => q.eq("travelerId", currentUser._id))
            .filter((q) =>
                q.and(
                    q.eq(q.field("originCountry"), args.originCountry,),
                    q.eq(q.field("destinationCountry"), args.destinationCountry)
                )
            )
            .first();

        return matchingTrip !== null;
    }
})


export const getUserStats = query({
    args: {id: v.id("users")},
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.id)
        if (!user) {
            return false
        }

        const userCompletedOrders = user.completedOrders
        const userAsTravelerCompletedOrders = user.travelerCompletedOrders
        const userAsRequesterCompletedOrders = user.requesterCompletedOrders
        const userRating = user.rating
        const userAsTravelerRating = user.asTravelerRating
        const userAsRequesterRating = user.asRequesterRating
        const userCommRating = user.communicationRating
        const userPuncRating = user.punctualityRating
        const userItemRating = user.itemConditionRating
        const userCreationTime = user._creationTime

        return {
            userCompletedOrders,
            userRating,
            userCreationTime,
            userAsTravelerCompletedOrders,
            userAsRequesterCompletedOrders,
            userAsTravelerRating,
            userAsRequesterRating,
            userCommRating,
            userPuncRating,
            userItemRating,
        }

    }
})