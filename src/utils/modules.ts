// 学科配置工具 — 从 data.subjects 动态生成标签/颜色/十六进制色映射
// 替代原来在 Dashboard / StudyRecords / StudyTrendChart 中各自硬编码的常量

import { SubjectConfig } from '../types';

// 可选颜色列表（8 种低饱和偏暖色）
export const SUBJECT_COLORS: { key: string; label: string; hex: string; tailwind: string; light: string }[] = [
  { key: 'green',   label: '绿色',  hex: '#10b981', tailwind: 'bg-green-500',   light: 'bg-green-100 text-green-700' },
  { key: 'yellow',  label: '黄色',  hex: '#eab308', tailwind: 'bg-yellow-500',  light: 'bg-yellow-100 text-yellow-700' },
  { key: 'red',     label: '红色',  hex: '#ef4444', tailwind: 'bg-red-500',     light: 'bg-red-100 text-red-700' },
  { key: 'blue',    label: '蓝色',  hex: '#3b82f6', tailwind: 'bg-blue-500',    light: 'bg-blue-100 text-blue-700' },
  { key: 'purple',  label: '紫色',  hex: '#8b5cf6', tailwind: 'bg-purple-500',  light: 'bg-purple-100 text-purple-700' },
  { key: 'orange',  label: '橙色',  hex: '#f97316', tailwind: 'bg-orange-500',  light: 'bg-orange-100 text-orange-700' },
  { key: 'pink',    label: '粉色',  hex: '#ec4899', tailwind: 'bg-pink-500',    light: 'bg-pink-100 text-pink-700' },
  { key: 'cyan',    label: '青色',  hex: '#06b6d4', tailwind: 'bg-cyan-500',    light: 'bg-cyan-100 text-cyan-700' },
];

const COLOR_MAP = new Map(SUBJECT_COLORS.map((c) => [c.key, c]));

/** 根据学科配置列表生成 { id → name } 映射 */
export function getModuleLabels(subjects: SubjectConfig[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const s of subjects) map[s.id] = s.name;
  return map;
}

/** 根据学科配置列表生成 { id → tailwind 类名 } 映射（用于进度条填充色） */
export function getModuleColors(subjects: SubjectConfig[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const s of subjects) {
    const c = COLOR_MAP.get(s.color);
    map[s.id] = c?.tailwind ?? 'bg-gray-500';
  }
  return map;
}

/** 根据学科配置列表生成 { id → 浅色 tailwind 类名 } 映射（用于标签背景） */
export function getModuleLightColors(subjects: SubjectConfig[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const s of subjects) {
    const c = COLOR_MAP.get(s.color);
    map[s.id] = c?.light ?? 'bg-gray-100 text-gray-700';
  }
  return map;
}

/** 根据学科配置列表生成 { id → 十六进制色值 } 映射（用于 SVG / conic-gradient） */
export function getModuleHex(subjects: SubjectConfig[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const s of subjects) {
    const c = COLOR_MAP.get(s.color);
    map[s.id] = c?.hex ?? '#6b7280';
  }
  return map;
}

/** 获取单个学科的颜色十六进制值 */
export function getSubjectHex(color: string): string {
  return COLOR_MAP.get(color)?.hex ?? '#6b7280';
}

/** 生成唯一学科 ID（用拼音/英文，或回退到 sub_xxxx） */
export function generateSubjectId(name: string): string {
  // 简单拼音映射（常见学科）
  const pinyinMap: Record<string, string> = {
    '数学': 'math', '专业课': 'major', '历史': 'history', '地理': 'geography',
    '物理': 'physics', '化学': 'chemistry', '生物': 'biology', '计算机': 'cs',
    '法律': 'law', '经济': 'economics', '管理': 'management', '心理学': 'psychology',
    '数学一': 'math1', '数学二': 'math2', '数学三': 'math3',
  };
  const key = name.trim();
  if (pinyinMap[key]) return pinyinMap[key];
  // 回退：用时间戳后 4 位
  return 'sub_' + Date.now().toString(36).slice(-4);
}
