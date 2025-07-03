// Dexie imports removed; operations will be handled via Convex
import { UseChatHelpers, useCompletion } from '@ai-sdk/react';
import { useState, useEffect, useRef } from 'react';
import { UIMessage } from 'ai';
import { Dispatch, SetStateAction } from 'react';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { useAPIKeyStore } from '@/frontend/stores/APIKeyStore';
import { useModelStore } from '@/frontend/stores/ModelStore';
import { toast } from 'sonner';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { isConvexId } from '@/lib/ids';
import { useSettingsStore } from '@/frontend/stores/SettingsStore';
import { useQuoteStore } from '@/frontend/stores/QuoteStore';
import QuoteDisplay from './QuoteDisplay';
import { cn } from '@/lib/utils';
import { PlusIcon, X } from 'lucide-react';
import { createImagePreview } from '@/frontend/lib/image';
import { convertToSupportedImage } from '../lib/fileHelpers';
import FilePreview from './FilePreview';
import type { Attachment, LocalAttachment, RemoteAttachment } from '@/frontend/stores/AttachmentsStore';

// Локальный компонент для файлового ввода при редактировании
function EditAttachmentsBar({ 
  attachments, 
  onAdd, 
  onRemove 
}: { 
  attachments: Attachment[];
  onAdd: (file: File) => void;
  onRemove: (id: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-3">
      {/* Показываем все файлы */}
      {attachments.length > 0 && (
        <div className="flex items-center gap-2 w-full overflow-x-auto">
          {attachments.map((file) => (
            <FilePreview
              key={file.id}
              file={file}
              onRemove={onRemove}
              showPreview={true}
            />
          ))}
        </div>
      )}
      
      {/* Кнопка добавления файлов */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-2"
      >
        <PlusIcon className="h-4 w-4" />
        Add Files
      </Button>
      
      <input
        ref={inputRef}
        type="file"
        hidden
        multiple
        accept="image/*,application/pdf,text/*"
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? []);
          for (const file of files) {
            const processed = await convertToSupportedImage(file);
            onAdd(processed);
          }
          e.target.value = '';
        }}
      />
    </div>
  );
}

export default function MessageEditor({
  threadId,
  message,
  content,
  setMessages,
  reload,
  setMode,
  stop,
}: {
  threadId: string;
  message: UIMessage;
  content: string;
  setMessages: UseChatHelpers['setMessages'];
  setMode: Dispatch<SetStateAction<'view' | 'edit'>>;
  reload: UseChatHelpers['reload'];
  stop: UseChatHelpers['stop'];
}) {
  const [draftContent, setDraftContent] = useState(content);
  const { keys } = useAPIKeyStore();
  const { selectedModel } = useModelStore();
  const { settings } = useSettingsStore();
  const { currentQuote, clearQuote } = useQuoteStore();

  // Локальный стейт для файлов при редактировании (изолированный от основного поля ввода)
  const [editAttachments, setEditAttachments] = useState<Attachment[]>([]);

  // Загружаем существующие вложения сообщения при инициализации
  const messageAttachments = useQuery(
    api.attachments.getByMessageId,
    isConvexId(message.id) ? { messageId: message.id as Id<'messages'> } : 'skip'
  );

  useEffect(() => {
    // При входе в режим редактирования очищаем и загружаем файлы сообщения
    clearQuote();
    
    // Загружаем существующие вложения сообщения в локальный стейт
    if (messageAttachments) {
      const remoteAttachments: RemoteAttachment[] = messageAttachments.map((attachment: any) => ({
        id: `remote-${attachment.id}`,
        name: attachment.name,
        type: attachment.type,
        size: attachment.size || 0,
        storageId: attachment.fileId,
        previewId: attachment.previewId,
        preview: attachment.url || '',
        ext: attachment.name.split('.').pop() ?? '',
        remote: true as const,
      }));
      setEditAttachments(remoteAttachments);
    }
  }, [messageAttachments, clearQuote]);

  // Helper для создания ID
  const generateId = () => `edit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Добавление файла в локальный стейт
  const handleAddFile = async (file: File) => {
    const localAttachment: LocalAttachment = {
      id: generateId(),
      file,
      preview: URL.createObjectURL(file),
      name: file.name.length > 24 ? file.name.slice(0, 21) + '...' : file.name,
      ext: file.name.split('.').pop() ?? '',
      type: file.type,
      size: file.size,
      remote: false,
    };
    
    setEditAttachments(prev => [...prev, localAttachment]);
  };

  // Удаление файла из локального стейта
  const handleRemoveFile = (id: string) => {
    setEditAttachments(prev => {
      const attachment = prev.find(a => a.id === id);
      if (attachment && !attachment.remote) {
        URL.revokeObjectURL(attachment.preview);
      }
      return prev.filter(a => a.id !== id);
    });
  };

  const { complete } = useCompletion({
    api: '/api/completion',
    ...(keys.google && {
      headers: { 'X-Google-API-Key': keys.google },
    }),
    onResponse: async (response) => {
      try {
        // Clone the response to avoid consuming the body used by the hook
        const payload = await response.clone().json();

        if (response.ok) {
          const { title } = payload;
          // TODO: save summary via Convex
        } else {
          toast.error(
            payload.error || 'Failed to generate a summary for the message'
          );
        }
      } catch {
        /* ignore errors */
      }
    },
  });

  const removeAfter = useMutation(api.messages.removeAfter);
  const editMessage = useMutation(api.messages.edit);
  const generateUploadUrl = useMutation(api.attachments.generateUploadUrl);
  const saveAttachments = useMutation(api.attachments.save as any);
  const updateAttachmentMessageId = useMutation(api.attachments.updateMessageId);
  const removeAttachments = useMutation(api.attachments.removeByMessageId);

  const handleCancel = () => {
    // Очищаем локальные файлы
    editAttachments.forEach(att => {
      if (!att.remote) {
        URL.revokeObjectURL(att.preview);
      }
    });
    setEditAttachments([]);
    clearQuote();
    setMode('view');
  };

  const handleSave = async () => {
    if (!isConvexId(threadId)) return;
    
    // Only handle messages with valid Convex IDs to avoid validation errors
    if (!isConvexId(message.id)) {
      console.warn('Cannot edit message with non-Convex ID:', message.id);
      toast.error('Cannot edit this message');
      return;
    }

    try {
      // Формируем финальное сообщение с цитатой если есть
      let finalMessage = draftContent.trim();
      if (currentQuote) {
        finalMessage = `> ${currentQuote.text.replace(/\n/g, '\n> ')}\n\n${draftContent.trim()}`;
      }

      // Update the original message content
      await editMessage({
        messageId: message.id as Id<'messages'>,
        content: finalMessage,
      });

      // Remove all messages after the edited one
      await removeAfter({
        threadId: threadId as Id<'threads'>,
        afterMessageId: message.id as Id<'messages'>,
      });

      // Удаляем старые вложения
      await removeAttachments({
        messageId: message.id as Id<'messages'>,
      });

      // Обрабатываем новые вложения
      const localAttachments = editAttachments.filter(att => !att.remote) as LocalAttachment[];
      const remoteAttachments = editAttachments.filter(att => att.remote) as RemoteAttachment[];

      // Загружаем новые файлы с превью
      const uploadedFiles = await Promise.all(
        localAttachments.map(async (attachment) => {
          try {
            // 1. Upload the original file
            const uploadUrl = await generateUploadUrl();
            const resOrig = await fetch(uploadUrl, {
              method: 'POST',
              headers: { 'Content-Type': attachment.file.type },
              body: attachment.file,
            });
            if (!resOrig.ok) throw new Error(`Failed to upload ${attachment.name}`);
            const { storageId } = await resOrig.json();

            // 2. Create and upload preview for images
            let previewId: string | undefined = undefined;
            if (attachment.file.type.startsWith('image/')) {
              const previewFile = await createImagePreview(attachment.file);
              if (previewFile) {
                const previewUploadUrl = await generateUploadUrl();
                const resPrev = await fetch(previewUploadUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': previewFile.type },
                  body: previewFile,
                });
                if (resPrev.ok) {
                  const { storageId: pId } = await resPrev.json();
                  previewId = pId;
                }
              }
            }

            return {
              storageId,
              previewId,
              name: attachment.name,
              type: attachment.type,
              messageId: message.id as Id<'messages'>,
              size: attachment.size,
            };
          } catch (error) {
            console.error('Failed to upload file:', attachment.name, error);
            throw error;
          }
        })
      );

      // Добавляем существующие удаленные файлы
      const reusedFiles = remoteAttachments.map(att => ({
        storageId: att.storageId,
        previewId: att.previewId,
        name: att.name,
        type: att.type,
        messageId: message.id as Id<'messages'>,
        size: att.size,
      }));

      uploadedFiles.push(...reusedFiles);

      // Сохраняем метаданные вложений в БД
      let savedAttachments: any[] = [];
      if (uploadedFiles.length > 0) {
        savedAttachments = await saveAttachments({
          threadId: threadId as Id<'threads'>,
          attachments: uploadedFiles,
        });
      }

      const updatedMessage = {
        ...message,
        content: finalMessage,
        parts: [
          {
            type: 'text' as const,
            text: finalMessage,
          },
        ],
      };

      setMessages((messages) => {
        const index = messages.findIndex((m) => m.id === message.id);
        if (index !== -1) {
          return [...messages.slice(0, index), updatedMessage];
        }
        return messages;
      });

      complete(finalMessage, {
        body: {
          messageId: message.id as Id<'messages'>,
          threadId,
        },
      });
      
      // Очищаем локальные файлы и состояние
      editAttachments.forEach(att => {
        if (!att.remote) {
          URL.revokeObjectURL(att.preview);
        }
      });
      setEditAttachments([]);
      clearQuote();
      setMode('view');

      // stop the current stream if any
      stop();

      reload({
        body: {
          apiKeys: keys,
          model: selectedModel,
          threadId,
        },
      });
    } catch (error) {
      console.error('Error during message edit:', error);
      toast.error('Failed to save changes');
    }
  };

  return (
    <div className="w-full">
      <div className="flex flex-col rounded-[16px] overflow-hidden border border-border bg-background">
        {/* Quote display */}
        {currentQuote && (
          <div className="bg-secondary px-4 pt-3">
            <QuoteDisplay quote={currentQuote} onRemove={clearQuote} />
          </div>
        )}
        
        {/* Text input */}
        <div className="p-4">
          <Textarea
            value={draftContent}
            onChange={(e) => setDraftContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSave();
              }
              if (e.key === 'Escape') {
                e.preventDefault();
                handleCancel();
              }
            }}
            className={cn(
              'w-full min-h-[100px] resize-none',
              'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
            )}
            placeholder="Edit your message..."
          />
        </div>
        
        {/* Файлы (отдельный стейт для редактирования) */}
        <div className="px-4">
          <EditAttachmentsBar 
            attachments={editAttachments}
            onAdd={handleAddFile}
            onRemove={handleRemoveFile}
          />
        </div>
        
        {/* Bottom controls */}
        <div className="flex items-center justify-end px-4 pb-4 pt-2 gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>
      
      {/* Mobile-friendly hint */}
      <div className="mt-2 text-sm text-muted-foreground text-center">
        <span className="hidden sm:inline">Press Enter to save, Escape to cancel</span>
        <span className="sm:hidden">Tap Save to confirm changes</span>
      </div>
    </div>
  );
}
