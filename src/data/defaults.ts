import { Question, Word, MemorizeItem, NewsItem, WritingTemplate } from '../types';

// 今日日期字符串，用于初始化复习日期
const today = new Date().toISOString().slice(0, 10);

// ============ 英语：考研高频词汇 ============
export const sampleWords: Word[] = [
  // A
  { id: 'w1', word: 'abandon', meaning: 'v. 放弃；抛弃', example: 'They had to abandon the plan due to lack of funds.', reviewStage: 0, nextReviewDate: today, learnedAt: today, wrongCount: 0 },
  { id: 'w2', word: 'abstract', meaning: 'adj. 抽象的 n. 摘要', example: 'The idea is too abstract to understand.', reviewStage: 0, nextReviewDate: today, learnedAt: today, wrongCount: 0 },
  { id: 'w3', word: 'academic', meaning: 'adj. 学术的；学院的', example: 'She has a strong academic background.', reviewStage: 0, nextReviewDate: today, learnedAt: today, wrongCount: 0 },
  { id: 'w4', word: 'access', meaning: 'n. 进入；通道；使用权', example: 'Students have access to the library.', reviewStage: 0, nextReviewDate: today, learnedAt: today, wrongCount: 0 },
  { id: 'w5', word: 'accommodate', meaning: 'v. 容纳；提供住宿；适应', example: 'The hotel can accommodate 200 guests.', reviewStage: 0, nextReviewDate: today, learnedAt: today, wrongCount: 0 },
  { id: 'w6', word: 'accompany', meaning: 'v. 陪伴；伴随', example: 'She accompanied me to the station.', reviewStage: 0, nextReviewDate: today, learnedAt: today, wrongCount: 0 },
  { id: 'w7', word: 'accomplish', meaning: 'v. 完成；实现', example: 'We accomplished our goal ahead of schedule.', reviewStage: 0, nextReviewDate: today, learnedAt: today, wrongCount: 0 },
  { id: 'w8', word: 'accumulate', meaning: 'v. 积累；积聚', example: 'Knowledge accumulates over time.', reviewStage: 0, nextReviewDate: today, learnedAt: today, wrongCount: 0 },
  { id: 'w9', word: 'accurate', meaning: 'adj. 准确的；精确的', example: 'The data is not accurate enough.', reviewStage: 0, nextReviewDate: today, learnedAt: today, wrongCount: 0 },
  { id: 'w10', word: 'achieve', meaning: 'v. 达到；取得', example: 'She achieved her dream of becoming a doctor.', reviewStage: 0, nextReviewDate: today, learnedAt: today, wrongCount: 0 },
  { id: 'w11', word: 'acquire', meaning: 'v. 获得；学到', example: 'He acquired a new skill through practice.', reviewStage: 0, nextReviewDate: today, learnedAt: today, wrongCount: 0 },
  { id: 'w12', word: 'adapt', meaning: 'v. 适应；改编', example: 'She adapted quickly to the new environment.', reviewStage: 0, nextReviewDate: today, learnedAt: today, wrongCount: 0 },
  { id: 'w13', word: 'adequate', meaning: 'adj. 充足的；适当的', example: 'We need adequate time to prepare.', reviewStage: 0, nextReviewDate: today, learnedAt: today, wrongCount: 0 },
  { id: 'w14', word: 'adjust', meaning: 'v. 调整；适应', example: 'You need to adjust your attitude.', reviewStage: 0, nextReviewDate: today, learnedAt: today, wrongCount: 0 },
  { id: 'w15', word: 'administration', meaning: 'n. 管理；行政', example: 'The administration approved the new policy.', reviewStage: 0, nextReviewDate: today, learnedAt: today, wrongCount: 0 },
  // B
  { id: 'w16', word: 'benefit', meaning: 'n. 利益 v. 受益', example: 'Everyone benefits from education.', reviewStage: 0, nextReviewDate: today, learnedAt: today, wrongCount: 0 },
  { id: 'w17', word: 'boost', meaning: 'v. 推动；提升', example: 'Exercise boosts your energy.', reviewStage: 0, nextReviewDate: today, learnedAt: today, wrongCount: 0 },
  // C
  { id: 'w18', word: 'capacity', meaning: 'n. 能力；容量', example: 'He has the capacity to solve problems.', reviewStage: 0, nextReviewDate: today, learnedAt: today, wrongCount: 0 },
  { id: 'w19', word: 'circumstance', meaning: 'n. 情况；环境', example: 'Under no circumstances should you give up.', reviewStage: 0, nextReviewDate: today, learnedAt: today, wrongCount: 0 },
  { id: 'w20', word: 'commit', meaning: 'v. 承诺；犯（罪）', example: 'She committed herself to helping others.', reviewStage: 0, nextReviewDate: today, learnedAt: today, wrongCount: 0 },
  { id: 'w21', word: 'comprehensive', meaning: 'adj. 全面的；综合的', example: 'We need a comprehensive solution.', reviewStage: 0, nextReviewDate: today, learnedAt: today, wrongCount: 0 },
  { id: 'w22', word: 'concept', meaning: 'n. 概念；观念', example: 'The concept of freedom varies among cultures.', reviewStage: 0, nextReviewDate: today, learnedAt: today, wrongCount: 0 },
  { id: 'w23', word: 'conduct', meaning: 'v. 进行；指挥 n. 行为', example: 'They conducted a survey among students.', reviewStage: 0, nextReviewDate: today, learnedAt: today, wrongCount: 0 },
  { id: 'w24', word: 'consequence', meaning: 'n. 结果；后果', example: 'Every action has consequences.', reviewStage: 0, nextReviewDate: today, learnedAt: today, wrongCount: 0 },
  { id: 'w25', word: 'considerable', meaning: 'adj. 相当大的；重要的', example: 'He spent a considerable amount of money.', reviewStage: 0, nextReviewDate: today, learnedAt: today, wrongCount: 0 },
  { id: 'w26', word: 'contribute', meaning: 'v. 贡献；捐助', example: 'Everyone should contribute to society.', reviewStage: 0, nextReviewDate: today, learnedAt: today, wrongCount: 0 },
  // D
  { id: 'w27', word: 'decline', meaning: 'v. 下降；拒绝 n. 衰落', example: 'The population is declining slowly.', reviewStage: 0, nextReviewDate: today, learnedAt: today, wrongCount: 0 },
  { id: 'w28', word: 'dedicate', meaning: 'v. 奉献；致力于', example: 'She dedicated her life to education.', reviewStage: 0, nextReviewDate: today, learnedAt: today, wrongCount: 0 },
  { id: 'w29', word: 'demand', meaning: 'n./v. 需求；要求', example: 'There is a high demand for skilled workers.', reviewStage: 0, nextReviewDate: today, learnedAt: today, wrongCount: 0 },
  { id: 'w30', word: 'derive', meaning: 'v. 源于；得到', example: 'The word derives from Latin.', reviewStage: 0, nextReviewDate: today, learnedAt: today, wrongCount: 0 },
  { id: 'w31', word: 'distinguish', meaning: 'v. 区分；辨别', example: 'Can you distinguish between the two?', reviewStage: 0, nextReviewDate: today, learnedAt: today, wrongCount: 0 },
  // E
  { id: 'w32', word: 'effective', meaning: 'adj. 有效的', example: 'This method is highly effective.', reviewStage: 0, nextReviewDate: today, learnedAt: today, wrongCount: 0 },
  { id: 'w33', word: 'eliminate', meaning: 'v. 消除；淘汰', example: 'We must eliminate errors.', reviewStage: 0, nextReviewDate: today, learnedAt: today, wrongCount: 0 },
  { id: 'w34', word: 'emerge', meaning: 'v. 出现；浮现', example: 'New problems emerged during the process.', reviewStage: 0, nextReviewDate: today, learnedAt: today, wrongCount: 0 },
  { id: 'w35', word: 'enhance', meaning: 'v. 提高；增强', example: 'Reading enhances your vocabulary.', reviewStage: 0, nextReviewDate: today, learnedAt: today, wrongCount: 0 },
  { id: 'w36', word: 'essential', meaning: 'adj. 必要的；本质的', example: 'Water is essential for life.', reviewStage: 0, nextReviewDate: today, learnedAt: today, wrongCount: 0 },
  { id: 'w37', word: 'establish', meaning: 'v. 建立；确立', example: 'The school was established in 1900.', reviewStage: 0, nextReviewDate: today, learnedAt: today, wrongCount: 0 },
  { id: 'w38', word: 'evaluate', meaning: 'v. 评价；评估', example: 'We need to evaluate the results.', reviewStage: 0, nextReviewDate: today, learnedAt: today, wrongCount: 0 },
  { id: 'w39', word: 'evidence', meaning: 'n. 证据；证明', example: 'There is no evidence to support the claim.', reviewStage: 0, nextReviewDate: today, learnedAt: today, wrongCount: 0 },
  { id: 'w40', word: 'evolve', meaning: 'v. 进化；演变', example: 'Technology evolves rapidly.', reviewStage: 0, nextReviewDate: today, learnedAt: today, wrongCount: 0 },
  // F
  { id: 'w41', word: 'factor', meaning: 'n. 因素；要素', example: 'Many factors contribute to success.', reviewStage: 0, nextReviewDate: today, learnedAt: today, wrongCount: 0 },
  { id: 'w42', word: 'fundamental', meaning: 'adj. 基本的；根本的', example: 'Honesty is a fundamental principle.', reviewStage: 0, nextReviewDate: today, learnedAt: today, wrongCount: 0 },
  // I
  { id: 'w43', word: 'identify', meaning: 'v. 识别；确认', example: 'Can you identify the problem?', reviewStage: 0, nextReviewDate: today, learnedAt: today, wrongCount: 0 },
  { id: 'w44', word: 'illustrate', meaning: 'v. 说明；举例', example: 'Let me illustrate with an example.', reviewStage: 0, nextReviewDate: today, learnedAt: today, wrongCount: 0 },
  { id: 'w45', word: 'indicate', meaning: 'v. 表明；指出', example: 'The data indicates a clear trend.', reviewStage: 0, nextReviewDate: today, learnedAt: today, wrongCount: 0 },
  { id: 'w46', word: 'inevitable', meaning: 'adj. 不可避免的', example: 'Change is inevitable.', reviewStage: 0, nextReviewDate: today, learnedAt: today, wrongCount: 0 },
  { id: 'w47', word: 'influence', meaning: 'n./v. 影响', example: 'Parents influence their children.', reviewStage: 0, nextReviewDate: today, learnedAt: today, wrongCount: 0 },
  { id: 'w48', word: 'innovation', meaning: 'n. 创新；改革', example: 'Innovation drives progress.', reviewStage: 0, nextReviewDate: today, learnedAt: today, wrongCount: 0 },
  { id: 'w49', word: 'interpret', meaning: 'v. 解释；口译', example: 'How do you interpret this poem?', reviewStage: 0, nextReviewDate: today, learnedAt: today, wrongCount: 0 },
  // P
  { id: 'w50', word: 'phenomenon', meaning: 'n. 现象', example: 'This is a common social phenomenon.', reviewStage: 0, nextReviewDate: today, learnedAt: today, wrongCount: 0 },
  { id: 'w51', word: 'potential', meaning: 'adj. 潜在的 n. 潜力', example: 'She has great potential.', reviewStage: 0, nextReviewDate: today, learnedAt: today, wrongCount: 0 },
  { id: 'w52', word: 'promote', meaning: 'v. 促进；提升', example: 'Education promotes social progress.', reviewStage: 0, nextReviewDate: today, learnedAt: today, wrongCount: 0 },
  { id: 'w53', word: 'prosperity', meaning: 'n. 繁荣；成功', example: 'The country enjoys prosperity.', reviewStage: 0, nextReviewDate: today, learnedAt: today, wrongCount: 0 },
  // R
  { id: 'w54', word: 'recognize', meaning: 'v. 认出；承认', example: 'I didn\'t recognize her at first.', reviewStage: 0, nextReviewDate: today, learnedAt: today, wrongCount: 0 },
  { id: 'w55', word: 'represent', meaning: 'v. 代表；表示', example: 'The symbol represents peace.', reviewStage: 0, nextReviewDate: today, learnedAt: today, wrongCount: 0 },
  // S
  { id: 'w56', word: 'significant', meaning: 'adj. 重要的；显著的', example: 'There is a significant difference.', reviewStage: 0, nextReviewDate: today, learnedAt: today, wrongCount: 0 },
  { id: 'w57', word: 'strategy', meaning: 'n. 策略；战略', example: 'We need a new strategy.', reviewStage: 0, nextReviewDate: today, learnedAt: today, wrongCount: 0 },
  { id: 'w58', word: 'subsequent', meaning: 'adj. 随后的；后来的', example: 'Subsequent events proved him right.', reviewStage: 0, nextReviewDate: today, learnedAt: today, wrongCount: 0 },
  // T
  { id: 'w59', word: 'tendency', meaning: 'n. 倾向；趋势', example: 'There is a growing tendency to work from home.', reviewStage: 0, nextReviewDate: today, learnedAt: today, wrongCount: 0 },
  { id: 'w60', word: 'transform', meaning: 'v. 改变；变形', example: 'Technology has transformed our lives.', reviewStage: 0, nextReviewDate: today, learnedAt: today, wrongCount: 0 },
];

// ============ 英语题目 ============
export const englishQuestions: Question[] = [
  {
    id: 'eq1', module: 'english', subModule: 'reading', type: 'choice',
    question: 'What is the main idea of the passage about climate change?',
    options: ['A. Climate change is a myth', 'B. Human activities are the primary cause of climate change', 'C. Climate change only affects polar regions', 'D. Technology cannot solve climate issues'],
    answer: 'B', explanation: '文章主要讨论了人类活动是气候变化的主要原因。',
  },
  {
    id: 'eq2', module: 'english', subModule: 'reading', type: 'choice',
    question: 'The word "mitigate" in paragraph 3 is closest in meaning to:',
    options: ['A. worsen', 'B. reduce', 'C. ignore', 'D. accelerate'],
    answer: 'B', explanation: 'mitigate 意为"减轻、缓解"，与 reduce 同义。',
  },
  {
    id: 'eq3', module: 'english', subModule: 'translation', type: 'fill',
    question: 'Translate: "科技的发展极大地改变了人们的生活方式。"',
    answer: 'The development of technology has greatly changed people\'s way of life.',
    explanation: '注意"极大地"译为 greatly/significantly，"生活方式"译为 way of life/lifestyle。',
  },
  {
    id: 'eq4', module: 'english', subModule: 'reading', type: 'choice',
    question: 'The author\'s attitude towards the issue can best be described as:',
    options: ['A. indifferent', 'B. critical', 'C. objective', 'D. sarcastic'],
    answer: 'C', explanation: '作者以客观态度分析问题，未表现出明显的批判或讽刺。',
  },
  {
    id: 'eq5', module: 'english', subModule: 'translation', type: 'fill',
    question: 'Translate: "教育不仅传授知识，更培养人的思维能力。"',
    answer: 'Education not only imparts knowledge but also cultivates people\'s thinking ability.',
    explanation: '"传授知识"译为 impart knowledge，"培养思维能力"译为 cultivate thinking ability。',
  },
  {
    id: 'eq6', module: 'english', subModule: 'writing', type: 'choice',
    question: 'Which of the following is the best topic sentence for a paragraph about online education?',
    options: [
      'A. Online education is very good.',
      'B. Online education has both advantages and disadvantages.',
      'C. I like online education.',
      'D. Online education is popular.',
    ],
    answer: 'B', explanation: 'B 项明确指出主题并预告内容走向，符合主题句的写作要求。',
  },
  {
    id: 'eq7', module: 'english', subModule: 'reading', type: 'choice',
    question: 'It can be inferred from the passage that:',
    options: [
      'A. the author opposes the new policy',
      'B. the new policy will have little effect',
      'C. the new policy is likely to bring positive changes',
      'D. the author has no opinion',
    ],
    answer: 'C', explanation: '推断题需基于文中线索，C 项与作者正面评价的基调一致。',
  },
];

// ============ 英语作文模板 ============
export const sampleTemplates: WritingTemplate[] = [
  {
    id: 't1', module: 'english', title: '图画作文开头模板', type: 'picture',
    content: 'As is vividly depicted in the picture, [描述图画]. The picture conveys a profound message that [主题]. This phenomenon has aroused wide concern in society.',
  },
  {
    id: 't2', module: 'english', title: '书信作文模板', type: 'letter',
    content: 'Dear [Name],\n\nI am writing this letter to [目的]. I would be very grateful if you could [请求].\n\nLooking forward to your reply.\n\nYours sincerely,\n[Your Name]',
  },
  {
    id: 't3', module: 'english', title: '议论文对比模板', type: 'argumentation',
    content: 'When it comes to [话题], opinions vary from person to person. Some people argue that [观点A], while others hold that [观点B]. As far as I am concerned, I prefer the latter view.\n\nOn one hand, [支持B的理由1]. On the other hand, [支持B的理由2].\n\nTaking all factors into consideration, we may draw the conclusion that [结论].',
  },
  {
    id: 't4', module: 'english', title: '图表作文模板', type: 'chart',
    content: 'As is shown in the chart, the number of [对象] has experienced a dramatic change from [时间1] to [时间2]. Specifically, it rose/fell from [数字1] to [数字2].\n\nSeveral reasons account for this phenomenon. Firstly, [原因1]. Secondly, [原因2].\n\nIn conclusion, [趋势预测].',
  },
  {
    id: 't5', module: 'english', title: '现象分析型模板', type: 'analysis',
    content: 'Recently, the phenomenon of [现象] has aroused wide concern. People from all walks of life are discussing its impacts.\n\nA number of factors could account for this phenomenon. To begin with, [原因1]. In addition, [原因2].\n\nAs far as I am concerned, effective measures should be taken to [建议]. Only in this way can we [期望结果].',
  },
];

// ============ 政治题目 ============
export const politicsQuestions: Question[] = [
  {
    id: 'pq1', module: 'politics', subModule: 'mao', type: 'choice',
    question: '马克思主义中国化的第一次历史性飞跃产生了什么理论成果？',
    options: ['A. 邓小平理论', 'B. 毛泽东思想', 'C. "三个代表"重要思想', 'D. 科学发展观'],
    answer: 'B', explanation: '毛泽东思想是马克思主义中国化的第一次历史性飞跃。',
  },
  {
    id: 'pq2', module: 'politics', subModule: 'mao', type: 'choice',
    question: '辩证唯物主义的根本观点是：',
    options: ['A. 联系的观点', 'B. 发展的观点', 'C. 矛盾的观点', 'D. 实践的观点'],
    answer: 'C', explanation: '对立统一规律（矛盾规律）是唯物辩证法的实质和核心。',
  },
  {
    id: 'pq3', module: 'politics', subModule: 'history', type: 'choice',
    question: '中国近代史上第一个不平等条约是：',
    options: ['A. 《北京条约》', 'B. 《南京条约》', 'C. 《马关条约》', 'D. 《辛丑条约》'],
    answer: 'B', explanation: '1842 年签订的《南京条约》是中国近代史上第一个不平等条约。',
  },
  {
    id: 'pq4', module: 'politics', subModule: 'current', type: 'choice',
    question: '全面建设社会主义现代化国家的首要任务是：',
    options: ['A. 高质量发展', 'B. 乡村振兴', 'C. 科技创新', 'D. 共同富裕'],
    answer: 'A', explanation: '高质量发展是全面建设社会主义现代化国家的首要任务。',
  },
  {
    id: 'pq5', module: 'politics', subModule: 'mao', type: 'choice',
    question: '实践是检验真理的唯一标准，这是因为：',
    options: [
      'A. 实践具有直接现实性',
      'B. 实践具有普遍性',
      'C. 实践具有历史性',
      'D. 实践具有社会性',
    ],
    answer: 'A', explanation: '实践是主观见之于客观的物质活动，具有直接现实性，能把主观与客观联系起来加以对照。',
  },
  {
    id: 'pq6', module: 'politics', subModule: 'history', type: 'choice',
    question: '新文化运动兴起的标志是：',
    options: [
      'A. 《新青年》创刊',
      'B. 五四运动',
      'C. 辛亥革命',
      'D. 中国共产党成立',
    ],
    answer: 'A', explanation: '1915 年陈独秀创办《青年杂志》（后改名《新青年》），标志着新文化运动的兴起。',
  },
  {
    id: 'pq7', module: 'politics', subModule: 'mao', type: 'choice',
    question: '矛盾的同一性是指：',
    options: [
      'A. 矛盾双方相互依存、相互贯通',
      'B. 矛盾双方相互排斥',
      'C. 矛盾双方相互对立',
      'D. 矛盾双方相互转化',
    ],
    answer: 'A', explanation: '矛盾的同一性指矛盾双方相互依存、相互贯通的性质和趋势；相互转化是同一性的表现之一。',
  },
  {
    id: 'pq8', module: 'politics', subModule: 'current', type: 'choice',
    question: '"五位一体"总体布局不包括以下哪项？',
    options: [
      'A. 经济建设',
      'B. 政治建设',
      'C. 党的建设',
      'D. 生态文明建设',
    ],
    answer: 'C', explanation: '"五位一体"包括经济、政治、文化、社会、生态文明建设；党的建设属于"四个全面"。',
  },
  {
    id: 'pq9', module: 'politics', subModule: 'history', type: 'choice',
    question: '中国共产党的成立时间是：',
    options: ['A. 1919 年', 'B. 1921 年', 'C. 1927 年', 'D. 1949 年'],
    answer: 'B', explanation: '1921 年 7 月中国共产党第一次全国代表大会在上海召开，标志着党的成立。',
  },
  {
    id: 'pq10', module: 'politics', subModule: 'mao', type: 'choice',
    question: '认识的两次飞跃分别是：',
    options: [
      'A. 从实践到认识、从认识到实践',
      'B. 从感性到理性、从理性到实践',
      'C. 从具体到抽象、从抽象到具体',
      'D. 从现象到本质、从本质到现象',
    ],
    answer: 'B', explanation: '认识过程包括从感性认识到理性认识、再从理性认识回到实践的两次飞跃。',
  },
];

// ============ 政治背诵条目 ============
export const politicsMemorizeItems: MemorizeItem[] = [
  // 马原
  { id: 'pm1', module: 'politics', subModule: 'mao', title: '矛盾的普遍性与特殊性', content: '矛盾的普遍性是指矛盾存在于一切事物的发展过程中，每一事物的发展过程中存在着自始至终的矛盾运动。矛盾的特殊性是指具体事物所包含的矛盾以及每一矛盾的各个方面都有其特点。二者是共性与个性、一般与个别的关系。', mastered: false, reviewCount: 0 },
  { id: 'pm2', module: 'politics', subModule: 'mao', title: '实践是检验真理的唯一标准', content: '实践是检验真理的唯一标准，这是由真理的本性和实践的特点决定的。真理是主观与客观相符合的哲学范畴，实践是主观见之于客观的物质活动，具有直接现实性，能把主观与客观联系起来加以对照。', mastered: false, reviewCount: 0 },
  { id: 'pm3', module: 'politics', subModule: 'mao', title: '量变与质变的关系', content: '量变是事物数量的增减和场所的变更，质变是事物根本性质的变化。量变是质变的必要准备，质变是量变的必然结果；质变巩固量变的成果并为新的量变开辟道路。', mastered: false, reviewCount: 0 },
  { id: 'pm4', module: 'politics', subModule: 'mao', title: '生产力与生产关系', content: '生产力是人类改造自然的能力，包括劳动者、劳动资料和劳动对象。生产关系是人们在物质生产过程中结成的社会关系。生产力决定生产关系，生产关系反作用于生产力，二者矛盾运动推动社会发展。', mastered: false, reviewCount: 0 },
  // 毛中特
  { id: 'pm5', module: 'politics', subModule: 'mao', title: '毛泽东思想活的灵魂', content: '毛泽东思想活的灵魂包括三个方面：实事求是、群众路线、独立自主。实事求是是根本思想路线，群众路线是根本工作路线，独立自主是根本政治原则。', mastered: false, reviewCount: 0 },
  { id: 'pm6', module: 'politics', subModule: 'current', title: '习近平新时代中国特色社会主义思想', content: '习近平新时代中国特色社会主义思想的核心要义是坚持和发展中国特色社会主义，主要内容包括"八个明确"和"十四个坚持"。它是马克思主义中国化的最新成果，是全党全国人民为实现中华民族伟大复兴而奋斗的行动指南。', mastered: false, reviewCount: 0 },
  // 史纲
  { id: 'pm7', module: 'politics', subModule: 'history', title: '新民主主义革命总路线', content: '新民主主义革命总路线：无产阶级领导的，人民大众的，反对帝国主义、封建主义和官僚资本主义的革命。革命的领导阶级是无产阶级，革命的对象是三座大山，革命的性质是新民主主义，革命的前途是社会主义。', mastered: false, reviewCount: 0 },
  { id: 'pm8', module: 'politics', subModule: 'history', title: '三大改造', content: '1953-1956 年，我国对农业、手工业和资本主义工商业进行社会主义改造。到 1956 年底基本完成，标志着社会主义基本制度在我国初步确立，我国进入社会主义初级阶段。', mastered: false, reviewCount: 0 },
];

// ============ 教育学题目 ============
export const educationQuestions: Question[] = [
  {
    id: 'dq1', module: 'education', subModule: 'basic', type: 'choice',
    question: '教育学的研究对象是：',
    options: ['A. 教育现象', 'B. 教育问题', 'C. 教育规律', 'D. 教育现象和教育问题'],
    answer: 'D', explanation: '教育学是研究教育现象和教育问题、揭示教育规律的科学。',
  },
  {
    id: 'dq2', module: 'education', subModule: 'basic', type: 'choice',
    question: '最早提出"教学相长"思想的是：',
    options: ['A. 《论语》', 'B. 《学记》', 'C. 《大学》', 'D. 《中庸》'],
    answer: 'B', explanation: '《学记》中提出"学然后知不足，教然后知困"，体现了教学相长的教育思想。',
  },
  {
    id: 'dq3', module: 'education', subModule: 'basic', type: 'choice',
    question: '提出"教育即生活"、"学校即社会"的教育家是：',
    options: ['A. 赫尔巴特', 'B. 杜威', 'C. 夸美纽斯', 'D. 卢梭'],
    answer: 'B', explanation: '美国教育家杜威提出"教育即生活"、"学校即社会"、"做中学"等实用主义教育主张。',
  },
  {
    id: 'dq4', module: 'education', subModule: 'basic', type: 'choice',
    question: '《大教学论》的作者是：',
    options: ['A. 赫尔巴特', 'B. 杜威', 'C. 夸美纽斯', 'D. 卢梭'],
    answer: 'C', explanation: '夸美纽斯 1632 年发表的《大教学论》标志着教育学成为一门独立的学科。',
  },
  {
    id: 'dq5', module: 'education', subModule: 'history', type: 'choice',
    question: '科举制度正式废除于：',
    options: ['A. 1898 年', 'B. 1905 年', 'C. 1911 年', 'D. 1919 年'],
    answer: 'B', explanation: '1905 年清政府宣布废除科举制度，结束了延续 1300 多年的科举考试。',
  },
  {
    id: 'dq6', module: 'education', subModule: 'psychology', type: 'choice',
    question: '皮亚杰将儿童认知发展分为几个阶段？',
    options: ['A. 3 个', 'B. 4 个', 'C. 5 个', 'D. 6 个'],
    answer: 'B', explanation: '皮亚杰将儿童认知发展分为感知运动阶段、前运算阶段、具体运算阶段、形式运算阶段共 4 个阶段。',
  },
  {
    id: 'dq7', module: 'education', subModule: 'basic', type: 'choice',
    question: '教育的本质属性是：',
    options: [
      'A. 培养人的社会活动',
      'B. 传递知识',
      'C. 促进经济发展',
      'D. 提高文化水平',
    ],
    answer: 'A', explanation: '教育是有目的地培养人的社会活动，这是教育区别于其他事物的本质属性。',
  },
  {
    id: 'dq8', module: 'education', subModule: 'research', type: 'choice',
    question: '教育研究中，最基本、最常用的研究方法是：',
    options: [
      'A. 实验法',
      'B. 观察法',
      'C. 调查法',
      'D. 文献法',
    ],
    answer: 'B', explanation: '观察法是教育研究中最为基本、最为常用的方法，适用于在自然状态下了解教育现象。',
  },
];

// ============ 教育学背诵条目 ============
export const educationMemorizeItems: MemorizeItem[] = [
  // 教育学原理
  { id: 'dm1', module: 'education', subModule: 'basic', title: '教育的概念', content: '教育是有目的地培养人的社会活动，是传承社会文化、传递生产经验和社会生活经验的基本途径。广义的教育包括学校教育、家庭教育和社会教育。狭义的教育主要指学校教育。', mastered: false, reviewCount: 0 },
  { id: 'dm2', module: 'education', subModule: 'basic', title: '教育的基本要素', content: '教育者、受教育者（学习者）和教育影响（教育内容、教育手段、教育方法等）是构成教育活动的基本要素。教育者在教育活动中起主导作用，受教育者是学习的主体。', mastered: false, reviewCount: 0 },
  { id: 'dm3', module: 'education', subModule: 'basic', title: '教育的功能', content: '教育功能主要包括：①本体功能（个体发展功能）：促进个体社会化与个体个性化；②社会功能：政治功能、经济功能、文化功能、人口功能等。', mastered: false, reviewCount: 0 },
  { id: 'dm4', module: 'education', subModule: 'basic', title: '教育与人的发展', content: '人的发展受遗传、环境、教育和个体主观能动性影响。遗传是物质前提，环境将发展变为现实，教育起主导作用，个体主观能动性是决定性因素。', mastered: false, reviewCount: 0 },
  // 中外教育史
  { id: 'dm5', module: 'education', subModule: 'history', title: '孔子教育思想', content: '孔子是中国古代著名教育家，主要思想包括：有教无类、因材施教、启发诱导（不愤不启，不悱不发）、学思结合（学而不思则罔，思而不学则殆）。', mastered: false, reviewCount: 0 },
  { id: 'dm6', module: 'education', subModule: 'history', title: '《学记》教育思想', content: '《学记》是世界上最早的专门论述教育问题的著作，提出"教学相长"、"启发诱导"、"藏息相辅"、"长善救失"等重要原则。', mastered: false, reviewCount: 0 },
  { id: 'dm7', module: 'education', subModule: 'history', title: '赫尔巴特的教育思想', content: '赫尔巴特被称为"现代教育学之父"，代表作《普通教育学》标志着教育学成为一门独立的规范学科。他提出"教育性教学"原则、将教学过程分为明了、联想、系统、方法四个阶段，主张以教师、教材、课堂为中心。', mastered: false, reviewCount: 0 },
  // 教育心理学
  { id: 'dm8', module: 'education', subModule: 'psychology', title: '皮亚杰认知发展阶段理论', content: '皮亚杰将儿童认知发展分为四个阶段：①感知运动阶段（0-2 岁）；②前运算阶段（2-7 岁）；③具体运算阶段（7-11 岁）；④形式运算阶段（11 岁以后）。核心机制是同化、顺应与平衡。', mastered: false, reviewCount: 0 },
  { id: 'dm9', module: 'education', subModule: 'psychology', title: '维果茨基最近发展区', content: '维果茨基提出"最近发展区"概念：儿童现有水平与可能达到的水平之间的差距。教学应走在发展的前面，应着眼于最近发展区，提供适当帮助（支架式教学）。', mastered: false, reviewCount: 0 },
  { id: 'dm10', module: 'education', subModule: 'research', title: '教育研究的基本方法', content: '教育研究基本方法包括：观察法、调查法、实验法、个案法、行动研究法、叙事研究法等。观察法是最基本的方法，实验法能揭示因果关系。', mastered: false, reviewCount: 0 },
];

// ============ 合并的背诵条目（兼容旧导出） ============
export const sampleMemorizeItems: MemorizeItem[] = [
  ...politicsMemorizeItems,
  ...educationMemorizeItems,
];

// ============ 时政热点 ============
export const sampleNewsItems: NewsItem[] = [
  { id: 'n1', title: '2026 年全国两会精神要点', summary: '重点关注高质量发展、新质生产力、民生保障等方面的政策部署。', date: '2026-03-15', tags: ['两会', '政策'], notes: '' },
  { id: 'n2', title: '教育强国建设规划纲要发布', summary: '国家发布教育强国建设规划纲要，提出到 2035 年建成教育强国的目标。', date: '2026-05-20', tags: ['教育', '政策'], notes: '' },
  { id: 'n3', title: '中国式现代化的本质要求', summary: '坚持中国共产党领导，坚持中国特色社会主义，实现高质量发展，发展全过程人民民主，丰富人民精神世界，实现全体人民共同富裕，促进人与自然和谐共生，推动构建人类命运共同体，创造人类文明新形态。', date: '2026-02-01', tags: ['中国式现代化', '理论'], notes: '' },
  { id: 'n4', title: '新质生产力的内涵与特征', summary: '新质生产力是创新起主导作用，摆脱传统经济增长方式、生产力发展路径，具有高科技、高效能、高质量特征，符合新发展理念的先进生产力质态。核心标志是全要素生产率大幅提升。', date: '2026-04-10', tags: ['新质生产力', '经济'], notes: '' },
  { id: 'n5', title: '全过程人民民主', summary: '全过程人民民主是社会主义民主政治的本质属性，是最广泛、最真实、最管用的民主。包括民主选举、民主协商、民主决策、民主管理、民主监督等环节。', date: '2026-06-01', tags: ['民主', '政治'], notes: '' },
];

// ============ 资源导航：预置免费学习资源链接 ============
export interface ResourceLink {
  id: string;
  category: 'english' | 'politics' | 'education' | 'comprehensive';
  title: string;
  url: string;
  description: string;
}

export const presetResources: ResourceLink[] = [
  // 综合
  { id: 'r1', category: 'comprehensive', title: '中国研究生招生信息网', url: 'https://yz.chsi.com.cn/', description: '官方研究生招生信息平台，提供报名、调剂、院校查询等服务。' },
  { id: 'r2', category: 'comprehensive', title: '中国教育在线考研', url: 'https://kaoyan.eol.cn/', description: '考研综合资讯、院校专业介绍、复习指导。' },
  { id: 'r3', category: 'comprehensive', title: '中国大学 MOOC', url: 'https://www.icourse163.org/', description: '免费学习各高校优质公开课，涵盖多个考研相关学科。' },
  { id: 'r4', category: 'comprehensive', title: 'B 站考研公开课', url: 'https://www.bilibili.com/', description: '搜索"考研"可观看大量免费视频课程和经验分享。' },
  // 英语
  { id: 'r5', category: 'english', title: '扇贝单词', url: 'https://www.shanbay.com/', description: '背单词工具，支持艾宾浩斯复习曲线。' },
  { id: 'r6', category: 'english', title: '沪江英语', url: 'https://www.hjenglish.com/', description: '英语学习综合平台，含考研英语备考资料。' },
  { id: 'r7', category: 'english', title: '考研英语真题', url: 'https://www.eol.cn/e_kyzt/', description: '历年考研英语真题及解析。' },
  // 政治
  { id: 'r8', category: 'politics', title: '学习强国', url: 'https://www.xuexi.cn/', description: '官方理论学习平台，时政新闻和理论文章权威来源。' },
  { id: 'r9', category: 'politics', title: '求是网', url: 'http://www.qstheory.cn/', description: '中共中央机关刊《求是》杂志官网，政治理论权威阵地。' },
  { id: 'r10', category: 'politics', title: '人民日报', url: 'http://www.people.com.cn/', description: '权威时政新闻来源，关注重要政策和评论员文章。' },
  { id: 'r11', category: 'politics', title: '新华网', url: 'http://www.xinhuanet.com/', description: '国家通讯社，权威新闻发布平台。' },
  // 教育学
  { id: 'r12', category: 'education', title: '中国知网', url: 'https://www.cnki.net/', description: '学术论文数据库，查阅教育学前沿研究（部分资源需机构订阅）。' },
  { id: 'r13', category: 'education', title: '教育部官网', url: 'http://www.moe.gov.cn/', description: '教育政策权威发布平台。' },
  { id: 'r14', category: 'education', title: '北京师范大学教育学公开课', url: 'https://www.icourse163.org/university/BNU', description: '北师大在中国大学 MOOC 上的教育学课程合集。' },
];
