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
  sessionThreadId: string | null;
  setSessionThreadId: (id: string | null) => void;
  input: string;
  setInput: UseChatHelpers['setInput'];
  append: UseChatHelpers['append'];
  clearQuote: () => void;
  adjustHeight: (reset?: boolean) => void;
  onThreadCreated?: (id: Id<'threads'>) => void;
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
}: UseChatSubmitProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const { hasRequiredKeys, keys } = useAPIKeyStore();
  const { selectedModel, webSearchEnabled } = useModelStore();
  const { isImageGenerationMode, imageGenerationParams } = useChatStore();
  const { attachments, clear, setUploading } = useAttachmentsStore();
  const { currentQuote } = useQuoteStore();
  const { user } = useAuthStore();
  const { complete } = useMessageSummary();
  
  // Mutations
  const createThread = useMutation(api.threads.create);
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
        ensuredThreadId = await createThread({
          title: finalMessage.slice(0, 30) || 'New Chat',
        });
        
        setSessionThreadId(ensuredThreadId);
        onThreadCreated?.(ensuredThreadId);
        
        if (typeof window !== 'undefined') {
          window.history.replaceState(null, '', `/chat/${ensuredThreadId}`);
          saveLastPath(`/chat/${ensuredThreadId}`);
          saveLastChatId(ensuredThreadId);
        }
      }

      // Save message to DB
      const dbMsgId = await sendMessage({
        threadId: ensuredThreadId,
        content: finalMessage,
        role: 'user',
      });

      // Handle file uploads
      const localAttachments = attachments.filter((att): att is LocalAttachment => !att.remote);
      const remoteAttachments = attachments.filter(att => att.remote);
      
      // Set uploading state for local files
      localAttachments.forEach(att => setUploading(att.id, true));
      
      const uploadedFiles = await Promise.all(
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
              messageId: dbMsgId,
              width: dimensions?.width,
              height: dimensions?.height,
              size: attachment.size,
            };
          } catch (error) {
            console.error('Failed to upload file:', attachment.name, error);
            setUploading(attachment.id, false);
            throw error;
          }
        })
      );

      // Add remote attachments
      const reusedFiles = remoteAttachments.map(att => {
        const remoteAtt = att as any;
        return {
          storageId: remoteAtt.storageId,
          previewId: remoteAtt.previewId,
          name: att.name,
          type: att.type,
          messageId: dbMsgId,
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
          console.error(err);
          setIsSubmitting(false);
          return;
        }
      }

      // Generate title for new chat
      const isNewChat = !isConvexId(threadId) && !sessionThreadId;
      if (isNewChat) {
        complete(finalMessage, {
          body: { threadId: ensuredThreadId, messageId: dbMsgId, isTitle: true },
        });
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

      if (savedAttachments.length > 0) {
        await updateAttachmentMessageId({
          attachmentIds: savedAttachments.map((a) => a.id),
          messageId: dbMsgId,
        });
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const attachmentsForLLM = savedAttachments.map((a) => ({
        id: a.id,
        messageId: dbMsgId,
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

      // Send to LLM
      append(
        createUserMessage(dbMsgId, finalMessage, attachmentsForUI),
        {
          body: {
            model: selectedModel,
            apiKeys: keys,
            threadId: ensuredThreadId,
            userId: user?.uid,
            search: webSearchEnabled,
            attachments: attachmentsForLLM,
            imageGeneration: imageGenerationData,
          },
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
      console.error('Submit error:', error);
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
  ]);

  return {
    handleSubmit,
    isSubmitting,
    canChat,
    textareaRef,
  };
}; 