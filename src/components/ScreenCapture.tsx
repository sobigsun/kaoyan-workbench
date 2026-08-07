import React, { useRef, useState, useEffect, useCallback } from 'react';
import html2canvas from 'html2canvas';

type Tool = 'brush' | 'rect' | 'text' | null;

interface ScreenCaptureProps {
  onSave: (dataUrl: string) => void;
  onAskAI: (dataUrl: string) => void;
  onClose: () => void;
}

const COLORS = ['#ff0000', '#00cc44', '#0099ff', '#ffaa00', '#ff00ff', '#000000'];

export default function ScreenCapture({ onSave, onAskAI, onClose }: ScreenCaptureProps) {
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // 阶段: selecting → capturing → editing
  const [phase, setPhase] = useState<'selecting' | 'capturing' | 'editing'>('selecting');

  // 选区
  const [startPt, setStartPt] = useState<{ x: number; y: number } | null>(null);
  const [endPt, setEndPt] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  // 截图后的图片
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [selRect, setSelRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // 工具
  const [tool, setTool] = useState<Tool>(null);
  const [color, setColor] = useState('#ff0000');
  const [brushSize, setBrushSize] = useState(3);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textValue, setTextValue] = useState('');
  const [textPos, setTextPos] = useState<{ x: number; y: number } | null>(null);

  // 绘制
  const drawingRef = useRef(false);
  const drawStartRef = useRef<{ x: number; y: number } | null>(null);
  const snapshotRef = useRef<ImageData | null>(null);

  // === 框选阶段 ===
  const handleMouseDown = (e: React.MouseEvent) => {
    if (phase !== 'selecting') return;
    const x = e.clientX;
    const y = e.clientY;

    // 如果已有选区且点击在选区外 → 取消截图
    if (startPt && endPt) {
      const r = {
        x: Math.min(startPt.x, endPt.x),
        y: Math.min(startPt.y, endPt.y),
        w: Math.abs(endPt.x - startPt.x),
        h: Math.abs(endPt.y - startPt.y),
      };
      if (r.w > 10 && r.h > 10 &&
          !(x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h)) {
        onClose();
        return;
      }
    }

    setStartPt({ x, y });
    setEndPt({ x, y });
    setDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || phase !== 'selecting') return;
    setEndPt({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = async () => {
    if (!dragging || phase !== 'selecting') return;
    setDragging(false);

    if (!startPt || !endPt) return;
    const x = Math.min(startPt.x, endPt.x);
    const y = Math.min(startPt.y, endPt.y);
    const w = Math.abs(endPt.x - startPt.x);
    const h = Math.abs(endPt.y - startPt.y);

    if (w < 10 || h < 10) {
      setStartPt(null);
      setEndPt(null);
      return;
    }

    // 先清空选区状态，移除遮罩层，避免被截入截图
    setStartPt(null);
    setEndPt(null);
    setPhase('capturing');

    // 等待 React 完成 DOM 更新（遮罩元素移除后再截取）
    await new Promise(resolve => setTimeout(resolve, 60));

    // 用 html2canvas 只截取选区
    try {
      const canvas = await html2canvas(document.body, {
        backgroundColor: '#ffffff',
        scale: 1,
        useCORS: true,
        logging: false,
        x,
        y,
        width: w,
        height: h,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        onclone: (doc) => {
          // 隐藏截图组件自身的 UI 元素，避免被截入
          doc.querySelectorAll('[data-capture-ui]').forEach(el => {
            (el as HTMLElement).style.display = 'none';
          });
        },
      });

      const dataUrl = canvas.toDataURL('image/png');
      setScreenshot(dataUrl);
      setSelRect({ x, y, w, h });

      // 设置绘制 canvas
      const drawCanvas = drawCanvasRef.current;
      if (drawCanvas) {
        drawCanvas.width = w;
        drawCanvas.height = h;
      }

      setPhase('editing');
    } catch {
      setPhase('selecting');
      setStartPt(null);
      setEndPt(null);
    }
  };

  // 选区矩形
  const rect = startPt && endPt ? {
    x: Math.min(startPt.x, endPt.x),
    y: Math.min(startPt.y, endPt.y),
    w: Math.abs(endPt.x - startPt.x),
    h: Math.abs(endPt.y - startPt.y),
  } : null;

  // === 编辑阶段：绘制 ===
  const getDrawPos = (e: React.MouseEvent): { x: number; y: number } => {
    const canvas = drawCanvasRef.current!;
    const canvasRect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - canvasRect.left,
      y: e.clientY - canvasRect.top,
    };
  };

  const handleDrawDown = (e: React.MouseEvent) => {
    if (!tool || phase !== 'editing') return;
    e.preventDefault();
    e.stopPropagation();
    const pos = getDrawPos(e);
    const canvas = drawCanvasRef.current!;
    const ctx = canvas.getContext('2d')!;

    if (tool === 'text') {
      setTextPos(pos);
      setShowTextInput(true);
      setTextValue('');
      return;
    }

    drawingRef.current = true;
    drawStartRef.current = pos;
    snapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (tool === 'brush') {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = brushSize;
      ctx.strokeStyle = color;
    }
  };

  const handleDrawMove = (e: React.MouseEvent) => {
    if (!drawingRef.current || !drawStartRef.current) return;
    e.preventDefault();
    const pos = getDrawPos(e);
    const canvas = drawCanvasRef.current!;
    const ctx = canvas.getContext('2d')!;

    if (tool === 'brush') {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (tool === 'rect') {
      if (snapshotRef.current) ctx.putImageData(snapshotRef.current, 0, 0);
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
      ctx.strokeRect(drawStartRef.current.x, drawStartRef.current.y, pos.x - drawStartRef.current.x, pos.y - drawStartRef.current.y);
    }
  };

  const handleDrawUp = (e: React.MouseEvent) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    drawingRef.current = false;
    drawStartRef.current = null;
    snapshotRef.current = null;
  };

  const addText = () => {
    if (!textValue.trim() || !textPos) return;
    const canvas = drawCanvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const fontSize = brushSize * 6 + 12;
    ctx.font = `${fontSize}px sans-serif`;
    ctx.fillStyle = color;
    ctx.textBaseline = 'top';
    ctx.fillText(textValue, textPos.x, textPos.y);
    setTextValue('');
    setTextPos(null);
    setShowTextInput(false);
  };

  // 重新选区
  const reSelect = () => {
    setPhase('selecting');
    setScreenshot(null);
    setSelRect(null);
    setTool(null);
    setStartPt(null);
    setEndPt(null);
    const canvas = drawCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  // 导出
  const exportImage = (): string => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return '';
    return canvas.toDataURL('image/png');
  };

  // ESC 退出
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showTextInput) {
          setShowTextInput(false);
        } else if (phase === 'selecting') {
          onClose();
        } else if (phase === 'editing') {
          reSelect();
        }
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose, phase, showTextInput]);

  // === 渲染 ===

  // 截取中（无遮罩，避免被截入截图）
  if (phase === 'capturing') {
    return (
      <div data-capture-ui className="fixed inset-0 z-[90] flex items-center justify-center pointer-events-none">
        <div className="bg-white/90 rounded-xl px-4 py-2 flex items-center gap-2 shadow-lg">
          <span className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <span className="text-sm text-gray-600">正在生成截图...</span>
        </div>
      </div>
    );
  }

  // 框选阶段
  if (phase === 'selecting') {
    return (
      <div
        ref={overlayRef}
        className="fixed inset-0 z-[90] cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* 没有选区时全屏遮罩；有选区时靠 box-shadow 只遮罩选区外 */}
        {!rect && <div className="absolute inset-0 bg-black/35" />}

        {/* 选区虚框 */}
        {rect && rect.w > 0 && (
          <>
            {/* 虚线框：通过巨大 box-shadow 在选区外形成遮罩，选区内保持透明显示原本颜色 */}
            <div
              className="absolute border-2 border-dashed border-white"
              style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h, boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)' }}
            >
              <div className="absolute -top-1 -left-1 w-2 h-2 bg-white" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-white" />
              <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-white" />
              <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-white" />
            </div>

            {/* 尺寸 */}
            <div
              className="absolute bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded whitespace-nowrap"
              style={{ left: rect.x, top: rect.y - 22 }}
            >
              {Math.round(rect.w)} × {Math.round(rect.h)}
            </div>
          </>
        )}

        {/* 底部提示 */}
        {!dragging && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs px-4 py-2 rounded-full">
            拖动鼠标选择截图区域 · 点击选区外取消 · ESC 退出
          </div>
        )}
      </div>
    );
  }

  // 编辑阶段
  if (phase === 'editing' && screenshot && selRect) {
    return (
      <div className="fixed inset-0 z-[90] bg-black/50">
        {/* 截图 + 绘制 canvas */}
        <div
          className="absolute"
          style={{ left: selRect.x, top: selRect.y, width: selRect.w, height: selRect.h }}
        >
          <img
            src={screenshot}
            alt="screenshot"
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
          />
          <canvas
            ref={drawCanvasRef}
            className="absolute top-0 left-0 w-full h-full"
            style={{ pointerEvents: tool ? 'auto' : 'none', cursor: tool ? 'crosshair' : 'default' }}
            onMouseDown={handleDrawDown}
            onMouseMove={handleDrawMove}
            onMouseUp={handleDrawUp}
          />
        </div>

        {/* 工具栏（选区正下方居中） */}
        <div
          className="absolute z-10 flex items-center gap-1 bg-white rounded-lg shadow-lg border border-gray-200 px-1.5 py-1"
          style={{
            left: selRect.x + selRect.w / 2 - 120,
            top: selRect.y + selRect.h + 4,
          }}
        >
          {/* 画笔 */}
          <button
            onClick={() => { setTool(tool === 'brush' ? null : 'brush'); setShowTextInput(false); }}
            className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${tool === 'brush' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
            title="画笔"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 19l7-7 3 3-7 7-3-3z M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z M2 2l7.586 7.586" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="11" cy="11" r="2" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </button>

          {/* 方框 */}
          <button
            onClick={() => { setTool(tool === 'rect' ? null : 'rect'); setShowTextInput(false); }}
            className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${tool === 'rect' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
            title="方框"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </button>

          {/* 文字 */}
          <button
            onClick={() => setTool(tool === 'text' ? null : 'text')}
            className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${tool === 'text' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
            title="文字"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M4 7V4h16v3 M9 20h6 M12 4v16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* 颜色 */}
          <div className="w-px h-5 bg-gray-200 mx-0.5" />
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-5 h-5 rounded-full border transition-transform ${color === c ? 'border-gray-800 scale-110' : 'border-gray-300'}`}
              style={{ backgroundColor: c }}
            />
          ))}
          <div className="w-px h-5 bg-gray-200 mx-0.5" />

          {/* 保存 */}
          <button
            onClick={() => onSave(exportImage())}
            className="w-8 h-8 flex items-center justify-center rounded text-green-600 hover:bg-green-50 transition-colors"
            title="保存"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4 M7 10l5 5 5-5 M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* 问AI */}
          <button
            onClick={() => onAskAI(exportImage())}
            className="w-8 h-8 flex items-center justify-center rounded text-blue-600 hover:bg-blue-50 transition-colors"
            title="问AI"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 2a3 3 0 00-3 3v1a3 3 0 00-3 3v1a3 3 0 00-3 3 3 3 0 003 3v1a3 3 0 003 3 3 3 0 003-3 3 3 0 003 3 3 3 0 003-3v-1a3 3 0 003-3 3 3 0 00-3-3V6a3 3 0 00-3-3 3 3 0 00-3-3z" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="9" cy="10" r="1" fill="currentColor"/>
              <circle cx="15" cy="10" r="1" fill="currentColor"/>
            </svg>
          </button>

          <div className="w-px h-5 bg-gray-200 mx-0.5" />
          <button
            onClick={reSelect}
            className="w-8 h-8 flex items-center justify-center rounded text-gray-500 hover:bg-gray-100 transition-colors"
            title="重新框选"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M1 4v6h6 M23 20v-6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded text-red-500 hover:bg-red-50 transition-colors text-lg"
            title="退出"
          >
            ×
          </button>
        </div>

        {/* 粗细调节（选区上方） */}
        {tool && (
          <div
            className="absolute z-10 flex items-center gap-2 bg-white rounded-lg shadow-lg border border-gray-200 px-2 py-1"
            style={{ left: selRect.x, top: selRect.y - 36 }}
          >
            <span className="text-xs text-gray-400">{tool === 'text' ? '字号' : '粗细'}</span>
            {[2, 4, 6, 8].map(s => (
              <button
                key={s}
                onClick={() => setBrushSize(s)}
                className={`rounded-full transition-transform ${brushSize === s ? 'ring-2 ring-blue-400' : ''}`}
                style={{ width: s + 4, height: s + 4, backgroundColor: tool === 'brush' || tool === 'rect' ? color : '#666' }}
              />
            ))}
          </div>
        )}

        {/* 文字输入框 */}
        {showTextInput && textPos && (
          <div
            className="absolute z-20 bg-white rounded-lg shadow-lg border border-blue-300 p-1 flex items-center gap-1"
            style={{ left: selRect.x + textPos.x, top: selRect.y + textPos.y - 36 }}
          >
            <input
              type="text"
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              placeholder="输入文字..."
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') addText();
                if (e.key === 'Escape') { setShowTextInput(false); setTextPos(null); }
              }}
              className="w-32 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:border-blue-400"
            />
            <button onClick={addText} className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600">确定</button>
          </div>
        )}
      </div>
    );
  }

  return null;
}
