'use client'

import { useDraftStore } from '@/frontend/stores/DraftStore'
import Chat from '@/frontend/components/Chat'

export const dynamic = 'force-dynamic'

export default function Page() {
  const draftKey = useDraftStore((s) => s.draftKey)
  return (
    <Chat key={`draft-${draftKey}`} threadId="" initialMessages={[]} />
  )
}
