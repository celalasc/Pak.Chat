import { Context } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Return the Convex user ID for the currently authenticated Firebase user.
 * Throws if the user is not authenticated or not synchronized in the DB.
 */
export async function currentUserId(ctx: Context): Promise<Id<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", q => q.eq("tokenIdentifier", identity.subject))
    .unique();
  if (!user) throw new Error("User not synced");
  return user._id;
}
