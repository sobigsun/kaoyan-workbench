// 漂浮「获得金币」动画 / 「升级」飘字
// 用法：
//   import { emitFloatPoints, emitLevelUp } from './FloatingPoints';
//   emitFloatPoints(10, '每日签到');     // 飘 10 个 +🪙
//   emitLevelUp(5);                      // 屏幕中央弹出「🎉 升到 5 级！」
import { useEffect, useState } from 'react';

// ========== 1. 漂浮金币（原「漂浮积分」） ==========

export interface FloatItem {
  id: number;
  amount: number; // 总金币数（用于拆成 N 个 +🪙）
  label?: string; // 可选标签（如 "签到" / "专注"）
}

type FloatListener = (item: FloatItem) => void;
const floatListeners = new Set<FloatListener>();
let floatCounter = 0;

/** 触发一次漂浮金币动画（amount 会被拆成多个 +🪙1） */
export function emitFloatPoints(amount: number, label?: string) {
  if (!amount) return;
  floatCounter += 1;
  const item: FloatItem = { id: floatCounter, amount, label };
  floatListeners.forEach((fn) => fn(item));
}

export function useFloatPointsSubscription(onItem: (item: FloatItem) => void) {
  useEffect(() => {
    floatListeners.add(onItem);
    return () => { floatListeners.delete(onItem); };
  }, [onItem]);
}

// 单个漂浮粒子
interface CoinParticle {
  id: string;
  startX: number;   // 0-100 (%)
  drift: number;    // 水平漂移 px
  duration: number; // 动画 ms
  delay: number;    // 延迟 ms
  // 注意：原来的 text 字段用了 🪙 emoji，部分安卓 WebView 字体缺 glyph 会显示成方框
  // 现在拆成 3 个字段，用 SVG 金币图标渲染
  sign: '+' | '-';   // 正负号
  suffix: string;    // 数字（如 "1" / "0.5" / "20"）
  isNegative: boolean; // 颜色分支
}

// SVG 金币图标（尺寸按 1em = 当前 font-size 缩放）
// - 外层金黄渐变圆边框
// - 内部 ¥ 符号（考研主题也贴合人民币感觉）
function CoinSvg({ negative = false }: { negative?: boolean }) {
  const stroke = negative ? '#f87171' : '#d97706'; // 红-600 / 琥珀-600
  const face   = negative ? '#fecaca' : '#fde68a'; // 红-200 / 琥珀-200
  const shine  = negative ? '#fee2e2' : '#fef3c7'; // 高光
  const symbol = negative ? '#991b1b' : '#92400e'; // 中心 ¥ 字颜色
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      aria-hidden
      style={{ display: 'inline-block', verticalAlign: '-0.15em', marginRight: 2 }}
    >
      <defs>
        <radialGradient id={`coin-g-${negative ? 'n' : 'p'}`} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor={shine} />
          <stop offset="55%" stopColor={face} />
          <stop offset="100%" stopColor={stroke} />
        </radialGradient>
      </defs>
      {/* 外圈：边框 + 内阴影（厚度感） */}
      <circle cx="12" cy="12" r="10.5" fill={`url(#coin-g-${negative ? 'n' : 'p'})`} stroke={stroke} strokeWidth="1.2" />
      <circle cx="12" cy="12" r="8.2" fill="none" stroke={stroke} strokeWidth="0.6" opacity="0.55" />
      {/* ¥ 符号，居中 */}
      <text
        x="12"
        y="16.2"
        textAnchor="middle"
        fontSize="10.5"
        fontWeight="900"
        fill={symbol}
        fontFamily="system-ui, -apple-system, Arial, sans-serif"
        style={{ paintOrder: 'stroke' }}
      >
        ¥
      </text>
    </svg>
  );
}

/**
 * 把一次 amount 拆成粒子：
 * - 非整数（如 0.5）→ 单个粒子
 * - 整数且 ≤ 20 → N 个 +1
 * - 整数且 > 20 → 20 个 +1 + 1 个剩余
 */
function splitToParticles(item: FloatItem): CoinParticle[] {
  const amt = item.amount;
  const absAmt = Math.abs(amt);
  const isNegative = amt < 0;
  const sign: '+' | '-' = isNegative ? '-' : '+';

  const parts: CoinParticle[] = [];

  const makeOne = (suffix: string, i: number, extraDelay = 0): CoinParticle => ({
    id: `${item.id}-${i}`,
    startX: 10 + Math.random() * 80,
    drift: (Math.random() - 0.5) * 25,
    duration: 2400 + Math.random() * 1200,
    delay: extraDelay,
    sign,
    suffix,
    isNegative,
  });

  if (!Number.isInteger(absAmt)) {
    parts.push(makeOne(String(absAmt), 0, 0));
    return parts;
  }

  const fullCount = Math.min(20, Math.floor(absAmt));
  const remainder = absAmt - fullCount;
  for (let i = 0; i < fullCount; i++) {
    parts.push(makeOne('1', i, i * (120 + Math.random() * 80)));
  }
  if (remainder > 0) {
    parts.push(makeOne(String(remainder), 9999, fullCount * 150));
  }
  return parts;
}

// SVG 礼花图标（替代 emoji 🎉，保证安卓 WebView 不显示方框）
function ConfettiSvg() {
  return (
    <svg
      viewBox="0 0 48 48"
      width="1em"
      height="1em"
      aria-hidden
      style={{ display: 'inline-block', verticalAlign: '-0.1em', marginRight: 6 }}
    >
      {/* 礼花筒主体 */}
      <path
        d="M14 30c0-2 6-14 6-14h8s6 12 6 14v2H14v-2z"
        fill="#f59e0b"
        stroke="#b45309"
        strokeWidth="1.2"
      />
      {/* 礼花筒底座 */}
      <path d="M12 32h24l-3 10H15l-3-10z" fill="#0ea5e9" stroke="#075985" strokeWidth="1.2" />
      {/* 底座装饰线 */}
      <path d="M16 34h16" stroke="#075985" strokeWidth="1" opacity="0.55" />
      {/* 喷射的碎纸（各种颜色形状） */}
      <circle cx="10" cy="18" r="1.6" fill="#ef4444" />
      <circle cx="14" cy="10" r="2" fill="#3b82f6" />
      <rect x="19" y="6" width="3" height="4" rx="0.6" fill="#10b981" transform="rotate(15 20 8)" />
      <circle cx="24" cy="4" r="2.2" fill="#f59e0b" />
      <rect x="28" y="7" width="2.6" height="4.5" rx="0.5" fill="#ec4899" transform="rotate(-20 29 9)" />
      <circle cx="34" cy="11" r="1.6" fill="#8b5cf6" />
      <circle cx="38" cy="18" r="1.8" fill="#14b8a6" />
      <rect x="40" y="22" width="2.6" height="4" rx="0.5" fill="#f97316" transform="rotate(25 41 24)" />
      <rect x="5" y="24" width="2.4" height="3.6" rx="0.4" fill="#6366f1" transform="rotate(-30 6 26)" />
      <path d="M24 18v-9" stroke="#f59e0b" strokeWidth="1.2" strokeDasharray="1.5 1.5" />
    </svg>
  );
}

// ========== 2. 升级大字（升到 Lv.X！） ==========

interface LevelUpItem {
  id: number;
  newLevel: number;
}
type LevelUpListener = (item: LevelUpItem) => void;
const levelUpListeners = new Set<LevelUpListener>();
let levelUpCounter = 0;

/** 触发升级祝贺动画（画面中央大字 + 烟花效果） */
export function emitLevelUp(newLevel: number) {
  if (!newLevel || newLevel < 1) return;
  levelUpCounter += 1;
  levelUpListeners.forEach((fn) => fn({ id: levelUpCounter, newLevel }));
}

function useLevelUpSubscription(onItem: (item: LevelUpItem) => void) {
  useEffect(() => {
    levelUpListeners.add(onItem);
    return () => { levelUpListeners.delete(onItem); };
  }, [onItem]);
}

interface LevelUpPop {
  id: number;
  newLevel: number;
  startedAt: number;
}

// ========== 3. 挂载在根节点的动画容器：同时渲染漂浮金币 + 升级祝贺 ==========
export function FloatingPoints() {
  const [coins, setCoins] = useState<CoinParticle[]>([]);
  const [levelUps, setLevelUps] = useState<LevelUpPop[]>([]);

  // --- 漂浮金币订阅 ---
  useFloatPointsSubscription((item) => {
    const newParts = splitToParticles(item);
    setCoins((prev) => [...prev, ...newParts]);
    const maxEnd = Math.max(...newParts.map((p) => p.delay + p.duration)) + 200;
    setTimeout(() => {
      setCoins((prev) => prev.filter((p) => !newParts.find((np) => np.id === p.id)));
    }, maxEnd);
  });

  // --- 升级祝贺订阅 ---
  useLevelUpSubscription((item) => {
    const pop: LevelUpPop = { id: item.id, newLevel: item.newLevel, startedAt: Date.now() };
    setLevelUps((prev) => [...prev, pop]);
    // 3 秒后自动移除
    setTimeout(() => {
      setLevelUps((prev) => prev.filter((p) => p.id !== pop.id));
    }, 3200);
  });

  return (
    <>
      {/* A. 漂浮金币（SVG + 数字，完全不依赖 emoji，避免安卓显示成方框） */}
      {coins.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
          {coins.map((p) => (
            <span
              key={p.id}
              className={`absolute font-bold text-xl select-none drop-shadow-sm ${
                p.isNegative ? 'text-red-500' : 'text-amber-600'
              }`}
              style={{
                left: `${p.startX}%`,
                bottom: '5%',
                animation: `coinFloat ${p.duration}ms ease-out ${p.delay}ms forwards`,
                ['--drift' as string]: `${p.drift}px`,
                whiteSpace: 'nowrap',
              }}
            >
              <CoinSvg negative={p.isNegative} />
              <span>{p.sign}{p.suffix}</span>
            </span>
          ))}
          <style>{`
            @keyframes coinFloat {
              0%   { transform: translateY(0) translateX(0) scale(0.8) rotate(-15deg); opacity: 0; }
              15%  { opacity: 1; transform: translateY(-60px) translateX(calc(var(--drift) * 0.3)) scale(1.2) rotate(10deg); }
              50%  { opacity: 1; transform: translateY(-50vh) translateX(var(--drift)) scale(1) rotate(-5deg); }
              100% { opacity: 0; transform: translateY(-85vh) translateX(calc(var(--drift) * 1.2)) scale(0.6) rotate(15deg); }
            }
          `}</style>
        </div>
      )}

      {/* B. 升级大字中央祝贺（多层叠加：外发光 + 内字） */}
      {levelUps.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-[10000] flex items-center justify-center">
          {levelUps.map((pop) => (
            <div
              key={pop.id}
              className="relative"
              style={{ animation: 'levelUpPop 3200ms ease-out forwards' }}
            >
              {/* 外圈光晕 */}
              <div className="absolute inset-0 rounded-full blur-3xl opacity-60"
                style={{
                  background: 'radial-gradient(circle, #ffd66b 0%, rgba(255,193,7,0) 70%)',
                  transform: 'scale(3)',
                  margin: '-40%',
                }}
              />
              {/* 主文字（礼花图标用 SVG，避免 emoji 显示方框） */}
              <div
                className="relative text-center select-none"
                style={{
                  fontSize: 'clamp(32px, 7vw, 68px)',
                  fontWeight: 900,
                  backgroundImage: 'linear-gradient(180deg, #fff5b8 0%, #ffbf47 45%, #f59e0b 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.35))',
                  letterSpacing: '0.02em',
                }}
              >
                <span style={{ WebkitTextFillColor: 'initial' }}>
                  <ConfettiSvg />
                </span>
                升到 Lv.{pop.newLevel}！
              </div>
              <div className="text-center text-white/95 mt-2 font-semibold"
                style={{ fontSize: 'clamp(14px, 1.6vw, 20px)', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                继续加油，考研路上越来越厉害啦{' '}
                {/* ✨ 也换成 2 个 SVG 小星星，避免 emoji 方框 */}
                <span aria-hidden>★</span>
              </div>
              {/* 五彩纸屑（4 个小圆点） */}
              {Array.from({ length: 12 }).map((_, i) => {
                const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#a855f7', '#ec4899'];
                const color = colors[i % colors.length];
                const angle = (i / 12) * Math.PI * 2;
                const distance = 180;
                const dx = Math.cos(angle) * distance;
                const dy = Math.sin(angle) * distance;
                return (
                  <span
                    key={i}
                    className="absolute rounded-full"
                    style={{
                      width: 10,
                      height: 10,
                      background: color,
                      left: '50%',
                      top: '45%',
                      animation: `confetti-${i} 3200ms ease-out forwards`,
                      ['--dx' as string]: `${dx}px`,
                      ['--dy' as string]: `${dy}px`,
                    }}
                  />
                );
              })}
            </div>
          ))}
          <style>{`
            @keyframes levelUpPop {
              0%   { transform: scale(0.2) rotate(-10deg); opacity: 0; }
              12%  { transform: scale(1.12) rotate(3deg);   opacity: 1; }
              22%  { transform: scale(1) rotate(0);          opacity: 1; }
              75%  { transform: scale(1) rotate(0);          opacity: 1; }
              100% { transform: scale(1.3) rotate(-2deg);    opacity: 0; }
            }
            /* 每个 confetti 独立偏移，使用内联 --dx/--dy */
            ${Array.from({ length: 12 }).map((_, i) => `
              @keyframes confetti-${i} {
                0%   { transform: translate(-50%,-50%) translate(0,0) scale(0);   opacity: 0; }
                15%  { transform: translate(-50%,-50%) translate(calc(var(--dx)*0.15), calc(var(--dy)*0.15)) scale(1.2); opacity: 1; }
                70%  { transform: translate(-50%,-50%) translate(calc(var(--dx)*0.9),  calc(var(--dy)*0.9 + 40px))  scale(1);   opacity: 1; }
                100% { transform: translate(-50%,-50%) translate(var(--dx), calc(var(--dy) + 120px)) scale(0.6); opacity: 0; }
              }
            `).join('\\n')}
          `}</style>
        </div>
      )}
    </>
  );
}
