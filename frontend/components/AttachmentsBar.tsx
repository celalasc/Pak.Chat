import { useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { useAttachmentsStore } from '../stores/AttachmentsStore';
import AddActionsDropdown from './AddActionsDropdown';
import FilePreview from './FilePreview';
import { convertToSupportedImage } from '../lib/fileHelpers';

interface AttachmentsBarProps {
  mode?: 'compact' | 'full';
  messageCount?: number;
}

export default function AttachmentsBar({ mode = 'full', messageCount = 0 }: AttachmentsBarProps) {
  const { attachments, add, remove } = useAttachmentsStore();
  const anyUploading = attachments.some(
    (a) => !a.remote && (a as any).isUploading
  );
  const inputRef = useRef<HTMLInputElement>(null);

  // В компактном режиме показываем новое выпадающее меню
  if (mode === 'compact') {
    return (
      <div className="flex items-center">
        <AddActionsDropdown messageCount={messageCount} />
      </div>
    );
  }

  // В полном режиме показываем все файлы
  return (
    <div className="relative flex items-center gap-2 w-full overflow-x-auto pb-2">
      {attachments.map((f) => (
        <FilePreview
          key={f.id}
          file={f}
          onRemove={remove}
          showPreview={true}
        />
      ))}
      {anyUploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm pointer-events-none rounded-md">
          <Loader2 className="w-5 h-5 text-foreground animate-spin" />
        </div>
      )}
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
            add(processed);
          }
          e.target.value = '';
        }}
      />
    </div>
  );
}
