// Import explicit contexts to support both query and mutation usage
import type { QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Return the Convex user ID for the currently authenticated Firebase user.
 * Throws if the user is not authenticated or not synchronized in the DB.
 */
export async function currentUserId(
  ctx: QueryCtx | MutationCtx,
): Promise<Id<"users"> | null> {
  // Firebase identity may not be attached immediately after login
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
    .unique();

  if (!user) return null;

  return user._id;
}
