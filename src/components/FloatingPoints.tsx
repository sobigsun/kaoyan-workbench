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
  text: string;     // 文字，如 "+🪙1" / "+🪙0.5" / "-🪙20"
  color: string;    // 颜色 class
}

// 粒子颜色（默认统一金币金黄色）
const COIN_COLOR_POS = 'text-yellow-500';
const COIN_COLOR_NEG = 'text-red-400';

/**
 * 把一次 amount 拆成粒子：
 * - 非整数（如 0.5）→ 单个粒子显示 "+🪙0.5"
 * - 整数且 ≤ 20 → N 个 +🪙1
 * - 整数且 > 20 → 20 个 +🪙1 + 1 个 "+🪙剩余"
 */
function splitToParticles(item: FloatItem): CoinParticle[] {
  const amt = item.amount;
  const absAmt = Math.abs(amt);
  const isNegative = amt < 0;
  const sign = isNegative ? '-' : '+';
  const color = isNegative ? COIN_COLOR_NEG : COIN_COLOR_POS;

  const parts: CoinParticle[] = [];

  const makeOne = (suffix: string, i: number, extraDelay = 0): CoinParticle => ({
    id: `${item.id}-${i}`,
    startX: 10 + Math.random() * 80,
    drift: (Math.random() - 0.5) * 25,
    duration: 2400 + Math.random() * 1200,
    delay: extraDelay,
    text: `${sign}🪙${suffix}`,
    color,
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

// ========== 2. 升级大字（🎉 升到 Lv.X！） ==========

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
      {/* A. 漂浮金币 */}
      {coins.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
          {coins.map((p) => (
            <span
              key={p.id}
              className={`absolute font-bold text-xl ${p.color} select-none drop-shadow-sm`}
              style={{
                left: `${p.startX}%`,
                bottom: '5%',
                animation: `coinFloat ${p.duration}ms ease-out ${p.delay}ms forwards`,
                ['--drift' as string]: `${p.drift}px`,
              }}
            >
              {p.text}
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
              {/* 主文字 */}
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
                🎉 升到 Lv.{pop.newLevel}！
              </div>
              <div className="text-center text-white/95 mt-2 font-semibold"
                style={{ fontSize: 'clamp(14px, 1.6vw, 20px)', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                继续加油，考研路上越来越厉害啦 ✨
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
