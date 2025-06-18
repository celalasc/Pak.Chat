'use client';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import MemoizedMarkdown from '@/frontend/components/MemoizedMarkdown';

export default function SharePage({ params }: { params: { shareId: string } }) {
  const { shareId } = params;
  const thread = useQuery(api.threads.getSharedThread, { shareId });

  if (thread === undefined) return <div className="p-4">Loading…</div>;
  if (thread === null) return <div className="p-4">Chat not found.</div>;

  return (
    <main className="max-w-3xl mx-auto py-12 px-4 space-y-6">
      <h1 className="text-2xl font-bold">{thread.title}</h1>
      {thread.messages.map((m, i) => (
        <div key={i} className="border rounded-lg p-4 bg-muted">
          <div className="font-semibold mb-2">
            {m.role === 'user' ? 'User' : 'Assistant'}
          </div>
          <MemoizedMarkdown content={m.content} />
        </div>
      ))}
    </main>
  );
}
