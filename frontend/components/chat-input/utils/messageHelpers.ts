import { UIMessage } from 'ai';

export const createUserMessage = (id: string, text: string, attachments?: any[]): UIMessage & { attachments?: any[] } => {
  return {
    id,
    parts: [{ type: 'text', text }],
    role: 'user',
    content: text,
    createdAt: new Date(),
    attachments,
  };
}; 