import { create } from "zustand";

interface ProjectUIStore {
  isCreateProjectModalOpen: boolean;
  isEditProjectModalOpen: boolean;
  isFileUploadModalOpen: boolean;
  selectedProjectId: string | null;
  
  setCreateProjectModalOpen: (open: boolean) => void;
  setEditProjectModalOpen: (open: boolean) => void;
  setFileUploadModalOpen: (open: boolean) => void;
  setSelectedProjectId: (id: string | null) => void;
}

export const useProjectUIStore = create<ProjectUIStore>((set) => ({
  isCreateProjectModalOpen: false,
  isEditProjectModalOpen: false,
  isFileUploadModalOpen: false,
  selectedProjectId: null,

  setCreateProjectModalOpen: (open) =>
    set({ isCreateProjectModalOpen: open }),
  
  setEditProjectModalOpen: (open) =>
    set({ isEditProjectModalOpen: open }),
  
  setFileUploadModalOpen: (open) =>
    set({ isFileUploadModalOpen: open }),
  
  setSelectedProjectId: (id) =>
    set({ selectedProjectId: id }),
}));