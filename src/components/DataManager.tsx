import React, { useRef, useState } from 'react';
import { AppData } from '../types';
import { downloadJSON, importData } from '../utils/storage';

interface DataManagerProps {
  data: AppData;
  onImport: (data: AppData) => void;
  visible: boolean;
  onClose: () => void;
}

export default function DataManager({ data, onImport, visible, onClose }: DataManagerProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');

  if (!visible) return null;

  const handleExport = () => {
    downloadJSON(data);
    setMessage('数据导出成功!');
    setTimeout(() => setMessage(''), 2000);
  };

  const handleImport = () => {
    fileRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const imported = importData(text);
      if (imported) {
        onImport(imported);
        setMessage('数据导入成功!');
        setTimeout(() => { setMessage(''); onClose(); }, 1500);
      } else {
        setMessage('文件格式不正确，导入失败');
        setTimeout(() => setMessage(''), 2000);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 className="text-lg font-semibold mb-4">数据管理</h3>

        <div className="space-y-3">
          <button
            onClick={handleExport}
            className="w-full py-3 bg-primary-500 text-white rounded-xl text-sm font-medium hover:bg-primary-600 transition-colors"
          >
            导出数据备份
          </button>
          <button
            onClick={handleImport}
            className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            导入数据备份
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {message && (
          <div className={`mt-3 p-2 rounded-lg text-sm text-center ${
            message.includes('成功') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
          }`}>
            {message}
          </div>
        )}

        <div className="mt-4 text-xs text-gray-400 text-center">
          建议定期导出备份，防止数据丢失
        </div>
      </div>
    </div>
  );
}
