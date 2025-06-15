import { useRef } from 'react';
import { Plus, X } from 'lucide-react';
import { useAttachmentsStore } from '../stores/AttachmentsStore';

interface AttachmentsBarProps {
  mode?: 'compact' | 'full';
}

export default function AttachmentsBar({ mode = 'full' }: AttachmentsBarProps) {
  const { attachments, add, remove } = useAttachmentsStore();
  const inputRef = useRef<HTMLInputElement>(null);

  // В компактном режиме показываем только кнопку добавления
  if (mode === 'compact') {
    return (
      <div className="flex items-center">
        <button
          onClick={() => inputRef.current?.click()}
          className="flex items-center justify-center w-8 h-8 rounded bg-accent hover:bg-accent/80 flex-shrink-0"
          aria-label="Add file"
        >
          <Plus className="w-4 h-4" />
        </button>
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

  // В полном режиме показываем все файлы
  return (
    <div className="flex items-center gap-2 w-full overflow-x-auto pb-2">
      {attachments.map((f) => (
        <div key={f.id} className="relative flex-shrink-0">
          {f.type.startsWith('image') ? (
            <img 
              src={f.preview} 
              className="h-16 w-16 object-cover rounded-lg border border-border" 
              alt={f.name}
            />
          ) : (
            <div className="h-16 w-20 bg-muted rounded-lg border border-border flex flex-col items-center justify-center text-[10px] px-1">
              <span className="line-clamp-1 text-center">{f.name}</span>
              <span className="text-muted-foreground">{f.ext}</span>
            </div>
          )}
          <button
            onClick={() => remove(f.id)}
            className="absolute -right-1 -top-1 bg-background border border-border rounded-full p-1 hover:bg-destructive hover:text-destructive-foreground transition-colors"
            aria-label="Remove file"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
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
