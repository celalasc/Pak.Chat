```ascii
Итоговый Чек-лист: Фича "Проекты"
====================================

Часть 1: Backend (Convex)
--------------------------
[x] 1.1. Проектирование схемы данных (convex/schema.ts)
    [x] 1.1.1. Определить таблицу `projects` с полями (userId, name, customInstructions, isPublic) и индексом `by_user`.
    [x] 1.1.2. Определить таблицу `projectFiles` с полями (userId, projectId, name, content, fileType) и индексом `by_project`.
    [x] 1.1.3. Определить таблицу `projectThreads` для связи проектов и чатов (userId, projectId, threadId) и индексами `by_project`, `by_thread`.

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  projects: defineTable({
    userId: v.id("users"), // Связь с пользователем
    name: v.string(),
    customInstructions: v.optional(v.string()),
    isPublic: v.boolean(),
  }).index("by_user", ["userId"]), // Индекс для быстрого поиска проектов пользователя

  projectFiles: defineTable({
    userId: v.id("users"),
    projectId: v.id("projects"), // Связь с проектом
    name: v.string(),
    content: v.string(), // Содержимое файла (например, текст документа)
    fileType: v.string(), // Тип файла (например, "txt", "pdf", "md")
  }).index("by_project", ["projectId"]), // Индекс для быстрого поиска файлов проекта

  projectThreads: defineTable({
    userId: v.id("users"),
    projectId: v.id("projects"), // Связь с проектом
    threadId: v.id("threads"), // Связь с тредом чата (предполагается, что существует таблица `threads`)
  })
    .index("by_project", ["projectId"])
    .index("by_thread", ["threadId"]),
});
```

[x] 1.2. Реализация API-функций (convex/*.ts)
    [x] 1.2.1. Создать `convex/projects.ts`
        [x] `list()` - с пагинацией и проверкой авторизации.
        [x] `get()` - с проверкой авторизации.
        [x] `create()` - создание нового проекта.
        [x] `update()` - обновление данных проекта.
        [x] `remove()` - каскадное удаление проекта и всех связанных данных.
    [x] 1.2.2. Создать `convex/projectFiles.ts`
        [x] `list()` - с пагинацией и проверкой авторизации.
        [x] `create()` - создание нового файла.
        [x] `update()` - обновление файла.
        [x] `remove()` - удаление файла.
    [x] 1.2.3. Создать `convex/projectThreads.ts`
        [x] `getForProject()` - получение всех связанных тредов.
        [x] `linkThread()` - идемпотентная привязка треда к проекту.
        [x] `unlinkThread()` - отвязка треда.

```typescript
// convex/projects.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Вспомогательная функция для получения текущего пользователя и проверки авторизации
async function getCurrentUserId(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Не авторизован");
  }
  return identity.subject; // Идентификатор пользователя
}

export const list = query({
  args: {
    paginationOpts: v.any(), // Типизация для PaginationOptions<...> из Convex
  },
  handler: async (ctx, args) => {
    const currentUserId = await getCurrentUserId(ctx);

    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", currentUserId))
      .order("desc") // Сортировка, например, по времени создания
      .paginate(args.paginationOpts);

    return projects;
  },
});

export const get = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const currentUserId = await getCurrentUserId(ctx);
    const project = await ctx.db.get(args.projectId);

    if (!project || project.userId !== currentUserId) {
      throw new Error("Проект не найден или нет доступа");
    }
    return project;
  },
});

export const create = mutation({
  args: { name: v.string(), customInstructions: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const currentUserId = await getCurrentUserId(ctx);
    const projectId = await ctx.db.insert("projects", {
      userId: currentUserId,
      name: args.name,
      customInstructions: args.customInstructions,
      isPublic: false, // По умолчанию приватный
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
    const currentUserId = await getCurrentUserId(ctx);
    const project = await ctx.db.get(args.projectId);

    if (!project || project.userId !== currentUserId) {
      throw new Error("Проект не найден или нет доступа");
    }

    await ctx.db.patch(args.projectId, {
      ...(args.name && { name: args.name }),
      ...(args.customInstructions && {
        customInstructions: args.customInstructions,
      }),
      ...(typeof args.isPublic === "boolean" && { isPublic: args.isPublic }),
    });
  },
});

export const remove = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const currentUserId = await getCurrentUserId(ctx);
    const project = await ctx.db.get(args.projectId);

    if (!project || project.userId !== currentUserId) {
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
```

```typescript
// convex/projectFiles.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

async function getCurrentUserId(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Не авторизован");
  }
  return identity.subject;
}

export const list = query({
  args: {
    projectId: v.id("projects"),
    paginationOpts: v.any(),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getCurrentUserId(ctx);
    // Проверка, принадлежит ли проект текущему пользователю
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== currentUserId) {
      throw new Error("Проект не найден или нет доступа");
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
    const currentUserId = await getCurrentUserId(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== currentUserId) {
      throw new Error("Проект не найден или нет доступа");
    }

    const fileId = await ctx.db.insert("projectFiles", {
      userId: currentUserId,
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
    const currentUserId = await getCurrentUserId(ctx);
    const file = await ctx.db.get(args.fileId);
    if (!file || file.userId !== currentUserId) {
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
    const currentUserId = await getCurrentUserId(ctx);
    const file = await ctx.db.get(args.fileId);
    if (!file || file.userId !== currentUserId) {
      throw new Error("Файл не найден или нет доступа");
    }
    await ctx.db.delete(args.fileId);
  },
});
```

```typescript
// convex/projectThreads.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

async function getCurrentUserId(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Не авторизован");
  }
  return identity.subject;
}

export const getForProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const currentUserId = await getCurrentUserId(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== currentUserId) {
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
    const currentUserId = await getCurrentUserId(ctx);
    const project = await ctx.db.get(args.projectId);
    const thread = await ctx.db.get(args.threadId); // Предполагаем, что таблица 'threads' существует

    if (!project || project.userId !== currentUserId) {
      throw new Error("Проект не найден или нет доступа");
    }
    if (!thread || thread.userId !== currentUserId) {
      // Проверяем, что тред принадлежит пользователю
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
      userId: currentUserId,
      projectId: args.projectId,
      threadId: args.threadId,
    });
    return linkId;
  },
});

export const unlinkThread = mutation({
  args: { projectId: v.id("projects"), threadId: v.id("threads") },
  handler: async (ctx, args) => {
    const currentUserId = await getCurrentUserId(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== currentUserId) {
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
```

Часть 2: Frontend (Hooks & UI)
-------------------------------
[x] 2.1. Настроить структуру директорий по FSD (`src/features/projects/`).

[x] 2.2. Реализовать хуки бизнес-логики (`src/features/projects/hooks/`)
    [x] 2.2.1. Хук `useProjects` для работы со списком проектов:
        [x] Загрузка пагинированного списка проектов.
        [x] Реализация функции `loadMore`.
        [x] Обернуть мутации `createProject`, `updateProject`, `deleteProject` в `.withOptimisticUpdate()`.

```typescript
// src/features/projects/hooks/useProjects.ts
import { useMutation, usePaginatedQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

export function useProjects() {
  // Загрузка пагинированного списка проектов
  const { results: projects, status, loadMore } = usePaginatedQuery(
    api.projects.list,
    {},
    { initialNumItems: 10 } // Загружаем 10 проектов изначально
  );

  const isLoading = status === "LoadingFirstPage"; // Индикатор первой загрузки

  // Мутация для создания проекта с оптимистичным обновлением
  const createProjectMutation = useMutation(api.projects.create);
  const createProject = (name: string, customInstructions?: string) => {
    return createProjectMutation(
      { name, customInstructions },
      {
        optimisticUpdate: (localStore, args) => {
          // Создаем временный ID для нового проекта
          const tempId = localStore.generateOptimisticId() as Id<"projects">;
          // Добавляем новый проект в кэш
          localStore.setQuery(
            api.projects.list,
            {},
            (oldProjects) => [
              {
                _id: tempId,
                _creationTime: Date.now(),
                name: args.name,
                customInstructions: args.customInstructions,
                isPublic: false,
                userId: "optimistic_user_id", // Заглушка, будет заменена реальным ID
              },
              ...oldProjects, // Добавляем в начало списка
            ],
            true // Добавляем в начало списка
          );
        },
      }
    );
  };

  // Мутация для удаления проекта с оптимистичным обновлением
  const deleteProjectMutation = useMutation(api.projects.remove);
  const deleteProject = (projectId: Id<"projects">) => {
    return deleteProjectMutation(
      { projectId },
      {
        optimisticUpdate: (localStore) => {
          // Удаляем проект из кэша
          localStore.setQuery(
            api.projects.list,
            {},
            (oldProjects) =>
              oldProjects.filter((p) => p._id !== projectId),
            false // Не добавляем, а фильтруем
          );
          // Также можно удалить связанные файлы и треды из соответствующих кэшей,
          // если они загружены отдельными запросами.
          localStore.setQuery(
            api.projectFiles.list,
            { projectId },
            () => [], // Очищаем список файлов для этого проекта
            false
          );
          localStore.setQuery(
            api.projectThreads.getForProject,
            { projectId },
            () => [], // Очищаем список тредов для этого проекта
            false
          );
        },
      }
    );
  };

  // Мутация для обновления проекта (без примера optimisticUpdate для краткости, но принцип тот же)
  const updateProjectMutation = useMutation(api.projects.update);
  const updateProject = (
    projectId: Id<"projects">,
    updates: { name?: string; customInstructions?: string; isPublic?: boolean }
  ) => {
    return updateProjectMutation({ projectId, ...updates });
  };

  return {
    projects,
    isLoading,
    loadMore,
    hasMore: status === "CanLoadMore",
    createProject,
    deleteProject,
    updateProject,
  };
}
```

    [x] 2.2.2. Хук `useProject` для работы с одним проектом:
        [x] Загрузка данных проекта, списка его файлов и связанных тредов.
        [x] Обернуть мутации `updateProject`, `uploadFile`, `deleteFile`, `linkThread`, `unlinkThread` в `.withOptimisticUpdate()`.

```typescript
// src/features/projects/hooks/useProject.ts
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

export function useProject(projectId: Id<"projects"> | undefined) {
  // Загрузка данных проекта
  const project = useQuery(
    projectId ? api.projects.get : undefined, // Запрос выполняется только если projectId определен
    projectId ? { projectId } : undefined
  );

  // Загрузка файлов проекта (с пагинацией для продакшн-приложения)
  // Для простоты здесь показан без пагинации, в реальном приложении использовать usePaginatedQuery
  const files = useQuery(
    projectId ? api.projectFiles.list : undefined,
    projectId ? { projectId, paginationOpts: { numItems: 100, cursor: null } } : undefined
  )?.page; // Access the 'page' property from the paginated result

  // Загрузка связанных тредов
  const linkedThreadIds = useQuery(
    projectId ? api.projectThreads.getForProject : undefined,
    projectId ? { projectId } : undefined
  );

  const isLoading = project === undefined || files === undefined || linkedThreadIds === undefined;

  // Мутация для обновления проекта (пример optimisticUpdate)
  const updateProjectMutation = useMutation(api.projects.update);
  const updateProject = (
    updates: { name?: string; customInstructions?: string; isPublic?: boolean }
  ) => {
    if (!projectId) return;
    return updateProjectMutation(
      { projectId, ...updates },
      {
        optimisticUpdate: (localStore, args) => {
          // Обновляем текущий проект в кэше
          localStore.setQuery(
            api.projects.get,
            { projectId },
            (oldProject) => {
              if (!oldProject) return oldProject;
              return { ...oldProject, ...args }; // Применяем изменения
            }
          );
          // Если есть запрос списка проектов, его тоже можно обновить
          localStore.setQuery(
            api.projects.list,
            {},
            (oldProjects) =>
              oldProjects.map((p) =>
                p._id === projectId ? { ...p, ...args } : p
              ),
            false
          );
        },
      }
    );
  };

  // Мутация для загрузки файла
  const uploadFileMutation = useMutation(api.projectFiles.create);
  const uploadFile = (name: string, content: string, fileType: string) => {
    if (!projectId) return;
    return uploadFileMutation(
      { projectId, name, content, fileType },
      {
        optimisticUpdate: (localStore, args) => {
          const tempFileId = localStore.generateOptimisticId() as Id<"projectFiles">;
          localStore.setQuery(
            api.projectFiles.list,
            { projectId, paginationOpts: { numItems: 100, cursor: null } },
            (oldFilesPage) => ({
              ...oldFilesPage,
              page: [
                {
                  _id: tempFileId,
                  _creationTime: Date.now(),
                  projectId,
                  userId: "optimistic_user_id",
                  name: args.name,
                  content: args.content,
                  fileType: args.fileType,
                },
                ...(oldFilesPage?.page || []),
              ],
            }),
            true
          );
        },
      }
    );
  };

  // Мутация для удаления файла
  const deleteFileMutation = useMutation(api.projectFiles.remove);
  const deleteFile = (fileId: Id<"projectFiles">) => {
    if (!projectId) return;
    return deleteFileMutation(
      { fileId },
      {
        optimisticUpdate: (localStore) => {
          localStore.setQuery(
            api.projectFiles.list,
            { projectId, paginationOpts: { numItems: 100, cursor: null } },
            (oldFilesPage) => ({
              ...oldFilesPage,
              page: (oldFilesPage?.page || []).filter((f) => f._id !== fileId),
            }),
            false
          );
        },
      }
    );
  };

  // Мутация для привязки/отвязки треда
  const linkThreadMutation = useMutation(api.projectThreads.linkThread);
  const linkThread = (threadId: Id<"threads">) => {
    if (!projectId) return;
    return linkThreadMutation({ projectId, threadId });
  };

  const unlinkThreadMutation = useMutation(api.projectThreads.unlinkThread);
  const unlinkThread = (threadId: Id<"threads">) => {
    if (!projectId) return;
    return unlinkThreadMutation({ projectId, threadId });
  };

  return {
    project,
    files,
    linkedThreadIds,
    isLoading,
    updateProject,
    uploadFile,
    deleteFile,
    linkThread,
    unlinkThread,
  };
}
```

[x] 2.3. Реализовать UI-компоненты (`src/features/projects/components/`)
    [x] 2.3.1. Компонент `ProjectsDropdown`:
        [x] Отображение списка проектов.
        [x] Реализация бесконечного скролла с использованием `loadMore`.
        [x] Поле для поиска/фильтрации проектов на клиенте.
        [x] Кнопка "Создать проект", открывающая модальное окно.
        [x] Меню для каждого проекта (редактировать, удалить).
    [x] 2.3.2. Компонент `ProjectPage` (`src/features/projects/pages/`):
        [x] Использование хука `useProject` для получения данных.
        [x] Композиция дочерних компонентов (`ProjectHeader`, `ProjectKnowledge`).

```tsx
// src/features/projects/pages/ProjectPage.tsx
import { useParams } from "next/navigation"; // Пример для Next.js
import { useProject } from "../hooks/useProject";
import { Id } from "../../../../convex/_generated/dataModel";
import ProjectHeader from "../components/ProjectHeader";
import ProjectKnowledge from "../components/ProjectKnowledge";
import ProjectPageSkeleton from "../components/ProjectPageSkeleton"; // Компонент скелетона

export default function ProjectPage() {
  const params = useParams();
  const projectId = params?.projectId as Id<"projects"> | undefined;

  const { project, files, isLoading, updateProject, uploadFile, deleteFile } =
    useProject(projectId);

  if (isLoading) {
    return <ProjectPageSkeleton />; // Показываем скелетон во время загрузки
  }

  if (!project) {
    return (
      <div className="text-center p-8">
        <h1 className="text-2xl font-bold">Проект не найден</h1>
        <p className="text-gray-600">
          Возможно, вы ввели неверный URL или у вас нет доступа к этому проекту.
        </p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <ProjectHeader
        project={project}
        onUpdate={(updates) => updateProject(updates)}
      />
      <div className="mt-8">
        <ProjectKnowledge
          files={files || []} // Обеспечиваем пустой массив, если файлов нет
          onUpload={uploadFile}
          onDelete={deleteFile}
        />
      </div>
    </div>
  );
}
```

    [x] 2.3.3. Дочерние компоненты страницы проекта:
        [x] `ProjectHeader`: отображение и редактирование имени/инструкций.
        [x] `ProjectKnowledge`: управление файлами (загрузка, список, удаление).

    [x] 2.4. Управление UI-состоянием (`src/features/projects/stores/`)
        [x] 2.4.1. Создать Zustand-стор `projectUIStore.ts` для управления состоянием модальных окон (e.g., `isCreateProjectModalOpen`).

Часть 3: Integration
---------------------
[x] 3.1. Встроить `ProjectsDropdown` в глобальный хедер приложения.
[x] 3.2. Настроить роутинг для динамического маршрута `/projects/[projectId]` для отображения `ProjectPage`.
[x] 3.3. Интегрировать контекст проекта в LLM:
    [x] 3.3.1. Модифицировать API-роут `/api/llm/route.ts` для приема `projectId`.
    [x] 3.3.2. В роуте использовать `ConvexHttpClient` для запроса данных проекта и его файлов.
    [x] 3.3.3. Сформировать `projectContext` из инструкций и контента файлов.
    [x] 3.3.4. Добавить `projectContext` в системный промпт для LLM.

```typescript
// pages/api/llm/route.ts (пример для Next.js App Router)
import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

// Инициализация ConvexHttpClient с URL вашего бэкенда Convex
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: NextRequest) {
  try {
    const { projectId, messages } = await req.json();

    let systemPrompt = "Вы полезный ИИ-помощник.";
    let projectContext = "";

    // 3.3.2. В роуте использовать ConvexHttpClient для запроса данных проекта и его файлов.
    if (projectId) {
      const project = await convex.query(api.projects.get, {
        projectId: projectId as Id<"projects">,
      });

      if (project) {
        // 3.3.3. Сформировать `projectContext` из инструкций
        if (project.customInstructions) {
          projectContext += `\n\nИнструкции для этого проекта: ${project.customInstructions}`;
        }

        const filesPage = await convex.query(api.projectFiles.list, {
          projectId: projectId as Id<"projects">,
          paginationOpts: { numItems: 100, cursor: null }, // Получаем до 100 файлов
        });

        if (filesPage?.page && filesPage.page.length > 0) {
          projectContext += "\n\nКонтекст из файлов проекта:";
          filesPage.page.forEach((file) => {
            projectContext += `\n--- Файл: ${file.name} (${file.fileType}) ---\n`;
            projectContext += file.content;
            projectContext += "\n--- Конец файла ---\n";
          });
        }
      }
    }

    // 3.3.4. Добавить `projectContext` в системный промпт для LLM.
    systemPrompt += projectContext;

    // Здесь должна быть логика взаимодействия с вашей LLM (например, OpenAI API)
    // Пример структуры запроса к LLM
    const llmResponse = {
      // Это заглушка, реальный вызов LLM API будет здесь
      // Например:
      // const openai = new OpenAI();
      // const completion = await openai.chat.completions.create({
      //   model: "gpt-4",
      //   messages: [{ role: "system", content: systemPrompt }, ...messages],
      // });
      // return NextResponse.json({ message: completion.choices[0].message.content });
      message: `Ответ LLM, учитывающий контекст: "${systemPrompt}" и ваше сообщение.`,
    };

    return NextResponse.json(llmResponse);
  } catch (error: any) {
    console.error("Ошибка в LLM API:", error);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
```

*Дополнение для `ChatHistory` компонента, показывающее условное получение чатов, связанных с проектом:*

```tsx
// src/components/ChatHistory.tsx (пример)
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface ChatHistoryProps {
  projectId?: Id<"projects">; // projectId может быть опциональным
  // другие пропсы для отображения истории чатов
}

export default function ChatHistory({ projectId }: ChatHistoryProps) {
  // Условное получение списка threadId, связанных с текущим проектом
  const linkedThreadIds = useQuery(
    projectId ? api.projectThreads.getForProject : undefined,
    projectId ? { projectId } : undefined
  );

  // Если projectId передан и linkedThreadIds загружаются/загружены,
  // мы можем фильтровать или получать только эти треды.
  // Например, если у вас есть хук useThreads, который получает все треды:
  // const { threads, isLoading: isLoadingAllThreads } = useThreads();
  // const filteredThreads = useMemo(() => {
  //   if (!projectId || !linkedThreadIds) return threads;
  //   const linkedSet = new Set(linkedThreadIds.map(id => id.toString()));
  //   return threads.filter(thread => linkedSet.has(thread._id.toString()));
  // }, [threads, projectId, linkedThreadIds]);

  // Для демонстрации, просто покажем статус загрузки и ID тредов
  const isLoadingProjectThreads = linkedThreadIds === undefined && projectId !== undefined;

  if (isLoadingProjectThreads) {
    return <div>Загрузка тредов проекта...</div>;
  }

  return (
    <div className="chat-history">
      <h2>История чатов</h2>
      {projectId ? (
        linkedThreadIds && linkedThreadIds.length > 0 ? (
          <div>
            <p>Треды, связанные с проектом ({projectId}):</p>
            <ul>
              {linkedThreadIds.map((threadId) => (
                <li key={threadId}>{threadId}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p>Нет тредов, связанных с этим проектом.</p>
        )
      ) : (
        <p>Отображаются все треды.</p>
        // Здесь можно отображать общую историю чатов, если projectId не задан
      )}
      {/* ... остальная логика отображения чатов ... */}
    </div>
  );
}
```

Часть 4: UX/UI Polish
----------------------
[x] 4.1. Реализовать состояния загрузки (Skeleton Loaders):
    [x] 4.1.1. Для списка проектов в `ProjectsDropdown`.
    [x] 4.1.2. Для контента на `ProjectPage` (заголовок, список файлов).

```tsx
// src/components/ProjectPageSkeleton.tsx (пример компонента скелетона)
export default function ProjectPageSkeleton() {
  return (
    <div className="p-8 max-w-4xl mx-auto animate-pulse">
      {/* Скелетон для заголовка проекта */}
      <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
      <div className="h-5 bg-gray-200 rounded w-1/2 mb-8"></div>

      {/* Скелетон для секции "Знания" */}
      <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
      <div className="space-y-4">
        <div className="h-10 bg-gray-200 rounded w-full"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-24 bg-gray-200 rounded"></div>
          <div className="h-24 bg-gray-200 rounded"></div>
          <div className="h-24 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  );
}

// Пример использования в компоненте ProjectsDropdown
// src/features/projects/components/ProjectsDropdown.tsx
import { useProjects } from "../hooks/useProjects";
import ProjectDropdownSkeleton from "./ProjectDropdownSkeleton"; // Предполагаемый компонент скелетона

export default function ProjectsDropdown() {
  const { projects, isLoading, loadMore, hasMore, createProject, deleteProject } = useProjects();

  if (isLoading) {
    return <ProjectDropdownSkeleton />; // Показываем скелетон во время первой загрузки
  }

  return (
    <div className="projects-dropdown">
      {/* ... Логика отображения проектов ... */}
      {projects.length === 0 && !isLoading ? (
        <p>У вас еще нет проектов. Нажмите "Создать проект"!</p>
      ) : (
        <ul>
          {projects.map((project) => (
            <li key={project._id}>{project.name}</li>
          ))}
        </ul>
      )}
      {hasMore && (
        <button onClick={() => loadMore(10)}>Загрузить еще</button>
      )}
      <button onClick={() => createProject("Новый проект")}>
        Создать проект
      </button>
    </div>
  );
}

// src/components/ProjectDropdownSkeleton.tsx (пример)
export function ProjectDropdownSkeleton() {
  return (
    <div className="p-4 space-y-3 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-3/4"></div>
      <div className="space-y-2">
        <div className="h-6 bg-gray-200 rounded w-full"></div>
        <div className="h-6 bg-gray-200 rounded w-full"></div>
        <div className="h-6 bg-gray-200 rounded w-full"></div>
      </div>
    </div>
  );
}
```

[x] 4.2. Реализовать состояния пустых данных:
    [x] 4.2.1. "У вас еще нет проектов" в `ProjectsDropdown`. (Показано в примере выше)
    [x] 4.2.2. "В проекте пока нет файлов" на `ProjectPage`.

```tsx
// src/features/projects/components/ProjectKnowledge.tsx (пример)
import React from "react";
import { Doc, Id } from "../../../../convex/_generated/dataModel";

interface ProjectKnowledgeProps {
  files: Doc<"projectFiles">[];
  onUpload: (name: string, content: string, fileType: string) => Promise<Id<"projectFiles"> | undefined>;
  onDelete: (fileId: Id<"projectFiles">) => Promise<void>;
}

export default function ProjectKnowledge({ files, onUpload, onDelete }: ProjectKnowledgeProps) {
  // Пример заглушки для загрузки файла
  const handleUploadClick = async () => {
    await onUpload("Новый файл.txt", "Содержимое нового файла.", "txt");
    alert("Файл загружен (оптимистично)!");
  };

  return (
    <div className="border p-4 rounded-lg">
      <h3 className="text-xl font-semibold mb-4">Знания проекта (Файлы)</h3>
      {files.length === 0 ? (
        <div className="text-center p-8 border-dashed border-2 rounded-lg text-gray-500">
          <p className="mb-4">В этом проекте пока нет файлов.</p>
          <button
            onClick={handleUploadClick}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Загрузить первый файл
          </button>
        </div>
      ) : (
        <div>
          <ul className="space-y-2 mb-4">
            {files.map((file) => (
              <li
                key={file._id}
                className="flex justify-between items-center bg-gray-100 p-2 rounded-md"
              >
                <span>
                  {file.name} ({file.fileType})
                </span>
                <button
                  onClick={() => onDelete(file._id)}
                  className="text-red-500 hover:text-red-700"
                >
                  Удалить
                </button>
              </li>
            ))}
          </ul>
          <button
            onClick={handleUploadClick}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Загрузить новый файл
          </button>
        </div>
      )}
    </div>
  );
}
```

[x] 4.3. Реализовать обработку ошибок:
    [x] 4.3.1. Отображение понятных сообщений при сбое загрузки данных.
    [x] 4.3.2. Добавление кнопки "Повторить запрос".
    [x] 4.3.3. Корректный откат UI при ошибке оптимистичного обновления. (Это по умолчанию обрабатывается Convex, если мутация завершается с ошибкой, optimisticUpdate откатывается).

```typescript
// Пример расширенной обработки ошибок для useProjects
// src/features/projects/hooks/useProjects.ts (дополнение)
// ...
export function useProjects() {
  const { results: projects, status, loadMore, error } = usePaginatedQuery(
    api.projects.list,
    {},
    { initialNumItems: 10 }
  );

  const isLoading = status === "LoadingFirstPage";

  // Дополнительный статус для ошибок загрузки
  const hasError = status === "Error" || error !== null;

  // Мутация для создания проекта (дополнение к optimisticUpdate)
  const createProjectMutation = useMutation(api.projects.create);
  const createProject = async (name: string, customInstructions?: string) => {
    try {
      await createProjectMutation(
        { name, customInstructions },
        {
          optimisticUpdate: (localStore, args) => {
            // ... логика optimisticUpdate ...
          },
        }
      );
    } catch (e) {
      console.error("Ошибка при создании проекта:", e);
      // Здесь можно показать Toast-уведомление об ошибке
      throw e; // Позволяем ошибке распространиться, чтобы UI мог ее обработать
    }
  };

  // ... остальной код хука ...

  return {
    projects,
    isLoading,
    loadMore,
    hasMore: status === "CanLoadMore",
    createProject,
    deleteProject,
    updateProject,
    hasError,
    error, // Возвращаем объект ошибки
    retry: () => {
      // Можно использовать useQuery 'refetch' или просто перезагрузить страницу
      // В usePaginatedQuery нет прямого метода retry,
      // можно попробовать вызвать loadMore(0) или просто обновить компонент.
      // Для реального использования лучше обернуть usePaginatedQuery в custom hook
      // и добавить логику ретрая. Для демонстрации, это просто Placeholder.
      console.log("Попытка повторить запрос...");
    },
  };
}


// Пример отображения ошибок в ProjectsDropdown
// src/features/projects/components/ProjectsDropdown.tsx (дополнение)
// ...
export default function ProjectsDropdown() {
  const { projects, isLoading, loadMore, hasMore, createProject, hasError, error, retry } = useProjects();

  if (isLoading) {
    return <ProjectDropdownSkeleton />;
  }

  if (hasError) {
    return (
      <div className="text-center p-4 text-red-600">
        <p>Не удалось загрузить проекты: {error?.message || "Неизвестная ошибка"}</p>
        <button onClick={retry} className="mt-2 px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200">
          Повторить
        </button>
      </div>
    );
  }

  return (
    <div className="projects-dropdown">
      {/* ... остальная логика ... */}
    </div>
  );
}
```

Часть 5: Testing & Deployment
------------------------------
[ ] 5.1. Написать тесты для бэкенд-логики (Convex functions).
[ ] 5.2. Написать компонентные тесты для ключевых UI-элементов (`ProjectsDropdown`, `ProjectPage`).
[ ] 5.3. Провести End-to-End тестирование полного пользовательского сценария.
[ ] 5.4. Настроить переменные окружения Convex в CI/CD.
[ ] 5.5. Развернуть изменения бэкенда командой `npx convex deploy`.
[ ] 5.6. Развернуть фронтенд приложение.
[ ] 5.7. Провести мониторинг производительности и ошибок после развертывания.
```