import { Provider } from '@/frontend/stores/APIKeyStore';

export const AI_MODELS = [
  'Deepseek R1 0528',
  'Deepseek V3',
  'Gemini 2.5 Pro',
  'Gemini 2.5 Flash',
  'GPT-4o',
  'GPT-4.1-mini',
] as const;

export type AIModel = (typeof AI_MODELS)[number];

export type ModelConfig = {
  modelId: string;
  provider: Provider;
};

export const MODEL_CONFIGS: Record<AIModel, ModelConfig> = {
  'Deepseek R1 0528': {
    modelId: 'deepseek/deepseek-r1-0528:free',
    provider: 'openrouter',
  },
  'Deepseek V3': {
    modelId: 'deepseek/deepseek-chat-v3-0324:free',
    provider: 'openrouter',
  },
  'Gemini 2.5 Pro': {
    modelId: 'gemini-2.5-pro-preview-05-06',
    provider: 'google',
  },
  'Gemini 2.5 Flash': {
    modelId: 'gemini-2.5-flash-preview-05-20',
    provider: 'google',
  },
  'GPT-4o': {
    modelId: 'gpt-4o',
    provider: 'openai',
  },
  'GPT-4.1-mini': {
    modelId: 'gpt-4.1-mini',
    provider: 'openai',
  },
} as const satisfies Record<AIModel, ModelConfig>;

export const getModelConfig = (modelName: AIModel): ModelConfig => {
  return MODEL_CONFIGS[modelName];
};
