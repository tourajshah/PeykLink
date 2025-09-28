// convex/offers.ts
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { getAuthenticatedUser } from "./users";

export const getMyOfferThreads = query({
    args: {},
    handler: async (ctx) => {
        const currentUser = await getAuthenticatedUser(ctx);

        // --- Step 1: Fetch all offers involving the current user ---
        const offersAsRequester = await ctx.db
            .query("offers")
            .filter((q) => q.eq(q.field("requesterId"), currentUser._id))
            .collect();

        const offersAsTraveler = await ctx.db
            .query("offers")
            .filter((q) => q.eq(q.field("travelerId"), currentUser._id))
            .collect();

        const allUserOffers = [...offersAsRequester, ...offersAsTraveler];
        if (allUserOffers.length === 0) {
            return [];
        }

        // --- Step 2: Collect all unique IDs needed for subsequent queries ---
        const requestIds = new Set<Id<"requests">>();
        const tripIds = new Set<Id<"trips">>();
        const userIds = new Set<Id<"users">>();

        allUserOffers.forEach(offer => {
            requestIds.add(offer.requestId);
            tripIds.add(offer.tripId);
            userIds.add(offer.requesterId);
            userIds.add(offer.travelerId);
        });

        // --- Step 3: Fetch all related documents in three efficient bulk queries ---
        const requests = await ctx.db
            .query("requests")
            .filter(q => q.or(...Array.from(requestIds).map(id => q.eq(q.field("_id"), id))))
            .collect();

        const trips = await ctx.db
            .query("trips")
            .filter(q => q.or(...Array.from(tripIds).map(id => q.eq(q.field("_id"), id))))
            .collect();

        const users = await ctx.db
            .query("users")
            .filter(q => q.or(...Array.from(userIds).map(id => q.eq(q.field("_id"), id))))
            .collect();

        // --- Step 4: Create Maps for fast lookups (O(1) access) ---
        const requestsMap = new Map(requests.map(r => [r._id.toString(), r]));
        const tripsMap = new Map(trips.map(t => [t._id.toString(), t]));
        const usersMap = new Map(users.map(u => [u._id.toString(), u]));
        
        // --- Step 5: Group offers into threads (same logic as before) ---
        const offersByThread = new Map<string, any[]>();
        for (const offer of allUserOffers) {
            const otherUserId = offer.requesterId === currentUser._id
                ? offer.travelerId
                : offer.requesterId;
            const threadKey = `${offer.requestId.toString()}-${otherUserId.toString()}`;

            if (!offersByThread.has(threadKey)) {
                offersByThread.set(threadKey, []);
            }
            offersByThread.get(threadKey)!.push(offer);
        }

        // --- Step 6: Assemble the final threads using the pre-fetched data ---
        const threads = Array.from(offersByThread.values()).map((offers) => {
            const latestOffer = offers.sort((a, b) => b._creationTime - a._creationTime)[0];

            // Look up data from our maps - NO 'await' needed!
            const request = requestsMap.get(latestOffer.requestId.toString());
            const trip = tripsMap.get(latestOffer.tripId.toString());
            
            const otherUserId = latestOffer.requesterId === currentUser._id
                ? latestOffer.travelerId
                : latestOffer.requesterId;
            const otherUser = usersMap.get(otherUserId.toString());

            // If any piece of data is missing, we skip this thread entirely.
            if (!request || !trip || !otherUser) {
                // For debugging: You can log which part is missing
                // console.log(`Skipping thread. Missing data:`, { hasRequest: !!request, hasTrip: !!trip, hasOtherUser: !!otherUser });
                return null;
            }

            return {
                _id: request._id.toString(),
                requestDetails: { productName: request.productName },
                tripDetails: {
                    originCity: trip.originCity,
                    destinationCity: trip.destinationCity,
                    arrivalDate: trip.arrivalDate,
                },
                otherUser: {
                    _id: otherUser._id,
                    username: otherUser.username,
                    image: otherUser.imageURL,
                },
                latestOffer: latestOffer,
                offerCount: offers.length,
                requester: latestOffer.requesterId.toString(),
                traveler: latestOffer.travelerId.toString()
            };
        });

        // --- Step 7: Filter out nulls and sort ---
        return threads
            .filter((thread): thread is NonNullable<typeof thread> => thread !== null)
            .sort((a, b) => b.latestOffer._creationTime - a.latestOffer._creationTime);
    },
});

// FOR BUBBLE OFFER AND COUNTER OFFER DETAILS.

export const getOfferThreadDetails = query({
    args: {
        requestId: v.id("requests"),
    },
    handler: async (ctx, args) => {
        // 1. Fetch the core request document
        const request = await ctx.db.get(args.requestId);
        if (!request) {
            throw new Error("Request not found");
        }

        // 2. Fetch ALL offers for this request, sorted by creation time
        const offers = await ctx.db
            .query("offers")
            .withIndex("by_requestId", q => q.eq("requestId", args.requestId))
            .order("asc") // Sort ascending to get the history in chronological order
            .collect();

        if (offers.length === 0) {
            throw new Error("No offers found for this request");
        }
        
        // 3. From the request and offers, we know all the key players
        const requesterId = request.requesterId;
        const travelerId = offers[0].travelerId; // travelerId is the same on all offers in a thread
        const tripId = offers[0].tripId;

        // 4. Fetch all related documents in parallel for efficiency
        const [requester, traveler, trip] = await Promise.all([
            ctx.db.get(requesterId),
            ctx.db.get(travelerId),
            ctx.db.get(tripId),
        ]);

        // 5. Return everything in one convenient package for the frontend
        return {
            request,
            offers, // The full history
            requester,
            traveler,
            trip,
        };
    },
});


export const createCounterOffer = mutation({
    args: {
        requestId: v.id("requests"),
        newFee: v.number(),
    },
    handler: async (ctx, args) => {
        const currentUser = await getAuthenticatedUser(ctx);

        // Find the latest offer to get context (IDs, etc.)
        const latestOffer = await ctx.db
            .query("offers")
            .withIndex("by_requestId", q => q.eq("requestId", args.requestId))
            .order("desc")
            .first();

        if (!latestOffer) {
            throw new Error("No existing offer found to counter.");
        }

        // Create a brand new offer document for the counter-proposal
        await ctx.db.insert("offers", {
            requestId: latestOffer.requestId,
            tripId: latestOffer.tripId,
            requesterId: latestOffer.requesterId,
            travelerId: latestOffer.travelerId,
            senderId: currentUser._id, // The current user is the sender of this counter-offer
            proposedFee: args.newFee,
            creatorId: latestOffer.creatorId,
            status: "pending", // All new offers are pending
        });
    },
});

/**
 * Accepts the latest offer in a thread.
 * This ends the negotiation successfully.
 */
export const acceptOffer = mutation({
    args: { offerId: v.id("offers") },
    handler: async (ctx, args) => {
        const currentUser = await getAuthenticatedUser(ctx);
        const acceptedOffer = await ctx.db.get(args.offerId);

        if (!acceptedOffer) {
            throw new Error("Offer not found.");
        }
        // Security Check: Only the recipient can accept the offer.
        if (acceptedOffer.senderId === (currentUser._id)) {
            throw new Error("You cannot accept your own offer.");
        }

        // 1. Mark the accepted offer as "accepted"
        await ctx.db.patch(args.offerId, { status: "accepted" });

        // 2. Mark the parent request as "confirmed"
        await ctx.db.patch(acceptedOffer.requestId, { status: "confirmed" });
        
        // (Future Step): Here you would create an `order` and initiate payment.
    },
});

/**
 * Rejects the latest offer (Traveler's action).
 * This effectively ends the negotiation.
 */
export const rejectOffer = mutation({
    args: { offerId: v.id("offers") },
    handler: async (ctx, args) => {
        const currentUser = await getAuthenticatedUser(ctx);
        const rejectedOffer = await ctx.db.get(args.offerId);

        if (!rejectedOffer) { throw new Error("Offer not found."); }

        // Security Check: Only the traveler can reject the initial offer.
        if (rejectedOffer.travelerId !== (currentUser._id)) {
            throw new Error("Only the traveler can reject this offer.");
        }
        
        await ctx.db.patch(args.offerId, { status: "rejected" });
        // You might also want to change the request status back to "active"
        await ctx.db.patch(rejectedOffer.requestId, { status: "active" });
    },
});


/**
 * Cancels the entire request and all associated offers (Requester's action).
 */
export const cancelOffer = mutation({
    args: { requestId: v.id("requests") },
    handler: async (ctx, args) => {
        const currentUser = await getAuthenticatedUser(ctx);
        const request = await ctx.db.get(args.requestId);

        if (!request) { throw new Error("Request not found."); }

        // Security Check: Only the requester can cancel their own request.
        if (request.requesterId !==(currentUser._id)) {
            throw new Error("You are not authorized to cancel this request.");
        }

        // 1. Cancel the parent request
        await ctx.db.patch(args.requestId, { status: "cancelled" });

        // 2. Find all offers for this request and cancel them too
        const offers = await ctx.db.query("offers").withIndex("by_requestId", q => q.eq("requestId", args.requestId)).collect();
        for (const offer of offers) {
            await ctx.db.patch(offer._id, { status: "cancelled" });
        }
    },
});

export const createInitialOffer = mutation({
    // We need all the request arguments, PLUS the tripId for the offer
    args: {
        // same args from createRequest
        requestId: v.id("requests"),
        tripId: v.id("trips"),
        proposedFee: v.number()

    },
    handler: async (ctx, args) => {
        const currentUser = await getAuthenticatedUser(ctx);

        const request = await ctx.db.get(args.requestId);
        if (!request) {
          throw new Error("Request not found");
        }

        await ctx.db.insert("offers", {
            requestId: args.requestId,
            tripId: args.tripId,
            requesterId: request.requesterId,
            travelerId: currentUser._id,
            proposedFee: args.proposedFee, // The initial offer uses the fee from the form
            senderId: currentUser._id,
            creatorId: currentUser._id,
            status: "pending",
        });

        // Return the new requestId so we can navigate if needed
        return args.requestId;
    },
});

