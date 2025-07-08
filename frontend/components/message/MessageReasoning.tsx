"use client"

import { Maximize2, Minimize2 } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

interface MessageReasoningProps {
  reasoning: string
  id: string
  isComplete?: boolean
}

export default function MessageReasoning({ reasoning, id, isComplete = false }: MessageReasoningProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  // Автопрокрутка в режиме предпросмотра
  useEffect(() => {
    if (!isExpanded && contentRef.current) {
      const element = contentRef.current
      element.scrollTop = element.scrollHeight
    }
  }, [reasoning, isExpanded])

  if (!reasoning.trim()) return null

  return (
    <div className="w-full my-4 bg-background dark:bg-muted/20 rounded-2xl border border-border/40 dark:border-border/60 shadow-sm overflow-hidden">
      {/* Header - sticky в развернутом режиме */}
      <div className={cn(
        "flex items-center justify-between px-6 py-3 border-b border-border/40 bg-muted/80 dark:bg-muted/60 backdrop-blur-sm",
        isExpanded && "sticky top-0 z-10"
      )}>
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-medium text-foreground">
            {!isComplete ? (
              <span className="shine-text font-semibold">Thinking</span>
            ) : (
              <span className="text-foreground">Reasoned</span>
            )}
          </h2>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="hover:bg-accent/20 p-2 rounded-lg transition-colors"
        >
          {isExpanded ? (
            <Minimize2 className="w-5 h-5 text-muted-foreground" />
          ) : (
            <Maximize2 className="w-5 h-5 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="relative">
        <div
          ref={contentRef}
          className={cn(
            "px-6 text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap",
            !isExpanded
              ? "py-4 h-48 overflow-y-auto"
              : "pt-2 pb-3 overflow-y-visible"
          )}
          style={!isExpanded ? {
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          } : {}}
        >
          {!isExpanded && (
            <style jsx>{`
              div::-webkit-scrollbar {
                display: none;
              }
            `}</style>
          )}
          
          {reasoning}
          {!isComplete && (
            <span className="animate-pulse text-primary font-bold ml-1">|</span>
          )}
        </div>

        {/* Gradient fade overlays только в режиме предпросмотра */}
        {!isExpanded && (
          <>
            {/* Top fade */}
            <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-background via-background/80 to-transparent pointer-events-none" />
            {/* Bottom fade */}
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none" />
          </>
        )}

        {/* Top fade для развернутого режима */}
        {isExpanded && (
          <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-background via-background/60 to-transparent pointer-events-none z-5" />
        )}
      </div>
    </div>
  )
}
