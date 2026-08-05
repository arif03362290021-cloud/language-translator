export function speakText(
  text: string,
  langCode: string,
  rate: number = 1.0,
  pitch: number = 1.0,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (err: string) => void
): () => void {
  if (!('speechSynthesis' in window)) {
    onError?.('Text-to-speech is not supported in this browser.');
    return () => {};
  }

  window.speechSynthesis.cancel(); // Stop any active speech

  if (!text.trim()) return () => {};

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = rate;
  utterance.pitch = pitch;

  // Try finding matching voice for langCode
  const voices = window.speechSynthesis.getVoices();
  const targetLang = langCode.toLowerCase();
  
  const voice = voices.find(
    (v) => v.lang.toLowerCase() === targetLang || v.lang.toLowerCase().startsWith(targetLang.split('-')[0])
  );

  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  } else {
    utterance.lang = langCode;
  }

  utterance.onstart = () => onStart?.();
  utterance.onend = () => onEnd?.();
  utterance.onerror = (e) => {
    console.error('TTS error:', e);
    onError?.('Speech playback error');
  };

  window.speechSynthesis.speak(utterance);

  return () => {
    window.speechSynthesis.cancel();
  };
}

export function stopSpeech(): void {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

// Browser Speech Recognition Helper for Dictation
export function startSpeechRecognition(
  langCode: string,
  onResult: (text: string) => void,
  onError: (error: string) => void,
  onEnd: () => void
): { stop: () => void } | null {
  const SpeechRecognition =
    (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition ||
    (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    onError('Speech recognition is not supported in this browser.');
    return null;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = langCode === 'auto' ? 'en-US' : langCode;

  recognition.onresult = (event: any) => {
    let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    onResult(transcript);
  };

  recognition.onerror = (event: any) => {
    onError(`Mic error: ${event.error || 'Speech failed'}`);
  };

  recognition.onend = () => {
    onEnd();
  };

  recognition.start();

  return {
    stop: () => recognition.stop(),
  };
}
