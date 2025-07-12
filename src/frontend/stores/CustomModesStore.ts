import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CustomMode {
  id: string;
  name: string;
  systemPrompt: string;
  icon: string;
  createdAt: Date;
  updatedAt: Date;
}

// Built-in default mode
export interface DefaultMode {
  id: 'default';
  name: 'Default';
  systemPrompt: '';
  icon: '🤖';
}

export const DEFAULT_MODE: DefaultMode = {
  id: 'default',
  name: 'Default', 
  systemPrompt: '',
  icon: '🤖',
};

interface CustomModesState {
  modes: CustomMode[];
  isCustomModesEnabled: boolean;
  selectedMode: string; // ID of selected mode, 'default' for built-in mode
  
  // Actions
  addMode: (mode: Omit<CustomMode, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateMode: (id: string, updates: Partial<Pick<CustomMode, 'name' | 'systemPrompt' | 'icon'>>) => void;
  deleteMode: (id: string) => void;
  toggleCustomModes: (enabled: boolean) => void;
  setSelectedMode: (modeId: string) => void;
  
  // Getters
  getModeById: (id: string) => CustomMode | undefined;
  getEnabledModes: () => CustomMode[];
  getSelectedMode: () => CustomMode | DefaultMode;
  getAllAvailableModes: () => (CustomMode | DefaultMode)[];
}

const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};
export const useCustomModesStore = create<CustomModesState>()(
  persist(
    (set, get) => ({
      modes: [],
      isCustomModesEnabled: false,
      selectedMode: 'default', // Default mode selected by default
      
      addMode: (modeData) => {
        const newMode: CustomMode = {
          ...modeData,
          id: generateId(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        set((state) => ({
          modes: [...state.modes, newMode],
        }));
      },
      
      updateMode: (id, updates) => {
        set((state) => ({
          modes: state.modes.map((mode) =>
            mode.id === id
              ? { ...mode, ...updates, updatedAt: new Date() }
              : mode
          ),
        }));
      },
      
      deleteMode: (id) => {
        set((state) => {
          // If deleting the currently selected mode, reset to default
          const newState = {
            modes: state.modes.filter((mode) => mode.id !== id),
            selectedMode: state.selectedMode === id ? 'default' : state.selectedMode,
          };
          return newState;
        });
      },
      
      toggleCustomModes: (enabled) => {
        set({ isCustomModesEnabled: enabled });
      },
      
      setSelectedMode: (modeId) => {
        set({ selectedMode: modeId });
      },
      
      getModeById: (id) => {
        return get().modes.find((mode) => mode.id === id);
      },
      
      getEnabledModes: () => {
        const { modes, isCustomModesEnabled } = get();
        return isCustomModesEnabled ? modes : [];
      },
      
      getSelectedMode: () => {
        const { selectedMode, modes } = get();
        if (selectedMode === 'default') {
          return DEFAULT_MODE;
        }
        const customMode = modes.find((mode) => mode.id === selectedMode);
        return customMode || DEFAULT_MODE; // Fallback to default if mode not found
      },
      
      getAllAvailableModes: () => {
        const { modes, isCustomModesEnabled } = get();
        if (!isCustomModesEnabled) {
          return [DEFAULT_MODE];
        }
        return [DEFAULT_MODE, ...modes];
      },
    }),
    {
      name: 'custom-modes-storage',
      partialize: (state) => ({
        modes: state.modes,
        isCustomModesEnabled: state.isCustomModesEnabled,
        selectedMode: state.selectedMode,
      }),
    }
  )
);
