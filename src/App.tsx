import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { TranslationPanel } from './components/TranslationPanel';
import { DictionaryPanel } from './components/DictionaryPanel';
import { LanguageSelectorModal } from './components/LanguageSelectorModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { SettingsModal } from './components/SettingsModal';
import { Toast, ToastMessage } from './components/Toast';
import { Language, TranslationResult, HistoryItem, ApiSettings } from './types';
import { AUTO_DETECT_LANGUAGE, getLanguageByCode } from './data/languages';
import {
  getStoredHistory,
  saveHistory,
  getStoredSettings,
  saveSettings,
  getStoredTheme,
  saveTheme,
} from './utils/storage';

export default function App() {
  // Theme State
  const [theme, setTheme] = useState<'dark' | 'light'>(() => getStoredTheme());

  // Language & Translation State
  const [sourceLang, setSourceLang] = useState<Language>(AUTO_DETECT_LANGUAGE);
  const [targetLang, setTargetLang] = useState<Language>(() => getLanguageByCode('es'));
  const [sourceText, setSourceText] = useState<string>('');
  const [translatedText, setTranslatedText] = useState<string>('');
  const [translationResult, setTranslationResult] = useState<TranslationResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Storage States
  const [history, setHistory] = useState<HistoryItem[]>(() => getStoredHistory());
  const [settings, setSettings] = useState<ApiSettings>(() => getStoredSettings());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Modals
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Apply Theme class to document
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    saveTheme(theme);
  }, [theme]);

  // Toast Helper
  const showToast = useCallback((type: 'success' | 'error' | 'info', text: string) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Perform Translation API Call
  const performTranslation = useCallback(
    async (text: string, srcCode: string, tgtCode: string) => {
      if (!text || !text.trim()) {
        setTranslatedText('');
        setTranslationResult(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const response = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: text.trim(),
            sourceLang: srcCode,
            targetLang: tgtCode,
            apiKey: settings.useCustomKey ? settings.customGoogleApiKey : undefined,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Translation API request failed');
        }

        setTranslatedText(data.translatedText || '');
        setTranslationResult(data);

        // Update history
        const detectedSrc = data.detectedSourceLanguage || (srcCode !== 'auto' ? srcCode : 'en');
        const srcName = getLanguageByCode(srcCode === 'auto' ? detectedSrc : srcCode).name;
        const tgtName = getLanguageByCode(tgtCode).name;

        const newItem: HistoryItem = {
          id: Date.now().toString(),
          sourceText: text.trim(),
          translatedText: data.translatedText || '',
          sourceLang: srcCode,
          targetLang: tgtCode,
          sourceLangName: srcName,
          targetLangName: tgtName,
          timestamp: Date.now(),
          isFavorite: false,
          provider: data.provider,
        };

        setHistory((prev) => {
          // Prevent duplicates at top
          const filtered = prev.filter(
            (item) => !(item.sourceText === newItem.sourceText && item.targetLang === newItem.targetLang)
          );
          const updated = [newItem, ...filtered];
          saveHistory(updated);
          return updated;
        });
      } catch (err: any) {
        console.error('Translation error:', err);
        showToast('error', err.message || 'Failed to translate text.');
      } finally {
        setIsLoading(false);
      }
    },
    [settings, showToast]
  );

  // Debounce Auto Translate Effect
  useEffect(() => {
    if (!settings.autoTranslate) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!sourceText.trim()) {
      setTranslatedText('');
      setTranslationResult(null);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      performTranslation(sourceText, sourceLang.code, targetLang.code);
    }, 450);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [sourceText, sourceLang.code, targetLang.code, settings.autoTranslate, performTranslation]);

  // Swap Languages Logic
  const handleSwapLanguages = () => {
    if (sourceLang.code === 'auto') {
      if (translationResult?.detectedSourceLanguage) {
        const detected = getLanguageByCode(translationResult.detectedSourceLanguage);
        setSourceLang(targetLang);
        setTargetLang(detected);
      } else {
        setSourceLang(targetLang);
        setTargetLang(getLanguageByCode('en'));
      }
    } else {
      const prevSource = sourceLang;
      setSourceLang(targetLang);
      setTargetLang(prevSource);
    }

    if (translatedText) {
      setSourceText(translatedText);
      setTranslatedText(sourceText);
    }
  };

  // Toggle Favorite
  const handleToggleFavoriteItem = (id: string) => {
    setHistory((prev) => {
      const updated = prev.map((item) =>
        item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
      );
      saveHistory(updated);
      return updated;
    });
  };

  // Current translation favorite status
  const currentHistoryItem = history.find(
    (item) => item.sourceText === sourceText && item.targetLang === targetLang.code
  );

  const handleToggleCurrentFavorite = () => {
    if (currentHistoryItem) {
      handleToggleFavoriteItem(currentHistoryItem.id);
      showToast(
        currentHistoryItem.isFavorite ? 'info' : 'success',
        currentHistoryItem.isFavorite ? 'Removed from favorites' : 'Saved to favorites!'
      );
    }
  };

  // Delete single history item
  const handleDeleteHistoryItem = (id: string) => {
    setHistory((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      saveHistory(updated);
      return updated;
    });
    showToast('info', 'Deleted item from history.');
  };

  // Clear all history
  const handleClearAllHistory = () => {
    if (window.confirm('Are you sure you want to clear all translation history?')) {
      setHistory([]);
      saveHistory([]);
      showToast('info', 'Translation history cleared.');
    }
  };

  // Restore history item
  const handleSelectHistoryItem = (item: HistoryItem) => {
    setSourceLang(getLanguageByCode(item.sourceLang));
    setTargetLang(getLanguageByCode(item.targetLang));
    setSourceText(item.sourceText);
    setTranslatedText(item.translatedText);
  };

  // Save Settings
  const handleSaveSettings = (newSettings: ApiSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
    showToast('success', 'Settings saved successfully!');
  };

  const favoritesCount = history.filter((h) => h.isFavorite).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors selection:bg-blue-500 selection:text-white flex flex-col">
      {/* Top Navigation */}
      <Header
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        historyCount={history.length}
        favoritesCount={favoritesCount}
        provider={translationResult?.provider}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 flex flex-col items-center">
        {/* Workspace Card Container */}
        <div className="w-full max-w-5xl space-y-6">
          <TranslationPanel
            sourceLang={sourceLang}
            targetLang={targetLang}
            sourceText={sourceText}
            translatedText={translatedText}
            isLoading={isLoading}
            translationResult={translationResult}
            autoTranslate={settings.autoTranslate}
            speechRate={settings.speechRate}
            speechPitch={settings.speechPitch}
            isFavorite={!!currentHistoryItem?.isFavorite}
            onSourceLangChange={setSourceLang}
            onTargetLangChange={setTargetLang}
            onSourceTextChange={setSourceText}
            onSwapLanguages={handleSwapLanguages}
            onTranslate={() => performTranslation(sourceText, sourceLang.code, targetLang.code)}
            onToggleFavorite={handleToggleCurrentFavorite}
            onOpenSourceModal={() => setIsSourceModalOpen(true)}
            onOpenTargetModal={() => setIsTargetModalOpen(true)}
            onShowToast={showToast}
          />

          {/* Dictionary & Vocabulary breakdown */}
          <DictionaryPanel translationResult={translationResult} />
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 border-t border-slate-200/80 dark:border-slate-800/80 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Powered by Google Cloud Translation & AI Studio</span>
          <span className="flex items-center gap-2">
            <span>Fast, accurate translation across 100+ languages</span>
          </span>
        </div>
      </footer>

      {/* Language Selector Modals */}
      <LanguageSelectorModal
        isOpen={isSourceModalOpen}
        onClose={() => setIsSourceModalOpen(false)}
        selectedLanguage={sourceLang}
        onSelectLanguage={setSourceLang}
        isSource={true}
        title="Source Language"
      />

      <LanguageSelectorModal
        isOpen={isTargetModalOpen}
        onClose={() => setIsTargetModalOpen(false)}
        selectedLanguage={targetLang}
        onSelectLanguage={setTargetLang}
        isSource={false}
        title="Target Language"
      />

      {/* History Drawer */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onSelectHistoryItem={handleSelectHistoryItem}
        onToggleFavorite={handleToggleFavoriteItem}
        onDeleteHistoryItem={handleDeleteHistoryItem}
        onClearAllHistory={handleClearAllHistory}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        provider={translationResult?.provider}
      />

      {/* Toast Notifications */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
