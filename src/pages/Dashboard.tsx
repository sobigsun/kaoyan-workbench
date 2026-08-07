import React, { useState, useCallback, useMemo } from 'react';
import { AppData, StudyPlan, PlanTask, ModuleType } from '../types';
import ProgressBar from '../components/ProgressBar';
import StudyCalendar from '../components/StudyCalendar';
import TimerPanel from '../components/TimerPanel';
import StudyTrendChart from '../components/StudyTrendChart';
import { useTaskTimer } from '../hooks/useTaskTimer';
import { awardTaskDone, awardFocus, addPointRecord } from '../utils/pointsLogic';
import { emitFloatPoints } from '../components/FloatingPoints';
import { todayStr, daysUntil, formatDate, formatTime } from '../utils/date';
import { TimerIcon, CalendarIcon, TrendIcon } from '../components/Icons';
import { getModuleLabels, getModuleColors, getModuleLightColors } from '../utils/modules';

interface DashboardProps {
  data: AppData;
  onUpdateData: (data: AppData) => void;
  dailyQuote?: string;
}

export default function Dashboard({ data, onUpdateData, dailyQuote }: DashboardProps) {
  const today = todayStr();
  const [showTimer, setShowTimer] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTrend, setShowTrend] = useState(false); // 默认收起
  const [newTask, setNewTask] = useState('');
  const [editingSettings, setEditingSettings] = useState(false);
  const [tempTargetDate, setTempTargetDate] = useState(data.settings.targetDate);
  const [tempGoal, setTempGoal] = useState(data.settings.dailyGoal);
  const [tempWordGoal, setTempWordGoal] = useState(data.settings.dailyWordGoal);

  const daysLeft = daysUntil(data.settings.targetDate);

  // 学科列表与映射（从 data.subjects 动态生成，替代硬编码的 english/education/politics）
  const subjects = data.subjects ?? [];
  const MODULE_LABELS = getModuleLabels(subjects);
  const MODULE_COLORS = getModuleColors(subjects);
  const MODULE_LIGHT_COLORS = getModuleLightColors(subjects);

  // 近 14 天总学习 + 日均，用于「学习趋势」收起态摘要
  const trendSummary = useMemo(() => {
    let total = 0;
    let activeDays = 0;
    for (let i = 0; i < 14; i++) {
      const d = (() => {
        const dt = new Date(today);
        dt.setDate(dt.getDate() - i);
        return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
      })();
      const m = data.studyDurations?.[d] ?? 0;
      total += m;
      if (m > 0) activeDays++;
    }
    const avg = Math.round(total / Math.max(1, 14));
    return { total, avg, activeDays };
  }, [today, data.studyDurations]);

  // 今日计划
  const todayPlan = data.plans.find((p) => p.date === today);
  const tasks = todayPlan?.tasks || [];

  // 任务计时器：点击「开始」后计时，完成或停止时把学习时长写入今日总时长与分科目时长
  const handleCommit = useCallback(
    (_taskId: string, module: ModuleType, minutes: number) => {
      if (minutes <= 0) return;
      const t = todayStr();
      const newStudyDurations = {
        ...data.studyDurations,
        [t]: (data.studyDurations[t] || 0) + minutes,
      };
      const todayByModule = { ...(data.studyDurationsByModule?.[t] || {}) };
      todayByModule[module] = (todayByModule[module] || 0) + minutes;
      const newStudyDurationsByModule = {
        ...data.studyDurationsByModule,
        [t]: todayByModule,
      };
      let next: AppData = {
        ...data,
        studyDurations: newStudyDurations,
        studyDurationsByModule: newStudyDurationsByModule,
      };
      // 专注时长金币奖励
      next = awardFocus(next, minutes);
      // 漂浮动画：根据专注奖励金额飘出对应数量 +1
      const prevBalance = data.points.balance;
      const newBalance = next.points.balance;
      const gained = newBalance - prevBalance;
      if (gained > 0) emitFloatPoints(gained, '专注奖励');
      onUpdateData(next);
    },
    [data, onUpdateData]
  );

  const {
    activeTaskId,
    remainingSec,
    progress,
    isRunning,
    hasFinished,
    pause,
    resume,
    stop,
  } = useTaskTimer({
    onCommit: handleCommit,
    onMinuteTick: (_tid, _mod, elapsedMinutes) => {
      // 每分钟 +0.5 🪙 金币（立即入账，飘出单个 "+🪙0.5"）
      // 每半小时额外 +5 🪙 金币（飘 5 个 +🪙1）
      let add = 0.5;
      let label = '专注 1 分钟';
      // 半小时里程碑额外奖励
      if (elapsedMinutes > 0 && elapsedMinutes % 30 === 0) {
        add += 5;
        label = `专注 ${elapsedMinutes} 分钟里程碑`;
      }
      const next = addPointRecord(data, add, 'focus', label);
      onUpdateData(next);
      // 先飘 0.5（每分钟都有），如果是半小时节点再飘 5 个 +1（错开动画时机）
      emitFloatPoints(0.5, '专注');
      if (elapsedMinutes > 0 && elapsedMinutes % 30 === 0) {
        setTimeout(() => emitFloatPoints(5, '半小时里程碑'), 500);
      }
    },
  });

  // 选时弹窗状态
  const [pickerTask, setPickerTask] = useState<{ taskId: string; module: ModuleType; content: string } | null>(null);
  const [customMinutes, setCustomMinutes] = useState('');
  const PRESET_MINUTES = [15, 25, 45, 60];

  const confirmStart = (minutes: number) => {
    if (!pickerTask) return;
    if (!minutes || minutes <= 0) return;
    start(pickerTask.taskId, pickerTask.module, minutes);
    setPickerTask(null);
    setCustomMinutes('');
    // 自动打开番茄钟（同步显示任务计时），关闭日历
    setShowCalendar(false);
    setShowTimer(true);
  };

  // 拖拽排序：长按拖动任务可自由调整顺序
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const reorderTasks = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const newPlans = data.plans.map((p) => {
      if (p.date !== today) return p;
      const arr = [...p.tasks];
      const fromIdx = arr.findIndex((t) => t.id === fromId);
      const toIdx = arr.findIndex((t) => t.id === toId);
      if (fromIdx === -1 || toIdx === -1) return p;
      const [moved] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, moved);
      return { ...p, tasks: arr };
    });
    onUpdateData({ ...data, plans: newPlans });
  };

  const addTask = (module: ModuleType) => {
    const content = newTask.trim();
    if (!content) return;
    const task: PlanTask = {
      id: Date.now().toString(),
      module,
      content,
      done: false,
    };
    let newPlans: StudyPlan[];
    if (todayPlan) {
      newPlans = data.plans.map((p) =>
        p.date === today ? { ...p, tasks: [...p.tasks, task] } : p
      );
    } else {
      newPlans = [...data.plans, { id: Date.now().toString(), date: today, tasks: [task] }];
    }
    onUpdateData({ ...data, plans: newPlans });
    setNewTask('');
  };

  const toggleTask = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    const willBeDone = !task?.done;
    const newPlans = data.plans.map((p) => {
      if (p.date !== today) return p;
      return {
        ...p,
        tasks: p.tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)),
      };
    });
    let next: AppData = { ...data, plans: newPlans };
    // 首次标记完成时发放任务奖励
    if (willBeDone) {
      next = awardTaskDone(next, taskId);
      // 漂浮动画：任务完成 +10
      emitFloatPoints(10, '完成任务');
    }
    onUpdateData(next);
  };

  const deleteTask = (taskId: string) => {
    const newPlans = data.plans.map((p) => {
      if (p.date !== today) return p;
      return { ...p, tasks: p.tasks.filter((t) => t.id !== taskId) };
    });
    onUpdateData({ ...data, plans: newPlans });
  };

  // 各模块统计
  // 今日已学时长：以 studyDurations（任务计时/番茄钟统一存储）为主，兼容旧 checkIns
  const todayCheckIns = data.checkIns.filter((c) => c.date === today);
  const todayDuration =
    (data.studyDurations[today] || 0) + todayCheckIns.reduce((sum, c) => sum + c.duration, 0);

  // 各科进度：基于今日计划完成率（每完成一项任务，该科目进度增加）
  const getModuleProgress = (module: ModuleType) => {
    const moduleTasks = tasks.filter((t) => t.module === module);
    if (moduleTasks.length === 0) return { done: 0, total: 0, percent: 0 };
    const done = moduleTasks.filter((t) => t.done).length;
    return {
      done,
      total: moduleTasks.length,
      percent: Math.round((done / moduleTasks.length) * 100),
    };
  };

  // 各学科进度列表（动态遍历，替代原硬编码的 english/education/politics 三个变量）
  const moduleProgressList = subjects.map((s) => ({ ...s, progress: getModuleProgress(s.id) }));

  const saveSettings = () => {
    onUpdateData({
      ...data,
      settings: {
        targetDate: tempTargetDate,
        dailyGoal: tempGoal,
        dailyWordGoal: tempWordGoal,
      },
    });
    setEditingSettings(false);
  };

  const checkInDates = data.checkIns
    .filter((c) => c.tasksCompleted > 0)
    .map((c) => c.date);

  // 当前活动任务（用于番茄钟同步显示）
  const activeTask = activeTaskId ? tasks.find((t) => t.id === activeTaskId) : null;

  return (
    <div className="pb-4 space-y-4">
      {/* 每日励志语卡片（主题色背景+边框） */}
      {dailyQuote && (
        <div
          className="rounded-2xl shadow-sm border p-4 overflow-hidden"
          style={{
            backgroundColor: 'rgb(var(--color-primary-50, 239 246 255))',
            borderColor: 'rgb(var(--color-primary-200, 191 219 254))',
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-inner"
              style={{
                backgroundColor: 'rgb(var(--color-primary-100, 219 234 254))',
              }}
            >
              💡
            </div>
            <div className="flex-1 min-w-0">
              <div
                className="text-xs font-semibold mb-1 flex items-center gap-1"
                style={{ color: 'rgb(var(--color-primary-600, 37 99 235))' }}
              >
                <span>今日金句</span>
                <span
                  className="inline-block w-1 h-1 rounded-full"
                  style={{ backgroundColor: 'rgb(var(--color-primary-500, 59 130 246))' }}
                />
                <span
                  className="inline-block w-1 h-1 rounded-full"
                  style={{ backgroundColor: 'rgb(var(--color-primary-400, 96 165 250))' }}
                />
              </div>
              <p
                className="text-sm leading-relaxed font-medium"
                style={{ color: 'rgb(var(--color-primary-800, 30 64 175))' }}
              >
                {dailyQuote}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 顶部设置区 — 焦点卡片（shadow-md + 主题色边框） */}
      <div
        className="rounded-2xl p-4 border"
        style={{
          backgroundColor: '#FFFDF9',
          boxShadow: '0 4px 12px rgba(61,51,40,0.08)',
          borderColor: 'rgb(var(--color-primary-200, 191 219 254))',
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">考研倒计时</h2>
          <button
            onClick={() => setEditingSettings(!editingSettings)}
            className="text-xs text-primary-500"
          >
            设置
          </button>
        </div>

        {editingSettings ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500">考研日期</label>
              <input
                type="date"
                value={tempTargetDate}
                onChange={(e) => setTempTargetDate(e.target.value)}
                className="w-full mt-1 p-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">每日学习时长目标（分钟）</label>
              <input
                type="number"
                value={tempGoal}
                onChange={(e) => setTempGoal(Number(e.target.value))}
                className="w-full mt-1 p-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">每日单词目标</label>
              <input
                type="number"
                value={tempWordGoal}
                onChange={(e) => setTempWordGoal(Number(e.target.value))}
                className="w-full mt-1 p-2 border rounded-lg text-sm"
              />
            </div>
            <button
              onClick={saveSettings}
              className="w-full py-2 bg-primary-500 text-white rounded-lg text-sm"
            >
              保存设置
            </button>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-5xl font-semibold text-primary-600">{daysLeft}</div>
            <div className="text-sm text-gray-500 mt-1">
              距离 {formatDate(data.settings.targetDate)} 还有 {daysLeft} 天
            </div>
            <div className="mt-3 text-sm text-gray-500">
              今日已学 {formatTime(todayDuration)} / 目标 {formatTime(data.settings.dailyGoal)}
            </div>
          </div>
        )}
      </div>

      {/* 快捷入口 */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => { setShowCalendar(false); setShowTrend(false); setShowTimer(!showTimer); }}
          className="p-4 rounded-2xl shadow-sm border text-left hover:shadow-md transition-shadow"
          style={{ backgroundColor: '#FFFDF9', borderColor: 'var(--border-card)' }}
        >
          <div className="mb-1 text-gray-700"><TimerIcon size={26} /></div>
          <div className="text-sm font-medium">番茄钟</div>
          <div className="text-xs text-gray-400">25分钟专注</div>
        </button>
        <button
          onClick={() => { setShowTimer(false); setShowTrend(false); setShowCalendar(!showCalendar); }}
          className="p-4 rounded-2xl shadow-sm border text-left hover:shadow-md transition-shadow"
          style={{ backgroundColor: '#FFFDF9', borderColor: 'var(--border-card)' }}
        >
          <div className="mb-1 text-gray-700"><CalendarIcon size={26} /></div>
          <div className="text-sm font-medium">学习日历</div>
          <div className="text-xs text-gray-400">查看学习记录</div>
        </button>
        <button
          onClick={() => { setShowTimer(false); setShowCalendar(false); setShowTrend(!showTrend); }}
          className={`p-4 rounded-2xl shadow-sm border text-left hover:shadow-md transition-shadow ${
            showTrend ? 'ring-2 ring-primary-300' : ''
          }`}
          style={{
            backgroundColor: showTrend ? 'rgb(var(--color-primary-50, 239 246 255))' : '#FFFDF9',
            borderColor: showTrend ? 'rgb(var(--color-primary-200, 191 219 254))' : 'var(--border-card)',
          }}
        >
          <div className="mb-1 text-gray-700"><TrendIcon size={26} /></div>
          <div className="text-sm font-medium">学习趋势</div>
          <div className="text-xs text-gray-400">近14天共学习 {formatTime(trendSummary.total)}</div>
        </button>
      </div>

      {showTimer && (
        <TimerPanel
          data={data}
          onUpdateData={onUpdateData}
          taskTimer={activeTask ? {
            content: activeTask.content,
            module: activeTask.module,
            remainingSec,
            progress,
            isRunning,
            hasFinished,
            pause,
            resume,
            stop,
          } : null}
        />
      )}
      {showCalendar && <StudyCalendar durations={data.studyDurations} checkIns={checkInDates} />}
      {showTrend && (
        <div className="rounded-2xl shadow-sm border p-4 relative" style={{ backgroundColor: '#FFFDF9', borderColor: 'var(--border-card)' }}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <span>📈</span>
              学习趋势曲线
            </h2>
            <button
              onClick={() => setShowTrend(false)}
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
              title="收起学习趋势"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="rotate-180">
                <path d="M18 15l-6-6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <StudyTrendChart
            totalDurations={data.studyDurations}
            moduleDurations={data.studyDurationsByModule}
            subjects={data.subjects ?? []}
            defaultRange={14}
          />
        </div>
      )}

      {/* 各科进度（基于今日计划完成率） */}
      <div className="rounded-2xl shadow-sm border p-4" style={{ backgroundColor: '#FFFDF9', borderColor: 'var(--border-card)' }}>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">各科进度</h2>
        <div className="space-y-3">
          {moduleProgressList.map((s) => (
            <ProgressBar
              key={s.id}
              label={`${MODULE_LABELS[s.id] ?? s.id} ${s.progress.done}/${s.progress.total}`}
              value={s.progress.percent}
              max={100}
              color={MODULE_COLORS[s.id] ?? 'bg-gray-500'}
            />
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">完成今日计划中的任务，对应科目进度会自动增加</p>
      </div>

      {/* 今日计划 */}
      <div className="rounded-2xl shadow-sm border p-4" style={{ backgroundColor: '#FFFDF9', borderColor: 'var(--border-card)' }}>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">
          今日计划
          <span className="text-sm font-normal text-gray-400 ml-2">
            {tasks.filter((t) => t.done).length}/{tasks.length}
          </span>
        </h2>

        {/* 任务计时卡片：番茄钟未打开时在此显示，番茄钟打开后移至番茄钟面板同步显示 */}
        {activeTaskId && !showTimer && (() => {
          const activeTask = tasks.find((t) => t.id === activeTaskId);
          if (!activeTask) return null;
          const mins = Math.floor(remainingSec / 60);
          const secs = remainingSec % 60;
          return (
            <div
              className="mb-3 p-3 rounded-xl border"
              style={{
                backgroundColor: hasFinished ? '#F5F0EA' : 'rgb(var(--color-primary-50, 239 246 255))',
                borderColor: hasFinished ? 'var(--border-card)' : 'rgb(var(--color-primary-200, 191 219 254))',
              }}
            >
              <div className="flex items-center justify-between mb-2 gap-2">
                <div className="flex-1 min-w-0">
                  <div
                    className="text-xs font-medium mb-0.5"
                    style={{
                      color: hasFinished ? 'var(--text-heading)' : isRunning ? 'rgb(var(--color-primary-600, 37 99 235))' : 'var(--text-muted)',
                    }}
                  >
                    {hasFinished ? '⏰ 时间到' : isRunning ? '● 专注中' : '❚❚ 已暂停'}
                  </div>
                  <div className="text-sm text-gray-800 truncate">{activeTask.content}</div>
                </div>
                <div
                  className="text-xl font-semibold tabular-nums"
                  style={{ color: hasFinished ? 'var(--text-heading)' : 'rgb(var(--color-primary-600, 37 99 235))' }}
                >
                  {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
                </div>
              </div>
              <div className="h-1.5 bg-white rounded-full overflow-hidden mb-2.5">
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${progress}%`,
                    backgroundColor: hasFinished ? 'var(--accent-btn)' : 'rgb(var(--color-primary-500, 59 130 246))',
                  }}
                />
              </div>
              <div className="flex gap-2">
                {hasFinished ? (
                  <button
                    onClick={stop}
                    className="flex-1 py-1.5 text-white rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: 'var(--accent-btn)' }}
                  >
                    记录学习时长
                  </button>
                ) : isRunning ? (
                  <button
                    onClick={pause}
                    className="flex-1 py-1.5 text-white rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: '#8B7E6E' }}
                  >
                    暂停
                  </button>
                ) : (
                  <button
                    onClick={resume}
                    className="flex-1 py-1.5 text-white rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: 'rgb(var(--color-primary-500, 59 130 246))' }}
                  >
                    继续
                  </button>
                )}
                {!hasFinished && (
                  <button
                    onClick={stop}
                    className="flex-1 py-1.5 bg-gray-200 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-300 transition-colors"
                  >
                    停止并记录
                  </button>
                )}
              </div>
            </div>
          );
        })()}

        <div className="space-y-1 mb-3">
          {tasks.length === 0 && (
            <div className="text-sm text-gray-400 text-center py-4">今天还没有计划，快来添加吧</div>
          )}
          {tasks.map((task) => {
            const isActive = activeTaskId === task.id;
            const isDragging = dragId === task.id;
            const isOver = overId === task.id && dragId !== task.id;
            return (
            <div
              key={task.id}
              draggable
              onDragStart={() => setDragId(task.id)}
              onDragOver={(e) => { e.preventDefault(); setOverId(task.id); }}
              onDragEnd={() => { setDragId(null); setOverId(null); }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragId) reorderTasks(dragId, task.id);
                setDragId(null);
                setOverId(null);
              }}
              className={`flex items-center gap-2 px-2 py-1 rounded-lg transition-colors ${
                isActive ? 'bg-blue-50' : 'hover:bg-gray-50'
              } ${isDragging ? 'opacity-40' : ''} ${isOver ? 'border-t-2 border-primary-400' : ''}`}
            >
              {/* 拖拽手柄 */}
              <span
                className="flex-shrink-0 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 select-none"
                title="拖动排序"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="9" cy="6" r="1.5"/>
                  <circle cx="15" cy="6" r="1.5"/>
                  <circle cx="9" cy="12" r="1.5"/>
                  <circle cx="15" cy="12" r="1.5"/>
                  <circle cx="9" cy="18" r="1.5"/>
                  <circle cx="15" cy="18" r="1.5"/>
                </svg>
              </span>
              <input
                type="checkbox"
                checked={task.done}
                onChange={() => toggleTask(task.id)}
                className="w-4 h-4 rounded accent-primary-500 flex-shrink-0"
              />
              <span
                className={`flex-1 text-sm ${task.done ? 'line-through text-gray-400' : 'text-gray-700'}`}
              >
                <span className={`inline-block px-1.5 py-0.5 text-xs rounded mr-2 ${
                  MODULE_LIGHT_COLORS[task.module] ?? 'bg-gray-100 text-gray-700'
                }`}>
                  {MODULE_LABELS[task.module] ?? task.module}
                </span>
                {task.content}
              </span>
              {/* 开始/计时中按钮 */}
              {isActive ? (
                <span className="flex-shrink-0 text-xs text-blue-600 font-medium px-2">
                  {hasFinished ? '已完成' : isRunning ? '计时中' : '暂停'}
                </span>
              ) : (
                <button
                  onClick={() => setPickerTask({ taskId: task.id, module: task.module, content: task.content })}
                  className="flex-shrink-0 px-2.5 py-1 text-xs font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
                  title="开始计时学习"
                >
                  开始
                </button>
              )}
              <button
                onClick={() => deleteTask(task.id)}
                className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                title="删除任务"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M3 6h18 M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2 M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6 M10 11v6 M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            );
          })}
        </div>

        <div className="flex gap-2">
          <input
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addTask(subjects[0]?.id ?? 'english'); }}
            placeholder="添加新任务..."
            className="flex-1 p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-500"
          />
        </div>
        <div className="flex gap-2 mt-2">
          {subjects.map((mod) => (
            <button
              key={mod.id}
              onClick={() => addTask(mod.id)}
              className={`flex-1 py-1.5 text-xs rounded-lg font-medium ${
                MODULE_COLORS[mod.id] ?? 'bg-gray-500'
              } text-white`}
            >
              + {MODULE_LABELS[mod.id] ?? mod.name}
            </button>
          ))}
        </div>
      </div>

      {/* 选时弹窗：开始学习时选择本次时长 */}
      {pickerTask && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => { setPickerTask(null); setCustomMinutes(''); }}
        >
          <div
            className="bg-white rounded-2xl p-5 max-w-xs w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-gray-800 mb-1">选择学习时长</h3>
            <p className="text-xs text-gray-500 mb-4 truncate">
              {MODULE_LABELS[pickerTask.module] ?? pickerTask.module}
              · {pickerTask.content}
            </p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {PRESET_MINUTES.map((m) => (
                <button
                  key={m}
                  onClick={() => confirmStart(m)}
                  className="py-3 bg-primary-50 text-primary-600 rounded-xl text-sm font-medium hover:bg-primary-100 transition-colors"
                >
                  {m} 分钟
                </button>
              ))}
            </div>
            {/* 自定义时长 */}
            <div className="border-t border-gray-100 pt-3">
              <label className="text-xs text-gray-500 mb-1.5 block">自定义时长（分钟）</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  max="600"
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const m = parseInt(customMinutes, 10);
                      if (m > 0) confirmStart(m);
                    }
                  }}
                  placeholder="输入分钟数，如 30"
                  className="flex-1 p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-500"
                  autoFocus
                />
                <button
                  onClick={() => {
                    const m = parseInt(customMinutes, 10);
                    if (m > 0) confirmStart(m);
                  }}
                  disabled={!customMinutes || parseInt(customMinutes, 10) <= 0}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  开始
                </button>
              </div>
            </div>
            <button
              onClick={() => { setPickerTask(null); setCustomMinutes(''); }}
              className="w-full py-2 mt-2 text-xs text-gray-400 hover:text-gray-600"
            >
              取消
            </button>
            <p className="text-center text-[11px] text-gray-400 mt-1">
              倒计时结束会响起闹钟，并自动统计到今日学习时长
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
