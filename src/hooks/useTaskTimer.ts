import { useState, useEffect, useRef, useCallback } from 'react';
import { ModuleType } from '../types';

interface UseTaskTimerOptions {
  onCommit: (taskId: string, module: ModuleType, minutes: number) => void;
  // 每整分钟触发一次（elapsedMinutes 从 1 开始递增）
  onMinuteTick?: (taskId: string, module: ModuleType, elapsedMinutes: number) => void;
}

export function useTaskTimer({ onCommit, onMinuteTick }: UseTaskTimerOptions) {
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [activeModule, setActiveModule] = useState<ModuleType | null>(null);
  const [durationSec, setDurationSec] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [hasFinished, setHasFinished] = useState(false);
  // 已触发过 onMinuteTick 的分钟数，避免重复触发
  const lastTickedMinuteRef = useRef(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCommitRef = useRef(onCommit);
  useEffect(() => {
    onCommitRef.current = onCommit;
  }, [onCommit]);
  const onMinuteTickRef = useRef(onMinuteTick);
  useEffect(() => {
    onMinuteTickRef.current = onMinuteTick;
  }, [onMinuteTick]);

  const commitAndReset = useCallback(() => {
    if (activeTaskId && activeModule && elapsedSec > 0) {
      const minutes = Math.round(elapsedSec / 60);
      if (minutes > 0) {
        onCommitRef.current(activeTaskId, activeModule, minutes);
      }
    }
    setActiveTaskId(null);
    setActiveModule(null);
    setDurationSec(0);
    setElapsedSec(0);
    setIsRunning(false);
    setHasFinished(false);
  }, [activeTaskId, activeModule, elapsedSec]);

  const start = useCallback(
    (taskId: string, module: ModuleType, minutes: number) => {
      if (activeTaskId && activeModule && elapsedSec > 0) {
        const prevMinutes = Math.round(elapsedSec / 60);
        if (prevMinutes > 0) {
          onCommitRef.current(activeTaskId, activeModule, prevMinutes);
        }
      }
      setActiveTaskId(taskId);
      setActiveModule(module);
      setDurationSec(minutes * 60);
      setElapsedSec(0);
      setIsRunning(true);
      setHasFinished(false);
      lastTickedMinuteRef.current = 0;
    },
    [activeTaskId, activeModule, elapsedSec]
  );

  const pause = useCallback(() => setIsRunning(false), []);
  const resume = useCallback(() => {
    if (!hasFinished) setIsRunning(true);
  }, [hasFinished]);
  const stop = useCallback(() => commitAndReset(), [commitAndReset]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsedSec((prev) => {
          const next = prev + 1;
          // 整分钟触发回调（用 floor(next/60) 判断新分钟）
          const curMinute = Math.floor(next / 60);
          if (curMinute > lastTickedMinuteRef.current && onMinuteTickRef.current && activeTaskId && activeModule) {
            lastTickedMinuteRef.current = curMinute;
            // 异步触发避免在 setState 回调里同步调用其他 setState
            const tid = activeTaskId;
            const mod = activeModule;
            setTimeout(() => onMinuteTickRef.current?.(tid, mod, curMinute), 0);
          }
          if (next >= durationSec) {
            setIsRunning(false);
            setHasFinished(true);
            return durationSec;
          }
          return next;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, durationSec, activeTaskId, activeModule]);

  useEffect(() => {
    if (hasFinished) {
      playAlarm();
    }
  }, [hasFinished]);

  useEffect(() => {
    return () => {
      if (activeTaskId && activeModule && elapsedSec > 0) {
        const minutes = Math.round(elapsedSec / 60);
        if (minutes > 0) {
          onCommitRef.current(activeTaskId, activeModule, minutes);
        }
      }
    };
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
    if (Notification in window && Notification.permission === 'granted') {
      new Notification('学习时间到', { body: '计时已结束,休息一下吧!' });
    }
  } catch (e) {
    console.error('闹钟播放失败:', e);
  }
}
