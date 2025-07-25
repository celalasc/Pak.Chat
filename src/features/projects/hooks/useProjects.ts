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
    return createProjectMutation({ name, customInstructions });
  };

  // Мутация для удаления проекта с оптимистичным обновлением
  const deleteProjectMutation = useMutation(api.projects.remove);
  const deleteProject = (projectId: Id<"projects">) => {
    return deleteProjectMutation({ projectId });
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