import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

export function useProject(projectId: Id<"projects"> | undefined) {
  // Загрузка данных проекта
  const project = useQuery(
    api.projects.get,
    projectId ? { projectId } : "skip"
  );

  // Загрузка файлов проекта
  const files = useQuery(
    api.projectFiles.list,
    projectId ? { projectId, paginationOpts: { numItems: 100, cursor: null } } : "skip"
  )?.page;

  // Загрузка связанных тредов
  const linkedThreadIds = useQuery(
    api.projectThreads.getForProject,
    projectId ? { projectId } : "skip"
  );

  const isLoading = project === undefined || files === undefined || linkedThreadIds === undefined;

  // Мутация для обновления проекта
  const updateProjectMutation = useMutation(api.projects.update);
  const updateProject = async (
    updates: { name?: string; customInstructions?: string; isPublic?: boolean }
  ): Promise<void> => {
    if (!projectId) return;
    await updateProjectMutation({ projectId, ...updates });
  };

  // Мутация для загрузки файла
  const uploadFileMutation = useMutation(api.projectFiles.create);
  const uploadFile = async (name: string, content: string, fileType: string): Promise<Id<"projectFiles"> | undefined> => {
    if (!projectId) return;
    return await uploadFileMutation({ projectId, name, content, fileType });
  };

  // Мутация для удаления файла
  const deleteFileMutation = useMutation(api.projectFiles.remove);
  const deleteFile = async (fileId: Id<"projectFiles">): Promise<void> => {
    if (!projectId) return;
    await deleteFileMutation({ fileId });
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