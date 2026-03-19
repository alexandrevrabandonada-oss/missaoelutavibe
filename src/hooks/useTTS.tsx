import { useState, useEffect, useCallback, useRef } from "react";

interface TTSVoice {
  id: string;
  name: string;
  lang: string;
}

interface TTSSettings {
  enabled: boolean;
  voiceId: string;
  rate: number;
  pitch: number;
}

const DEFAULT_SETTINGS: TTSSettings = {
  enabled: false,
  voiceId: "",
  rate: 1.0,
  pitch: 1.0,
};

const STORAGE_KEY = "tts_settings";

/**
 * Sanitize text for TTS reading:
 * - Remove repeated emojis (keep first occurrence)
 * - Shorten URLs to "link"
 * - Collapse multiple whitespace
 * - Remove markdown symbols
 */
export function sanitizeText(text: string): string {
  if (!text) return "";
  
  let result = text;
  
  // Replace URLs with "link"
  result = result.replace(/https?:\/\/[^\s]+/gi, "link");
  
  // Remove markdown bold/italic
  result = result.replace(/\*\*([^*]+)\*\*/g, "$1");
  result = result.replace(/\*([^*]+)\*/g, "$1");
  result = result.replace(/__([^_]+)__/g, "$1");
  result = result.replace(/_([^_]+)_/g, "$1");
  
  // Remove repeated emojis (keep first of each type)
  const emojiPattern = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})\1+/gu;
  result = result.replace(emojiPattern, "$1");
  
  // Collapse multiple spaces/newlines
  result = result.replace(/\s+/g, " ").trim();
  
  return result;
}

export function useTTS() {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [voices, setVoices] = useState<TTSVoice[]>([]);
  const [settings, setSettings] = useState<TTSSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });
  
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Check support and load voices
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      setSupported(true);
      
      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        // Prefer Portuguese voices, then any
        const ptVoices = availableVoices.filter(v => v.lang.startsWith("pt"));
        const allVoices = availableVoices.map(v => ({
          id: v.voiceURI,
          name: v.name,
          lang: v.lang,
        }));
        
        // Put PT voices first
        const sorted = [
          ...allVoices.filter(v => v.lang.startsWith("pt")),
          ...allVoices.filter(v => !v.lang.startsWith("pt")),
        ];
        
        setVoices(sorted);
        
        // Set default voice if not set
        if (!settings.voiceId && sorted.length > 0) {
          const ptDefault = sorted.find(v => v.lang.startsWith("pt"));
          const defaultVoice = ptDefault || sorted[0];
          updateSettings({ voiceId: defaultVoice.id });
        }
      };
      
      loadVoices();
      window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
      
      return () => {
        window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
      };
    }
  }, []);

  // Persist settings
  const updateSettings = useCallback((updates: Partial<TTSSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const speak = useCallback((text: string) => {
    if (!supported || !text) return;
    
    // Stop any current speech
    window.speechSynthesis.cancel();
    
    const sanitized = sanitizeText(text);
    const utterance = new SpeechSynthesisUtterance(sanitized);
    
    // Apply settings
    utterance.rate = Math.max(0.8, Math.min(1.2, settings.rate));
    utterance.pitch = Math.max(0.9, Math.min(1.1, settings.pitch));
    
    // Find and set voice
    const availableVoices = window.speechSynthesis.getVoices();
    const selectedVoice = availableVoices.find(v => v.voiceURI === settings.voiceId);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    utterance.onstart = () => {
      setSpeaking(true);
      setPaused(false);
    };
    
    utterance.onend = () => {
      setSpeaking(false);
      setPaused(false);
    };
    
    utterance.onerror = () => {
      setSpeaking(false);
      setPaused(false);
    };
    
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [supported, settings.voiceId, settings.rate, settings.pitch]);

  const pause = useCallback(() => {
    if (supported && speaking) {
      window.speechSynthesis.pause();
      setPaused(true);
    }
  }, [supported, speaking]);

  const resume = useCallback(() => {
    if (supported && paused) {
      window.speechSynthesis.resume();
      setPaused(false);
    }
  }, [supported, paused]);

  const stop = useCallback(() => {
    if (supported) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      setPaused(false);
    }
  }, [supported]);

  const toggle = useCallback(() => {
    if (speaking && !paused) {
      pause();
    } else if (paused) {
      resume();
    }
  }, [speaking, paused, pause, resume]);

  return {
    supported,
    speaking,
    paused,
    voices,
    settings,
    updateSettings,
    speak,
    pause,
    resume,
    stop,
    toggle,
    sanitizeText,
  };
}
