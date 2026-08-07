// 模块类型（改为 string，支持用户自定义学科；旧值 'english'|'education'|'politics' 仍兼容）
export type ModuleType = string;

// 学科配置（用户可自定义增删改）
export interface SubjectConfig {
  id: string;       // 唯一标识（如 'english'、'math'，用拼音或英文）
  name: string;     // 显示名称（如「英语」「数学」）
  color: string;    // 颜色键名（green/yellow/red/blue/purple/orange/pink/cyan）
}

// 题目类型
export interface Question {
  id: string;
  module: ModuleType;
  subModule: string;
  type: 'choice' | 'fill' | 'essay';
  question: string;
  options?: string[];
  answer: string;
  explanation?: string;
}

// 单词
export interface Word {
  id: string;
  word: string;
  meaning: string;
  example?: string;
  reviewStage: number; // 艾宾浩斯复习阶段 0-7
  nextReviewDate: string;
  learnedAt: string;
  wrongCount: number;
}

// 笔记
export interface Note {
  id: string;
  module: ModuleType;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// 打卡记录
export interface CheckIn {
  date: string;
  module: ModuleType | 'all';
  tasksCompleted: number;
  tasksTotal: number;
  duration: number; // 分钟
}

// 学习计划
export interface StudyPlan {
  id: string;
  date: string;
  tasks: PlanTask[];
}

export interface PlanTask {
  id: string;
  module: ModuleType;
  content: string;
  done: boolean;
}

// 作文模板
export interface WritingTemplate {
  id: string;
  module: ModuleType;
  title: string;
  content: string;
  type: string;
}

// 背诵条目
export interface MemorizeItem {
  id: string;
  module: ModuleType;
  subModule: string;
  title: string;
  content: string;
  mastered: boolean;
  reviewCount: number;
}

// 时政热点
export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  date: string;
  tags: string[];
  notes: string;
}

// 番茄钟记录
export interface PomodoroRecord {
  date: string;
  count: number;
  totalMinutes: number;
  // 按科目拆分的番茄钟次数与时长（可选，兼容旧数据）
  byModule?: Partial<Record<ModuleType, { count: number; minutes: number }>>;
}

// 错题记录
export interface WrongQuestion {
  questionId: string;
  module: ModuleType;
  wrongCount: number;
  lastWrongDate: string;
  myAnswer: string;
}

// 用户设置
export interface Settings {
  targetDate: string; // 考研日期
  dailyGoal: number; // 每日学习时长目标（分钟）
  dailyWordGoal: number; // 每日单词目标
}

// 用户个人资料（昵称 + 自定义头像）
export interface UserProfile {
  nickname: string;        // 自定义昵称（为空时使用默认称呼）
  avatarDataUrl: string;   // 头像图片 base64（data: image/...），为空则使用默认头像
}

// 应用全局状态
export interface AppData {
  settings: Settings;
  userProfile: UserProfile;
  subjects: SubjectConfig[]; // 用户自定义学科列表（默认 3 科）
  words: Word[];
  notes: Note[];
  checkIns: CheckIn[];
  plans: StudyPlan[];
  templates: WritingTemplate[];
  memorizeItems: MemorizeItem[];
  newsItems: NewsItem[];
  pomodoroRecords: PomodoroRecord[];
  wrongQuestions: WrongQuestion[];
  studyDurations: Record<string, number>; // date -> minutes（全局，不分科目）
  // 按科目拆分的学习时长：date -> module -> minutes（可选，兼容旧数据）
  studyDurationsByModule?: Record<string, Partial<Record<ModuleType, number>>>;
  // 学习记录页用户自定义的日期分页（持久化，刷新后保留）
  customDateTabs?: string[];
  // 金币 & 成长系统（字段名保留 points，语义：金币）
  points: PointsSystem;
}

// 金币记录（原 PointRecord，字段名保留，语义：金币）
export interface PointRecord {
  id: string;
  date: string; // YYYY-MM-DD
  type: 'checkin' | 'task' | 'focus' | 'settlement' | 'redeem';
  amount: number; // 正=获得，负=消耗
  description: string;
}

// 签到状态
export interface CheckInState {
  lastCheckInDate: string; // YYYY-MM-DD
  consecutiveDays: number; // 连续签到天数
  totalCheckInDays: number; // 累计签到天数
}

// 兑换商品
export interface RewardItem {
  id: string;
  name: string;
  cost: number;
  icon: string;
  custom?: boolean;
}

// 兑换记录
export interface RedeemRecord {
  id: string;
  date: string;
  rewardName: string;
  cost: number;
}

// 成长体系升级里程碑奖励记录
export interface LevelUpMilestone {
  id: string;
  date: string;        // 升级日期 YYYY-MM-DD
  newLevel: number;    // 升到了几级
  rewardCoins: number; // 一次性金币奖励
}

// 积分系统（现已改语义为「金币 + 成长体系」）
// - balance：金币余额（单位：金币）
// - level：当前等级 1~100
// - exp：当前等级内的经验值（不包含已升级部分）
// - totalExp：累计获得总经验（用于从等级公式回算，避免跳级出错）
// - milestones：升级记录
export interface PointsSystem {
  // === 金币（原 balance，改语义：积分 = 金币） ===
  balance: number;
  history: PointRecord[];

  // === 签到奖励（连续签到等） ===
  checkIn: CheckInState;
  awardedTaskIds: string[]; // 已发放完成奖励的任务ID（防止重复发放）
  settledDates: string[]; // 已结算学习时长奖励的日期
  redeemed: RedeemRecord[];
  customRewards: RewardItem[];

  // === 新增：成长体系（1-100级，经验获取与金币获得同步） ===
  level: number;           // 当前等级 1-100（默认 1）
  exp: number;             // 当前等级内已积累经验
  totalExp: number;        // 历史累计总经验
  milestones: LevelUpMilestone[]; // 升级里程碑记录
}

// 子Tab定义
export interface SubTab {
  key: string;
  label: string;
}

// AI 助手配置
export interface AIConfig {
  platform: 'deepseek' | 'kimi';
  model: string;
  baseUrl: string;
  apiKey: string;
}

// AI 聊天消息
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  attachments?: { name: string; type: string; size: number }[];
}