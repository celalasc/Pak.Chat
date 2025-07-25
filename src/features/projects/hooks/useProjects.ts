import { useMutation, usePaginatedQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

export function useProjects() {
  // Загрузка пагинированного списка проектов
  const { results: projects, status, loadMore } = usePaginatedQuery(
    api.projects.list,
    {},
    { initialNumItems: 10 }
  );

  const isLoading = status === "LoadingFirstPage";

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
                userId: "optimistic_user_id" as Id<"users">,
              },
              ...oldProjects,
            ],
            true
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
            false
          );
          // Также можно удалить связанные файлы и треды из соответствующих кэшей,
          // если они загружены отдельными запросами.
          localStore.setQuery(
            api.projectFiles.list,
            { projectId },
            () => ({ page: [], isDone: true, continueCursor: null }),
            false
          );
          localStore.setQuery(
            api.projectThreads.getForProject,
            { projectId },
            () => [],
            false
          );
        },
      }
    );
  };

  // Мутация для обновления проекта
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