// 根据奖励名称（或任意中文/英文短语）返回最匹配的 emoji 图标
// 维护一个关键词→emoji 的映射，按出现概率排序；支持模糊匹配、多关键词、别名
// 未匹配时返回默认 fallback

type IconEntry = { emoji: string; keywords: string[] };

const ICON_MAP: IconEntry[] = [
  // 食物
  { emoji: '🍪', keywords: ['饼干', '小零食', '零食', '饼'] },
  { emoji: '🍫', keywords: ['巧克力', 'chocolate'] },
  { emoji: '🍬', keywords: ['糖果', '糖', '软糖'] },
  { emoji: '🍩', keywords: ['甜甜圈', '甜点', '点心'] },
  { emoji: '🧋', keywords: ['奶茶', '奶茶店', '茶'] },
  { emoji: '🍵', keywords: ['抹茶', '咖啡', '拿铁', '茶', '饮品', 'coffee'] },
  { emoji: '🍜', keywords: ['面', '拉面', '粉', '小吃'] },
  { emoji: '🍣', keywords: ['寿司', '日料', '日本'] },
  { emoji: '🍲', keywords: ['火锅', '自助', '打边炉'] },
  { emoji: '🍔', keywords: ['汉堡', '快餐', '肯德基', '麦当劳', 'm记', 'kfc'] },
  { emoji: '🍕', keywords: ['披萨', '比萨', 'pizza'] },
  { emoji: '🍰', keywords: ['蛋糕', '生日', 'cheese'] },
  { emoji: '🍦', keywords: ['冰淇淋', '冰激凌', '雪糕'] },
  { emoji: '🍽', keywords: ['大餐', '聚餐', '晚餐', '午餐', '美食'] },
  { emoji: '🥤', keywords: ['饮料', '可乐', '汽水', '雪碧'] },
  { emoji: '🍉', keywords: ['水果', '西瓜', '果切'] },
  { emoji: '🍖', keywords: ['烧烤', '烤肉', '肉'] },

  // 娱乐/放松
  { emoji: '🎬', keywords: ['电影', '影片', '电影院', 'movie'] },
  { emoji: '📺', keywords: ['追剧', '电视剧', '剧', '综艺'] },
  { emoji: '🎮', keywords: ['游戏', '打游戏', 'switch', 'ps', 'game'] },
  { emoji: '🎧', keywords: ['音乐', '听歌', '演唱会', '音乐节'] },
  { emoji: '🎤', keywords: ['唱歌', 'ktv'] },
  { emoji: '🎨', keywords: ['画画', '绘画', '手工'] },
  { emoji: '📚', keywords: ['看书', '买书', '小说', '课外书'] },
  { emoji: '🛍', keywords: ['逛街', '购物', '买东西'] },
  { emoji: '🎡', keywords: ['游乐园', '欢乐谷', '迪士尼'] },
  { emoji: '🚶', keywords: ['散步', '出门', '运动'] },
  { emoji: '💆', keywords: ['按摩', 'spa'] },

  // 休息
  { emoji: '😴', keywords: ['睡觉', '休息', '午睡', '早睡', '睡半天', '补觉', '躺平'] },
  { emoji: '🛌', keywords: ['休息一天', '休息一整天', '整天休息'] },
  { emoji: '🌴', keywords: ['放假', '假期', '度假'] },

  // 奖励物品
  { emoji: '🎁', keywords: ['礼物', '礼品', '奖品', '奖励'] },
  { emoji: '💰', keywords: ['零花钱', '钱', '现金', '红包'] },
  { emoji: '💄', keywords: ['化妆品', '口红', '彩妆'] },
  { emoji: '👜', keywords: ['包包', '包', '新包'] },
  { emoji: '👟', keywords: ['鞋', '球鞋', '运动鞋'] },
  { emoji: '👕', keywords: ['衣服', '新衣服', 't恤'] },
  { emoji: '📱', keywords: ['手机', '换手机'] },
  { emoji: '💻', keywords: ['电脑', '笔记本', 'mac'] },
  { emoji: '🎧', keywords: ['耳机', '新耳机'] },
  { emoji: '⌚', keywords: ['手表', '新手表', '智能手表'] },
  { emoji: '📷', keywords: ['相机', '拍照'] },

  // 其他
  { emoji: '⭐', keywords: ['积分', '金币', 'star', 'coin'] },
  { emoji: '🪙', keywords: ['金币', 'coin', 'money'] },
  { emoji: '💰', keywords: ['钱', '现金', '红包', 'money'] },
  { emoji: '🏆', keywords: ['奖杯', '大奖励', '大奖'] },
  { emoji: '🌟', keywords: ['成就', '达成'] },
  { emoji: '🎉', keywords: ['庆祝', '盛典'] },
  { emoji: '✈️', keywords: ['旅游', '旅行', '机票', '出行'] },
  { emoji: '🏨', keywords: ['酒店', '民宿'] },
  { emoji: '🧘', keywords: ['瑜伽', '冥想'] },
  { emoji: '🏃', keywords: ['跑步', '慢跑'] },
];

// 默认图标（当没有匹配项时使用）
const DEFAULT_ICON = '🎁';

/**
 * 根据名称推断最合适的 emoji
 * @param name 用户输入的奖励名称
 * @param fallback 没匹配到的回退图标，默认 🎁
 */
export function matchIconByName(name: string, fallback: string = DEFAULT_ICON): string {
  if (!name) return fallback;
  const lower = name.toLowerCase().trim();
  if (!lower) return fallback;

  // 优先：关键词匹配（按列表顺序，越靠前优先级越高）
  for (const entry of ICON_MAP) {
    for (const kw of entry.keywords) {
      // 英文关键词小写匹配；中文关键词直接 includes
      const target = /^[a-z0-9]+$/i.test(kw) ? kw.toLowerCase() : kw;
      if (lower.includes(target)) {
        return entry.emoji;
      }
    }
  }

  // 次优先：字符级启发（当 name 只含单个字或特殊词时尝试匹配字面量）
  // 例如"吃" → 🍽，"睡" → 😴，"买" → 🛍
  const singleCharHints: Array<[string, string]> = [
    ['吃', '🍽'], ['睡', '😴'], ['休', '😴'], ['玩', '🎮'],
    ['喝', '🧋'], ['学', '📚'], ['跑', '🏃'], ['买', '🛍'],
    ['钱', '💰'], ['礼', '🎁'], ['奖', '🏆'], ['旅', '✈️'],
  ];
  for (const [ch, em] of singleCharHints) {
    if (lower.includes(ch)) return em;
  }

  return fallback;
}
