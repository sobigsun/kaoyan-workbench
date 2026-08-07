import React, { useMemo, useState } from 'react';
import { ModuleType, SubjectConfig } from '../types';
import { addDays, formatDate, formatTime, todayStr } from '../utils/date';
import { getSubjectHex } from '../utils/modules';

type TrendRange = 7 | 14 | 30;

interface TrendSeries {
  key: string;
  label: string;
  // 颜色 stroke / fill（使用固定色，避免与每日主题色冲突影响趋势可读性）
  color: string;
  lightColor: string;
}

interface StudyTrendChartProps {
  // 每日总学习时长（分钟），dateStr 格式 yyyy-mm-dd
  totalDurations?: Record<string, number>;
  // 每日分科目学习时长（分钟）
  moduleDurations?: Partial<Record<string, Partial<Record<ModuleType, number>>>>;
  // 学科配置列表（用于动态生成趋势曲线系列）
  subjects?: SubjectConfig[];
  // 初始时间范围（默认 14 天）
  defaultRange?: TrendRange;
}

interface HoverInfo {
  x: number;         // SVG 内 x
  dateIdx: number;   // 在 days 数组中的 index
  dateStr: string;
}

export default function StudyTrendChart({
  totalDurations,
  moduleDurations,
  subjects = [],
  defaultRange = 14,
}: StudyTrendChartProps) {
  const [range, setRange] = useState<TrendRange>(defaultRange);
  const SERIES = useMemo<TrendSeries[]>(() => {
    const subjectSeries = subjects.map((s) => ({
      key: s.id,
      label: s.name,
      color: getSubjectHex(s.color),
      lightColor: getSubjectHex(s.color) + '26', // 15% 透明度
    }));
    return [
      ...subjectSeries,
      { key: 'total', label: '总计', color: '#1f2937', lightColor: 'rgba(31,41,55,0.12)' },
    ];
  }, [subjects]);
  const [visible, setVisible] = useState<Record<string, boolean>>(
    () => Object.fromEntries(SERIES.map((s) => [s.key, true]))
  );
  const [hover, setHover] = useState<HoverInfo | null>(null);

  // 最近 range 天的日期数组（包含今天，左 → 右 从最早到今天）
  const days = useMemo<string[]>(() => {
    const arr: string[] = [];
    const today = todayStr();
    for (let i = range - 1; i >= 0; i--) arr.push(addDays(today, -i));
    return arr;
  }, [range]);

  // 每个日期的各系列值（动态根据 subjects 生成）
  const values = useMemo(() => {
    const moduleKeys = SERIES.filter((s) => s.key !== 'total').map((s) => s.key);
    return days.map((d) => {
      const perMod = moduleDurations?.[d] ?? {};
      const perModule: Record<string, number> = {};
      let moduleSum = 0;
      for (const key of moduleKeys) {
        const v = perMod[key] ?? 0;
        perModule[key] = v;
        moduleSum += v;
      }
      const total = totalDurations?.[d] ?? moduleSum;
      return { date: d, ...perModule, total };
    });
  }, [days, totalDurations, moduleDurations, SERIES]);

  // 是否全是 0
  const isEmpty = useMemo(() => values.every(v => v.total === 0), [values]);

  // Y 轴最大分钟（向上取整到 60/120/.../最近的 60 分钟，但至少 60）
  const maxMin = useMemo(() => {
    const eachSeriesMax: number[] = SERIES.map((s) =>
      values.reduce((m, v) => Math.max(m, (v as any)[s.key] ?? 0), 0)
    );
    let m = Math.max(1, ...eachSeriesMax);
    const step = m <= 120 ? 30 : m <= 360 ? 60 : 120;
    m = Math.ceil(m / step) * step;
    return Math.max(60, m);
  }, [values, SERIES]);

  const ticks = useMemo(() => {
    const arr: number[] = [];
    const step = maxMin <= 120 ? 30 : maxMin <= 360 ? 60 : 120;
    for (let i = 0; i <= maxMin; i += step) arr.push(i);
    return arr;
  }, [maxMin]);

  // SVG 画布尺寸（外层使用 aspect 自适应）
  const W = 820;
  const H = 280;
  const PL = 44;   // padding left（给 Y 轴标签）
  const PR = 14;   // padding right
  const PT = 16;
  const PB = 32;   // padding bottom（X 轴日期）
  const chartW = W - PL - PR;
  const chartH = H - PT - PB;

  const xForIdx = (idx: number) => {
    if (days.length <= 1) return PL + chartW / 2;
    return PL + (idx / (days.length - 1)) * chartW;
  };
  const yForMin = (m: number) => {
    if (maxMin <= 0) return PT + chartH;
    return PT + chartH - (m / maxMin) * chartH;
  };

  // 为每个系列生成折线 path + 填充渐变 area
  function buildPaths(seriesKey: TrendSeries['key']) {
    const pts = values.map((v, i) => ({
      x: xForIdx(i),
      y: yForMin((v as any)[seriesKey] ?? 0),
    }));
    if (pts.length === 0) return { line: '', area: '', points: pts };
    const first = pts[0];
    const last = pts[pts.length - 1];
    let line = `M ${first.x} ${first.y}`;
    for (let i = 1; i < pts.length; i++) {
      line += ` L ${pts[i].x} ${pts[i].y}`;
    }
    // area: 折线 → 右下底 → 左下底 → 起点
    let area = `M ${first.x} ${PT + chartH}`;
    area += ` L ${first.x} ${first.y}`;
    for (let i = 1; i < pts.length; i++) area += ` L ${pts[i].x} ${pts[i].y}`;
    area += ` L ${last.x} ${PT + chartH} Z`;
    return { line, area, points: pts };
  }

  // 范围切换按钮（7 / 14 / 30 天）
  const rangeOptions: TrendRange[] = [7, 14, 30];

  // Tooltip hover 数据
  const hoverValue = hover ? values[hover.dateIdx] : null;

  // 总时长 + 平均每天时长（用于收起态/概览展示）
  const totalMinutesAllRange = values.reduce((s, v) => s + v.total, 0);
  const avgPerDay = Math.round(totalMinutesAllRange / Math.max(1, values.length));

  return (
    <div className="w-full">
      {/* 顶部：标题 + 范围切换 + 总计摘要 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-500">时间范围：</span>
          {rangeOptions.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                range === r
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              近 {r} 天
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>
            共学习 <span className="font-semibold text-primary-700">{formatTime(totalMinutesAllRange)}</span>
          </span>
          <span>
            日均 <span className="font-semibold text-gray-700">{formatTime(avgPerDay)}</span>
          </span>
        </div>
      </div>

      {isEmpty ? (
        // 空状态：SVG 占位（保持尺寸一致，避免卡片跳动）
        <div
          className="w-full rounded-xl border border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-2 text-gray-400"
          style={{ height: H }}
        >
          <div className="text-4xl">📈</div>
          <div className="text-sm">还没有学习数据，开始今天的第一个番茄钟吧～</div>
        </div>
      ) : (
        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full min-w-[560px] max-w-full"
            preserveAspectRatio="xMidYMid meet"
            onMouseLeave={() => setHover(null)}
          >
            <defs>
              {SERIES.map((s) => (
                <linearGradient
                  key={`grad-${s.key}`}
                  id={`stc-grad-${s.key}`}
                  x1="0" x2="0" y1="0" y2="1"
                >
                  <stop offset="0%" stopColor={s.color} stopOpacity="0.28" />
                  <stop offset="100%" stopColor={s.color} stopOpacity="0" />
                </linearGradient>
              ))}
            </defs>

            {/* Y 轴网格线 + 标签 */}
            {ticks.map((t) => {
              const y = yForMin(t);
              return (
                <g key={`y-${t}`}>
                  <line
                    x1={PL} y1={y}
                    x2={W - PR} y2={y}
                    stroke="#f1f5f9" strokeWidth={1}
                  />
                  <text
                    x={PL - 6}
                    y={y + 3}
                    textAnchor="end"
                    fontSize={10}
                    fill="#9ca3af"
                  >
                    {t}分
                  </text>
                </g>
              );
            })}

            {/* X 轴基线 */}
            <line
              x1={PL} y1={PT + chartH}
              x2={W - PR} y2={PT + chartH}
              stroke="#e5e7eb" strokeWidth={1}
            />

            {/* X 轴日期标签（稀疏显示，避免太挤） */}
            {values.map((v, i) => {
              // 根据 range 决定每隔多少天显示一个标签
              const step = range <= 7 ? 1 : range === 14 ? 2 : 4;
              if (i % step !== 0 && i !== values.length - 1) return null;
              const x = xForIdx(i);
              return (
                <text
                  key={`x-${v.date}`}
                  x={x}
                  y={PT + chartH + 16}
                  textAnchor="middle"
                  fontSize={10}
                  fill="#94a3b8"
                >
                  {formatDate(v.date)}
                </text>
              );
            })}

            {/* 先画面积（在下面），总计不画面积避免覆盖科目 */}
            {SERIES.filter((s) => visible[s.key] && s.key !== 'total').map((s) => {
              const { area } = buildPaths(s.key);
              return (
                <path
                  key={`area-${s.key}`}
                  d={area}
                  fill={`url(#stc-grad-${s.key})`}
                  opacity={0.9}
                />
              );
            })}

            {/* 再画折线 */}
            {SERIES.filter((s) => visible[s.key]).map((s) => {
              const { line, points } = buildPaths(s.key);
              return (
                <g key={`line-${s.key}`}>
                  <path
                    d={line}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={s.key === 'total' ? 2.2 : 1.9}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    strokeDasharray={s.key === 'total' ? '6 4' : undefined}
                    opacity={s.key === 'total' ? 0.85 : 1}
                  />
                  {/* 每一个点 */}
                  {points.map((p, idx) => (
                    <circle
                      key={`pt-${s.key}-${idx}`}
                      cx={p.x}
                      cy={p.y}
                      r={s.key === 'total' ? 2.2 : 2.8}
                      fill="#fff"
                      stroke={s.color}
                      strokeWidth={1.4}
                    />
                  ))}
                </g>
              );
            })}

            {/* 隐形竖向热区 + hover 竖线 */}
            {values.map((v, i) => {
              const x = xForIdx(i);
              const prevX = i === 0 ? x : xForIdx(i - 1);
              const nextX = i === values.length - 1 ? x : xForIdx(i + 1);
              const left = i === 0 ? PL : (x + prevX) / 2;
              const right = i === values.length - 1 ? W - PR : (x + nextX) / 2;
              return (
                <g key={`hot-${v.date}`}>
                  <rect
                    x={left}
                    y={PT}
                    width={right - left}
                    height={chartH}
                    fill="transparent"
                    onMouseEnter={() => setHover({ x, dateIdx: i, dateStr: v.date })}
                  />
                </g>
              );
            })}
            {hover && (
              <line
                x1={hover.x} y1={PT}
                x2={hover.x} y2={PT + chartH}
                stroke="#94a3b8"
                strokeWidth={1}
                strokeDasharray="3 3"
                opacity={0.7}
              />
            )}
          </svg>

          {/* Tooltip（绝对定位，跟随 hover） */}
          {hover && hoverValue && (
            <div
              className="pointer-events-none absolute z-10"
              style={{
                left: `${(hover.x / W) * 100}%`,
                top: 0,
                transform: 'translate(-50%, 0)',
              }}
            >
              <div className="mt-2 px-3 py-2 text-xs bg-white rounded-lg shadow-lg border border-gray-100 whitespace-nowrap">
                <div className="font-semibold text-gray-700 mb-1">
                  {hoverValue.date}
                </div>
                {SERIES.filter((s) => visible[s.key]).map((s) => {
                  const mins = (hoverValue as any)[s.key] ?? 0;
                  return (
                    <div key={s.key} className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-1.5 text-gray-500">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full"
                          style={{ background: s.color }}
                        />
                        {s.label}
                      </span>
                      <span className="font-medium text-gray-700 ml-3 tabular-nums">
                        {formatTime(mins)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 图例：点击切换显示/隐藏 */}
      <div className="mt-3 flex items-center justify-center gap-4 flex-wrap">
        {SERIES.map((s) => {
          const isOn = visible[s.key];
          return (
            <button
              key={s.key}
              onClick={() => setVisible((v) => ({ ...v, [s.key]: !v[s.key] }))}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all ${
                isOn
                  ? 'bg-white shadow-sm border border-gray-100 text-gray-700'
                  : 'bg-gray-50 text-gray-400 line-through'
              }`}
            >
              <span
                className="inline-block w-3 h-3 rounded-sm"
                style={{
                  background: isOn ? s.color : '#e5e7eb',
                  outline: s.key === 'total' && isOn ? '1px dashed ' + s.color : undefined,
                  outlineOffset: 1,
                }}
              />
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export type { TrendRange };
