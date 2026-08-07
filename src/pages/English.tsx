import React, { useState } from 'react';
import { AppData, Word, WritingTemplate, Note, WrongQuestion } from '../types';
import TabBar from '../components/TabBar';
import WordCard from '../components/WordCard';
import QuestionCard from '../components/QuestionCard';
import Modal from '../components/Modal';
import ProgressBar from '../components/ProgressBar';
import { todayStr, addDays } from '../utils/date';
import { getEbbinghausInterval, getReviewWordCount, getLearnedWordCount } from '../utils/ebbinghaus';
import { sampleWords, englishQuestions, sampleTemplates } from '../data/defaults';

interface EnglishProps {
  data: AppData;
  onUpdateData: (data: AppData) => void;
}

const SUB_TABS = [
  { key: 'words', label: '单词' },
  { key: 'reading', label: '阅读刷题' },
  { key: 'writing', label: '作文模板' },
  { key: 'sentences', label: '长难句' },
];

const READING_SUB_MODULES = ['reading', 'translation', 'cloze', 'newType'];

export default function English({ data, onUpdateData }: EnglishProps) {
  const today = todayStr();
  const [activeTab, setActiveTab] = useState('words');

  // ==================== 单词 ====================
  const [wordIndex, setWordIndex] = useState(0);
  const [newWordText, setNewWordText] = useState('');
  const [newWordMeaning, setNewWordMeaning] = useState('');
  const [newWordExample, setNewWordExample] = useState('');
  const [showAddWord, setShowAddWord] = useState(false);

  const reviewWords = data.words.filter((w) => w.nextReviewDate <= today);
  const currentWord = reviewWords[wordIndex];
  const learnedCount = getLearnedWordCount(data.words);
  const reviewCount = getReviewWordCount(data.words, today);
  const totalWords = data.words.length;

  const handleWordReview = (wordId: string, correct: boolean) => {
    const newWords = data.words.map((w) => {
      if (w.id !== wordId) return w;
      if (correct) {
        const newStage = w.reviewStage + 1;
        const interval = getEbbinghausInterval(newStage);
        return {
          ...w,
          reviewStage: newStage,
          nextReviewDate: addDays(today, interval),
        };
      } else {
        return {
          ...w,
          reviewStage: 0,
          nextReviewDate: today,
          wrongCount: w.wrongCount + 1,
        };
      }
    });
    onUpdateData({ ...data, words: newWords });
  };

  const handleAddWord = () => {
    const word = newWordText.trim();
    const meaning = newWordMeaning.trim();
    if (!word || !meaning) return;
    const newWord: Word = {
      id: 'w' + Date.now(),
      word,
      meaning,
      example: newWordExample.trim() || undefined,
      reviewStage: 0,
      nextReviewDate: today,
      learnedAt: today,
      wrongCount: 0,
    };
    onUpdateData({ ...data, words: [...data.words, newWord] });
    setNewWordText('');
    setNewWordMeaning('');
    setNewWordExample('');
    setShowAddWord(false);
  };

  const initSampleWords = () => {
    const existingIds = new Set(data.words.map((w) => w.id));
    const toAdd = sampleWords.filter((w) => !existingIds.has(w.id));
    if (toAdd.length === 0) return;
    onUpdateData({ ...data, words: [...data.words, ...toAdd] });
  };

  // ==================== 阅读刷题 ====================
  const [readingSubModule, setReadingSubModule] = useState('reading');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [readingStats, setReadingStats] = useState({ correct: 0, total: 0 });

  const filteredQuestions = englishQuestions.filter((q) => q.subModule === readingSubModule);
  const currentQuestion = filteredQuestions[questionIndex];

  const handleQuestionAnswer = (questionId: string, answer: string, isCorrect: boolean) => {
    setReadingStats((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));

    if (!isCorrect) {
      const exists = data.wrongQuestions.find((wq) => wq.questionId === questionId);
      let newWrongQuestions: WrongQuestion[];
      if (exists) {
        newWrongQuestions = data.wrongQuestions.map((wq) =>
          wq.questionId === questionId
            ? { ...wq, wrongCount: wq.wrongCount + 1, lastWrongDate: today, myAnswer: answer }
            : wq
        );
      } else {
        newWrongQuestions = [
          ...data.wrongQuestions,
          {
            questionId,
            module: 'english' as const,
            wrongCount: 1,
            lastWrongDate: today,
            myAnswer: answer,
          },
        ];
      }
      onUpdateData({ ...data, wrongQuestions: newWrongQuestions });
    }
  };

  const nextQuestion = () => {
    if (questionIndex < filteredQuestions.length - 1) {
      setQuestionIndex(questionIndex + 1);
    }
  };

  const resetReading = () => {
    setQuestionIndex(0);
    setReadingStats({ correct: 0, total: 0 });
  };

  // ==================== 作文模板 ====================
  const [viewTemplate, setViewTemplate] = useState<WritingTemplate | null>(null);
  const [editTemplateContent, setEditTemplateContent] = useState('');
  const [newTemplateTitle, setNewTemplateTitle] = useState('');
  const [newTemplateType, setNewTemplateType] = useState('argumentation');
  const [newTemplateContent, setNewTemplateContent] = useState('');
  const [showAddTemplate, setShowAddTemplate] = useState(false);

  const englishTemplates = data.templates.filter((t) => t.module === 'english');

  const openTemplateView = (tpl: WritingTemplate) => {
    setViewTemplate(tpl);
    setEditTemplateContent(tpl.content);
  };

  const saveTemplateEdit = () => {
    if (!viewTemplate) return;
    const newTemplates = data.templates.map((t) =>
      t.id === viewTemplate.id ? { ...t, content: editTemplateContent } : t
    );
    onUpdateData({ ...data, templates: newTemplates });
    setViewTemplate(null);
  };

  const deleteTemplate = (id: string) => {
    onUpdateData({
      ...data,
      templates: data.templates.filter((t) => t.id !== id),
    });
  };

  const handleAddTemplate = () => {
    const title = newTemplateTitle.trim();
    const content = newTemplateContent.trim();
    if (!title || !content) return;
    const newTpl: WritingTemplate = {
      id: 't' + Date.now(),
      module: 'english',
      title,
      content,
      type: newTemplateType,
    };
    onUpdateData({ ...data, templates: [...data.templates, newTpl] });
    setNewTemplateTitle('');
    setNewTemplateContent('');
    setNewTemplateType('argumentation');
    setShowAddTemplate(false);
  };

  const initSampleTemplates = () => {
    const existingIds = new Set(data.templates.map((t) => t.id));
    const toAdd = sampleTemplates.filter((t) => !existingIds.has(t.id));
    if (toAdd.length === 0) return;
    onUpdateData({ ...data, templates: [...data.templates, ...toAdd] });
  };

  // ==================== 长难句 ====================
  const [newSentenceTitle, setNewSentenceTitle] = useState('');
  const [newSentenceContent, setNewSentenceContent] = useState('');
  const [viewSentence, setViewSentence] = useState<Note | null>(null);
  const [editSentenceContent, setEditSentenceContent] = useState('');

  const sentenceNotes = data.notes.filter(
    (n) => n.module === 'english' && n.tags.includes('长难句')
  );

  const handleAddSentence = () => {
    const title = newSentenceTitle.trim();
    const content = newSentenceContent.trim();
    if (!title || !content) return;
    const newNote: Note = {
      id: 'n' + Date.now(),
      module: 'english',
      title,
      content,
      tags: ['长难句'],
      createdAt: today,
      updatedAt: today,
    };
    onUpdateData({ ...data, notes: [...data.notes, newNote] });
    setNewSentenceTitle('');
    setNewSentenceContent('');
  };

  const openSentence = (note: Note) => {
    setViewSentence(note);
    setEditSentenceContent(note.content);
  };

  const saveSentenceEdit = () => {
    if (!viewSentence) return;
    const newNotes = data.notes.map((n) =>
      n.id === viewSentence.id
        ? { ...n, content: editSentenceContent, updatedAt: today }
        : n
    );
    onUpdateData({ ...data, notes: newNotes });
    setViewSentence(null);
  };

  const deleteSentence = (id: string) => {
    onUpdateData({
      ...data,
      notes: data.notes.filter((n) => n.id !== id),
    });
  };

  // ==================== 渲染 ====================

  return (
    <div className="pb-4">
      <TabBar
        tabs={SUB_TABS}
        activeKey={activeTab}
        onChange={setActiveTab}
        colorClass="text-green-500 border-green-500"
      />

      {/* ========== 单词 ========== */}
      {activeTab === 'words' && (
        <div className="p-4 space-y-4">
          {/* 统计卡片 */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl shadow-sm border p-3 text-center">
              <div className="text-2xl font-semibold text-green-600">{learnedCount}</div>
              <div className="text-xs text-gray-400 mt-1">已学单词</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-3 text-center">
              <div className="text-2xl font-semibold text-orange-500">{reviewCount}</div>
              <div className="text-xs text-gray-400 mt-1">待复习</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-3 text-center">
              <div className="text-2xl font-semibold text-gray-700">{totalWords}</div>
              <div className="text-xs text-gray-400 mt-1">总词汇</div>
            </div>
          </div>

          <ProgressBar
            label="学习进度"
            value={learnedCount}
            max={Math.max(totalWords, 1)}
            color="bg-green-500"
          />

          {/* 复习卡片 */}
          {reviewWords.length > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500">
                  待复习 {wordIndex + 1} / {reviewWords.length}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setWordIndex(Math.max(0, wordIndex - 1))}
                    disabled={wordIndex === 0}
                    className="px-3 py-1 text-xs bg-gray-100 rounded-lg disabled:opacity-30"
                  >
                    上一个
                  </button>
                  <button
                    onClick={() => setWordIndex(Math.min(reviewWords.length - 1, wordIndex + 1))}
                    disabled={wordIndex >= reviewWords.length - 1}
                    className="px-3 py-1 text-xs bg-gray-100 rounded-lg disabled:opacity-30"
                  >
                    下一个
                  </button>
                </div>
              </div>

              {currentWord && (
                <WordCard word={currentWord} onReview={handleWordReview} />
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
              <div className="text-4xl mb-3">&#127881;</div>
              <div className="text-gray-500 text-sm">今日没有待复习的单词</div>
              <div className="text-gray-400 text-xs mt-1">添加新单词或等待复习日到来</div>
            </div>
          )}

          {/* 添加新单词 */}
          {!showAddWord ? (
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddWord(true)}
                className="flex-1 py-2.5 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition-colors"
              >
                + 添加新单词
              </button>
              <button
                onClick={initSampleWords}
                className="flex-1 py-2.5 border border-green-300 text-green-600 rounded-xl text-sm font-medium hover:bg-green-50 transition-colors"
              >
                导入示例词汇
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">添加新单词</h3>
              <input
                value={newWordText}
                onChange={(e) => setNewWordText(e.target.value)}
                placeholder="单词"
                className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-500"
              />
              <input
                value={newWordMeaning}
                onChange={(e) => setNewWordMeaning(e.target.value)}
                placeholder="释义"
                className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-500"
              />
              <input
                value={newWordExample}
                onChange={(e) => setNewWordExample(e.target.value)}
                placeholder="例句（可选）"
                className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddWord}
                  className="flex-1 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600"
                >
                  确认添加
                </button>
                <button
                  onClick={() => setShowAddWord(false)}
                  className="flex-1 py-2 border border-gray-200 text-gray-500 rounded-lg text-sm"
                >
                  取消
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========== 阅读刷题 ========== */}
      {activeTab === 'reading' && (
        <div className="p-4 space-y-4">
          {/* 子模块选择 */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {READING_SUB_MODULES.map((mod) => (
              <button
                key={mod}
                onClick={() => {
                  setReadingSubModule(mod);
                  setQuestionIndex(0);
                  setReadingStats({ correct: 0, total: 0 });
                }}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  readingSubModule === mod
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {mod === 'reading'
                  ? '阅读理解'
                  : mod === 'translation'
                  ? '翻译'
                  : mod === 'cloze'
                  ? '完形填空'
                  : '新题型'}
              </button>
            ))}
          </div>

          {/* 统计 */}
          {readingStats.total > 0 && (
            <div className="flex items-center gap-4 bg-white rounded-xl shadow-sm border p-3">
              <div className="text-sm text-gray-500">
                正确率
              </div>
              <div className="text-lg font-semibold text-green-600">
                {readingStats.total > 0
                  ? Math.round((readingStats.correct / readingStats.total) * 100)
                  : 0}%
              </div>
              <div className="text-sm text-gray-400">
                {readingStats.correct}/{readingStats.total}
              </div>
              <div className="flex-1" />
              <button
                onClick={resetReading}
                className="text-xs text-green-500"
              >
                重新开始
              </button>
            </div>
          )}

          {/* 题目卡片 */}
          {filteredQuestions.length > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">
                  第 {questionIndex + 1} 题 / 共 {filteredQuestions.length} 题
                </span>
              </div>
              <QuestionCard
                key={currentQuestion?.id + questionIndex}
                question={currentQuestion}
                onAnswer={handleQuestionAnswer}
              />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={nextQuestion}
                  disabled={questionIndex >= filteredQuestions.length - 1}
                  className="flex-1 py-2.5 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  下一题
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
              <div className="text-gray-400 text-sm">该模块暂无题目</div>
            </div>
          )}

          {questionIndex >= filteredQuestions.length - 1 && readingStats.total > 0 && (
            <div className="bg-green-50 rounded-xl p-4 text-center border border-green-200">
              <div className="text-green-700 font-semibold mb-1">本组题目已完成！</div>
              <div className="text-green-600 text-sm">
                正确率 {Math.round((readingStats.correct / readingStats.total) * 100)}%
                （{readingStats.correct}/{readingStats.total}）
              </div>
              <button
                onClick={resetReading}
                className="mt-3 px-6 py-1.5 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
              >
                再来一组
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========== 作文模板 ========== */}
      {activeTab === 'writing' && (
        <div className="p-4 space-y-4">
          {englishTemplates.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
              <div className="text-gray-400 text-sm mb-3">暂无模板</div>
              <button
                onClick={initSampleTemplates}
                className="px-4 py-2 text-sm text-green-500 border border-green-300 rounded-lg hover:bg-green-50"
              >
                导入示例模板
              </button>
            </div>
          )}

          {englishTemplates.map((tpl) => (
            <div
              key={tpl.id}
              className="bg-white rounded-xl shadow-sm border p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-gray-800 text-sm">{tpl.title}</h4>
                    <span className="px-1.5 py-0.5 bg-green-100 text-green-600 text-xs rounded">
                      {tpl.type === 'argumentation'
                        ? '议论文'
                        : tpl.type === 'letter'
                        ? '书信'
                        : tpl.type === 'notice'
                        ? '通知'
                        : tpl.type === 'report'
                        ? '报告'
                        : tpl.type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-2 whitespace-pre-line">
                    {tpl.content}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => openTemplateView(tpl)}
                  className="flex-1 py-1.5 text-xs border border-green-300 text-green-600 rounded-lg hover:bg-green-50"
                >
                  查看/编辑
                </button>
                <button
                  onClick={() => deleteTemplate(tpl.id)}
                  className="px-3 py-1.5 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50"
                >
                  删除
                </button>
              </div>
            </div>
          ))}

          {/* 添加模板 */}
          {!showAddTemplate ? (
            <button
              onClick={() => setShowAddTemplate(true)}
              className="w-full py-3 border-2 border-dashed border-green-300 text-green-500 rounded-xl text-sm font-medium hover:bg-green-50 transition-colors"
            >
              + 添加新模板
            </button>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">添加新模板</h3>
              <input
                value={newTemplateTitle}
                onChange={(e) => setNewTemplateTitle(e.target.value)}
                placeholder="模板标题"
                className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-500"
              />
              <select
                value={newTemplateType}
                onChange={(e) => setNewTemplateType(e.target.value)}
                className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-500"
              >
                <option value="argumentation">议论文</option>
                <option value="letter">书信</option>
                <option value="notice">通知</option>
                <option value="report">报告</option>
              </select>
              <textarea
                value={newTemplateContent}
                onChange={(e) => setNewTemplateContent(e.target.value)}
                placeholder="模板内容..."
                className="w-full p-2.5 border border-gray-200 rounded-lg text-sm min-h-[120px] focus:outline-none focus:border-green-500"
                rows={5}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddTemplate}
                  className="flex-1 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600"
                >
                  确认添加
                </button>
                <button
                  onClick={() => setShowAddTemplate(false)}
                  className="flex-1 py-2 border border-gray-200 text-gray-500 rounded-lg text-sm"
                >
                  取消
                </button>
              </div>
            </div>
          )}

          {/* 查看/编辑模板模态框 */}
          <Modal
            visible={viewTemplate !== null}
            onClose={() => setViewTemplate(null)}
            title={viewTemplate?.title || '模板详情'}
          >
            <div className="space-y-3">
              <textarea
                value={editTemplateContent}
                onChange={(e) => setEditTemplateContent(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-lg text-sm min-h-[200px] focus:outline-none focus:border-green-500 whitespace-pre-line"
                rows={8}
              />
              <button
                onClick={saveTemplateEdit}
                className="w-full py-2.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600"
              >
                保存修改
              </button>
            </div>
          </Modal>
        </div>
      )}

      {/* ========== 长难句 ========== */}
      {activeTab === 'sentences' && (
        <div className="p-4 space-y-4">
          {/* 添加长难句 */}
          <div className="bg-white rounded-xl shadow-sm border p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">记录长难句</h3>
            <input
              value={newSentenceTitle}
              onChange={(e) => setNewSentenceTitle(e.target.value)}
              placeholder="句子来源/标题"
              className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-500"
            />
            <textarea
              value={newSentenceContent}
              onChange={(e) => setNewSentenceContent(e.target.value)}
              placeholder="输入长难句原文及分析..."
              className="w-full p-2.5 border border-gray-200 rounded-lg text-sm min-h-[100px] focus:outline-none focus:border-green-500"
              rows={4}
            />
            <button
              onClick={handleAddSentence}
              className="w-full py-2.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600"
            >
              保存长难句
            </button>
          </div>

          {/* 已保存的长难句列表 */}
          {sentenceNotes.length > 0 ? (
            <div className="space-y-3">
              <div className="text-sm text-gray-500">
                共 {sentenceNotes.length} 条记录
              </div>
              {sentenceNotes.map((note) => (
                <div
                  key={note.id}
                  className="bg-white rounded-xl shadow-sm border p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800 text-sm mb-1">
                        {note.title}
                      </h4>
                      <p className="text-sm text-gray-500 line-clamp-3 whitespace-pre-line">
                        {note.content}
                      </p>
                      <div className="text-xs text-gray-300 mt-2">
                        {note.updatedAt}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => openSentence(note)}
                      className="flex-1 py-1.5 text-xs border border-green-300 text-green-600 rounded-lg hover:bg-green-50"
                    >
                      查看/编辑
                    </button>
                    <button
                      onClick={() => deleteSentence(note.id)}
                      className="px-3 py-1.5 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
              <div className="text-gray-400 text-sm">暂无长难句记录</div>
              <div className="text-gray-300 text-xs mt-1">在上方添加你的第一个长难句</div>
            </div>
          )}

          {/* 查看/编辑长难句模态框 */}
          <Modal
            visible={viewSentence !== null}
            onClose={() => setViewSentence(null)}
            title={viewSentence?.title || '长难句详情'}
          >
            <div className="space-y-3">
              <textarea
                value={editSentenceContent}
                onChange={(e) => setEditSentenceContent(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-lg text-sm min-h-[200px] focus:outline-none focus:border-green-500 whitespace-pre-line"
                rows={8}
              />
              <button
                onClick={saveSentenceEdit}
                className="w-full py-2.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600"
              >
                保存修改
              </button>
            </div>
          </Modal>
        </div>
      )}
    </div>
  );
}
