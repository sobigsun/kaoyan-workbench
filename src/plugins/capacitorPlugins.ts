/**
 * 考研工作台 — Capacitor 原生能力封装
 *
 * 设计：每个方法都先判断 `Capacitor.isNativePlatform()`。
 *   - 是 APK：走 @capacitor/core 注册的原生插件（Pomodoro / TaskNotifications / LocalNotifications）
 *   - 不是 APK：返回空 Promise，不报错，页面功能照常走前端兜底（例如 useTimer 的时间戳对时）
 *
 * 暴露 2 组能力：
 *   1) Pomodoro —— 原生前台服务番茄钟（锁屏/后台 100% 准时 + 通知栏剩余时间 + 暂停/停止）
 *   2) TaskNotifications —— 今日任务推送进通知栏 + 点「✓ 完成」回调
 *   3) Misc —— 请求通知权限（POST_NOTIFICATIONS）
 */

import { Capacitor, registerPlugin } from '@capacitor/core';

/** 与 @capacitor/core 的 PluginListenerHandle 结构完全一致，内联定义避免 TS 值导入报错 */
interface PluginListenerHandle {
  remove: () => Promise<void>;
}

/** 获取全局插件注册表（等价于旧版 Capacitor 的 Plugins 导出） */
function getPluginsRegistry(): Record<string, any> {
  const capAny = Capacitor as unknown as { Plugins?: Record<string, any> };
  if (!capAny.Plugins) capAny.Plugins = {};
  return capAny.Plugins;
}

// ============================================================
// 1) Pomodoro 插件（对应 android/.../PomodoroPlugin.java）
// ============================================================
interface PomodoroNative {
  startTimer(opts: {
    taskId: string;
    taskTitle: string;
    module: string;
    totalSec: number;
    remainSec: number;
    isBreak: boolean;
  }): Promise<void>;
  pauseTimer(): Promise<void>;
  stopTimer(): Promise<void>;
  addListener(eventName: 'pomodoroComplete', listenerFunc: (data: { taskId: string }) => void): PluginListenerHandle;
}

const PomodoroNativePlugin = /*#__PURE__*/ (() => {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    // 优先使用已注册过的插件（比如 MainActivity.registerPlugin 那批）
    const anyPlugins = getPluginsRegistry() as Record<string, PomodoroNative | undefined>;
    if (anyPlugins.Pomodoro) return anyPlugins.Pomodoro;
    // 兜底：用 registerPlugin 手动再建一个（空插件）
    return registerPlugin<PomodoroNative>('Pomodoro', { web: () => new NoopPomodoro() });
  } catch (e) {
    console.warn('[capacitorPlugins] 注册 Pomodoro 插件失败（运行环境不支持）', e);
    return null;
  }
})();

class NoopPomodoro implements PomodoroNative {
  async startTimer() {}
  async pauseTimer() {}
  async stopTimer() {}
  addListener(_e: 'pomodoroComplete', _fn: any): PluginListenerHandle {
    return { remove: async () => {} };
  }
}

export const Pomodoro = {
  isAvailable() { return PomodoroNativePlugin != null; },

  async startTimer(opts: {
    taskId?: string;
    taskTitle?: string;
    module?: string;
    totalSec: number;
    remainSec?: number;
    isBreak?: boolean;
  }): Promise<void> {
    if (!PomodoroNativePlugin) return;
    await PomodoroNativePlugin.startTimer({
      taskId: opts.taskId ?? '',
      taskTitle: opts.taskTitle ?? '',
      module: opts.module ?? '',
      totalSec: Math.max(1, opts.totalSec | 0),
      remainSec: Math.max(1, (opts.remainSec ?? opts.totalSec) | 0),
      isBreak: !!opts.isBreak,
    });
  },

  async pauseTimer(): Promise<void> {
    if (!PomodoroNativePlugin) return;
    await PomodoroNativePlugin.pauseTimer();
  },

  async stopTimer(): Promise<void> {
    if (!PomodoroNativePlugin) return;
    await PomodoroNativePlugin.stopTimer();
  },

  addListener(fn: (data: { taskId: string }) => void): PluginListenerHandle {
    if (!PomodoroNativePlugin) {
      return { remove: async () => {} };
    }
    return PomodoroNativePlugin.addListener('pomodoroComplete', fn);
  },
};

// ============================================================
// 2) TaskNotifications 插件（对应 android/.../TaskNotificationsPlugin.java）
// ============================================================
interface TaskNotifInfo {
  taskId: string;
  title: string;
  module?: string;
  done: boolean;
  index?: number;
}

interface TaskNotificationsNative {
  syncTasks(opts: { tasks: TaskNotifInfo[] }): Promise<void>;
  cancelAll(): Promise<void>;
  addListener(eventName: 'taskDoneFromNotification',
              listenerFunc: (data: { taskId: string }) => void): PluginListenerHandle;
}

const TaskNotificationsNativePlugin = /*#__PURE__*/ (() => {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const anyPlugins = getPluginsRegistry() as Record<string, TaskNotificationsNative | undefined>;
    if (anyPlugins.TaskNotifications) return anyPlugins.TaskNotifications;
    return registerPlugin<TaskNotificationsNative>('TaskNotifications', { web: () => new NoopTaskNotifs() });
  } catch (e) {
    console.warn('[capacitorPlugins] 注册 TaskNotifications 插件失败', e);
    return null;
  }
})();

class NoopTaskNotifs implements TaskNotificationsNative {
  async syncTasks() {}
  async cancelAll() {}
  addListener(_e: 'taskDoneFromNotification', _fn: any): PluginListenerHandle {
    return { remove: async () => {} };
  }
}

export const TaskNotifications = {
  isAvailable() { return TaskNotificationsNativePlugin != null; },

  /**
   * 同步今日任务到通知栏。已完成任务会被自动取消通知。
   * @param tasks 当日任务列表（已完成/已删除的要么 done=true，要么别传进来）
   */
  async syncTasks(tasks: TaskNotifInfo[]): Promise<void> {
    if (!TaskNotificationsNativePlugin) return;
    await TaskNotificationsNativePlugin.syncTasks({ tasks });
  },

  /** 立刻取消所有今日任务通知 */
  async cancelAll(): Promise<void> {
    if (!TaskNotificationsNativePlugin) return;
    await TaskNotificationsNativePlugin.cancelAll();
  },

  /** 点通知栏「✓ 完成」按钮时触发，前端拿到 taskId 统一走打勾 + 金币 */
  addListener(fn: (data: { taskId: string }) => void): PluginListenerHandle {
    if (!TaskNotificationsNativePlugin) {
      return { remove: async () => {} };
    }
    return TaskNotificationsNativePlugin.addListener('taskDoneFromNotification', fn);
  },
};

// ============================================================
// 3) Misc —— 请求通知权限（POST_NOTIFICATIONS，Android 13+）
// ============================================================
export async function ensureNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    // Web 环境：尽力而为调用浏览器原生 Notification API
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    const N = window.Notification;
    if (N.permission === 'granted') return true;
    if (N.permission === 'denied') return false;
    try {
      const res = await N.requestPermission();
      return res === 'granted';
    } catch { return false; }
  }
  // 原生：尝试使用官方 @capacitor/local-notifications 插件的 requestPermissions
  try {
    const anyPlugins = getPluginsRegistry() as Record<string, any>;
    if (anyPlugins.LocalNotifications) {
      const r = await anyPlugins.LocalNotifications.requestPermissions?.();
      if (r && typeof r.display === 'string') return r.display === 'granted';
      if (r && typeof r === 'string') return r === 'granted';
    }
    // 再查一次当前状态
    if (anyPlugins.LocalNotifications?.checkPermissions) {
      const r = await anyPlugins.LocalNotifications.checkPermissions?.();
      if (r && typeof r.display === 'string') return r.display === 'granted';
    }
    return true; // 保守兜底：老系统默认有
  } catch (e) {
    console.warn('[ensureNotificationPermission] error', e);
    return false;
  }
}
