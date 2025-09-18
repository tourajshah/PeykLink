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
        originCity: v.optional(v.string()),
        destinationCountry: v.string(), 
        destinationCity: v.optional(v.string()),
        requiredByDate: v.string(),
        status: v.string(),
        description: v.optional(v.string()),
        itemTypes: v.optional(v.string()),

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

    orders: defineTable({
        requestId: v.id("requests"),
        requesterId: v.id("users"),
        travelerId: v.id("users"),
        totalAmout: v.number(),
        status: v.string(),
        trackingInfo: v.optional(v.string()),
        paymentId: v.optional(v.string()),
    }).index("by_requestId", ["requestId"])
    .index("by_requesterId", ["requesterId"])
    .index("by_travelerId", ["travelerId"]),

    reviews: defineTable({
        orderId: v.id("orders"),
        reviewerId: v.id("users"),
        revieweeId: v.id("users"),
        rating: v.number(),
        comment: v.optional(v.string()),
    }).index("by_orderId", ["orderId"])
    .index("by_revieweeId", ["revieweeId"]),
})

    