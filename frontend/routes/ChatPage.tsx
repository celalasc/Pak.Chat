'use client'

// Next.js router utilities
import { useParams, usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo } from 'react'

// Convex data hooks
import { useQuery, useConvexAuth } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id, Doc } from '@/convex/_generated/dataModel'

// Local utilities and components
import { isConvexId } from '@/lib/ids'
import Chat from '@/frontend/components/Chat'
import MessageLoading from '@/frontend/components/ui/MessageLoading'

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth()

  // ID may be string or array in Next.js App Router
  const id = Array.isArray(params.id) ? params.id[0] : params.id

  // ---------------------------------------------------------------------------
  //                             Data fetching
  // ---------------------------------------------------------------------------
  const isValidId = useMemo(() => id && isConvexId(id), [id])

  const thread = useQuery(
    api.threads.get,
    isValidId && isAuthenticated ? { threadId: id as Id<'threads'> } : 'skip'
  )
  const messagesResult = useQuery(
    api.messages.get,
    isValidId && isAuthenticated ? { threadId: id as Id<'threads'> } : 'skip'
  )
  const attachments = useQuery(
    api.attachments.byThread,
    isValidId ? { threadId: id as Id<'threads'> } : 'skip'
  )

  // ---------------------------------------------------------------------------
  //                             Redirect logic
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // Redirect if the id is malformed
    if (id !== undefined && !isValidId && pathname === `/chat/${id}`) {
      router.replace('/chat')
    }

    // Redirect if the thread does not exist
    if (thread === null) {
      router.replace('/chat')
    }
  }, [id, isValidId, thread, router, pathname])

  // Show loading state while fetching data or if id is invalid
  if (
    authLoading ||
    !isValidId ||
    thread === undefined ||
    messagesResult === undefined ||
    attachments === undefined
  ) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <MessageLoading />
      </div>
    )
  }

  // Thread was not found: useEffect will handle redirect
  if (thread === null) {
    return null
  }

  // ---------------------------------------------------------------------------
  //                          Prepare messages
  // ---------------------------------------------------------------------------
  const messages = useMemo(() => {
    const attachmentsMap: Record<string, any[]> = {}
    attachments?.forEach(a => {
      if (!a.messageId) return
      if (!attachmentsMap[a.messageId]) attachmentsMap[a.messageId] = []
      attachmentsMap[a.messageId].push(a)
    })

    const rawMessages: Doc<'messages'>[] = Array.isArray(messagesResult)
      ? messagesResult
      : messagesResult?.page || []

    return rawMessages.map(m => ({
      id: m._id,
      role: m.role,
      content: m.content,
      createdAt: new Date(m._creationTime),
      parts: [{ type: 'text' as const, text: m.content }],
      attachments: attachmentsMap[m._id] ?? []
    }))
  }, [messagesResult, attachments])

  // ---------------------------------------------------------------------------
  //                              Render
  // ---------------------------------------------------------------------------
  return (
    <Chat
      key={id as string}
      threadId={id as string}
      initialMessages={messages}
    />
  )
}
