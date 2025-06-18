import { User, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { create } from 'zustand';
import { auth } from '@/firebase';
import { useSettingsStore } from './SettingsStore';
import { clearLastChatId } from '@/frontend/lib/lastChat';

interface AuthState {
  user: User | null;
  loading: boolean;
  blurPersonalData: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  toggleBlur: () => void;
  init: () => () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // 1. Действия
  const actions = {
    async login() {
      set({ loading: true });
      try {
        await signInWithPopup(auth, new GoogleAuthProvider());
      } finally {
        set({ loading: false });
      }
    },
    async logout() {
      try {
        await signOut(auth);
        clearLastChatId();
      } catch {
        /* ignore logout failure */
      }
    },
    toggleBlur: () => {
      set((s) => {
        const newValue = !s.blurPersonalData;
        useSettingsStore.getState().setSettings({ hidePersonal: newValue });
        return { blurPersonalData: newValue };
      });
    },
  };

  // Allows React components to start and clean up the auth listener
  const init = () => {
    if (typeof window === 'undefined') {
      return () => {};
    }
    const unsub = onAuthStateChanged(auth, async (user) => {
      set({ user, loading: false });
    });
    return unsub;
  };

  // 3. Начальное состояние + действия
  return {
    user: null,
    loading: true,
    blurPersonalData: useSettingsStore.getState().settings.hidePersonal,
    ...actions,
    init,
  };
});
