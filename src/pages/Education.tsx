import React, { useState, useMemo } from 'react';
import { AppData, MemorizeItem, Note } from '../types';
import TabBar from '../components/TabBar';
import QuestionCard from '../components/QuestionCard';
import Modal from '../components/Modal';
import ProgressBar from '../components/ProgressBar';
import { educationQuestions, sampleMemorizeItems } from '../data/defaults';
import { todayStr } from '../utils/date';

interface EducationProps {
  data: AppData;
  onUpdateData: (data: AppData) => void;
}

const SUB_TABS = [
  { key: 'framework', label: '知识框架' },
  { key: 'memorize', label: '背诵清单' },
  { key: 'questions', label: '真题练习' },
  { key: 'notes', label: '笔记' },
];

export default function Education({ data, onUpdateData }: EducationProps) {
  const [activeTab, setActiveTab] = useState('framework');

  // ==================== 知识框架 state ====================
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // ==================== 背诵清单 state ====================
  const [memorizeFilter, setMemorizeFilter] = useState<'all' | 'unmastered' | 'mastered'>('all');
  const [showMemorizeContent, setShowMemorizeContent] = useState<string | null>(null);

  // ==================== 真题练习 state ====================
  const [questionIndex, setQuestionIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);

  // ==================== 笔记 state ====================
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteTags, setNoteTags] = useState('');

  // ==================== 数据过滤 ====================
  const allMemorizeItems = useMemo(() => {
    const items = data.memorizeItems.filter((m) => m.module === 'education');
    if (items.length === 0) {
      return sampleMemorizeItems.filter((m) => m.module === 'education');
    }
    return items;
  }, [data.memorizeItems]);

  const educationNotes = useMemo(() => {
    return data.notes
      .filter((n) => n.module === 'education')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [data.notes]);

  // ==================== 知识框架：按 subModule 分组 ====================
  const groupedBySubModule = useMemo(() => {
    const groups: Record<string, MemorizeItem[]> = {};
    allMemorizeItems.forEach((item) => {
      if (!groups[item.subModule]) groups[item.subModule] = [];
      groups[item.subModule].push(item);
    });
    return groups;
  }, [allMemorizeItems]);

  const toggleGroupExpand = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleItemExpand = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleMemorizeItem = (item: MemorizeItem) => {
    const newItems = data.memorizeItems.map((m) =>
      m.id === item.id
        ? { ...m, mastered: !m.mastered, reviewCount: m.mastered ? m.reviewCount : m.reviewCount + 1 }
        : m
    );
    onUpdateData({ ...data, memorizeItems: newItems });
  };

  // ==================== 背诵清单过滤 ====================
  const filteredMemorizeItems = useMemo(() => {
    if (memorizeFilter === 'mastered') return allMemorizeItems.filter((m) => m.mastered);
    if (memorizeFilter === 'unmastered') return allMemorizeItems.filter((m) => !m.mastered);
    return allMemorizeItems;
  }, [allMemorizeItems, memorizeFilter]);

  const memorizeProgress = useMemo(() => {
    const total = allMemorizeItems.length;
    const mastered = allMemorizeItems.filter((m) => m.mastered).length;
    return { mastered, total };
  }, [allMemorizeItems]);

  // ==================== 真题练习 ====================
  const handleAnswer = (questionId: string, answer: string, isCorrect: boolean) => {
    setTotalAnswered((prev) => prev + 1);
    if (isCorrect) {
      setCorrectCount((prev) => prev + 1);
    } else {
      const existing = data.wrongQuestions.find((w) => w.questionId === questionId);
      let newWrongQuestions;
      if (existing) {
        newWrongQuestions = data.wrongQuestions.map((w) =>
          w.questionId === questionId
            ? { ...w, wrongCount: w.wrongCount + 1, lastWrongDate: todayStr(), myAnswer: answer }
            : w
        );
      } else {
        newWrongQuestions = [
          ...data.wrongQuestions,
          {
            questionId,
            module: 'education' as const,
            wrongCount: 1,
            lastWrongDate: todayStr(),
            myAnswer: answer,
          },
        ];
      }
      onUpdateData({ ...data, wrongQuestions: newWrongQuestions });
    }
  };

  const handleNextQuestion = () => {
    if (questionIndex < educationQuestions.length - 1) {
      setQuestionIndex((prev) => prev + 1);
    }
  };

  const resetQuestions = () => {
    setQuestionIndex(0);
    setCorrectCount(0);
    setTotalAnswered(0);
  };

  // ==================== 笔记 CRUD ====================
  const openAddNote = () => {
    setEditingNote(null);
    setNoteTitle('');
    setNoteContent('');
    setNoteTags('');
    setShowNoteModal(true);
  };

  const openEditNote = (note: Note) => {
    setEditingNote(note);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setNoteTags(note.tags.join(', '));
    setShowNoteModal(true);
  };

  const saveNote = () => {
    const title = noteTitle.trim();
    if (!title) return;
    const now = todayStr();
    const tags = noteTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (editingNote) {
      const newNotes = data.notes.map((n) =>
        n.id === editingNote.id
          ? { ...n, title, content: noteContent, tags, updatedAt: now }
          : n
      );
      onUpdateData({ ...data, notes: newNotes });
    } else {
      const newNote: Note = {
        id: Date.now().toString(),
        module: 'education',
        title,
        content: noteContent,
        tags,
        createdAt: now,
        updatedAt: now,
      };
      onUpdateData({ ...data, notes: [newNote, ...data.notes] });
    }
    setShowNoteModal(false);
  };

  const deleteNote = (noteId: string) => {
    if (!window.confirm('确定要删除这条笔记吗？')) return;
    onUpdateData({
      ...data,
      notes: data.notes.filter((n) => n.id !== noteId),
    });
  };

  // ==================== 子模块进度 ====================
  const getGroupProgress = (items: MemorizeItem[]) => {
    if (items.length === 0) return 0;
    return Math.round((items.filter((m) => m.mastered).length / items.length) * 100);
  };

  const subModuleLabels: Record<string, string> = {
    basic: '教育学基础',
    history: '教育史',
    psychology: '教育心理学',
    research: '教育研究方法',
  };

  return (
    <div className="pb-4 space-y-3">
      {/* 子Tab导航 */}
      <TabBar
        tabs={SUB_TABS}
        activeKey={activeTab}
        onChange={setActiveTab}
        colorClass="text-yellow-500 border-yellow-500"
      />

      {/* ==================== 1. 知识框架 ==================== */}
      {activeTab === 'framework' && (
        <div className="space-y-3">
          {Object.entries(groupedBySubModule).map(([subModule, items]) => {
            const isGroupOpen = expandedGroups.has(subModule);
            const progress = getGroupProgress(items);
            const masterCount = items.filter((m) => m.mastered).length;

            return (
              <div key={subModule} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <button
                  onClick={() => toggleGroupExpand(subModule)}
                  className="w-full flex items-center justify-between p-4 hover:bg-yellow-50/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm transition-transform ${isGroupOpen ? 'rotate-90' : ''}`}
                    >
                      ▶
                    </span>
                    <span className="font-semibold text-gray-800">
                      {subModuleLabels[subModule] || subModule}
                    </span>
                    <span className="text-xs text-gray-400">
                      ({masterCount}/{items.length})
                    </span>
                  </div>
                </button>
                <div className="px-4 pb-1">
                  <ProgressBar
                    value={progress}
                    max={100}
                    color="bg-yellow-500"
                    size="sm"
                    showPercent={false}
                  />
                </div>
                {isGroupOpen && (
                  <div className="border-t">
                    {items.map((item) => {
                      const isOpen = expandedItems.has(item.id);
                      return (
                        <div key={item.id} className="border-b last:border-b-0">
                          <button
                            onClick={() => toggleItemExpand(item.id)}
                            className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span
                                className={`text-xs transition-transform flex-shrink-0 ${isOpen ? 'rotate-90' : ''}`}
                              >
                                ▶
                              </span>
                              <span className="text-sm text-gray-700 truncate">{item.title}</span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleMemorizeItem(item);
                              }}
                              className={`ml-2 px-2 py-1 text-xs rounded-full flex-shrink-0 transition-colors ${
                                item.mastered
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              {item.mastered ? '已掌握' : '未掌握'}
                            </button>
                          </button>
                          {isOpen && (
                            <div className="px-4 pb-3 pl-10">
                              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                                {item.content}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ==================== 2. 背诵清单 ==================== */}
      {activeTab === 'memorize' && (
        <div className="space-y-3">
          {/* 总体进度 */}
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-800">背诵进度</h3>
              <span className="text-sm text-gray-500">
                {memorizeProgress.mastered}/{memorizeProgress.total}
              </span>
            </div>
            <ProgressBar
              value={memorizeProgress.mastered}
              max={memorizeProgress.total}
              color="bg-yellow-500"
              size="md"
            />
          </div>

          {/* 过滤器 */}
          <div className="flex gap-2">
            {([
              { key: 'all', label: '全部' },
              { key: 'unmastered', label: '未掌握' },
              { key: 'mastered', label: '已掌握' },
            ] as const).map((f) => (
              <button
                key={f.key}
                onClick={() => setMemorizeFilter(f.key)}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                  memorizeFilter === f.key
                    ? 'bg-yellow-500 text-white'
                    : 'bg-white text-gray-600 border'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* 背诵列表 */}
          <div className="space-y-2">
            {filteredMemorizeItems.length === 0 && (
              <div className="text-center text-gray-400 py-8 text-sm">
                {memorizeFilter === 'mastered' ? '还没有已掌握的条目' : '所有条目都已掌握!'}
              </div>
            )}
            {filteredMemorizeItems.map((item) => (
              <div key={item.id} className="bg-white rounded-xl shadow-sm border p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-800 text-sm">{item.title}</h4>
                    <span className="text-xs text-gray-400 mt-1 inline-block">
                      {subModuleLabels[item.subModule] || item.subModule} · 复习 {item.reviewCount} 次
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() =>
                        setShowMemorizeContent(showMemorizeContent === item.id ? null : item.id)
                      }
                      className="px-2.5 py-1 text-xs rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                    >
                      {showMemorizeContent === item.id ? '收起' : '查看'}
                    </button>
                    <button
                      onClick={() => toggleMemorizeItem(item)}
                      className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                        item.mastered
                          ? 'bg-yellow-500 text-white'
                          : 'bg-gray-200 text-gray-600 hover:bg-yellow-100 hover:text-yellow-700'
                      }`}
                    >
                      {item.mastered ? '已掌握' : '标记掌握'}
                    </button>
                  </div>
                </div>
                {showMemorizeContent === item.id && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                      {item.content}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== 3. 真题练习 ==================== */}
      {activeTab === 'questions' && (
        <div className="space-y-3">
          {/* 答题统计 */}
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">答题统计</h3>
              <span className="text-sm text-gray-500">
                正确: <span className="text-green-500 font-medium">{correctCount}</span> / 总答题:{' '}
                <span className="font-medium">{totalAnswered}</span> / 题库:{' '}
                <span className="font-medium">{educationQuestions.length}</span>
              </span>
            </div>
            {totalAnswered > 0 && (
              <div className="mt-2">
                <ProgressBar
                  value={correctCount}
                  max={totalAnswered}
                  color="bg-yellow-500"
                  size="sm"
                  label="正确率"
                />
              </div>
            )}
          </div>

          {/* 当前题目 */}
          {questionIndex < educationQuestions.length ? (
            <div key={educationQuestions[questionIndex].id}>
              <QuestionCard
                question={educationQuestions[questionIndex]}
                onAnswer={handleAnswer}
              />
              <button
                onClick={handleNextQuestion}
                className="mt-3 w-full py-2.5 bg-yellow-500 text-white rounded-xl text-sm font-medium hover:bg-yellow-600 transition-colors"
              >
                {questionIndex < educationQuestions.length - 1 ? '下一题' : '已经是最后一题'}
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
              <div className="text-4xl mb-3">🎉</div>
              <div className="text-lg font-semibold text-gray-800 mb-2">全部完成!</div>
              <div className="text-sm text-gray-500 mb-4">
                正确率: {totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0}%
              </div>
              <button
                onClick={resetQuestions}
                className="px-6 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600 transition-colors"
              >
                重新练习
              </button>
            </div>
          )}

          {/* 错题回顾 */}
          {data.wrongQuestions.filter((w) => w.module === 'education').length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <h3 className="font-semibold text-gray-800 mb-3">错题记录</h3>
              <div className="space-y-2">
                {data.wrongQuestions
                  .filter((w) => w.module === 'education')
                  .map((w) => {
                    const q = educationQuestions.find((eq) => eq.id === w.questionId);
                    return (
                      <div key={w.questionId} className="p-3 bg-red-50 rounded-lg text-sm">
                        <div className="text-gray-700 mb-1">{q?.question || w.questionId}</div>
                        <div className="flex gap-4 text-xs">
                          <span className="text-red-500">我的答案: {w.myAnswer}</span>
                          <span className="text-green-600">正确答案: {q?.answer}</span>
                          <span className="text-gray-400">错误 {w.wrongCount} 次</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== 4. 笔记 ==================== */}
      {activeTab === 'notes' && (
        <div className="space-y-3">
          <button
            onClick={openAddNote}
            className="w-full py-3 bg-yellow-500 text-white rounded-xl text-sm font-medium hover:bg-yellow-600 transition-colors"
          >
            + 新建笔记
          </button>

          {educationNotes.length === 0 && (
            <div className="text-center text-gray-400 py-8 text-sm">
              还没有笔记，点击上方按钮创建
            </div>
          )}

          <div className="space-y-3">
            {educationNotes.map((note) => (
              <div key={note.id} className="bg-white rounded-xl shadow-sm border p-4">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-gray-800 text-sm flex-1 min-w-0">
                    {note.title}
                  </h4>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    <button
                      onClick={() => openEditNote(note)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 transition-colors"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => deleteNote(note.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed mb-2 line-clamp-3">
                  {note.content}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {note.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-yellow-50 text-yellow-600 text-xs rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                  <span className="text-xs text-gray-400 ml-auto">
                    {note.updatedAt}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== 笔记编辑弹窗 ==================== */}
      {showNoteModal && (
        <Modal
          visible={showNoteModal}
          onClose={() => setShowNoteModal(false)}
          title={editingNote ? '编辑笔记' : '新建笔记'}
        >
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">标题</label>
              <input
                type="text"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="输入笔记标题..."
                className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-yellow-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">内容</label>
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="输入笔记内容..."
                rows={5}
                className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-yellow-500 resize-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">标签（用逗号分隔）</label>
              <input
                type="text"
                value={noteTags}
                onChange={(e) => setNoteTags(e.target.value)}
                placeholder="例如: 教育学原理, 重点"
                className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-yellow-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowNoteModal(false)}
                className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={saveNote}
                className="flex-1 py-2.5 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600 transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ==================== 背诵内容查看弹窗 ==================== */}
      {showMemorizeContent && (
        <Modal
          visible={!!showMemorizeContent}
          onClose={() => setShowMemorizeContent(null)}
          title={
            allMemorizeItems.find((m) => m.id === showMemorizeContent)?.title || '背诵内容'
          }
        >
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {allMemorizeItems.find((m) => m.id === showMemorizeContent)?.content}
          </p>
          {showMemorizeContent && (
            <button
              onClick={() => {
                const item = allMemorizeItems.find((m) => m.id === showMemorizeContent);
                if (item) toggleMemorizeItem(item);
              }}
              className={`mt-4 w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
                allMemorizeItems.find((m) => m.id === showMemorizeContent)?.mastered
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-yellow-500 text-white hover:bg-yellow-600'
              }`}
            >
              {allMemorizeItems.find((m) => m.id === showMemorizeContent)?.mastered
                ? '已掌握'
                : '标记为已掌握'}
            </button>
          )}
        </Modal>
      )}
    </div>
  );
}
