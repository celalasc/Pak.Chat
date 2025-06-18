import { tool } from 'ai';
import { z } from 'zod';

// Удаляем старый webSearchTool, так как теперь будем использовать встроенный Google Search
// Этот файл теперь можно использовать для других инструментов в будущем

export const customTool = tool({
  description: 'A placeholder for future custom tools',
  parameters: z.object({ query: z.string() }),
  execute: async ({ query }) => {
    return { message: 'Custom tool placeholder' };
  },
});
