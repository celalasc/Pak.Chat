import { create } from 'zustand';

interface ImageGenerationParams {
  quality: 'auto' | 'low' | 'medium' | 'high';
  size: 'auto' | '1024x1024' | '1024x1536' | '1536x1024';
  count: 1 | 2 | 3 | 4;
  format: 'png' | 'jpeg' | 'webp';
  compression: number; // 0-100 for jpeg/webp
}

interface ChatStoreState {
  setInputFn: ((value: string) => void) | null;
  registerInputSetter: (fn: (value: string) => void) => void;
  setInput: (value: string) => void;
  
  // Image generation mode
  isImageGenerationMode: boolean;
  imageGenerationParams: ImageGenerationParams;
  setImageGenerationMode: (enabled: boolean) => void;
  setImageGenerationParams: (params: Partial<ImageGenerationParams>) => void;
  initializeImageGenerationParams: (params: ImageGenerationParams) => void;
}

const defaultImageGenerationParams: ImageGenerationParams = {
  quality: 'auto',
  size: 'auto',
  count: 1,
  format: 'jpeg', // Use JPEG for smaller file sizes
  compression: 80, // Good balance between quality and size
};

export const useChatStore = create<ChatStoreState>((set, get) => ({
  setInputFn: null,
  registerInputSetter: (fn) => set({ setInputFn: fn }),
  setInput: (value) => {
    const fn = get().setInputFn;
    if (fn) fn(value);
  },

  // Image generation mode
  isImageGenerationMode: false,
  imageGenerationParams: defaultImageGenerationParams,
  setImageGenerationMode: (enabled) => set({ isImageGenerationMode: enabled }),
  setImageGenerationParams: (params) => set((state) => ({
    imageGenerationParams: { ...state.imageGenerationParams, ...params }
  })),
  initializeImageGenerationParams: (params) => set({ imageGenerationParams: params }),
}));
