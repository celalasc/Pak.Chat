import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { currentUserId } from "./utils";

export const list = query({
  args: {
    projectId: v.id("projects"),
    paginationOpts: v.any(),
  },
  handler: async (ctx, args) => {
    const userId = await currentUserId(ctx);
    if (!userId) {
      throw new Error("Не авторизован");
    }
    // Проверка, принадлежит ли проект текущему пользователю
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      console.log("DEBUG: Project not found, projectId:", args.projectId);
      throw new Error("Проект не найден");
    }
    if (project.userId !== userId) {
      console.log("DEBUG: Access denied, project.userId:", project.userId, "current userId:", userId);
      throw new Error("Нет доступа к проекту");
    }

    const files = await ctx.db
      .query("projectFiles")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("asc")
      .paginate(args.paginationOpts);

    return files;
  },
});

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.string(),
    content: v.string(),
    fileType: v.string(),
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

    const fileId = await ctx.db.insert("projectFiles", {
      userId: userId,
      projectId: args.projectId,
      name: args.name,
      content: args.content,
      fileType: args.fileType,
    });
    return fileId;
  },
});

export const update = mutation({
  args: {
    fileId: v.id("projectFiles"),
    name: v.optional(v.string()),
    content: v.optional(v.string()),
    fileType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await currentUserId(ctx);
    if (!userId) {
      throw new Error("Не авторизован");
    }
    const file = await ctx.db.get(args.fileId);
    if (!file || file.userId !== userId) {
      throw new Error("Файл не найден или нет доступа");
    }

    await ctx.db.patch(args.fileId, {
      ...(args.name && { name: args.name }),
      ...(args.content && { content: args.content }),
      ...(args.fileType && { fileType: args.fileType }),
    });
  },
});

export const remove = mutation({
  args: { fileId: v.id("projectFiles") },
  handler: async (ctx, args) => {
    const userId = await currentUserId(ctx);
    if (!userId) {
      throw new Error("Не авторизован");
    }
    const file = await ctx.db.get(args.fileId);
    if (!file || file.userId !== userId) {
      throw new Error("Файл не найден или нет доступа");
    }
    await ctx.db.delete(args.fileId);
  },
});