import { cityData } from '@/constants/cityData';
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
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
        arrivalDate: v.string(),
        availableSpace: v.string(),
        description: v.optional(v.string()),
        acceptedItemTypes: v.optional(v.string()),
        airline: v.optional(v.string()),
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
            status: "active",
            description: args.description,
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

        const trips = await ctx.db.query("trips").order("desc").collect()

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
                        image: tripCreator?.imageURL
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

        await ctx.db.delete(args.tripId)
        
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
          image: currentUser.imageURL
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
            }
        };
    },
});