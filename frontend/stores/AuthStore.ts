import { User, GoogleAuthProvider, signInWithRedirect, signInWithPopup, signOut, onAuthStateChanged, getRedirectResult } from 'firebase/auth';
import { create } from 'zustand';
import { auth } from '@/firebase';
import { useSettingsStore } from './SettingsStore';
import { clearLastChatId } from '@/frontend/lib/lastChat';
import { useModelVisibilityStore } from './ModelVisibilityStore';

interface AuthState {
  user: User | null;
  loading: boolean;
  redirecting: boolean;
  blurPersonalData: boolean;
  login: () => Promise<void>;
  loginWithPopup: () => Promise<void>;
  logout: () => Promise<void>;
  toggleBlur: () => void;
  init: () => () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // 1. Действия
  const actions = {
    async login() {
      set({ loading: true, redirecting: true });
      try {
        await signInWithRedirect(auth, new GoogleAuthProvider());
      } catch (error) {
        console.error('Login error:', error);
        set({ loading: false, redirecting: false });
      }
    },
    async loginWithPopup() {
      set({ loading: true });
      try {
        const result = await signInWithPopup(auth, new GoogleAuthProvider());
      } catch (error) {
        console.error('Popup login error:', error);
      } finally {
        set({ loading: false });
      }
    },
    async logout() {
      try {
        await signOut(auth);
        clearLastChatId();
        // Clear model visibility data to prevent data leakage between users
        useModelVisibilityStore.setState({
          favoriteModels: [],
          enabledProviders: ['google', 'openrouter', 'openai', 'groq'],
          selectedModel: 'Gemini 2.5 Flash',
          loading: false,
        });
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
    redirecting: false,
    blurPersonalData: useSettingsStore.getState().settings.hidePersonal,
    ...actions,
    init,
  };
});
