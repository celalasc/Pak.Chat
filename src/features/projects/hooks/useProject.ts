import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

export function useProject(projectId: Id<"projects"> | undefined) {
  // Загрузка данных проекта
  const project = useQuery(
    projectId ? api.projects.get : undefined,
    projectId ? { projectId } : undefined
  );

  // Загрузка файлов проекта
  const files = useQuery(
    projectId ? api.projectFiles.list : undefined,
    projectId ? { projectId, paginationOpts: { numItems: 100, cursor: null } } : undefined
  )?.page;

  // Загрузка связанных тредов
  const linkedThreadIds = useQuery(
    projectId ? api.projectThreads.getForProject : undefined,
    projectId ? { projectId } : undefined
  );

  const isLoading = project === undefined || files === undefined || linkedThreadIds === undefined;

  // Мутация для обновления проекта
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
              return { ...oldProject, ...args };
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
                  userId: "optimistic_user_id" as Id<"users">,
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