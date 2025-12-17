// convex/offers.ts
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { getAuthenticatedUser } from "./users";

export const getMyOfferThreads = query({
    args: {},
    handler: async (ctx) => {
        const currentUser = await getAuthenticatedUser(ctx);

        // --- Step 1: Fetch all negotiations involving the current user ---
        const negotiationsAsRequester = await ctx.db
            .query("negotiations")
            .filter((q) => q.eq(q.field("requesterId"), currentUser._id))
            .collect();

        const negotiationsAsTraveler = await ctx.db
            .query("negotiations")
            .filter((q) => q.eq(q.field("travelerId"), currentUser._id))
            .collect();

        const allUserNegotiations = [...negotiationsAsRequester, ...negotiationsAsTraveler];
        if (allUserNegotiations.length === 0) {
            return [];
        }

        // --- Step 2: Collect all unique IDs for efficient fetching ---
        const requestIds = new Set<Id<"requests">>();
        const tripIds = new Set<Id<"trips">>();
        const userIds = new Set<Id<"users">>();

        allUserNegotiations.forEach(negotiation => {
            requestIds.add(negotiation.requestId);
            tripIds.add(negotiation.tripId);
            userIds.add(negotiation.requesterId);
            userIds.add(negotiation.travelerId);
        });
        
        if (requestIds.size === 0) {
            return [];
        }

        // --- Step 3: Fetch all related documents in bulk queries ---
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

        // --- Step 4: Create Maps for fast lookups ---
        const requestsMap = new Map(requests.map(r => [r._id.toString(), r]));
        const tripsMap = new Map(trips.map(t => [t._id.toString(), t]));
        const usersMap = new Map(users.map(u => [u._id.toString(), u]));
        
        // --- Step 4.5 (NEW): Efficiently fetch and group all relevant offers ---
        const negotiationIds = allUserNegotiations.map(n => n._id);
        const allOffers = await ctx.db
            .query("offers")
            .filter(q => q.or(...negotiationIds.map(id => q.eq(q.field("threadId"), id))))
            .collect();

        // Group offers by their negotiation thread ID for quick lookup
        const offersByNegotiationIdMap = new Map<string, any[]>();
        for (const offer of allOffers) {
            const threadId = offer.threadId.toString();
            if (!offersByNegotiationIdMap.has(threadId)) {
                offersByNegotiationIdMap.set(threadId, []);
            }
            offersByNegotiationIdMap.get(threadId)!.push(offer);
        }

        // --- Step 5 (REVISED): Assemble the final threads directly ---
        const threads = allUserNegotiations.map((negotiation) => {
            // Look up related data from our pre-fetched maps.
            const request = requestsMap.get(negotiation.requestId.toString());
            const trip = tripsMap.get(negotiation.tripId.toString());
            
            const otherUserId = negotiation.requesterId === currentUser._id
                ? negotiation.travelerId
                : negotiation.requesterId;
            const otherUser = usersMap.get(otherUserId.toString());

            // Find the latest offer for this specific negotiation.
            const offersForThisThread = offersByNegotiationIdMap.get(negotiation._id.toString()) || [];
            if (offersForThisThread.length === 0) {
                return null; // A negotiation should always have at least one offer.
            }
            const latestOffer = offersForThisThread.sort((a, b) => b._creationTime - a._creationTime)[0];

            if (!request || !trip || !otherUser) {
                return null;
            }

            // Construct the final object with the correct shape the frontend expects.
            return {
                negotiation,
                latestOffer,
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
            };
        });

        // --- Step 6: Filter out any nulls and sort the threads ---
        return threads
            .filter((thread): thread is NonNullable<typeof thread> => thread !== null)
            // Sort by the LATEST offer's creation time to show the most recently active threads first.
            .sort((a, b) => b.latestOffer._creationTime - a.latestOffer._creationTime);
    },
});

// FOR BUBBLE OFFER AND COUNTER OFFER DETAILS.

export const getOfferThreadDetails = query({
    args: {
        negotiationId: v.id("negotiations"),
    },
    handler: async (ctx, args) => {
        // 1. Fetch the core request document
        const negotiation = await ctx.db.get(args.negotiationId);
        if (!negotiation) {
            throw new Error("Negotiation not found");
        }

        // 2. Fetch ALL offers for this request, sorted by creation time
        const offers = await ctx.db
            .query("offers")
            .withIndex("by_threadId", q => q.eq("threadId", negotiation._id))
            .order("asc") // Sort ascending to get the history in chronological order
            .collect();

        if (offers.length === 0) {
            throw new Error("No offers found for this request");
        }
        
        // 3. From the request and offers, we know all the key players
        const requesterId = negotiation.requesterId;
        const travelerId = negotiation.travelerId; // travelerId is the same on all offers in a thread
        const tripId = negotiation.tripId;
        const requestId = negotiation.requestId;

        // 4. Fetch all related documents in parallel for efficiency
        const [requester, request, traveler, trip] = await Promise.all([
            ctx.db.get(requesterId),
            ctx.db.get(requestId),
            ctx.db.get(travelerId),
            ctx.db.get(tripId),
        ]);

        // 5. Return everything in one convenient package for the frontend
        return {
            negotiation,
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
        negotiationId: v.id("negotiations"),
        newFee: v.number(),
    },
    handler: async (ctx, args) => {
        const currentUser = await getAuthenticatedUser(ctx);
        const negotiation = await ctx.db.get(args.negotiationId)

        if (!negotiation) {
            throw new Error ("Negotiation Not Found")
        }

        if (currentUser._id !== negotiation.requesterId && currentUser._id !== negotiation.travelerId ) {
            throw new Error ("You are not part of this Negotiation.")
        }


        // Find the latest offer to get context (IDs, etc.)
        const latestOffer = await ctx.db
            .query("offers")
            .withIndex("by_threadId", q => q.eq("threadId", args.negotiationId))
            .order("desc")
            .first();

        if (!latestOffer) {
            throw new Error("No existing offer found to counter.");
        }

        if (currentUser._id === latestOffer.senderId) {
            throw new Error ("You cannot make an Counter Offer for your offer, wait for respond of the other participant")
        }

        // Create a brand new offer document for the counter-proposal
        await ctx.db.insert("offers", {
            threadId: latestOffer.threadId,
            senderId: currentUser._id, // The current user is the sender of this counter-offer
            proposedFee: args.newFee,
        });

        await ctx.db.patch(negotiation._id ,{
            proposedFee: args.newFee
        })
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

        const negotiation = await ctx.db.get(acceptedOffer.threadId)

        if (!negotiation) {
            throw new Error("Negotiation thread not found.")
        }

        if (acceptedOffer.senderId === currentUser._id) {
            throw new Error("You cannot accept your own offer.")
        }

        // 1. Mark the accepted offer as "accepted"
        await ctx.db.patch(negotiation._id, { 
            status: "accepted", 
            proposedFee: acceptedOffer.proposedFee
        });

        // 2. Mark the parent request as "confirmed"
        await ctx.db.patch(negotiation.requestId, { status: "completed" });
        
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

        const negotiation = await ctx.db.get(rejectedOffer.threadId)

        if (!negotiation) {
            throw new Error("Negotiation thread not found.")
        }

        // Security Check: Only the traveler can reject the initial offer.
        if (rejectedOffer.senderId === currentUser._id) {
            throw new Error("You cannot Reject your own offer");
        }
        
        await ctx.db.patch(negotiation._id, { 
            status: "rejected", 
            proposedFee: rejectedOffer.proposedFee
        });
        // You might also want to change the request status back to "active"
        await ctx.db.patch(negotiation.requestId, { status: "pending" });
    },
});


/**
 * Cancels the entire request and all associated offers (Requester's action).
 */
export const cancelOffer = mutation({
    args: { offerId: v.id("offers") },
    handler: async (ctx, args) => {
        const currentUser = await getAuthenticatedUser(ctx);
        const cancelledOffer = await ctx.db.get(args.offerId);

        if (!cancelledOffer) { throw new Error("Offer not found."); }

        const negotiation = await ctx.db.get(cancelledOffer.threadId)

        if (!negotiation) {
            throw new Error("Negotiation thread not found.")
        }

        // Security Check: Only the traveler can reject the initial offer.
        if (negotiation.creatorId !== currentUser._id) {
            throw new Error("You cannot cancel offer that is not yours");
        }
        
        await ctx.db.patch(negotiation._id, { 
            status: "cancelled", 
            proposedFee: cancelledOffer.proposedFee
        });
        // You might also want to change the request status back to "active"
        await ctx.db.patch(negotiation.requestId, { status: "pending" });
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
        const trip = await ctx.db.get(args.tripId);

        if (!request) {
          throw new Error("Request not found");
        }

        if (!trip) {
          throw new Error("Trip not found");
        }

        const checkDuplicateNegotiation = await ctx.db
            .query('negotiations')
            .withIndex("by_tripId", (q) => q.eq("tripId", args.tripId))
            .filter((q) =>
                q.and(
                    q.eq(q.field("requestId"), args.requestId),
                    q.and(q.neq(q.field("status"), "rejected"), q.neq(q.field("status"), "cancelled"))
                )
            )
            .collect()
                
        if(checkDuplicateNegotiation.length > 0){
            return {
                success: false,
                reason: "DUPLICATE_OFFER",
                negotiationId: checkDuplicateNegotiation[0]._id
            }
        }


        const negotiationId = await ctx.db.insert("negotiations", {
            requestId: args.requestId,
            tripId: args.tripId,
            requesterId: request.requesterId,
            travelerId: trip.travelerId,
            proposedFee: args.proposedFee, // The initial offer uses the fee from the form
            creatorId: currentUser._id,
            status: "pending",
        });

        const offerId = await ctx.db.insert("offers", {
            threadId: negotiationId,
            proposedFee: args.proposedFee, // The initial offer uses the fee from the form
            senderId: currentUser._id,
        });

        // Return the new requestId so we can navigate if needed
        return {
            success: true,
            negotiationId
        }
    },
});

