// convex/http.ts
import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

const http = httpRouter();

http.route({
  path: "/syncUser",
  method: "POST",
  handler: httpAction(async (ctx) => {
    const { user } = await ctx.auth.getUserIdentity();
    if (!user) {
      return new Response("Not authenticated", { status: 401 });
    }

    const existingUser = await ctx.runQuery(internal.users.findByToken, {
      tokenIdentifier: user.subject,
    });

    if (existingUser) {
      if (
        existingUser.name !== user.name ||
        existingUser.avatarUrl !== user.pictureUrl
      ) {
        await ctx.runMutation(internal.users.update, {
          userId: existingUser._id,
          name: user.name!,
          avatarUrl: user.pictureUrl,
        });
      }
    } else {
      await ctx.runMutation(internal.users.create, {
        name: user.name!,
        email: user.email,
        avatarUrl: user.pictureUrl,
        tokenIdentifier: user.subject,
      });
    }
    return new Response(null, { status: 200 });
  }),
});

export default http;
