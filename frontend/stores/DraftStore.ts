import { create } from 'zustand';

interface DraftState {
  draftKey: number;
  next: () => void;
}

export const useDraftStore = create<DraftState>(set => ({
  draftKey: 0,
  next: () => set(s => ({ draftKey: s.draftKey + 1 })),
}));
