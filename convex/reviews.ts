import { v } from 'convex/values';
import { internal } from './_generated/api';
import { Id } from './_generated/dataModel';
import { internalAction, internalMutation, internalQuery, mutation, query } from './_generated/server';
import { getAuthenticatedUser } from "./users";



export const getNotReviewedNegotiations = query({
  handler: async (ctx) => {
    const currentUser = await getAuthenticatedUser(ctx);

    // 1. Get ALL completed negotiations involving this user
    const allCompletedNegotiations = await ctx.db
      .query("negotiations")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "completed"),
          q.or(
            q.eq(q.field("requesterId"), currentUser._id),
            q.eq(q.field("travelerId"), currentUser._id)
          )
        )
      )
      .collect();

    // 2. Get all reviews WRITTEN by this user
    const userReviews = await ctx.db
      .query("reviews")
      // SUGGESTION: Add index .withIndex("by_reviewerId") to schema for speed
      .filter((q) => q.eq(q.field("reviewerId"), currentUser._id))
      .collect();

    // 3. Create Set of IDs for fast lookup
    const reviewedNegotiationIds = new Set(userReviews.map((r) => r.negotiationId));

    // 4. Filter: Keep only unreviewed negotiations
    const unreviewedList = allCompletedNegotiations.filter(
      (n) => !reviewedNegotiationIds.has(n._id)
    );

    // 5. MERGE DATA: Fetch User and Product details for the UI
    // We use Promise.all to fetch related docs in parallel
    const enrichedNegotiations = await Promise.all(
      unreviewedList.map(async (negotiation) => {
        // A. Get Product details
        const requestDoc = await ctx.db.get(negotiation.requestId);
        
        // B. Determine "The Other Person" (If I am requester, show traveler, etc.)
        const isMeRequester = negotiation.requesterId === currentUser._id;
        const otherUserId = isMeRequester ? negotiation.travelerId : negotiation.requesterId;
        const otherUserDoc = await ctx.db.get(otherUserId);

        // C. (Optional) Resolve Image URL if 'imageKey' is a storage ID
        // const productUrl = requestDoc?.imageKey ? await ctx.storage.getUrl(requestDoc.imageKey) : null;

        return {
            ...negotiation, // Keeps original ID, fee, etc.
            
            // New merged fields for UI:
            productName: requestDoc?.productName || "Unknown Item",
            productImageUrl: requestDoc?.imageKey, // Or 'productUrl' if using storage
            
            travelerName: otherUserDoc?.fullname || "User",
            userAvatarUrl: otherUserDoc?.imageURL,
        };
      })
    );

    return enrichedNegotiations;
  },
});

export const getUserReviews = query({
  args: {
    id: v.id("users")
  },

  handler: async (ctx, args) => {

    // 1. Get the raw reviews for the current user
    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_revieweeId", (q) => q.eq("revieweeId", args.id))
      .filter((q) => q.eq(q.field("status"), "public") )
      .order("desc") // Show newest reviews first
      .collect();
    
    // 2. For each review, fetch the data of the person who wrote it (the reviewer)
    const reviewsWithReviewer = await Promise.all(
      reviews.map(async (review) => {
        const reviewer = await ctx.db.get(review.reviewerId);
        return {
          review,
          reviewer, // Attach the reviewer's user document
        };
      })
    );

    return reviewsWithReviewer;
  },
});

export const getDetailsForReview = query({
  args: {
    negotiationId: v.id('negotiations'),
  },
  handler: async (ctx, args) => {
    const currentUser = await getAuthenticatedUser(ctx);
    const negotiation = await ctx.db.get(args.negotiationId);

    if (!negotiation) {
      throw new Error('Negotiation not found');
    }

    const request = await ctx.db.get(negotiation.requestId);
    if (!request) {
      throw new Error('Request associated with this negotiation not found');
    }
    
    // Determine who the other user in the transaction is
    const isReviewingTraveler = currentUser._id === negotiation.requesterId;
    const otherUserId = isReviewingTraveler ? negotiation.travelerId : negotiation.requesterId;
    const otherUser = await ctx.db.get(otherUserId);

    if (!otherUser) {
      throw new Error('Could not find the other user in this negotiation');
    }

    // By returning a structured object, the frontend will get correct types
    return { otherUser, request, isReviewingTraveler };
  },
});

// This mutation creates the review and updates the user's average rating
export const createReview = mutation({
  args: {
    negotiationId: v.id('negotiations'),
    rating: v.number(),
    comment: v.optional(v.string()),
    status: v.literal("hidden"),
    communicationRating: v.optional(v.number()),
    punctualityRating: v.optional(v.number()),
    itemConditionRating: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const currentUser = await getAuthenticatedUser(ctx);
    const negotiation = await ctx.db.get(args.negotiationId);

    // === SECURITY CHECKS ===
    if (!negotiation) throw new Error('Negotiation not found');
    if (negotiation.status !== 'completed') throw new Error('Reviews can only be left for completed deals.');
    if (currentUser._id !== negotiation.requesterId && currentUser._id !== negotiation.travelerId) {
      throw new Error('You are not a participant in this deal.');
    }
    
    // Determine who is being reviewed
    // const revieweeId = currentUser._id === negotiation.requesterId ? negotiation.travelerId : negotiation.requesterId;

    let revieweeId: Id<"users">;
    let revieweeRole: "traveler" | "requester";

    if (currentUser._id === negotiation.requesterId) {
      // current user is requester ---> is reviewing the traveler
      revieweeId = negotiation.travelerId
      revieweeRole = "traveler"
    } else {
      // current user is traveler ---> is reviewing the requester 
      revieweeId = negotiation.requesterId
      revieweeRole = "requester"
    }

    // Prevent duplicate reviews
    const existingReview = await ctx.db
      .query('reviews')
      .withIndex('by_negotiationId', (q) => q.eq('negotiationId', args.negotiationId))
      .filter((q) => q.eq(q.field('reviewerId'), currentUser._id))
      .first();

    if (existingReview) {
      throw new Error('You have already submitted a review for this deal.');
    }

    // 1. Create the new review document
    await ctx.db.insert('reviews', {
      negotiationId: args.negotiationId,
      reviewerId: currentUser._id,
      revieweeId: revieweeId,
      revieweeRole: revieweeRole,
      rating: args.rating,
      comment: args.comment,
      status: "hidden",
      createdAt: Date.now(),
      communicationRating: args.communicationRating,
      punctualityRating: args.punctualityRating,
      itemConditionRating: args.itemConditionRating,
    });

    const calculateStats = (reviews: any[]) => {
      if (reviews.length === 0) return {
        rating: 0,
        communicationRating: undefined,
        punctualityRating: undefined,
        itemConditionRating: undefined,
      };

      const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
      
      // Calculate Average for a specific set of reviews

      const getAvg = (field: string) => {
        const valid = reviews.filter((r) => (r[field] || 0) > 0)
        if (valid.length === 0) return undefined;
        const sum = valid.reduce((acc, r) => acc + (r[field] || 0), 0)
        return parseFloat((sum / valid.length).toFixed(2));
      };

      return {
        rating: parseFloat((totalRating / reviews.length).toFixed(2)),
        communicationRating: getAvg("communicationRating"),
        punctualityRating: getAvg("punctualityRating"),
        itemConditionRating: getAvg("itemConditionRating"),
      }
    }

    // Fetch All Reviews for this User to update "Global" stats
    
    const allReviewsForUser = await ctx.db
      .query('reviews')
      .withIndex('by_revieweeId', (q) => q.eq('revieweeId', revieweeId))
      .collect();

    // const totalRating = allReviewsForUser.reduce((sum, review) => sum + review.rating, 0);
    // const averageRating = totalRating / allReviewsForUser.length;

    // Fetch Role-Specific Reviews (Traveler OR Requester)
    // We filter the 'allReviews' array in memory to save DB calls, 
    // since we already fetched everything for the global stat.

    const roleReviews = allReviewsForUser.filter(r => r.revieweeRole === revieweeRole)

    // Calculate Stats

    const globalStats = calculateStats(allReviewsForUser);
    const roleStats = calculateStats(roleReviews);

    // Construct the Patch Object

    const patchData : any = {
      rating: globalStats.rating,
      communicationRating: globalStats.communicationRating,
      punctualityRating: globalStats.punctualityRating,
      itemConditionRating: globalStats.itemConditionRating
    }

    // Update the specific role rating field

    if (revieweeRole === "traveler") {
      patchData.asTravelerRating = roleStats.rating;
    } else {
      patchData.asRequesterRating = roleStats.rating;
    }

    await ctx.db.patch(revieweeId, patchData);

    return { success: true };
  },
});


export const makeReviewsPublic = internalAction({
  args: {},
  handler: async (ctx) => {
    // review date (> 3 days ago)
    const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
    const reviewDate = Date.now() - THREE_DAYS_MS;
    
    // query to find reviews that are older than 3 days
    const reviewBucket = await ctx.runQuery(internal.reviews.reviewBucket, {reviewDate})

    console.log(`Janitor Found ${reviewBucket.length} hidden reviews that are more than 3 days old to share and make public.`)

    for (const review of reviewBucket) {
      try {
        // change status
        await ctx.runMutation(internal.reviews.changeReviewStatus, {reviewId: review._id});

        console.log(`Changed status of review ${review._id}`);

      } catch (error) {

        console.error(`Failed to change status of review ${review._id}:`, error);
      }
    }
  }
})

export const reviewBucket = internalQuery({
  args: { reviewDate: v.float64() },
  handler: async (ctx, args) => {
    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_status", (q) => q.eq("status", "hidden"))
      .collect();

      // if number of reviews are getting larger , make a new index to schema
    return reviews.filter((r) => (r.createdAt || 0) < args.reviewDate);

  },
})

export const changeReviewStatus = internalMutation({
  args: { reviewId: v.id("reviews") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.reviewId, {status: "public"})
  }
})