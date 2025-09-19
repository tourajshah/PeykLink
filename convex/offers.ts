// convex/offers.ts

import { Id } from "./_generated/dataModel";
import { query } from "./_generated/server";
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
            };
        });

        // --- Step 7: Filter out nulls and sort ---
        return threads
            .filter((thread): thread is NonNullable<typeof thread> => thread !== null)
            .sort((a, b) => b.latestOffer._creationTime - a.latestOffer._creationTime);
    },
});