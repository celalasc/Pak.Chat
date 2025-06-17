import { useRef } from 'react';
import { useAttachmentsStore } from '../stores/AttachmentsStore';
import AddActionsDropdown from './AddActionsDropdown';
import FilePreview from './FilePreview';

interface AttachmentsBarProps {
  mode?: 'compact' | 'full';
  messageCount?: number;
}

export default function AttachmentsBar({ mode = 'full', messageCount = 0 }: AttachmentsBarProps) {
  const { attachments, add, remove } = useAttachmentsStore();
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
    <div className="flex items-center gap-2 w-full overflow-x-auto pb-2">
      {attachments.map((f) => (
        <FilePreview
          key={f.id}
          file={f}
          onRemove={remove}
          showPreview={true}
        />
      ))}
      <input
        ref={inputRef}
        type="file"
        hidden
        multiple
        accept="image/*,application/pdf,text/*"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          files.forEach(add);
          e.target.value = '';
        }}
      />
    </div>
  );
}
