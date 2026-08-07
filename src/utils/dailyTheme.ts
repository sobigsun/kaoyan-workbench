// 主题色系统 —— 从 41 套自然系配色中随机轮换
// 策略：
// 1. 每次打开软件（新会话），从 color-themes.json 中随机选一套配色
// 2. 用 sessionStorage 保证会话内稳定（刷新不换，关闭重开才换）
// 3. 以 accent 为基色生成 50-900 共 10 档调色板，写入 CSS 变量
// 4. 同时设置低饱和偏暖的文字色变量，确保各种背景下都清晰可读
// 5. 启动页渐变使用 bgPrimary → bgSecondary → 浅 accent

import themeData from '../data/color-themes.json';

// ========== 类型定义 ==========

export interface DailyTheme {
  themeId: string;          // 配色 ID（如 fruit_green_apple）
  themeName: string;        // 配色名称（如 青苹果）
  themeCategory: string;    // 分类（fruit / weather / nature）
  themeDescription: string; // 描述
  date: string;             // YYYY-MM-DD（记录选取日期）
  baseHex: string;          // accent 基色（#RRGGBB）
  bgPrimaryHex: string;     // 主背景色
  bgSecondaryHex: string;   // 次背景色
  isDark: boolean;          // 是否为深色背景主题
  palette: {                // 10 档调色板（RGB 三元组，空格分隔写入 CSS 变量）
    50: [number, number, number];
    100: [number, number, number];
    200: [number, number, number];
    300: [number, number, number];
    400: [number, number, number];
    500: [number, number, number];
    600: [number, number, number];
    700: [number, number, number];
    800: [number, number, number];
    900: [number, number, number];
  };
  splashGradient: string;   // 启动页渐变 CSS
  textColors: {             // 文字色（来自配色数据）
    onLight: string;        // 在浅色背景上
    onAccent: string;       // 在 accent 色上
    onDark: string;         // 在深色背景上
  };
}

// ========== 颜色工具 ==========

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 360) + 360) % 360 / 360;
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

/** 计算颜色的相对亮度（0-1），用于判断深浅 */
function getLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);
  return l;
}

// 基色 → 生成 10 档调色板（Tailwind 风格，50 最浅 900 最深）
function generatePalette(baseHex: string): DailyTheme['palette'] {
  const [r, g, b] = hexToRgb(baseHex);
  const [h, s] = rgbToHsl(r, g, b);
  const ls: Record<number, number> = {
    50: 0.97, 100: 0.93, 200: 0.86, 300: 0.77, 400: 0.66,
    500: 0.55, 600: 0.46, 700: 0.38, 800: 0.30, 900: 0.20,
  };
  const result = {} as DailyTheme['palette'];
  (Object.keys(ls) as unknown as (keyof DailyTheme['palette'])[]).forEach((k) => {
    const targetL = ls[k];
    const sat = s * (k === 50 || k === 900 ? 0.55 : k === 100 || k === 800 ? 0.75 : 1);
    result[k] = hslToRgb(h, sat, targetL);
  });
  return result;
}

// 生成启动页渐变：bgPrimary → bgSecondary → 浅 accent
function generateSplashGradient(
  bgPrimary: string,
  bgSecondary: string,
  palette: DailyTheme['palette'],
  isDark: boolean,
): string {
  if (isDark) {
    // 深色主题：从深到稍浅
    const [r1, g1, b1] = hexToRgb(bgPrimary);
    const [r2, g2, b2] = hexToRgb(bgSecondary);
    return `linear-gradient(180deg, rgb(${r1},${g1},${b1}) 0%, rgb(${r2},${g2},${b2}) 60%, rgb(${palette[800][0]},${palette[800][1]},${palette[800][2]}) 100%)`;
  }
  // 浅色主题：从浅 bgPrimary 到更浅的 accent
  const [r1, g1, b1] = hexToRgb(bgPrimary);
  return `linear-gradient(180deg, rgb(${r1},${g1},${b1}) 0%, rgb(${palette[100][0]},${palette[100][1]},${palette[100][2]}) 50%, rgb(${palette[50][0]},${palette[50][1]},${palette[50][2]}) 100%)`;
}

// ========== 全局派生色：从主题色低饱和派生，保证全界面一致性 ==========

/**
 * 将颜色转为 HSL 并调整饱和度/亮度，返回 rgb 字符串
 * 低饱和、自然有机、柔和温暖的美学基调
 */
function deriveColor(hex: string, opts: {
  sat?: number;      // 目标饱和度 0-1（null=保持原值）
  light?: number;    // 目标亮度 0-1（null=保持原值）
  satMul?: number;   // 饱和度乘数
  lightMul?: number; // 亮度乘数
  alpha?: number;    // 透明度 0-1
}): string {
  const [r, g, b] = hexToRgb(hex);
  let [h, s, l] = rgbToHsl(r, g, b);
  if (opts.sat !== undefined) s = opts.sat;
  if (opts.light !== undefined) l = opts.light;
  if (opts.satMul !== undefined) s = Math.min(1, s * opts.satMul);
  if (opts.lightMul !== undefined) l = Math.min(0.99, Math.max(0.01, l * opts.lightMul));
  const [nr, ng, nb] = hslToRgb(h, s, l);
  if (opts.alpha !== undefined) {
    return `rgba(${nr}, ${ng}, ${nb}, ${opts.alpha})`;
  }
  return `rgb(${nr}, ${ng}, ${nb})`;
}

// ========== 写入 CSS 变量 ==========

export function applyThemeToDom(theme: DailyTheme) {
  const root = document.documentElement;

  // 1. 写入 primary 调色板（50-900）
  (Object.keys(theme.palette) as unknown as (keyof DailyTheme['palette'])[]).forEach((k) => {
    const [r, g, b] = theme.palette[k];
    root.style.setProperty(`--color-primary-${k}`, `${r} ${g} ${b}`);
  });

  // 2. 启动页渐变
  root.style.setProperty('--splash-gradient', theme.splashGradient);

  // 3. 基础十六进制值
  root.style.setProperty('--primary-hex', theme.baseHex);

  // 4. 兼容 index.css 旧变量
  root.style.setProperty('--color-primary', theme.baseHex);
  const [r600, g600, b600] = theme.palette[600];
  root.style.setProperty('--color-primary-hover', `rgb(${r600}, ${g600}, ${b600})`);
  const [r50, g50, b50] = theme.palette[50];
  root.style.setProperty('--color-primary-light', `rgba(${r50}, ${g50}, ${b50}, 0.95)`);

  // 5. 文字色变量（低饱和偏暖，从主题色派生确保全界面一致）
  if (theme.isDark) {
    // 深色背景主题：文字用浅暖色（从主题派生）
    root.style.setProperty('--text-primary',     deriveColor(accentHex, { satMul: 0.30, light: 0.92 }));
    root.style.setProperty('--text-secondary',   deriveColor(accentHex, { satMul: 0.25, light: 0.80 }));
    root.style.setProperty('--text-muted',       deriveColor(accentHex, { satMul: 0.20, light: 0.65 }));
    root.style.setProperty('--text-on-accent',   theme.textColors.onAccent);
  } else {
    // 浅色背景主题：文字用深暖色（从主题派生）
    root.style.setProperty('--text-primary',     deriveColor(accentHex, { satMul: 0.45, light: 0.18 }));
    root.style.setProperty('--text-secondary',   deriveColor(accentHex, { satMul: 0.35, light: 0.30 }));
    root.style.setProperty('--text-muted',       deriveColor(accentHex, { satMul: 0.25, light: 0.42 }));
    root.style.setProperty('--text-on-accent',   theme.textColors.onAccent);
  }

  // ========== 6. 全局派生色：页面背景 / 卡片 / 边框 / 标题 / 按钮 ==========
  // 设计理念：低饱和、自然有机、柔和温暖
  // 所有界面元素从当日主题色派生，保证换主题时全界面统一变化

  const accentHex = theme.baseHex;           // 主题强调色
  const accentDarkHex = theme.bgSecondaryHex; // 主题次背景色（更深一档）

  if (theme.isDark) {
    // 深色主题：暗底 + 柔和强调
    root.style.setProperty('--bg-page',        deriveColor(accentDarkHex, { sat: 0.12, light: 0.10 }));
    root.style.setProperty('--bg-card',        deriveColor(accentDarkHex, { sat: 0.10, light: 0.15 }));
    root.style.setProperty('--bg-card-2',      deriveColor(accentHex, { sat: 0.15, light: 0.18 }));
    root.style.setProperty('--bg-muted',       deriveColor(accentDarkHex, { sat: 0.08, light: 0.22 }));
    root.style.setProperty('--border-card',    deriveColor(accentHex, { sat: 0.18, light: 0.28, alpha: 0.6 }));
    root.style.setProperty('--border-subtle',  deriveColor(accentHex, { sat: 0.12, light: 0.25, alpha: 0.4 }));
    root.style.setProperty('--text-heading',   deriveColor(accentHex, { sat: 0.30, light: 0.82 }));
    root.style.setProperty('--accent-btn',     deriveColor(accentHex, { sat: 0.45, light: 0.55 }));
    root.style.setProperty('--accent-btn-2',   deriveColor(accentDarkHex, { sat: 0.35, light: 0.45 }));
    root.style.setProperty('--accent-soft',    deriveColor(accentHex, { sat: 0.25, light: 0.50 }));
    root.style.setProperty('--accent-warm',    deriveColor(accentHex, { sat: 0.35, light: 0.60 }));
    root.style.setProperty('--accent-warm-soft', deriveColor(accentHex, { sat: 0.20, light: 0.70 }));
  } else {
    // 浅色主题：暖底 + 柔和强调（低饱和自然有机，颜色更深更有层次）
    root.style.setProperty('--bg-page',        deriveColor(accentHex, { sat: 0.14, light: 0.94 }));
    root.style.setProperty('--bg-card',        deriveColor(accentHex, { sat: 0.09, light: 0.97 }));
    root.style.setProperty('--bg-card-2',      deriveColor(accentHex, { sat: 0.12, light: 0.94 }));
    root.style.setProperty('--bg-muted',       deriveColor(accentHex, { sat: 0.10, light: 0.915 }));
    root.style.setProperty('--border-card',    deriveColor(accentHex, { sat: 0.22, light: 0.865 }));
    root.style.setProperty('--border-subtle',  deriveColor(accentHex, { sat: 0.15, light: 0.885, alpha: 0.5 }));
    root.style.setProperty('--text-heading',   deriveColor(accentHex, { satMul: 0.50, light: 0.28 }));
    root.style.setProperty('--accent-btn',     deriveColor(accentHex, { satMul: 0.80, light: 0.44 }));
    root.style.setProperty('--accent-btn-2',   deriveColor(accentDarkHex, { satMul: 0.70, light: 0.36 }));
    root.style.setProperty('--accent-soft',    deriveColor(accentHex, { satMul: 0.60, light: 0.50 }));
    root.style.setProperty('--accent-warm',    deriveColor(accentHex, { satMul: 0.65, light: 0.46 }));
    root.style.setProperty('--accent-warm-soft', deriveColor(accentHex, { satMul: 0.45, light: 0.60 }));
  }

  // 7. 主题元信息（供 JS 读取）
  root.style.setProperty('--theme-name', theme.themeName);
  root.style.setProperty('--theme-id', theme.themeId);
}

// ========== 从 41 套配色中随机选一套 ==========

const SESSION_KEY = 'kaoyan_session_theme_id';

interface ThemeEntry {
  id: string;
  name: string;
  category: string;
  description: string;
  colors: {
    bgPrimary: string;
    bgSecondary: string;
    accent: string;
    accentDark: string;
    accentDeep: string;
  };
  textColors: {
    onLight: string;
    onAccent: string;
    onDark: string;
  };
}

function pickRandomTheme(): ThemeEntry {
  const themes = (themeData as { themes: ThemeEntry[] }).themes;
  const idx = Math.floor(Math.random() * themes.length);
  return themes[idx];
}

function buildDailyTheme(entry: ThemeEntry): DailyTheme {
  const accentHex = entry.colors.accent;
  const bgPrimaryHex = entry.colors.bgPrimary;
  const bgLuminance = getLuminance(bgPrimaryHex);
  const isDark = bgLuminance < 0.35;

  const palette = generatePalette(accentHex);
  const splashGradient = generateSplashGradient(
    bgPrimaryHex,
    entry.colors.bgSecondary,
    palette,
    isDark,
  );

  return {
    themeId: entry.id,
    themeName: entry.name,
    themeCategory: entry.category,
    themeDescription: entry.description,
    date: new Date().toISOString().slice(0, 10),
    baseHex: accentHex,
    bgPrimaryHex,
    bgSecondaryHex: entry.colors.bgSecondary,
    isDark,
    palette,
    splashGradient,
    textColors: entry.textColors,
  };
}

// ========== 主入口 ==========

/**
 * 获取本次会话的主题（每次打开软件随机选一套，会话内稳定）
 * 保持 async 接口兼容现有调用
 */
export async function fetchDailyTheme(): Promise<DailyTheme> {
  let entry: ThemeEntry;

  try {
    // 读 sessionStorage：会话内稳定
    const cachedId = sessionStorage.getItem(SESSION_KEY);
    const themes = (themeData as { themes: ThemeEntry[] }).themes;
    if (cachedId) {
      const found = themes.find((t) => t.id === cachedId);
      if (found) {
        entry = found;
      } else {
        entry = pickRandomTheme();
        sessionStorage.setItem(SESSION_KEY, entry.id);
      }
    } else {
      entry = pickRandomTheme();
      sessionStorage.setItem(SESSION_KEY, entry.id);
    }
  } catch {
    entry = pickRandomTheme();
  }

  const theme = buildDailyTheme(entry);
  applyThemeToDom(theme);
  return theme;
}

/** 立即用默认配色占位（主题加载前保证页面可用） */
export function applyDefaultTheme() {
  const themes = (themeData as { themes: ThemeEntry[] }).themes;
  // 默认用第一套「青苹果」
  const entry = themes[0];
  const theme = buildDailyTheme(entry);
  applyThemeToDom(theme);
}
