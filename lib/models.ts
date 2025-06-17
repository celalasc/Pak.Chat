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
  company: string;
};

export const MODEL_CONFIGS: Record<AIModel, ModelConfig> = {
  'Deepseek R1 0528': {
    modelId: 'deepseek/deepseek-r1-0528:free',
    provider: 'openrouter',
    company: 'DeepSeek',
  },
  'Deepseek V3': {
    modelId: 'deepseek/deepseek-chat-v3-0324:free',
    provider: 'openrouter',
    company: 'DeepSeek',
  },
  'Gemini 2.5 Pro': {
    modelId: 'gemini-2.5-pro-preview-05-06',
    provider: 'google',
    company: 'Google',
  },
  'Gemini 2.5 Flash': {
    modelId: 'gemini-2.5-flash-preview-05-20',
    provider: 'google',
    company: 'Google',
  },
  'GPT-4o': {
    modelId: 'gpt-4o',
    provider: 'openai',
    company: 'OpenAI',
  },
  'GPT-4.1-mini': {
    modelId: 'gpt-4.1-mini',
    provider: 'openai',
    company: 'OpenAI',
  },
} as const satisfies Record<AIModel, ModelConfig>;

export const getModelConfig = (modelName: AIModel): ModelConfig => {
  return MODEL_CONFIGS[modelName];
};

// Группируем модели по компаниям
export const getModelsByCompany = () => {
  const companies: Record<string, AIModel[]> = {};
  
  AI_MODELS.forEach(model => {
    const config = MODEL_CONFIGS[model];
    if (!companies[config.company]) {
      companies[config.company] = [];
    }
    companies[config.company].push(model);
  });
  
  return companies;
};
