import { create } from 'zustand';
import { v4 as uuid } from 'uuid';

interface Attachment {
  id: string;
  file: File;
  preview: string;
  name: string;
  ext: string;
  type: string;
  size: number;
}

interface AttachmentState {
  attachments: Attachment[];
  add: (file: File) => void;
  remove: (id: string) => void;
  clear: () => void;
}

export const useAttachmentsStore = create<AttachmentState>((set) => ({
  attachments: [],
  add: (file) =>
    set((state) => ({
      attachments: [
        ...state.attachments,
        {
          id: uuid(),
          file,
          preview: URL.createObjectURL(file),
          name: file.name.length > 24 ? file.name.slice(0, 21) + '...' : file.name,
          ext: file.name.split('.').pop() ?? '',
          type: file.type,
          size: file.size,
        },
      ],
    })),
  remove: (id) => set((state) => {
    const attachment = state.attachments.find(a => a.id === id);
    if (attachment) {
      URL.revokeObjectURL(attachment.preview);
    }
    return { attachments: state.attachments.filter((a) => a.id !== id) };
  }),
  clear: () => set((state) => {
    // Очищаем все preview URL
    state.attachments.forEach(a => URL.revokeObjectURL(a.preview));
    return { attachments: [] };
  }),
}));
