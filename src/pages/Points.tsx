import React, { useState, useEffect, useMemo } from 'react';
import { AppData, RewardItem } from '../types';
import { todayStr, addDays, formatDate } from '../utils/date';
import { DEFAULT_REWARDS } from '../utils/storage';
import { doCheckIn, redeem, calcCheckInReward } from '../utils/pointsLogic';
import { matchIconByName } from '../utils/matchIcon';
import { emitFloatPoints } from '../components/FloatingPoints';
import { expForCurrentLevel, MAX_LEVEL, levelUpRewardCoins } from '../utils/levelSystem';

interface PointsProps {
  data: AppData;
  onUpdateData: (data: AppData) => void;
}

const TYPE_LABELS: Record<string, string> = {
  checkin: '签到',
  task: '任务',
  focus: '专注',
  settlement: '结算',
  redeem: '兑换',
};

export default function Points({ data, onUpdateData }: PointsProps) {
  const today = todayStr();
  const { points } = data;
  const isCheckedInToday = points.checkIn.lastCheckInDate === today;
  const [toast, setToast] = useState('');
  const [showAddReward, setShowAddReward] = useState(false);
  const [newRewardName, setNewRewardName] = useState('');
  const [newRewardCost, setNewRewardCost] = useState('');
  const [newRewardIcon, setNewRewardIcon] = useState('🎁');
  // 用户是否手动选过图标（手动选过就不再自动替换）
  const [iconPickedByUser, setIconPickedByUser] = useState(false);

  // 根据名称自动匹配图标（仅在用户未手动选过时自动更新）
  useEffect(() => {
    if (iconPickedByUser) return;
    setNewRewardIcon(matchIconByName(newRewardName, '🎁'));
  }, [newRewardName, iconPickedByUser]);

  // 候选图标（当前自动匹配 + 6 个同风格备选）
  const candidateIcons = useMemo(() => {
    const auto = matchIconByName(newRewardName, '🎁');
    const fallbacks = ['🎁', '🍪', '🧋', '🎬', '😴', '💰', '🎉', '🛍', '🍽', '🎮'];
    const set = new Set<string>([auto, ...fallbacks]);
    return Array.from(set).slice(0, 10);
  }, [newRewardName]);

  const resetAddForm = () => {
    setNewRewardName('');
    setNewRewardCost('');
    setNewRewardIcon('🎁');
    setIconPickedByUser(false);
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  };

  const handleCheckIn = () => {
    if (isCheckedInToday) return;
    const yesterday = addDays(today, -1);
    const willBeConsecutive = points.checkIn.lastCheckInDate === yesterday
      ? points.checkIn.consecutiveDays + 1
      : 1;
    const { daily, bonus, bonusReason } = calcCheckInReward(willBeConsecutive);
    const next = doCheckIn(data);
    onUpdateData(next);
    let msg = `签到成功 +${daily} 🪙`;
    if (bonus > 0) msg += `，连续签到奖励 +${bonus} 🪙（${bonusReason}）`;
    showToast(msg);
    // 漂浮动画：daily + bonus 分别飘出
    if (daily > 0) emitFloatPoints(daily, '签到');
    if (bonus > 0) setTimeout(() => emitFloatPoints(bonus, '连续签到'), 400);
  };

  const handleRedeem = (reward: RewardItem) => {
    const result = redeem(data, reward.id, allRewards);
    if (result.ok) {
      onUpdateData(result.data);
      showToast(result.message);
      // 兑换消耗金币：飘出对应数量的 -🪙
      emitFloatPoints(-reward.cost, '兑换');
    } else {
      showToast(result.message);
    }
  };

  const handleAddReward = () => {
    const name = newRewardName.trim();
    const cost = parseInt(newRewardCost, 10);
    if (!name || !cost || cost <= 0) {
      showToast('请填写名称和有效金币');
      return;
    }
    const reward: RewardItem = {
      id: 'c' + Date.now(),
      name,
      cost,
      icon: newRewardIcon || '🎁',
      custom: true,
    };
    onUpdateData({
      ...data,
      points: {
        ...data.points,
        customRewards: [...data.points.customRewards, reward],
      },
    });
    showToast(`已添加：${reward.icon} ${reward.name}`);
    resetAddForm();
    setShowAddReward(false);
  };

  const handleDeleteReward = (id: string) => {
    onUpdateData({
      ...data,
      points: {
        ...data.points,
        customRewards: data.points.customRewards.filter((r) => r.id !== id),
      },
    });
  };

  // 合并预置 + 自定义奖励
  const allRewards: RewardItem[] = [...DEFAULT_REWARDS, ...data.points.customRewards];

  // 本周签到进度（显示连续 7 天）
  const weekDays = Array.from({ length: 7 }, (_, i) => i);
  const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

  // 签到奖励预览（下一次签到）
  const nextConsecutive = isCheckedInToday
    ? points.checkIn.consecutiveDays
    : (points.checkIn.lastCheckInDate === addDays(today, -1)
        ? points.checkIn.consecutiveDays + 1
        : 1);
  const nextReward = calcCheckInReward(nextConsecutive);

  // 成长体系
  const level = points.level ?? 1;
  const exp = points.exp ?? 0;
  const required = expForCurrentLevel(level);
  const percent = level >= MAX_LEVEL || required <= 0 ? 100 : Math.max(0, Math.min(100, Math.round((exp / required) * 100)));
  const totalExp = points.totalExp ?? 0;
  // 下一级一次性奖励预览
  const nextLevelReward = level >= MAX_LEVEL ? 0 : levelUpRewardCoins(level + 1);

  return (
    <div className="max-w-lg mx-auto px-3 py-4 pb-8 space-y-4">
      {/* 金币余额 + 等级卡片（暖白底 + 琥珀点缀） */}
      <div
        className="rounded-2xl p-5 shadow-sm relative"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-card)',
        }}
      >
        <div className="space-y-4">
          {/* 顶部：金币余额 + 等级徽章 */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="text-xs text-gray-500">我的金币</div>
              <div className="text-4xl font-semibold mt-1 tabular-nums flex items-baseline gap-2" style={{ color: 'var(--text-heading)' }}>
                <span>{points.balance}</span>
                <span className="text-lg" style={{ color: 'var(--accent-btn)' }}>🪙</span>
              </div>
              <div className="flex gap-4 mt-2 text-xs text-gray-500">
                <span>累计签到 {points.checkIn.totalCheckInDays} 天</span>
                <span>连续 {points.checkIn.consecutiveDays} 天</span>
              </div>
            </div>
            <div
              className="flex flex-col items-center justify-center rounded-2xl px-4 py-2.5"
              style={{ backgroundColor: '#F5F0EA', border: '1px solid #E8DFD3' }}
            >
              <div className="text-[10px] text-gray-500">当前等级</div>
              <div className="text-3xl font-semibold leading-none mt-0.5" style={{ color: 'var(--text-heading)' }}>
                Lv.<span className="tabular-nums">{level}</span>
              </div>
              <div className="text-[10px] text-gray-500 mt-1">
                {level >= MAX_LEVEL ? '已达满级 ✨' : `距离满级还剩 ${MAX_LEVEL - level} 级`}
              </div>
            </div>
          </div>

          {/* 经验进度条 */}
          <div className="w-full space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-gray-600 flex items-center gap-1">
                <span>⭐</span> 成长进度
              </span>
              {level >= MAX_LEVEL ? (
                <span className="font-medium text-gray-700">🎉 已满级 · 累计 {totalExp} EXP</span>
              ) : (
                <span className="tabular-nums text-gray-500">
                  {exp}/{required} EXP · 下一级奖励 +{nextLevelReward}🪙
                </span>
              )}
            </div>
            <div
              className="w-full h-2.5 rounded-full overflow-hidden"
              style={{ background: 'var(--bg-muted)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${percent}%`,
                  backgroundImage: 'linear-gradient(90deg, #D4A574 0%, #C0843E 100%)',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 升级里程碑（最近 3 条） */}
      {points.milestones && points.milestones.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">🎊 升级里程碑</h3>
          <div className="flex flex-wrap gap-2">
            {points.milestones.slice(0, 6).map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] border"
                style={{
                  borderColor: '#E8DFD3',
                  backgroundColor: 'var(--bg-card-2)',
                }}
              >
                <span>🎉</span>
                <span className="font-semibold text-amber-700">升到 Lv.{m.newLevel}</span>
                <span className="text-amber-600">+{m.rewardCoins}🪙</span>
                <span className="text-gray-400">· {formatDate(m.date)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 签到区域 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-800">每日签到</h3>
          <span className="text-xs text-gray-400">连续 {points.checkIn.consecutiveDays} 天</span>
        </div>

        {/* 本周签到进度 */}
        <div className="grid grid-cols-7 gap-1.5 mb-3">
          {['一', '二', '三', '四', '五', '六', '日'].map((d, i) => {
            const dayDate = addDays(addDays(today, -todayIdx), i);
            const signed = points.checkIn.lastCheckInDate === dayDate || (i < todayIdx && false);
            const isToday = i === todayIdx;
            const signedToday = isCheckedInToday && isToday;
            return (
              <div
                key={i}
                className={`flex flex-col items-center justify-center py-2 rounded-lg text-xs ${
                  signedToday
                    ? 'text-white shadow-sm'
                    : isToday
                      ? 'bg-amber-50 text-amber-600 ring-1 ring-amber-300'
                      : 'bg-gray-50 text-gray-400'
                }`}
                style={signedToday ? { backgroundColor: 'var(--accent-btn)' } : undefined}
              >
                <span className="text-[10px]">{d}</span>
                <span className="mt-0.5">{signedToday ? '✓' : signed ? '·' : ''}</span>
              </div>
            );
          })}
        </div>

        {/* 下次签到奖励预览 */}
        <div className="bg-amber-50/60 rounded-xl p-2.5 mb-3 text-xs text-gray-600 border border-amber-100">
          {isCheckedInToday ? (
            <span>
              今日已签到 · 明日签到可得{' '}
              <b className="text-amber-600">+{calcCheckInReward(nextConsecutive + 1).daily} 🪙</b>
            </span>
          ) : (
            <span>
              本次签到可得 <b className="text-amber-600">+{nextReward.daily} 🪙</b>
              {nextReward.bonus > 0 && (
                <span className="text-orange-500">
                  {' '}· 连续奖励 +{nextReward.bonus}🪙（{nextReward.bonusReason}）
                </span>
              )}
            </span>
          )}
        </div>

        <button
          onClick={handleCheckIn}
          disabled={isCheckedInToday}
          className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors ${
            isCheckedInToday
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'text-white hover:opacity-90 shadow-sm'
          }`}
          style={isCheckedInToday ? undefined : { backgroundColor: 'var(--accent-btn)' }}
        >
          {isCheckedInToday ? '今日已签到 ✓' : '立即签到领金币 🪙'}
        </button>
      </div>

      {/* 金币获取规则 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-2">🪙 金币与经验获取规则</h3>
        <ul className="text-xs text-gray-500 space-y-1.5">
          <li>📅 每日签到：按周递进，连续签到 7/14/30/60/100 天有额外奖励</li>
          <li>✅ 完成任务：+10 🪙（同步获得 10 经验）</li>
          <li>⏱ 专注奖励：≥15分钟 +8🪙 / ≥25分钟 +15🪙 / ≥45分钟 +25🪙 / ≥60分钟 +40🪙</li>
          <li>⏰ 每学习 1 分钟：+0.5🪙，每满 30 分钟还有里程碑 +5🪙</li>
          <li>📊 每日结算（次日8点）：2-4h +20🪙 / 4-6h +50🪙 / 6-8h +100🪙 / 8h+ +200🪙</li>
          <li>⭐ 升级奖励：每升一级获得「等级 × 20 🪙」，每 10 级额外再 +100🪙</li>
        </ul>
      </div>

      {/* 兑换商城 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-800">🏪 金币兑换</h3>
          <button
            onClick={() => {
              if (showAddReward) {
                resetAddForm();
              }
              setShowAddReward(!showAddReward);
            }}
            className="text-xs text-primary-500"
          >
            {showAddReward ? '取消' : '+ 自定义奖励'}
          </button>
        </div>

        {/* 添加自定义奖励 */}
        {showAddReward && (
          <div className="bg-gray-50 rounded-xl p-3 mb-3 space-y-2.5">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center text-4xl bg-white rounded-xl border border-gray-200">
                {newRewardIcon || '🎁'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-800 truncate">
                  {newRewardName || '请输入奖励名称…'}
                </div>
                <div className="text-xs text-primary-600 mt-0.5">
                  {newRewardCost ? `${newRewardCost} 🪙` : '请设置所需金币…'}
                </div>
                <div className="text-[10px] text-gray-400 mt-1">
                  {iconPickedByUser ? '图标：手动选择' : '图标：自动匹配（可点下方换一个）'}
                </div>
              </div>
            </div>

            <div>
              <div className="text-[11px] text-gray-500 mb-1">选择图标</div>
              <div className="flex flex-wrap gap-1.5">
                {candidateIcons.map((emoji) => {
                  const active = emoji === newRewardIcon;
                  return (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setNewRewardIcon(emoji);
                        setIconPickedByUser(true);
                      }}
                      className={`w-8 h-8 flex items-center justify-center text-lg rounded-lg transition-all ${
                        active
                          ? 'bg-primary-500 text-white ring-2 ring-primary-300 scale-105'
                          : 'bg-white border border-gray-200 hover:border-primary-300 hover:scale-105'
                      }`}
                    >
                      {emoji}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setIconPickedByUser(false)}
                  className="w-8 h-8 flex items-center justify-center text-xs text-gray-400 rounded-lg bg-white border border-dashed border-gray-300 hover:text-primary-500 hover:border-primary-300"
                  title="重新自动匹配"
                >
                  ↺
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <input
                value={newRewardName}
                onChange={(e) => setNewRewardName(e.target.value)}
                placeholder="奖励名称（如：一杯奶茶 / 看场电影 / 睡半天）"
                className="w-full p-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary-400"
              />
              <input
                type="number"
                value={newRewardCost}
                onChange={(e) => setNewRewardCost(e.target.value)}
                placeholder="所需金币（正整数）"
                min={1}
                className="w-full p-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary-400"
              />
            </div>

            <button
              onClick={handleAddReward}
              disabled={!newRewardName.trim() || !newRewardCost || parseInt(newRewardCost, 10) <= 0}
              className="w-full py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              添加奖励
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          {allRewards.map((reward) => {
            const canAfford = points.balance >= reward.cost;
            return (
              <div
                key={reward.id}
                className={`relative rounded-xl border p-3 flex flex-col items-center ${
                  canAfford ? 'border-amber-200 bg-amber-50/40' : 'border-gray-100 bg-gray-50'
                }`}
              >
                {reward.custom && (
                  <button
                    onClick={() => handleDeleteReward(reward.id)}
                    className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-full text-gray-300 hover:bg-red-50 hover:text-red-500 text-xs"
                    title="删除"
                  >
                    ×
                  </button>
                )}
                <span className="text-2xl mb-1">{reward.icon}</span>
                <span className="text-xs text-gray-700 text-center mb-1">{reward.name}</span>
                <span className={`text-sm font-semibold tabular-nums flex items-baseline gap-0.5 ${canAfford ? 'text-amber-600' : 'text-gray-400'}`}>
                  {reward.cost}
                  <span>🪙</span>
                </span>
                <button
                  onClick={() => handleRedeem(reward)}
                  disabled={!canAfford}
                  className={`mt-2 w-full py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    canAfford
                      ? 'text-white hover:opacity-90 shadow-sm'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                  style={canAfford ? { backgroundColor: 'var(--accent-btn)' } : undefined}
                >
                  {canAfford ? '兑换' : '金币不足'}
                </button>
              </div>
            );
          })}
        </div>

        {/* 兑换记录 */}
        {points.redeemed.length > 0 && (
          <div className="mt-4">
            <h4 className="text-xs font-medium text-gray-500 mb-2">兑换记录</h4>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {points.redeemed.slice(0, 10).map((r) => (
                <div key={r.id} className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">{formatDate(r.date)} · {r.rewardName}</span>
                  <span className="tabular-nums flex items-center gap-0.5" style={{ color: '#B85450' }}>
                    -{r.cost}<span>🪙</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 金币历史 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <h3 className="text-base font-semibold text-gray-800 mb-3">💰 金币明细</h3>
        {points.history.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">暂无金币记录，去签到领第一笔吧！</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {points.history.slice(0, 50).map((r) => (
              <div key={r.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-gray-700 truncate">{r.description}</div>
                  <div className="text-[11px] text-gray-400">
                    {formatDate(r.date)} · {TYPE_LABELS[r.type] || r.type}
                  </div>
                </div>
                <span
                  className="text-sm font-semibold tabular-nums flex items-center gap-0.5"
                  style={{ color: r.amount >= 0 ? 'var(--accent-btn)' : '#B85450' }}
                >
                  {r.amount >= 0 ? '+' : ''}{r.amount}<span>🪙</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Toast 提示 */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-gray-800 text-white text-sm px-4 py-2 rounded-full shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
