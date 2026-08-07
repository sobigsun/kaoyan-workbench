import React, { useState, useEffect } from 'react';
import { presetResources, ResourceLink } from '../data/defaults';

const STORAGE_KEY = 'kaoyan_custom_resources';

const CATEGORIES: { key: string; label: string; icon: string }[] = [
  { key: 'all', label: '全部', icon: '📚' },
  { key: 'comprehensive', label: '综合', icon: '🌐' },
  { key: 'english', label: '英语', icon: '🇬🇧' },
  { key: 'politics', label: '政治', icon: '🇨🇳' },
  { key: 'education', label: '教育学', icon: '📖' },
];

const CATEGORY_BADGE: Record<string, string> = {
  comprehensive: 'bg-blue-50 text-blue-600',
  english: 'bg-green-50 text-green-600',
  politics: 'bg-red-50 text-red-600',
  education: 'bg-yellow-50 text-yellow-600',
};

const CATEGORY_LABEL: Record<string, string> = {
  comprehensive: '综合',
  english: '英语',
  politics: '政治',
  education: '教育学',
};

export default function ResourceHub() {
  const [activeCat, setActiveCat] = useState('all');
  const [customResources, setCustomResources] = useState<ResourceLink[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newResource, setNewResource] = useState({
    title: '',
    url: '',
    description: '',
    category: 'comprehensive' as ResourceLink['category'],
  });

  // 加载自定义资源
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setCustomResources(JSON.parse(raw));
    } catch {
      /* 忽略解析错误 */
    }
  }, []);

  const saveCustom = (resources: ResourceLink[]) => {
    setCustomResources(resources);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(resources));
    } catch {
      /* 忽略存储错误 */
    }
  };

  const handleAdd = () => {
    const title = newResource.title.trim();
    let url = newResource.url.trim();
    if (!title || !url) return;
    // 自动补全 http 前缀
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }
    const resource: ResourceLink = {
      id: `custom-${Date.now()}`,
      category: newResource.category,
      title,
      url,
      description: newResource.description.trim() || '用户添加的资源',
    };
    saveCustom([resource, ...customResources]);
    setNewResource({ title: '', url: '', description: '', category: 'comprehensive' });
    setShowAddForm(false);
  };

  const handleDelete = (id: string) => {
    saveCustom(customResources.filter((r) => r.id !== id));
  };

  const allResources = [...customResources, ...presetResources];
  const filteredResources =
    activeCat === 'all' ? allResources : allResources.filter((r) => r.category === activeCat);

  return (
    <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
      {/* 顶部说明 */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl p-4 text-white">
        <h2 className="text-base font-semibold mb-1">📚 学习资源导航</h2>
        <p className="text-xs opacity-90 leading-relaxed">
          收录各科目优质免费学习网站，点击卡片即可访问。支持添加自定义资源。
        </p>
      </div>

      {/* 分类筛选 */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCat(cat.key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeCat === cat.key
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <span className="mr-1">{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* 添加按钮 */}
      <button
        onClick={() => setShowAddForm(!showAddForm)}
        className="w-full py-2.5 bg-white border border-dashed border-blue-300 rounded-xl text-sm text-blue-500 hover:bg-blue-50 transition-colors flex items-center justify-center gap-1.5"
      >
        <span className="text-lg leading-none">{showAddForm ? '×' : '+'}</span>
        <span>{showAddForm ? '取消添加' : '添加自定义资源'}</span>
      </button>

      {/* 添加表单 */}
      {showAddForm && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">资源名称 *</label>
            <input
              value={newResource.title}
              onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
              placeholder="如：考研英语真题网"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">网址 *</label>
            <input
              value={newResource.url}
              onChange={(e) => setNewResource({ ...newResource, url: e.target.value })}
              placeholder="如：https://example.com（可省略 http）"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">分类</label>
            <select
              value={newResource.category}
              onChange={(e) =>
                setNewResource({ ...newResource, category: e.target.value as ResourceLink['category'] })
              }
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-blue-500 focus:outline-none bg-white"
            >
              <option value="comprehensive">综合</option>
              <option value="english">英语</option>
              <option value="politics">政治</option>
              <option value="education">教育学</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">描述（可选）</label>
            <textarea
              value={newResource.description}
              onChange={(e) => setNewResource({ ...newResource, description: e.target.value })}
              placeholder="简要描述该资源的用途"
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-blue-500 focus:outline-none resize-none"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={!newResource.title.trim() || !newResource.url.trim()}
            className="w-full py-2.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            保存资源
          </button>
        </div>
      )}

      {/* 资源列表 */}
      <div className="space-y-2.5">
        {filteredResources.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center text-sm text-gray-400">
            该分类下暂无资源
          </div>
        ) : (
          filteredResources.map((resource) => {
            const isCustom = resource.id.startsWith('custom-');
            return (
              <div
                key={resource.id}
                className="bg-white rounded-xl border border-gray-100 p-3.5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-2">
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-left"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${CATEGORY_BADGE[resource.category]}`}
                      >
                        {CATEGORY_LABEL[resource.category]}
                      </span>
                      {isCustom && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">
                          自定义
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-gray-800 mb-1">{resource.title}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed mb-1.5">
                      {resource.description}
                    </p>
                    <p className="text-xs text-blue-500 truncate">{resource.url}</p>
                  </a>
                  {isCustom && (
                    <button
                      onClick={() => handleDelete(resource.id)}
                      className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="删除"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M3 6h18 M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6 M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 统计 */}
      <div className="text-center text-xs text-gray-400 pt-2 pb-4">
        共 {allResources.length} 个资源（预置 {presetResources.length} + 自定义 {customResources.length}）
      </div>
    </div>
  );
}
