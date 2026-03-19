import { useState, useCallback, useEffect, useRef } from "react";
import { useTTS, sanitizeText } from "./useTTS";

export interface RadioItem {
  id: string;
  title: string;
  text: string;
  source: "plano" | "meta" | "atividade" | "tarefa" | "missao" | "top";
  href: string;
}

interface RadioQueueState {
  queue: RadioItem[];
  currentIndex: number;
  isPlaying: boolean;
  isPaused: boolean;
}

const STORAGE_KEY = "radio_queue";

// Source labels for announcements
const SOURCE_LABELS: Record<RadioItem["source"], string> = {
  plano: "Plano da Semana",
  meta: "Meta",
  atividade: "Atividade",
  tarefa: "Tarefa",
  missao: "Missão",
  top: "Top da Semana",
};

export function useRadioQueue() {
  const tts = useTTS();
  const [state, setState] = useState<RadioQueueState>({
    queue: [],
    currentIndex: 0,
    isPlaying: false,
    isPaused: false,
  });
  
  const autoNextRef = useRef(false);
  const currentTextRef = useRef<string>("");
  
  // Load queue from localStorage on mount (optional persistence)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.queue) && parsed.queue.length > 0) {
          setState(prev => ({
            ...prev,
            queue: parsed.queue,
            currentIndex: Math.min(parsed.currentIndex || 0, parsed.queue.length - 1),
          }));
        }
      }
    } catch {}
  }, []);
  
  // Save queue to localStorage when it changes
  useEffect(() => {
    if (state.queue.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          queue: state.queue,
          currentIndex: state.currentIndex,
        }));
      } catch {}
    }
  }, [state.queue, state.currentIndex]);

  // Watch TTS speaking state to auto-advance
  useEffect(() => {
    if (autoNextRef.current && !tts.speaking && !tts.paused && state.isPlaying) {
      // TTS finished speaking, advance to next
      const nextIndex = state.currentIndex + 1;
      if (nextIndex < state.queue.length) {
        setState(prev => ({ ...prev, currentIndex: nextIndex }));
        // Will trigger play in the next effect
      } else {
        // Queue finished
        setState(prev => ({ ...prev, isPlaying: false, isPaused: false }));
        autoNextRef.current = false;
      }
    }
  }, [tts.speaking, tts.paused, state.isPlaying, state.currentIndex, state.queue.length]);
  
  // Play current item when index changes and isPlaying is true
  useEffect(() => {
    if (state.isPlaying && state.queue.length > 0) {
      const item = state.queue[state.currentIndex];
      if (item) {
        const sourceLabel = SOURCE_LABELS[item.source] || item.source;
        const fullText = `${sourceLabel}: ${item.title}. ${item.text}`;
        currentTextRef.current = fullText;
        autoNextRef.current = true;
        tts.speak(fullText);
      }
    }
  }, [state.currentIndex, state.isPlaying, state.queue]);

  // Stop on unmount or navigation
  useEffect(() => {
    return () => {
      tts.stop();
      autoNextRef.current = false;
    };
  }, []);

  const setQueue = useCallback((items: RadioItem[]) => {
    setState({
      queue: items,
      currentIndex: 0,
      isPlaying: false,
      isPaused: false,
    });
  }, []);

  const play = useCallback(() => {
    if (state.queue.length === 0) return;
    setState(prev => ({ ...prev, isPlaying: true, isPaused: false }));
  }, [state.queue.length]);

  const pause = useCallback(() => {
    tts.pause();
    setState(prev => ({ ...prev, isPaused: true }));
  }, [tts]);

  const resume = useCallback(() => {
    tts.resume();
    setState(prev => ({ ...prev, isPaused: false }));
  }, [tts]);

  const stop = useCallback(() => {
    tts.stop();
    autoNextRef.current = false;
    setState(prev => ({ ...prev, isPlaying: false, isPaused: false }));
  }, [tts]);

  const next = useCallback(() => {
    if (state.currentIndex < state.queue.length - 1) {
      tts.stop();
      setState(prev => ({ ...prev, currentIndex: prev.currentIndex + 1 }));
    }
  }, [state.currentIndex, state.queue.length, tts]);

  const prev = useCallback(() => {
    if (state.currentIndex > 0) {
      tts.stop();
      setState(prev => ({ ...prev, currentIndex: prev.currentIndex - 1 }));
    }
  }, [state.currentIndex, tts]);

  const toggle = useCallback(() => {
    if (state.isPlaying && !state.isPaused) {
      pause();
    } else if (state.isPaused) {
      resume();
    } else {
      play();
    }
  }, [state.isPlaying, state.isPaused, pause, resume, play]);

  const clear = useCallback(() => {
    tts.stop();
    autoNextRef.current = false;
    setState({
      queue: [],
      currentIndex: 0,
      isPlaying: false,
      isPaused: false,
    });
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, [tts]);

  // Get current item
  const currentItem = state.queue[state.currentIndex] || null;
  
  // Calculate estimated duration (rough: 150 words/min)
  const estimatedMinutes = Math.ceil(
    state.queue.reduce((acc, item) => {
      const words = sanitizeText(`${item.title}. ${item.text}`).split(/\s+/).length;
      return acc + words;
    }, 0) / 150
  );

  return {
    // State
    queue: state.queue,
    currentIndex: state.currentIndex,
    currentItem,
    isPlaying: state.isPlaying,
    isPaused: state.isPaused,
    hasQueue: state.queue.length > 0,
    estimatedMinutes,
    
    // TTS state
    ttsSupported: tts.supported,
    ttsSpeaking: tts.speaking,
    
    // Actions
    setQueue,
    play,
    pause,
    resume,
    stop,
    next,
    prev,
    toggle,
    clear,
  };
}

// Helper: Build queue from Semana data
export function buildQueueFromSemana(data: {
  weeklyPlan?: { id: string; titulo: string; texto: string } | null;
  metas?: string[];
  atividades?: Array<{ id: string; titulo: string; descricao?: string | null; local_texto?: string | null }>;
  tasks?: Array<{ id: string; titulo: string; squad_nome?: string }>;
  missions?: Array<{ id: string; title: string; description: string }>;
}): RadioItem[] {
  const items: RadioItem[] = [];

  // 1. Weekly plan
  if (data.weeklyPlan) {
    items.push({
      id: `plano-${data.weeklyPlan.id}`,
      title: data.weeklyPlan.titulo,
      text: data.weeklyPlan.texto.substring(0, 500),
      source: "plano",
      href: `/voluntario/anuncios/${data.weeklyPlan.id}`,
    });
  }

  // 2. Metas (combine into one item)
  if (data.metas && data.metas.length > 0) {
    items.push({
      id: "metas",
      title: `${data.metas.length} metas da semana`,
      text: data.metas.join(". "),
      source: "meta",
      href: "/voluntario/semana",
    });
  }

  // 3. Upcoming activities (first 2)
  if (data.atividades) {
    data.atividades.slice(0, 2).forEach((a) => {
      items.push({
        id: `atividade-${a.id}`,
        title: a.titulo,
        text: a.descricao || a.local_texto || "Atividade agendada",
        source: "atividade",
        href: `/voluntario/agenda/${a.id}`,
      });
    });
  }

  // 4. Tasks (first 2)
  if (data.tasks) {
    data.tasks.slice(0, 2).forEach((t) => {
      items.push({
        id: `tarefa-${t.id}`,
        title: t.titulo,
        text: t.squad_nome ? `Squad: ${t.squad_nome}` : "Tarefa pendente",
        source: "tarefa",
        href: "/voluntario/squads",
      });
    });
  }

  // 5. One mission
  if (data.missions && data.missions.length > 0) {
    const m = data.missions[0];
    items.push({
      id: `missao-${m.id}`,
      title: m.title,
      text: m.description.substring(0, 300),
      source: "missao",
      href: `/voluntario/missao/${m.id}`,
    });
  }

  return items;
}

// Helper: Build queue from Top of Week
export function buildQueueFromTop(data: {
  usei?: Array<{ target_id: string; target_type: string; title: string | null; score_sum: number }>;
  compartilhei?: Array<{ target_id: string; target_type: string; title: string | null; score_sum: number }>;
  puxo?: Array<{ target_id: string; target_type: string; title: string | null; score_sum: number }>;
  coordPicks?: Array<{ target_id: string; target_type: string; title: string | null; note: string | null }>;
}, scopeId: string): RadioItem[] {
  const items: RadioItem[] = [];
  
  const getHref = (type: string, id: string) => 
    type === "mission" ? `/voluntario/missao/${id}` : `/voluntario/celula/${scopeId}/mural/${id}`;

  // Coord picks first
  if (data.coordPicks) {
    data.coordPicks.slice(0, 2).forEach((pick) => {
      items.push({
        id: `pick-${pick.target_id}`,
        title: pick.title || "Escolha da Coordenação",
        text: pick.note || "Recomendado pela coordenação",
        source: "top",
        href: getHref(pick.target_type, pick.target_id),
      });
    });
  }

  // Top Usei
  if (data.usei) {
    data.usei.slice(0, 2).forEach((item) => {
      items.push({
        id: `usei-${item.target_id}`,
        title: item.title || "Item popular",
        text: `Mais usado da semana, com ${Math.round(item.score_sum)} pontos`,
        source: "top",
        href: getHref(item.target_type, item.target_id),
      });
    });
  }

  // Top Compartilhei
  if (data.compartilhei) {
    data.compartilhei.slice(0, 2).forEach((item) => {
      items.push({
        id: `compartilhei-${item.target_id}`,
        title: item.title || "Item compartilhado",
        text: `Mais compartilhado da semana, com ${Math.round(item.score_sum)} pontos`,
        source: "top",
        href: getHref(item.target_type, item.target_id),
      });
    });
  }

  return items;
}

// Helper: Build mini queue for "Hoje" (3 items max)
export function buildQueueFromHoje(data: {
  task?: { id: string; titulo: string; squad_nome?: string };
  mission?: { id: string; title: string; description?: string };
  agenda?: { id: string; titulo: string; local_texto?: string | null };
}): RadioItem[] {
  const items: RadioItem[] = [];

  if (data.task) {
    items.push({
      id: `tarefa-${data.task.id}`,
      title: data.task.titulo,
      text: data.task.squad_nome ? `Squad: ${data.task.squad_nome}` : "Tarefa prioritária",
      source: "tarefa",
      href: "/voluntario/squads",
    });
  }

  if (data.mission) {
    items.push({
      id: `missao-${data.mission.id}`,
      title: data.mission.title,
      text: data.mission.description?.substring(0, 200) || "Missão do dia",
      source: "missao",
      href: `/voluntario/missao/${data.mission.id}`,
    });
  }

  if (data.agenda) {
    items.push({
      id: `agenda-${data.agenda.id}`,
      title: data.agenda.titulo,
      text: data.agenda.local_texto || "Atividade do dia",
      source: "atividade",
      href: `/voluntario/agenda/${data.agenda.id}`,
    });
  }

  return items;
}
