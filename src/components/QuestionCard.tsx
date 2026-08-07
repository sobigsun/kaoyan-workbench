import React, { useState } from 'react';
import { Question } from '../types';

interface QuestionCardProps {
  question: Question;
  onAnswer: (questionId: string, answer: string, isCorrect: boolean) => void;
}

export default function QuestionCard({ question, onAnswer }: QuestionCardProps) {
  const [selected, setSelected] = useState<string>('');
  const [submitted, setSubmitted] = useState(false);
  const [inputAnswer, setInputAnswer] = useState('');

  const isCorrect = question.type === 'choice'
    ? selected === question.answer
    : inputAnswer.trim().toLowerCase().includes(question.answer.toLowerCase());

  const handleSubmit = () => {
    if (question.type === 'choice' && !selected) return;
    setSubmitted(true);
    onAnswer(question.id, question.type === 'choice' ? selected : inputAnswer, isCorrect);
  };

  const handleReset = () => {
    setSelected('');
    setInputAnswer('');
    setSubmitted(false);
  };

  const getOptionLetter = (option: string) => option.charAt(0);

  return (
    <div className="bg-white rounded-xl shadow-sm border p-4">
      {question.subModule && (
        <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full mb-2">
          {question.subModule}
        </span>
      )}
      <div className="text-gray-800 text-base mb-4 leading-relaxed">{question.question}</div>

      {question.type === 'choice' && question.options && (
        <div className="space-y-2">
          {question.options.map((opt) => {
            const letter = getOptionLetter(opt);
            const isSelected = selected === letter;
            let bgClass = 'bg-gray-50';
            if (submitted) {
              if (letter === question.answer) bgClass = 'bg-green-50 border-green-500';
              else if (isSelected) bgClass = 'bg-red-50 border-red-400';
            } else if (isSelected) {
              bgClass = 'bg-primary-50 border-primary-500';
            }

            return (
              <button
                key={letter}
                disabled={submitted}
                onClick={() => setSelected(letter)}
                className={`w-full text-left p-3 rounded-lg border ${
                  isSelected && !submitted ? 'border-primary-500' : 'border-gray-200'
                } ${bgClass} transition-colors text-sm`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      )}

      {question.type === 'fill' && (
        <textarea
          disabled={submitted}
          value={inputAnswer}
          onChange={(e) => setInputAnswer(e.target.value)}
          placeholder="请输入你的答案..."
          className="w-full p-3 border border-gray-200 rounded-lg text-sm min-h-[100px] focus:outline-none focus:border-primary-500"
        />
      )}

      {submitted && (
        <div className={`mt-3 p-3 rounded-lg text-sm ${isCorrect ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          <div className="font-medium mb-1">{isCorrect ? '回答正确!' : '回答错误'}</div>
          <div>正确答案: {question.answer}</div>
          {question.explanation && <div className="mt-1 text-gray-500">{question.explanation}</div>}
        </div>
      )}

      {!submitted && (
        <button
          onClick={handleSubmit}
          className="mt-4 w-full py-2.5 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors"
        >
          提交答案
        </button>
      )}

      {submitted && (
        <button
          onClick={handleReset}
          className="mt-2 w-full py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
        >
          下一题
        </button>
      )}
    </div>
  );
}
