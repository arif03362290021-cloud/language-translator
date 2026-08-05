import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRightLeft,
  Volume2,
  Copy,
  Check,
  Star,
  Mic,
  MicOff,
  X,
  Clipboard,
  Sparkles,
  ChevronDown,
  Loader2,
  Share2,
} from 'lucide-react';
import { Language, TranslationResult } from '../types';
import { getLanguageByCode, POPULAR_LANGUAGES_CODES } from '../data/languages';
import { speakText, startSpeechRecognition } from '../utils/speech';

interface TranslationPanelProps {
  sourceLang: Language;
  targetLang: Language;
  sourceText: string;
  translatedText: string;
  isLoading: boolean;
  translationResult: TranslationResult | null;
  autoTranslate: boolean;
  speechRate: number;
  speechPitch: number;
  isFavorite: boolean;
  onSourceLangChange: (lang: Language) => void;
  onTargetLangChange: (lang: Language) => void;
  onSourceTextChange: (text: string) => void;
  onSwapLanguages: () => void;
  onTranslate: () => void;
  onToggleFavorite: () => void;
  onOpenSourceModal: () => void;
  onOpenTargetModal: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', text: string) => void;
}

export const TranslationPanel: React.FC<TranslationPanelProps> = ({
  sourceLang,
  targetLang,
  sourceText,
  translatedText,
  isLoading,
  translationResult,
  autoTranslate,
  speechRate,
  speechPitch,
  isFavorite,
  onSourceLangChange,
  onTargetLangChange,
  onSourceTextChange,
  onSwapLanguages,
  onTranslate,
  onToggleFavorite,
  onOpenSourceModal,
  onOpenTargetModal,
  onShowToast,
}) => {
  const [copied, setCopied] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeakingSource, setIsSpeakingSource] = useState(false);
  const [isSpeakingTarget, setIsSpeakingTarget] = useState(false);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);

  const characterLimit = 5000;

  // Handle Speech Recognition (Mic Input)
  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const rec = startSpeechRecognition(
      sourceLang.code,
      (text) => {
        onSourceTextChange(text);
      },
      (err) => {
        onShowToast('error', err);
        setIsListening(false);
      },
      () => {
        setIsListening(false);
      }
    );

    if (rec) {
      recognitionRef.current = rec;
      setIsListening(true);
      onShowToast('info', 'Listening... Speak into your microphone.');
    }
  };

  // Handle Copy to Clipboard
  const handleCopy = async () => {
    if (!translatedText) return;
    try {
      await navigator.clipboard.writeText(translatedText);
      setCopied(true);
      onShowToast('success', 'Translation copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      onShowToast('error', 'Failed to copy text.');
    }
  };

  // Handle Paste from Clipboard
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        onSourceTextChange(text.slice(0, characterLimit));
        onShowToast('info', 'Pasted text from clipboard.');
      }
    } catch (err) {
      onShowToast('error', 'Clipboard permission required.');
    }
  };

  // Speak source text
  const handleSpeakSource = () => {
    if (!sourceText.trim()) return;
    setIsSpeakingSource(true);
    speakText(
      sourceText,
      sourceLang.voiceCode || sourceLang.code,
      speechRate,
      speechPitch,
      () => setIsSpeakingSource(true),
      () => setIsSpeakingSource(false),
      (err) => {
        setIsSpeakingSource(false);
        onShowToast('error', err);
      }
    );
  };

  // Speak target text
  const handleSpeakTarget = () => {
    if (!translatedText.trim()) return;
    setIsSpeakingTarget(true);
    speakText(
      translatedText,
      targetLang.voiceCode || targetLang.code,
      speechRate,
      speechPitch,
      () => setIsSpeakingTarget(true),
      () => setIsSpeakingTarget(false),
      (err) => {
        setIsSpeakingTarget(false);
        onShowToast('error', err);
      }
    );
  };

  // Share translation
  const handleShare = () => {
    if (navigator.share && translatedText) {
      navigator.share({
        title: 'Translation',
        text: `${sourceText} -> ${translatedText}`,
      }).catch(() => {});
    } else {
      handleCopy();
    }
  };

  // Quick select language chips
  const quickSourceLangs = POPULAR_LANGUAGES_CODES.slice(0, 4);
  const quickTargetLangs = POPULAR_LANGUAGES_CODES.slice(0, 4);

  return (
    <div className="w-full space-y-4">
      {/* Dual Panel Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* SOURCE PANEL */}
        <div className="flex flex-col bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-md overflow-hidden transition-all focus-within:ring-2 focus-within:ring-blue-500/30">
          {/* Source Header Toolbar */}
          <div className="p-3 bg-slate-50/80 dark:bg-slate-900/50 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Language Selector Modal Trigger */}
              <button
                id="btn-select-source-lang"
                onClick={onOpenSourceModal}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-750 transition-all shadow-sm"
              >
                <span>{sourceLang.flag || '🌐'}</span>
                <span>{sourceLang.name}</span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {/* Quick Preset Buttons */}
              <div className="hidden lg:flex items-center gap-1 border-l border-slate-200 dark:border-slate-800 pl-2">
                {quickSourceLangs.map((code) => {
                  const lang = getLanguageByCode(code);
                  const isActive = sourceLang.code === code;
                  return (
                    <button
                      key={code}
                      onClick={() => onSourceLangChange(lang)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                      }`}
                    >
                      {lang.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Action Icons */}
            <div className="flex items-center gap-1">
              {sourceText && (
                <button
                  onClick={() => onSourceTextChange('')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                  title="Clear text"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={handlePaste}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                title="Paste from clipboard"
              >
                <Clipboard className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Source Textarea */}
          <div className="relative flex-1 p-4 min-h-[180px] sm:min-h-[220px]">
            <textarea
              id="source-text-input"
              value={sourceText}
              onChange={(e) => onSourceTextChange(e.target.value.slice(0, characterLimit))}
              placeholder="Enter text or speak to translate..."
              className="w-full h-full min-h-[160px] bg-transparent resize-none border-none outline-none text-base sm:text-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 leading-relaxed font-sans"
            />
          </div>

          {/* Source Bottom Footer */}
          <div className="p-3 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-200/40 dark:border-slate-800/40 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1">
              {/* Mic Dictation */}
              <button
                id="btn-mic-input"
                onClick={toggleListening}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'bg-slate-200/60 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700'
                }`}
                title={isListening ? 'Stop Listening' : 'Voice Input (Speech to Text)'}
              >
                {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{isListening ? 'Listening...' : 'Listen'}</span>
              </button>

              {/* Text to Speech */}
              <button
                onClick={handleSpeakSource}
                disabled={!sourceText.trim()}
                className={`p-1.5 rounded-lg transition-colors ${
                  isSpeakingSource
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30'
                }`}
                title="Pronounce Source Text"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>

            {/* Character Counter */}
            <span
              className={`font-mono text-[11px] ${
                sourceText.length >= characterLimit - 100 ? 'text-rose-500 font-bold' : ''
              }`}
            >
              {sourceText.length} / {characterLimit}
            </span>
          </div>
        </div>

        {/* TARGET PANEL */}
        <div className="relative flex flex-col bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-md overflow-hidden transition-all">
          {/* Swap Floating Button (Absolute center on desktop/mobile connection) */}
          <div className="absolute -left-5 top-1/2 -translate-y-1/2 z-20 hidden md:block">
            <button
              id="btn-swap-languages-desktop"
              onClick={onSwapLanguages}
              className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-110 active:scale-95 transition-all"
              title="Swap languages & text"
            >
              <ArrowRightLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Target Header Toolbar */}
          <div className="p-3 bg-slate-50/80 dark:bg-slate-900/50 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Language Selector Trigger */}
              <button
                id="btn-select-target-lang"
                onClick={onOpenTargetModal}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-750 transition-all shadow-sm"
              >
                <span>{targetLang.flag || '🌐'}</span>
                <span>{targetLang.name}</span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {/* Quick Target Presets */}
              <div className="hidden lg:flex items-center gap-1 border-l border-slate-200 dark:border-slate-800 pl-2">
                {quickTargetLangs.map((code) => {
                  const lang = getLanguageByCode(code);
                  const isActive = targetLang.code === code;
                  return (
                    <button
                      key={code}
                      onClick={() => onTargetLangChange(lang)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                      }`}
                    >
                      {lang.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mobile Swap Button */}
            <button
              id="btn-swap-languages-mobile"
              onClick={onSwapLanguages}
              className="md:hidden p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
              title="Swap languages"
            >
              <ArrowRightLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Target Text Content Display */}
          <div className="relative flex-1 p-4 min-h-[180px] sm:min-h-[220px] flex flex-col justify-between">
            {isLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <span className="text-sm font-medium animate-pulse">Translating text...</span>
              </div>
            ) : translatedText ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-base sm:text-lg text-slate-900 dark:text-slate-100 leading-relaxed font-sans select-text whitespace-pre-wrap"
              >
                {translatedText}
              </motion.div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-base italic">
                Translation will appear here...
              </div>
            )}

            {/* Detected Source Tag Badge */}
            {translationResult?.detectedSourceLanguage && sourceLang.code === 'auto' && (
              <div className="mt-4 inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                Detected: {getLanguageByCode(translationResult.detectedSourceLanguage).name}
              </div>
            )}
          </div>

          {/* Target Bottom Footer */}
          <div className="p-3 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-200/40 dark:border-slate-800/40 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1">
              {/* Speaker TTS */}
              <button
                onClick={handleSpeakTarget}
                disabled={!translatedText}
                className={`p-1.5 rounded-lg transition-colors ${
                  isSpeakingTarget
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30'
                }`}
                title="Pronounce Translation"
              >
                <Volume2 className="w-4 h-4" />
              </button>

              {/* Copy Output */}
              <button
                id="btn-copy-translation"
                onClick={handleCopy}
                disabled={!translatedText}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
                title="Copy Translation"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>

              {/* Star / Favorite */}
              <button
                id="btn-toggle-favorite"
                onClick={onToggleFavorite}
                disabled={!translatedText}
                className={`p-1.5 rounded-lg transition-colors ${
                  isFavorite
                    ? 'text-amber-500'
                    : 'text-slate-400 hover:text-amber-500 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30'
                }`}
                title={isFavorite ? 'Remove from Starred' : 'Save to Starred Favorites'}
              >
                <Star className={`w-4 h-4 ${isFavorite ? 'fill-amber-500' : ''}`} />
              </button>

              {/* Share Button */}
              <button
                onClick={handleShare}
                disabled={!translatedText}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
                title="Share Translation"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>

            {/* Provider indicator */}
            {translationResult?.provider && (
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                {translationResult.provider === 'google-translate' ? 'Google Translate' : 'AI Neural'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Manual Translate Bar if Auto-Translate is off */}
      {!autoTranslate && (
        <div className="flex justify-end">
          <button
            id="btn-trigger-translate"
            onClick={onTranslate}
            disabled={!sourceText.trim() || isLoading}
            className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md shadow-blue-500/20 flex items-center gap-2"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Translate Now
          </button>
        </div>
      )}
    </div>
  );
};
