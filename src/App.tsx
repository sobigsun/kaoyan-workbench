import React, { useState, useEffect, useCallback } from 'react';
import { AppData, ModuleType } from './types';
import { loadData, saveData, autoBackupIfNeeded } from './utils/storage';
import { sampleWords, sampleMemorizeItems, sampleNewsItems, sampleTemplates } from './data/defaults';
import Dashboard from './pages/Dashboard';
import English from './pages/English';
import Education from './pages/Education';
import Politics from './pages/Politics';
import MyPage from './pages/MyPage';
import AIChat from './pages/AIChat';
import AISettings from './pages/AISettings';
import ResourceHub from './pages/ResourceHub';
import StudyRecords from './pages/StudyRecords';
import Points from './pages/Points';
import DataManager from './components/DataManager';
import ScreenCapture from './components/ScreenCapture';
import { FloatingPoints } from './components/FloatingPoints';
import { SplashScreen } from './components/SplashScreen';
import { settleYesterdayIfNeeded } from './utils/pointsLogic';
import { fetchDailyTheme, applyDefaultTheme } from './utils/dailyTheme';
import { pickRandomQuote } from './utils/quotes';
import { expForCurrentLevel, MAX_LEVEL } from './utils/levelSystem';
import { HomeIcon, ChartIcon, CoinIcon, ChatIcon, BookIcon, UserIcon } from './components/Icons';

type PageKey = 'dashboard' | 'english' | 'education' | 'politics' | 'aichat' | 'mypage' | 'resources' | 'records' | 'points';

const tabs: { key: PageKey; label: string; icon: React.ReactNode }[] = [
  { key: 'dashboard', label: '首页', icon: <HomeIcon size={20} /> },
  { key: 'records', label: '学习记录', icon: <ChartIcon size={20} /> },
  { key: 'points', label: '金币', icon: <CoinIcon size={20} /> },
  { key: 'aichat', label: 'AI 助手', icon: <ChatIcon size={20} /> },
  { key: 'resources', label: '资源', icon: <BookIcon size={20} /> },
  { key: 'mypage', label: '我的', icon: <UserIcon size={20} /> },
];

// 主题色：模块加载时立即应用默认色占位（同步，脱离 React hooks）
// 再由 App 内的 useEffect 异步 fetch 当日颜色覆盖
try { applyDefaultTheme(); } catch { /* ignore */ }

export default function App() {
  const [data, setData] = useState<AppData>(() => {
    const saved = loadData();
    // 智能合并预置数据：保留用户已有条目和学习进度，只追加不存在的条目（按内容去重）
    const savedWords = new Set(saved.words.map((w) => w.word.toLowerCase()));
    saved.words = [...saved.words, ...sampleWords.filter((w) => !savedWords.has(w.word.toLowerCase()))];

    const savedMemTitles = new Set(saved.memorizeItems.map((m) => m.title));
    saved.memorizeItems = [
      ...saved.memorizeItems,
      ...sampleMemorizeItems.filter((m) => !savedMemTitles.has(m.title)),
    ];

    const savedNewsTitles = new Set(saved.newsItems.map((n) => n.title));
    saved.newsItems = [
      ...saved.newsItems,
      ...sampleNewsItems.filter((n) => !savedNewsTitles.has(n.title)),
    ];

    const savedTplTitles = new Set(saved.templates.map((t) => t.title));
    saved.templates = [
      ...saved.templates,
      ...sampleTemplates.filter((t) => !savedTplTitles.has(t.title)),
    ];
    return saved;
  });

  const [activeTab, setActiveTab] = useState<PageKey>('dashboard');
  const [showDataManager, setShowDataManager] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // ========== 每日励志语：每次打开会话随机选一条，会话内用 sessionStorage 保持稳定 ==========
  const [dailyQuote, setDailyQuote] = useState<string>(() => {
    try {
      const key = 'kaoyan_session_quote';
      const cached = sessionStorage.getItem(key);
      if (cached && cached.trim()) return cached;
      const q = pickRandomQuote();
      sessionStorage.setItem(key, q);
      return q;
    } catch {
      return pickRandomQuote();
    }
  });

  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; visible: boolean }>({
    x: 0, y: 0, visible: false,
  });

  // 截图状态
  const [showCapture, setShowCapture] = useState(false);
  const [pendingAIImage, setPendingAIImage] = useState<string | null>(null);

  // 启动页（每天首次进入显示）
  const todayStrKey = new Date().toISOString().slice(0, 10);
  const [showSplash, setShowSplash] = useState<boolean>(() => {
    try {
      const last = localStorage.getItem('splash_shown_date');
      return last !== todayStrKey;
    } catch {
      return true;
    }
  });
  const handleSplashStart = useCallback(() => {
    try {
      localStorage.setItem('splash_shown_date', todayStrKey);
    } catch {
      /* ignore */
    }
    setShowSplash(false);
  }, [todayStrKey]);

  // 自动保存
  useEffect(() => {
    saveData(data);
  }, [data]);

  // 启动时自动创建今日备份（每天一次，防数据丢失）
  useEffect(() => {
    autoBackupIfNeeded(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== 异步拉取当日主题色（有缓存时立即命中） =====
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await fetchDailyTheme();
      } catch {
        /* ignore，applyDefaultTheme 已保证可用 */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // 每日8点结算前一天学习时长奖励（应用启动时检查一次）
  useEffect(() => {
    const settled = settleYesterdayIfNeeded(data);
    if (settled !== data) {
      setData(settled);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 监听全局右键
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, visible: true });
    };
    const handleClick = () => {
      setContextMenu(prev => prev.visible ? { ...prev, visible: false } : prev);
    };
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('click', handleClick);
    };
  }, []);

  // 开始截图
  const startCapture = () => {
    setContextMenu({ ...contextMenu, visible: false });
    setShowCapture(true);
  };

  const handleSaveScreenshot = (dataUrl: string) => {
    const link = document.createElement('a');
    link.download = `screenshot-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
    setShowCapture(false);
  };

  const handleAskAI = (dataUrl: string) => {
    setPendingAIImage(dataUrl);
    setShowCapture(false);
    setActiveTab('aichat');
  };

  const handleUpdateData = useCallback((newData: AppData) => {
    setData(newData);
  }, []);

  const handleImport = useCallback((importedData: AppData) => {
    setData(importedData);
  }, []);

  const renderPage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard data={data} onUpdateData={handleUpdateData} dailyQuote={dailyQuote} />;
      case 'english':
        return <English data={data} onUpdateData={handleUpdateData} />;
      case 'education':
        return <Education data={data} onUpdateData={handleUpdateData} />;
      case 'politics':
        return <Politics data={data} onUpdateData={handleUpdateData} />;
      case 'aichat':
        return <AIChat pendingImage={pendingAIImage} onImageConsumed={() => setPendingAIImage(null)} />;
      case 'resources':
        return <ResourceHub />;
      case 'records':
        return <StudyRecords data={data} onUpdateData={handleUpdateData} />;
      case 'points':
        return <Points data={data} onUpdateData={handleUpdateData} />;
      case 'mypage':
        return <MyPage data={data} onImport={handleImport} onUpdateData={handleUpdateData} />;
      default:
        return <Dashboard data={data} onUpdateData={handleUpdateData} dailyQuote={dailyQuote} />;
    }
  };

  const handleMenuClick = (key: PageKey) => {
    setActiveTab(key);
    setMenuOpen(false);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-page)' }}>
      {/* 顶部导航：自身撑出安全区高度，防止与手机状态栏（电量/信号/刘海）重叠 */}
      <header
        className="sticky z-40 bg-white border-b border-gray-100"
        style={{
          top: 0,
          paddingTop: 'var(--safe-top, 0px)',
          boxSizing: 'border-box',
        }}
      >
        <div className="max-w-lg mx-auto px-4 h-12 flex items-center justify-between">
          {/* 桌面端：汉堡菜单 */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="hidden md:flex w-8 h-8 items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg width="20" height="16" viewBox="0 0 20 16" fill="none">
              <rect y="0" width="20" height="2" rx="1" fill={menuOpen ? 'rgb(var(--color-primary-600, 37 99 235))' : 'currentColor'} className="text-gray-700" />
              <rect y="7" width="20" height="2" rx="1" fill={menuOpen ? 'rgb(var(--color-primary-600, 37 99 235))' : 'currentColor'} className="text-gray-700" />
              <rect y="14" width="20" height="2" rx="1" fill={menuOpen ? 'rgb(var(--color-primary-600, 37 99 235))' : 'currentColor'} className="text-gray-700" />
            </svg>
          </button>
          {/* 移动端：截图按钮 */}
          <button
            onClick={startCapture}
            className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
            title="截图"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-gray-700">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2v11z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </button>
          <h1 className="text-base font-semibold text-gray-800">{tabs.find(t => t.key === activeTab)?.label || '考研工作台'}</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={startCapture}
              className="hidden md:flex w-8 h-8 items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
              title="截图"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-gray-700">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2v11z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </button>
            <button
              onClick={() => setShowDataManager(true)}
              className="text-xs text-gray-400 hover:text-primary-500 transition-colors"
            >
              数据
            </button>
          </div>
        </div>
      </header>

      {/* 右键菜单 */}
      {contextMenu.visible && (
        <div
          className="fixed z-[80] bg-white rounded-xl shadow-lg border border-gray-100 py-1 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={startCapture}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
          >
            <span>📸</span>
            <span>截图</span>
          </button>
        </div>
      )}

      {/* 截图组件 */}
      {showCapture && (
        <ScreenCapture
          onSave={handleSaveScreenshot}
          onAskAI={handleAskAI}
          onClose={() => setShowCapture(false)}
        />
      )}

      {/* 左侧菜单遮罩 */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 transition-opacity"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* 左侧菜单栏 */}
      <div
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="text-base font-semibold text-gray-800">考研工作台</span>
          <button
            onClick={() => setMenuOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 text-lg"
          >
            &times;
          </button>
        </div>

        {/* 用户资料区：头像 + 昵称 + 等级徽章 + 金币余额 */}
        <div
          className="border-b border-gray-100"
          style={{
            background:
              'linear-gradient(135deg, rgb(var(--color-primary-50, 239 246 255)) 0%, rgb(var(--color-primary-100, 219 234 254)) 100%)',
          }}
        >
          <div className="px-5 pt-3.5 flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full overflow-hidden shadow-inner flex items-center justify-center flex-shrink-0 relative"
              style={{
                border: '2px solid #fff',
                backgroundColor: 'rgb(var(--color-primary-200, 191 219 254))',
              }}
            >
              {data.userProfile?.avatarDataUrl ? (
                <img
                  src={data.userProfile.avatarDataUrl}
                  alt="头像"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl">😀</span>
              )}
              {/* 等级徽章（圆形小角标） */}
              <div
                className="absolute -right-1 -bottom-1 rounded-full text-[10px] font-semibold text-white px-1.5 py-0.5 shadow"
                style={{
                  backgroundColor: '#C0843E',
                  border: '1.5px solid #fff',
                  lineHeight: 1.2,
                }}
                title={`当前 Lv.${data.points?.level ?? 1}`}
              >
                Lv{data.points?.level ?? 1}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div
                className="text-sm font-semibold truncate"
                style={{ color: 'rgb(var(--color-primary-800, 30 64 175))' }}
              >
                {data.userProfile?.nickname?.trim() || '还没起昵称呢'}
              </div>
              <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1.5">
                <span>🪙</span>
                <span className="font-semibold tabular-nums">{data.points?.balance ?? 0}</span>
                <span className="text-gray-400">·</span>
                <span>成长中...</span>
              </div>
            </div>
          </div>
          {/* 经验进度条 */}
          <div className="px-5 pt-2 pb-3.5">
            <LevelProgressBar
              level={data.points?.level ?? 1}
              exp={data.points?.exp ?? 0}
              required={expForCurrentLevel(data.points?.level ?? 1)}
              totalExp={data.points?.totalExp ?? 0}
            />
          </div>
        </div>

        <div className="py-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleMenuClick(tab.key)}
              className={`w-full flex items-center gap-3 px-5 py-3.5 transition-colors ${
                activeTab === tab.key
                  ? 'bg-primary-50 text-primary-600 font-medium border-r-2 border-primary-500'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="flex-shrink-0">{tab.icon}</span>
              <span className="text-sm">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="absolute bottom-6 left-0 right-0 px-5 space-y-2">
          <button
            onClick={startCapture}
            className="w-full py-2.5 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <span>📸</span> 截图
          </button>
          <button
            onClick={() => { setShowDataManager(true); setMenuOpen(false); }}
            className="w-full py-2.5 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            数据管理
          </button>
        </div>
      </div>

      {/* 内容区 */}
      <main className="max-w-lg mx-auto px-3 pt-3 pb-20 md:pb-4">
        {renderPage()}
      </main>

      {/* 移动端底部导航栏 */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 mobile-nav">
        <div className="max-w-lg mx-auto flex items-center justify-around h-14">
          {tabs.filter(t => t.key !== 'resources').map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => handleMenuClick(tab.key)}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                  isActive ? 'text-primary-600' : 'text-gray-400'
                }`}
              >
                {tab.icon}
                <span className="text-[10px]">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* 全局漂浮金币/升级动画（监听 emitFloatPoints / emitLevelUp 事件） */}
      <FloatingPoints />

      {/* 启动页：每天首次进入显示 */}
      {showSplash && (
        <SplashScreen
          onStart={handleSplashStart}
          dailyQuote={dailyQuote}
          nickname={data.userProfile?.nickname}
          avatarDataUrl={data.userProfile?.avatarDataUrl}
        />
      )}

      {/* 数据管理弹窗 */}
      <DataManager
        data={data}
        onImport={handleImport}
        visible={showDataManager}
        onClose={() => setShowDataManager(false)}
      />
    </div>
  );
}

// ============ 公共组件：等级经验进度条（侧边栏、我的页、金币页通用） ============
interface LevelProgressBarProps {
  level: number;
  exp: number;
  required: number; // 当前等级升级所需总经验
  totalExp?: number;
}
function LevelProgressBar({ level, exp, required, totalExp }: LevelProgressBarProps) {
  const maxed = level >= MAX_LEVEL || required <= 0;
  const percent = maxed ? 100 : Math.max(0, Math.min(100, Math.round((exp / required) * 100)));
  return (
    <div className="w-full space-y-1">
      <div className="flex items-center justify-between text-[10px] text-gray-500 select-none">
        <span className="flex items-center gap-1 font-medium">
          <span className="text-amber-500">⭐</span>
          Lv.{level}
          {maxed ? <span className="text-amber-600 font-semibold">· 满级</span> : null}
        </span>
        {totalExp !== undefined && totalExp > 0 ? (
          <span className="tabular-nums">累计 {totalExp} EXP</span>
        ) : maxed ? null : (
          <span className="tabular-nums">
            {exp}/{required} EXP
          </span>
        )}
      </div>
      <div
        className="w-full h-1.5 rounded-full overflow-hidden"
        style={{ background: 'rgba(148,163,184,0.25)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${percent}%`,
            backgroundImage: maxed
              ? 'linear-gradient(90deg, var(--accent-btn) 0%, var(--accent-btn-2) 100%)'
              : 'linear-gradient(90deg,rgb(var(--color-primary-400, 96 165 250)) 0%,rgb(var(--color-primary-600, 37 99 235)) 100%)',
          }}
        />
      </div>
    </div>
  );
}
// ===== End LevelProgressBar =====

