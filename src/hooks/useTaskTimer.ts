import { useState, useEffect, useRef, useCallback } from 'react';
import { ModuleType } from '../types';

interface UseTaskTimerOptions {
  onCommit: (taskId: string, module: ModuleType, minutes: number) => void;
  // 每整分钟触发一次（elapsedMinutes 从 1 开始递增）
  onMinuteTick?: (taskId: string, module: ModuleType, elapsedMinutes: number) => void;
}

/**
 * 任务级计时器。
 *
 * 与 useTimer 同理：elapsed 不再靠 setInterval 「prev+1」累加，而是用绝对时间
 * 戳 startAt 反推，确保切到后台 WebView 被冻住后回前台也能对齐真实耗时。
 */
export function useTaskTimer({ onCommit, onMinuteTick }: UseTaskTimerOptions) {
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [activeModule, setActiveModule] = useState<ModuleType | null>(null);
  const [durationSec, setDurationSec] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [hasFinished, setHasFinished] = useState(false);
  // 展示用的 elapsed（每 tick / visibility 对时后更新）
  const [elapsedSec, setElapsedSec] = useState(0);

  // 内部：已暂停累计的秒数（每次 start 会把之前 elapsed 的值累加到 baseSec 里，
  // 以便支持「暂停 → 继续」时不丢已经跑过的时间）
  const baseSecRef = useRef(0);
  // 内部：本轮 running 开始的绝对时间戳（ms）。null 表示没在跑
  const runStartAtRef = useRef<number | null>(null);

  const activeTaskRef = useRef(activeTaskId);
  const activeModuleRef = useRef(activeModule);
  useEffect(() => { activeTaskRef.current = activeTaskId; }, [activeTaskId]);
  useEffect(() => { activeModuleRef.current = activeModule; }, [activeModule]);

  // 已触发过 onMinuteTick 的分钟数（基于累计 elapsed）
  const lastTickedMinuteRef = useRef(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCommitRef = useRef(onCommit);
  useEffect(() => { onCommitRef.current = onCommit; }, [onCommit]);
  const onMinuteTickRef = useRef(onMinuteTick);
  useEffect(() => { onMinuteTickRef.current = onMinuteTick; }, [onMinuteTick]);
  const finishFiredRef = useRef(false);

  // 根据 baseSec + runStartAt 计算当前累计 elapsed（秒）
  const recomputeElapsed = useCallback((): number => {
    const run = runStartAtRef.current == null
      ? 0
      : Math.max(0, Math.floor((Date.now() - runStartAtRef.current) / 1000));
    return baseSecRef.current + run;
  }, []);

  const commitAndReset = useCallback(() => {
    const elapsed = recomputeElapsed();
    if (activeTaskRef.current && activeModuleRef.current && elapsed > 0) {
      const minutes = Math.round(elapsed / 60);
      if (minutes > 0) onCommitRef.current(activeTaskRef.current, activeModuleRef.current, minutes);
    }
    setActiveTaskId(null);
    setActiveModule(null);
    setDurationSec(0);
    baseSecRef.current = 0;
    runStartAtRef.current = null;
    setElapsedSec(0);
    setIsRunning(false);
    setHasFinished(false);
    finishFiredRef.current = false;
    lastTickedMinuteRef.current = 0;
  }, [recomputeElapsed]);

  const start = useCallback(
    (taskId: string, module: ModuleType, minutes: number) => {
      // 先把"上一个没 commit 的任务"给结算掉
      const prevElapsed = recomputeElapsed();
      if (activeTaskRef.current && activeModuleRef.current && prevElapsed > 0) {
        const prevMinutes = Math.round(prevElapsed / 60);
        if (prevMinutes > 0) onCommitRef.current(activeTaskRef.current, activeModuleRef.current, prevMinutes);
      }
      setActiveTaskId(taskId);
      setActiveModule(module);
      setDurationSec(minutes * 60);
      baseSecRef.current = 0;
      runStartAtRef.current = Date.now();
      setElapsedSec(0);
      setIsRunning(true);
      setHasFinished(false);
      finishFiredRef.current = false;
      lastTickedMinuteRef.current = 0;
    },
    [recomputeElapsed]
  );

  const pause = useCallback(() => {
    // 暂停：把当前 running 段累计进 baseSec，清空 runStartAt
    baseSecRef.current = recomputeElapsed();
    runStartAtRef.current = null;
    setElapsedSec(baseSecRef.current);
    setIsRunning(false);
  }, [recomputeElapsed]);

  const resume = useCallback(() => {
    if (finishFiredRef.current) return;
    if (runStartAtRef.current == null) {
      runStartAtRef.current = Date.now();
    }
    setIsRunning(true);
  }, []);

  const stop = useCallback(() => commitAndReset(), [commitAndReset]);

  // 整分钟回调 + 结束判断
  const checkMinuteAndFinish = useCallback((elapsed: number, total: number) => {
    const curMinute = Math.floor(elapsed / 60);
    if (curMinute > lastTickedMinuteRef.current && onMinuteTickRef.current && activeTaskRef.current && activeModuleRef.current) {
      lastTickedMinuteRef.current = curMinute;
      const tid = activeTaskRef.current;
      const mod = activeModuleRef.current;
      setTimeout(() => onMinuteTickRef.current?.(tid, mod, curMinute), 0);
    }
    if (total > 0 && elapsed >= total && !finishFiredRef.current) {
      finishFiredRef.current = true;
      // 暂停：把最终 elapsed 固定进 baseSec
      baseSecRef.current = elapsed;
      runStartAtRef.current = null;
      setIsRunning(false);
      setHasFinished(true);
      setElapsedSec(total);
      playAlarm();
    }
  }, []);

  // 主 tick（每 250ms）
  useEffect(() => {
    if (!isRunning) return;
    const tick = () => {
      const elapsed = recomputeElapsed();
      setElapsedSec(elapsed);
      checkMinuteAndFinish(elapsed, durationSec);
    };
    tick();
    intervalRef.current = setInterval(tick, 250);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, recomputeElapsed, checkMinuteAndFinish, durationSec]);

  // visibility / focus 回来立即对时
  useEffect(() => {
    const onVisible = () => {
      if (document.hidden) return;
      const elapsed = recomputeElapsed();
      setElapsedSec(elapsed);
      checkMinuteAndFinish(elapsed, durationSec);
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [recomputeElapsed, checkMinuteAndFinish, durationSec]);

  // 卸载时结算
  useEffect(() => {
    return () => {
      const elapsed = recomputeElapsed();
      if (activeTaskRef.current && activeModuleRef.current && elapsed > 0) {
        const minutes = Math.round(elapsed / 60);
        if (minutes > 0) onCommitRef.current(activeTaskRef.current, activeModuleRef.current, minutes);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const remainingSec = Math.max(0, durationSec - elapsedSec);
  const progress = durationSec > 0 ? Math.min(100, (elapsedSec / durationSec) * 100) : 0;

  return {
    activeTaskId,
    activeModule,
    durationSec,
    elapsedSec,
    remainingSec,
    progress,
    isRunning,
    hasFinished,
    start,
    pause,
    resume,
    stop,
  };
}

function playAlarm() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.4, 0.8].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.3);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.3);
    });
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('学习时间到', { body: '计时已结束,休息一下吧!' });
    }
  } catch (e) {
    console.error('闹钟播放失败:', e);
  }
}
