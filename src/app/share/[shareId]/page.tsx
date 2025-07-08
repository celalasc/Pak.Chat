'use client';
import { useState } from 'react';
import { useQuery, useMutation, useConvexAuth } from 'convex/react';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import { api } from '@/convex/_generated/api';
import MemoizedMarkdown from '@/frontend/components/MemoizedMarkdown';
import { Button } from '@/frontend/components/ui/button';
import { Card } from '@/frontend/components/ui/card';
import { MessageSquare, ArrowRight, Copy, Check } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import SelectableText from '@/frontend/components/SelectableText';
import QuotedMessage from '@/frontend/components/message/QuotedMessage';

export default function SharePage({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = use(params);
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const thread = useQuery(api.threads.getSharedThread, { shareId });
  const continueFromShared = useMutation(api.threads.continueFromShared);
  const [isContinuing, setIsContinuing] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const handleContinueChat = async () => {
    if (!isAuthenticated) {
      // Redirect to login or show auth prompt
      router.push('/chat');
      return;
    }

    setIsContinuing(true);
    try {
      const newThreadId = await continueFromShared({ shareId });
      router.push(`/chat/${newThreadId}`);
    } catch (error) {
      console.error('Failed to continue chat:', error);
      setIsContinuing(false);
    }
  };

  const handleCopy = (content: string, messageId: string) => {
    navigator.clipboard.writeText(content);
    setCopied(messageId);
    setTimeout(() => setCopied(null), 2000);
  };

  if (thread === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading chat...</p>
        </div>
      </div>
    );
  }

  if (thread === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-xl font-semibold mb-2">Chat not found</h1>
          <p className="text-muted-foreground mb-4">
            The chat link is invalid or the chat has been deleted.
          </p>
          <Button onClick={() => router.push('/chat')}>
            Go to new chat
          </Button>
        </Card>
      </div>
    );
  }

  const sharedBy = thread.userInfo && !thread.isAnonymous 
    ? thread.userInfo.name 
    : 'Anonymous';

  return (
    <div className="w-full min-h-screen flex flex-col overflow-y-auto chat-smooth">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-6 w-6 text-primary" />
              <div>
                  <h1 className="text-lg font-semibold">
                    Chat &quot;{thread.title}&quot; shared by {sharedBy}
                  </h1>
                <div className="flex items-center gap-2">
                    {thread.userInfo && !thread.isAnonymous && thread.userInfo.avatarUrl && (
                      <Image
                        src={thread.userInfo.avatarUrl}
                        alt={sharedBy}
                        width={16}
                        height={16}
                        className="w-4 h-4 rounded-full object-cover"
                      />
                    )}
                  <p className="text-sm text-muted-foreground">
                    Shared chat • Pak.Chat
                  </p>
                </div>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.push('/chat')}
            >
              Pak.Chat
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto" id="messages-scroll-area">
        <main className="w-full max-w-3xl mx-auto pt-6 pb-44 px-4 min-h-full flex-1">
          <div className="space-y-6">
            {thread.messages.map((message, i) => (
              <div
                key={i}
                id={`message-${i}`}
                role="article"
                data-role={message.role}
                className={cn(
                  'flex flex-col',
                  message.role === 'user' ? 'items-end' : 'items-start'
                )}
              >
                {message.role === 'user' ? (
                  // User message - matches real chat style
                  <div className="relative group px-4 py-3 rounded-xl bg-secondary border border-secondary-foreground/2 max-w-[90%] sm:max-w-[80%] mx-2 sm:mx-0">
                    <QuotedMessage content={message.content} />
                    
                    {/* Copy button for user messages */}
                    <div className="transition-opacity duration-100 flex gap-1 opacity-0 group-hover:opacity-100 pointer-events-auto absolute mt-5 right-2 z-10">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleCopy(message.content, `user-${i}`)}
                      >
                        {copied === `user-${i}` ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Assistant message - matches real chat style
                  <div className="group flex flex-col gap-2 w-full px-2 sm:px-0">
                    <SelectableText messageId={`assistant-${i}`}>
                      <div className="prose prose-sm dark:prose-invert max-w-none prose-code:before:content-none prose-code:after:content-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 break-words">
                        <MemoizedMarkdown content={message.content} />
                      </div>
                    </SelectableText>

                    {/* Copy button for assistant messages */}
                    <div className="transition-opacity duration-100 flex gap-1 opacity-0 group-hover:opacity-100 pointer-events-auto">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleCopy(message.content, `assistant-${i}`)}
                      >
                        {copied === `assistant-${i}` ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* End of messages */}
        </main>
      </div>

      {/* Continue Chat Button - positioned like chat input */}
      <div className="fixed left-1/2 -translate-x-1/2 w-full max-w-3xl px-4 transition-all duration-300 z-30 bottom-0">
        <div className="bg-background border border-border rounded-xl p-4 mb-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Continue this conversation</h3>
              <p className="text-sm text-muted-foreground">
                Create a copy of this chat and continue the conversation
              </p>
            </div>
            <Button 
              onClick={handleContinueChat}
              disabled={isContinuing}
              className="flex items-center gap-2"
            >
              {isContinuing ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              {isContinuing ? 'Creating...' : 'Continue'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
