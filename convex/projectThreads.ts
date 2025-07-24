import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { currentUserId } from "./utils";

export const getForProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const userId = await currentUserId(ctx);
    if (!userId) {
      throw new Error("Не авторизован");
    }
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== userId) {
      throw new Error("Проект не найден или нет доступа");
    }

    // Возвращаем только threadId, если нужно получить полные треды, потребуется дополнительный запрос
    const projectThreads = await ctx.db
      .query("projectThreads")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    return projectThreads.map((pt) => pt.threadId);
  },
});

export const linkThread = mutation({
  args: { projectId: v.id("projects"), threadId: v.id("threads") },
  handler: async (ctx, args) => {
    const userId = await currentUserId(ctx);
    if (!userId) {
      throw new Error("Не авторизован");
    }
    const project = await ctx.db.get(args.projectId);
    const thread = await ctx.db.get(args.threadId);

    if (!project || project.userId !== userId) {
      throw new Error("Проект не найден или нет доступа");
    }
    if (!thread || thread.userId !== userId) {
      throw new Error("Тред не найден или нет доступа");
    }

    // Проверяем, существует ли уже такая связь, чтобы обеспечить идемпотентность
    const existingLink = await ctx.db
      .query("projectThreads")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .filter((q) => q.eq(q.field("threadId"), args.threadId))
      .first();

    if (existingLink) {
      return existingLink._id; // Связь уже существует
    }

    const linkId = await ctx.db.insert("projectThreads", {
      userId: userId,
      projectId: args.projectId,
      threadId: args.threadId,
    });
    return linkId;
  },
});

export const unlinkThread = mutation({
  args: { projectId: v.id("projects"), threadId: v.id("threads") },
  handler: async (ctx, args) => {
    const userId = await currentUserId(ctx);
    if (!userId) {
      throw new Error("Не авторизован");
    }
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== userId) {
      throw new Error("Проект не найден или нет доступа");
    }

    const linkToDelete = await ctx.db
      .query("projectThreads")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .filter((q) => q.eq(q.field("threadId"), args.threadId))
      .first();

    if (linkToDelete) {
      await ctx.db.delete(linkToDelete._id);
    }
  },
});