import { cityData } from '@/constants/cityData';
import { v } from "convex/values";
import { internal } from './_generated/api';
import { internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { getAuthenticatedUser } from "./users";




export const generateUploadUrl = mutation(async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    return await ctx.storage.generateUploadUrl();
});


export const createTrip = mutation({
    args:{
        originCountry: v.string(),
        originCity: v.string(),
        destinationCountry: v.string(),
        destinationCity: v.string(),
        arrivalDate: v.float64(),
        availableSpace: v.string(),
        acceptedItemTypes: v.optional(v.string()),
        airline: v.string(),
    },

    handler: async (ctx,args) => {

        const currentUser = await getAuthenticatedUser(ctx)

        // createTrip

        const tripId = await ctx.db.insert("trips", {
            travelerId: currentUser._id,
            originCountry: args.originCountry,
            originCity: args.originCity,
            destinationCountry: args.destinationCountry,
            destinationCity: args.destinationCity,
            arrivalDate: args.arrivalDate,
            availableSpace: args.availableSpace,
            status: "pending",
            acceptedItemTypes: args.acceptedItemTypes,
            airline: args.airline,

        });
        
        return tripId;
    },
});

export const getFeedTrips = query ({
    handler: async(ctx) => {

        const currentUser = await getAuthenticatedUser(ctx)

        // get all trips form db

        const trips = await ctx.db.query("trips")
        .filter((q)=> q.eq(q.field("status"), "pending"))
        .order("desc").collect()

        if(trips.length === 0) return []


        // get other data

        const tripsWIthInfo = await Promise.all(
            
            trips.map(async(trip) => {

                const tripCreator = (await ctx.db.get(trip.travelerId))!
                const originCityInfo = cityData.find(c => c.name === trip.originCity && c.country === trip.originCountry);
                const destinationCityInfo = cityData.find(c => c.name === trip.destinationCity && c.country === trip.destinationCountry);

                return {
                    ...trip,

                    originCountryCode: originCityInfo?.countryCode ?? '', // fallback
                    destinationCountryCode: destinationCityInfo?.countryCode ?? '', // fallback

                    traveler:{
                        _id:tripCreator?._id,
                        username: tripCreator?.username,
                        image: tripCreator?.imageURL,
                        rating: tripCreator.rating
                    },

                }

            })

        )

        return tripsWIthInfo
    },
});


export const deleteTrip = mutation({
    args:{tripId:v.id("trips")},
    handler: async (ctx, args) => {

        const currentUser = await getAuthenticatedUser(ctx)

        const trip = await ctx.db.get(args.tripId)
        if (!trip) throw new Error("Trips not found")


        // verify ownership

        if(trip.travelerId !== currentUser._id) throw new Error ("Not authorized to delete this trip")

        // delete trip

        await ctx.db.patch(args.tripId, {status : "deleted", deletedAt : Date.now()})
        
    }
})


export const getMyTrips = query({
  args: {},
  handler: async (ctx) => {
    const currentUser = await getAuthenticatedUser(ctx);

    // If there's no authenticated user, there are no trips to return.
    if (!currentUser) {
      return [];
    }

    // 1. Fetch the raw trip documents created by the current user.
    const userTrips = await ctx.db
      .query("trips")
      // Your trips table likely uses 'travelerId' to reference the user document _id
      .filter((q) => q.eq(q.field("travelerId"), currentUser._id))
      .order("desc")
      .collect();

    // 2. Shape the data to match what the <Trip> component expects.
    const myTripsWithInfo = userTrips.map((trip) => {
      // Find the country codes from your constant data.
      const originCityInfo = cityData.find(c => c.name === trip.originCity && c.country === trip.originCountry);
      const destinationCityInfo = cityData.find(c => c.name === trip.destinationCity && c.country === trip.destinationCountry);

      // 3. Return a new object with all the required fields.
      return {
        ...trip,
        originCountryCode: originCityInfo?.countryCode ?? '',
        destinationCountryCode: destinationCityInfo?.countryCode ?? '',
        // Attach the traveler object directly, as we already have the user's data.
        traveler: {
          _id: currentUser._id,
          username: currentUser.username,
          image: currentUser.imageURL,
          rating: currentUser.rating
        },
      };
    });
    
    return myTripsWithInfo;
  },
});


export const updateTrip = mutation({
  args: {
    tripId: v.id("trips"),
    availableSpace: v.string(),
    description: v.optional(v.string()),
    acceptedItemTypes: v.optional(v.string()),
    airline: v.optional(v.string()),

  },
  handler: async (ctx, args) => {

    const currentUser = await getAuthenticatedUser(ctx)

    const trip = await ctx.db.get(args.tripId)

    if(!trip) {
      throw new Error ("Trip not found")
    }

    if(trip.travelerId !== currentUser._id) {
      throw new Error ("You are not authorized to update this request.")
    }

    const updates: {
      availableSpace?: string,
      description?: string,
      acceptedItemTypes?: string,
      airline?:string,
    } = {}

    if(args.availableSpace !== undefined) updates.availableSpace = args.availableSpace
    if(args.acceptedItemTypes !== undefined) updates.acceptedItemTypes = args.acceptedItemTypes
    if(args.description !== undefined) updates.description = args.description
    
    await ctx.db.patch(trip._id, updates);

    return { success: true};
  },
})

export const getTripById = query({
    args: {
        tripId: v.id("trips"),
    },
    handler: async (ctx, args) => {
        const trip = await ctx.db.get(args.tripId);

        if (!trip) {
            return null;
        }

        const traveler = await ctx.db.get(trip.travelerId);

        return {
            ...trip,
            traveler: {
                _id: traveler?._id,
                username: traveler?.username,
                image: traveler?.imageURL,
                rating: traveler?.rating,
            }
        };
    },
});


export const getMyMatchingTrips = query({
    args: {
        originCity: v.string(),
        destinationCity: v.string(),
    },
    handler: async (ctx, args) => {
        const currentUser = await getAuthenticatedUser(ctx);
        if (!currentUser) {
            return []
        }

        const matchingTrips = await ctx.db 
            .query("trips")
            .withIndex("by_travelerId", (q) => q.eq("travelerId", currentUser._id))
            .filter((q) =>
              q.and(
                  q.eq(q.field("originCity"), args.originCity,),
                  q.eq(q.field("destinationCity"), args.destinationCity)
              )
            )
            .collect();

        return matchingTrips        
    }
})


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
        const userDestinationCities = userTripsRoute.map((trip) => trip.destinationCity)

        const allRequests = await ctx.db.query("requests")
          .filter((q) => 
          q.and(
            q.neq(q.field("requesterId"), currentUser._id),
            q.eq(q.field("visibility"), "public")
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

              const originCityInfo = cityData.find(c => c.name === request.originCity && c.country === request.originCountry);
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



export const cleanupDeletedTrips = internalAction({
  args: {},
  handler: async (ctx) => {
    // check cutoff / delete trip date (> 7 days ago)
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const cutoffDate = Date.now() - SEVEN_DAYS_MS;
    // query to find items that are in trash can and older than cutoff (7 days)
    const trashItems = await ctx.runQuery(internal.trips.getItemsReadyForHardDelete, {cutoffDate})

    console.log(`Janitor Found ${trashItems.length} items that are more than 7 days old to permanently delete.`)

    for (const trip of trashItems) {
      try {
        // delete request from DB
        await ctx.runMutation(internal.trips.hardDeleteRecord, {tripId: trip._id});

        console.log(`Permanently deleted trip ${trip._id}`);

      } catch (error) {

        console.error(`Failed to cleanup trip ${trip._id}:`, error);
      }
    }
  }
})


export const getItemsReadyForHardDelete = internalQuery({
  args: { cutoffDate: v.float64() },
  handler: async (ctx, args) => {
    const deleteTrip = await ctx.db
      .query("trips")
      .withIndex("by_status", (q) => q.eq("status", "deleted"))
      .collect();

      // if deleted items are getting larger , make a new index to schema with deletedAt
    return deleteTrip.filter((t) => (t.deletedAt || 0) < args.cutoffDate);

  },
})


export const hardDeleteRecord = internalMutation({
  args: { tripId: v.id("trips") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.tripId)
  }
})


export const archiveExpired = internalMutation({
  args:{},
  handler: async (ctx) => {
    const now = Date.now();
    // find all the pending trips that are passed their flight time
    const expiredTrips = await ctx.db
      .query("trips")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .filter((q) => q.lt(q.field("arrivalDate"), now))
      .take(100) // checks in batches of size 100 every 24 hour (crons) , because if it get bigger it might crash the server

    if (expiredTrips.length > 0) {
      console.log(`Archiving ${expiredTrips.length} expired trips...`)

      for (const trip of expiredTrips) {
        await ctx.db.patch(trip._id, {status: "archived"}) 
      }

      console.log("Archiving complete.")
    }
  }
})