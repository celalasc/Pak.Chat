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

  // 2. Слушатель состояния Firebase
  if (typeof window !== 'undefined') {
    onAuthStateChanged(auth, async (user) => {
      set({ user, loading: false });
    });
  }

  // 3. Начальное состояние + действия
  return {
    user: null,
    loading: true,
    blurPersonalData: false,
    ...actions,
  };
}); 