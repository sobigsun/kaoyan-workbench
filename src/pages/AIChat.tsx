import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import {
  getAIConfig, sendChatMessage, processFile,
  getFileCategory, getFileSizeLimit, formatFileSize,
  ProcessedFile, FileCategory, PLATFORM_PRESETS
} from '../utils/aiService';

const CATEGORY_ICONS: Record<FileCategory, string> = {
  text: '📄',
  image: '🖼️',
  video: '🎬',
  'office-docx': '📝',
  'office-xlsx': '📊',
  'office-pptx': '📋',
  pdf: '📕',
  other: '📎',
};

const CATEGORY_LABELS: Record<FileCategory, string> = {
  text: '文本',
  image: '图片',
  video: '视频',
  'office-docx': 'Word',
  'office-xlsx': 'Excel',
  'office-pptx': 'PPT',
  pdf: 'PDF',
  other: '文件',
};

// dataURL 转 Blob
function dataURLtoBlob(dataURL: string): Blob {
  const [header, base64] = dataURL.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'image/png';
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    arr[i] = bytes.charCodeAt(i);
  }
  return new Blob([arr], { type: mime });
}

interface AIChatProps {
  pendingImage?: string | null;
  onImageConsumed?: () => void;
}

export default function AIChat({ pendingImage, onImageConsumed }: AIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingFiles, setPendingFiles] = useState<ProcessedFile[]>([]);
  const [fileError, setFileError] = useState('');
  const [processing, setProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const config = getAIConfig();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // 接收截图传入的图片
  useEffect(() => {
    if (pendingImage) {
      const processed: ProcessedFile = {
        file: new File([dataURLtoBlob(pendingImage)], `screenshot-${Date.now()}.png`, { type: 'image/png' }),
        category: 'image',
        content: pendingImage,
        name: `截图-${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}.png`,
        size: Math.round(pendingImage.length * 0.75),
        mimeType: 'image/png',
      };
      setPendingFiles(prev => [...prev, processed]);
      onImageConsumed?.();
    }
  }, [pendingImage]);

  // 未配置时显示提示
  if (!config) {
    return (
      <div className="px-4 py-8 text-center">
        <div className="text-4xl mb-3">🤖</div>
        <h3 className="text-base font-semibold text-gray-800 mb-2">AI 助手未配置</h3>
        <p className="text-sm text-gray-500 mb-4">
          请先在「我的 → AI 助手配置」中设置 API 信息
        </p>
        <div className="bg-blue-50 rounded-xl p-3 text-left max-w-sm mx-auto">
          <p className="text-xs text-blue-600 leading-relaxed">
            1. 进入「我的」页面<br/>
            2. 找到「AI 助手配置」<br/>
            3. 选择平台并填写 API Key<br/>
            4. 测试连接并保存
          </p>
        </div>
      </div>
    );
  }

  const preset = PLATFORM_PRESETS[config.platform];
  const supportsMultimodal = preset?.supportsMultimodal ?? false;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setFileError('');
    setProcessing(true);

    for (const file of Array.from(files)) {
      const category = getFileCategory(file.name);
      const sizeLimit = getFileSizeLimit(category);

      if (file.size > sizeLimit) {
        setFileError(`${CATEGORY_LABELS[category]}文件 "${file.name}" 超过 ${formatFileSize(sizeLimit)} 限制`);
        continue;
      }

      try {
        const processed = await processFile(file);
        setPendingFiles(prev => [...prev, processed]);
      } catch {
        setFileError(`文件 "${file.name}" 处理失败`);
      }
    }

    setProcessing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if ((!input.trim() && pendingFiles.length === 0) || loading) return;

    const userContent = input.trim() || '请分析以下文件内容';
    const attachmentMeta = pendingFiles.map(f => ({
      name: f.name,
      type: f.mimeType,
      size: f.size,
    }));

    const userMsg: ChatMessage = {
      role: 'user',
      content: userContent,
      timestamp: Date.now(),
      attachments: attachmentMeta.length > 0 ? attachmentMeta : undefined,
    };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setError('');

    try {
      // 构建文件映射
      const filesMap: Record<number, ProcessedFile[]> = {};
      if (pendingFiles.length > 0) {
        filesMap[newMessages.length - 1] = pendingFiles;
      }
      const reply = await sendChatMessage(config, newMessages, filesMap);
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: reply,
        timestamp: Date.now(),
      };
      setMessages([...newMessages, assistantMsg]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
      setPendingFiles([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    setMessages([]);
    setError('');
    setPendingFiles([]);
  };

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
      {/* 顶部信息栏 */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">🤖 AI 考研助手</span>
          <span className="text-xs text-gray-400">
            {preset.label} · {config.model}
          </span>
          {!supportsMultimodal && (
            <span className="text-xs text-orange-400">（仅文本）</span>
          )}
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleClear}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            清空
          </button>
        )}
      </div>

      {/* 消息列表 */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-3 space-y-3"
      >
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="text-3xl mb-2">📚</div>
            <p className="text-sm text-gray-400">向 AI 助手提问考研相关问题吧</p>
            <div className="mt-4 space-y-2 max-w-sm mx-auto">
              {[
                '帮我解释一下什么是教育学原理',
                '英语长难句如何分析？',
                '马克思主义基本原理的核心是什么？',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="block w-full text-left text-xs text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-xl px-3 py-2 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
            <div className="mt-6 max-w-sm mx-auto bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 font-medium mb-1">📎 支持上传文件类型</p>
              <div className="text-xs text-gray-400 leading-relaxed">
                <p>📄 文本/代码：.txt .md .json .py .js 等</p>
                <p>🖼️ 图片：.png .jpg .jpeg .gif .webp .bmp</p>
                <p>🎬 视频：.mp4 .avi .mov .mkv .webm</p>
                <p>📝 Office：.docx .xlsx .pptx</p>
                <p>📕 PDF：.pdf</p>
                {!supportsMultimodal && (
                  <p className="text-orange-400 mt-1">当前平台不支持图片/视频，仅提取文本</p>
                )}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${
                msg.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 border border-gray-100'
              }`}
            >
              {/* 显示附件信息 */}
              {msg.attachments && msg.attachments.length > 0 && (
                <div className={`mb-2 flex flex-wrap gap-1.5 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                  {msg.attachments.map((att, j) => {
                    const cat = getFileCategory(att.name);
                    return (
                      <span
                        key={j}
                        className={`text-xs px-2 py-1 rounded-lg flex items-center gap-1 ${
                          msg.role === 'user'
                            ? 'bg-blue-400/30 text-blue-50'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        <span>{CATEGORY_ICONS[cat]}</span>
                        <span>{att.name}</span>
                        <span className="opacity-60">{formatFileSize(att.size)}</span>
                      </span>
                    );
                  })}
                </div>
              )}
              <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl px-3.5 py-2.5 border border-gray-100">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-600">
            请求失败：{error}
          </div>
        )}
      </div>

      {/* 待发送文件列表 */}
      {pendingFiles.length > 0 && (
        <div className="bg-blue-50 border-t border-blue-100 px-3 py-2">
          <div className="flex flex-wrap gap-1.5">
            {pendingFiles.map((pf, i) => {
              const cat = pf.category;
              return (
                <span
                  key={i}
                  className="text-xs px-2 py-1 rounded-lg bg-white border border-blue-200 text-blue-600 flex items-center gap-1.5"
                >
                  <span>{CATEGORY_ICONS[cat]}</span>
                  <span>{pf.name}</span>
                  <span className="text-gray-400">{formatFileSize(pf.size)}</span>
                  <button
                    onClick={() => removePendingFile(i)}
                    className="ml-0.5 text-gray-400 hover:text-red-500"
                  >
                    &times;
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* 文件处理中提示 */}
      {processing && (
        <div className="bg-blue-50 border-t border-blue-100 px-3 py-1.5 text-xs text-blue-600 flex items-center gap-2">
          <span className="w-3 h-3 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
          正在处理文件...
        </div>
      )}

      {/* 文件错误提示 */}
      {fileError && (
        <div className="bg-yellow-50 border-t border-yellow-200 px-3 py-1.5 text-xs text-yellow-600">
          {fileError}
        </div>
      )}

      {/* 输入栏 */}
      <div className="bg-white border-t border-gray-100 px-3 py-2 flex gap-2 items-end">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={loading || processing}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors disabled:opacity-40 flex-shrink-0"
          title="上传文件"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入问题..."
          rows={1}
          className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 focus:border-blue-500 focus:outline-none resize-none"
          style={{ maxHeight: '100px' }}
        />
        <button
          onClick={handleSend}
          disabled={(!input.trim() && pendingFiles.length === 0) || loading || processing}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
