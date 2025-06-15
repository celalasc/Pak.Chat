import { useRef } from 'react';
import { Plus, X } from 'lucide-react';
import { useAttachmentsStore } from '../stores/AttachmentsStore';

export default function AttachmentsBar() {
  const { attachments, add, remove } = useAttachmentsStore();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-2 w-full overflow-x-auto">
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
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          files.forEach(add);
          e.target.value = '';
        }}
      />
      {attachments.map((f) => (
        <div key={f.id} className="relative flex-shrink-0">
          {f.type.startsWith('image') ? (
            <img src={f.preview} className="h-12 w-12 object-cover rounded" />
          ) : (
            <div className="h-12 w-20 bg-muted rounded flex flex-col items-center justify-center text-[10px] px-1">
              <span className="line-clamp-1">{f.name}</span>
              <span className="text-muted-foreground">{f.ext}</span>
            </div>
          )}
          <button
            onClick={() => remove(f.id)}
            className="absolute -right-1 -top-1 bg-background border border-border rounded-full p-0.5"
            aria-label="Remove file"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
