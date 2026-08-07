import React, { useState, useMemo } from 'react';
import { AppData, MemorizeItem, NewsItem, WrongQuestion } from '../types';
import TabBar from '../components/TabBar';
import QuestionCard from '../components/QuestionCard';
import Modal from '../components/Modal';
import ProgressBar from '../components/ProgressBar';
import { politicsQuestions } from '../data/defaults';
import { todayStr, formatDate } from '../utils/date';

interface PoliticsProps {
  data: AppData;
  onUpdateData: (data: AppData) => void;
}

const subTabs = [
  { key: 'choice', label: '选择刷题' },
  { key: 'essay', label: '大题背诵' },
  { key: 'news', label: '时政热点' },
  { key: 'framework', label: '知识框架' },
];

const subModuleLabels: Record<string, string> = {
  mao: '马原',
  history: '史纲',
  current: '时政',
};

const subModuleOrder = ['mao', 'history', 'current'];

export default function Politics({ data, onUpdateData }: PoliticsProps) {
  const [activeTab, setActiveTab] = useState('choice');

  // ─── Tab 1: 选择刷题 ───
  const [questionFilter, setQuestionFilter] = useState('all');
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [stats, setStats] = useState({ correct: 0, total: 0 });

  // ─── Tab 2: 大题背诵 ───
  const [essayFilter, setEssayFilter] = useState<'all' | 'unmastered' | 'mastered'>('all');

  // ─── Tab 3: 时政热点 ───
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [newsNotes, setNewsNotes] = useState('');
  const [showAddNews, setShowAddNews] = useState(false);
  const [newNewsForm, setNewNewsForm] = useState({ title: '', summary: '', tags: '' });

  // ─── Tab 4: 知识框架 ───
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    subModuleOrder.forEach((s) => (init[s] = true));
    return init;
  });

  // ============================================================
  //  Derived data
  // ============================================================
  const politicsMemorizeItems = useMemo(
    () => data.memorizeItems.filter((m) => m.module === 'politics'),
    [data.memorizeItems],
  );

  // ─── Tab 1 helpers ───
  const filteredQuestions = useMemo(() => {
    if (questionFilter === 'all') return politicsQuestions;
    return politicsQuestions.filter((q) => q.subModule === questionFilter);
  }, [questionFilter]);

  const currentQuestion = filteredQuestions[currentQuestionIdx];
  const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;

  const handleAnswer = (questionId: string, answer: string, isCorrect: boolean) => {
    setStats((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));

    if (!isCorrect) {
      const idx = data.wrongQuestions.findIndex((wq) => wq.questionId === questionId);
      let newWrongQuestions: WrongQuestion[];
      if (idx >= 0) {
        newWrongQuestions = data.wrongQuestions.map((wq, i) =>
          i === idx
            ? { ...wq, wrongCount: wq.wrongCount + 1, lastWrongDate: todayStr(), myAnswer: answer }
            : wq,
        );
      } else {
        newWrongQuestions = [
          ...data.wrongQuestions,
          { questionId, module: 'politics', wrongCount: 1, lastWrongDate: todayStr(), myAnswer: answer },
        ];
      }
      onUpdateData({ ...data, wrongQuestions: newWrongQuestions });
    }

    setTimeout(() => {
      setCurrentQuestionIdx((prev) => (prev + 1) % filteredQuestions.length);
    }, 1500);
  };

  const goNextQuestion = () => {
    setCurrentQuestionIdx((prev) => (prev + 1) % filteredQuestions.length);
  };

  // ─── Tab 2 helpers ───
  const filteredMemorizeItems = useMemo(() => {
    let items = politicsMemorizeItems;
    if (essayFilter === 'mastered') items = items.filter((m) => m.mastered);
    if (essayFilter === 'unmastered') items = items.filter((m) => !m.mastered);
    return items;
  }, [politicsMemorizeItems, essayFilter]);

  const groupedMemorizeItems = useMemo(() => {
    const groups: Record<string, MemorizeItem[]> = {};
    subModuleOrder.forEach((key) => {
      groups[key] = [];
    });
    filteredMemorizeItems.forEach((item) => {
      if (groups[item.subModule]) {
        groups[item.subModule].push(item);
      }
    });
    return groups;
  }, [filteredMemorizeItems]);

  const overallProgress =
    politicsMemorizeItems.length > 0
      ? Math.round(
          (politicsMemorizeItems.filter((m) => m.mastered).length / politicsMemorizeItems.length) * 100,
        )
      : 0;

  const masteryCounts = useMemo(() => {
    const mastered = politicsMemorizeItems.filter((m) => m.mastered).length;
    const unmastered = politicsMemorizeItems.filter((m) => !m.mastered).length;
    return { mastered, unmastered };
  }, [politicsMemorizeItems]);

  const toggleMastered = (itemId: string) => {
    const newItems = data.memorizeItems.map((item) =>
      item.id === itemId
        ? { ...item, mastered: !item.mastered, reviewCount: item.reviewCount + 1 }
        : item,
    );
    onUpdateData({ ...data, memorizeItems: newItems });
  };

  const getSubModuleProgress = (subModule: string) => {
    const items = politicsMemorizeItems.filter((m) => m.subModule === subModule);
    if (items.length === 0) return 0;
    return Math.round((items.filter((m) => m.mastered).length / items.length) * 100);
  };

  // ─── Tab 3 helpers ───
  const openNewsDetail = (news: NewsItem) => {
    setSelectedNews(news);
    setNewsNotes(news.notes);
  };

  const handleSaveNewsNotes = () => {
    if (!selectedNews) return;
    const newNewsItems = data.newsItems.map((n) =>
      n.id === selectedNews.id ? { ...n, notes: newsNotes } : n,
    );
    onUpdateData({ ...data, newsItems: newNewsItems });
    setSelectedNews(null);
  };

  const handleAddNews = () => {
    if (!newNewsForm.title.trim() || !newNewsForm.summary.trim()) return;
    const newItem: NewsItem = {
      id: 'news_' + Date.now().toString(),
      title: newNewsForm.title.trim(),
      summary: newNewsForm.summary.trim(),
      date: todayStr(),
      tags: newNewsForm.tags
        .split(/[,，]/)
        .map((t) => t.trim())
        .filter(Boolean),
      notes: '',
    };
    onUpdateData({ ...data, newsItems: [...data.newsItems, newItem] });
    setShowAddNews(false);
    setNewNewsForm({ title: '', summary: '', tags: '' });
  };

  // ─── Tab 4 helpers ───
  const frameworkGroups = useMemo(() => {
    const groups: Record<string, MemorizeItem[]> = {};
    subModuleOrder.forEach((key) => {
      groups[key] = [];
    });
    politicsMemorizeItems.forEach((item) => {
      if (groups[item.subModule]) {
        groups[item.subModule].push(item);
      }
    });
    return groups;
  }, [politicsMemorizeItems]);

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // ============================================================
  //  Render: 选择刷题
  // ============================================================
  const renderChoiceTab = () => (
    <div className="space-y-3">
      {/* Sub-module filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { key: 'all', label: '全部' },
          { key: 'mao', label: '马原' },
          { key: 'history', label: '史纲' },
          { key: 'current', label: '时政' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => {
              setQuestionFilter(f.key);
              setCurrentQuestionIdx(0);
            }}
            className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              questionFilter === f.key
                ? 'bg-red-500 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-3 bg-white rounded-xl border p-3">
        <div className="text-center flex-1">
          <div className="text-xl font-semibold text-red-500">{stats.correct}</div>
          <div className="text-xs text-gray-400 mt-0.5">正确</div>
        </div>
        <div className="w-px h-8 bg-gray-200" />
        <div className="text-center flex-1">
          <div className="text-xl font-semibold text-gray-700">{stats.total}</div>
          <div className="text-xs text-gray-400 mt-0.5">总计</div>
        </div>
        <div className="w-px h-8 bg-gray-200" />
        <div className="text-center flex-1">
          <div className={`text-xl font-semibold ${accuracy >= 60 ? 'text-red-500' : 'text-orange-400'}`}>
            {accuracy}%
          </div>
          <div className="text-xs text-gray-400 mt-0.5">正确率</div>
        </div>
      </div>

      {/* Progress + question position */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <span className="whitespace-nowrap">
          第 {currentQuestionIdx + 1}/{filteredQuestions.length} 题
        </span>
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-red-500 rounded-full transition-all duration-300"
            style={{ width: `${filteredQuestions.length > 0 ? ((currentQuestionIdx + 1) / filteredQuestions.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Question card */}
      {currentQuestion ? (
        <div key={currentQuestion.id}>
          <QuestionCard question={currentQuestion} onAnswer={handleAnswer} />
          <button
            onClick={goNextQuestion}
            className="mt-2 w-full py-2 border border-gray-200 text-gray-500 rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            跳过 & 下一题
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border p-10 text-center text-gray-400">
          <div className="text-4xl mb-3">📝</div>
          <div className="text-sm">当前分类暂无题目</div>
        </div>
      )}
    </div>
  );

  // ============================================================
  //  Render: 大题背诵
  // ============================================================
  const renderEssayTab = () => (
    <div className="space-y-3">
      {/* Overall progress card */}
      <div className="bg-white rounded-xl border p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">总体掌握进度</span>
          <span className="text-xs text-gray-400">
            已掌握 {masteryCounts.mastered}/{politicsMemorizeItems.length}
          </span>
        </div>
        <ProgressBar value={overallProgress} max={100} color="bg-red-500" size="lg" />
      </div>

      {/* Per-submodule progress cards */}
      <div className="grid grid-cols-3 gap-2">
        {subModuleOrder.map((key) => {
          const label = subModuleLabels[key];
          const pct = getSubModuleProgress(key);
          const items = politicsMemorizeItems.filter((m) => m.subModule === key);
          return (
            <div key={key} className="bg-white rounded-xl border p-3 text-center">
              <div className="text-xs text-gray-500 mb-1.5">{label}</div>
              <ProgressBar value={pct} max={100} color="bg-red-400" size="sm" showPercent={false} />
              <div className="text-xs font-semibold text-red-500 mt-1.5">{pct}%</div>
              <div className="text-xs text-gray-400 mt-0.5">
                {items.filter((m) => m.mastered).length}/{items.length}
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter bar */}
      <div className="flex gap-2">
        {([
          { key: 'all', label: `全部（${politicsMemorizeItems.length}）` },
          { key: 'unmastered', label: `未掌握（${masteryCounts.unmastered}）` },
          { key: 'mastered', label: `已掌握（${masteryCounts.mastered}）` },
        ] as const).map((f) => (
          <button
            key={f.key}
            onClick={() => setEssayFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              essayFilter === f.key
                ? 'bg-red-500 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Memorize items grouped by subModule */}
      {subModuleOrder.map((subModule) => {
        const items = groupedMemorizeItems[subModule] || [];
        if (items.length === 0) return null;
        const masteredCount = items.filter((m) => m.mastered).length;
        return (
          <div key={subModule} className="bg-white rounded-xl border overflow-hidden">
            <div className="px-4 py-2.5 bg-red-50 border-b flex items-center justify-between">
              <span className="text-sm font-semibold text-red-600">
                {subModuleLabels[subModule]}
              </span>
              <span className="text-xs text-gray-400">
                {masteredCount}/{items.length}
              </span>
            </div>
            <div className="divide-y divide-gray-50">
              {items.map((item) => (
                <div key={item.id} className="p-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-800 mb-1">{item.title}</h4>
                      <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">
                        {item.content}
                      </p>
                      <div className="text-xs text-gray-400 mt-1">
                        已复习 {item.reviewCount} 次
                      </div>
                    </div>
                    <button
                      onClick={() => toggleMastered(item.id)}
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors ${
                        item.mastered
                          ? 'bg-red-500 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-500'
                      }`}
                      title={item.mastered ? '标记为未掌握' : '标记为已掌握'}
                    >
                      {item.mastered ? '✓' : '○'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {filteredMemorizeItems.length === 0 && (
        <div className="bg-white rounded-xl border p-10 text-center text-gray-400">
          <div className="text-4xl mb-3">📖</div>
          <div className="text-sm">
            {essayFilter === 'mastered' ? '还没有已掌握的条目，继续加油！' : '暂无背诵内容'}
          </div>
        </div>
      )}
    </div>
  );

  // ============================================================
  //  Render: 时政热点
  // ============================================================
  const renderNewsTab = () => (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">
          共 <span className="font-medium text-gray-700">{data.newsItems.length}</span> 条热点
        </span>
        <button
          onClick={() => setShowAddNews(true)}
          className="px-4 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 transition-colors shadow-sm"
        >
          + 添加热点
        </button>
      </div>

      {/* Empty state */}
      {data.newsItems.length === 0 && (
        <div className="bg-white rounded-xl border p-10 text-center text-gray-400">
          <div className="text-4xl mb-3">📰</div>
          <div className="text-sm">暂无时政热点，点击"添加热点"开始记录</div>
        </div>
      )}

      {/* News card list */}
      <div className="space-y-3">
        {data.newsItems
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .map((news) => (
            <div
              key={news.id}
              onClick={() => openNewsDetail(news)}
              className="bg-white rounded-xl border p-4 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-base font-medium text-gray-800 leading-snug flex-1">
                  {news.title}
                </h4>
                <span className="text-xs text-gray-400 whitespace-nowrap mt-0.5">
                  {formatDate(news.date)}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1.5 leading-relaxed line-clamp-2">
                {news.summary}
              </p>
              <div className="flex items-center gap-1.5 mt-2.5">
                {news.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 bg-red-50 text-red-500 text-xs rounded-full"
                  >
                    {tag}
                  </span>
                ))}
                {news.notes && (
                  <span className="ml-auto text-xs text-red-400 flex items-center gap-1">
                    <span>📝</span>有笔记
                  </span>
                )}
              </div>
            </div>
          ))}
      </div>

      {/* News detail modal */}
      <Modal
        visible={!!selectedNews}
        onClose={() => setSelectedNews(null)}
        title={selectedNews?.title || '热点详情'}
      >
        {selectedNews && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-gray-400">{formatDate(selectedNews.date)}</span>
              {selectedNews.tags.map((tag, i) => (
                <span key={i} className="px-2 py-0.5 bg-red-50 text-red-500 text-xs rounded-full">
                  {tag}
                </span>
              ))}
            </div>
            <p className="text-sm text-gray-700 leading-relaxed mb-4">{selectedNews.summary}</p>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">我的笔记</label>
              <textarea
                value={newsNotes}
                onChange={(e) => setNewsNotes(e.target.value)}
                placeholder="记录你的理解和考点分析..."
                className="w-full p-3 border border-gray-200 rounded-lg text-sm min-h-[140px] focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none"
              />
            </div>
            <button
              onClick={handleSaveNewsNotes}
              className="mt-3 w-full py-2.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
            >
              保存笔记
            </button>
          </div>
        )}
      </Modal>

      {/* Add news modal */}
      <Modal
        visible={showAddNews}
        onClose={() => { setShowAddNews(false); setNewNewsForm({ title: '', summary: '', tags: '' }); }}
        title="添加时政热点"
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">标题 *</label>
            <input
              value={newNewsForm.title}
              onChange={(e) => setNewNewsForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="例如：2026年两会精神要点"
              className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">摘要 *</label>
            <textarea
              value={newNewsForm.summary}
              onChange={(e) => setNewNewsForm((prev) => ({ ...prev, summary: e.target.value }))}
              placeholder="简要描述热点内容及其考试相关性..."
              className="w-full p-2.5 border border-gray-200 rounded-lg text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">标签（逗号分隔）</label>
            <input
              value={newNewsForm.tags}
              onChange={(e) => setNewNewsForm((prev) => ({ ...prev, tags: e.target.value }))}
              placeholder="例如：两会,政策,经济"
              className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>
          <button
            onClick={handleAddNews}
            disabled={!newNewsForm.title.trim() || !newNewsForm.summary.trim()}
            className="w-full py-2.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            确认添加
          </button>
        </div>
      </Modal>
    </div>
  );

  // ============================================================
  //  Render: 知识框架
  // ============================================================
  const renderFrameworkTab = () => (
    <div className="space-y-3">
      {politicsMemorizeItems.length === 0 && (
        <div className="bg-white rounded-xl border p-10 text-center text-gray-400">
          <div className="text-4xl mb-3">🗂️</div>
          <div className="text-sm">暂无知识框架数据</div>
        </div>
      )}

      {subModuleOrder.map((subModule) => {
        const items = frameworkGroups[subModule] || [];
        if (items.length === 0) return null;
        const isExpanded = expandedSections[subModule];

        return (
          <div
            key={subModule}
            className="bg-white rounded-xl border overflow-hidden shadow-sm"
          >
            <button
              onClick={() => toggleSection(subModule)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-red-50/50 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" />
                <span className="text-sm font-semibold text-gray-800">
                  {subModuleLabels[subModule]}
                </span>
                <span className="text-xs text-gray-400">
                  （{items.length} 个知识点）
                </span>
              </div>
              <span
                className={`text-gray-400 transition-transform duration-200 text-sm ${
                  isExpanded ? 'rotate-90' : ''
                }`}
              >
                &#8250;
              </span>
            </button>

            {isExpanded && (
              <div className="border-t border-gray-100">
                {items.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`px-4 py-3 hover:bg-gray-50 transition-colors ${
                      idx < items.length - 1 ? 'border-b border-gray-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 text-red-500 text-xs flex items-center justify-center font-semibold mt-0.5">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium text-gray-800">{item.title}</h4>
                          {item.mastered && (
                            <span className="flex-shrink-0 px-2 py-0.5 bg-green-50 text-green-600 text-xs rounded-full font-medium">
                              已掌握
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                          {item.content}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // ============================================================
  //  Main render
  // ============================================================
  return (
    <div className="pb-4">
      {/* Top tab bar */}
      <div className="bg-white border-b px-4 pt-2 sticky top-0 z-10">
        <TabBar
          tabs={subTabs}
          activeKey={activeTab}
          onChange={setActiveTab}
          colorClass="text-red-500 border-red-500"
        />
      </div>

      {/* Content area */}
      <div className="p-4">
        {activeTab === 'choice' && renderChoiceTab()}
        {activeTab === 'essay' && renderEssayTab()}
        {activeTab === 'news' && renderNewsTab()}
        {activeTab === 'framework' && renderFrameworkTab()}
      </div>
    </div>
  );
}
