import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { getAuthenticatedUser } from "./users";



export const getNotReviewedNegotiations = query({
    handler: async (ctx) => {
        const currentUser = await getAuthenticatedUser(ctx)

        const allCompeletedNegotiations = await ctx.db
        .query("negotiations")
        .filter((q) =>
            q.and(
                q.eq(q.field("status"), "completed"),
                q.or(
                    q.eq(q.field("requesterId"), currentUser._id),
                    q.eq(q.field("travelerId"), currentUser._id )
                )

            )
        )
        .collect()

        const userReviews = await ctx.db
        .query("reviews")
        .filter((q) => 
            q.eq(q.field("reviewerId"), currentUser._id))
        .collect()
        
        const reviewedNegotiationsIds = new Set(userReviews.map(review => review.negotiationId))

        const notReviewedNegotiations = allCompeletedNegotiations.filter(
            (negotiation) => !reviewedNegotiationsIds.has(negotiation._id)
        )

        return notReviewedNegotiations

    }
}) 

export const getUserReviews = query({
  handler: async (ctx) => {
    const currentUser = await getAuthenticatedUser(ctx);

    // 1. Get the raw reviews for the current user
    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_revieweeId", (q) => q.eq("revieweeId", currentUser._id))
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
    overallRating: v.number(),
    comment: v.optional(v.string()),
    communicationRating: v.number(),
    punctualityRating: v.number(),
    itemConditionRating: v.number(),
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
    const revieweeId = currentUser._id === negotiation.requesterId ? negotiation.travelerId : negotiation.requesterId;

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
      rating: args.overallRating,
      comment: args.comment,
    });

    // 2. Recalculate and update the average rating for the user who was reviewed
    const allReviewsForUser = await ctx.db
      .query('reviews')
      .withIndex('by_revieweeId', (q) => q.eq('revieweeId', revieweeId))
      .collect();

    const totalRating = allReviewsForUser.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / allReviewsForUser.length;

    await ctx.db.patch(revieweeId, {
      rating: parseFloat(averageRating.toFixed(2)),
    });

    return { success: true };
  },
});
