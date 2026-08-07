import { AppData, PointRecord } from '../types';
import { todayStr, addDays } from './date';
import { addExpAndCoin } from './levelSystem';
import { emitLevelUp } from '../components/FloatingPoints';

// 任务完成基础奖励
export const TASK_DONE_REWARD = 10;

// ============ 签到奖励计算 ============
// 每周递进：第 N 周基础值 = 5 + (N-1)*2；当天奖励 = 基础值 × 本周第几天
// 连续签到额外奖励：7/14/30/60/100 天节点
export function calcCheckInReward(consecutiveDays: number): {
  daily: number;
  bonus: number;
  bonusReason: string;
} {
  const weekNumber = Math.ceil(consecutiveDays / 7);
  const dayInWeek = ((consecutiveDays - 1) % 7) + 1;
  const base = 5 + (weekNumber - 1) * 2;
  const daily = base * dayInWeek;

  let bonus = 0;
  let bonusReason = '';
  if (consecutiveDays % 100 === 0) {
    bonus = 1000;
    bonusReason = `连续签到 ${consecutiveDays} 天`;
  } else if (consecutiveDays % 60 === 0) {
    bonus = 500;
    bonusReason = `连续签到 ${consecutiveDays} 天`;
  } else if (consecutiveDays % 30 === 0) {
    bonus = 200;
    bonusReason = `连续签到 ${consecutiveDays} 天`;
  } else if (consecutiveDays % 14 === 0) {
    bonus = 80;
    bonusReason = `连续签到 ${consecutiveDays} 天`;
  } else if (consecutiveDays % 7 === 0) {
    bonus = 30;
    bonusReason = `连续签到 ${consecutiveDays} 天`;
  }

  return { daily, bonus, bonusReason };
}

// ============ 专注时长奖励 ============
export function calcFocusBonus(minutes: number): { amount: number; reason: string } {
  if (minutes >= 60) return { amount: 40, reason: `专注 ${minutes} 分钟` };
  if (minutes >= 45) return { amount: 25, reason: `专注 ${minutes} 分钟` };
  if (minutes >= 25) return { amount: 15, reason: `专注 ${minutes} 分钟` };
  if (minutes >= 15) return { amount: 8, reason: `专注 ${minutes} 分钟` };
  if (minutes > 0) return { amount: 3, reason: `专注 ${minutes} 分钟` };
  return { amount: 0, reason: '' };
}

// ============ 每日学习时长结算奖励 ============
// 2-4h: +20 / 4-6h: +50 / 6-8h: +100 / 8h+: +200
export function calcSettlementReward(totalMinutes: number): { amount: number; reason: string } {
  const hours = totalMinutes / 60;
  if (hours >= 8) return { amount: 200, reason: `昨日学习 ${hours.toFixed(1)} 小时` };
  if (hours >= 6) return { amount: 100, reason: `昨日学习 ${hours.toFixed(1)} 小时` };
  if (hours >= 4) return { amount: 50, reason: `昨日学习 ${hours.toFixed(1)} 小时` };
  if (hours >= 2) return { amount: 20, reason: `昨日学习 ${hours.toFixed(1)} 小时` };
  return { amount: 0, reason: '' };
}

// ============ 积分（=金币）变更辅助函数 ============
// 在 data 上叠加一条积分记录，返回新的 data（不可变）
// 同时根据 amount 增长增加相应经验（获得金币即获得经验；消费不扣经验）
// 发生升级时会触发全局升级飘字动画
export function addPointRecord(
  data: AppData,
  amount: number,
  type: PointRecord['type'],
  description: string,
  dateStr?: string
): AppData {
  const record: PointRecord = {
    id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
    date: dateStr || todayStr(),
    type,
    amount,
    description,
  };
  // 1. 先把 history + balance（临时）写入 data 骨架
  let next0: AppData = {
    ...data,
    points: {
      ...data.points,
      // balance 不单独改，交给 addExpAndCoin 合入
      history: [record, ...data.points.history].slice(0, 500),
    },
  };
  // 2. 金币变更：amount；经验变更：获得金币时同步 amount（消费时不扣经验）
  const expDelta = amount > 0 ? amount : 0;
  const { data: finalData, levelUps } = addExpAndCoin(next0, amount, expDelta, description);
  // 3. 升级飘字
  if (levelUps.length > 0) {
    setTimeout(() => {
      try { emitLevelUp(levelUps[levelUps.length - 1]); } catch { /* ignore */ }
    }, 0);
  }
  return finalData;
}

// ============ 签到执行 ============
// 返回更新后的 data；若今天已签到则原样返回
export function doCheckIn(data: AppData): AppData {
  const today = todayStr();
  const { checkIn } = data.points;
  if (checkIn.lastCheckInDate === today) return data;

  // 判断连续：昨天签过则 +1，否则重置为 1
  const yesterday = addDays(today, -1);
  const newConsecutive = checkIn.lastCheckInDate === yesterday
    ? checkIn.consecutiveDays + 1
    : 1;

  const { daily, bonus, bonusReason } = calcCheckInReward(newConsecutive);
  let next = addPointRecord(data, daily, 'checkin', `每日签到（第 ${newConsecutive} 天）`);
  if (bonus > 0) {
    next = addPointRecord(next, bonus, 'checkin', `🎉 ${bonusReason} 额外奖励`);
  }

  return {
    ...next,
    points: {
      ...next.points,
      checkIn: {
        lastCheckInDate: today,
        consecutiveDays: newConsecutive,
        totalCheckInDays: checkIn.totalCheckInDays + 1,
      },
    },
  };
}

// ============ 任务完成奖励 ============
// 仅当任务首次标记完成时发放，避免重复
export function awardTaskDone(data: AppData, taskId: string): AppData {
  if (data.points.awardedTaskIds.includes(taskId)) return data;
  let next = addPointRecord(data, TASK_DONE_REWARD, 'task', '完成任务');
  next = {
    ...next,
    points: {
      ...next.points,
      awardedTaskIds: [...next.points.awardedTaskIds, taskId],
    },
  };
  return next;
}

// ============ 专注时长奖励 ============
export function awardFocus(data: AppData, minutes: number): AppData {
  const { amount, reason } = calcFocusBonus(minutes);
  if (amount <= 0) return data;
  return addPointRecord(data, amount, 'focus', reason);
}

// ============ 每日学习时长结算 ============
// 结算指定日期的学习时长奖励；若已结算或不足 2 小时则原样返回
export function settleDay(data: AppData, dateStr: string): AppData {
  if (data.points.settledDates.includes(dateStr)) return data;
  const totalMinutes = data.studyDurations[dateStr] || 0;
  const { amount, reason } = calcSettlementReward(totalMinutes);
  // 即使不足 2 小时也标记为已结算，避免重复检查
  let next = {
    ...data,
    points: {
      ...data.points,
      settledDates: [...data.points.settledDates, dateStr],
    },
  };
  if (amount > 0) {
    next = addPointRecord(next, amount, 'settlement', reason, dateStr);
  }
  return next;
}

// 检查并结算昨天（满足条件：当前时间 >= 8 点且昨天未结算）
export function settleYesterdayIfNeeded(data: AppData): AppData {
  const now = new Date();
  if (now.getHours() < 8) return data;
  const yesterday = addDays(todayStr(), -1);
  return settleDay(data, yesterday);
}

// ============ 兑换商品 ============
export function redeem(data: AppData, rewardId: string, rewards: { id: string; name: string; cost: number }[]): {
  ok: boolean;
  data: AppData;
  message: string;
} {
  const reward = rewards.find((r) => r.id === rewardId);
  if (!reward) return { ok: false, data, message: '商品不存在' };
  if (data.points.balance < reward.cost) {
    return { ok: false, data, message: '金币不足 🪙' };
  }
  let next = addPointRecord(data, -reward.cost, 'redeem', `兑换 ${reward.name}`);
  next = {
    ...next,
    points: {
      ...next.points,
      redeemed: [
        { id: Date.now().toString(), date: todayStr(), rewardName: reward.name, cost: reward.cost },
        ...next.points.redeemed,
      ],
    },
  };
  return { ok: true, data: next, message: `兑换成功：${reward.name}` };
}
