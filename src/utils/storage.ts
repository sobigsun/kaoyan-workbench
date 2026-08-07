import { AppData, Settings, PointsSystem, RewardItem, UserProfile, SubjectConfig } from '../types';
import { computeLevelFromTotalExp } from './levelSystem';

const DEFAULT_SETTINGS: Settings = {
  targetDate: '2026-12-26',
  dailyGoal: 300,
  dailyWordGoal: 50,
};

// 用户个人资料默认值：昵称空字符串（=用默认称呼）、头像空字符串（=用默认emoji头像）
export const DEFAULT_USER_PROFILE: UserProfile = {
  nickname: '',
  avatarDataUrl: '',
};

export const DEFAULT_REWARDS: RewardItem[] = [
  { id: 'r1', name: '小零食', cost: 100, icon: '🍪' },
  { id: 'r2', name: '一杯奶茶', cost: 300, icon: '🧋' },
  { id: 'r3', name: '看一部电影', cost: 500, icon: '🎬' },
  { id: 'r4', name: '休息半天', cost: 800, icon: '😴' },
  { id: 'r5', name: '一顿大餐', cost: 1000, icon: '🍽' },
];

// 默认学科列表（英语/教育/政治）
export const DEFAULT_SUBJECTS: SubjectConfig[] = [
  { id: 'english',   name: '英语', color: 'green' },
  { id: 'education', name: '教育', color: 'yellow' },
  { id: 'politics',  name: '政治', color: 'red' },
];

export const DEFAULT_POINTS: PointsSystem = {
  balance: 0,
  history: [],
  checkIn: { lastCheckInDate: '', consecutiveDays: 0, totalCheckInDays: 0 },
  awardedTaskIds: [],
  settledDates: [],
  redeemed: [],
  customRewards: [],
  // 成长体系默认值：1 级 0 经验
  level: 1,
  exp: 0,
  totalExp: 0,
  milestones: [],
};

const DEFAULT_DATA: AppData = {
  settings: DEFAULT_SETTINGS,
  userProfile: { ...DEFAULT_USER_PROFILE },
  subjects: [...DEFAULT_SUBJECTS],
  words: [],
  notes: [],
  checkIns: [],
  plans: [],
  templates: [],
  memorizeItems: [],
  newsItems: [],
  pomodoroRecords: [],
  wrongQuestions: [],
  studyDurations: {},
  studyDurationsByModule: {},
  customDateTabs: [],
  points: { ...DEFAULT_POINTS },
};

const STORAGE_KEY = 'kaoyan_workbench_data';

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw) as Partial<AppData>;
      const points = data.points ?? {};
      return {
        ...DEFAULT_DATA,
        ...data,
        settings: { ...DEFAULT_SETTINGS, ...data.settings },
        // 旧数据升级：个人资料补齐默认值
        userProfile: { ...DEFAULT_USER_PROFILE, ...(data.userProfile ?? {}) },
        // 学科列表：旧数据无此字段时用默认 3 科
        subjects: data.subjects && data.subjects.length > 0 ? data.subjects : [...DEFAULT_SUBJECTS],
        // 深合并可选字段，保证旧数据升级后字段存在
        studyDurationsByModule: data.studyDurationsByModule ?? {},
        customDateTabs: data.customDateTabs ?? [],
        points: {
          ...DEFAULT_POINTS,
          ...points,
          checkIn: { ...DEFAULT_POINTS.checkIn, ...(points.checkIn ?? {}) },
          history: points.history ?? [],
          awardedTaskIds: points.awardedTaskIds ?? [],
          settledDates: points.settledDates ?? [],
          redeemed: points.redeemed ?? [],
          customRewards: points.customRewards ?? [],
          // 成长体系：补齐字段 + 根据 totalExp 回算等级/当前经验
          milestones: points.milestones ?? [],
          totalExp: points.totalExp ?? 0,
          ...(() => {
            const lvl = computeLevelFromTotalExp(points.totalExp ?? 0);
            return {
              level: points.level && points.level >= 1 && points.level <= 100 ? points.level : lvl.level,
              exp: points.exp !== undefined ? points.exp : lvl.exp,
            };
          })(),
        },
      };
    }
  } catch (e) {
    console.error('Failed to load data:', e);
  }
  return { ...DEFAULT_DATA, settings: { ...DEFAULT_SETTINGS } };
}

export function saveData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save data:', e);
  }
}

export function exportData(data: AppData): string {
  return JSON.stringify(data, null, 2);
}

export function importData(json: string): AppData | null {
  try {
    const data = JSON.parse(json) as AppData;
    if (data.settings && data.words !== undefined) {
      const points = data.points ?? {};
      return {
        ...DEFAULT_DATA,
        ...data,
        // 导入时个人资料补齐默认值
        userProfile: { ...DEFAULT_USER_PROFILE, ...(data.userProfile ?? {}) },
        studyDurationsByModule: data.studyDurationsByModule ?? {},
        customDateTabs: data.customDateTabs ?? [],
        points: {
          ...DEFAULT_POINTS,
          ...points,
          checkIn: { ...DEFAULT_POINTS.checkIn, ...(points.checkIn ?? {}) },
          history: points.history ?? [],
          awardedTaskIds: points.awardedTaskIds ?? [],
          settledDates: points.settledDates ?? [],
          redeemed: points.redeemed ?? [],
          customRewards: points.customRewards ?? [],
          milestones: points.milestones ?? [],
          totalExp: points.totalExp ?? 0,
          ...(() => {
            const lvl = computeLevelFromTotalExp(points.totalExp ?? 0);
            return {
              level: points.level && points.level >= 1 && points.level <= 100 ? points.level : lvl.level,
              exp: points.exp !== undefined ? points.exp : lvl.exp,
            };
          })(),
        },
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function downloadJSON(data: AppData): void {
  const json = exportData(data);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kaoyan-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ========== 云端同步 ==========

const SYNC_CONFIG_KEY = 'kaoyan_sync_config';

export interface SyncConfig {
  serverUrl: string;    // 服务器地址，如 http://192.168.1.123:3001
  deviceId: string;     // 设备 ID
  deviceName: string;   // 设备名称
  autoSync: boolean;    // 是否自动同步
  lastSyncAt: number;   // 上次同步时间戳
}

export function getSyncConfig(): SyncConfig | null {
  try {
    const raw = localStorage.getItem(SYNC_CONFIG_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSyncConfig(config: SyncConfig): void {
  localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(config));
}

export async function registerDevice(serverUrl: string, deviceName: string): Promise<{ deviceId: string }> {
  const res = await fetch(`${serverUrl}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceName }),
  });
  if (!res.ok) throw new Error('注册设备失败');
  const json = await res.json();
  return { deviceId: json.deviceId };
}

export async function uploadData(serverUrl: string, deviceId: string, data: AppData, deviceName?: string): Promise<void> {
  const res = await fetch(`${serverUrl}/api/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId, data, deviceName }),
  });
  if (!res.ok) throw new Error('上传数据失败');
}

export async function downloadData(serverUrl: string, deviceId: string): Promise<{ data: AppData | null; updatedAt: number }> {
  const res = await fetch(`${serverUrl}/api/sync/${deviceId}`);
  if (!res.ok) {
    if (res.status === 404) return { data: null, updatedAt: 0 };
    throw new Error('下载数据失败');
  }
  const json = await res.json();
  return { data: json.data, updatedAt: json.updatedAt };
}

/** 智能合并：云端数据和本地数据取较新的，数组按 id 去重合并 */
export function mergeData(local: AppData, remote: AppData): AppData {
  // 简单策略：如果远程数据更新时间更晚，用远程数据覆盖本地
  // 如果本地更新时间更晚，保持本地
  // 对于数组类型（words, notes, plans 等），按 id 去重合并，远程优先
  const mergeArray = <T extends { id?: string }>(localArr: T[], remoteArr: T[]): T[] => {
    const map = new Map<string, T>();
    for (const item of localArr) if (item.id) map.set(item.id, item);
    for (const item of remoteArr) if (item.id) map.set(item.id, item); // 远程覆盖本地
    return Array.from(map.values());
  };

  return {
    ...local,
    ...remote,
    // 数组按 id 去重合并（远程优先）
    words: mergeArray(local.words ?? [], remote.words ?? []),
    notes: mergeArray(local.notes ?? [], remote.notes ?? []),
    plans: mergeArray(local.plans ?? [], remote.plans ?? []),
    templates: mergeArray(local.templates ?? [], remote.templates ?? []),
    memorizeItems: mergeArray(local.memorizeItems ?? [], remote.memorizeItems ?? []),
    newsItems: mergeArray(local.newsItems ?? [], remote.newsItems ?? []),
    wrongQuestions: mergeArray(local.wrongQuestions ?? [], remote.wrongQuestions ?? []),
    // 学习时长：合并 by date key，远程覆盖本地
    studyDurations: { ...local.studyDurations, ...remote.studyDurations },
    studyDurationsByModule: { ...local.studyDurationsByModule, ...remote.studyDurationsByModule },
    // 番茄钟记录：合并 by date key
    pomodoroRecords: (() => {
      const map = new Map<string, typeof local.pomodoroRecords[number]>();
      for (const r of local.pomodoroRecords ?? []) map.set(r.date, r);
      for (const r of remote.pomodoroRecords ?? []) map.set(r.date, r);
      return Array.from(map.values());
    })(),
    // 积分系统：取较高的（金币和经验不可回退）
    points: {
      ...local.points,
      ...remote.points,
      balance: Math.max(local.points?.balance ?? 0, remote.points?.balance ?? 0),
      totalExp: Math.max(local.points?.totalExp ?? 0, remote.points?.totalExp ?? 0),
      level: Math.max(local.points?.level ?? 1, remote.points?.level ?? 1),
      history: mergeArray(local.points?.history ?? [], remote.points?.history ?? []),
      awardedTaskIds: [...new Set([...(local.points?.awardedTaskIds ?? []), ...(remote.points?.awardedTaskIds ?? [])])],
      settledDates: [...new Set([...(local.points?.settledDates ?? []), ...(remote.points?.settledDates ?? [])])],
      checkIn: {
        lastCheckInDate: remote.points?.checkIn?.lastCheckInDate || local.points?.checkIn?.lastCheckInDate || '',
        consecutiveDays: Math.max(local.points?.checkIn?.consecutiveDays ?? 0, remote.points?.checkIn?.consecutiveDays ?? 0),
        totalCheckInDays: Math.max(local.points?.checkIn?.totalCheckInDays ?? 0, remote.points?.totalCheckInDays ?? 0),
      },
    },
  };
}

// ========== 本地自动备份（防数据丢失） ==========

const BACKUP_PREFIX = 'kaoyan_backup_';
const BACKUP_INDEX_KEY = 'kaoyan_backup_index';
const MAX_BACKUPS = 7; // 保留最近 7 天

export interface BackupInfo {
  date: string;      // YYYY-MM-DD
  timestamp: number;
  size: number;      // 数据大小（字节）
  preview: string;   // 预览信息（金币、等级等）
}

/** 创建今日备份（每天只备份一次，重复调用会覆盖当天） */
export function createBackup(data: AppData): boolean {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const backupKey = BACKUP_PREFIX + today;
    const payload = JSON.stringify(data);
    localStorage.setItem(backupKey, payload);

    // 更新备份索引
    const index = getBackupIndex();
    const existingIdx = index.findIndex((b) => b.date === today);
    const info: BackupInfo = {
      date: today,
      timestamp: Date.now(),
      size: new Blob([payload]).size,
      preview: `Lv.${data.points?.level ?? 1} · ${data.points?.balance ?? 0}金币 · ${data.plans?.length ?? 0}计划`,
    };
    if (existingIdx >= 0) {
      index[existingIdx] = info;
    } else {
      index.unshift(info);
    }

    // 保留最近 MAX_BACKUPS 个，删除多余的
    const sorted = index.sort((a, b) => b.timestamp - a.timestamp);
    const kept = sorted.slice(0, MAX_BACKUPS);
    const removed = sorted.slice(MAX_BACKUPS);
    for (const r of removed) {
      localStorage.removeItem(BACKUP_PREFIX + r.date);
    }
    localStorage.setItem(BACKUP_INDEX_KEY, JSON.stringify(kept));
    return true;
  } catch (e) {
    console.error('创建备份失败:', e);
    return false;
  }
}

/** 获取所有备份列表（按时间倒序） */
export function getBackupIndex(): BackupInfo[] {
  try {
    const raw = localStorage.getItem(BACKUP_INDEX_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as BackupInfo[];
    // 校验备份是否真实存在（可能被用户清除）
    return arr.filter((b) => localStorage.getItem(BACKUP_PREFIX + b.date) !== null);
  } catch {
    return [];
  }
}

/** 从指定日期的备份恢复数据 */
export function restoreFromBackup(date: string): AppData | null {
  try {
    const raw = localStorage.getItem(BACKUP_PREFIX + date);
    if (!raw) return null;
    return importData(raw);
  } catch (e) {
    console.error('恢复备份失败:', e);
    return null;
  }
}

/** 删除指定日期的备份 */
export function deleteBackup(date: string): void {
  localStorage.removeItem(BACKUP_PREFIX + date);
  const index = getBackupIndex();
  const kept = index.filter((b) => b.date !== date);
  localStorage.setItem(BACKUP_INDEX_KEY, JSON.stringify(kept));
}

/** 应用启动时自动创建今日备份（若今天尚未备份） */
export function autoBackupIfNeeded(data: AppData): void {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const index = getBackupIndex();
    if (!index.some((b) => b.date === today)) {
      createBackup(data);
    }
  } catch {
    /* ignore */
  }
}
