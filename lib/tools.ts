import { tool } from 'ai';
import { z } from 'zod';

export const webSearchTool = tool({
  description: 'Search the web for up-to-date information.',
  parameters: z.object({ query: z.string() }),
  execute: async ({ query }) => {
    return { message: `Simulating search for: ${query}` };
  },
});
