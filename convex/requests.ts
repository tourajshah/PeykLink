import { cityData } from '@/constants/cityData';
import { R2 } from '@convex-dev/r2';
import { v } from "convex/values";
import { components, internal } from './_generated/api';
import { internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { getAuthenticatedUser } from "./users";

const r2 = new R2(components.r2)

export const generateUploadUrl = mutation(async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    return await ctx.storage.generateUploadUrl();
});


export const createRequest = mutation({
    args:{
        productName: v.string(),
        productURL: v.optional(v.string()),
        imageKey: v.optional(v.string()),
        productWeight: v.optional(v.string()),
        quantity: v.number(),
        itemPrice: v.number(),
        travelerFee: v.number(),
        originCountry: v.string(),
        originCity: v.string(),
        destinationCountry: v.string(), 
        destinationCity: v.string(),
        requiredByDate: v.float64(),
        description: v.optional(v.string()),
        itemTypes: v.optional(v.string()),
        visibility: v.union(v.literal("public"), v.literal("direct")),
        targetedTravelerId: v.optional(v.id("users"))
    },

    handler: async (ctx,args) => {
        
        const currentUser = await getAuthenticatedUser(ctx)

        // createRequest

        const requestId = await ctx.db.insert("requests", {
            requesterId: currentUser._id,
            productName: args.productName,
            productURL: args.productURL,
            imageKey: args.imageKey,
            productWeight: args.productWeight,
            quantity: args.quantity,
            itemPrice: args.itemPrice,
            travelerFee: args.travelerFee,
            originCountry: args.originCountry,
            originCity: args.originCity,
            destinationCountry: args.destinationCountry, 
            destinationCity: args.destinationCity,
            requiredByDate: args.requiredByDate,
            status: "pending",
            description: args.description,
            itemTypes: args.itemTypes,
            visibility: args.visibility,
            targetedTravelerId: args.targetedTravelerId
        });
        
        return requestId;
    },

});

export const getFeedRequests = query ({
    handler: async(ctx) => {

        const currentUser = await getAuthenticatedUser(ctx)

        // get all requests form db that are public and still active (pending)

        const requests = await ctx.db
          .query("requests")
          .filter((q) => q.and (q.eq(q.field("visibility"), "public"), q.eq(q.field("status"), "pending")))
          .order("desc")
          .collect()

        if(requests.length === 0) return []


        // get other data

        const requestsWithInfo = await Promise.all(
            
            requests.map(async(request) => {

                const requestCreator = (await ctx.db.get(request.requesterId))!

                if(!requestCreator) {
                  return null
                }

                const originCityInfo = cityData.find(c => c.name === request.originCity && c.country === request.originCountry);
                const destinationCityInfo = cityData.find(c => c.name === request.destinationCity && c.country === request.destinationCountry);

                return {
                    ...request,

                    originCountryCode: originCityInfo?.countryCode ?? '', // fallback
                    destinationCountryCode: destinationCityInfo?.countryCode ?? '', // fallback

                    requester:{
                        _id:requestCreator._id as string,
                        username: requestCreator.username,
                        image: requestCreator?.imageURL,
                        asRequesterRating: requestCreator?.asRequesterRating
                    },

                }

            })

        )

        return requestsWithInfo.filter((request): request is NonNullable<typeof request> => request !== null)
    },
});


export const deleteRequest = mutation({
    args:{requestId:v.id("requests")},
    handler: async (ctx, args) => {

        const currentUser = await getAuthenticatedUser(ctx)

        const request = await ctx.db.get(args.requestId)
        if (!request) throw new Error("Requests not found")


        // verify ownership

        if(request.requesterId !== currentUser._id) throw new Error ("Not authorized to delete this request")

        // delete request

        await ctx.db.patch(args.requestId, {status : "deleted", deletedAt : Date.now()})
        
    }
})


export const getMyRequests = query({
  args: {
    statuses: v.optional(v.array(v.string()))
  },
  handler: async (ctx, args) => {
    const currentUser = await getAuthenticatedUser(ctx);

    if (!currentUser) {
      return [];
    }

    let requestsQuery = ctx.db
      .query("requests")
      // Use the internal user _id to filter, which is the correct reference
      .withIndex("by_requesterId", (q) => q.eq("requesterId", currentUser._id))

    if (args.statuses && args.statuses.length > 0) {

      const statusToFilter = args.statuses;
      
      requestsQuery = requestsQuery.filter((q) => 
        q.or(
          ...statusToFilter.map(status => q.eq(q.field("status"), status))
        )
      );
    }

    const userRequests = await requestsQuery.order('desc').collect();

    const myRequestsWithInfo = userRequests.map((request) => {
      const originCityInfo = cityData.find(c => c.name === request.originCity && c.country === request.originCountry);
      const destinationCityInfo = cityData.find(c => c.name === request.destinationCity && c.country === request.destinationCountry);

      return {
        ...request,
        originCountryCode: originCityInfo?.countryCode ?? '',
        destinationCountryCode: destinationCityInfo?.countryCode ?? '',
        requester: {
          _id: currentUser._id,
          username: currentUser.username,
          image: currentUser.imageURL
        },
      };
    });
    
    return myRequestsWithInfo;
  },
});


export const updateRequest = mutation({
  args: {
    requestId: v.id("requests"),
    productURL: v.optional(v.string()),
    quantity: v.number(),
    travelerFee: v.number(),
    requiredByDate: v.float64(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {

    const currentUser = await getAuthenticatedUser(ctx)

    const request = await ctx.db.get(args.requestId)

    if(!request) {
      throw new Error ("Request not found")
    }

    if(request.requesterId !== currentUser._id) {
      throw new Error ("You are not authorized to update this request.")
    }

    const updates: {
      productURL?: string,
      quantity?: number,
      travelerFee?: number,
      requiredByDate?: number,
      description?: string,
    } = {}

    if(args.quantity !== undefined) updates.quantity = args.quantity
    if(args.travelerFee !== undefined) updates.travelerFee = args.travelerFee
    if(args.productURL !== undefined) updates.productURL = args.productURL
    if(args.requiredByDate !== undefined) updates.requiredByDate = args.requiredByDate
    if(args.description !== undefined) updates.description = args.description
    
    await ctx.db.patch(request._id, updates);

    return { success: true};
  },
});


export const createDirectRequestAndOffer = mutation({
    // We need all the request arguments, PLUS the tripId for the offer
    args: {
        // same args from createRequest
        productName: v.string(),
        productURL: v.optional(v.string()),
        imageKey: v.optional(v.string()),
        productWeight: v.optional(v.string()),
        quantity: v.number(),
        itemPrice: v.number(),
        travelerFee: v.number(),
        originCountry: v.string(),
        originCity: v.string(),
        destinationCountry: v.string(),
        destinationCity: v.string(),
        requiredByDate: v.float64(),
        description: v.optional(v.string()),
        itemTypes: v.optional(v.string()),
        
        visibility: v.literal("direct"), // This will always be "direct"
        targetedTravelerId: v.id("users"), // This is now required, not optional

        // The new required field for creating the offer
        tripId: v.id("trips"),
    },
    handler: async (ctx, args) => {
        const currentUser = await getAuthenticatedUser(ctx);

        // --- PART 1: Create the Direct Request ---
        const requestId = await ctx.db.insert("requests", {
            requesterId: currentUser._id,
            productName: args.productName,
            productURL: args.productURL,
            imageKey: args.imageKey,
            productWeight: args.productWeight,
            quantity: args.quantity,
            itemPrice: args.itemPrice,
            travelerFee: args.travelerFee,
            originCountry: args.originCountry,
            originCity: args.originCity,
            destinationCountry: args.destinationCountry,
            destinationCity: args.destinationCity,
            requiredByDate: args.requiredByDate,
            status: "pending", // "negotiating" status
            description: args.description,
            itemTypes: args.itemTypes,
            visibility: "direct",
            targetedTravelerId: args.targetedTravelerId,
        });

        // --- PART 2: Create the Initial Offer ---
        const negotiationId = await ctx.db.insert("negotiations", {
            requestId: requestId,
            tripId: args.tripId,
            requesterId: currentUser._id,
            travelerId: args.targetedTravelerId,
            proposedFee: args.travelerFee,
            creatorId: currentUser._id,
            status: "pending",
        });

        const offerId = await ctx.db.insert("offers", {
            threadId: negotiationId,
            proposedFee: args.travelerFee, 
            senderId: currentUser._id,
        });

        // Return the new requestId so we can navigate if needed
        return requestId;
    },
});


export const getRecommendedRequests = query({
    args: {},
    handler: async (ctx) => {
        const currentUser = await getAuthenticatedUser(ctx);
        if (!currentUser) {
            return []
        }

        const userTrips = await ctx.db 
          .query("trips")
          .withIndex("by_travelerId", (q) => q.eq("travelerId", currentUser._id))
          .filter((q) =>
          q.eq(q.field("status"), "pending")
          )
          .order('desc')
          .collect();

        const userTripsRoute = userTrips.flatMap((trip) => {

          const origin = cityData.find(c => c.name === trip.originCity && c.country === trip.originCountry)
          const destination = cityData.find(c => c.name === trip.destinationCity && c.country === trip.destinationCountry)
          if (!origin || !destination) {
            return []
          }
          const originCity = origin.name
          const originCountry = origin.country
          const originCountryCode = origin.countryCode
          const destinationCity = destination.name
          const destinationCountry = destination.country
          const destinationCountryCode = destination.countryCode

          return {
            origin,destination,
            originCity,originCountry,originCountryCode,
            destinationCity,destinationCountry,destinationCountryCode
            
          }
        })

        const userOriginCities = userTripsRoute.map((trip) => trip.originCity)
        const userDestinationCities = userTripsRoute.map((trip) => trip. destinationCity)

        const allRequests = await ctx.db.query("requests")
          .filter((q) => 
          q.and(
            q.neq(q.field("requesterId"), currentUser._id),
            q.eq(q.field("visibility"), "public"),
            q.eq(q.field("status"), "pending")
            ))
          .collect()

        const matchingRequests = allRequests.filter((request) =>
          userOriginCities.includes(request.originCity) &&
          userDestinationCities.includes(request.destinationCity)
        )

        if(matchingRequests.length === 0) return []

        const matchingRequestsWithInfo = await Promise.all(
            
          matchingRequests.map(async(request) => {

              const requestCreator = (await ctx.db.get(request.requesterId))

              if (!requestCreator) {
                return null
              }

              const originCityInfo = cityData.find(c => c.name === request.originCity && c.country === request.originCountry && c.countryCode);
              const destinationCityInfo = cityData.find(c => c.name === request.destinationCity && c.country === request.destinationCountry);

              return {
                  ...request,

                  originCountryCode: originCityInfo?.countryCode ?? '', // fallback
                  destinationCountryCode: destinationCityInfo?.countryCode ?? '', // fallback

                  requester:{
                      _id:requestCreator?._id as string,
                      username: requestCreator?.username,
                      image: requestCreator?.imageURL
                  },

              }

          })

        )

        return matchingRequestsWithInfo.filter((request): request is NonNullable<typeof request> => request !== null)     
    }

})


export const cleanupDeletedRequests = internalAction({
  args: {},
  handler: async (ctx) => {
    // check cutoff / delete requested date (> 7 days ago)
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const cutoffDate = Date.now() - SEVEN_DAYS_MS;
    // query to find items that are in trash can and older than cutoff (7 days)
    const trashItems = await ctx.runQuery(internal.requests.getItemsReadyForHardDelete, {cutoffDate})

    console.log(`Janitor Found ${trashItems.length} items that are more than 7 days old to permanently delete.`)

    for (const request of trashItems) {
      try {
        // delete image of request from R2
        if (request.imageKey) {
          console.log(`Deleting image from R2: ${request.imageKey}`);
          await r2.deleteObject(ctx, request.imageKey);
        }
        // delete request from DB
        await ctx.runMutation(internal.requests.hardDeleteRecord, {requestId: request._id});

        console.log(`Permanently deleted request ${request._id}`);

      } catch (error) {

        console.error(`Failed to cleanup request ${request._id}:`, error);
      }
    }
  }
})


export const getItemsReadyForHardDelete = internalQuery({
  args: { cutoffDate: v.float64() },
  handler: async (ctx, args) => {
    const deleteRequest = await ctx.db
      .query("requests")
      .withIndex("by_status", (q) => q.eq("status", "deleted"))
      .collect();

      // if deleted items are getting larger , make a new index to schema with deletedAt
    return deleteRequest.filter((r) => (r.deletedAt || 0) < args.cutoffDate);

  },
})


export const hardDeleteRecord = internalMutation({
  args: { requestId: v.id("requests") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.requestId)
  }
})


export const archiveExpired = internalMutation({
  args:{},
  handler: async (ctx) => {
    const now = Date.now();
    // find all the pending requests that are passed their delivery required time
    const expiredRequests = await ctx.db
      .query("requests")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .filter((q) => q.lt(q.field("requiredByDate"), now))
      .take(100) // checks in batches of size 100 every 24 hour (crons) , because if it get bigger it might crash the server

    if (expiredRequests.length > 0) {
      console.log(`Archiving ${expiredRequests.length} expired requests...`)

      for (const request of expiredRequests) {
        await ctx.db.patch(request._id, {status: "archived"}) 
        // we dont touch the image ! we keep it for history and record
      }

      console.log("Archiving complete.")
    }
  }
})