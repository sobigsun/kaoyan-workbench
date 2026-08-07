import { useState, useEffect, useRef, useCallback } from 'react';

interface UseTimerOptions {
  initialMinutes?: number;
  // 专注阶段倒计时结束（一个番茄钟完成）时触发
  onComplete?: () => void;
}

export function useTimer({ initialMinutes = 25, onComplete }: UseTimerOptions = {}) {
  const [timeLeft, setTimeLeft] = useState(initialMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // 用 ref 持有最新回调，避免 effect 频繁重建定时器
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const start = useCallback(() => {
    setIsRunning(true);
  }, []);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const reset = useCallback((minutes?: number) => {
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
    setIsRunning(false);
  }, [initialMinutes]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            if (!isBreak) {
              setCompletedCount((c) => c + 1);
              // 专注阶段结束，触发完成回调
              try {
                onCompleteRef.current?.();
              } catch (e) {
                console.error('onComplete callback error:', e);
              }
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, isBreak]);

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
  };
}