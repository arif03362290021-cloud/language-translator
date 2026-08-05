export interface Language {
  code: string;
  name: string;
  nativeName?: string;
  flag?: string;
  voiceCode?: string;
}

export interface TranslationResult {
  translatedText: string;
  detectedSourceLanguage?: string;
  alternativeTranslations?: string[];
  dictionary?: {
    partOfSpeech?: string;
    definition?: string;
    synonyms?: string[];
    examples?: string[];
  }[];
  phonetic?: string;
  provider?: 'google-translate' | 'gemini-ai' | 'fallback';
}

export interface HistoryItem {
  id: string;
  sourceText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  sourceLangName: string;
  targetLangName: string;
  timestamp: number;
  isFavorite: boolean;
  provider?: string;
}

export interface ApiSettings {
  customGoogleApiKey: string;
  useCustomKey: boolean;
  autoTranslate: boolean;
  speechRate: number;
  speechPitch: number;
}
