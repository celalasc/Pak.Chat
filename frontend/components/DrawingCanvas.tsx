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
  Palette
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Point {
  x: number;
  y: number;
}

interface DrawingElement {
  id: string;
  type: 'brush' | 'rectangle' | 'circle' | 'text';
  points?: Point[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  text?: string;
  color: string;
  strokeWidth: number;
  isDragging?: boolean;
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

  // Инициализация canvas
  useEffect(() => {
    if (!isOpen) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Устанавливаем размер canvas
    canvas.width = 800;
    canvas.height = 600;
    
    // Белый фон
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    redrawCanvas();
  }, [isOpen]);

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
      }
    });
  }, [elements, selectedElement]);

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

  const getMousePos = useCallback((e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }, []);

  const findElementAtPoint = useCallback((point: Point): DrawingElement | null => {
    // Проверяем элементы в обратном порядке (последние нарисованные сверху)
    for (let i = elements.length - 1; i >= 0; i--) {
      const element = elements[i];
      
      if (element.type === 'rectangle' || element.type === 'circle') {
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
      }
    }
    return null;
  }, [elements]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);
    setIsDrawing(true);
    setDragStart(pos);

    if (tool === 'move') {
      const element = findElementAtPoint(pos);
      if (element) {
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
  }, [tool, color, strokeWidth, getMousePos, findElementAtPoint]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !dragStart) return;

    const pos = getMousePos(e);

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
  }, [isDrawing, dragStart, tool, selectedElement, getMousePos]);

  const handleMouseUp = useCallback(() => {
    if (isDrawing) {
      addToHistory(elements);
    }
    setIsDrawing(false);
    setDragStart(null);
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

        {/* Toolbar */}
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

        {/* Canvas Area */}
        <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
          <div className="relative">
            <canvas
              ref={canvasRef}
              className="border border-border rounded-lg shadow-sm cursor-crosshair bg-white"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
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