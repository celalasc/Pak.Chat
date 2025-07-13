import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from "@/convex/_generated/api";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
import { useEffect, useRef } from 'react';

export interface CustomMode {
  _id: Id<"customModes">;
  name: string;
  systemPrompt: string;
  icon: string;
  createdAt: number;
  updatedAt: number;
  userId: Id<"users">;
}

// Built-in default mode
export interface DefaultMode {
  id: 'default';
  name: 'Default';
  systemPrompt: '';
  icon: 'Bot';
}

export const DEFAULT_MODE: DefaultMode = {
  id: 'default',
  name: 'Default', 
  systemPrompt: '',
  icon: 'Bot',
};

interface CustomModesState {
  isCustomModesEnabled: boolean;
  selectedMode: string; // ID of selected mode, 'default' for built-in mode
  
  // Actions
  toggleCustomModes: (enabled: boolean) => void;
  setSelectedMode: (modeId: string) => void;
  
  // Sync methods (don't trigger saves)
  syncCustomModesEnabled: (enabled: boolean) => void;
  syncSelectedMode: (modeId: string) => void;
}

export const useCustomModesStore = create<CustomModesState>()(
  persist(
    (set, get) => ({
      isCustomModesEnabled: false,
      selectedMode: 'default', // Default mode selected by default
      
      toggleCustomModes: (enabled) => {
        set({ isCustomModesEnabled: enabled });
      },
      
      setSelectedMode: (modeId) => {
        set({ selectedMode: modeId });
      },
      
      syncCustomModesEnabled: (enabled) => {
        set({ isCustomModesEnabled: enabled });
      },
      
      syncSelectedMode: (modeId) => {
        set({ selectedMode: modeId });
      },
    }),
    {
      name: 'custom-modes-storage',
      partialize: (state) => ({
        isCustomModesEnabled: state.isCustomModesEnabled,
        selectedMode: state.selectedMode,
      }),
    }
  )
);

// Convex hooks for custom modes data
export const useCustomModes = () => {
  const { isAuthenticated, isLoading } = useConvexAuth();
  
  // Don't query until user is authenticated
  return useQuery(
    api.customModes.listCustomModes, 
    isAuthenticated && !isLoading ? {} : "skip"
  );
};

export const useCreateCustomMode = () => {
  return useMutation(api.customModes.createCustomMode);
};

export const useUpdateCustomMode = () => {
  return useMutation(api.customModes.updateCustomMode);
};

export const useDeleteCustomMode = () => {
  return useMutation(api.customModes.deleteCustomMode);
};

// Helper functions
export const useCustomModesHelpers = () => {
  const modes = useCustomModes() || [];
  const { isCustomModesEnabled, selectedMode } = useCustomModesStore();

  const getModeById = (id: string): CustomMode | undefined => {
    return modes.find((mode) => mode._id === id);
  };

  const getEnabledModes = (): CustomMode[] => {
    return isCustomModesEnabled ? modes : [];
  };

  // Returns the currently selected mode. Custom modes include an `id`
  // property for easy use across the UI components.
  const getSelectedMode = (): (CustomMode & { id: string }) | DefaultMode => {
    if (selectedMode === 'default') {
      return DEFAULT_MODE;
    }

    const customMode = modes.find((mode) => mode._id === selectedMode);
    return customMode ? { ...customMode, id: customMode._id } : DEFAULT_MODE;
  };

  const getAllAvailableModes = (): (DefaultMode | (CustomMode & { id: string }))[] => {
    if (!isCustomModesEnabled) {
      return [DEFAULT_MODE];
    }
    // Add id property for compatibility with existing components
    const modesWithId = modes.map(mode => ({ ...mode, id: mode._id }));
    return [DEFAULT_MODE, ...modesWithId];
  };

  return {
    modes,
    getModeById,
    getEnabledModes,
    getSelectedMode,
    getAllAvailableModes,
  };
};

// Sync custom modes settings with Convex
export function useCustomModesSync() {
  const { isAuthenticated } = useConvexAuth();
  const convexUser = useQuery(
    api.users.getCurrent,
    isAuthenticated ? {} : 'skip'
  );
  const settingsDoc = useQuery(
    api.userSettings.get,
    convexUser ? {} : 'skip'
  );
  const save = useMutation(api.userSettings.saveSettings);

  const { isCustomModesEnabled, selectedMode } = useCustomModesStore();
  const lastSaved = useRef<{ isCustomModesEnabled: boolean; selectedMode: string } | null>(null);
  const isInitialized = useRef(false);

  // Load from server once
  useEffect(() => {
    if (settingsDoc && !isInitialized.current) {
      const serverEnabled = settingsDoc.isCustomModesEnabled ?? false;
      const serverSelectedMode = settingsDoc.selectedMode ?? 'default';
      
      useCustomModesStore.getState().syncCustomModesEnabled(serverEnabled);
      useCustomModesStore.getState().syncSelectedMode(serverSelectedMode);
      
      lastSaved.current = {
        isCustomModesEnabled: serverEnabled,
        selectedMode: serverSelectedMode,
      };
      isInitialized.current = true;
    }
  }, [settingsDoc]);

  // Save to server when settings change
  useEffect(() => {
    if (!convexUser || !isInitialized.current || !lastSaved.current) return;
    
    const hasChanges = isCustomModesEnabled !== lastSaved.current.isCustomModesEnabled ||
                      selectedMode !== lastSaved.current.selectedMode;
    
    if (hasChanges) {
      lastSaved.current = { isCustomModesEnabled, selectedMode };
      
      // We need all settings to call the save function
      if (settingsDoc) {
        const settingsToSave = {
          uiFont: settingsDoc.uiFont || 'Proxima Vara',
          codeFont: settingsDoc.codeFont || 'Berkeley Mono',
          hidePersonal: settingsDoc.hidePersonal || false,
          showNavBars: settingsDoc.showNavBars ?? true,
          showChatPreview: settingsDoc.showChatPreview ?? true,
          isCustomModesEnabled: isCustomModesEnabled,
          selectedMode: selectedMode,
          webSearchEnabled: settingsDoc.webSearchEnabled ?? false,
          selectedModel: settingsDoc.selectedModel,
        };
        
        save(settingsToSave as any)
          .catch((error) => {
            console.error('❌ Failed to save custom modes:', error);
            // Revert lastSaved to trigger retry
            lastSaved.current = { 
              isCustomModesEnabled: !isCustomModesEnabled, 
              selectedMode: selectedMode 
            };
          });
      }
    }
  }, [isCustomModesEnabled, selectedMode, save, convexUser, settingsDoc]);

  return {};
}
