import { create } from 'zustand';

interface MessageVersionState {
  versions: Record<string, number>;
  updateVersion: (id: string, version: number) => void;
}

/**
 * Global store for tracking message content versions.
 * This persists across component unmounts during the session
 * but is not persisted to storage.
 */
export const useMessageVersionStore = create<MessageVersionState>((set) => ({
  versions: {},
  updateVersion: (id, version) =>
    set((state) => ({
      versions: { ...state.versions, [id]: version },
    })),
}));
