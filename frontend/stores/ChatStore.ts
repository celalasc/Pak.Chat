import { create } from 'zustand';

interface ChatStoreState {
  setInputFn: ((value: string) => void) | null;
  registerInputSetter: (fn: (value: string) => void) => void;
  setInput: (value: string) => void;
  nextDialogVersion: number | null;
  setNextDialogVersion: (v: number | null) => void;
  consumeNextDialogVersion: () => number | null;
}

export const useChatStore = create<ChatStoreState>((set, get) => ({
  setInputFn: null,
  registerInputSetter: (fn) => set({ setInputFn: fn }),
  setInput: (value) => {
    const fn = get().setInputFn;
    if (fn) fn(value);
  },
  nextDialogVersion: null,
  setNextDialogVersion: (v) => set({ nextDialogVersion: v }),
  consumeNextDialogVersion: () => {
    const v = get().nextDialogVersion;
    set({ nextDialogVersion: null });
    return v;
  },
}));
