import React from 'react';

interface TabBarProps {
  tabs: { key: string; label: string }[];
  activeKey: string;
  onChange: (key: string) => void;
  colorClass?: string;
}

export default function TabBar({ tabs, activeKey, onChange, colorClass = 'text-primary-500 border-primary-500' }: TabBarProps) {
  return (
    <div className="flex border-b overflow-x-auto scrollbar-hide">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`flex-shrink-0 px-3 py-2.5 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
            activeKey === tab.key
              ? `${colorClass} border-b-2`
              : 'text-gray-500 border-transparent hover:text-gray-700'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
