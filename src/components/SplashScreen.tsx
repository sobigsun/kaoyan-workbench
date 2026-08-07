import React, { useEffect, useState } from 'react';
import splashIcon from '../assets/splash-icon.jpg';

interface SplashScreenProps {
  onStart: () => void;
  dailyQuote?: string;
  nickname?: string;
  avatarDataUrl?: string;
}

const WEEKDAY_MAP = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

// 根据时间段返回对应的问候语和鼓励文案；如果用户设置了昵称，则把"XX同学/考研人/准研究生/学霸大人/追梦者"替换成昵称
function pickGreeting(nickname?: string) {
  const name = nickname?.trim();
  const hour = new Date().getHours();
  if (hour < 6) {
    return {
      hello: name ? `嗨，${name}` : '嗨，夜猫子同学',
      line1: '深夜还在努力，上岸的路上从不孤单。',
      line2: '但也别忘了好好休息，熬夜不高效哦～',
    };
  }
  if (hour < 11) {
    return {
      hello: name ? `早上好，${name}` : '早上好，考研人',
      line1: '今天也要元气满满，离上岸又近一步！',
      line2: '清晨的努力，会在考场上加倍偿还。',
    };
  }
  if (hour < 14) {
    return {
      hello: name ? `中午好，${name}` : '中午好，准研究生',
      line1: '午饭吃饱，下午才能火力全开。',
      line2: '午休一会儿，效率翻倍哦～',
    };
  }
  if (hour < 18) {
    return {
      hello: name ? `下午好，${name}` : '下午好，学霸大人',
      line1: '坚持到现在，你已经赢过很多人了。',
      line2: '午后的阳光和你的坚持，都是最美的风景。',
    };
  }
  if (hour < 22) {
    return {
      hello: name ? `晚上好，${name}` : '晚上好，追梦者',
      line1: '一天的辛苦快要收尾，你真的很棒。',
      line2: '星光不负赶路人，明天继续加油。',
    };
  }
  return {
    hello: name ? `夜深了，${name}` : '夜深了，辛苦啦',
    line1: '此刻的付出，未来都会笑着告诉你值得。',
    line2: '学完记得早点睡，明天又是新的一天。',
  };
}

function formatDate() {
  const now = new Date();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  const w = WEEKDAY_MAP[now.getDay()];
  return `${m}月${d}日 · ${w}`;
}

export function SplashScreen({ onStart, dailyQuote, nickname, avatarDataUrl }: SplashScreenProps) {
  const [mounted, setMounted] = useState(false);
  const greeting = pickGreeting(nickname);
  const dateStr = formatDate();

  useEffect(() => {
    // 淡入动画
    requestAnimationFrame(() => setMounted(true));
  }, []);

  const handleStart = () => {
    onStart();
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: 'var(--splash-gradient, linear-gradient(180deg, #bfdbfe 0%, #dbeafe 45%, #eff6ff 100%))',
      }}
    >
      {/* 极淡柔光（仅保留一层） */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 30% 15%, rgba(255,255,255,0.25), transparent 55%)',
        }}
      />

      {/* 内容区 */}
      <div
        className={`relative z-10 flex flex-col items-center w-full max-w-sm px-6 transition-all duration-700 ease-out ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
        }`}
        style={{ color: 'var(--text-primary, #3D3328)' }}
      >
        {/* 用户自定义头像 */}
        {avatarDataUrl && (
          <div
            className="mb-5 rounded-full shadow-xl overflow-hidden ring-4 ring-white/50"
            style={{ width: 88, height: 88 }}
          >
            <img
              src={avatarDataUrl}
              alt="我的头像"
              className="w-full h-full object-cover"
              draggable={false}
            />
          </div>
        )}

        {/* 圆形图标 */}
        <div
          className="rounded-full shadow-xl overflow-hidden"
          style={{
            marginBottom: avatarDataUrl ? 24 : 32,
            width: avatarDataUrl ? 104 : 128,
            height: avatarDataUrl ? 104 : 128,
            backgroundColor: 'rgba(255,255,255,0.6)',
            padding: 8,
            border: '3px solid rgba(255,255,255,0.7)',
          }}
        >
          <div
            className="w-full h-full rounded-full overflow-hidden"
            style={{
              backgroundColor: 'rgb(var(--color-primary-300, 147 197 253))',
            }}
          >
            <img
              src={splashIcon}
              alt="考研工作台"
              className="w-full h-full object-cover"
              draggable={false}
            />
          </div>
        </div>

        {/* 日期 */}
        <div className="text-sm tracking-[0.25em] mb-4 font-medium opacity-75">
          {dateStr}
        </div>

        {/* 主问候语 */}
        <h1 className="text-4xl font-semibold mb-8 tracking-wide text-center">
          {greeting.hello}
        </h1>

        {/* 鼓励文案 */}
        <p className="text-base text-center leading-relaxed mb-2 font-medium opacity-85">
          {greeting.line1}
        </p>
        <p className="text-sm text-center leading-relaxed mb-6 opacity-65">
          {greeting.line2}
        </p>

        {/* 每日励志语卡片 */}
        {dailyQuote && (
          <div
            className="w-full mb-10 px-4 py-3 rounded-2xl
                       border border-white/50 bg-white/40 shadow-sm"
          >
            <div className="text-[15px] text-center leading-relaxed font-medium opacity-90">
              <span className="mr-1">💬</span>
              {dailyQuote}
            </div>
          </div>
        )}

        {/* 开始按钮 */}
        <button
          onClick={handleStart}
          className="relative w-full max-w-[260px] bg-white rounded-full py-4 px-8
                     text-xl font-semibold tracking-widest
                     shadow-[0_8px_24px_rgba(0,0,0,0.12)]
                     hover:shadow-[0_12px_32px_rgba(0,0,0,0.18)]
                     hover:scale-[1.02] active:scale-[0.98]
                     transition-all duration-200 flex items-center justify-center gap-2
                     border border-white/60"
          style={{
            color: 'rgb(var(--color-primary-700, 29 78 216))',
          }}
        >
          开始今天 ✨
        </button>

        {/* 提示小字 */}
        <p className="mt-5 text-xs tracking-wider opacity-55">
          点一下，开启今日学习计划
        </p>
      </div>
    </div>
  );
}
