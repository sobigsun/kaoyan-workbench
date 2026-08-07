// 成长体系（等级 + 经验）工具
// 1 ～ 100 级。经验与金币获得同步（获得 1 金币 = 获得 1 经验）。
// 升级时给一次性奖励金币，且在 UI 上飘字祝贺。
import { AppData } from '../types';
import { todayStr } from './date';

export const MAX_LEVEL = 100;

/**
 * 返回「升到下一级所需要的总经验」（累计）：
 *  - 1级→2级：需要累计 50 exp
 *  - 级别越高，每级需求越多，100级累计~ 25万 经验
 * 公式：S(n) = 25*n + 1.6*n^2 + 0.012*n^3    (整数化)
 */
export function expRequiredToReachLevel(targetLevel: number): number {
  if (targetLevel <= 1) return 0;
  const n = targetLevel - 1; // 需要跨过 n-1 级关卡
  const raw = 25 * n + 1.6 * n * n + 0.012 * n * n * n;
  return Math.max(0, Math.round(raw));
}

/** 给定等级，返回「下一级所需经验差」(即当前等级内 0 → 100% 所需 exp) */
export function expForCurrentLevel(level: number): number {
  if (level >= MAX_LEVEL) return 0;
  return expRequiredToReachLevel(level + 1) - expRequiredToReachLevel(level);
}

/**
 * 根据 totalExp（累计总经验）回算等级和当前等级内经验
 * 返回: { level, exp (当前等级经验), required (当前等级升级所需总量) }
 */
export function computeLevelFromTotalExp(totalExp: number): {
  level: number;
  exp: number;
  required: number;
} {
  // 找到最大 L: S(L) <= totalExp
  let L = 1;
  while (L < MAX_LEVEL && expRequiredToReachLevel(L + 1) <= totalExp) {
    L += 1;
  }
  const required = expForCurrentLevel(L);
  const exp = required === 0 ? 0 : Math.max(0, totalExp - expRequiredToReachLevel(L));
  return { level: L, exp: Math.min(exp, required), required };
}

/** 升级一次性奖励金币 = (新等级 × 20)，每 10 级再加 100 金 */
export function levelUpRewardCoins(newLevel: number): number {
  let r = newLevel * 20;
  if (newLevel % 10 === 0) r += 100;
  return r;
}

/**
 * 给 data.points 加上经验值（获得金币时同步加）。
 * 会升级到正确的等级，并给升级金币奖励 + 写历史 milestones。
 *
 * @param expDelta 本次新增经验（正数）
 * @param coinDelta 本次新增金币（正数 → 获得，负数 → 消费。消费不加 exp）
 * @param reason （仅升级时用）本次获得金币原因描述，用于升级奖励 history description
 */
export function addExpAndCoin(
  data: AppData,
  coinDelta: number,
  expDelta: number,
  reason?: string
): { data: AppData; levelUps: number[] } {
  // 1. 金币部分：如果 coinDelta 不为 0，直接修改 balance（消费场景为负数）
  const p = data.points;
  const currentBalance = p.balance ?? 0;
  let balance = currentBalance + coinDelta;
  if (balance < 0) balance = 0; // 防止消费后负数（消费已经在外层判过余额了）

  // 2. 经验部分：仅当 expDelta > 0 才累加
  let totalExp = (p.totalExp ?? 0) + (expDelta > 0 ? expDelta : 0);
  // 兼容旧数据，拿现有的 level+exp 兜底 totalExp
  const prev = computeLevelFromTotalExp(totalExp);
  const oldLevel = p.level ?? prev.level;
  const beforeExp = expRequiredToReachLevel(oldLevel) + (p.exp ?? 0);
  if (beforeExp > totalExp) totalExp = beforeExp;

  // 3. 计算新等级
  const after = computeLevelFromTotalExp(totalExp);
  const newLevel = after.level;

  // 4. 升级过程：给每一级发金币奖励 + milestones
  let next = { ...data };
  const levelUps: number[] = [];
  if (newLevel > oldLevel) {
    let bal = balance;
    const milestones = [...(p.milestones ?? [])];
    for (let L = oldLevel + 1; L <= newLevel; L++) {
      const reward = levelUpRewardCoins(L);
      bal += reward;
      levelUps.push(L);
      milestones.unshift({
        id: `${Date.now()}-${L}-${Math.random().toString(36).slice(2, 6)}`,
        date: todayStr(),
        newLevel: L,
        rewardCoins: reward,
      });
    }
    balance = bal;
    next = {
      ...next,
      points: { ...next.points, milestones },
    };
  }

  // 5. 写回 level/exp/totalExp/balance
  const finalAfter = computeLevelFromTotalExp(totalExp);
  next = {
    ...next,
    points: {
      ...next.points,
      balance,
      level: finalAfter.level,
      exp: finalAfter.exp,
      totalExp,
    },
  };

  return { data: next, levelUps };
}
