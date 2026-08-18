import { useState, useEffect, useRef, useCallback } from 'react';

interface UseTimerOptions {
  initialMinutes?: number;
  // 专注阶段倒计时结束（一个番茄钟完成）时触发
  onComplete?: () => void;
}

/**
 * 番茄钟计时器。
 *
 * 关键点：剩余秒数不再靠 setInterval 纯「prev-1」累加，而是用「结束时间戳 endAt」
 * 与「当前时间 Date.now()」的差值计算。这样即使 WebView 被系统后台冻结几
 * 分钟，回到前台的下一个 tick（或 visibilitychange 事件）也会立刻对齐
 * 真实剩余时间，不会出现"App 切后台时间就停了"的问题。
 */
export function useTimer({ initialMinutes = 25, onComplete }: UseTimerOptions = {}) {
  // 展示用的剩余秒数
  const [timeLeft, setTimeLeft] = useState(initialMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);

  // 内部：结束时间戳（ms）。null 表示当前没有在计时。
  const endAtRef = useRef<number | null>(null);
  // 记录 isBreak 的最新值（避免 setState 回调里用过期值）
  const isBreakRef = useRef(isBreak);
  useEffect(() => {
    isBreakRef.current = isBreak;
  }, [isBreak]);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);
  const completedRef = useRef(false); // 本轮结束回调是否已触发（防重复）

  // 根据 endAt 重新计算剩余秒数
  const recomputeTimeLeft = useCallback((): number => {
    if (endAtRef.current == null) return 0;
    const ms = endAtRef.current - Date.now();
    return Math.max(0, Math.round(ms / 1000));
  }, []);

  const start = useCallback(() => {
    // 以当前 timeLeft 作为基准生成 endAt
    const remaining = timeLeft > 0 ? timeLeft : initialMinutes * 60;
    endAtRef.current = Date.now() + remaining * 1000;
    completedRef.current = false;
    setIsRunning(true);
  }, [timeLeft, initialMinutes]);

  const pause = useCallback(() => {
    // 暂停：先按真实时间算一次当前剩余，把 endAt 清掉
    setTimeLeft((_) => {
      // 不能直接 return recomputeTimeLeft，这里走参数回调保证拿到最新值
      const remaining = endAtRef.current == null
        ? _
        : Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000));
      return remaining;
    });
    endAtRef.current = null;
    setIsRunning(false);
  }, []);

  const reset = useCallback((minutes?: number) => {
    endAtRef.current = null;
    completedRef.current = false;
    setIsRunning(false);
    setIsBreak(false);
    setTimeLeft((minutes ?? initialMinutes) * 60);
  }, [initialMinutes]);

  const toggleBreak = useCallback((opts?: { focusMinutes?: number; breakMinutes?: number }) => {
    setIsBreak((prev) => {
      const next = !prev;
      const focusMins = opts?.focusMinutes ?? initialMinutes;
      const breakMins = opts?.breakMinutes ?? 5;
      setTimeLeft(next ? breakMins * 60 : focusMins * 60);
      return next;
    });
    endAtRef.current = null;
    completedRef.current = false;
    setIsRunning(false);
  }, [initialMinutes]);

  // 主 tick：每 250ms 轮询一次（比 1s 更精细，后台回来对时更快）
  useEffect(() => {
    if (!isRunning) return;
    const tick = () => {
      const remaining = recomputeTimeLeft();
      setTimeLeft(remaining);
      if (remaining <= 0 && !completedRef.current) {
        completedRef.current = true;
        endAtRef.current = null;
        setIsRunning(false);
        if (!isBreakRef.current) {
          setCompletedCount((c) => c + 1);
          try {
            onCompleteRef.current?.();
          } catch (e) {
            console.error('onComplete callback error:', e);
          }
        }
      }
    };
    tick();
    intervalRef.current = setInterval(tick, 250);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, recomputeTimeLeft]);

  // App 切回前台立刻对时一次（避免 setInterval 被系统 throttle）
  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden) {
        const remaining = recomputeTimeLeft();
        setTimeLeft(remaining);
        if (isRunning && remaining <= 0 && !completedRef.current) {
          completedRef.current = true;
          endAtRef.current = null;
          setIsRunning(false);
          if (!isBreakRef.current) {
            setCompletedCount((c) => c + 1);
            try {
              onCompleteRef.current?.();
            } catch (e) {
              console.error('onComplete callback error:', e);
            }
          }
        }
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [isRunning, recomputeTimeLeft]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return {
    timeLeft,
    isRunning,
    isBreak,
    completedCount,
    minutes,
    seconds,
    start,
    pause,
    reset,
    toggleBreak,
    setCompletedCount,
    /** 只读：当前预计的结束时间戳（ms），给原生插件同步用；没计时则 null */
    get endAt() {
      return endAtRef.current;
    },
  };
}
