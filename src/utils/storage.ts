import { ApiSettings, HistoryItem } from '../types';

const HISTORY_STORAGE_KEY = 'translation_app_history';
const SETTINGS_STORAGE_KEY = 'translation_app_settings';
const THEME_STORAGE_KEY = 'translation_app_theme';

export const DEFAULT_SETTINGS: ApiSettings = {
  customGoogleApiKey: '',
  useCustomKey: false,
  autoTranslate: true,
  speechRate: 1,
  speechPitch: 1,
};

export function getStoredHistory(): HistoryItem[] {
  try {
    const data = localStorage.getItem(HISTORY_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error('Error reading history from storage:', err);
    return [];
  }
}

export function saveHistory(history: HistoryItem[]): void {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, 100))); // Keep max 100 items
  } catch (err) {
    console.error('Error saving history to storage:', err);
  }
}

export function getStoredSettings(): ApiSettings {
  try {
    const data = localStorage.getItem(SETTINGS_STORAGE_KEY);
    return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
  } catch (err) {
    console.error('Error reading settings from storage:', err);
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: ApiSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Error saving settings to storage:', err);
  }
}

export function getStoredTheme(): 'dark' | 'light' {
  try {
    const data = localStorage.getItem(THEME_STORAGE_KEY);
    if (data === 'dark' || data === 'light') return data;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function saveTheme(theme: 'dark' | 'light'): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (err) {
    console.error('Error saving theme:', err);
  }
}
