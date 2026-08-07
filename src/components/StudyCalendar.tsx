import React, { useState } from 'react';
import { todayStr } from '../utils/date';

interface StudyCalendarProps {
  durations: Record<string, number>;
  checkIns: string[];
}

// 按学习时长（分钟）返回对应表情
// <60(1小时) 伤心 / 60-179(1-3小时) 平静 / 180-299(3-5小时) 微笑
// 300-479(5-8小时) 大笑 / >=480(8小时+) 烟花庆祝
function getEmoji(minutes: number): string | null {
  if (minutes <= 0) return null;
  if (minutes < 60) return '😢';
  if (minutes < 180) return '😐';
  if (minutes < 300) return '😊';
  if (minutes < 480) return '😄';
  return '🎆';
}

// 表情分级图例
const EMOJI_LEVELS: { emoji: string; label: string }[] = [
  { emoji: '😢', label: '<1小时' },
  { emoji: '😐', label: '1-3小时' },
  { emoji: '😊', label: '3-5小时' },
  { emoji: '😄', label: '5-8小时' },
  { emoji: '🎆', label: '8小时+' },
];

export default function StudyCalendar({ durations, checkIns }: StudyCalendarProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  // 默认展开
  const [expanded, setExpanded] = useState(true);

  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const days: (number | null)[] = Array.from({ length: 42 }, (_, i) => {
    const day = i - firstDay + 1;
    return day > 0 && day <= daysInMonth ? day : null;
  });

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  const getDateStr = (day: number) => `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const todayDateStr = todayStr();

  return (
    <div className="bg-white rounded-2xl shadow-sm border p-4">
      {/* 标题栏：月份切换 + 展开/收起按钮 */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => { if (month === 1) { setMonth(12); setYear(year - 1); } else setMonth(month - 1); }}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"
        >
          &lt;
        </button>
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold">{year}年{month}月</span>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
            title={expanded ? '收起日历' : '展开日历'}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
            >
              <path d="M18 15l-6-6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        <button
          onClick={() => { if (month === 12) { setMonth(1); setYear(year + 1); } else setMonth(month + 1); }}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"
        >
          &gt;
        </button>
      </div>

      {expanded ? (
        <>
          {/* 日历主体 */}
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((d) => (
              <div key={d} className="text-center text-xs text-gray-400 py-1">{d}</div>
            ))}
            {days.map((day, i) => {
              if (!day) return <div key={i} className="aspect-square" />;
              const ds = getDateStr(day);
              const duration = durations[ds] || 0;
              const checked = checkIns.includes(ds);
              const emoji = getEmoji(duration);
              const isToday = ds === todayDateStr;
              const isFuture = ds > todayDateStr;

              return (
                <div
                  key={i}
                  className={`aspect-square flex flex-col items-center justify-center text-xs rounded-lg relative transition-colors ${
                    isFuture
                      ? 'text-gray-300'
                      : isToday
                        ? 'ring-2 ring-primary-400 bg-primary-50'
                        : emoji
                          ? 'bg-green-50'
                          : checked
                            ? 'bg-primary-50'
                            : 'hover:bg-gray-50'
                  }`}
                  title={isFuture ? '' : duration > 0 ? `${ds} · 学习 ${duration} 分钟` : ds}
                >
                  <span className={`text-[11px] leading-none ${
                    isFuture
                      ? 'text-gray-300'
                      : isToday
                        ? 'font-semibold text-primary-600'
                        : 'text-gray-600'
                  }`}>
                    {day}
                  </span>
                  {emoji && !isFuture && (
                    <span className="text-sm leading-none mt-0.5">{emoji}</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* 图例：按表情分类 */}
          <div className="flex items-center justify-center gap-3 mt-4 text-xs text-gray-400 flex-wrap">
            {EMOJI_LEVELS.map((lvl) => (
              <div key={lvl.label} className="flex items-center gap-1">
                <span className="text-sm">{lvl.emoji}</span>
                <span>{lvl.label}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        /* 收起状态：显示本月学习概况 */
        <div className="py-3 text-center">
          <p className="text-sm text-gray-500">
            本月已学习{' '}
            <span className="font-semibold text-primary-600">
              {Array.from({ length: daysInMonth }, (_, i) => i + 1)
                .reduce((sum, day) => {
                  const ds = getDateStr(day);
                  return sum + (durations[ds] || 0);
                }, 0)}
            </span>{' '}
            分钟
          </p>
          <p className="text-xs text-gray-400 mt-1">点击上方箭头展开日历</p>
        </div>
      )}
    </div>
  );
}
