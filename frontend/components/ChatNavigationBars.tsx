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

  // Закрытие окошка при клике вне области на мобильных
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (isMobile && isHovered && sidebarRef.current) {
        // Проверяем, был ли клик вне области навигации
        if (!sidebarRef.current.contains(event.target as Node)) {
          setIsHovered(false)
          setHoveredMessageId(null)
        }
      }
    }

    if (isMobile && isHovered) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
      
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
        document.removeEventListener('touchstart', handleClickOutside)
      }
    }
  }, [isMobile, isHovered])

  // Фильтруем только пользовательские сообщения для навигации
  const userMessages = messages.filter(message => message.role === 'user')
  
  // Последнее сообщение пользователя
  const lastUserMessage = userMessages[userMessages.length - 1]

  // Для мобильных ограничиваем количество точек до 10
  const visibleUserMessages = isMobile ? userMessages.slice(-10) : userMessages

  // Автоскролл в плитке к последнему сообщению при открытии
  useEffect(() => {
    if (isHovered && tileContentRef.current) {
      // Для мобильных всегда скроллим вниз, для ПК - только если много сообщений
      const shouldScroll = isMobile || userMessages.length > 15
      
      if (shouldScroll) {
        // Небольшая задержка для правильного рендеринга
        setTimeout(() => {
          if (tileContentRef.current) {
            tileContentRef.current.scrollTop = tileContentRef.current.scrollHeight
          }
        }, 50)
      }
    }
  }, [isHovered, userMessages.length, isMobile])

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

  const handleDotClick = (messageId: string) => {
    // Для мобильных - показываем окошко при клике на точку
    setIsHovered(true)
    setHoveredMessageId(messageId)
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
    
    // На мобильном скрываем плашку после клика
    if (isMobile) {
      setIsHovered(false)
      setHoveredMessageId(null)
    }
  }

  // Если нет пользовательских сообщений, не отображаем навигацию
  if (userMessages.length === 0) {
    return null
  }

  // На мобильных устройствах показываем точки как на ПК, но в виде точек
  if (isMobile) {
    return (
      <div
        ref={sidebarRef}
        className="fixed left-0 top-0 w-12 h-full flex flex-col items-start justify-center py-4 pl-2 z-30 pointer-events-none"
        onMouseLeave={handleMouseLeave}
      >
        {isHovered ? (
          // Плитка при нажатии на точку (как на ПК)
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
              {/* Показываем ВСЕ сообщения в плашке, не только видимые 10 */}
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
          // Точки вместо полосок
          <div className="flex flex-col items-start space-y-2 max-h-[70vh] overflow-y-auto scrollbar-none pointer-events-auto pr-2">
            {visibleUserMessages.map((message, index) => {
              const isLastMessage = lastUserMessage && message.id === lastUserMessage.id
              return (
                <div
                  key={message.id}
                  className={cn(
                    "w-3 h-3 rounded-full cursor-pointer transition-all duration-200 flex-shrink-0",
                    "bg-gray-300/70 dark:bg-gray-600/60 hover:bg-gray-400/80 dark:hover:bg-gray-500/70",
                    isLastMessage && "bg-primary dark:bg-primary scale-105"
                  )}
                  onClick={() => handleDotClick(message.id)}
                  title={message.content.slice(0, 50) + '...'}
                />
              )
            })}
          </div>
        )}
      </div>
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