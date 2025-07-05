import { create } from 'zustand';
import { v4 as uuid } from 'uuid';

export interface LocalAttachment {
  id: string;
  file: File;
  preview: string;
  name: string;
  ext: string;
  type: string;
  size: number;
  remote?: false;
  isUploading?: boolean;
}

export interface RemoteAttachment {
  id: string;
  preview: string; // preview URL (may be null for non-images)
  name: string;
  ext: string;
  type: string;
  size: number;
  storageId: string;
  previewId?: string;
  remote: true;
}

export type Attachment = LocalAttachment | RemoteAttachment;

interface AttachmentState {
  attachments: Attachment[];
  add: (file: File) => void;
  addRemote: (info: Omit<RemoteAttachment, 'id' | 'ext' | 'preview'> & { preview?: string | null }) => void;
  remove: (id: string) => void;
  clear: () => void;
  setUploading: (id: string, uploading: boolean) => void;
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
          remote: false,
        },
      ],
    })),
  addRemote: (info) =>
    set((state) => {
      // Use provided preview or fall back to API path when available
      const previewUrl =
        info.preview ||
        (info.previewId
          ? `/api/files/${info.previewId}`
          : info.storageId
            ? `/api/files/${info.storageId}`
            : '');

      return {
        attachments: [
          ...state.attachments,
          {
            id: uuid(),
            preview: previewUrl,
            name: info.name.length > 24 ? info.name.slice(0, 21) + '...' : info.name,
            ext: info.name.split('.').pop() ?? '',
            type: info.type,
            size: info.size,
            storageId: info.storageId,
            previewId: info.previewId,
            remote: true,
          } as RemoteAttachment,
        ],
      };
    }),
  remove: (id) => set((state) => {
    const attachment = state.attachments.find(a => a.id === id);
    if (attachment) {
      URL.revokeObjectURL(attachment.preview);
    }
    return { attachments: state.attachments.filter((a) => a.id !== id) };
  }),
  clear: () => set((state) => {
    // Очищаем все preview URL
    state.attachments.forEach(a => {
      if (!a.remote) {
        URL.revokeObjectURL(a.preview);
      }
    });
    return { attachments: [] };
  }),
  setUploading: (id, uploading) => set((state) => ({
    attachments: state.attachments.map(a => 
      a.id === id && !a.remote ? { ...a, isUploading: uploading } : a
    )
  })),
}));
