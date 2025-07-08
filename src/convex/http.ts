// convex/http.ts
import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

const http = httpRouter();

http.route({
  path: "/syncUser",
  method: "POST",
  handler: httpAction(async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return new Response("Not authenticated", { status: 401 });
    }

    const existingUser = await ctx.runQuery(internal.users.findByToken, {
      tokenIdentifier: identity.subject,
    });

    if (existingUser) {
      if (
        existingUser.name !== identity.name ||
        existingUser.avatarUrl !== identity.pictureUrl
      ) {
        await ctx.runMutation(internal.users.update, {
          userId: existingUser._id,
          name: identity.name!,
          avatarUrl: identity.pictureUrl,
        });
      }
    } else {
      await ctx.runMutation(internal.users.create, {
        name: identity.name!,
        email: identity.email,
        avatarUrl: identity.pictureUrl,
        tokenIdentifier: identity.subject,
      });
    }
    return new Response(null, { status: 200 });
  }),
});

export default http;
