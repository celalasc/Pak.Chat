import { create } from 'zustand';

interface UIState {
  /** ID of the message currently being edited */
  editingMessageId: string | null;
  setEditingMessageId: (id: string | null) => void;
}

/**
 * Store UI related state that is not persisted.
 */
export const useUIStore = create<UIState>((set) => ({
  editingMessageId: null,
  setEditingMessageId: (id) => set({ editingMessageId: id }),
}));
