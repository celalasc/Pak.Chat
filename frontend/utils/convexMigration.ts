import { db } from "@/frontend/dexie/db";
import { ConvexReactClient } from "convex/react";
import { api } from "@/convex/_generated/api";

export interface MigrationProgress {
  totalThreads: number;
  migratedThreads: number;
  totalMessages: number;
  migratedMessages: number;
  isComplete: boolean;
  error?: string;
}

export async function migrateDexieToConvex(
  convexClient: ConvexReactClient,
  userId: string,
  onProgress?: (progress: MigrationProgress) => void
): Promise<MigrationProgress> {
  const progress: MigrationProgress = {
    totalThreads: 0,
    migratedThreads: 0,
    totalMessages: 0,
    migratedMessages: 0,
    isComplete: false,
  };

  try {
    // Получаем все треды из Dexie
    const dexieThreads = await db.threads.toArray();
    progress.totalThreads = dexieThreads.length;
    onProgress?.(progress);

    // Подсчитываем общее количество сообщений
    for (const thread of dexieThreads) {
      const messages = await db.messages.where('threadId').equals(thread.id).toArray();
      progress.totalMessages += messages.length;
    }
    onProgress?.(progress);

    // Мигрируем каждый тред
    for (const dexieThread of dexieThreads) {
      try {
        // Создаем тред в Convex
        const convexThreadId = await convexClient.mutation(api.threads.createThread, {
          title: dexieThread.title,
          userId: userId,
        });

        // Получаем сообщения треда из Dexie
        const dexieMessages = await db.messages
          .where('threadId')
          .equals(dexieThread.id)
          .sortBy('createdAt');

        // Мигрируем сообщения
        for (const dexieMessage of dexieMessages) {
          await convexClient.mutation(api.messages.addMessage, {
            threadId: convexThreadId,
            role: dexieMessage.role === 'user' ? 'user' : 'assistant',
            content: dexieMessage.content,
          });

          progress.migratedMessages++;
          onProgress?.(progress);
        }

        progress.migratedThreads++;
        onProgress?.(progress);
      } catch (error) {
        console.error(`Error migrating thread ${dexieThread.id}:`, error);
        progress.error = `Failed to migrate thread: ${dexieThread.title}`;
        onProgress?.(progress);
      }
    }

    progress.isComplete = true;
    onProgress?.(progress);
    return progress;
  } catch (error) {
    progress.error = error instanceof Error ? error.message : 'Unknown error';
    onProgress?.(progress);
    return progress;
  }
}

export async function clearDexieData(): Promise<void> {
  try {
    await db.transaction('rw', [db.threads, db.messages, db.messageSummaries], async () => {
      await db.threads.clear();
      await db.messages.clear();
      await db.messageSummaries.clear();
    });
  } catch (error) {
    console.error('Error clearing Dexie data:', error);
    throw error;
  }
}

export async function hasDexieData(): Promise<boolean> {
  try {
    const threadCount = await db.threads.count();
    return threadCount > 0;
  } catch (error) {
    console.error('Error checking Dexie data:', error);
    return false;
  }
} 