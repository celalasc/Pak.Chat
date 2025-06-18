import { Provider } from '@/frontend/stores/APIKeyStore';

export const AI_MODELS = [
  'Deepseek R1 0528',
  'Deepseek V3',
  'Gemini 2.5 Pro',
  'Gemini 2.5 Flash',
  'GPT-4o',
  'GPT-4.1-mini',
  'GPT-4.1',
  'GPT-4.1-nano',
  'o4-mini',
  'Meta Llama 4 Scout 17B',
  'Meta Llama 4 Maverick 17B',
  'DeepSeek R1 Distill Llama 70B',
  'Qwen QwQ 32B',
  'Qwen 3 32B',
] as const;

export type AIModel = (typeof AI_MODELS)[number];

export type ModelConfig = {
  modelId: string;
  provider: Provider;
  company: string;
  reasoningEffort?: "medium" | "low" | "high";
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
    modelId: 'gemini-2.0-flash-exp',
    provider: 'google',
    company: 'Google',
  },
  'Gemini 2.5 Flash': {
    modelId: 'gemini-2.0-flash-exp',
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
  'GPT-4.1': {
    modelId: 'gpt-4.1',
    provider: 'openai',
    company: 'OpenAI',
  },
  'GPT-4.1-nano': {
    modelId: 'gpt-4.1-nano',
    provider: 'openai',
    company: 'OpenAI',
  },
  'o4-mini': {
    modelId: 'o4-mini',
    provider: 'openai',
    company: 'OpenAI',
    reasoningEffort: 'medium',
  },
  'Meta Llama 4 Scout 17B': {
    modelId: 'meta-llama/llama-4-scout-17b-16e-instruct',
    provider: 'groq',
    company: 'Groq',
  },
  'Meta Llama 4 Maverick 17B': {
    modelId: 'meta-llama/llama-4-maverick-17b-128e-instruct',
    provider: 'groq',
    company: 'Groq',
  },
  'DeepSeek R1 Distill Llama 70B': {
    modelId: 'deepseek-r1-distill-llama-70b',
    provider: 'groq',
    company: 'Groq',
  },
  'Qwen QwQ 32B': {
    modelId: 'qwen-qwq-32b',
    provider: 'groq',
    company: 'Groq',
  },
  'Qwen 3 32B': {
    modelId: 'qwen/qwen3-32b',
    provider: 'groq',
    company: 'Groq',
    // Use provider default reasoning effort
  },
} as const satisfies Record<AIModel, ModelConfig>;

// Fallback model used when an unknown model is requested
export const DEFAULT_MODEL: AIModel = 'Gemini 2.5 Flash';

export const getModelConfig = (modelName: string): ModelConfig => {
  const config = MODEL_CONFIGS[modelName as AIModel] ?? MODEL_CONFIGS[DEFAULT_MODEL];
  return {
    ...config,
    reasoningEffort: config.reasoningEffort ?? 'medium',
  };
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

// Группируем модели по провайдерам
export const getModelsByProvider = () => {
  const providers: Record<Provider, AIModel[]> = {
    google: [],
    openai: [],
    openrouter: [],
    groq: []
  };
  
  AI_MODELS.forEach(model => {
    const config = MODEL_CONFIGS[model];
    providers[config.provider].push(model);
  });
  
  return providers;
};
