"use client";

import { useState, useEffect } from "react";
import { useConvex } from "convex/react";
import { useAuthStore } from "@/frontend/stores/AuthStore";
import {
  migrateDexieToConvex,
  clearDexieData,
  hasDexieData,
  MigrationProgress,
} from "@/frontend/utils/convexMigration";

interface MigrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function MigrationDialog({ open, onOpenChange }: MigrationDialogProps) {
  const convex = useConvex();
  const { user } = useAuthStore();
  const [migrationProgress, setMigrationProgress] = useState<MigrationProgress | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [hasDexieDataState, setHasDexieDataState] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationComplete, setMigrationComplete] = useState(false);

  useEffect(() => {
    if (open && user) {
      checkForDexieData();
    }
  }, [open, user]);

  const checkForDexieData = async () => {
    setIsChecking(true);
    try {
      const hasData = await hasDexieData();
      setHasDexieDataState(hasData);
    } catch (error) {
      console.error("Error checking for Dexie data:", error);
    } finally {
      setIsChecking(false);
    }
  };

  const startMigration = async () => {
    if (!user) return;

    setIsMigrating(true);
    setMigrationProgress({
      totalThreads: 0,
      migratedThreads: 0,
      totalMessages: 0,
      migratedMessages: 0,
      isComplete: false,
    });

    try {
      const result = await migrateDexieToConvex(
        convex,
        user.uid,
        (progress) => {
          setMigrationProgress(progress);
        }
      );

      if (result.isComplete && !result.error) {
        setMigrationComplete(true);
        // Очищаем данные Dexie после успешной миграции
        await clearDexieData();
      }
    } catch (error) {
      console.error("Migration failed:", error);
      setMigrationProgress(prev => prev ? {
        ...prev,
        error: error instanceof Error ? error.message : "Unknown error"
      } : null);
    } finally {
      setIsMigrating(false);
    }
  };

  const handleClose = () => {
    if (!isMigrating) {
      onOpenChange(false);
      // Сбрасываем состояние при закрытии
      setTimeout(() => {
        setMigrationProgress(null);
        setMigrationComplete(false);
      }, 300);
    }
  };

  const getProgressPercentage = () => {
    if (!migrationProgress) return 0;
    const totalItems = migrationProgress.totalThreads + migrationProgress.totalMessages;
    const migratedItems = migrationProgress.migratedThreads + migrationProgress.migratedMessages;
    return totalItems > 0 ? (migratedItems / totalItems) * 100 : 0;
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-lg font-semibold mb-2">Миграция данных</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Перенос ваших чатов из локального хранилища в облачную базу данных
        </p>

        <div className="space-y-4">
          {isChecking && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2" />
              <p className="text-sm text-gray-600 dark:text-gray-400">Проверка локальных данных...</p>
            </div>
          )}

          {!isChecking && !hasDexieDataState && (
            <div className="text-center py-4">
              <div className="h-12 w-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-2">
                ✓
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Локальные данные не найдены. Миграция не требуется.
              </p>
            </div>
          )}

          {!isChecking && hasDexieDataState && !migrationComplete && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="font-medium text-blue-900 dark:text-blue-100 text-sm">
                  Найдены локальные данные
                </p>
                <p className="text-blue-700 dark:text-blue-300 text-xs mt-1">
                  Рекомендуем перенести их в облако для синхронизации между устройствами.
                </p>
              </div>

              {migrationProgress && (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Прогресс миграции</span>
                    <span>{Math.round(getProgressPercentage())}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${getProgressPercentage()}%` }}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-xs text-gray-600 dark:text-gray-400">
                    <div>
                      <p>Чаты: {migrationProgress.migratedThreads}/{migrationProgress.totalThreads}</p>
                    </div>
                    <div>
                      <p>Сообщения: {migrationProgress.migratedMessages}/{migrationProgress.totalMessages}</p>
                    </div>
                  </div>

                  {migrationProgress.error && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <p className="text-sm text-red-700 dark:text-red-300">
                        Ошибка: {migrationProgress.error}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={startMigration}
                  disabled={isMigrating}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded text-sm font-medium"
                >
                  {isMigrating ? "Миграция..." : "Начать миграцию"}
                </button>
                <button 
                  onClick={handleClose} 
                  disabled={isMigrating}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Отмена
                </button>
              </div>
            </div>
          )}

          {migrationComplete && (
            <div className="text-center py-4">
              <div className="h-12 w-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-2">
                ✓
              </div>
              <p className="font-medium mb-1">Миграция завершена!</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Все ваши чаты успешно перенесены в облачную базу данных.
              </p>
              <button 
                onClick={handleClose}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium"
              >
                Готово
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 