import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";


export default defineSchema({
    users: defineTable({
        username: v.string(),
        fullname: v.string(),
        email: v.string(),
        bio: v.optional(v.string()),
        imageURL: v.string(),
        rating: v.optional(v.number()),
        clerkId: v.string(),
        completedOrders: v.number(),
    }).index("by_clerk_id", ["clerkId"]),

    requests: defineTable({
        requesterId: v.id("users"),
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
        status: v.string(),
        description: v.optional(v.string()),
        itemTypes: v.optional(v.string()),
        visibility: v.union(v.literal("public"), v.literal("direct")),
        targetedTravelerId: v.optional(v.id("users")), // Who is this direct request for?

    }).index("by_requesterId", ["requesterId"]),

    trips: defineTable({
        travelerId: v.id("users"),
        originCountry: v.string(),
        originCity: v.string(),
        destinationCountry: v.string(),
        destinationCity: v.string(),
        arrivalDate: v.string(),
        availableSpace: v.string(),
        status: v.string(),
        acceptedItemTypes: v.optional(v.string()),
        airline: v.string(),

    }).index("by_travelerId", ["travelerId"]),

    negotiations: defineTable({
        requestId: v.id("requests"), // The item being requested (The "What")
        requesterId: v.id("users"),  // who wants the item        
        tripId: v.id("trips"),       // The trip used for delivery (The "How")
        travelerId: v.id("users"),   // whom delivers the item
        creatorId: v.id("users"),     // who made this specific offer.
        proposedFee: v.number(), //  represents the negotiated amount.

        // Status tracks the negotiation process
        status: v.union(
            v.literal("pending"),   // Traveler has made the offer, awaiting requester action
            v.literal("accepted"),  // Requester accepted, ready for payment
            v.literal("rejected"),  // Requester rejected the offer
            v.literal("paid"),  // Offer withdrawn by the traveler
            v.literal("cancelled"),  // Offer withdrawn by the traveler
            v.literal("completed")
        ),        

    }).index("by_requestId", ["requestId"])
      .index("by_tripId", ["tripId"])
      .index('by_creatorId', ["creatorId"]),

      // MADE NEGOTIATION AS CHILD OF OFFER TO INHERITE THEN PATCH OFFER , FOR COUNTER OFFERS

    offers: defineTable({
        threadId: v.id("negotiations"), // The item being requested (The "What")
        senderId: v.id("users"),     // who made this specific offer.
        proposedFee: v.number(), //  represents the negotiated amount.

    }).index("by_threadId", ["threadId"]),

    // CREATED WHEN AN OFFER IS ACCEPTED AND PAID
    orders: defineTable({
        negotiationId: v.id("negotiations"),
        requestId: v.id("requests"),
        requesterId: v.id("users"),
        travelerId: v.id("users"),
        
        // Financial
        itemPrice: v.number(),
        travelerFee: v.number(),
        totalAmount: v.number(),
        
        // Status
        paymentStatus: v.union(
            v.literal("pending"),
            v.literal("paid"),
            v.literal("completed"),
            v.literal("disputed"),
            v.literal("refunded")
        ),
        
        // Security
        deliveryCode: v.string(),     // HASHED 6-digit code
        codeAttempts: v.number(),     // Failed verification attempts
        codeUsedAt: v.optional(v.number()),
        
        // Timestamps
        paidAt: v.optional(v.number()),
        completedAt: v.optional(v.number()),
        
    }).index("by_negotiation", ["negotiationId"])
    .index("by_requester", ["requesterId"])
    .index("by_traveler", ["travelerId"])
    .index("by_payment_status", ["paymentStatus"]),

    reviews: defineTable({
        negotiationId: v.id("negotiations"),
        reviewerId: v.id("users"),
        revieweeId: v.id("users"),
        rating: v.number(),
        comment: v.optional(v.string()),
    }).index("by_negotiationId", ["negotiationId"])
      .index("by_revieweeId", ["revieweeId"]),


    messages: defineTable({
        negotiationId: v.id("negotiations"), // The offer that is accepted
        senderId: v.id("users"),     // who made sent the message.
        message: v.string(),

    }).index("by_negotiationId", ["negotiationId"]),
});