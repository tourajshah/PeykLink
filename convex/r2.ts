import { R2, type R2Callbacks } from "@convex-dev/r2";
import { components, internal } from "./_generated/api";

// Initialize the R2 component
const r2 = new R2(components.r2);

// Define callbacks for the component
const callbacks: R2Callbacks = {
  onSyncMetadata: internal.r2.onSyncMetadata,
};

export const { generateUploadUrl, syncMetadata, onSyncMetadata } = r2.clientApi({
  /**
   * Step 1: Check user authentication before generating upload URL
   */
  checkUpload: async (ctx, bucket) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("You must be logged in to upload a file.");
    }
  },

  /**
   * Step 2: Runs immediately after upload (before metadata sync)
   * Keep this lightweight - metadata not available yet
   */
  onUpload: async (ctx, bucket, key) => {
    // Just log that upload happened
    const identity = await ctx.auth.getUserIdentity();
    console.log(` File uploaded: ${key} by ${identity?.subject}`);
  },

  /**
   * Step 3: ENFORCE RULES after metadata is synced
   * This runs AFTER metadata is written to the database
   */
  onSyncMetadata: async (ctx, args) => {
    // args: { bucket: string; key: string; isNew: boolean }
    console.log(` Validating metadata for: ${args.key}`);

    // Get the user identity
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("User not found");
    }

    // --- SERVER-SIDE RULE ENFORCEMENT ---
    
    // Get the file metadata from Convex DB (now it's available!)
    const metadata = await r2.getMetadata(ctx, args.key);
    
    if (!metadata) {
      console.error(` Metadata not found for: ${args.key}`);
      throw new Error("File metadata not found");
    }

    console.log(` File info: Size=${metadata.size} bytes, Type=${metadata.contentType}`);

    // Rule 1: Check file size (5MB limit)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (metadata.size && metadata.size > MAX_FILE_SIZE) {
      console.error(` File too large: ${metadata.size} > ${MAX_FILE_SIZE}`);
      // Delete the file immediately if it violates rules
      await r2.deleteObject(ctx, args.key);
      throw new Error(`File is too large! Max 5MB for request images. Your file was ${(metadata.size / (1024 * 1024)).toFixed(2)} MB.`);
    }

    // Rule 2: Check file type
    if (metadata.contentType && !metadata.contentType.startsWith("image/")) {
      console.error(` Invalid type: ${metadata.contentType}`);
      // Delete the file immediately if it violates rules
      await r2.deleteObject(ctx, args.key);
      throw new Error("Only images are allowed for requests.");
    }

    // --- SUCCESS: File passed all rules ---
    
    console.log(` Validation passed: ${args.key} by ${identity.subject}`);
    console.log(`   Size: ${((metadata.size || 0) / 1024).toFixed(2)} KB`);
    console.log(`   Type: ${metadata.contentType}`);
  },

  // Pass the callbacks back to the component
  callbacks,
});