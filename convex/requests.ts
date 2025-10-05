import { cityData } from '@/constants/cityData';
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthenticatedUser } from "./users";


export const generateUploadUrl = mutation(async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    return await ctx.storage.generateUploadUrl();
});


export const createRequest = mutation({
    args:{
        productName: v.string(),
        productURL: v.optional(v.string()),
        productWeight: v.optional(v.string()),
        quantity: v.number(),
        itemPrice: v.number(),
        travelerFee: v.number(),
        originCountry: v.string(),
        originCity: v.string(),
        destinationCountry: v.string(), 
        destinationCity: v.string(),
        requiredByDate: v.string(),
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
            productWeight: args.productWeight,
            quantity: args.quantity,
            itemPrice: args.itemPrice,
            travelerFee: args.travelerFee,
            originCountry: args.originCountry,
            originCity: args.originCity,
            destinationCountry: args.destinationCountry, 
            destinationCity: args.destinationCity,
            requiredByDate: args.requiredByDate,
            status: "active",
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

        // get all requests form db

        const requests = await ctx.db
          .query("requests")
          .filter((q) => q.eq(q.field("visibility"), "public"))
          .order("desc")
          .collect()

        if(requests.length === 0) return []


        // get other data

        const requestsWIthInfo = await Promise.all(
            
            requests.map(async(request) => {

                const requestCreator = (await ctx.db.get(request.requesterId))!
                const originCityInfo = cityData.find(c => c.name === request.originCity && c.country === request.originCountry);
                const destinationCityInfo = cityData.find(c => c.name === request.destinationCity && c.country === request.destinationCountry);

                return {
                    ...request,

                    originCountryCode: originCityInfo?.countryCode ?? '', // fallback
                    destinationCountryCode: destinationCityInfo?.countryCode ?? '', // fallback

                    requester:{
                        _id:requestCreator?._id,
                        username: requestCreator?.username,
                        image: requestCreator?.imageURL
                    },

                }

            })

        )

        return requestsWIthInfo
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

        await ctx.db.delete(args.requestId)
        
    }
})


export const getMyRequests = query({
  args: {},
  handler: async (ctx) => {
    const currentUser = await getAuthenticatedUser(ctx);

    if (!currentUser) {
      return [];
    }

    const userRequests = await ctx.db
      .query("requests")
      // Use the internal user _id to filter, which is the correct reference
      .filter((q) => q.eq(q.field("requesterId"), currentUser._id))
      .order("desc")
      .collect();

    // Now, shape the data exactly like you do in getFeedRequests
    const myRequestsWithInfo = userRequests.map((request) => {
      const originCityInfo = cityData.find(c => c.name === request.originCity && c.country === request.originCountry);
      const destinationCityInfo = cityData.find(c => c.name === request.destinationCity && c.country === request.destinationCountry);

      return {
        ...request,
        originCountryCode: originCityInfo?.countryCode ?? '',
        destinationCountryCode: destinationCityInfo?.countryCode ?? '',
        // We already have the user's data, so we can attach it directly
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
    requiredByDate: v.string(),
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
      requiredByDate?: string,
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
})


export const createDirectRequestAndOffer = mutation({
    // We need all the request arguments, PLUS the tripId for the offer
    args: {
        // same args from createRequest
        productName: v.string(),
        productURL: v.optional(v.string()),
        productWeight: v.optional(v.string()),
        quantity: v.number(),
        itemPrice: v.number(),
        travelerFee: v.number(),
        originCountry: v.string(),
        originCity: v.string(),
        destinationCountry: v.string(),
        destinationCity: v.string(),
        requiredByDate: v.string(),
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
            productWeight: args.productWeight,
            quantity: args.quantity,
            itemPrice: args.itemPrice,
            travelerFee: args.travelerFee,
            originCountry: args.originCountry,
            originCity: args.originCity,
            destinationCountry: args.destinationCountry,
            destinationCity: args.destinationCity,
            requiredByDate: args.requiredByDate,
            status: "active", // "negotiating" status
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


