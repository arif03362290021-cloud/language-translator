import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, Trash2, Star, ArrowRight, Download, History, Sparkles } from 'lucide-react';
import { HistoryItem } from '../types';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  onSelectHistoryItem: (item: HistoryItem) => void;
  onToggleFavorite: (id: string) => void;
  onDeleteHistoryItem: (id: string) => void;
  onClearAllHistory: () => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  history,
  onSelectHistoryItem,
  onToggleFavorite,
  onDeleteHistoryItem,
  onClearAllHistory,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'favorites'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = useMemo(() => {
    let list = history;
    if (activeTab === 'favorites') {
      list = list.filter((item) => item.isFavorite);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (item) =>
          item.sourceText.toLowerCase().includes(q) ||
          item.translatedText.toLowerCase().includes(q) ||
          item.sourceLangName.toLowerCase().includes(q) ||
          item.targetLangName.toLowerCase().includes(q)
      );
    }
    return list;
  }, [history, activeTab, searchQuery]);

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(history, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `translation_history_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportCSV = () => {
    const headers = ['Timestamp', 'Source Lang', 'Target Lang', 'Source Text', 'Translated Text', 'Is Favorite'];
    const rows = history.map((item) => [
      new Date(item.timestamp).toISOString(),
      `"${item.sourceLangName}"`,
      `"${item.targetLangName}"`,
      `"${item.sourceText.replace(/"/g, '""')}"`,
      `"${item.translatedText.replace(/"/g, '""')}"`,
      item.isFavorite ? 'Yes' : 'No',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', encodeURI(csvContent));
    downloadAnchor.setAttribute('download', `translation_history_${Date.now()}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-sm flex justify-end">
        {/* Backdrop click */}
        <div className="absolute inset-0" onClick={onClose} />

        {/* Drawer Panel */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="relative z-10 w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 h-full flex flex-col shadow-2xl"
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Saved & Recent
              </h2>
            </div>
            <button
              id="btn-close-history"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search & Tabs */}
          <div className="p-4 space-y-3 bg-slate-50/70 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search history..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    activeTab === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  All ({history.length})
                </button>
                <button
                  onClick={() => setActiveTab('favorites')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                    activeTab === 'favorites'
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Star className="w-3.5 h-3.5 fill-current" />
                  Starred ({history.filter((h) => h.isFavorite).length})
                </button>
              </div>

              {history.length > 0 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleExportJSON}
                    className="p-1.5 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white transition-colors"
                    title="Export as JSON"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={onClearAllHistory}
                    className="p-1.5 text-xs text-rose-500 hover:text-rose-700 transition-colors"
                    title="Clear History"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredItems.length === 0 ? (
              <div className="py-16 text-center space-y-2 text-slate-400">
                <Sparkles className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
                <p className="text-sm font-medium">No translations found.</p>
                <p className="text-xs">
                  {activeTab === 'favorites'
                    ? 'Star translations to keep them here for quick access.'
                    : 'Translated phrases will automatically appear here.'}
                </p>
              </div>
            ) : (
              filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="group relative p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer"
                  onClick={() => {
                    onSelectHistoryItem(item);
                    onClose();
                  }}
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span>{item.sourceLangName}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span>{item.targetLangName}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(item.id);
                        }}
                        className={`p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 ${
                          item.isFavorite ? 'text-amber-500' : 'text-slate-400 hover:text-amber-500'
                        }`}
                        title="Star translation"
                      >
                        <Star className={`w-4 h-4 ${item.isFavorite ? 'fill-amber-500' : ''}`} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteHistoryItem(item.id);
                        }}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-slate-700"
                        title="Delete from history"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 line-clamp-2">
                    {item.sourceText}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-mono line-clamp-2">
                    {item.translatedText}
                  </p>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
