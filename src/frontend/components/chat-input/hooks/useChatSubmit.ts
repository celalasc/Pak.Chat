import { useCallback, useState, useRef } from 'react';
import { UseChatHelpers } from '@ai-sdk/react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useAPIKeyStore } from '@/frontend/stores/APIKeyStore';
import { useModelStore } from '@/frontend/stores/ModelStore';
import { useChatStore } from '@/frontend/stores/ChatStore';
import { useAttachmentsStore, LocalAttachment } from '@/frontend/stores/AttachmentsStore';
import { useQuoteStore } from '@/frontend/stores/QuoteStore';
import { useAuthStore } from '@/frontend/stores/AuthStore';
import { useCustomModesStore, useCustomModesHelpers } from '@/frontend/stores/CustomModesStore';
import { useMessageSummary } from '@/frontend/hooks/useMessageSummary';
import { isConvexId } from '@/lib/ids';
import { getModelConfig } from '@/lib/models';
import { toast } from 'sonner';
import { createImagePreview } from '@/frontend/lib/image';
import { saveLastPath, saveLastChatId } from '@/frontend/lib/lastChat';
import { addFileToRecent, addUploadedFileMetaToRecent } from '@/frontend/components/RecentFilesDropdown';
import { getImageDimensions } from '../utils/fileHelpers';
import { createUserMessage } from '../utils/messageHelpers';

interface UseChatSubmitProps {
  threadId: string;
  sessionThreadId: string | undefined;
  setSessionThreadId: (id: string | undefined) => void;
  input: string;
  setInput: UseChatHelpers['setInput'];
  append: UseChatHelpers['append'];
  clearQuote: () => void;
  adjustHeight: (reset?: boolean) => void;
  onThreadCreated?: (id: Id<'threads'>) => void;
  projectId?: Id<'projects'>;
}

export const useChatSubmit = ({
  threadId,
  sessionThreadId,
  setSessionThreadId,
  input,
  setInput,
  append,
  clearQuote,
  adjustHeight,
  onThreadCreated,
  projectId,
}: UseChatSubmitProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const { hasRequiredKeys, keys } = useAPIKeyStore();
  const { selectedModel, webSearchEnabled } = useModelStore();
  const { isImageGenerationMode, imageGenerationParams } = useChatStore();
  const { attachments, clear, setUploading } = useAttachmentsStore();
  const { currentQuote } = useQuoteStore();
  const { user } = useAuthStore();
  const { selectedMode } = useCustomModesStore();
  const { getSelectedMode } = useCustomModesHelpers();
  const { complete } = useMessageSummary();
  
  // Mutations
  const createThread = useMutation(api.threads.createWithProject);
  const sendMessage = useMutation<typeof api.messages.send>(api.messages.send);
  const generateUploadUrl = useMutation(api.attachments.generateUploadUrl);
  const saveAttachments = useMutation(api.attachments.save as any);
  const saveDraftMutation = useMutation(api.threads.saveDraft);
  const updateAttachmentMessageId = useMutation(api.attachments.updateMessageId);

  const canChat = hasRequiredKeys();

  const handleSubmit = useCallback(async () => {
    const isDisabled = !input.trim() || isSubmitting || !canChat;
    if (isDisabled) return;
    
    setIsSubmitting(true);

    const currentInput = textareaRef.current?.value || input;
    let finalMessage = currentInput.trim();
    if (currentQuote) {
      finalMessage = `> ${currentQuote.text.replace(/\n/g, '\n> ')}\n\n${currentInput.trim()}`;
    }

    // Reset UI early but keep attachments until they finish uploading
    setInput('');
    clearQuote();
    adjustHeight(true);

    try {
      // IMAGE GENERATION: Check if image generation mode is enabled
      if (isImageGenerationMode) {
        if (!finalMessage.trim()) {
          toast.error('Please enter a prompt for image generation');
          setIsSubmitting(false);
          return;
        }

        if (!keys.openai) {
          toast.error('OpenAI API key is required for image generation');
          setIsSubmitting(false);
          return;
        }
      }

      // Проверка: PDF вложения разрешены только для Google (Gemini) моделей
      const provider = getModelConfig(selectedModel).provider;
      if (attachments.some((a) => a.type === 'application/pdf') && provider !== 'google') {
        toast.error(
          "PDF files are only supported by the Gemini model. Please select the Gemini model or remove the PDF.",
        );
        setIsSubmitting(false);
        return;
      }

      // Ensure thread exists
      let ensuredThreadId: Id<'threads'>;
      
      if (sessionThreadId && isConvexId(sessionThreadId)) {
        ensuredThreadId = sessionThreadId as Id<'threads'>;
      } else if (isConvexId(threadId)) {
        ensuredThreadId = threadId as Id<'threads'>;
      } else {
        // Создаем чат с временным заголовком, который будет обновлен позже
        // Это позволяет не ждать генерации заголовка от AI
        const tempTitle = finalMessage.slice(0, 60).trim() || 'New Chat';
        ensuredThreadId = await createThread({
          title: tempTitle,
          projectId: projectId,
        });
        
        setSessionThreadId(ensuredThreadId);
        
        // Вызываем callback для обновления состояния
        // Навигация будет обработана в компоненте Chat
        onThreadCreated?.(ensuredThreadId);
      }

      // Save user message to database first
      const dbMsgId = await sendMessage({
        threadId: ensuredThreadId,
        content: finalMessage,
        role: 'user',
      });

      // Handle file uploads in parallel with message creation
      const localAttachments = attachments.filter((att): att is LocalAttachment => !att.remote);
      const remoteAttachments = attachments.filter(att => att.remote);
      
      // Set uploading state for local files
      localAttachments.forEach(att => setUploading(att.id, true));
      
      // Start file uploads in parallel (don't await here)
      const uploadPromise = localAttachments.length > 0 ? Promise.all(
        localAttachments.map(async (attachment) => {
          try {
            // Upload original file
            const uploadUrl = await generateUploadUrl();
            const resOrig = await fetch(uploadUrl, {
              method: 'POST',
              headers: { 'Content-Type': attachment.file.type },
              body: attachment.file,
            });
            if (!resOrig.ok) throw new Error(`Failed to upload ${attachment.name}`);
            const { storageId } = await resOrig.json();

            // Create and upload preview
            let previewId: string | undefined = undefined;
            
            if (attachment.file.name.startsWith('drawing-') && attachment.file.name.endsWith('.png')) {
              const previewUploadUrl = await generateUploadUrl();
              const resPrev = await fetch(previewUploadUrl, {
                method: 'POST',
                headers: { 'Content-Type': attachment.file.type },
                body: attachment.file,
              });
              if (resPrev.ok) {
                const { storageId: pId } = await resPrev.json();
                previewId = pId;
              }
            } else {
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

            const dimensions = await getImageDimensions(attachment.file);
            setUploading(attachment.id, false);

            return {
              storageId,
              previewId,
              name: attachment.name,
              type: attachment.type,
              messageId: undefined,
              width: dimensions?.width,
              height: dimensions?.height,
              size: attachment.size,
            };
          } catch (error) {
            setUploading(attachment.id, false);
            throw error;
          }
        })
      ) : Promise.resolve([]);

      // Wait for uploads to complete
      const uploadedFiles = await uploadPromise;

      // Add remote attachments
      const reusedFiles = remoteAttachments.map(att => {
        const remoteAtt = att as any;
        return {
          storageId: remoteAtt.storageId,
          previewId: remoteAtt.previewId,
          name: att.name,
          type: att.type,
          messageId: undefined,
          width: undefined,
          height: undefined,
          size: att.size,
        };
      });
      
      uploadedFiles.push(...reusedFiles);

      // Save attachment metadata
      let savedAttachments: any[] = [];
      if (uploadedFiles.length > 0) {
        try {
          savedAttachments = await saveAttachments({
            threadId: ensuredThreadId,
            attachments: uploadedFiles,
          });
        } catch (err) {
          toast.error('Failed to save attachment metadata');
          setIsSubmitting(false);
          return;
        }
      }

      // Generate title for new chat asynchronously - truly fire and forget
      const isNewChat = !isConvexId(threadId) && !sessionThreadId;
      if (isNewChat) {
        // Используем setTimeout для полностью асинхронного выполнения
        // Это гарантирует, что генерация заголовка не блокирует отправку сообщения
        setTimeout(() => {
          complete(finalMessage, {
            body: { threadId: ensuredThreadId, isTitle: true },
          }).catch(err => {
            // Тихо обрабатываем ошибку - заголовок не критичен для функциональности
          });
        }, 0);
      }

      // Prepare attachments for UI and LLM
      const attachmentsForUI = savedAttachments.map((a) => ({
        id: a.id,
        url: a.url ?? '',
        name: a.name,
        type: a.type,
        ext: a.name.split('.').pop() ?? '',
        size: a.size,
      }));

      // Note: messageId will be updated later by the server when processing the message

      const attachmentsForLLM = savedAttachments.map((a) => ({
        id: a.id,
        messageId: undefined,
        name: a.name,
        type: a.type,
        url: a.url ?? '',
      }));

      // Image generation data
      const imageGenerationData = isImageGenerationMode ? {
        enabled: true,
        params: {
          size: imageGenerationParams.size === 'auto' ? '1024x1024' : imageGenerationParams.size,
          quality: imageGenerationParams.quality === 'auto' ? 'standard' : 
                  imageGenerationParams.quality === 'high' ? 'hd' : 'standard',
          count: imageGenerationParams.count,
        }
      } : undefined;

      // Get current mode information
      const currentMode = getSelectedMode();
      const customModeData = currentMode.id !== 'default' ? {
        id: currentMode.id,
        systemPrompt: currentMode.systemPrompt
      } : undefined;

      // Send to LLM (use DB message ID to avoid duplication)
      // ВАЖНО: Передаем ensuredThreadId в body, чтобы API получил правильный threadId
      
      
      append(
        createUserMessage(dbMsgId, finalMessage, attachmentsForUI),
        {
          body: {
            model: selectedModel,
            apiKeys: keys,
            threadId: ensuredThreadId, // Обязательно передаем правильный threadId
            userId: user?.uid,
            search: webSearchEnabled,
            attachments: attachmentsForLLM,
            imageGeneration: imageGenerationData,
            customMode: customModeData,
            projectId: projectId,
          },
          threadId: ensuredThreadId, // Передаем threadId напрямую в options
        }
      );
      

      // Add files to recent
      if (localAttachments.length > 0) {
        localAttachments.forEach(attachment => {
          addFileToRecent(attachment.file);
        });
      }

      if (savedAttachments.length > 0) {
        savedAttachments.forEach((savedAttachment, index) => {
          let localAttachment: LocalAttachment | undefined = localAttachments[index];
          
          if (!localAttachment || 
              localAttachment.name !== savedAttachment.name || 
              localAttachment.type !== savedAttachment.type) {
            localAttachment = localAttachments.find(local => 
              local.name === savedAttachment.name && 
              local.type === savedAttachment.type &&
              local.size === savedAttachment.size
            );
          }
          
          if (localAttachment) {
            addUploadedFileMetaToRecent({
              storageId: savedAttachment.fileId,
              previewId: savedAttachment.previewId,
              name: savedAttachment.name,
              type: savedAttachment.type,
              size: savedAttachment.size,
              previewUrl: savedAttachment.url,
            });
          }
        });
      }

      clear();
      
      if (isConvexId(ensuredThreadId)) {
        saveDraftMutation({ threadId: ensuredThreadId, draft: '' });
      }

    } catch (error) {
      toast.error('Failed to send message.');
      setInput(currentInput);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    input,
    isSubmitting,
    canChat,
    threadId,
    sessionThreadId,
    attachments,
    currentQuote,
    setInput,
    clearQuote,
    adjustHeight,
    isImageGenerationMode,
    imageGenerationParams,
    keys,
    selectedModel,
    selectedMode,
    webSearchEnabled,
    user,
    setSessionThreadId,
    onThreadCreated,
    createThread,
    sendMessage,
    generateUploadUrl,
    saveAttachments,
    updateAttachmentMessageId,
    complete,
    append,
    clear,
    saveDraftMutation,
    setUploading,
    getSelectedMode,
    projectId,
  ]);

  return {
    handleSubmit,
    isSubmitting,
    canChat,
    textareaRef,
  };
};