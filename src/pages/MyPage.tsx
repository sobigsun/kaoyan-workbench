import React, { useState, useEffect, useCallback, useRef } from 'react';
import DataManager from '../components/DataManager';
import { AppData, SubjectConfig } from '../types';
import { SUBJECT_COLORS, generateSubjectId, getSubjectHex } from '../utils/modules';
import AISettings from './AISettings';
import { expForCurrentLevel, MAX_LEVEL, levelUpRewardCoins } from '../utils/levelSystem';
import { getSyncConfig, saveSyncConfig, registerDevice, uploadData, downloadData, mergeData, SyncConfig, getBackupIndex, createBackup, restoreFromBackup, deleteBackup, autoBackupIfNeeded, BackupInfo } from '../utils/storage';

interface MyPageProps {
  data: AppData;
  onImport: (data: AppData) => void;
  onUpdateData?: (data: AppData) => void;
}

type Theme = 'sapphire' | 'moss' | 'classic' | 'hyacinth' | 'taro';

interface ThemeConfig {
  key: Theme;
  label: string;
  primary: string;
  accent: string;
  light: string;
  gradientFrom: string;
  gradientTo: string;
}

const themes: ThemeConfig[] = [
  {
    key: 'sapphire',
    label: '深宝蓝',
    primary: '#0E61AC',
    accent: '#FAF2E0',
    light: 'rgba(14,97,172,0.12)',
    gradientFrom: '#0E61AC',
    gradientTo: '#FAF2E0',
  },
  {
    key: 'moss',
    label: '苔藓绿',
    primary: '#4D613C',
    accent: '#F1BBC9',
    light: 'rgba(77,97,60,0.12)',
    gradientFrom: '#4D613C',
    gradientTo: '#F1BBC9',
  },
  {
    key: 'classic',
    label: '正红',
    primary: '#D30121',
    accent: '#BFDEFF',
    light: 'rgba(211,1,33,0.12)',
    gradientFrom: '#D30121',
    gradientTo: '#BFDEFF',
  },
  {
    key: 'hyacinth',
    label: '紫风信',
    primary: '#663486',
    accent: '#FED52D',
    light: 'rgba(102,52,134,0.12)',
    gradientFrom: '#663486',
    gradientTo: '#FED52D',
  },
  {
    key: 'taro',
    label: '香芋紫',
    primary: '#C98EFF',
    accent: '#0B0C10',
    light: 'rgba(201,142,255,0.12)',
    gradientFrom: '#C98EFF',
    gradientTo: '#0B0C10',
  },
];

const THEME_STORAGE_KEY = 'kaoyan_theme';

function getSavedTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved && themes.some(t => t.key === saved)) return saved as Theme;
  } catch {}
  return 'sapphire';
}

function applyTheme(theme: Theme) {
  const config = themes.find(t => t.key === theme);
  if (!config) return;
  const root = document.documentElement;

  root.classList.remove('dark');

  root.style.setProperty('--color-primary', config.primary);
  root.style.setProperty('--color-primary-light', config.light);
  root.style.setProperty('--color-accent', config.accent);
  root.style.setProperty('--gradient-from', config.gradientFrom);
  root.style.setProperty('--gradient-to', config.gradientTo);
}

// 把图片 File 读成 base64 dataURL（压尺寸+降质量，避免 localStorage 爆）
async function readImageFileAsDataUrl(file: File, maxSize = 256, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(fr.error);
    fr.onload = () => {
      const src = fr.result as string;
      const img = new Image();
      img.onerror = () => resolve(src); // 解码失败就原样返回
      img.onload = () => {
        try {
          // 等比缩放到 maxSize 内
          const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
          const w = Math.round(img.width * ratio);
          const h = Math.round(img.height * ratio);
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(src);
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch {
          resolve(src);
        }
      };
      img.src = src;
    };
    fr.readAsDataURL(file);
  });
}

export default function MyPage({ data, onImport, onUpdateData }: MyPageProps) {
  const [theme, setTheme] = useState<Theme>(getSavedTheme);
  const [showDataManager, setShowDataManager] = useState(false);
  const [showAISettings, setShowAISettings] = useState(false);

  // ===== 个人资料（昵称 + 头像） =====
  const [nicknameInput, setNicknameInput] = useState(data.userProfile?.nickname ?? '');
  const [avatarPreview, setAvatarPreview] = useState(data.userProfile?.avatarDataUrl ?? '');
  const [profileDirty, setProfileDirty] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);

  // ===== 学科管理 =====
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectColor, setNewSubjectColor] = useState('blue');

  // ===== 数据同步 =====
  const [syncConfigState, setSyncConfigState] = useState<SyncConfig | null>(() => getSyncConfig());
  const [serverUrlInput, setServerUrlInput] = useState<string>(() => getSyncConfig()?.serverUrl ?? '');
  const [deviceNameInput, setDeviceNameInput] = useState<string>(() => getSyncConfig()?.deviceName ?? '');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error' | 'connecting'>('idle');
  const [syncMessage, setSyncMessage] = useState<string>('');
  const [deviceList, setDeviceList] = useState<Array<{ device_id: string; device_name: string | null; updated_at: number }>>([]);

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {}
  }, [theme]);

  const currentTheme = themes.find(t => t.key === theme)!;

  // ===== 保存个人资料（昵称 + 头像）=====
  const saveProfile = useCallback(() => {
    if (!onUpdateData) return;
    onUpdateData({
      ...data,
      userProfile: {
        nickname: nicknameInput.trim().slice(0, 20),
        avatarDataUrl: avatarPreview,
      },
    });
    setProfileDirty(false);
  }, [onUpdateData, data, nicknameInput, avatarPreview]);

  // 头像上传：读文件 → 压缩 → 预览
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // 允许重复选同一张图
    if (!file) return;
    if (!/^image\//.test(file.type)) return;
    try {
      setAvatarSaving(true);
      const dataUrl = await readImageFileAsDataUrl(file, 256, 0.82);
      setAvatarPreview(dataUrl);
      setProfileDirty(true);
    } finally {
      setAvatarSaving(false);
    }
  };

  const handleAvatarClear = () => {
    setAvatarPreview('');
    setProfileDirty(true);
  };

  // ===== 学科管理：添加 / 删除 =====
  const handleAddSubject = () => {
    const name = newSubjectName.trim();
    if (!name) return;
    const id = generateSubjectId(name);
    // 防止 ID 重复
    const existingIds = (data.subjects ?? []).map(s => s.id);
    const finalId = existingIds.includes(id) ? id + '_' + Date.now().toString(36).slice(-3) : id;
    const newSubject: SubjectConfig = { id: finalId, name: name.slice(0, 10), color: newSubjectColor };
    onUpdateData?.({ ...data, subjects: [...(data.subjects ?? []), newSubject] });
    setNewSubjectName('');
    setNewSubjectColor('blue');
    setShowAddSubject(false);
  };

  const handleDeleteSubject = (id: string) => {
    const subjects = (data.subjects ?? []).filter(s => s.id !== id);
    if (subjects.length === 0) return; // 至少保留 1 个
    onUpdateData?.({ ...data, subjects });
  };

  // ===== 数据同步逻辑 =====
  // 连接/注册设备
  const handleRegister = async () => {
    const url = serverUrlInput.trim().replace(/\/+$/, '');
    const name = deviceNameInput.trim() || '我的设备';
    if (!url) {
      setSyncStatus('error');
      setSyncMessage('请输入服务器地址');
      return;
    }
    setSyncStatus('connecting');
    setSyncMessage('正在连接服务器…');
    try {
      const { deviceId } = await registerDevice(url, name);
      const newConfig: SyncConfig = {
        serverUrl: url,
        deviceId,
        deviceName: name,
        autoSync: syncConfigState?.autoSync ?? false,
        lastSyncAt: 0,
      };
      saveSyncConfig(newConfig);
      setSyncConfigState(newConfig);
      setSyncStatus('success');
      setSyncMessage(`✓ 已连接，设备 ID：${deviceId.slice(0, 12)}…`);
      // 顺便拉一次设备列表
      try {
        const res = await fetch(`${url}/api/devices`);
        if (res.ok) {
          const json = await res.json();
          setDeviceList(json.devices ?? []);
        }
      } catch {}
    } catch (e) {
      setSyncStatus('error');
      setSyncMessage('连接失败，请检查服务器地址和网络');
    }
  };

  // 断开连接
  const handleDisconnect = () => {
    localStorage.removeItem('kaoyan_sync_config');
    setSyncConfigState(null);
    setSyncStatus('idle');
    setSyncMessage('已断开连接');
    setDeviceList([]);
  };

  // 切换自动同步开关
  const handleToggleAutoSync = () => {
    if (!syncConfigState) return;
    const newConfig = { ...syncConfigState, autoSync: !syncConfigState.autoSync };
    saveSyncConfig(newConfig);
    setSyncConfigState(newConfig);
  };

  // 手动同步
  const handleSync = async () => {
    const config = syncConfigState;
    if (!config) return;
    setSyncStatus('syncing');
    setSyncMessage('正在同步…');
    try {
      // 1. 下载远程数据
      const { data: remoteData } = await downloadData(config.serverUrl, config.deviceId);
      // 2. 合并本地和远程
      const merged = remoteData ? mergeData(data, remoteData) : data;
      // 3. 更新本地
      onUpdateData?.(merged);
      // 4. 上传合并后的数据
      await uploadData(config.serverUrl, config.deviceId, merged, config.deviceName);
      // 5. 更新同步时间
      const newConfig = { ...config, lastSyncAt: Date.now() };
      saveSyncConfig(newConfig);
      setSyncConfigState(newConfig);
      setSyncStatus('success');
      setSyncMessage(`✓ 同步成功 · ${new Date().toLocaleTimeString()}`);
      // 刷新设备列表
      try {
        const res = await fetch(`${config.serverUrl}/api/devices`);
        if (res.ok) {
          const json = await res.json();
          setDeviceList(json.devices ?? []);
        }
      } catch {}
    } catch (e) {
      setSyncStatus('error');
      setSyncMessage('同步失败，请检查服务器和网络');
    }
  };

  // 刷新设备列表
  const handleRefreshDevices = async () => {
    if (!syncConfigState) return;
    try {
      const res = await fetch(`${syncConfigState.serverUrl}/api/devices`);
      if (res.ok) {
        const json = await res.json();
        setDeviceList(json.devices ?? []);
      }
    } catch {}
  };

  // 进入页面时如果有配置则拉一次设备列表
  useEffect(() => {
    if (syncConfigState) {
      handleRefreshDevices();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkInDays = new Set(data.checkIns.map(c => c.date)).size;

  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="pb-4 space-y-4">
      {/* 个人资料卡：头像上传 + 昵称输入 */}
      <div
        className="rounded-2xl shadow-sm border p-4"
        style={{
          backgroundColor: 'rgb(var(--color-primary-50, 239 246 255))',
          borderColor: 'rgb(var(--color-primary-200, 191 219 254))',
        }}
      >
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"
            style={{ color: 'rgb(var(--color-primary-700, 29 78 216))' }}>
          <span>👤</span> 个人资料
        </h2>

        <div className="flex items-start gap-4">
          {/* 头像区域 */}
          <div className="flex flex-col items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarSaving}
              className="relative w-20 h-20 rounded-full overflow-hidden shadow-md hover:scale-[1.02] transition-transform
                         flex items-center justify-center group"
              style={{
                backgroundColor: avatarPreview ? 'transparent' : 'rgb(var(--color-primary-100, 219 234 254))',
                border: '2px solid rgb(var(--color-primary-300, 147 197 253))',
              }}
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="头像" className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl">😀</span>
              )}
              {/* 悬浮遮罩 */}
              <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white text-xs font-medium">点击更换</span>
              </div>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />

            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] px-2 py-1 rounded-lg font-medium transition-colors"
                style={{
                  backgroundColor: 'rgb(var(--color-primary-500, 59 130 246))',
                  color: '#fff',
                }}
              >
                上传
              </button>
              {avatarPreview && (
                <button
                  type="button"
                  onClick={handleAvatarClear}
                  className="text-[11px] px-2 py-1 rounded-lg font-medium border
                             bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                >
                  清除
                </button>
              )}
            </div>
          </div>

          {/* 昵称输入区 */}
          <div className="flex-1 min-w-0 flex flex-col gap-2">
            <div>
              <label className="text-xs font-medium text-gray-600">我的昵称</label>
              <input
                type="text"
                value={nicknameInput}
                placeholder="给自己起个名字，例如：上岸学长/姐"
                maxLength={20}
                onChange={(e) => {
                  setNicknameInput(e.target.value);
                  setProfileDirty(true);
                }}
                className="mt-1 w-full px-3 py-2 rounded-xl border text-sm text-gray-800
                           focus:outline-none focus:ring-2 transition-colors"
                style={{
                  borderColor: 'rgb(var(--color-primary-200, 191 219 254))',
                  backgroundColor: '#ffffff',
                }}
              />
              <p className="mt-1 text-[11px] text-gray-400">
                {nicknameInput.length}/20 · 昵称会显示在启动页和侧边栏
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-[11px] text-gray-400">
                {avatarSaving ? '处理中…' : profileDirty ? '💡 记得点保存哦' : ''}
              </div>
              <button
                type="button"
                onClick={saveProfile}
                disabled={!profileDirty || !onUpdateData}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold text-white transition-all
                           disabled:opacity-40 disabled:cursor-not-allowed
                           active:scale-[0.98] hover:scale-[1.02]"
                style={{
                  backgroundColor: 'rgb(var(--color-primary-500, 59 130 246))',
                  boxShadow: '0 6px 16px rgba(59,130,246,0.25)',
                }}
              >
                保存资料
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 🌟 成长 & 金币卡片 */}
      <div
        className="rounded-2xl shadow-sm border overflow-hidden"
        style={{
          backgroundColor: '#FFFDF9',
          borderColor: 'var(--border-card)',
        }}
      >
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-heading)' }}>
            <span>🌟</span> 成长 & 金币
          </h2>

          <div className="flex items-start gap-4">
            {/* 左侧：等级大徽章 */}
            <div className="flex flex-col items-center justify-center flex-shrink-0">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center relative"
                style={{
                  backgroundColor: '#C0843E',
                  boxShadow: '0 6px 18px rgba(192,132,62,0.25)',
                }}
              >
                <div className="absolute inset-1 rounded-full bg-white/20 flex flex-col items-center justify-center">
                  <div className="text-[10px] text-white/85 font-medium leading-none">Lv.</div>
                  <div className="text-3xl font-semibold text-white leading-none mt-0.5">
                    {data.points?.level ?? 1}
                  </div>
                </div>
              </div>
              <div className="mt-2 text-[11px] text-amber-700 font-medium">
                {(data.points?.level ?? 1) >= MAX_LEVEL
                  ? '已满级 ✨'
                  : `距离满级 ${MAX_LEVEL - (data.points?.level ?? 1)} 级`}
              </div>
            </div>

            {/* 右侧：金币余额 + 经验进度 */}
            <div className="flex-1 min-w-0 space-y-3">
              {/* 金币余额行 */}
              <div
                className="flex items-center justify-between rounded-xl px-3 py-2 border"
                style={{ backgroundColor: 'var(--bg-card-2)', borderColor: 'var(--border-card)' }}
              >
                <span className="text-xs text-amber-700 flex items-center gap-1">
                  <span>🪙</span> 金币余额
                </span>
                <span className="text-xl font-semibold tabular-nums text-amber-700 flex items-baseline gap-1">
                  {data.points?.balance ?? 0}
                  <span className="text-xs opacity-80">枚</span>
                </span>
              </div>

              {/* 经验进度条 */}
              {(() => {
                const level = data.points?.level ?? 1;
                const exp = data.points?.exp ?? 0;
                const required = expForCurrentLevel(level);
                const totalExp = data.points?.totalExp ?? 0;
                const nextReward = level >= MAX_LEVEL ? 0 : levelUpRewardCoins(level + 1);
                const maxed = level >= MAX_LEVEL || required <= 0;
                const percent = maxed ? 100 : Math.max(0, Math.min(100, Math.round((exp / required) * 100)));
                return (
                  <div className="w-full space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-amber-800">
                      <span className="font-medium flex items-center gap-1">
                        <span>⭐</span> 成长进度
                      </span>
                      {maxed ? (
                        <span className="font-semibold">🎉 已满级 · 累计 {totalExp} EXP</span>
                      ) : (
                        <span className="tabular-nums">
                          {exp}/{required} EXP · 升下一级 +{nextReward}🪙
                        </span>
                      )}
                    </div>
                    <div
                      className="w-full h-2.5 rounded-full overflow-hidden"
                      style={{ background: 'var(--bg-muted)' }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${percent}%`,
                          backgroundImage: maxed
                            ? 'linear-gradient(90deg, var(--accent-btn) 0%, var(--accent-btn-2) 100%)'
                            : 'linear-gradient(90deg, var(--accent-warm-soft) 0%, var(--accent-btn) 100%)',
                        }}
                      />
                    </div>
                  </div>
                );
              })()}

              {/* 累计信息 */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-white/50 rounded-lg px-2.5 py-1.5 border border-amber-200/50">
                  <div className="text-amber-600">累计签到</div>
                  <div className="text-amber-800 font-semibold tabular-nums mt-0.5">
                    {data.points?.checkIn.totalCheckInDays ?? 0} 天
                  </div>
                </div>
                <div className="bg-white/50 rounded-lg px-2.5 py-1.5 border border-amber-200/50">
                  <div className="text-amber-600">连续签到</div>
                  <div className="text-amber-800 font-semibold tabular-nums mt-0.5">
                    {data.points?.checkIn.consecutiveDays ?? 0} 天
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 学习概览：按学科分类统计 */}
      <div className="rounded-2xl shadow-sm border p-4" style={{ backgroundColor: currentTheme.light, borderColor: currentTheme.primary + '20' }}>
        <h2 className="text-lg font-semibold mb-3" style={{ color: currentTheme.primary }}>学习概览</h2>

        {/* 顶部：总打卡天数 */}
        <div
          className="rounded-xl p-3 mb-3 flex items-center justify-between"
          style={{ backgroundColor: '#fff', borderLeft: `3px solid ${currentTheme.primary}` }}
        >
          <div>
            <div className="text-xs text-gray-500">累计打卡</div>
            <div className="text-2xl font-semibold" style={{ color: currentTheme.primary }}>
              {checkInDays}<span className="text-sm font-normal ml-1">天</span>
            </div>
          </div>
          <span className="text-2xl">📅</span>
        </div>

        {/* 按学科分类统计 */}
        <div className="space-y-2">
          {(data.subjects ?? []).map((subject) => {
            const subjectColor = getSubjectHex(subject.color);
            // 统计该学科学习时长（分钟）
            const studyMinutes = Object.values(data.studyDurationsByModule ?? {}).reduce(
              (sum, dayMap) => sum + (dayMap?.[subject.id] ?? 0), 0
            );
            // 统计该学科完成任务数
            const completedTasks = (data.plans ?? []).reduce(
              (sum, plan) => sum + (plan.tasks ?? []).filter(t => t.module === subject.id && t.done).length, 0
            );
            // 统计该学科总任务数
            const totalTasks = (data.plans ?? []).reduce(
              (sum, plan) => sum + (plan.tasks ?? []).filter(t => t.module === subject.id).length, 0
            );
            // 统计该学科打卡天数
            const subjectCheckInDays = new Set(
              (data.checkIns ?? []).filter(c => c.module === subject.id).map(c => c.date)
            ).size;

            const formatDuration = (mins: number) => {
              if (mins < 60) return `${mins}分钟`;
              const h = Math.floor(mins / 60);
              const m = mins % 60;
              return m > 0 ? `${h}小时${m}分` : `${h}小时`;
            };

            return (
              <div
                key={subject.id}
                className="rounded-xl p-3"
                style={{ backgroundColor: '#fff', borderLeft: `3px solid ${subjectColor}` }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: subjectColor }}
                    />
                    <span className="text-sm font-medium" style={{ color: '#3D3328' }}>{subject.name}</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-base font-semibold tabular-nums" style={{ color: subjectColor }}>
                      {formatDuration(studyMinutes)}
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5">学习时长</div>
                  </div>
                  <div>
                    <div className="text-base font-semibold tabular-nums" style={{ color: subjectColor }}>
                      {completedTasks}<span className="text-xs opacity-70">/{totalTasks}</span>
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5">完成任务</div>
                  </div>
                  <div>
                    <div className="text-base font-semibold tabular-nums" style={{ color: subjectColor }}>
                      {subjectCheckInDays}
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5">打卡天数</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 学科管理卡片 */}
      <div
        className="rounded-2xl shadow-sm border p-4"
        style={{
          backgroundColor: '#FFFDF9',
          borderColor: 'var(--border-card)',
        }}
      >
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-heading)' }}>
          <span>📚</span> 学科管理
        </h2>

        {/* 学科列表 */}
        <div className="space-y-2">
          {(data.subjects ?? []).map((subject) => (
            <div
              key={subject.id}
              className="flex items-center justify-between rounded-xl px-3 py-2 border"
              style={{ backgroundColor: 'var(--bg-card-2)', borderColor: 'var(--border-card)' }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: getSubjectHex(subject.color) }}
                />
                <span className="text-sm text-gray-800 truncate">{subject.name}</span>
              </div>
              <button
                type="button"
                onClick={() => handleDeleteSubject(subject.id)}
                className="text-gray-400 hover:text-red-500 transition-colors p-1 -mr-1"
                aria-label="删除学科"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2M19 6l-1 14a1 1 0 01-1 1H7a1 1 0 01-1-1L5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          ))}
        </div>

        {/* 添加学科按钮 / 内联表单 */}
        {!showAddSubject ? (
          <button
            type="button"
            onClick={() => setShowAddSubject(true)}
            className="mt-3 w-full rounded-xl px-3 py-2 border border-dashed text-sm font-medium transition-colors"
            style={{ borderColor: 'var(--border-card)', color: 'var(--text-heading)', backgroundColor: 'transparent' }}
          >
            + 添加学科
          </button>
        ) : (
          <div className="bg-gray-50 rounded-xl p-3 mt-3 space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600">学科名称</label>
              <input
                type="text"
                value={newSubjectName}
                maxLength={10}
                onChange={(e) => setNewSubjectName(e.target.value)}
                placeholder="如：数学、专业课"
                className="mt-1 w-full px-3 py-2 rounded-lg border text-sm text-gray-800 focus:outline-none focus:ring-2"
                style={{ borderColor: 'var(--border-card)', backgroundColor: '#ffffff' }}
              />
              <p className="mt-1 text-[11px] text-gray-400">{newSubjectName.length}/10</p>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600">学科颜色</label>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {SUBJECT_COLORS.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setNewSubjectColor(c.key)}
                    className={`w-6 h-6 rounded-full transition-all ${newSubjectColor === c.key ? 'ring-2 ring-offset-1' : ''}`}
                    style={{
                      backgroundColor: c.hex,
                      ...(newSubjectColor === c.key ? { ['--tw-ring-color' as any]: c.hex } : {}),
                    }}
                    aria-label={c.label}
                    title={c.label}
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddSubject(false);
                  setNewSubjectName('');
                  setNewSubjectColor('blue');
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleAddSubject}
                disabled={!newSubjectName.trim()}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: 'var(--text-heading)' }}
              >
                确认添加
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 🛡️ 本地备份管理卡片 */}
      <BackupManagerCard data={data} onRestore={onImport} />

      {/* ☁️ 数据同步卡片 */}
      <div
        className="rounded-2xl shadow-sm border p-4"
        style={{
          backgroundColor: '#FFFDF9',
          borderColor: 'var(--border-card)',
        }}
      >
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-heading)' }}>
          <span>☁️</span> 数据同步
        </h2>

        {/* 未连接：显示服务器地址 + 设备名 + 连接按钮 */}
        {!syncConfigState ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600">服务器地址</label>
              <input
                type="text"
                value={serverUrlInput}
                onChange={(e) => setServerUrlInput(e.target.value)}
                placeholder="如 http://192.168.1.123:3001"
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2"
                style={{ borderColor: 'var(--border-card)', backgroundColor: '#ffffff' }}
              />
              <p className="mt-1 text-[11px] text-gray-400">
                启动后端服务后填入局域网地址，多设备需连同一 Wi-Fi
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600">设备名称</label>
              <input
                type="text"
                value={deviceNameInput}
                maxLength={20}
                onChange={(e) => setDeviceNameInput(e.target.value)}
                placeholder="如：我的手机、我的平板"
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2"
                style={{ borderColor: 'var(--border-card)', backgroundColor: '#ffffff' }}
              />
            </div>

            <button
              type="button"
              onClick={handleRegister}
              disabled={syncStatus === 'connecting' || !serverUrlInput.trim()}
              className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all
                         disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              style={{ backgroundColor: 'var(--text-heading)', boxShadow: '0 4px 12px rgba(139,111,71,0.2)' }}
            >
              {syncStatus === 'connecting' ? '连接中…' : '连接服务器'}
            </button>
          </div>
        ) : (
          /* 已连接：显示状态 + 同步按钮 + 自动同步开关 */
          <div className="space-y-3">
            {/* 连接状态 */}
            <div
              className="rounded-xl px-3 py-2.5 border flex items-center justify-between"
              style={{ backgroundColor: 'var(--bg-card-2)', borderColor: 'var(--border-card)' }}
            >
              <div className="min-w-0">
                <div className="text-xs text-amber-700 flex items-center gap-1.5">
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ backgroundColor: syncStatus === 'error' ? '#dc2626' : syncStatus === 'syncing' ? '#f59e0b' : '#16a34a' }}
                  />
                  已连接 · {syncConfigState.deviceName}
                </div>
                <div className="text-[11px] text-gray-500 mt-0.5 truncate">
                  {syncConfigState.serverUrl}
                </div>
                {syncConfigState.lastSyncAt > 0 && (
                  <div className="text-[11px] text-gray-400 mt-0.5">
                    上次同步：{new Date(syncConfigState.lastSyncAt).toLocaleString()}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={handleDisconnect}
                className="text-[11px] px-2 py-1 rounded-lg border bg-white text-gray-600 border-gray-200 hover:bg-gray-50 flex-shrink-0"
              >
                断开
              </button>
            </div>

            {/* 状态消息 */}
            {syncMessage && (
              <div
                className="text-xs px-3 py-2 rounded-lg"
                style={{
                  backgroundColor: syncStatus === 'error' ? 'rgba(220,38,38,0.08)' : syncStatus === 'success' ? 'rgba(22,163,74,0.08)' : 'rgba(245,158,11,0.08)',
                  color: syncStatus === 'error' ? '#dc2626' : syncStatus === 'success' ? '#16a34a' : '#b45309',
                }}
              >
                {syncMessage}
              </div>
            )}

            {/* 立即同步按钮 */}
            <button
              type="button"
              onClick={handleSync}
              disabled={syncStatus === 'syncing'}
              className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all
                         disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              style={{ backgroundColor: 'var(--text-heading)', boxShadow: '0 4px 12px rgba(139,111,71,0.2)' }}
            >
              {syncStatus === 'syncing' ? '同步中…' : '🔄 立即同步'}
            </button>

            {/* 自动同步开关 */}
            <div
              className="flex items-center justify-between rounded-xl px-3 py-2 border"
              style={{ backgroundColor: 'var(--bg-card-2)', borderColor: 'var(--border-card)' }}
            >
              <div>
                <div className="text-xs font-medium text-amber-800">自动同步</div>
                <div className="text-[11px] text-gray-500 mt-0.5">数据变更后自动上传到云端</div>
              </div>
              <button
                type="button"
                onClick={handleToggleAutoSync}
                className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
                style={{ backgroundColor: syncConfigState.autoSync ? 'var(--text-heading)' : '#D6CBB8' }}
                aria-label="自动同步开关"
              >
                <span
                  className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                  style={{ transform: syncConfigState.autoSync ? 'translateX(20px)' : 'translateX(0)' }}
                />
              </button>
            </div>

            {/* 多设备列表 */}
            {deviceList.length > 0 && (
              <div>
                <div className="flex items-center justify-between mt-1">
                  <div className="text-xs font-medium text-gray-600">已注册设备</div>
                  <button
                    type="button"
                    onClick={handleRefreshDevices}
                    className="text-[11px] text-amber-700 hover:underline"
                  >
                    刷新
                  </button>
                </div>
                <div className="mt-1.5 space-y-1.5">
                  {deviceList.map((d) => (
                    <div
                      key={d.device_id}
                      className="flex items-center justify-between rounded-lg px-3 py-1.5 border"
                      style={{ backgroundColor: '#ffffff', borderColor: 'var(--border-card)' }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm">{d.device_id === syncConfigState.deviceId ? '📱' : '💻'}</span>
                        <span className="text-xs text-gray-700 truncate">
                          {d.device_name || '未命名设备'}
                          {d.device_id === syncConfigState.deviceId && (
                            <span className="text-amber-700 ml-1">（本机）</span>
                          )}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-400 flex-shrink-0">
                        {new Date(d.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 主题配色 */}
      <div className="bg-white rounded-2xl shadow-sm border p-4" style={{ borderColor: '#f0f0f0' }}>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">主题配色</h2>
        <div className="space-y-2.5">
          {themes.map((t) => (
            <button
              key={t.key}
              onClick={() => setTheme(t.key)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all"
              style={{
                borderColor: theme === t.key ? t.primary : '#f0f0f0',
                backgroundColor: theme === t.key ? t.light : '#fff',
              }}
            >
              {/* 双色渐变预览 */}
              <div
                className="w-12 h-10 rounded-lg shadow-inner"
                style={{
                  background: `linear-gradient(135deg, ${t.gradientFrom} 0%, ${t.gradientTo} 100%)`,
                }}
              />
              <div className="flex-1 text-left">
                <div className="text-sm font-medium" style={{ color: theme === t.key ? t.primary : '#333' }}>{t.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">
                  <span style={{ color: t.primary }}>{t.primary}</span>
                  {' · '}
                  <span style={{ color: t.accent === '#0B0C10' ? '#666' : t.accent }}>{t.accent}</span>
                </div>
              </div>
              {theme === t.key && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: t.light, color: t.primary }}
                >
                  使用中
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* AI 助手配置入口 */}
      <button
        onClick={() => setShowAISettings(true)}
        className="w-full p-4 bg-white rounded-2xl shadow-sm border text-left"
        style={{ borderColor: '#f0f0f0' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-800">🤖 AI 助手配置</div>
            <div className="text-xs text-gray-400 mt-0.5">配置 DeepSeek / Kimi API</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-gray-400">
            <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </button>

      {/* 数据管理入口 */}
      <button
        onClick={() => setShowDataManager(true)}
        className="w-full p-4 bg-white rounded-2xl shadow-sm border text-left"
        style={{ borderColor: '#f0f0f0' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-800">数据管理</div>
            <div className="text-xs text-gray-400 mt-0.5">导出 / 导入数据备份</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-gray-400">
            <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </button>

      <DataManager
        data={data}
        onImport={onImport}
        visible={showDataManager}
        onClose={() => setShowDataManager(false)}
      />

      {/* AI 助手配置弹窗 */}
      {showAISettings && (
        <div className="fixed inset-0 z-[60] bg-black/40" onClick={() => setShowAISettings(false)}>
          <div
            className="absolute right-0 top-0 h-full w-full max-w-lg bg-gray-50 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-100 px-4 h-12 flex items-center justify-between z-10">
              <span className="text-base font-semibold text-gray-800">AI 助手配置</span>
              <button
                onClick={() => setShowAISettings(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 text-lg"
              >
                &times;
              </button>
            </div>
            <div className="p-3">
              <AISettings />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ========== 本地备份管理卡片组件 ==========
function BackupManagerCard({ data, onRestore }: { data: AppData; onRestore: (d: AppData) => void }) {
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [confirmDate, setConfirmDate] = useState<string | null>(null);

  // 加载备份列表
  const refresh = useCallback(() => {
    setBackups(getBackupIndex());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // 立即备份
  const handleBackupNow = () => {
    if (createBackup(data)) {
      refresh();
      alert('已创建今日备份');
    } else {
      alert('备份失败，请稍后重试');
    }
  };

  // 恢复
  const handleRestore = (date: string) => {
    const restored = restoreFromBackup(date);
    if (restored) {
      onRestore(restored);
      setConfirmDate(null);
      alert(`已恢复 ${date} 的备份数据`);
    } else {
      alert('恢复失败，备份可能已损坏');
    }
  };

  // 删除
  const handleDelete = (date: string) => {
    deleteBackup(date);
    refresh();
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  };

  return (
    <div
      className="rounded-2xl shadow-sm border p-4"
      style={{ backgroundColor: '#FFFDF9', borderColor: 'var(--border-card)' }}
    >
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-heading)' }}>
        <span>🛡️</span> 数据备份
      </h2>

      <div className="text-xs text-gray-500 mb-3 leading-relaxed">
        每天首次打开应用自动备份一次，保留最近 7 天。数据丢失时可一键恢复。
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={handleBackupNow}
          className="flex-1 py-2 text-sm rounded-lg transition-colors"
          style={{ backgroundColor: 'var(--accent-warm-soft)', color: '#fff' }}
        >
          立即备份
        </button>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-1 py-2 text-sm border rounded-lg hover:bg-gray-50 transition-colors"
          style={{ borderColor: 'var(--border-card)', color: '#6B5F50' }}
        >
          {expanded ? '收起列表' : `查看备份 (${backups.length})`}
        </button>
      </div>

      {/* 备份列表 */}
      {expanded && (
        <div className="space-y-2">
          {backups.length === 0 ? (
            <div className="text-center py-6 text-sm text-gray-400">
              暂无备份记录
            </div>
          ) : (
            backups.map((b) => (
              <div
                key={b.date}
                className="rounded-xl p-3 border"
                style={{ backgroundColor: 'var(--bg-card-2)', borderColor: 'var(--border-card)' }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-800">{b.date}</span>
                  <span className="text-xs text-gray-400">{formatSize(b.size)}</span>
                </div>
                <div className="text-xs text-gray-500 mb-2">{b.preview}</div>

                {confirmDate === b.date ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRestore(b.date)}
                      className="flex-1 py-1.5 text-xs rounded-lg"
                      style={{ backgroundColor: '#C0843E', color: '#fff' }}
                    >
                      确认恢复
                    </button>
                    <button
                      onClick={() => setConfirmDate(null)}
                      className="flex-1 py-1.5 text-xs border rounded-lg"
                      style={{ borderColor: 'var(--border-card)', color: '#6B5F50' }}
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmDate(b.date)}
                      className="flex-1 py-1.5 text-xs border rounded-lg hover:bg-white transition-colors"
                      style={{ borderColor: 'var(--border-card)', color: '#6B5F50' }}
                    >
                      恢复
                    </button>
                    <button
                      onClick={() => handleDelete(b.date)}
                      className="py-1.5 px-3 text-xs border rounded-lg text-red-400 hover:bg-red-50 transition-colors"
                      style={{ borderColor: '#F0D9D9' }}
                    >
                      删除
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
