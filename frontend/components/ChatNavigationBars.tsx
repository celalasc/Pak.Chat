"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { UIMessage } from 'ai'

interface ChatNavigationBarsProps {
  messages: UIMessage[]
  scrollToMessage: (id: string) => void
  currentMessageId?: string // Не используется, но оставляем для совместимости
}

export default function ChatNavigationBars({ messages, scrollToMessage }: ChatNavigationBarsProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [showMobileNav, setShowMobileNav] = useState(false) // Состояние для показа мобильной навигации
  const sidebarRef = useRef<HTMLDivElement>(null)
  const tileContentRef = useRef<HTMLDivElement>(null)

  // Определяем мобильное устройство
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Фильтруем только пользовательские сообщения для навигации
  const userMessages = messages.filter(message => message.role === 'user')
  
  // Последнее сообщение пользователя
  const lastUserMessage = userMessages[userMessages.length - 1]

  // Для мобильных ограничиваем количество точек до 8
  const visibleUserMessages = isMobile ? userMessages.slice(-8) : userMessages

  // Автоскролл в плитке к последнему сообщению при открытии
  useEffect(() => {
    if (isHovered && tileContentRef.current && userMessages.length > 15) {
      // Небольшая задержка для правильного рендеринга
      setTimeout(() => {
        if (tileContentRef.current) {
          tileContentRef.current.scrollTop = tileContentRef.current.scrollHeight
        }
      }, 50)
    }
  }, [isHovered, userMessages.length])

  // Функция для вычисления длины полоски на основе длины сообщения
  const getBarLength = (messageLength: number) => {
    const minLength = 16
    const maxLength = 60
    const maxMessageLength = 200

    const normalizedLength = Math.min(messageLength, maxMessageLength)
    const length = minLength + (normalizedLength / maxMessageLength) * (maxLength - minLength)

    return Math.round(length)
  }

  // Функция для получения заголовка сообщения
  const getMessageTitle = (content: string) => {
    const words = content.trim().split(/\s+/)
    const maxWords = userMessages.length > 20 ? 4 : 6
    
    if (words.length <= maxWords) {
      return content
    }
    return words.slice(0, maxWords).join(' ') + '...'
  }

  const handleMouseEnter = (messageId: string) => {
    if (!isMobile) {
      setIsHovered(true)
      setHoveredMessageId(messageId)
    }
  }

  const handleMouseLeave = () => {
    if (!isMobile) {
      setIsHovered(false)
      setHoveredMessageId(null)
    }
  }

  const handleBarClick = (messageId: string) => {
    // Простой скроллинг для всех устройств
    const element = document.getElementById(`message-${messageId}`)
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start',
        inline: 'nearest'
      })
    }
    
    // На мобильном скрываем навигацию после клика
    if (isMobile) {
      setShowMobileNav(false)
    }
  }

  // Если нет пользовательских сообщений, не отображаем навигацию
  if (userMessages.length === 0) {
    return null
  }

  // На мобильных устройствах показываем toggle кнопку и навигацию по требованию
  if (isMobile) {
    return (
      <>
        {/* Toggle кнопка для показа навигации */}
        <div className="fixed left-2 top-1/2 -translate-y-1/2 z-30">
          <button
            onClick={() => setShowMobileNav(!showMobileNav)}
            className={cn(
              "w-8 h-8 rounded-full bg-background/80 backdrop-blur-md border border-border/50 shadow-lg",
              "flex items-center justify-center transition-all duration-200",
              "hover:bg-background/90 hover:scale-105",
              showMobileNav && "bg-primary/20 border-primary/30"
            )}
            aria-label={showMobileNav ? "Hide navigation" : "Show navigation"}
          >
            <div className="flex flex-col space-y-0.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "w-1 h-1 rounded-full transition-all duration-200",
                    showMobileNav 
                      ? "bg-primary" 
                      : "bg-muted-foreground/60"
                  )}
                />
              ))}
            </div>
          </button>
        </div>

        {/* Навигационная панель (показывается по требованию) */}
        {showMobileNav && (
          <div className="fixed left-12 top-1/2 -translate-y-1/2 w-3 max-h-[60vh] flex flex-col items-start justify-center z-30 pointer-events-auto">
            <div className="flex flex-col items-start space-y-1 max-h-full overflow-y-auto scrollbar-none">
              {visibleUserMessages.map((message, index) => {
                const isLastMessage = lastUserMessage && message.id === lastUserMessage.id
                return (
                  <div
                    key={message.id}
                    className={cn(
                      "w-2 h-2 rounded-full cursor-pointer transition-all duration-200 flex-shrink-0",
                      isLastMessage 
                        ? "bg-primary scale-125" 
                        : "bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500"
                    )}
                    onClick={() => handleBarClick(message.id)}
                    title={`Message ${userMessages.length - visibleUserMessages.length + index + 1}`}
                  />
                )
              })}
              {userMessages.length > 8 && (
                <div className="text-xs text-muted-foreground/70 text-center w-full mt-1">
                  +{userMessages.length - 8}
                </div>
              )}
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <div
      ref={sidebarRef}
      className="fixed left-0 top-0 w-20 h-full flex flex-col items-start justify-center py-4 pl-3 z-30 pointer-events-none"
      onMouseLeave={handleMouseLeave}
    >
      {isHovered ? (
        // Плитка при наведении
        <div className={cn(
          "bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg pointer-events-auto",
          userMessages.length > 15 ? "w-80 h-96" : "min-w-[200px] max-w-[280px]"
        )}>
          <div 
            ref={tileContentRef}
            className={cn(
              "p-2",
              userMessages.length > 15 ? "h-full overflow-y-auto" : ""
            )}
          >
            {userMessages.map((message) => {
              const messageTitle = getMessageTitle(message.content)
              const isCurrentHovered = hoveredMessageId === message.id
              const isLastMessage = lastUserMessage && message.id === lastUserMessage.id
              
              return (
                <div
                  key={message.id}
                  className={cn(
                    "py-1.5 px-2 rounded-md cursor-pointer transition-colors duration-150 text-sm mb-1",
                    isCurrentHovered 
                      ? "bg-gray-100 dark:bg-gray-700" 
                      : "hover:bg-gray-50 dark:hover:bg-gray-750",
                    isLastMessage && "bg-gray-200 dark:bg-gray-600"
                  )}
                  onClick={() => handleBarClick(message.id)}
                  onMouseEnter={() => setHoveredMessageId(message.id)}
                >
                  <div className={cn(
                    "leading-tight transition-colors duration-150",
                    isLastMessage 
                      ? "text-gray-900 dark:text-white font-medium" 
                      : "text-gray-700 dark:text-gray-200"
                  )}>
                    {messageTitle}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        // Полоски
        <div className="flex flex-col items-start space-y-1.5 max-h-[70vh] overflow-y-auto scrollbar-none pointer-events-auto pr-2">
          {userMessages.map((message) => {
            const barLength = getBarLength(message.content.length)
            const isLastMessage = lastUserMessage && message.id === lastUserMessage.id

            return (
              <div
                key={message.id}
                className={cn(
                  "transition-all duration-200 rounded-sm cursor-pointer flex-shrink-0",
                  "bg-gray-300/70 dark:bg-gray-600/60 hover:bg-gray-400/80 dark:hover:bg-gray-500/70",
                  isLastMessage && "bg-primary dark:bg-primary scale-105"
                )}
                style={{
                  width: `${barLength}px`,
                  height: "3px",
                }}
                onMouseEnter={() => handleMouseEnter(message.id)}
                onClick={() => handleBarClick(message.id)}
                title={message.content.slice(0, 50) + '...'}
              />
            )
          })}
        </div>
      )}
    </div>
  )
} 