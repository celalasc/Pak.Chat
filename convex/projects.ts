import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { currentUserId } from "./utils";

export const list = query({
  args: {
    paginationOpts: v.any(),
  },
  handler: async (ctx, args) => {
    const userId = await currentUserId(ctx);
    if (!userId) {
      throw new Error("Не авторизован");
    }

    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .paginate(args.paginationOpts);

    return projects;
  },
});

export const get = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const userId = await currentUserId(ctx);
    
    // Return null instead of throwing error to allow graceful handling
    if (!userId) {
      return null;
    }
    
    const project = await ctx.db.get(args.projectId);

    if (!project) {
      throw new Error("Проект не найден");
    }
    if (project.userId !== userId) {
      throw new Error("Нет доступа к проекту");
    }
    return project;
  },
});

export const create = mutation({
  args: { name: v.string(), customInstructions: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await currentUserId(ctx);
    if (!userId) {
      throw new Error("Не авторизован");
    }
    const projectId = await ctx.db.insert("projects", {
      userId: userId,
      name: args.name,
      customInstructions: args.customInstructions,
      isPublic: false,
    });
    return projectId;
  },
});

export const update = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.optional(v.string()),
    customInstructions: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await currentUserId(ctx);
    if (!userId) {
      throw new Error("Не авторизован");
    }
    const project = await ctx.db.get(args.projectId);

    if (!project || project.userId !== userId) {
      throw new Error("Проект не найден или нет доступа");
    }

    await ctx.db.patch(args.projectId, {
      ...(args.name && { name: args.name }),
      ...(args.customInstructions !== undefined && {
        customInstructions: args.customInstructions,
      }),
      ...(typeof args.isPublic === "boolean" && { isPublic: args.isPublic }),
    });
  },
});

export const remove = mutation({
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

    // Каскадное удаление связанных файлов
    const files = await ctx.db
      .query("projectFiles")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    for (const file of files) {
      await ctx.db.delete(file._id);
    }

    // Каскадное удаление связанных тредов
    const threads = await ctx.db
      .query("projectThreads")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    for (const thread of threads) {
      await ctx.db.delete(thread._id);
    }

    // Удаление самого проекта
    await ctx.db.delete(args.projectId);
  },
});