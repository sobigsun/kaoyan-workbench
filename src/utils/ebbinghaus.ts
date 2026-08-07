// 艾宾浩斯记忆曲线复习间隔（天）
const EBBINGHAUS_INTERVALS = [0, 1, 2, 4, 7, 15, 30, 90];

export function getEbbinghausInterval(stage: number): number {
  return EBBINGHAUS_INTERVALS[Math.min(stage, EBBINGHAUS_INTERVALS.length - 1)];
}

export function getReviewWordCount(words: { nextReviewDate: string }[], today: string): number {
  return words.filter((w) => w.nextReviewDate <= today).length;
}

export function getLearnedWordCount(words: { learnedAt: string }[]): number {
  return words.filter((w) => w.learnedAt).length;
}
