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
        description: v.optional(v.string()),
        acceptedItemTypes: v.optional(v.string()),
        airline: v.optional(v.string()),

    }).index("by_travelerId", ["travelerId"]),

    offers: defineTable({
        requestId: v.id("requests"), // The item being requested (The "What")
        tripId: v.id("trips"),       // The trip used for delivery (The "How")
        travelerId: v.id("users"),   // whom delivers the item
        requesterId: v.id("users"),  // who wants the item        
        senderId: v.id("users"),     // who made this specific offer.
        proposedFee: v.number(), //  represents the negotiated amount.

        // Status tracks the negotiation process
        status: v.union(
            v.literal("pending"),   // Traveler has made the offer, awaiting requester action
            v.literal("accepted"),  // Requester accepted, ready for payment
            v.literal("rejected"),  // Requester rejected the offer
            v.literal("cancelled")  // Offer withdrawn by the traveler
        ),

        // Optional message from the traveler/requester with their offer
        note: v.optional(v.string()),

    }).index("by_requestId", ["requestId"])
      .index("by_tripId", ["tripId"]),


    // CREATED WHEN AN OFFER IS ACCEPTED AND PAID
    orders: defineTable({
        // IDs to link everything together
        requestId: v.id("requests"),
        tripId: v.id("trips"),
        offerId: v.id("offers"), // The specific offer that was accepted
        travelerId: v.id("users"),
        requesterId: v.id("users"),

        // Final financial details at the time of payment
        finalItemPrice: v.number(),
        finalTravelerFee: v.number(), // from the accepted offer
        finalAppFee: v.number(),
        totalAmountPaid: v.number(),

        // Status tracks the entire lifecycle of the confirmed deal
        status: v.union(
            v.literal("awaiting_payment"),
            v.literal("awaiting_purchase"), // Paid, traveler needs to buy the item
            v.literal("in_transit"),        // Traveler has the item and is traveling
            v.literal("delivered"),         // Awaiting confirmation from requester
            v.literal("completed"),         // Confirmed and money released
            v.literal("disputed"),          // A problem was reported
            v.literal("cancelled")          // Order cancelled
        ),
        
        // For delivery confirmation
        confirmationCode: v.optional(v.string()), // Secure code shown to requester or traveler
        paymentId: v.optional(v.string()),        // ID from your payment provider
        
    }).index("by_travelerId", ["travelerId"])
      .index("by_requesterId", ["requesterId"]),

    reviews: defineTable({
        orderId: v.id("orders"),
        reviewerId: v.id("users"),
        revieweeId: v.id("users"),
        rating: v.number(),
        comment: v.optional(v.string()),
    }).index("by_orderId", ["orderId"])
      .index("by_revieweeId", ["revieweeId"]),
});