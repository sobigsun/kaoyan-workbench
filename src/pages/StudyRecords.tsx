import React, { useState, useMemo } from 'react';
import { AppData, ModuleType } from '../types';
import { todayStr, addDays, formatDate } from '../utils/date';
import { getModuleLabels, getModuleColors, getModuleHex, getModuleLightColors } from '../utils/modules';

interface StudyRecordsProps {
  data: AppData;
  onUpdateData: (data: AppData) => void;
}

type RangeKey = 'today' | '3days' | 'week';

const RANGE_LABELS: Record<RangeKey, string> = {
  today: '今天',
  '3days': '三天',
  week: '一周',
};

const RANGE_DAYS: Record<RangeKey, number> = {
  today: 1,
  '3days': 3,
  week: 7,
};

// 预设范围的 key 集合，用于判断某个 tab 是否为预设范围
const PRESET_RANGES: RangeKey[] = ['today', '3days', 'week'];

// 判断当前选中的 tab 是否为某个具体日期
const isDateTab = (tab: string) => !PRESET_RANGES.includes(tab as RangeKey);

export default function StudyRecords({ data, onUpdateData }: StudyRecordsProps) {
  const today = todayStr();

  // 学科列表与映射（从 data.subjects 动态生成，替代硬编码的 english/education/politics）
  const subjects = data.subjects ?? [];
  const MODULE_LABELS = getModuleLabels(subjects);
  const _solidMap = getModuleColors(subjects);
  const _lightMap = getModuleLightColors(subjects);
  const _hexMap = getModuleHex(subjects);
  const MODULE_COLORS: Record<string, { bg: string; text: string; solid: string; light: string }> = {};
  const MODULE_HEX: Record<string, { solid: string; light: string }> = {};
  for (const s of subjects) {
    const solid = _solidMap[s.id] ?? 'bg-gray-500';
    const lightCombined = _lightMap[s.id] ?? 'bg-gray-100 text-gray-700';
    const parts = lightCombined.split(' ');
    const bg = parts.find((p) => p.startsWith('bg-')) ?? 'bg-gray-100';
    const text = parts.find((p) => p.startsWith('text-')) ?? 'text-gray-700';
    MODULE_COLORS[s.id] = { bg, text, solid, light: bg.replace(/-\d+$/, '-50') };
    MODULE_HEX[s.id] = { solid: _hexMap[s.id] ?? '#6b7280', light: '#e5e7eb' };
  }

  const [activeModule, setActiveModule] = useState<ModuleType>(subjects[0]?.id ?? 'english');
  // range 可以是预设范围 key（today/3days/week）或具体日期字符串
  const [range, setRange] = useState<string>('today');

  // 自定义日期分页：从 data.customDateTabs 持久化读取（刷新后保留）
  const customDates = data.customDateTabs || [];
  const [showCalendar, setShowCalendar] = useState(false);

  // 持久化自定义日期分页
  const persistCustomDates = (next: string[]) => {
    onUpdateData({ ...data, customDateTabs: next });
  };

  // 当前选择的时间范围内所有日期
  const dateList = useMemo(() => {
    const list: string[] = [];
    if (isDateTab(range)) {
      // 选中了某个具体日期分页
      list.push(range);
    } else if (range === 'today') {
      list.push(today);
    } else {
      const days = RANGE_DAYS[range as RangeKey];
      for (let i = days - 1; i >= 0; i--) {
        list.push(addDays(today, -i));
      }
    }
    return list;
  }, [range, today]);

  // 每日的任务情况（按选中科目过滤）
  const dailyRecords = useMemo(() => {
    return dateList.map((date) => {
      const plan = data.plans.find((p) => p.date === date);
      const allTasks = plan?.tasks || [];
      const moduleTasks = allTasks.filter((t) => t.module === activeModule);
      const completed = moduleTasks.filter((t) => t.done).length;
      const total = moduleTasks.length;
      // 学习时长：优先按科目读取，没有则用全局值兜底
      const moduleDuration = data.studyDurationsByModule?.[date]?.[activeModule] || 0;
      const globalDuration = data.studyDurations[date] || 0;
      const duration = moduleDuration || globalDuration;
      // 番茄钟：优先按科目读取，没有则用全局值兜底
      const pomodoro = data.pomodoroRecords.find((r) => r.date === date);
      const modulePomodoroCount = pomodoro?.byModule?.[activeModule]?.count || 0;
      const modulePomodoroMinutes = pomodoro?.byModule?.[activeModule]?.minutes || 0;
      return {
        date,
        tasks: moduleTasks,
        completed,
        total,
        duration,
        pomodoroCount: modulePomodoroCount || pomodoro?.count || 0,
        pomodoroMinutes: modulePomodoroMinutes || pomodoro?.totalMinutes || 0,
        percent: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    });
  }, [dateList, data, activeModule]);

  // 汇总
  const summary = useMemo(() => {
    const totalTasks = dailyRecords.reduce((s, r) => s + r.total, 0);
    const completedTasks = dailyRecords.reduce((s, r) => s + r.completed, 0);
    const totalDuration = dailyRecords.reduce((s, r) => s + r.duration, 0);
    const totalPomodoro = dailyRecords.reduce((s, r) => s + r.pomodoroCount, 0);
    return {
      totalTasks,
      completedTasks,
      totalDuration,
      totalPomodoro,
      avgPercent: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    };
  }, [dailyRecords]);

  // 切换任务完成状态
  const toggleTask = (date: string, taskId: string) => {
    const newPlans = data.plans.map((p) => {
      if (p.date !== date) return p;
      return {
        ...p,
        tasks: p.tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)),
      };
    });
    onUpdateData({ ...data, plans: newPlans });
  };

  // 日历状态
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1);
  const firstDay = new Date(calYear, calMonth - 1, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth, 0).getDate();
  const days: (number | null)[] = Array.from({ length: 42 }, (_, i) => {
    const day = i - firstDay + 1;
    return day > 0 && day <= daysInMonth ? day : null;
  });
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  const getDateStr = (day: number) =>
    `${calYear}-${String(calMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const colors = MODULE_COLORS[activeModule] ?? { bg: 'bg-gray-100', text: 'text-gray-700', solid: 'bg-gray-500', light: 'bg-gray-50' };
  const hex = MODULE_HEX[activeModule] ?? { solid: '#6b7280', light: '#e5e7eb' };

  // 单日任务卡片子组件（每个卡片有自己的展开/收起状态）
  const DayCard = (props: {
    record: {
      date: string;
      tasks: any[];
      completed: number;
      total: number;
      duration: number;
      pomodoroCount: number;
      pomodoroMinutes: number;
      percent: number;
    };
    moduleLabel: string;
    colorClasses: { text: string; solid: string };
  }) => {
    const { record, moduleLabel, colorClasses } = props;
    const isToday = record.date === today;
    const [expanded, setExpanded] = useState(true);

    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-3.5">
        {/* 顶部：日期 + 完成情况 + 展开/收起按钮 */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-800">
              {formatDate(record.date)}
            </span>
            {isToday && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                今天
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium ${colorClasses.text}`}>
              {record.completed}/{record.total} · {record.percent}%
            </span>
            {/* 展开/收起按钮 */}
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
              title={expanded ? '收起' : '展开'}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
              >
                <path d="M18 15l-6-6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* 进度条 */}
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2.5">
          <div
            className={`h-full ${colorClasses.solid} transition-all`}
            style={{ width: `${record.percent}%` }}
          />
        </div>

        {/* 任务列表：展开时显示 */}
        {expanded && (
          record.tasks.length === 0 ? (
            <p className="text-xs text-gray-400 py-1">当天无{moduleLabel}任务</p>
          ) : (
            <div className="space-y-1.5">
              {record.tasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => toggleTask(record.date, task.id)}
                  className="flex items-center gap-2 w-full text-left hover:bg-gray-50 p-1 rounded-lg transition-colors"
                >
                  <span
                    className={`w-4 h-4 rounded flex items-center justify-center text-xs flex-shrink-0 ${
                      task.done ? `${colorClasses.solid} text-white` : 'border border-gray-300'
                    }`}
                  >
                    {task.done && '✓'}
                  </span>
                  <span
                    className={`text-xs flex-1 ${
                      task.done ? 'text-gray-400 line-through' : 'text-gray-700'
                    }`}
                  >
                    {task.content}
                  </span>
                </button>
              ))}
            </div>
          )
        )}

        {/* 底部统计 */}
        <div className="flex items-center gap-3 mt-2.5 pt-2.5 border-t border-gray-50 text-xs text-gray-400">
          <span>⏱ {record.duration > 0 ? `${record.duration}分钟` : '无记录'}</span>
          <span>🍅 {record.pomodoroCount} 次</span>
        </div>
      </div>
    );
  };

  // 渲染单日卡片
  const renderDayCard = (record: {
    date: string;
    tasks: any[];
    completed: number;
    total: number;
    duration: number;
    pomodoroCount: number;
    pomodoroMinutes: number;
    percent: number;
  }) => (
    <DayCard
      key={record.date}
      record={record}
      moduleLabel={MODULE_LABELS[activeModule]}
      colorClasses={{ text: colors.text, solid: colors.solid }}
    />
  );

  // 从日历选择日期：加入分页并自动切换过去（限制不能选未来日期）
  const handleSelectDate = (dateStr: string) => {
    // 限制：只能选今天及之前的日期
    if (dateStr > today) {
      return;
    }
    if (!customDates.includes(dateStr)) {
      persistCustomDates([...customDates, dateStr]);
    }
    setRange(dateStr);
    setShowCalendar(false);
  };

  // 移除某个自定义日期分页
  const removeCustomDate = (dateStr: string) => {
    persistCustomDates(customDates.filter((d) => d !== dateStr));
    if (range === dateStr) {
      setRange('today');
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-4 pb-8 space-y-4">
      {/* 科目分页 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-1.5 flex gap-1">
        {(Object.keys(MODULE_LABELS) as ModuleType[]).map((mod) => {
          const mc = MODULE_COLORS[mod];
          return (
            <button
              key={mod}
              onClick={() => setActiveModule(mod)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                activeModule === mod
                  ? `${mc.solid} text-white shadow-sm`
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {MODULE_LABELS[mod]}
            </button>
          );
        })}
      </div>

      {/* 时间范围筛选（含自定义日期分页） + 日历图标 */}
      <div className="space-y-2">
        {/* 第一行：今天 | 三天 | 一周 | 📅（固定4列） */}
        <div className="grid grid-cols-4 gap-2">
          {PRESET_RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`h-9 px-2 rounded-xl text-xs font-medium transition-colors ${
                range === r
                  ? 'bg-gray-800 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
          {/* 日历图标按钮（固定占第一行第4格） */}
          <button
            onClick={() => setShowCalendar(true)}
            className="h-9 flex items-center justify-center rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
            title="选择日期"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="18" rx="2" stroke="#374151" strokeWidth="2"/>
              <path d="M3 10h18M8 2v4 M16 2v4" stroke="#374151" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="12" cy="15" r="1.5" fill="#3b82f6"/>
            </svg>
          </button>
        </div>
        {/* 自定义日期分页（每行4个，自动换行） */}
        {customDates.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {customDates.map((d) => {
              const short = d.slice(5);
              return (
                <button
                  key={d}
                  onClick={() => setRange(d)}
                  className={`h-9 px-2 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                    range === d
                      ? 'bg-gray-800 text-white'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <span className="truncate">{short}</span>
                  <span
                    role="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeCustomDate(d);
                    }}
                    className={`flex-shrink-0 w-3.5 h-3.5 flex items-center justify-center rounded-full text-[10px] ${
                      range === d ? 'hover:bg-white/20' : 'hover:bg-gray-200 text-gray-400'
                    }`}
                    title="移除该日期"
                  >
                    ×
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 汇总卡片 */}
      <div className={`${colors.light} rounded-2xl p-4 border border-gray-100`}>
        <h3 className="text-sm font-semibold text-gray-800 mb-3">
          {MODULE_LABELS[activeModule]} · {isDateTab(range) ? formatDate(range) : RANGE_LABELS[range as RangeKey]}汇总
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className={`text-2xl font-semibold ${colors.text}`}>{summary.completedTasks}</div>
            <div className="text-xs text-gray-500 mt-0.5">已完成任务</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-semibold ${colors.text}`}>{summary.avgPercent}%</div>
            <div className="text-xs text-gray-500 mt-0.5">完成率</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-semibold ${colors.text}`}>{summary.totalPomodoro}</div>
            <div className="text-xs text-gray-500 mt-0.5">番茄钟</div>
          </div>
        </div>
      </div>

      {/* 每日学习详情（按 range 显示） */}
      <div className="space-y-2.5">
        {dailyRecords
          .slice()
          .reverse()
          .map((record) => renderDayCard(record))}
      </div>

      {/* 日历弹窗 */}
      {showCalendar && (
        <div
          className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4"
          onClick={() => setShowCalendar(false)}
        >
          <div
            className="bg-white rounded-2xl p-4 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => {
                  if (calMonth === 1) {
                    setCalMonth(12);
                    setCalYear(calYear - 1);
                  } else setCalMonth(calMonth - 1);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"
              >
                &lt;
              </button>
              <span className="text-base font-semibold">{calYear}年{calMonth}月</span>
              <button
                onClick={() => {
                  if (calMonth === 12) {
                    setCalMonth(1);
                    setCalYear(calYear + 1);
                  } else setCalMonth(calMonth + 1);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"
              >
                &gt;
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {weekDays.map((d) => (
                <div key={d} className="text-center text-xs text-gray-400 py-1">{d}</div>
              ))}
              {days.map((day, i) => {
                if (!day) return <div key={i} className="aspect-square" />;
                const ds = getDateStr(day);
                const plan = data.plans.find((p) => p.date === ds);
                const moduleTasks = (plan?.tasks || []).filter((t) => t.module === activeModule);
                const done = moduleTasks.filter((t) => t.done).length;
                const total = moduleTasks.length;
                const isFuture = ds > today;
                const hasTasks = total > 0;
                const allDone = total > 0 && done === total;
                const partial = total > 0 && done > 0 && done < total;
                const percent = total > 0 ? (done / total) * 100 : 0;

                let bgStyle: React.CSSProperties = {};
                if (hasTasks && !isFuture) {
                  if (allDone) {
                    bgStyle.background = hex.solid;
                  } else if (partial) {
                    bgStyle.background = `conic-gradient(${hex.solid} 0% ${percent}%, ${hex.light} ${percent}% 100%)`;
                  } else {
                    bgStyle.background = hex.light;
                  }
                }

                const textColor = allDone && !isFuture
                  ? 'text-white'
                  : hasTasks && !isFuture
                    ? 'text-gray-700'
                    : isFuture
                      ? 'text-gray-300'
                      : 'text-gray-500';

                return (
                  <button
                    key={i}
                    onClick={() => handleSelectDate(ds)}
                    disabled={isFuture}
                    className={`aspect-square flex flex-col items-center justify-center text-xs rounded-lg relative overflow-hidden ${
                      isFuture
                        ? 'cursor-not-allowed opacity-50'
                        : 'transition-transform hover:scale-105'
                    }`}
                    style={bgStyle}
                    title={isFuture ? '未来日期不可选' : (hasTasks ? `${MODULE_LABELS[activeModule]}：${done}/${total}` : '选择该日期')}
                  >
                    <span className={`relative z-10 font-medium ${textColor}`}>{day}</span>
                    {hasTasks && (
                      <span className={`relative z-10 text-[10px] leading-none mt-0.5 font-medium ${textColor} opacity-90`}>
                        {done}/{total}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* 图例 */}
            <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-400 flex-wrap">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded" style={{ background: hex.solid }} />
                <span>全部完成</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div
                  className="w-4 h-4 rounded"
                  style={{ background: `conic-gradient(${hex.solid} 0% 40%, ${hex.light} 40% 100%)` }}
                />
                <span>部分完成</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded" style={{ background: hex.light }} />
                <span>未完成</span>
              </div>
            </div>

            <p className="text-center text-xs text-gray-400 mt-3">
              点击日期即可添加该日分页（仅可选今天及之前）
            </p>
          </div>
        </div>
      )}

    </div>
  );
}