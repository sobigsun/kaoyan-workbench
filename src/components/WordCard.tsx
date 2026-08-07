import React, { useState } from 'react';
import { Word } from '../types';
import { addDays, todayStr } from '../utils/date';
import { getEbbinghausInterval } from '../utils/ebbinghaus';

interface WordCardProps {
  word: Word;
  onReview: (wordId: string, correct: boolean) => void;
}

export default function WordCard({ word, onReview }: WordCardProps) {
  const [flipped, setFlipped] = useState(false);

  const handleFlip = () => setFlipped(!flipped);

  const handleReview = (correct: boolean) => {
    onReview(word.id, correct);
    setFlipped(false);
  };

  return (
    <div
      className="relative w-full aspect-[3/4] cursor-pointer perspective-500"
      onClick={handleFlip}
      style={{ maxHeight: '400px' }}
    >
      <div
        className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${
          flipped ? 'rotate-y-180' : ''
        }`}
        style={{ transformStyle: 'preserve-3d', transition: 'transform 0.5s' }}
      >
        {/* 正面 */}
        <div
          className="absolute inset-0 rounded-2xl bg-white shadow-lg border border-gray-100 flex flex-col items-center justify-center p-6"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="text-3xl font-semibold text-gray-800 mb-4">{word.word}</div>
          {word.example && (
            <div className="text-sm text-gray-400 text-center mt-2">{word.example}</div>
          )}
          <div className="absolute bottom-4 text-xs text-gray-300">点击翻转查看释义</div>
        </div>

        {/* 背面 */}
        <div
          className="absolute inset-0 rounded-2xl bg-primary-500 text-white flex flex-col items-center justify-center p-6"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <div className="text-xl font-semibold mb-3 text-center">{word.meaning}</div>
          {word.example && (
            <div className="text-sm text-primary-100 text-center mt-2">{word.example}</div>
          )}
          <div className="absolute bottom-6 flex gap-4 mt-4" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => handleReview(false)}
              className="px-5 py-2 bg-white/20 rounded-full text-sm hover:bg-white/30 transition-colors"
            >
              不认识
            </button>
            <button
              onClick={() => handleReview(true)}
              className="px-5 py-2 bg-white/30 rounded-full text-sm hover:bg-white/40 transition-colors"
            >
              认识
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
