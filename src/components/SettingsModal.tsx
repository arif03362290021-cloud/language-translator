import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Key, Sliders, Check, ShieldCheck, HelpCircle } from 'lucide-react';
import { ApiSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ApiSettings;
  onSaveSettings: (settings: ApiSettings) => void;
  provider?: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  provider,
}) => {
  const [apiKey, setApiKey] = useState(settings.customGoogleApiKey);
  const [useCustomKey, setUseCustomKey] = useState(settings.useCustomKey);
  const [autoTranslate, setAutoTranslate] = useState(settings.autoTranslate);
  const [speechRate, setSpeechRate] = useState(settings.speechRate || 1.0);
  const [speechPitch, setSpeechPitch] = useState(settings.speechPitch || 1.0);

  const handleSave = () => {
    onSaveSettings({
      customGoogleApiKey: apiKey.trim(),
      useCustomKey,
      autoTranslate,
      speechRate,
      speechPitch,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Translation & API Settings
              </h2>
            </div>
            <button
              id="btn-close-settings"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-6 overflow-y-auto max-h-[75vh]">
            {/* Active Provider Info Banner */}
            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
                <span className="font-bold block mb-0.5">Active Backend Engine:</span>
                {provider === 'google-translate'
                  ? 'Official Google Cloud Translation v2 REST API is active.'
                  : 'Server-side Gemini AI Translation Engine is active and serving real-time translations.'}
              </div>
            </div>

            {/* Custom Google API Key */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Key className="w-4 h-4 text-slate-500" /> Google Cloud Translate API Key
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="chk-custom-key"
                    checked={useCustomKey}
                    onChange={(e) => setUseCustomKey(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="chk-custom-key" className="text-xs text-slate-600 dark:text-slate-300">
                    Use Custom Key
                  </label>
                </div>
              </div>

              {useCustomKey && (
                <div className="space-y-1.5">
                  <input
                    type="password"
                    placeholder="AIzaSy..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5" /> Direct REST requests to Google Translate API.
                  </p>
                </div>
              )}
            </div>

            {/* Preferences */}
            <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Sliders className="w-4 h-4" /> Preferences
              </h3>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-900 dark:text-white">
                    Real-time Auto Translation
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Automatically translate as you type (debounced)
                  </div>
                </div>
                <button
                  onClick={() => setAutoTranslate(!autoTranslate)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    autoTranslate ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      autoTranslate ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Text to Speech Options */}
              <div className="space-y-3 pt-2">
                <div className="text-sm font-medium text-slate-900 dark:text-white">
                  Speech Pronunciation Speed
                </div>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.1"
                    value={speechRate}
                    onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                  <span className="text-xs font-mono w-10 text-right text-slate-600 dark:text-slate-300">
                    {speechRate}x
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 bg-slate-50/50 dark:bg-slate-900/50">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              id="btn-save-settings"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-all"
            >
              <Check className="w-4 h-4" /> Save Configuration
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
