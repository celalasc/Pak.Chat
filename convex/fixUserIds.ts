import { action } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const fixUserIds = action({
  args: {},
  async handler(ctx) {
    const users = await ctx.db.query("users").collect();
    const map = new Map<string, Id<"users">>();
    for (const u of users) map.set(u.tokenIdentifier, u._id);

    const settings = await ctx.db.query("userSettings").collect();
    for (const s of settings) {
      if (typeof s.userId === "string") {
        const uid = map.get(s.userId);
        if (uid) await ctx.db.patch(s._id, { userId: uid });
      }
    }

    const threads = await ctx.db.query("threads").collect();
    for (const t of threads) {
      if (typeof t.userId === "string") {
        const uid = map.get(t.userId);
        if (uid) await ctx.db.patch(t._id, { userId: uid });
      }
    }

    const messages = await ctx.db.query("messages").collect();
    for (const m of messages) {
      if (typeof m.authorId === "string") {
        const uid = map.get(m.authorId);
        if (uid) await ctx.db.patch(m._id, { authorId: uid });
      }
    }
  }
});
