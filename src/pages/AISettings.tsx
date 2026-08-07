import React, { useState, useEffect } from 'react';
import { AIConfig } from '../types';
import { PLATFORM_PRESETS, getAIConfig, saveAIConfig, clearAIConfig, maskApiKey, testConnection } from '../utils/aiService';

export default function AISettings() {
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [platform, setPlatform] = useState<'deepseek' | 'kimi'>('deepseek');
  const [model, setModel] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const saved = getAIConfig();
    if (saved) {
      setConfig(saved);
      setPlatform(saved.platform);
      setModel(saved.model);
      setBaseUrl(saved.baseUrl);
      setApiKey(saved.apiKey);
    } else {
      // 初始化默认值
      const preset = PLATFORM_PRESETS['deepseek'];
      setModel(preset.defaultModel);
      setBaseUrl(preset.defaultBaseUrl);
    }
  }, []);

  const handlePlatformChange = (p: 'deepseek' | 'kimi') => {
    setPlatform(p);
    const preset = PLATFORM_PRESETS[p];
    setModel(preset.defaultModel);
    setBaseUrl(preset.defaultBaseUrl);
    setTestResult(null);
  };

  const handleSave = () => {
    if (!apiKey.trim()) {
      setTestResult({ success: false, message: '请先填写 API Key' });
      return;
    }
    const newConfig: AIConfig = { platform, model, baseUrl, apiKey: apiKey.trim() };
    saveAIConfig(newConfig);
    setConfig(newConfig);
    setSaved(true);
    setTestResult(null);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTest = async () => {
    if (!apiKey.trim()) {
      setTestResult({ success: false, message: '请先填写 API Key' });
      return;
    }
    setTesting(true);
    setTestResult(null);
    const testConfig: AIConfig = { platform, model, baseUrl, apiKey: apiKey.trim() };
    const result = await testConnection(testConfig);
    setTestResult(result);
    setTesting(false);
  };

  const handleClear = () => {
    clearAIConfig();
    setConfig(null);
    const preset = PLATFORM_PRESETS[platform];
    setModel(preset.defaultModel);
    setBaseUrl(preset.defaultBaseUrl);
    setApiKey('');
    setTestResult(null);
  };

  const preset = PLATFORM_PRESETS[platform];

  return (
    <div className="pb-4 space-y-4">
      {/* 标题和状态 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-semibold text-gray-800">AI 助手配置</h2>
          {config && (
            <span className="text-xs px-2 py-1 rounded-full bg-green-50 text-green-600 font-medium">
              已配置
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400">配置 AI 平台信息，用于考研问答助手</p>
      </div>

      {/* 使用说明 */}
      <div className="bg-blue-50 rounded-2xl border border-blue-100 p-4">
        <h3 className="text-sm font-semibold text-blue-700 mb-2">使用指南</h3>
        <div className="space-y-2 text-xs text-blue-600 leading-relaxed">
          <p><strong>第 1 步：</strong>选择下方 AI 平台（DeepSeek 或 Kimi）</p>
          <p><strong>第 2 步：</strong>点击"去创建 API Key"链接，登录平台后台创建密钥</p>
          <p><strong>第 3 步：</strong>复制 API Key，粘贴到下方输入框</p>
          <p><strong>第 4 步：</strong>选择模型，确认 API 地址无误</p>
          <p><strong>第 5 步：</strong>点击"测试连接"验证配置是否有效</p>
          <p><strong>第 6 步：</strong>测试成功后点击"保存配置"</p>
        </div>
      </div>

      {/* 平台选择 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
        <label className="text-sm font-semibold text-gray-700">1. 平台名称</label>
        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(PLATFORM_PRESETS) as Array<'deepseek' | 'kimi'>).map((key) => {
            const p = PLATFORM_PRESETS[key];
            return (
              <button
                key={key}
                onClick={() => handlePlatformChange(key)}
                className={`p-3 rounded-xl border-2 transition-all ${
                  platform === key
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="text-sm font-medium text-gray-800">{p.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">默认: {p.defaultModel}</div>
              </button>
            );
          })}
        </div>

        {/* 创建 API Key 链接 */}
        <div className="flex gap-2 pt-1">
          <a
            href={preset.apiKeyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center text-xs py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
          >
            去创建 API Key →
          </a>
          <a
            href={preset.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center text-xs py-2 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors"
          >
            查看官方文档 →
          </a>
        </div>
      </div>

      {/* 模型选择 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
        <label className="text-sm font-semibold text-gray-700">2. 模型名称</label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
        >
          {preset.modelOptions.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <p className="text-xs text-gray-400">
          {platform === 'deepseek'
            ? 'deepseek-chat 为通用对话模型，deepseek-reasoner 为推理增强模型'
            : 'kimi-k2.6 为最新模型，moonshot-v1 系列支持不同上下文长度'}
        </p>
      </div>

      {/* API 地址 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
        <label className="text-sm font-semibold text-gray-700">3. API 地址</label>
        <input
          type="text"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder={preset.defaultBaseUrl}
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
        />
        <p className="text-xs text-gray-400">
          {platform === 'deepseek'
            ? '默认地址: https://api.deepseek.com （无需修改）'
            : '默认地址: https://api.moonshot.cn/v1 （无需修改）'}
        </p>
      </div>

      {/* API Key */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-gray-700">4. API Key</label>
          {config && (
            <span className="text-xs text-gray-400">
              已保存: {maskApiKey(config.apiKey)}
            </span>
          )}
        </div>
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="粘贴你的 API Key（sk-... 开头）"
            className="w-full px-3 py-2.5 pr-12 rounded-xl border border-gray-200 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <button
            onClick={() => setShowKey(!showKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
          >
            {showKey ? '隐藏' : '显示'}
          </button>
        </div>
        <p className="text-xs text-gray-400">
          Key 仅保存在你的浏览器本地，不会上传到任何服务器
        </p>
      </div>

      {/* 操作按钮 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              saved
                ? 'bg-green-500 text-white'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {saved ? '已保存' : '保存配置'}
          </button>
          <button
            onClick={handleTest}
            disabled={testing}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {testing ? '测试中...' : '测试连接'}
          </button>
        </div>
        <button
          onClick={handleClear}
          className="w-full py-2.5 rounded-xl text-sm font-medium border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
        >
          清除配置
        </button>
      </div>

      {/* 测试结果 */}
      {testResult && (
        <div
          className={`rounded-2xl border p-4 ${
            testResult.success
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}
        >
          <div className="flex items-start gap-2">
            <span className="text-lg">
              {testResult.success ? '✅' : '❌'}
            </span>
            <div className="flex-1">
              <p className={`text-sm font-medium ${
                testResult.success ? 'text-green-700' : 'text-red-700'
              }`}>
                {testResult.success ? '连接成功' : '连接失败'}
              </p>
              <p className={`text-xs mt-1 ${
                testResult.success ? 'text-green-600' : 'text-red-600'
              }`}>
                {testResult.message}
              </p>
              {!testResult.success && (
                <div className="mt-2 text-xs text-gray-500 space-y-1">
                  <p>常见原因：</p>
                  <p>• API Key 无效或已过期 → 重新创建</p>
                  <p>• API 地址错误 → 恢复默认地址</p>
                  <p>• 网络无法访问该平台 → 检查网络</p>
                  <p>• 账户余额不足 → 充值后重试</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 安全提示 */}
      <div className="bg-yellow-50 rounded-2xl border border-yellow-200 p-4">
        <h3 className="text-sm font-semibold text-yellow-700 mb-2">安全提示</h3>
        <div className="space-y-1.5 text-xs text-yellow-600 leading-relaxed">
          <p>• API Key 保存在浏览器 localStorage 中，仅本设备可访问</p>
          <p>• 不要在公共电脑上保存 Key，使用后请清除配置</p>
          <p>• 如怀疑 Key 泄露，请立即在平台后台删除并重新创建</p>
          <p>• Key 仅发送给你选择的官方 API 地址，不上传其他服务</p>
        </div>
      </div>
    </div>
  );
}
