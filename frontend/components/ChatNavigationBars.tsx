"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { UIMessage } from 'ai'

interface ChatNavigationBarsProps {
  messages: UIMessage[]
  scrollToMessage: (id: string) => void
  currentMessageId?: string
}

export default function ChatNavigationBars({ messages, scrollToMessage, currentMessageId }: ChatNavigationBarsProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null)
  const [maxBarLength, setMaxBarLength] = useState(0)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Фильтруем только пользовательские сообщения для навигации
  const userMessages = messages.filter(message => message.role === 'user')

  // Вычисляем максимальную длину полоски при монтировании компонента
  useEffect(() => {
    if (userMessages.length > 0) {
      const maxLength = Math.max(...userMessages.map((message) => getBarLength(message.content.length)))
      setMaxBarLength(maxLength)
    }
  }, [userMessages])

  // Автоматически скроллим к текущему активному сообщению
  useEffect(() => {
    if (currentMessageId && scrollContainerRef.current && !isHovered) {
      const currentIndex = userMessages.findIndex(msg => msg.id === currentMessageId)
      if (currentIndex !== -1) {
        const container = scrollContainerRef.current
        const itemHeight = 4.5 // 3px высота + 1.5 space-y
        const scrollPosition = currentIndex * itemHeight
        const containerHeight = container.clientHeight
        
        // Скроллим только если элемент не виден
        if (scrollPosition < container.scrollTop || scrollPosition > container.scrollTop + containerHeight) {
          container.scrollTo({
            top: scrollPosition - containerHeight / 2,
            behavior: 'smooth'
          })
        }
      }
    }
  }, [currentMessageId, userMessages, isHovered])

  // Функция для вычисления длины полоски на основе длины сообщения
  const getBarLength = (messageLength: number) => {
    const minLength = 16
    const maxLength = 60  // Уменьшил максимальную длину
    const maxMessageLength = 150  // Уменьшил порог для максимальной длины

    const normalizedLength = Math.min(messageLength, maxMessageLength)
    const length = minLength + (normalizedLength / maxMessageLength) * (maxLength - minLength)

    return Math.round(length)
  }

  // Функция для получения заголовка сообщения (ограничение до 6 слов)
  const getMessageTitle = (content: string) => {
    const words = content.trim().split(/\s+/)
    if (words.length <= 6) {
      return content
    }
    return words.slice(0, 6).join(' ') + '...'
  }

  const handleMouseEnter = (messageId: string) => {
    setIsHovered(true)
    setHoveredMessageId(messageId)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    setHoveredMessageId(null)
  }

  const handleBarClick = (messageId: string) => {
    scrollToMessage(messageId)
  }

  // Если нет пользовательских сообщений, не отображаем навигацию
  if (userMessages.length === 0) {
    return null
  }

  return (
    <div 
      ref={sidebarRef} 
      className="fixed left-0 top-0 w-20 h-full flex flex-col items-start justify-center py-4 pl-3 z-30"
      onMouseLeave={handleMouseLeave}
    >
      {isHovered ? (
        // Плитка при наведении в стиле Notion
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg p-2 min-w-[200px] max-w-[280px]">
          {userMessages.map((message, index) => {
            const messageTitle = getMessageTitle(message.content)
            const isCurrentHovered = hoveredMessageId === message.id
            const isCurrentMessage = currentMessageId === message.id
            
            return (
              <div
                key={message.id}
                className={cn(
                  "py-1.5 px-2 rounded-md cursor-pointer transition-colors duration-150 text-sm",
                  // Простая подсветка при наведении без синего цвета
                  isCurrentHovered 
                    ? "bg-gray-100 dark:bg-gray-700" 
                    : "hover:bg-gray-50 dark:hover:bg-gray-750"
                )}
                onClick={() => handleBarClick(message.id)}
                onMouseEnter={() => setHoveredMessageId(message.id)}
              >
                <div className={cn(
                  "leading-tight transition-colors duration-150",
                  // Подсветка текста текущего сообщения
                  isCurrentMessage 
                    ? "text-gray-900 dark:text-white font-medium" 
                    : "text-gray-700 dark:text-gray-200"
                )}>
                  {messageTitle}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        // Полоски в стиле Notion с прокруткой при большом количестве сообщений
        <div 
          ref={scrollContainerRef}
          className="flex flex-col items-start space-y-1.5 max-h-[70vh] overflow-y-auto scrollbar-none"
        >
          {userMessages.map((message) => {
            const barLength = getBarLength(message.content.length)
            const isActive = currentMessageId === message.id

            return (
              <div
                key={message.id}
                className={cn(
                  "transition-all duration-200 rounded-sm cursor-pointer flex-shrink-0",
                  // Базовые стили как в Notion
                  "bg-gray-300/70 dark:bg-gray-600/60 hover:bg-gray-400/80 dark:hover:bg-gray-500/70",
                  // Активное состояние без синего цвета
                  isActive && "bg-gray-400/90 dark:bg-gray-500/80"
                )}
                style={{
                  width: `${barLength}px`,
                  height: "3px",
                }}
                onMouseEnter={() => handleMouseEnter(message.id)}
                onClick={() => handleBarClick(message.id)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
} 