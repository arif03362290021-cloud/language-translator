import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Helper to sanitize Gemini response JSON
function parseJsonFromText(text: string) {
  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('Failed to parse JSON from Gemini response:', err, text);
    return null;
  }
}

// Fallback Google Translate GTX Free Web Endpoint
async function translateWithGtx(text: string, sourceLang: string, targetLang: string) {
  const src = sourceLang && sourceLang !== 'auto' ? sourceLang : 'auto';
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(src)}&tl=${encodeURIComponent(targetLang)}&dt=t&dt=bd&dt=qc&dt=rm&q=${encodeURIComponent(text)}`;
  
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`GTX translate request failed with status ${res.status}`);
  }
  const data = await res.json();
  
  if (!data || !Array.isArray(data[0])) {
    throw new Error('Invalid GTX response format');
  }

  let translatedText = '';
  for (const part of data[0]) {
    if (part && part[0]) {
      translatedText += part[0];
    }
  }

  const detectedSourceLanguage = data[2] || (sourceLang !== 'auto' ? sourceLang : 'en');

  // Extract optional dictionary if available
  const dictionary: Array<any> = [];
  if (Array.isArray(data[1])) {
    for (const dictGroup of data[1]) {
      const pos = dictGroup[0] || 'word'; // part of speech
      const words = dictGroup[1] || []; // list of words
      if (words.length > 0) {
        dictionary.push({
          partOfSpeech: pos,
          definition: words.slice(0, 3).join(', '),
          synonyms: words.slice(1, 5),
          examples: [],
        });
      }
    }
  }

  return {
    translatedText,
    detectedSourceLanguage,
    dictionary,
    provider: 'google-translate',
  };
}

// Fallback MyMemory Free Endpoint
async function translateWithMyMemory(text: string, sourceLang: string, targetLang: string) {
  const src = sourceLang && sourceLang !== 'auto' ? sourceLang : 'AUTODETECT';
  const langpair = `${src}|${targetLang}`;
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(langpair)}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`MyMemory request failed with status ${res.status}`);
  }
  const data = await res.json();

  if (data?.responseData?.translatedText) {
    return {
      translatedText: data.responseData.translatedText,
      detectedSourceLanguage: data.responseData.detectedLanguage || (sourceLang !== 'auto' ? sourceLang : 'en'),
      provider: 'google-translate',
    };
  }
  throw new Error('MyMemory translation empty result');
}

// Translate endpoint
app.post('/api/translate', async (req, res) => {
  try {
    const { text, sourceLang = 'auto', targetLang = 'en', apiKey: clientApiKey } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Text to translate is required' });
    }

    // 1. Try Custom / Server Google Translate v2 REST API if key is explicitly provided
    const effectiveGoogleKey = clientApiKey || process.env.GOOGLE_TRANSLATE_API_KEY;
    if (effectiveGoogleKey && effectiveGoogleKey.trim() !== '' && effectiveGoogleKey !== 'MY_GOOGLE_TRANSLATE_API_KEY') {
      try {
        const url = new URL('https://translation.googleapis.com/language/translate/v2');
        url.searchParams.append('key', effectiveGoogleKey);

        const bodyData: Record<string, any> = {
          q: text,
          target: targetLang,
          format: 'text',
        };
        if (sourceLang && sourceLang !== 'auto') {
          bodyData.source = sourceLang;
        }

        const googleRes = await fetch(url.toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyData),
        });

        const googleData = await googleRes.json();

        if (googleRes.ok && googleData?.data?.translations?.[0]) {
          const trans = googleData.data.translations[0];
          return res.json({
            translatedText: trans.translatedText,
            detectedSourceLanguage: trans.detectedSourceLanguage || (sourceLang !== 'auto' ? sourceLang : undefined),
            provider: 'google-translate',
          });
        } else {
          console.warn('Google Translate API key message:', googleData?.error?.message || googleData);
        }
      } catch (err: any) {
        console.error('Error invoking Google Translate REST API:', err.message);
      }
    }

    // 2. Try Gemini AI Translation via @google/genai SDK (gemini-3.6-flash)
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey && geminiKey.trim() !== '' && geminiKey !== 'MY_GEMINI_API_KEY') {
      try {
        const ai = new GoogleGenAI({
          apiKey: geminiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });

        const prompt = `You are an expert real-time translation engine and linguist.
Translate the following text into target language code "${targetLang}".
Source language code specified is "${sourceLang}" (if "auto", detect the source language code e.g. "en", "es", "fr", "ja", "de", etc).

Provide output strictly in VALID JSON format with no additional text or markdown formatting:
{
  "translatedText": "the accurate natural translation in target language",
  "detectedSourceLanguage": "2-letter or 5-letter ISO language code detected (e.g. 'es')",
  "alternativeTranslations": ["alternative phrasing 1", "alternative phrasing 2"],
  "phonetic": "pronunciation guide or transliteration if applicable, or null",
  "dictionary": [
    {
      "partOfSpeech": "noun / verb / adjective / phrase",
      "definition": "meaning of word/phrase",
      "synonyms": ["synonym1", "synonym2"],
      "examples": ["example sentence in target language"]
    }
  ]
}

Input Text to translate:
"""
${text}
"""`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: prompt,
        });

        const responseText = response.text || '';
        const parsed = parseJsonFromText(responseText);

        if (parsed && parsed.translatedText) {
          return res.json({
            translatedText: parsed.translatedText,
            detectedSourceLanguage: parsed.detectedSourceLanguage || (sourceLang !== 'auto' ? sourceLang : 'en'),
            alternativeTranslations: parsed.alternativeTranslations || [],
            phonetic: parsed.phonetic || null,
            dictionary: parsed.dictionary || [],
            provider: 'gemini-ai',
          });
        }
      } catch (geminiErr: any) {
        console.warn('Gemini translation fallback note:', geminiErr.message || geminiErr);
      }
    }

    // 3. Fallback to GTX Free Web Translation Endpoint
    try {
      const gtxResult = await translateWithGtx(text, sourceLang, targetLang);
      if (gtxResult && gtxResult.translatedText) {
        return res.json(gtxResult);
      }
    } catch (gtxErr: any) {
      console.warn('GTX translation error:', gtxErr.message);
    }

    // 4. Fallback to MyMemory Endpoint
    try {
      const myMemoryResult = await translateWithMyMemory(text, sourceLang, targetLang);
      if (myMemoryResult && myMemoryResult.translatedText) {
        return res.json(myMemoryResult);
      }
    } catch (mmErr: any) {
      console.warn('MyMemory translation error:', mmErr.message);
    }

    return res.status(500).json({
      error: 'Translation service is currently unavailable. Please try again in a few moments.',
    });
  } catch (error: any) {
    console.error('Unhandled server translate error:', error);
    return res.status(500).json({ error: error.message || 'Server translation error' });
  }
});

// Detect endpoint
app.post('/api/detect', async (req, res) => {
  try {
    const { text, apiKey: clientApiKey } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Text required' });
    }

    // 1. Try Google Translate v2 REST API if key is present
    const effectiveGoogleKey = clientApiKey || process.env.GOOGLE_TRANSLATE_API_KEY;
    if (effectiveGoogleKey && effectiveGoogleKey.trim() !== '' && effectiveGoogleKey !== 'MY_GOOGLE_TRANSLATE_API_KEY') {
      try {
        const url = new URL('https://translation.googleapis.com/language/translate/v2/detect');
        url.searchParams.append('key', effectiveGoogleKey);

        const response = await fetch(url.toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ q: text }),
        });

        const data = await response.json();
        if (response.ok && data?.data?.detections?.[0]?.[0]) {
          const detection = data.data.detections[0][0];
          return res.json({
            language: detection.language,
            confidence: detection.confidence,
            provider: 'google-translate',
          });
        }
      } catch (err: any) {
        console.warn('Google Detect API error:', err.message);
      }
    }

    // 2. Try Gemini AI Detection (gemini-3.6-flash)
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey && geminiKey.trim() !== '' && geminiKey !== 'MY_GEMINI_API_KEY') {
      try {
        const ai = new GoogleGenAI({
          apiKey: geminiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });
        const prompt = `Identify the ISO language code (e.g. 'en', 'es', 'fr', 'zh', 'ja', 'de') for this text. Reply ONLY with JSON: {"language": "code", "confidence": 0.99}. Text: "${text}"`;
        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: prompt,
        });
        const parsed = parseJsonFromText(response.text || '');
        if (parsed?.language) {
          return res.json({ language: parsed.language, confidence: parsed.confidence || 0.95, provider: 'gemini-ai' });
        }
      } catch (gErr: any) {
        console.warn('Gemini detect error:', gErr.message);
      }
    }

    // 3. Fallback GTX detection
    try {
      const gtxRes = await translateWithGtx(text, 'auto', 'en');
      if (gtxRes?.detectedSourceLanguage) {
        return res.json({ language: gtxRes.detectedSourceLanguage, confidence: 0.9, provider: 'google-translate' });
      }
    } catch (e) {
      // ignore
    }

    return res.json({ language: 'en', confidence: 0.5, provider: 'fallback' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Detection failed' });
  }
});

async function startServer() {
  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
