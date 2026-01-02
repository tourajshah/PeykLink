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
                        _id:tripCreator._id,
                        username: tripCreator.username,
                        image: tripCreator?.imageURL,
                        rating: tripCreator?.rating,
                        asTravelerrating: tripCreator?.asTravelerRating
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
  args: {
    statuses: v.optional(v.array(v.string()))
  },
  handler: async (ctx, args) => {
    const currentUser = await getAuthenticatedUser(ctx);

    // If there's no authenticated user, there are no trips to return.
    if (!currentUser) {
      return [];
    }

    // 1. Fetch the raw trip documents created by the current user.
    let tripsQuery = ctx.db
      .query("trips")
      .withIndex("by_travelerId", (q) => q.eq("travelerId", currentUser._id));
      
    if (args.statuses && args.statuses.length > 0) {

      const statusToFilter = args.statuses;
      
      tripsQuery = tripsQuery.filter((q) => 
        q.or(
          ...statusToFilter.map(status => q.eq(q.field("status"), status))
        )
      );
    }

    const userTrips = await tripsQuery.order("desc").collect();

    // 2. Shape the data to match what the <Trip> component expects.
    const myTripsWithInfo = userTrips.map((trip) => {
      const originCityInfo = cityData.find(c => c.name === trip.originCity && c.country === trip.originCountry);
      const destinationCityInfo = cityData.find(c => c.name === trip.destinationCity && c.country === trip.destinationCountry);

      // 3. Return a new object with all the required fields.
      return {
        ...trip,
        originCountryCode: originCityInfo?.countryCode ?? '',
        destinationCountryCode: destinationCityInfo?.countryCode ?? '',
        traveler: {
          _id: currentUser._id,
          username: currentUser.username,
          image: currentUser.imageURL,
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

export const getRecommendedTrips = query({
  args: {},
  handler: async (ctx) => {
    const currentUser = await getAuthenticatedUser(ctx);
    if (!currentUser) {
      return [];
    }

    // 1. Get the Current User's Active Requests (The "Demand")
    const myRequests = await ctx.db
      .query("requests")
      .withIndex("by_requesterId", (q) => q.eq("requesterId", currentUser._id))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    if (myRequests.length === 0) return [];

    // 2. Extract unique routes from the user's requests
    // We want trips that go FROM the Item Origin TO the User's Location
    const neededRoutes = myRequests.map((r) => ({
      origin: r.originCity,
      destination: r.destinationCity,
    }));

    const neededOrigins = neededRoutes.map((r) => r.origin);
    const neededDestinations = neededRoutes.map((r) => r.destination);

    // 3. Get All Active Trips (The "Supply")
    // We filter out the user's own trips and non-pending trips
    const allTrips = await ctx.db
      .query("trips")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    // 4. Perform the Match in Memory
    const matchingTrips = allTrips.filter((trip) => {
      // Don't show my own trips
      if (trip.travelerId === currentUser._id) return false;

      // Check if this trip matches ANY of my request routes
      return (
        neededOrigins.includes(trip.originCity) &&
        neededDestinations.includes(trip.destinationCity)
      );
    });

    if (matchingTrips.length === 0) return [];

    // 5. Hydrate with Traveler Info (Join)
    const matchingTripsWithInfo = await Promise.all(
      matchingTrips.map(async (trip) => {
        const traveler = await ctx.db.get(trip.travelerId);
        if (!traveler) return null;

        const originCityInfo = cityData.find(c => c.name === trip.originCity && c.country === trip.originCountry && c.countryCode);
        const destinationCityInfo = cityData.find(c => c.name === trip.destinationCity && c.country === trip.destinationCountry);


        return {
          ...trip,
          traveler: {
            _id: traveler._id,
            username: traveler.username,
            image: traveler.imageURL,
            rating: traveler.rating, // Assuming this exists on user object
          },
          // Ensure we pass these through for your Trip Component
          originCountryCode: originCityInfo?.countryCode || "", // Fallback if not in DB
          destinationCountryCode: destinationCityInfo?.countryCode || "",
        };
      })
    );

    return matchingTripsWithInfo.filter((t): t is NonNullable<typeof t> => t !== null);
  },
});

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