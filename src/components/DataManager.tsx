import React, { useRef, useState } from 'react';
import { AppData } from '../types';
import { downloadJSON, exportData, importData } from '../utils/storage';

interface DataManagerProps {
  data: AppData;
  onImport: (data: AppData) => void;
  visible: boolean;
  onClose: () => void;
}

/** 异步安全地调用系统分享面板（优先），失败就 fallback 到 downloadJSON */
async function tryShareOrDownload(json: string, filename: string): Promise<'share' | 'download'> {
  try {
    // 方案 1：原生 Capacitor Share 插件（如果之前注入了全局）
    const globalAny = globalThis as any;
    if (globalAny.Capacitor?.Plugins?.Share) {
      const blob = new Blob([json], { type: 'application/json' });
      const file = new File([blob], filename, { type: 'application/json' });
      await globalAny.Capacitor.Plugins.Share.share({
        title: '考研工作台数据备份',
        text: filename,
        files: [file],
      });
      return 'share';
    }
  } catch { /* ignore, fallthrough */ }

  try {
    // 方案 2：Web 标准 navigator.share（安卓 Chrome/WebView 支持）
    if (navigator.share && globalThis.File) {
      const blob = new Blob([json], { type: 'application/json' });
      const file = new File([blob], filename, { type: 'application/json' });
      const data: any = {
        title: '考研工作台数据备份',
        text: filename,
      };
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        data.files = [file];
      }
      await navigator.share(data);
      return 'share';
    }
  } catch { /* ignore, fallthrough */ }

  // 方案 3：兜底 downloadJSON（WebView 下兼容性一般，但至少有路径）
  downloadJSON(undefined as any);  // no-op，下面手动做
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return 'download';
}

export default function DataManager({ data, onImport, visible, onClose }: DataManagerProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [showPastePanel, setShowPastePanel] = useState(false);
  const [pasteText, setPasteText] = useState('');

  if (!visible) return null;

  const showMsg = (msg: string, ms = 2000) => {
    setMessage(msg);
    window.setTimeout(() => setMessage(''), ms);
  };

  // ---------- 导出：分享/下载 ----------
  const handleExport = async () => {
    const filename = `kaoyan-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const json = exportData(data);
    const method = await tryShareOrDownload(json, filename);
    if (method === 'share') showMsg('已打开分享面板，请选择保存位置（如发给文件传输助手）');
    else showMsg('备份文件已开始下载，请到「下载」文件夹中查找');
  };

  // ---------- 导出：直接复制 JSON 到剪贴板（最可靠！） ----------
  const handleCopyToClipboard = async () => {
    try {
      const json = exportData(data);
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(json);
      } else {
        // 兼容旧版 WebView：临时 textarea
        const ta = document.createElement('textarea');
        ta.value = json;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      showMsg('✅ 备份已复制到剪贴板！粘贴到微信文件传输助手或任何地方保存即可', 3500);
    } catch (e) {
      showMsg('复制失败，请改用「导出数据备份」或手动复制下方文本');
    }
  };

  // ---------- 导入：选择文件 ----------
  const handleImport = () => {
    setShowPastePanel(false);
    fileRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      tryImportText(text, '文件导入成功!');
    };
    reader.readAsText(file);
  };

  // ---------- 导入：从粘贴/手动输入的文本 ----------
  const tryImportText = (text: string, successMsg: string) => {
    const imported = importData(text);
    if (imported) {
      onImport(imported);
      showMsg(successMsg, 1500);
      window.setTimeout(() => { setShowPastePanel(false); onClose(); }, 1200);
    } else {
      showMsg('数据格式不正确，导入失败，请检查内容是否完整');
    }
  };

  const handleReadClipboard = async () => {
    try {
      if (!navigator.clipboard?.readText) {
        showMsg('当前浏览器/WebView 不支持读取剪贴板，请手动粘贴');
        return;
      }
      const text = await navigator.clipboard.readText();
      if (!text || text.trim().length < 20) {
        showMsg('剪贴板为空或内容太短');
        return;
      }
      setPasteText(text);
      showMsg('已从剪贴板读取内容，确认无误后点击「开始导入」');
    } catch {
      showMsg('读取剪贴板失败，请长按文本框手动粘贴');
    }
  };

  const handlePasteImport = () => {
    const text = pasteText.trim();
    if (text.length < 20) { showMsg('粘贴内容为空'); return; }
    tryImportText(text, '从剪贴板导入成功!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-1">数据管理</h3>
        <p className="text-xs text-gray-400 mb-4">
          推荐优先用「复制剪贴板」发送到微信，100% 不丢；<br/>
          卸载旧版前务必确认备份已保存好。
        </p>

        {/* ======== 导出区 ======== */}
        <div className="mb-4">
          <div className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
            <span>📤</span> 备份我的数据
          </div>
          <div className="space-y-2">
            <button
              onClick={handleCopyToClipboard}
              className="w-full py-3 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 active:scale-[0.98] transition-all shadow-sm"
            >
              ⭐ 复制备份到剪贴板（推荐）
            </button>
            <button
              onClick={handleExport}
              className="w-full py-3 bg-primary-500 text-white rounded-xl text-sm font-medium hover:bg-primary-600 transition-colors"
            >
              📤 导出备份文件 / 分享到微信
            </button>
          </div>
          <details className="mt-2 text-[11px] text-gray-400 bg-gray-50 rounded-lg p-2">
            <summary className="cursor-pointer select-none font-medium text-gray-500">查看剪贴板备份怎么用？</summary>
            <ul className="list-disc pl-4 mt-1.5 space-y-0.5 leading-relaxed">
              <li>点上面「⭐复制备份到剪贴板」按钮</li>
              <li>打开微信 → 进入「文件传输助手」聊天 → 输入框长按 → 「粘贴」→ 发送</li>
              <li>等新装 APP 打开后，把那段消息里的文字**全选复制**</li>
              <li>在数据管理里点「📝从剪贴板/文本粘贴导入」→ 粘贴进去 → 「开始导入」</li>
            </ul>
          </details>
        </div>

        {/* ======== 导入区 ======== */}
        <div>
          <div className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
            <span>📥</span> 恢复我的数据
          </div>
          <div className="space-y-2">
            <button
              onClick={() => { setShowPastePanel(false); handleImport(); }}
              className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              📄 选择 .json 文件导入
            </button>
            <button
              onClick={() => setShowPastePanel(s => !s)}
              className="w-full py-3 border border-dashed border-gray-300 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              {showPastePanel ? '收起粘贴面板' : '📝 从剪贴板 / 文本粘贴导入'}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json,text/plain"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* 粘贴文本面板 */}
          {showPastePanel && (
            <div className="mt-3 space-y-2 animate-in fade-in">
              <div className="flex gap-2">
                <button
                  onClick={handleReadClipboard}
                  className="flex-1 py-2 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-medium"
                >
                  📋 一键读取剪贴板
                </button>
                <button
                  onClick={() => setPasteText('')}
                  className="px-3 py-2 text-xs bg-gray-50 text-gray-500 rounded-lg hover:bg-gray-100 font-medium"
                >
                  清空
                </button>
              </div>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={`在此粘贴备份 JSON 内容（先在微信里复制消息，再在这里长按→粘贴）\n\n正确格式开头：{"plans":...`}
                rows={7}
                className="w-full p-3 border border-gray-200 rounded-lg text-xs font-mono resize-none focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-300"
                spellCheck={false}
              />
              <div className="text-[11px] text-gray-400">
                已输入：{pasteText.length} 字（正常备份约 1000~几万字）
              </div>
              <button
                onClick={handlePasteImport}
                disabled={!pasteText.trim()}
                className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  pasteText.trim()
                    ? 'bg-green-500 text-white hover:bg-green-600 active:scale-[0.98] shadow-sm'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                ✅ 确认无误，开始导入
              </button>
            </div>
          )}
        </div>

        {message && (
          <div className={`mt-3 p-2.5 rounded-lg text-sm text-center leading-relaxed ${
            message.includes('成功') || message.includes('✅') || message.includes('读取')
              ? 'bg-green-50 text-green-700'
              : message.includes('失败') || message.includes('不正确') || message.includes('为空')
                ? 'bg-red-50 text-red-600'
                : 'bg-amber-50 text-amber-700'
          }`}>
            {message}
          </div>
        )}

        <div className="mt-5 text-xs text-gray-400 text-center leading-relaxed">
          备份包含：所有计划、学习时长、番茄钟、金币、昵称头像、学科配置<br/>
          建议定期备份，卸载 APP 前务必先导出！
        </div>
      </div>
    </div>
  );
}
