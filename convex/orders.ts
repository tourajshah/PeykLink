// convex/orders.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  decryptCode,
  encryptCode,
  generateSecureCode,
  hashDeliveryCode,
} from "./crypto";
import { getAuthenticatedUser } from "./users";

// // Utility function to generate secure 6-digit code
// function generateDeliveryCode(): string {
//     // Generate cryptographically secure random number
//     const code = Math.floor(100000 + Math.random() * 900000).toString();
//     return code;
// }

// function generateKey(userId: string): string {
//     // DO NOT change the secret once in production, or old codes will be unreadable
//     const secret = process.env.ENCRYPTION_SECRET!;
//     if (!secret) {
//         throw new Error("ENCRYPTION_SECRET environment variable not set!");
//     }
//     // Simple key generation - for this use case, it's sufficient
//     return userId.slice(0, 10) + secret.slice(0, 10);
// }

// function encrypt(text: string, key: string): string {
//     let result = '';
//     for (let i = 0; i < text.length; i++) {
//         const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
//         result += String.fromCharCode(charCode);
//     }
//     return btoa(result); // Base64 encode to safely store in DB
// }

// function decrypt(encryptedText: string, key: string): string {
//     let result = '';
//     const decodedText = atob(encryptedText); // Base64 decode
//     for (let i = 0; i < decodedText.length; i++) {
//         const charCode = decodedText.charCodeAt(i) ^ key.charCodeAt(i % key.length);
//         result += String.fromCharCode(charCode);
//     }
//     return result;
// }

// // Simple hash function (Convex doesn't have crypto.subtle, so we use basic hash)
// // For production, you'd use a proper hashing library
// function hashCode(code: string): string {

//     let hash = 0;
//     const salt = "your-secret-salt-here"; // Store in environment variable
//     const input = code + salt;

//     for (let i = 0; i < input.length; i++) {
//         const char = input.charCodeAt(i);
//         hash = ((hash << 5) - hash) + char;
//         hash = hash & hash; // Convert to 32bit integer
//     }

//     return hash.toString(36);
// }

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
        q.eq("negotiationId", args.negotiationId),
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
    const rawCode = generateSecureCode(); // "505050"
    const hashedCode = await hashDeliveryCode(rawCode);

    const secret = process.env.ENCRYPTION_SECRET!;
    const encryptedCode = await encryptCode(rawCode, secret);

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
      deliveryCodeHash: hashedCode, // Store hashed version
      deliveryCodeEncrypted: encryptedCode,
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
      deliveryCode: rawCode, // Plain text, shown only once
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
    if (
      order.requesterId !== currentUser._id &&
      order.travelerId !== currentUser._id
    ) {
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
    // const { deliveryCode, ...safeOrder } = order;

    // return {
    //     order: safeOrder,
    //     request,
    //     requester,
    //     traveler,
    //     negotiation,
    //     // Only show code to requester, and only if not used
    //     showCodeToRequester: currentUser._id === order.requesterId &&
    //                         !order.codeUsedAt,
    // };

    // if current user is requester , decrypt the code for them
    let plainTextCode = null;
    if (currentUser._id === order.requesterId && !order.codeUsedAt) {
      const secret = process.env.ENCRYPTION_SECRET!;
      plainTextCode = await decryptCode(order.deliveryCodeEncrypted, secret);
    }

    return {
      ...order,
      deliveryCode: plainTextCode, // "505050"
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

    const requester = await ctx.db.get(order.requesterId);
    const traveler = await ctx.db.get(order.travelerId);

    if (!requester || !traveler) {
      throw new Error(
        "Traveler or Requester for this delivery couldn't be found",
      );
    }

    // Only traveler can confirm
    if (order.travelerId !== currentUser._id) {
      throw new Error("Only the traveler can confirm delivery");
    }

    // Check if already completed
    if (order.paymentStatus === "completed") {
      return { success: false, message: "Order already completed" };
    }

    // Check attempts limit (prevent brute force)
    // FIX: Increased limit to 5 to match your description
    if (order.codeAttempts >= 5) {
      return {
        success: false,
        error: "TOO_MANY_ATTEMPTS",
        message: "Too many failed attempts. Order flagged for review.",
      };
    }

    // Hash entered code and compare
    const hashedEntered = await hashDeliveryCode(args.enteredCode);

    if (hashedEntered !== order.deliveryCodeHash) {
      // FIX: Calculate new attempts safely
      const newAttempts = (order.codeAttempts || 0) + 1;

      // FIX: Increment failed attempts
      // Since we return (and don't throw), this patch WILL persist in the DB
      await ctx.db.patch(args.orderId, {
        codeAttempts: newAttempts,
      });

      // FIX: If we just hit the limit, flag it now
      if (newAttempts >= 5) {
        await ctx.db.patch(args.orderId, {
          paymentStatus: "disputed",
        });
        return {
          success: false,
          error: "TOO_MANY_ATTEMPTS",
          message: "Too many failed attempts. Order flagged.",
        };
      }

      // FIX: Return failure object instead of throwing Error
      return {
        success: false,
        error: "INCORRECT_CODE",
        message: "Incorrect delivery code",
        attempts: newAttempts,
      };
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
    // UPDATE PARENT NEGOTIATION
    await ctx.db.patch(order.negotiationId, {
      status: "completed",
    });

    // UPDATE COMPLETED ORDERS OF BOTH PARTIES
    // FIX: Added ( || 0) to prevent NaN if completedOrders is undefined
    await ctx.db.patch(requester._id, {
      requesterCompletedOrders: (requester.requesterCompletedOrders || 0) + 1,
      completedOrders: (requester.completedOrders || 0) + 1,
    });

    await ctx.db.patch(traveler._id, {
      travelerCompletedOrders: (traveler.travelerCompletedOrders || 0) + 1,
      completedOrders: (traveler.completedOrders || 0) + 1,
    });

    await ctx.db.patch(traveler._id, {
      walletBalance: traveler.walletBalance + order.totalAmount,
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
    const currentUser = await getAuthenticatedUser(ctx);

    const order = await ctx.db
      .query("orders")
      .withIndex("by_negotiation", (q) =>
        q.eq("negotiationId", args.negotiationId),
      )
      .first();

    if (!order) return null;

    let plainTextCode = null;

    // currentuser is requester
    if (currentUser._id === order.requesterId && !order.codeUsedAt) {
      const secret = process.env.ENCRYPTION_SECRET!;
      // decryption
      plainTextCode = await decryptCode(order.deliveryCodeEncrypted, secret);
    }

    return {
      ...order,
      deliveryCode: plainTextCode, // "505050" or null
    };
  },
});

// export const getDecryptedCode = query({
//     args: { orderId: v.id("orders") },
//     handler: async (ctx, args) => {
//         const currentUser = await getAuthenticatedUser(ctx);
//         const order = await ctx.db.get(args.orderId);

//         if (!order || !order.encryptedDeliveryCode) {
//             return null; // No order or no code to decrypt
//         }

//         // SECURITY CHECK: Only the requester can decrypt their own code.
//         if (order.requesterId !== currentUser._id) {
//             // Not an error, just return null for privacy.
//             return null;
//         }

//         // Decrypt and return the code
//         try {
//             const encryptionKey = generateKey(currentUser._id);
//             const plainTextCode = decrypt(order.encryptedDeliveryCode, encryptionKey);
//             return plainTextCode;
//         } catch (error) {
//             console.error("Decryption failed for order:", args.orderId, error);
//             return null; // Return null if decryption fails for any reason
//         }
//     },
// });
