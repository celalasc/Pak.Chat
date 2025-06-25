import { useCallback } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { toast } from 'sonner';
import { createImagePreview } from '@/frontend/lib/image';
import { getImageDimensions } from '../utils/fileHelpers';

export const useFileUpload = () => {
  const generateUploadUrl = useMutation(api.attachments.generateUploadUrl);
  const saveAttachments = useMutation(api.attachments.save as any);

  const uploadFiles = useCallback(async (files: File[], messageId: string, threadId: string) => {
    const uploadedFiles = await Promise.all(
      files.map(async (file) => {
        try {
          // Upload original file
          const uploadUrl = await generateUploadUrl();
          const resOrig = await fetch(uploadUrl, {
            method: 'POST',
            headers: { 'Content-Type': file.type },
            body: file,
          });
          
          if (!resOrig.ok) {
            throw new Error(`Failed to upload ${file.name}`);
          }
          
          const { storageId } = await resOrig.json();

          // Create and upload preview for images
          let previewId: string | undefined = undefined;
          
          if (file.type.startsWith('image/')) {
            const previewFile = await createImagePreview(file);
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

          // Get image dimensions
          const dimensions = await getImageDimensions(file);

          return {
            storageId,
            previewId,
            name: file.name,
            type: file.type,
            messageId,
            width: dimensions?.width,
            height: dimensions?.height,
            size: file.size,
          };
        } catch (error) {
          console.error('Failed to upload file:', file.name, error);
          toast.error(`Failed to upload ${file.name}`);
          throw error;
        }
      })
    );

    // Save metadata to database
    if (uploadedFiles.length > 0) {
      try {
        const savedAttachments = await saveAttachments({
          threadId,
          attachments: uploadedFiles,
        });
        return savedAttachments;
      } catch (error) {
        console.error('Failed to save attachment metadata:', error);
        toast.error('Failed to save file metadata');
        throw error;
      }
    }

    return [];
  }, [generateUploadUrl, saveAttachments]);

  return {
    uploadFiles,
  };
}; 