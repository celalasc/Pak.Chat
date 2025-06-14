import { User, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { create } from 'zustand';
import { auth } from '@/firebase';

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
      try {
        await signInWithPopup(auth, new GoogleAuthProvider());
      } catch (error) {
        console.error("Login failed:", error);
      }
    },
    async logout() {
      try {
        await signOut(auth);
      } catch (error) {
        console.error("Logout failed:", error);
      }
    },
    toggleBlur: () => {
      set((s) => ({ blurPersonalData: !s.blurPersonalData }));
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
    blurPersonalData: false,
    ...actions,
    init,
  };
});
