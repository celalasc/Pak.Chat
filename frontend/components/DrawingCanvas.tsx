"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './ui/button';
import { 
  Brush, 
  Square, 
  Circle, 
  Type, 
  Eraser, 
  Undo, 
  Redo, 
  Download, 
  X, 
  Move,
  Palette,
  Image as ImageIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '../hooks/useIsMobile';

interface Point {
  x: number;
  y: number;
}

interface DrawingElement {
  id: string;
  type: 'brush' | 'rectangle' | 'circle' | 'text' | 'image';
  points?: Point[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  text?: string;
  color: string;
  strokeWidth: number;
  isDragging?: boolean;
  image?: {
    src: string;
    naturalWidth: number;
    naturalHeight: number;
  };
}

interface DrawingCanvasProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (imageData: string) => void;
}

const COLORS = [
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
  '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080',
  '#FFC0CB', '#A52A2A', '#808080', '#000080', '#008000'
];

const STROKE_WIDTHS = [1, 2, 4, 8, 16];

export default function DrawingCanvas({ isOpen, onClose, onSave }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { isMobile } = useIsMobile();
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'brush' | 'rectangle' | 'circle' | 'text' | 'eraser' | 'move'>('brush');
  const [color, setColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [elements, setElements] = useState<DrawingElement[]>([]);
  const [history, setHistory] = useState<DrawingElement[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [showColorPalette, setShowColorPalette] = useState(false);
  const [showStrokeWidth, setShowStrokeWidth] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [textPosition, setTextPosition] = useState<Point | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [showMobileTools, setShowMobileTools] = useState(false);

  // ====== D5-D7. Resize handles & interaction ======
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null); // 'br', 'tr', 'bl', 'tl', etc.
  const [initialElementState, setInitialElementState] = useState<DrawingElement | null>(null);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [pinchStart, setPinchStart] = useState<{ distance: number; center: Point } | null>(null);

  // Image cache to prevent flicker
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());

  // ====== D1. Reset state helper ======
  const resetCanvasState = useCallback(() => {
    setElements([]);
    setHistory([[]]);
    setHistoryIndex(0);
    setSelectedElement(null);
    setDragStart(null);
    setTextInput('');
    setTextPosition(null);
    imageCache.current.clear(); // Clear image cache
  }, []);

  // Сброс при закрытии/сохранении
  useEffect(() => {
    if (!isOpen) {
      resetCanvasState();
    }
  }, [isOpen, resetCanvasState]);

  // ====== D3/D4. Image insertion ======
  const fileInputRef = useRef<HTMLInputElement>(null);

  const insertImageFromFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const maxCanvasWidth = canvasSize.width * 0.5;
        const scale = Math.min(1, maxCanvasWidth / img.width);
        const w = img.width * scale;
        const h = img.height * scale;
        const newEl: DrawingElement = {
          id: Date.now().toString(),
          type: 'image',
          x: (canvasSize.width - w) / 2,
          y: (canvasSize.height - h) / 2,
          width: w,
          height: h,
          color: '#000000',
          strokeWidth: 1,
          image: {
            src: dataUrl,
            naturalWidth: img.width,
            naturalHeight: img.height,
          },
        };
        setElements(prev => [...prev, newEl]);
        // history will be updated via separate interactions
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, [canvasSize.width, canvasSize.height, elements]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      insertImageFromFile(file);
    }
  }, [insertImageFromFile]);

  // Clipboard paste
  useEffect(() => {
    if (!isOpen) return;
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            insertImageFromFile(file);
            e.preventDefault();
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste as EventListener);
    return () => {
      window.removeEventListener('paste', handlePaste as EventListener);
    };
  }, [isOpen, insertImageFromFile]);

  // Drag & Drop
  useEffect(() => {
    if (!isOpen) return;
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer?.files.length) {
        insertImageFromFile(e.dataTransfer.files[0]);
      }
    };
    const handleDragOver = (e: DragEvent) => e.preventDefault();
    window.addEventListener('drop', handleDrop);
    window.addEventListener('dragover', handleDragOver);
    return () => {
      window.removeEventListener('drop', handleDrop);
      window.removeEventListener('dragover', handleDragOver);
    };
  }, [isOpen, insertImageFromFile]);

  // Shift key detection for aspect ratio
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftPressed(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftPressed(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isOpen]);

  // Get resize handles for selected element
  const getResizeHandles = useCallback((element: DrawingElement) => {
    if (element.type === 'brush') return []; // No resize for brush strokes
    
    // For text elements, calculate bounds
    if (element.type === 'text' && element.text && element.x !== undefined && element.y !== undefined) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.font = `${element.strokeWidth * 8}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
          const textMetrics = ctx.measureText(element.text);
          const width = textMetrics.width;
          const height = element.strokeWidth * 8;
          const x = element.x;
          const y = element.y - height;
          
          const handles = [
            { id: 'tl', x: x, y: y },
            { id: 'tr', x: x + width, y: y },
            { id: 'bl', x: x, y: y + height },
            { id: 'br', x: x + width, y: y + height },
          ];
          return handles;
        }
      }
    }
    
    if (element.x === undefined || element.y === undefined || element.width === undefined || element.height === undefined) return [];
    
    const handles = [
      { id: 'tl', x: element.x, y: element.y },
      { id: 'tr', x: element.x + element.width, y: element.y },
      { id: 'bl', x: element.x, y: element.y + element.height },
      { id: 'br', x: element.x + element.width, y: element.y + element.height },
      { id: 'tm', x: element.x + element.width / 2, y: element.y },
      { id: 'bm', x: element.x + element.width / 2, y: element.y + element.height },
      { id: 'ml', x: element.x, y: element.y + element.height / 2 },
      { id: 'mr', x: element.x + element.width, y: element.y + element.height / 2 },
    ];
    
    return handles;
  }, []);

  // Check if point is on resize handle
  const getHandleAtPoint = useCallback((point: Point, element: DrawingElement): string | null => {
    const handles = getResizeHandles(element);
    const tolerance = 8; // handle size
    
    for (const handle of handles) {
      if (Math.abs(point.x - handle.x) <= tolerance && Math.abs(point.y - handle.y) <= tolerance) {
        return handle.id;
      }
    }
    return null;
  }, [getResizeHandles]);

  // Функция для расчета адаптивного размера canvas (D2.1)
  const calculateCanvasSize = useCallback(() => {
    if (typeof window === 'undefined') return { width: 800, height: 600 };
    
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Отступы для UI элементов - оптимизация для мобильных
    const toolbarHeight = isMobile ? 60 : 80; // компактная панель на мобильных  
    const sideMargin = isMobile ? 10 : 40;
    
    // Доступное пространство
    const availableWidth = viewportWidth - sideMargin * 2;
    const availableHeight = viewportHeight - toolbarHeight - 40; // 40px для кнопок закрытия
    
    // Минимальные размеры
    const minWidth = isMobile ? 280 : 600;
    const minHeight = isMobile ? 200 : 400;
    
    // Максимальные размеры
    const maxWidth = 1200;
    const maxHeight = 800;
    
    const width = Math.min(maxWidth, Math.max(minWidth, availableWidth));
    const height = Math.min(maxHeight, Math.max(minHeight, availableHeight));
    
    return { width, height };
  }, [isMobile]);

  // Обновление размера canvas при изменении экрана
  useEffect(() => {
    const updateCanvasSize = () => {
      const newSize = calculateCanvasSize();
      setCanvasSize(newSize);
    };
    
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    window.addEventListener('orientationchange', updateCanvasSize);
    
    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      window.removeEventListener('orientationchange', updateCanvasSize);
    };
  }, [calculateCanvasSize]);

  // Инициализация canvas с адаптивным размером
  useEffect(() => {
    if (!isOpen) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Устанавливаем адаптивный размер canvas
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;
    
    // Белый фон
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    redrawCanvas();
  }, [isOpen, canvasSize]); // Добавили canvasSize в зависимости

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Очищаем canvas
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Рисуем все элементы
    elements.forEach((element) => {
      ctx.strokeStyle = element.color;
      ctx.lineWidth = element.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      switch (element.type) {
        case 'brush':
          if (element.points && element.points.length > 1) {
            ctx.beginPath();
            ctx.moveTo(element.points[0].x, element.points[0].y);
            element.points.forEach(point => {
              ctx.lineTo(point.x, point.y);
            });
            ctx.stroke();
          }
          break;

        case 'rectangle':
          if (element.x !== undefined && element.y !== undefined && element.width && element.height) {
            ctx.beginPath();
            ctx.rect(element.x, element.y, element.width, element.height);
            ctx.stroke();
            
            // Выделение для выбранного элемента
            if (selectedElement === element.id) {
              ctx.strokeStyle = '#007AFF';
              ctx.lineWidth = 1;
              ctx.setLineDash([5, 5]);
              ctx.stroke();
              ctx.setLineDash([]);
            }
          }
          break;

        case 'circle':
          if (element.x !== undefined && element.y !== undefined && element.width && element.height) {
            const radius = Math.sqrt(element.width * element.width + element.height * element.height) / 2;
            ctx.beginPath();
            ctx.arc(element.x + element.width / 2, element.y + element.height / 2, radius, 0, 2 * Math.PI);
            ctx.stroke();
            
            if (selectedElement === element.id) {
              ctx.strokeStyle = '#007AFF';
              ctx.lineWidth = 1;
              ctx.setLineDash([5, 5]);
              ctx.stroke();
              ctx.setLineDash([]);
            }
          }
          break;

        case 'text':
          if (element.x !== undefined && element.y !== undefined && element.text) {
            ctx.fillStyle = element.color;
            ctx.font = `${element.strokeWidth * 8}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
            ctx.fillText(element.text, element.x, element.y);
            
            if (selectedElement === element.id) {
              const textMetrics = ctx.measureText(element.text);
              ctx.strokeStyle = '#007AFF';
              ctx.lineWidth = 1;
              ctx.setLineDash([5, 5]);
              ctx.strokeRect(element.x - 2, element.y - element.strokeWidth * 8, textMetrics.width + 4, element.strokeWidth * 8 + 4);
              ctx.setLineDash([]);
            }
          }
          break;

        case 'image':
          if (element.image && element.x !== undefined && element.y !== undefined && element.width !== undefined && element.height !== undefined) {
            // Use cached image or create new one
            let img = imageCache.current.get(element.image.src);
            if (!img) {
              img = new Image();
              img.src = element.image.src;
              imageCache.current.set(element.image.src, img);
              img.onload = () => redrawCanvas(); // Redraw when image loads
            }
            
            // Draw image if it's loaded
            if (img.complete && img.naturalWidth > 0) {
              ctx.drawImage(img, element.x as number, element.y as number, element.width as number, element.height as number);
            }
          }
          break;
      }
    });

    // Draw selection boxes and resize handles for all selected elements
    const selectedEl = elements.find(el => el.id === selectedElement);
    if (selectedEl) {
      const handles = getResizeHandles(selectedEl);
      
      // Draw selection box for non-brush elements
      if (selectedEl.type !== 'brush') {
        if (selectedEl.type === 'text' && selectedEl.text && selectedEl.x !== undefined && selectedEl.y !== undefined) {
          // Draw text selection box
          const canvas = canvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.font = `${selectedEl.strokeWidth * 8}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
              const textMetrics = ctx.measureText(selectedEl.text);
              ctx.strokeStyle = '#007AFF';
              ctx.lineWidth = 1;
              ctx.setLineDash([5, 5]);
              ctx.strokeRect(selectedEl.x - 2, selectedEl.y - selectedEl.strokeWidth * 8, textMetrics.width + 4, selectedEl.strokeWidth * 8 + 4);
              ctx.setLineDash([]);
            }
          }
        } else if (selectedEl.x !== undefined && selectedEl.y !== undefined && selectedEl.width !== undefined && selectedEl.height !== undefined) {
          // Draw regular selection box
          ctx.strokeStyle = '#007AFF';
          ctx.lineWidth = 1;
          ctx.setLineDash([5, 5]);
          ctx.strokeRect(selectedEl.x, selectedEl.y, selectedEl.width, selectedEl.height);
          ctx.setLineDash([]);
        }
      }
      
      // Draw resize handles
      handles.forEach(handle => {
        ctx.fillStyle = '#007AFF';
        ctx.fillRect(handle.x - 4, handle.y - 4, 8, 8);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.strokeRect(handle.x - 4, handle.y - 4, 8, 8);
      });
    }
  }, [elements, selectedElement, getResizeHandles]);

  // Перерисовываем canvas при изменении элементов
  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  const addToHistory = useCallback((newElements: DrawingElement[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...newElements]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const getCoords = useCallback((e: MouseEvent | TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    
    // Получаем клиентские координаты
    let clientX: number, clientY: number;
    if (e instanceof TouchEvent) {
      const touch = e.touches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    // Вычисляем относительные координаты
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    // Масштабируем координаты с учетом разности между CSS размерами и реальными размерами canvas
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return { 
      x: x * scaleX, 
      y: y * scaleY 
    };
  }, []);

  const findElementAtPoint = useCallback((point: Point): DrawingElement | null => {
    // Проверяем элементы в обратном порядке (последние нарисованные сверху)
    for (let i = elements.length - 1; i >= 0; i--) {
      const element = elements[i];
      
      if (element.type === 'rectangle' || element.type === 'circle' || element.type === 'image') {
        if (element.x !== undefined && element.y !== undefined && element.width && element.height) {
          if (point.x >= element.x && point.x <= element.x + element.width &&
              point.y >= element.y && point.y <= element.y + element.height) {
            return element;
          }
        }
      } else if (element.type === 'text') {
        if (element.x !== undefined && element.y !== undefined && element.text) {
          const canvas = canvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.font = `${element.strokeWidth * 8}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
              const textMetrics = ctx.measureText(element.text);
              if (point.x >= element.x && point.x <= element.x + textMetrics.width &&
                  point.y >= element.y - element.strokeWidth * 8 && point.y <= element.y) {
                return element;
              }
            }
          }
        }
      } else if (element.type === 'brush' && element.points) {
        // Check if point is near any part of the brush stroke
        const tolerance = Math.max(8, element.strokeWidth + 4);
        for (let j = 0; j < element.points.length; j++) {
          const brushPoint = element.points[j];
          const distance = Math.sqrt(
            Math.pow(point.x - brushPoint.x, 2) + Math.pow(point.y - brushPoint.y, 2)
          );
          if (distance <= tolerance) {
            return element;
          }
        }
      }
    }
    return null;
  }, [elements]);

  const getTouchDistance = useCallback((touches: TouchList): number => {
    const touch1 = touches[0];
    const touch2 = touches[1];
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  const getTouchCenter = useCallback((touches: TouchList): Point => {
    const touch1 = touches[0];
    const touch2 = touches[1];
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const cx = (touch1.clientX + touch2.clientX) / 2 - rect.left;
    const cy = (touch1.clientY + touch2.clientY) / 2 - rect.top;
    
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return { x: cx * scaleX, y: cy * scaleY };
  }, []);

  const startDrawing = useCallback((e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    const pos = getCoords(e);
    
    // D7. Handle two-finger pinch start
    if (e instanceof TouchEvent && e.touches.length === 2) {
      const distance = getTouchDistance(e.touches);
      const center = getTouchCenter(e.touches);
      const element = findElementAtPoint(center);
      if (element) {
        setPinchStart({ distance, center });
        setSelectedElement(element.id);
        setInitialElementState(JSON.parse(JSON.stringify(element)));
        return;
      }
    }
    
    setIsDrawing(true);
    setDragStart(pos);

    if (tool === 'move') {
      const element = findElementAtPoint(pos);
      if (element) {
        // Check if clicking on resize handle
        const handle = getHandleAtPoint(pos, element);
        if (handle) {
          setIsResizing(true);
          setResizeHandle(handle);
          setInitialElementState(JSON.parse(JSON.stringify(element)));
          setSelectedElement(element.id);
          return;
        }
        
        setSelectedElement(element.id);
      } else {
        setSelectedElement(null);
      }
      return;
    }

    if (tool === 'text') {
      setTextPosition(pos);
      return;
    }

    const newElement: DrawingElement = {
      id: Date.now().toString(),
      type: tool === 'eraser' ? 'brush' : tool,
      color: tool === 'eraser' ? '#FFFFFF' : color,
      strokeWidth: tool === 'eraser' ? strokeWidth * 2 : strokeWidth,
    };

    if (tool === 'brush' || tool === 'eraser') {
      newElement.points = [pos];
    } else {
      newElement.x = pos.x;
      newElement.y = pos.y;
      newElement.width = 0;
      newElement.height = 0;
    }

    setElements(prev => [...prev, newElement]);
  }, [tool, color, strokeWidth, getCoords, findElementAtPoint, getHandleAtPoint, getTouchDistance, getTouchCenter]);

  const draw = useCallback((e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    if (!isDrawing || !dragStart) return;

    const pos = getCoords(e);

    if (tool === 'move' && selectedElement) {
      const dx = pos.x - dragStart.x;
      const dy = pos.y - dragStart.y;
      
      setElements(prev => prev.map(el => {
        if (el.id === selectedElement) {
          return {
            ...el,
            x: (el.x || 0) + dx,
            y: (el.y || 0) + dy,
            points: el.points?.map(p => ({ x: p.x + dx, y: p.y + dy }))
          };
        }
        return el;
      }));
      
      setDragStart(pos);
      return;
    }

    // Handle resizing
    if (isResizing && resizeHandle && selectedElement && initialElementState) {
      const dx = pos.x - dragStart.x;
      const dy = pos.y - dragStart.y;
      
      setElements(prev => prev.map(el => {
        if (el.id === selectedElement) {
          const newEl = { ...el };
          const initial = initialElementState;
          
          // Handle text resizing (change font size)
          if (el.type === 'text') {
            const scaleFactor = Math.max(0.1, 1 + (dx + dy) / 100);
            newEl.strokeWidth = Math.max(1, (initial.strokeWidth || 1) * scaleFactor);
            return newEl;
          }
          
          // Calculate new dimensions based on handle
          let newWidth = initial.width || 0;
          let newHeight = initial.height || 0;
          let newX = initial.x || 0;
          let newY = initial.y || 0;
          
          switch (resizeHandle) {
            case 'br': // bottom-right
              newWidth = (initial.width || 0) + dx;
              newHeight = (initial.height || 0) + dy;
              break;
            case 'tr': // top-right
              newWidth = (initial.width || 0) + dx;
              newHeight = (initial.height || 0) - dy;
              newY = (initial.y || 0) + dy;
              break;
            case 'bl': // bottom-left
              newWidth = (initial.width || 0) - dx;
              newHeight = (initial.height || 0) + dy;
              newX = (initial.x || 0) + dx;
              break;
            case 'tl': // top-left
              newWidth = (initial.width || 0) - dx;
              newHeight = (initial.height || 0) - dy;
              newX = (initial.x || 0) + dx;
              newY = (initial.y || 0) + dy;
              break;
          }
          
          // Maintain aspect ratio for circles or when Shift is pressed
          if (isShiftPressed || el.type === 'circle') {
            const ratio = (initial.width || 1) / (initial.height || 1);
            if (Math.abs(dx) > Math.abs(dy)) {
              newHeight = newWidth / ratio;
            } else {
              newWidth = newHeight * ratio;
            }
          }
          
          // Prevent negative dimensions
          newWidth = Math.max(10, newWidth);
          newHeight = Math.max(10, newHeight);
          
          newEl.width = newWidth;
          newEl.height = newHeight;
          newEl.x = newX;
          newEl.y = newY;
          
          return newEl;
        }
        return el;
      }));
      return;
    }

    setElements(prev => {
      const newElements = [...prev];
      const lastElement = newElements[newElements.length - 1];

      if (tool === 'brush' || tool === 'eraser') {
        if (lastElement.points) {
          lastElement.points.push(pos);
        }
      } else {
        lastElement.width = pos.x - (lastElement.x || 0);
        lastElement.height = pos.y - (lastElement.y || 0);
      }

      return newElements;
    });
  }, [isDrawing, dragStart, tool, selectedElement, getCoords, isResizing, resizeHandle, initialElementState, isShiftPressed, pinchStart, getTouchDistance]);

  const stopDrawing = useCallback(() => {
    if (isDrawing) {
      addToHistory(elements);
    }
    setIsDrawing(false);
    setDragStart(null);
    setIsResizing(false);
    setResizeHandle(null);
    setInitialElementState(null);
    setPinchStart(null);
  }, [isDrawing, elements, addToHistory]);

  const handleTextSubmit = useCallback(() => {
    if (textInput.trim() && textPosition) {
      const newElement: DrawingElement = {
        id: Date.now().toString(),
        type: 'text',
        x: textPosition.x,
        y: textPosition.y,
        text: textInput.trim(),
        color: color,
        strokeWidth: strokeWidth,
      };

      const newElements = [...elements, newElement];
      setElements(newElements);
      addToHistory(newElements);
      setTextInput('');
      setTextPosition(null);
    }
  }, [textInput, textPosition, color, strokeWidth, elements, addToHistory]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setElements(history[historyIndex - 1]);
    }
  }, [historyIndex, history]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setElements(history[historyIndex + 1]);
    }
  }, [historyIndex, history]);

  const clear = useCallback(() => {
    setElements([]);
    addToHistory([]);
    setSelectedElement(null);
  }, [addToHistory]);

  const saveDrawing = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Конвертируем canvas в PNG
    const imageData = canvas.toDataURL('image/png');
    onSave(imageData);
    onClose();
  }, [onSave, onClose]);

  if (!isOpen) return null;

  const drawingCanvasContent = (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999] p-4">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-6xl h-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Drawing Canvas</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Toolbar - профессиональная мобильная версия */}
        {isMobile ? (
          /* Мобильная версия - компактная горизонтальная панель */
          <div className="flex items-center justify-between gap-2 p-2 border-b border-border bg-muted/30">
            {/* Основные инструменты */}
            <div className="flex items-center gap-1">
              {[
                { tool: 'brush', icon: Brush },
                { tool: 'eraser', icon: Eraser },
                { tool: 'rectangle', icon: Square },
                { tool: 'circle', icon: Circle },
              ].map(({ tool: toolName, icon: Icon }) => (
                <Button
                  key={toolName}
                  variant={tool === toolName ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setTool(toolName as any)}
                  className="w-8 h-8 p-0"
                >
                  <Icon className="w-4 h-4" />
                </Button>
              ))}
            </div>

            {/* Цвет и толщина */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowColorPalette(!showColorPalette)}
                className="w-8 h-8 p-0"
              >
                <div 
                  className="w-4 h-4 rounded border border-border"
                  style={{ backgroundColor: color }}
                />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowStrokeWidth(!showStrokeWidth)}
                className="w-8 h-8 p-0"
              >
                <div 
                  className="rounded-full bg-current"
                  style={{ 
                    width: `${Math.max(2, strokeWidth)}px`, 
                    height: `${Math.max(2, strokeWidth)}px` 
                  }}
                />
              </Button>
            </div>

            {/* Действия */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={undo}
                disabled={historyIndex <= 0}
                className="w-8 h-8 p-0"
              >
                <Undo className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMobileTools(!showMobileTools)}
                className="w-8 h-8 p-0"
              >
                <span className="text-xs">⋯</span>
              </Button>
            </div>
          </div>
        ) : (
          /* Десктопная версия - оригинальная панель */
          <div className="flex items-center gap-2 p-4 border-b border-border flex-wrap">
            {/* Tools */}
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              {[
                { tool: 'brush', icon: Brush, label: 'Brush' },
                { tool: 'rectangle', icon: Square, label: 'Rectangle' },
                { tool: 'circle', icon: Circle, label: 'Circle' },
                { tool: 'text', icon: Type, label: 'Text' },
                { tool: 'eraser', icon: Eraser, label: 'Eraser' },
                { tool: 'move', icon: Move, label: 'Move' },
              ].map(({ tool: toolName, icon: Icon, label }) => (
                <Button
                  key={toolName}
                  variant={tool === toolName ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setTool(toolName as any)}
                  title={label}
                >
                  <Icon className="w-4 h-4" />
                </Button>
              ))}

              {/* Insert Image Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                title="Insert Image"
              >
                <ImageIcon className="w-4 h-4" />
              </Button>
            </div>

            {/* Color Palette */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowColorPalette(!showColorPalette)}
                className="flex items-center gap-2"
              >
                <Palette className="w-4 h-4" />
                <div 
                  className="w-4 h-4 rounded border border-border"
                  style={{ backgroundColor: color }}
                />
              </Button>
              {showColorPalette && (
                <div className="absolute top-full left-0 mt-1 bg-background border border-border rounded-lg p-2 shadow-lg z-10">
                  <div className="grid grid-cols-5 gap-1">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        className={cn(
                          "w-6 h-6 rounded border-2 hover:scale-110 transition-transform",
                          color === c ? "border-primary" : "border-border"
                        )}
                        style={{ backgroundColor: c }}
                        onClick={() => {
                          setColor(c);
                          setShowColorPalette(false);
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Stroke Width */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowStrokeWidth(!showStrokeWidth)}
                className="flex items-center gap-2"
              >
                <div 
                  className="rounded-full bg-current"
                  style={{ 
                    width: `${Math.max(2, strokeWidth)}px`, 
                    height: `${Math.max(2, strokeWidth)}px` 
                  }}
                />
                <span className="text-xs">{strokeWidth}px</span>
              </Button>
              {showStrokeWidth && (
                <div className="absolute top-full left-0 mt-1 bg-background border border-border rounded-lg p-2 shadow-lg z-10">
                  <div className="flex flex-col gap-1">
                    {STROKE_WIDTHS.map((width) => (
                      <button
                        key={width}
                        className={cn(
                          "flex items-center gap-2 px-2 py-1 rounded hover:bg-accent",
                          strokeWidth === width && "bg-accent"
                        )}
                        onClick={() => {
                          setStrokeWidth(width);
                          setShowStrokeWidth(false);
                        }}
                      >
                        <div 
                          className="rounded-full bg-current"
                          style={{ width: `${width}px`, height: `${width}px` }}
                        />
                        <span className="text-xs">{width}px</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="h-6 w-px bg-border mx-2" />

            {/* History */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={undo}
                disabled={historyIndex <= 0}
                title="Undo"
              >
                <Undo className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                title="Redo"
              >
                <Redo className="w-4 h-4" />
              </Button>
            </div>

            <div className="h-6 w-px bg-border mx-2" />

            {/* Actions */}
            <div className="flex items-center gap-1 ml-auto">
              <Button variant="ghost" size="sm" onClick={clear}>
                Clear
              </Button>
              <Button onClick={saveDrawing} size="sm">
                <Download className="w-4 h-4 mr-2" />
                Save
              </Button>
            </div>
          </div>
        )}

        {/* Расширенная мобильная панель инструментов */}
        {isMobile && showMobileTools && (
          <div className="border-b border-border bg-muted/50 p-3">
            <div className="flex flex-wrap gap-2 justify-center">
              {/* Дополнительные инструменты */}
              <Button
                variant={tool === 'text' ? "default" : "ghost"}
                size="sm"
                onClick={() => setTool('text')}
                className="w-auto px-3"
              >
                <Type className="w-4 h-4 mr-1" />
                Text
              </Button>
              <Button
                variant={tool === 'move' ? "default" : "ghost"}
                size="sm"
                onClick={() => setTool('move')}
                className="w-auto px-3"
              >
                <Move className="w-4 h-4 mr-1" />
                Move
              </Button>
              
              {/* История */}
              <Button
                variant="ghost"
                size="sm"
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                className="w-auto px-3"
              >
                <Redo className="w-4 h-4 mr-1" />
                Redo
              </Button>
              
              {/* Очистить */}
              <Button
                variant="ghost"
                size="sm"
                onClick={clear}
                className="w-auto px-3"
              >
                Clear
              </Button>
              
              {/* Сохранить */}
              <Button
                onClick={saveDrawing}
                size="sm"
                className="w-auto px-3"
                variant="default"
              >
                <Download className="w-4 h-4 mr-1" />
                Save
              </Button>

              {/* Вставить изображение */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="w-auto px-3"
              >
                <ImageIcon className="w-4 h-4 mr-1" />
                Image
              </Button>
            </div>
          </div>
        )}

        {/* Палитра цветов для мобильных */}
        {isMobile && showColorPalette && (
          <div className="border-b border-border bg-background p-3">
            <div className="grid grid-cols-8 gap-2 max-w-sm mx-auto">
              {COLORS.map((c) => (
                <button
                  key={c}
                  className={cn(
                    "w-10 h-10 rounded border-2 hover:scale-105 transition-transform",
                    color === c ? "border-primary border-4" : "border-border"
                  )}
                  style={{ backgroundColor: c }}
                  onClick={() => {
                    setColor(c);
                    setShowColorPalette(false);
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Толщина штриха для мобильных */}
        {isMobile && showStrokeWidth && (
          <div className="border-b border-border bg-background p-3">
            <div className="flex flex-wrap gap-2 justify-center">
              {STROKE_WIDTHS.map((width) => (
                <button
                  key={width}
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 rounded-lg border-2 hover:bg-accent transition-colors",
                    strokeWidth === width ? "border-primary bg-accent" : "border-border"
                  )}
                  onClick={() => {
                    setStrokeWidth(width);
                    setShowStrokeWidth(false);
                  }}
                >
                  <div 
                    className="rounded-full bg-current"
                    style={{ width: `${width}px`, height: `${width}px` }}
                  />
                  <span className="text-sm font-medium">{width}px</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Canvas Area */}
        <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={canvasSize.width}
              height={canvasSize.height}
              className="border border-border rounded-lg shadow-sm cursor-crosshair bg-white max-w-full max-h-full"
              style={{
                width: `${canvasSize.width}px`,
                height: `${canvasSize.height}px`,
                touchAction: 'none' // Предотвращаем скролл на мобильных при рисовании
              }}
              onMouseDown={(e) => startDrawing(e.nativeEvent)}
              onMouseMove={(e) => draw(e.nativeEvent)}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={(e) => startDrawing(e.nativeEvent)}
              onTouchMove={(e) => draw(e.nativeEvent)}
              onTouchEnd={stopDrawing}
            />
            
            {/* Hidden file input for image insertion */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileInputChange}
            />
            
            {/* Text Input Overlay */}
            {textPosition && (
              <div 
                className="absolute bg-background border border-border rounded px-2 py-1 shadow-lg"
                style={{ 
                  left: textPosition.x, 
                  top: textPosition.y - 40,
                  zIndex: 10 
                }}
              >
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleTextSubmit();
                    } else if (e.key === 'Escape') {
                      setTextPosition(null);
                      setTextInput('');
                    }
                  }}
                  placeholder="Enter text..."
                  className="text-sm bg-transparent border-none outline-none min-w-[100px]"
                  autoFocus
                />
                <div className="flex gap-1 mt-1">
                  <Button size="sm" variant="ghost" onClick={handleTextSubmit}>
                    ✓
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => {
                      setTextPosition(null);
                      setTextInput('');
                    }}
                  >
                    ✕
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Используем портал для рендера поверх всего приложения
  return typeof window !== 'undefined' 
    ? createPortal(drawingCanvasContent, document.body)
    : null;
} 