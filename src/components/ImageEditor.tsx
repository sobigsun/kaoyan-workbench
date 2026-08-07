import React, { useRef, useState, useEffect, useCallback } from 'react';

interface ImageEditorProps {
  imageSrc: string;
  onSave: (dataUrl: string) => void;
  onAskAI: (dataUrl: string) => void;
  onClose: () => void;
}

type Tool = 'brush' | 'eraser' | 'arrow' | 'rect' | 'text';

const COLORS = ['#ff0000', '#00ff00', '#0099ff', '#ffff00', '#ff00ff', '#000000', '#ffffff'];
const BRUSH_SIZES = [2, 4, 8, 16];

export default function ImageEditor({ imageSrc, onSave, onAskAI, onClose }: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<Tool>('brush');
  const [color, setColor] = useState('#ff0000');
  const [brushSize, setBrushSize] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [textInput, setTextInput] = useState('');
  const [textPos, setTextPos] = useState<{ x: number; y: number } | null>(null);
  const startPoint = useRef<{ x: number; y: number } | null>(null);
  const snapshotRef = useRef<ImageData | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showTextToolbar, setShowTextToolbar] = useState(false);

  // 加载图片到 canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const img = new Image();
    img.onload = () => {
      // 适配容器大小
      const maxWidth = container.clientWidth;
      const maxHeight = container.clientHeight;
      const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
      const w = img.width * scale;
      const h = img.height * scale;

      canvas.width = img.width;
      canvas.height = img.height;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';

      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      setImageLoaded(true);

      // 保存初始状态
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory([imageData]);
      setHistoryIndex(0);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  const getCanvasPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (tool === 'text') {
      const pos = getCanvasPos(e);
      setTextPos(pos);
      setTextInput('');
      setShowTextToolbar(true);
      return;
    }

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const pos = getCanvasPos(e);
    startPoint.current = pos;
    setIsDrawing(true);

    // 保存当前状态用于形状绘制
    snapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (tool === 'brush' || tool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = brushSize;

      if (tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = color;
      }
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !startPoint.current) return;
    e.preventDefault();

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const pos = getCanvasPos(e);

    if (tool === 'brush' || tool === 'eraser') {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (tool === 'arrow' || tool === 'rect') {
      // 恢复快照后重绘形状
      if (snapshotRef.current) {
        ctx.putImageData(snapshotRef.current, 0, 0);
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;

      if (tool === 'rect') {
        ctx.strokeRect(
          startPoint.current.x,
          startPoint.current.y,
          pos.x - startPoint.current.x,
          pos.y - startPoint.current.y
        );
      } else if (tool === 'arrow') {
        drawArrow(ctx, startPoint.current.x, startPoint.current.y, pos.x, pos.y);
      }
    }
  };

  const endDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    setIsDrawing(false);
    startPoint.current = null;
    snapshotRef.current = null;
    ctxGlobalReset();
    saveHistory();
  };

  const ctxGlobalReset = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.globalCompositeOperation = 'source-over';
  };

  const drawArrow = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) => {
    const headLen = Math.max(10, brushSize * 3);
    const angle = Math.atan2(y2 - y1, x2 - x1);

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
  };

  const saveHistory = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // 删除当前位置之后的历史
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(imageData);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(history[newIndex], 0, 0);
    setHistoryIndex(newIndex);
  };

  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(history[newIndex], 0, 0);
    setHistoryIndex(newIndex);
  };

  const clearAll = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // 重新加载原图
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      saveHistory();
    };
    img.src = imageSrc;
  };

  const addText = () => {
    if (!textInput.trim() || !textPos) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;

    // 根据画布缩放调整字体大小
    const fontSize = brushSize * 8;
    ctx.font = `${fontSize}px sans-serif`;
    ctx.fillStyle = color;
    ctx.textBaseline = 'top';
    ctx.fillText(textInput, textPos.x, textPos.y);

    setTextInput('');
    setTextPos(null);
    setShowTextToolbar(false);
    saveHistory();
  };

  const getDataUrl = (): string => {
    const canvas = canvasRef.current!;
    return canvas.toDataURL('image/png');
  };

  const tools: { key: Tool; label: string; icon: string }[] = [
    { key: 'brush', label: '画笔', icon: '✏️' },
    { key: 'eraser', label: '橡皮', icon: '🧹' },
    { key: 'arrow', label: '箭头', icon: '➤' },
    { key: 'rect', label: '方框', icon: '⬜' },
    { key: 'text', label: '文字', icon: '🔤' },
  ];

  if (!imageLoaded) {
    return (
      <div className="fixed inset-0 z-[70] bg-black flex items-center justify-center">
        <div className="text-white text-sm">加载中...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[70] bg-black flex flex-col">
      {/* 顶部工具栏 */}
      <div className="bg-gray-900 px-3 py-2 flex items-center gap-2 flex-wrap">
        {/* 关闭 */}
        <button
          onClick={onClose}
          className="text-white text-sm px-2 py-1 rounded-lg hover:bg-gray-700"
        >
          ✕
        </button>

        <div className="w-px h-6 bg-gray-700" />

        {/* 工具选择 */}
        {tools.map(t => (
          <button
            key={t.key}
            onClick={() => { setTool(t.key); setShowTextToolbar(false); }}
            className={`text-sm px-2.5 py-1.5 rounded-lg transition-colors ${
              tool === t.key ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}

        <div className="w-px h-6 bg-gray-700" />

        {/* 颜色选择 */}
        <div className="flex items-center gap-1">
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-6 h-6 rounded-full border-2 transition-transform ${
                color === c ? 'border-white scale-110' : 'border-gray-600'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        <div className="w-px h-6 bg-gray-700" />

        {/* 画笔大小 */}
        <div className="flex items-center gap-1">
          {BRUSH_SIZES.map(s => (
            <button
              key={s}
              onClick={() => setBrushSize(s)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                brushSize === s ? 'bg-blue-600' : 'hover:bg-gray-700'
              }`}
            >
              <div
                className="rounded-full"
                style={{
                  width: s + 'px',
                  height: s + 'px',
                  backgroundColor: brushSize === s ? '#fff' : '#aaa',
                }}
              />
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-gray-700" />

        {/* 撤销/重做 */}
        <button
          onClick={undo}
          disabled={historyIndex <= 0}
          className="text-gray-300 text-sm px-2 py-1 rounded-lg hover:bg-gray-700 disabled:opacity-30"
        >
          ↩ 撤销
        </button>
        <button
          onClick={redo}
          disabled={historyIndex >= history.length - 1}
          className="text-gray-300 text-sm px-2 py-1 rounded-lg hover:bg-gray-700 disabled:opacity-30"
        >
          ↪ 重做
        </button>
        <button
          onClick={clearAll}
          className="text-gray-300 text-sm px-2 py-1 rounded-lg hover:bg-gray-700"
        >
          清除
        </button>
      </div>

      {/* 文字输入工具栏 */}
      {showTextToolbar && (
        <div className="bg-gray-800 px-3 py-2 flex items-center gap-2">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="输入文字..."
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') addText(); }}
            className="flex-1 px-3 py-1.5 rounded-lg bg-gray-700 text-white text-sm focus:outline-none"
          />
          <button
            onClick={addText}
            className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm"
          >
            添加
          </button>
          <button
            onClick={() => { setShowTextToolbar(false); setTextPos(null); }}
            className="px-3 py-1.5 rounded-lg bg-gray-700 text-gray-300 text-sm"
          >
            取消
          </button>
        </div>
      )}

      {/* 画布区域 */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden flex items-center justify-center bg-gray-950"
      >
        <canvas
          ref={canvasRef}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
          className="touch-none"
          style={{ cursor: tool === 'text' ? 'text' : 'crosshair' }}
        />
      </div>

      {/* 底部操作栏 */}
      <div className="bg-gray-900 px-3 py-3 flex items-center justify-center gap-3">
        <button
          onClick={() => onSave(getDataUrl())}
          className="px-5 py-2.5 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-1.5"
        >
          💾 保存
        </button>
        <button
          onClick={() => onAskAI(getDataUrl())}
          className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-1.5"
        >
          🤖 问 AI
        </button>
      </div>
    </div>
  );
}
