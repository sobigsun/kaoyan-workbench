import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useTimer } from '../hooks/useTimer';
import { AppData, ModuleType } from '../types';
import { todayStr } from '../utils/date';

interface TaskTimerSync {
  content: string;
  module: ModuleType;
  remainingSec: number;
  progress: number;
  isRunning: boolean;
  hasFinished: boolean;
  pause: () => void;
  resume: () => void;
  stop: () => void;
}

interface TimerPanelProps {
  data: AppData;
  onUpdateData: (data: AppData) => void;
  // 任务计时同步状态：存在时进入同步模式，圆形进度条与任务计时共用同一数据源
  taskTimer?: TaskTimerSync | null;
}

const MODULE_LABELS: Record<ModuleType, string> = {
  english: '英语',
  education: '教育',
  politics: '政治',
};

const MODULE_BADGE: Record<ModuleType, string> = {
  english: 'bg-green-100 text-green-700',
  education: 'bg-yellow-100 text-yellow-700',
  politics: 'bg-red-100 text-red-700',
};

const MODULE_COLORS: Record<ModuleType, { active: string; text: string }> = {
  english: { active: 'bg-green-500 text-white', text: 'text-green-700' },
  education: { active: 'bg-yellow-500 text-white', text: 'text-yellow-700' },
  politics: { active: 'bg-red-500 text-white', text: 'text-red-700' },
};

const FOCUS_PRESETS = [15, 25, 45, 60];
const BREAK_PRESETS = [5, 10, 15, 20];

export default function TimerPanel({ data, onUpdateData, taskTimer }: TimerPanelProps) {
  const [selectedModule, setSelectedModule] = useState<ModuleType>('english');
  const [collapsed, setCollapsed] = useState(true);
  // 可调节的专注/休息时长
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [customFocus, setCustomFocus] = useState('');
  const [customBreak, setCustomBreak] = useState('');

  // 同步模式：有任务计时时，番茄钟显示任务的时间与进度
  const isSyncMode = !!taskTimer;

  // 任务开始时自动展开
  useEffect(() => {
    if (isSyncMode) setCollapsed(false);
  }, [isSyncMode]);

  // 用 ref 持有最新值，保证番茄钟完成时拿到正确的 focusMinutes
  const dataRef = useRef(data);
  dataRef.current = data;
  const moduleRef = useRef(selectedModule);
  moduleRef.current = selectedModule;
  const updateRef = useRef(onUpdateData);
  updateRef.current = onUpdateData;
  const focusMinutesRef = useRef(focusMinutes);
  focusMinutesRef.current = focusMinutes;

  // 番茄钟完成回调：写入今日番茄钟记录 + 学习时长（全局与分科目）
  const handleComplete = useCallback(() => {
    const today = todayStr();
    const mod = moduleRef.current;
    const cur = dataRef.current;
    const mins = focusMinutesRef.current;

    const newPomodoroRecords = (() => {
      const existing = cur.pomodoroRecords.find((r) => r.date === today);
      if (existing) {
        const byModule = { ...(existing.byModule || {}) };
        const prev = byModule[mod] || { count: 0, minutes: 0 };
        byModule[mod] = { count: prev.count + 1, minutes: prev.minutes + mins };
        return cur.pomodoroRecords.map((r) =>
          r.date === today
            ? { ...r, count: r.count + 1, totalMinutes: r.totalMinutes + mins, byModule }
            : r
        );
      }
      return [
        ...cur.pomodoroRecords,
        {
          date: today,
          count: 1,
          totalMinutes: mins,
          byModule: { [mod]: { count: 1, minutes: mins } },
        },
      ];
    })();

    const newStudyDurations = {
      ...cur.studyDurations,
      [today]: (cur.studyDurations[today] || 0) + mins,
    };

    const todayByModule = { ...(cur.studyDurationsByModule?.[today] || {}) };
    todayByModule[mod] = (todayByModule[mod] || 0) + mins;
    const newStudyDurationsByModule = {
      ...cur.studyDurationsByModule,
      [today]: todayByModule,
    };

    updateRef.current({
      ...cur,
      pomodoroRecords: newPomodoroRecords,
      studyDurations: newStudyDurations,
      studyDurationsByModule: newStudyDurationsByModule,
    });
  }, []);

  const {
    timeLeft,
    isRunning,
    isBreak,
    completedCount,
    start,
    pause,
    reset,
    toggleBreak,
  } = useTimer({ initialMinutes: 25, onComplete: handleComplete });

  // 圆形进度条参数
  const circumference = 2 * Math.PI * 80;

  let displayMinutes: number;
  let displaySeconds: number;
  let progressValue: number;
  let strokeColor: string;
  let statusText: string;

  if (isSyncMode) {
    displayMinutes = Math.floor(taskTimer!.remainingSec / 60);
    displaySeconds = taskTimer!.remainingSec % 60;
    progressValue = taskTimer!.progress / 100;
    strokeColor = taskTimer!.hasFinished ? '#22c55e' : '#3b82f6';
    statusText = taskTimer!.hasFinished ? '完成!' : taskTimer!.isRunning ? '进行中...' : '暂停';
  } else {
    const totalSeconds = isBreak ? breakMinutes * 60 : focusMinutes * 60;
    displayMinutes = Math.floor(timeLeft / 60);
    displaySeconds = timeLeft % 60;
    progressValue = totalSeconds > 0 ? timeLeft / totalSeconds : 0;
    strokeColor = isBreak ? '#22c55e' : '#3b82f6';
    statusText = isRunning ? '进行中...' : timeLeft === 0 ? '完成!' : '暂停';
  }

  const strokeDashoffset = circumference * (1 - progressValue);

  // 今日该科目已完成的番茄钟次数
  const todayPomodoro = data.pomodoroRecords.find((r) => r.date === todayStr());
  const todayModuleCount = todayPomodoro?.byModule?.[selectedModule]?.count || 0;

  // 收起状态
  if (collapsed) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-lg flex-shrink-0">⏱</span>
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-800">
                {isSyncMode ? '任务专注中' : '番茄钟'}
              </div>
              {isSyncMode ? (
                <div className="text-xs text-gray-500 truncate">
                  {taskTimer!.hasFinished ? '⏰ 时间到 · ' : taskTimer!.isRunning ? '' : '已暂停 · '}
                  {String(displayMinutes).padStart(2, '0')}:{String(displaySeconds).padStart(2, '0')}
                  {' · '}
                  <span className={`inline-block px-1 py-0.5 rounded text-[10px] ${MODULE_BADGE[taskTimer!.module]}`}>
                    {MODULE_LABELS[taskTimer!.module]}
                  </span>
                  {' '}
                  {taskTimer!.content}
                </div>
              ) : (
                <div className="text-xs text-gray-400">
                  {isBreak ? `${breakMinutes}分钟休息` : `${focusMinutes}分钟专注`}
                  {' · 点击展开'}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setCollapsed(false)}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors flex-shrink-0"
            title="展开"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // 展开状态
  return (
    <div className="bg-white rounded-2xl shadow-sm border p-6 flex flex-col items-center">
      {/* 标题 + 收起按钮 */}
      <div className="w-full flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">
          {isSyncMode
            ? (taskTimer!.hasFinished ? '⏰ 时间到' : '任务专注中')
            : (isBreak ? '休息时间' : '专注学习')}
        </h3>
        <button
          onClick={() => setCollapsed(true)}
          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
          title="收起"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M18 15l-6-6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* 同步模式：显示当前任务信息；独立模式：显示科目+时间选择器 */}
      {isSyncMode ? (
        <div className="mb-4 text-center px-2">
          <span className={`inline-block px-2 py-0.5 text-xs rounded mr-2 ${MODULE_BADGE[taskTimer!.module]}`}>
            {MODULE_LABELS[taskTimer!.module]}
          </span>
          <span className="text-sm text-gray-700">{taskTimer!.content}</span>
        </div>
      ) : (
        <div className="w-full max-w-xs space-y-3 mb-4">
          {/* 科目选择 */}
          <div className="flex gap-2">
            {(Object.keys(MODULE_LABELS) as ModuleType[]).map((mod) => {
              const mc = MODULE_COLORS[mod];
              const active = selectedModule === mod;
              return (
                <button
                  key={mod}
                  onClick={() => setSelectedModule(mod)}
                  disabled={isRunning}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    active ? mc.active : 'bg-gray-100 text-gray-500'
                  } ${isRunning ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}`}
                  title={isRunning ? '运行中无法切换科目' : '选择当前番茄钟学习的科目'}
                >
                  {MODULE_LABELS[mod]}
                </button>
              );
            })}
          </div>

          {/* 时间选择：专注时长 / 休息时长 tab 切换 */}
          {(() => {
            const label = isBreak ? '休息时长' : '专注时长';
            const cur = isBreak ? breakMinutes : focusMinutes;
            const presets = isBreak ? BREAK_PRESETS : FOCUS_PRESETS;
            const customVal = isBreak ? customBreak : customFocus;
            const setCustom = isBreak ? setCustomBreak : setCustomFocus;
            const setMins = isBreak ? setBreakMinutes : setFocusMinutes;

            const applyMinutes = (m: number) => {
              if (isRunning) return;
              if (m < 1 || m > 600) return;
              setMins(m);
              // 同步重置 timeLeft 到新的时间
              if (isBreak) {
                reset(m);
              } else {
                // 当前是专注模式：直接 reset(m) 即可
                // reset 会把 isBreak 设为 false，这里本来就是 false，所以没问题
                reset(m);
              }
            };

            const applyCustom = () => {
              const m = parseInt(customVal, 10);
              if (!m || m <= 0) return;
              applyMinutes(m);
              setCustom('');
            };

            const toggleMode = () => {
              if (isRunning) return;
              toggleBreak({ focusMinutes, breakMinutes });
            };

            return (
              <div className="bg-gray-50 rounded-xl p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-600">
                    {label}（当前 {cur} 分钟）
                  </span>
                  <button
                    onClick={toggleMode}
                    disabled={isRunning}
                    className={`text-[11px] px-2 py-0.5 rounded ${
                      isBreak
                        ? 'bg-green-100 text-green-600'
                        : 'bg-blue-100 text-blue-600'
                    } ${isRunning ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'}`}
                  >
                    {isBreak ? '切到专注' : '切到休息'}
                  </button>
                </div>
                {/* 预设按钮 */}
                <div className="grid grid-cols-4 gap-1.5">
                  {presets.map((p) => {
                    const active = p === cur && !customVal;
                    return (
                      <button
                        key={p}
                        onClick={() => applyMinutes(p)}
                        disabled={isRunning}
                        className={`py-1.5 rounded-md text-xs font-medium transition-colors ${
                          active
                            ? 'bg-primary-500 text-white'
                            : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300'
                        } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {p}分
                      </button>
                    );
                  })}
                </div>
                {/* 自定义输入 */}
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    value={customVal}
                    onChange={(e) => setCustom(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') applyCustom();
                    }}
                    placeholder="自定义(1-600分钟)"
                    min={1}
                    max={600}
                    disabled={isRunning}
                    className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-primary-400 disabled:opacity-50"
                  />
                  <button
                    onClick={applyCustom}
                    disabled={isRunning || !customVal || parseInt(customVal, 10) <= 0}
                    className="px-3 py-1 text-xs bg-primary-500 text-white rounded-md hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    应用
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* 圆形进度条（同步模式与独立模式共用） */}
      <div className="relative mb-4">
        <svg width="180" height="180" viewBox="0 0 180 180">
          <circle cx="90" cy="90" r="80" fill="none" stroke="#f3f4f6" strokeWidth="8" />
          <circle
            cx="90" cy="90" r="80"
            fill="none"
            stroke={strokeColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 90 90)"
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-semibold text-gray-800 tabular-nums">
            {String(displayMinutes).padStart(2, '0')}:{String(displaySeconds).padStart(2, '0')}
          </span>
          <span className="text-xs text-gray-400 mt-1">{statusText}</span>
        </div>
      </div>

      {/* 控制按钮 */}
      {isSyncMode ? (
        <div className="flex gap-3 flex-wrap justify-center">
          {taskTimer!.hasFinished ? (
            <button
              onClick={taskTimer!.stop}
              className="px-6 py-2 bg-green-500 text-white rounded-full text-sm font-medium hover:bg-green-600"
            >
              记录学习时长
            </button>
          ) : taskTimer!.isRunning ? (
            <button
              onClick={taskTimer!.pause}
              className="px-6 py-2 bg-yellow-500 text-white rounded-full text-sm font-medium hover:bg-yellow-600"
            >
              暂停
            </button>
          ) : (
            <button
              onClick={taskTimer!.resume}
              className="px-6 py-2 bg-primary-500 text-white rounded-full text-sm font-medium hover:bg-primary-600"
            >
              继续
            </button>
          )}
          {!taskTimer!.hasFinished && (
            <button
              onClick={taskTimer!.stop}
              className="px-6 py-2 bg-gray-200 text-gray-600 rounded-full text-sm font-medium hover:bg-gray-300"
            >
              停止并记录
            </button>
          )}
        </div>
      ) : (
        <div className="flex gap-3 flex-wrap justify-center">
          {!isRunning && timeLeft > 0 && (
            <button onClick={start} className="px-6 py-2 bg-primary-500 text-white rounded-full text-sm font-medium hover:bg-primary-600">
              开始
            </button>
          )}
          {isRunning && (
            <button onClick={pause} className="px-6 py-2 bg-yellow-500 text-white rounded-full text-sm font-medium hover:bg-yellow-600">
              暂停
            </button>
          )}
          <button
            onClick={() => reset(isBreak ? breakMinutes : focusMinutes)}
            className="px-6 py-2 bg-gray-200 text-gray-600 rounded-full text-sm font-medium hover:bg-gray-300"
          >
            重置
          </button>
          <button
            onClick={() => toggleBreak({ focusMinutes, breakMinutes })}
            className="px-6 py-2 bg-gray-200 text-gray-600 rounded-full text-sm font-medium hover:bg-gray-300"
          >
            {isBreak ? '切换到专注' : '切换到休息'}
          </button>
        </div>
      )}

      {/* 底部信息：仅独立模式显示 */}
      {!isSyncMode && (
        <>
          <div className="mt-3 text-sm text-gray-500 text-center">
            {completedCount > 0 ? (
              <>本次会话已完成: {completedCount} 个番茄钟 ({completedCount * focusMinutes} 分钟)</>
            ) : (
              <>选择科目和时间后开始专注，完成将自动记录学习时长</>
            )}
          </div>
          {todayModuleCount > 0 && (
            <div className="mt-1 text-xs text-gray-400">
              今日{MODULE_LABELS[selectedModule]}已累计 {todayModuleCount} 个番茄钟
            </div>
          )}
        </>
      )}
    </div>
  );
}
