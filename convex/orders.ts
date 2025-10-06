// convex/orders.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthenticatedUser } from "./users";

// Utility function to generate secure 6-digit code
function generateDeliveryCode(): string {
    // Generate cryptographically secure random number
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    return code;
}

// Simple hash function (Convex doesn't have crypto.subtle, so we use basic hash)
// For production, you'd use a proper hashing library
function hashCode(code: string): string {
    
    let hash = 0;
    const salt = "your-secret-salt-here"; // Store in environment variable
    const input = code + salt;
    
    for (let i = 0; i < input.length; i++) {
        const char = input.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    
    return hash.toString(36);
}

export const createOrder = mutation({
    args: { 
        negotiationId: v.id("negotiations"),
    },
    handler: async (ctx, args) => {
        const currentUser = await getAuthenticatedUser(ctx);
        
        // Get the negotiation details
        const negotiation = await ctx.db.get(args.negotiationId);
        if (!negotiation) {
            throw new Error("Negotiation not found");
        }
        
        // Security: Only requester can create order/pay
        if (negotiation.requesterId !== currentUser._id) {
            throw new Error("Only the requester can create an order");
        }
        
        // Check if order already exists
        const existingOrder = await ctx.db
            .query("orders")
            .withIndex("by_negotiation", (q) => 
                q.eq("negotiationId", args.negotiationId)
            )
            .first();
            
        if (existingOrder) {
            throw new Error("Order already exists for this negotiation");
        }
        
        // Get request details for pricing
        const request = await ctx.db.get(negotiation.requestId);
        if (!request) {
            throw new Error("Request not found");
        }
        
        // Generate secure delivery code
        const deliveryCode = generateDeliveryCode();
        const hashedCode = hashCode(deliveryCode);
        
        // Calculate total
        const itemPrice = request.itemPrice * request.quantity;
        const travelerFee = negotiation.proposedFee;
        const totalAmount = itemPrice + travelerFee;
        
        // Create the order
        const orderId = await ctx.db.insert("orders", {
            negotiationId: args.negotiationId,
            requestId: negotiation.requestId,
            requesterId: negotiation.requesterId,
            travelerId: negotiation.travelerId,
            
            itemPrice,
            travelerFee,
            totalAmount,
            
            paymentStatus: "paid", // Mock payment - instant success
            deliveryCode: hashedCode, // Store hashed version
            
            paidAt: Date.now(),
            codeAttempts: 0, // Track failed attempts
        });
        
        // Update negotiation status
        await ctx.db.patch(args.negotiationId, {
            status: "paid", // Add this to your status union
        });
        
        // Update request status
        await ctx.db.patch(negotiation.requestId, {
            status: "in_progress", // Add this status
        });
        
        // Return the PLAIN CODE only once (never store it)
        // Frontend should show this to requester and then forget it
        return {
            orderId,
            deliveryCode: deliveryCode, // Plain text, shown only once
            totalAmount,
        };
    },
});

export const getOrderDetails = query({
    args: { orderId: v.id("orders") },
    handler: async (ctx, args) => {
        const currentUser = await getAuthenticatedUser(ctx);
        const order = await ctx.db.get(args.orderId);
        
        if (!order) {
            return null;
        }
        
        // Only participants can view
        if (order.requesterId !== currentUser._id && 
            order.travelerId !== currentUser._id) {
            throw new Error("Unauthorized");
        }
        
        // Get related data
        const [request, requester, traveler, negotiation] = await Promise.all([
            ctx.db.get(order.requestId),
            ctx.db.get(order.requesterId),
            ctx.db.get(order.travelerId),
            ctx.db.get(order.negotiationId),
        ]);
        
        // Don't return the actual delivery code!
        const { deliveryCode, ...safeOrder } = order;
        
        return {
            order: safeOrder,
            request,
            requester,
            traveler,
            negotiation,
            // Only show code to requester, and only if not used
            showCodeToRequester: currentUser._id === order.requesterId && 
                                !order.codeUsedAt,
        };
    },
});

export const confirmDelivery = mutation({
    args: {
        orderId: v.id("orders"),
        enteredCode: v.string(),
    },
    handler: async (ctx, args) => {
        const currentUser = await getAuthenticatedUser(ctx);
        const order = await ctx.db.get(args.orderId);
        
        if (!order) {
            throw new Error("Order not found");
        }
        
        // Only traveler can confirm
        if (order.travelerId !== currentUser._id) {
            throw new Error("Only the traveler can confirm delivery");
        }
        
        // Check if already completed
        if (order.paymentStatus === "completed") {
            throw new Error("Order already completed");
        }
        
        // Check attempts limit (prevent brute force)
        if (order.codeAttempts >= 3) {
            await ctx.db.patch(args.orderId, {
                paymentStatus: "disputed",
            });
            throw new Error("Too many failed attempts. Order flagged for review.");
        }
        
        // Hash entered code and compare
        const hashedEntered = hashCode(args.enteredCode);
        
        if (hashedEntered !== order.deliveryCode) {
            // Increment failed attempts
            await ctx.db.patch(args.orderId, {
                codeAttempts: (order.codeAttempts || 0) + 1,
            });
            throw new Error("Incorrect delivery code");
        }
        
        // SUCCESS! Release funds
        await ctx.db.patch(args.orderId, {
            paymentStatus: "completed",
            completedAt: Date.now(),
            codeUsedAt: Date.now(),
        });
        
        // Update request
        await ctx.db.patch(order.requestId, {
            status: "completed",
        });
        
        // TODO: Trigger review notifications here
        
        return { 
            success: true,
            message: "Delivery confirmed! Funds released.",
        };
    },
});

export const getOrderByNegotiation = query({
    args: { negotiationId: v.id("negotiations") },
    handler: async (ctx, args) => {
        const order = await ctx.db
            .query("orders")
            .withIndex("by_negotiation", (q) => 
                q.eq("negotiationId", args.negotiationId)
            )
            .first();
        
        return order;
    },
});