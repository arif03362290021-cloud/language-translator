import React from 'react';
import { BookOpen, Sparkles, Volume2, Quote } from 'lucide-react';
import { TranslationResult } from '../types';

interface DictionaryPanelProps {
  translationResult: TranslationResult | null;
  onSpeakText?: (text: string) => void;
}

export const DictionaryPanel: React.FC<DictionaryPanelProps> = ({
  translationResult,
  onSpeakText,
}) => {
  if (!translationResult) return null;

  const { alternativeTranslations, dictionary, phonetic } = translationResult;

  const hasContent =
    phonetic ||
    (alternativeTranslations && alternativeTranslations.length > 0) ||
    (dictionary && dictionary.length > 0);

  if (!hasContent) return null;

  return (
    <div className="mt-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-200/60 dark:border-slate-800/60 pb-3">
        <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Dictionary & Insights
        </h3>
        {phonetic && (
          <span className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50">
            /{phonetic}/
            {onSpeakText && (
              <button
                onClick={() => onSpeakText(phonetic)}
                className="hover:text-indigo-900 dark:hover:text-white"
                title="Listen Phonetic"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
            )}
          </span>
        )}
      </div>

      {/* Alternative Translations */}
      {alternativeTranslations && alternativeTranslations.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Alternative Phrasings
          </div>
          <div className="flex flex-wrap gap-2">
            {alternativeTranslations.map((alt, idx) => (
              <span
                key={idx}
                className="px-3 py-1.5 rounded-lg text-sm bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60"
              >
                {alt}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Dictionary Breakdown */}
      {dictionary && dictionary.length > 0 && (
        <div className="space-y-3 pt-2">
          {dictionary.map((entry, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-2"
            >
              {entry.partOfSpeech && (
                <span className="inline-block text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase italic">
                  {entry.partOfSpeech}
                </span>
              )}

              {entry.definition && (
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  {entry.definition}
                </p>
              )}

              {entry.synonyms && entry.synonyms.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">Synonyms:</span>
                  <span>{entry.synonyms.join(', ')}</span>
                </div>
              )}

              {entry.examples && entry.examples.length > 0 && (
                <div className="space-y-1">
                  {entry.examples.map((ex, eIdx) => (
                    <div key={eIdx} className="flex items-start gap-2 text-xs italic text-slate-600 dark:text-slate-400">
                      <Quote className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                      <span>"{ex}"</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
