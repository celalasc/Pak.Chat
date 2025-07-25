"use client";

import { useMemo } from 'react';
import { useAuthStore } from '@/frontend/stores/AuthStore';
import { useModelStore } from '@/frontend/stores/ModelStore';
import { useSettingsStore } from '@/frontend/stores/SettingsStore';
import { useChatStore } from '@/frontend/stores/ChatStore';
import { useAPIKeyStore } from '@/frontend/stores/APIKeyStore';
import { useQuoteStore } from '@/frontend/stores/QuoteStore';
import { useAttachmentsStore } from '@/frontend/stores/AttachmentsStore';
import { useCustomModesStore } from '@/frontend/stores/CustomModesStore';

/**
 * Оптимизированные селекторы для Zustand store
 * Возвращают только примитивы вместо целых объектов для минимизации ре-рендеров
 */

// Auth Store селекторы
export const useUserId = () => useAuthStore(state => state.user?.uid);
export const useUserDisplayName = () => useAuthStore(state => state.user?.displayName);
export const useUserEmail = () => useAuthStore(state => state.user?.email);
export const useUserPhotoURL = () => useAuthStore(state => state.user?.photoURL);
export const useIsAuthenticated = () => useAuthStore(state => !!state.user);
export const useCurrentUser = () => useAuthStore(state => state.user);
export const useAuthLoading = () => useAuthStore(state => state.loading);
export const useAuthRedirecting = () => useAuthStore(state => state.redirecting);
export const useBlurPersonalData = () => useAuthStore(state => state.blurPersonalData);

// Model Store селекторы
export const useSelectedModel = () => useModelStore(state => state.selectedModel);
export const useWebSearchEnabled = () => useModelStore(state => state.webSearchEnabled);
export const useReasoningEffort = () => useModelStore(state => state.modelSpecificSettings[state.selectedModel]?.reasoningEffort);
export const useModelSpecificSettings = () => useModelStore(state => state.modelSpecificSettings);
export const useImageGenerationMode = () => useChatStore(state => state.isImageGenerationMode);

// Settings Store селекторы
export const useSettings = () => useSettingsStore(state => state.settings);
export const useGeneralFont = () => useSettingsStore(state => state.settings.generalFont);
export const useCodeFont = () => useSettingsStore(state => state.settings.codeFont);
export const useTheme = () => useSettingsStore(state => state.settings.theme);
export const useHidePersonal = () => useSettingsStore(state => state.settings.hidePersonal);
export const useShowNavBars = () => useSettingsStore(state => state.settings.showNavBars);
export const useShowChatPreview = () => useSettingsStore(state => state.settings.showChatPreview);
export const useCustomInstructionsName = () => useSettingsStore(state => state.settings.customInstructions?.name);
export const useCustomInstructionsOccupation = () => useSettingsStore(state => state.settings.customInstructions?.occupation);

// Chat Store селекторы
export const useImageGenerationParams = () => useChatStore(state => state.imageGenerationParams);

// API Key Store селекторы
export const useAPIKeys = () => useAPIKeyStore().keys;
export const useGoogleApiKey = () => useAPIKeyStore().keys.google;
export const useOpenRouterApiKey = () => useAPIKeyStore().keys.openrouter;
export const useOpenAIApiKey = () => useAPIKeyStore().keys.openai;
export const useGroqApiKey = () => useAPIKeyStore().keys.groq;
export const useHasRequiredKeys = () => useAPIKeyStore().hasRequiredKeys();
export const useKeysLoading = () => useAPIKeyStore().keysLoading;

// Quote Store селекторы
export const useCurrentQuote = () => useQuoteStore(state => state.currentQuote);
export const useQuoteText = () => useQuoteStore(state => state.currentQuote?.text);
export const useQuoteMessageId = () => useQuoteStore(state => state.currentQuote?.messageId);

// Attachments Store селекторы
export const useAttachmentsCount = () => useAttachmentsStore(state => state.attachments.length);
export const useHasAttachments = () => useAttachmentsStore(state => state.attachments.length > 0);
export const useAttachmentIds = () => useAttachmentsStore(state => state.attachments.map(a => a.id));

// Custom Modes Store селекторы
export const useIsCustomModesEnabled = () => useCustomModesStore(state => state.isCustomModesEnabled);
export const useSelectedModeId = () => useCustomModesStore(state => state.selectedMode);

/**
 * Составные селекторы для часто используемых комбинаций
 * Используют useMemo для предотвращения создания новых объектов при каждом рендере
 */

export const useUserInfo = () => {
  const displayName = useUserDisplayName();
  const email = useUserEmail();
  const photoURL = useUserPhotoURL();
  const isAuthenticated = useIsAuthenticated();
  
  return useMemo(() => ({ 
    displayName, 
    email, 
    photoURL, 
    isAuthenticated 
  }), [displayName, email, photoURL, isAuthenticated]);
};

export const useModelConfig = () => {
  const selectedModel = useSelectedModel();
  const webSearchEnabled = useWebSearchEnabled();
  const reasoningEffort = useReasoningEffort();
  
  return useMemo(() => ({ 
    selectedModel, 
    webSearchEnabled, 
    reasoningEffort 
  }), [selectedModel, webSearchEnabled, reasoningEffort]);
};

export const useUISettings = () => {
  const generalFont = useGeneralFont();
  const codeFont = useCodeFont();
  const theme = useTheme();
  const showNavBars = useShowNavBars();
  
  return useMemo(() => ({ 
    generalFont, 
    codeFont, 
    theme, 
    showNavBars 
  }), [generalFont, codeFont, theme, showNavBars]);
};

/**
 * Отдельные селекторы для действий (избегаем создания новых объектов)
 */
// Auth Store действия
export const useLogin = () => useAuthStore(state => state.login);
export const useLoginWithPopup = () => useAuthStore(state => state.loginWithPopup);
export const useLogout = () => useAuthStore(state => state.logout);
export const useToggleBlur = () => useAuthStore(state => state.toggleBlur);

// Model Store действия
export const useSetModel = () => useModelStore(state => state.setModel);
export const useSetWebSearchEnabled = () => useModelStore(state => state.setWebSearchEnabled);
export const useSetReasoningEffort = () => useModelStore(state => state.setReasoningEffort);

// Quote Store действия
export const useSetQuote = () => useQuoteStore(state => state.setQuote);
export const useClearQuote = () => useQuoteStore(state => state.clearQuote);

// Attachments Store действия
export const useAddAttachment = () => useAttachmentsStore(state => state.add);
export const useRemoveAttachment = () => useAttachmentsStore(state => state.remove);
export const useClearAttachments = () => useAttachmentsStore(state => state.clear);

// Отдельные селекторы для действий Chat Store (избегаем создания новых объектов)
export const useSetImageGenerationMode = () => useChatStore(state => state.setImageGenerationMode);
export const useSetImageGenerationParams = () => useChatStore(state => state.setImageGenerationParams);
export const useInitializeImageGenerationParams = () => useChatStore(state => state.initializeImageGenerationParams);