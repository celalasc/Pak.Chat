import { query } from "./_generated/server";
import { v } from "convex/values";
import { currentUserId } from "./utils";

export const getNewChatData = query({
  args: {},
  handler: async (ctx, args) => {
    const userId = await currentUserId(ctx);
    
    if (!userId) {
      return {
        userSettings: null,
        recentThreads: []
      };
    }
    
    // Параллельная загрузка данных для нового чата
    const [userSettings, recentThreads] = await Promise.all([
      // Получаем настройки пользователя
      ctx.db.query("userSettings")
        .withIndex("by_user", q => q.eq("userId", userId))
        .first(),
      
      // Получаем последние чаты пользователя (для возможного контекста)
      ctx.db.query("threads")
        .withIndex("by_user_and_time", q => q.eq("userId", userId))
        .order("desc")
        .take(5)
    ]);

    return {
      userSettings,
      recentThreads
    };
  },
});
