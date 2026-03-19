/**
 * Mission Recommendation Engine
 * 
 * Key design: DETERMINISTIC per user+day via seeded shuffle.
 * - "Missão de Hoje" is stable across page reloads (same user+day = same pick).
 * - Recommendations rotate daily without repeating yesterday's pick.
 * - Funnel priority: Convite > Contato > Escuta/Rua.
 * - Archived missions (meta_json.archived=true) are ALWAYS excluded.
 */

import type { Tables, Json } from "@/integrations/supabase/types";
import { isArchivedMission } from "./pilotMissionFilter";

type Mission = Tables<"missions">;
type Profile = Tables<"profiles">;

// ─── Seeded PRNG (deterministic per user+day) ───────────────────────────

/**
 * Simple string→number hash (djb2).
 * Produces a consistent 32-bit integer for any string.
 */
function hashString(s: string): number {
  let hash = 5381;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) + hash + s.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Seeded pseudo-random number generator (Mulberry32).
 * Returns a function that yields deterministic floats in [0,1).
 */
function seededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Build today's seed for a given userId.
 * Same user + same calendar day = same seed.
 */
export function todaySeed(userId: string): number {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return hashString(`${userId}:${today}`);
}

/**
 * Build yesterday's seed (for cooldown check).
 */
function yesterdaySeed(userId: string): number {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const yesterday = d.toISOString().slice(0, 10);
  return hashString(`${userId}:${yesterday}`);
}

/**
 * Deterministic shuffle of an array using a seeded PRNG.
 * Returns a NEW array (does not mutate input).
 */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const copy = [...arr];
  const rng = seededRandom(seed);
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ─── Funnel priority tags ───────────────────────────────────────────────

/** Mission categories for funnel prioritization */
const FUNNEL_CATEGORIES = {
  convite: ["convite", "invite", "crescimento", "mobilizacao"],
  contato: ["crm", "contato", "base", "salvar"],
  escuta: ["escuta", "conversa", "mini-escuta"],
  rua: ["rua", "campo", "territorio", "bairro"],
} as const;

type FunnelCategory = keyof typeof FUNNEL_CATEGORIES;

function classifyMissionFunnel(mission: Mission): FunnelCategory | null {
  const meta = mission.meta_json as { tags?: string[] } | null;
  const tags = meta?.tags?.map(t => t.toLowerCase()) ?? [];
  const text = `${mission.title} ${mission.description ?? ""}`.toLowerCase();
  
  for (const [category, keywords] of Object.entries(FUNNEL_CATEGORIES)) {
    if (keywords.some(kw => tags.includes(kw) || text.includes(kw))) {
      return category as FunnelCategory;
    }
  }
  // Fallback by type
  if (mission.type === "mobilizacao") return "convite";
  if (mission.type === "conversa") return "contato";
  if (mission.type === "escuta") return "escuta";
  if (mission.type === "rua") return "rua";
  return null;
}

// ─── Interest/tag normalization ─────────────────────────────────────────

const INTEREST_TAG_MAP: Record<string, string[]> = {
  rua: ["rua", "campo", "bairro", "cuidado"],
  conteudo: ["conteudo", "criador", "compartilhar", "memoria"],
  escuta: ["escuta", "conversa", "campo"],
  dados: ["dados", "prova", "diagnostico"],
  tech: ["tech", "dados", "organizacao"],
  formacao: ["formacao", "estudo"],
  juridico: ["juridico", "direitos"],
  logistica: ["logistica", "organizacao", "crm"],
  mobilizacao: ["mobilizacao", "convite", "campo"],
};

const BASE_TAGS = ["agora", "base", "convite"];

export const CANONICAL_SLUGS = [
  "celula-checkin-semanal-2min",
  "convite-1-pessoa-para-sua-celula",
  "playbook-1-acao-rodar-agora",
  "mural-1-relato-1-pergunta",
  "trio-15min-acao-da-semana",
  "debate-1-comentario-modelo-3-linhas",
  "beta-1-bug-1-atricao-1-ideia",
];

const TYPE_TAG_MAP: Record<string, string[]> = {
  rua: ["rua", "campo"],
  conversa: ["escuta", "conversa"],
  escuta: ["escuta", "conversa"],
  mobilizacao: ["mobilizacao", "convite"],
  conteudo: ["conteudo", "criador"],
  dados: ["dados", "prova"],
  formacao: ["formacao", "estudo"],
};

interface OnboardingPrefs {
  interesses?: string[];
  tempo?: number;
  [key: string]: unknown;
}

export function normalizeInterestTags(
  interests: string[] | null,
  onboardingPrefs: Json | null
): string[] {
  const combined = new Set<string>();
  BASE_TAGS.forEach(tag => combined.add(tag));
  
  if (interests && Array.isArray(interests)) {
    interests.forEach(interest => {
      const mapped = INTEREST_TAG_MAP[interest.toLowerCase()];
      if (mapped) mapped.forEach(tag => combined.add(tag));
      else combined.add(interest.toLowerCase());
    });
  }
  
  const prefs = onboardingPrefs as OnboardingPrefs | null;
  if (prefs?.interesses && Array.isArray(prefs.interesses)) {
    prefs.interesses.forEach(interesse => {
      const mapped = INTEREST_TAG_MAP[interesse.toLowerCase()];
      if (mapped) mapped.forEach(tag => combined.add(tag));
      else combined.add(interesse.toLowerCase());
    });
  }
  
  return Array.from(combined);
}

function getMissionTags(mission: Mission): string[] {
  const metaJson = mission.meta_json as { tags?: string[] } | null;
  if (metaJson?.tags && Array.isArray(metaJson.tags)) {
    return metaJson.tags.map(t => t.toLowerCase());
  }
  const keywords: string[] = [];
  const text = `${mission.title} ${mission.description || ""}`.toLowerCase();
  const keywordPatterns = [
    { pattern: /rua|bairro|campo|panflet/i, tag: "rua" },
    { pattern: /convers|escuta|dialog/i, tag: "escuta" },
    { pattern: /conteudo|video|foto|imagem/i, tag: "conteudo" },
    { pattern: /dados|pesquisa|diagnostic/i, tag: "dados" },
    { pattern: /formac|estud|aprend/i, tag: "formacao" },
    { pattern: /convite|mobiliz/i, tag: "mobilizacao" },
  ];
  keywordPatterns.forEach(({ pattern, tag }) => {
    if (pattern.test(text)) keywords.push(tag);
  });
  return keywords;
}

// ─── Scoring ────────────────────────────────────────────────────────────

interface ScoredMission {
  mission: Mission;
  score: number;
  funnelCategory: FunnelCategory | null;
  debugInfo?: {
    tagOverlap: number;
    typeBonus: number;
    timeBonus: number;
    penalties: number;
  };
}

export function scoreMission(
  mission: Mission,
  normalizedUserTags: string[],
  userPrefs: OnboardingPrefs | null,
  completedMissionIds: Set<string> = new Set()
): ScoredMission {
  let score = 0;
  const debugInfo = { tagOverlap: 0, typeBonus: 0, timeBonus: 0, penalties: 0 };
  
  const missionTags = getMissionTags(mission);
  const overlap = missionTags.filter(tag => normalizedUserTags.includes(tag)).length;
  const tagScore = Math.min(overlap * 3, 12);
  score += tagScore;
  debugInfo.tagOverlap = tagScore;
  
  const typeTags = TYPE_TAG_MAP[mission.type] || [];
  if (typeTags.some(tag => normalizedUserTags.includes(tag))) {
    score += 2;
    debugInfo.typeBonus = 2;
  }
  
  const metaJson = mission.meta_json as { estimated_min?: number } | null;
  const estimatedMin = metaJson?.estimated_min;
  const userTempo = userPrefs?.tempo;
  
  if (estimatedMin && userTempo) {
    if (estimatedMin <= userTempo + 5) { score += 1; debugInfo.timeBonus = 1; }
    if (estimatedMin >= 30 && userTempo < 20) { score -= 1; debugInfo.penalties -= 1; }
  }
  
  if (completedMissionIds.has(mission.id)) { score -= 3; debugInfo.penalties -= 3; }
  
  const metaCanonical = (mission.meta_json as { canonical?: boolean } | null)?.canonical;
  if (metaCanonical === true) { score += 5; debugInfo.typeBonus += 5; }
  
  return { mission, score, funnelCategory: classifyMissionFunnel(mission), debugInfo };
}

// ─── Deterministic daily recommendations ────────────────────────────────

export interface DailyRecommendation {
  todayMission: Mission | null;
  recommended: Mission[];       // 2 extra recommendations
  allSorted: ScoredMission[];   // full scored list for "ver mais"
}

/**
 * Deterministic daily mission recommendations.
 * 
 * Rules:
 * 1. Same user+day = same "Missão de Hoje" (seeded shuffle).
 * 2. Funnel priority: convite > contato > escuta > rua > rest.
 * 3. Yesterday's #1 pick won't be today's #1 (cooldown).
 * 4. Completed-today missions are excluded from top picks.
 */
export function getDailyRecommendations(
  missions: Mission[],
  profile: Profile | null,
  userId: string,
  completedTodayIds: Set<string> = new Set(),
  allCompletedIds: Set<string> = new Set(),
): DailyRecommendation {
  const empty: DailyRecommendation = { todayMission: null, recommended: [], allSorted: [] };
  
  if (!profile || missions.length === 0) return empty;
  
  const normalizedTags = normalizeInterestTags(profile.interests, profile.onboarding_prefs);
  const userPrefs = profile.onboarding_prefs as OnboardingPrefs | null;
  
  // Score all published missions
  const scored = missions
    .filter(m => m.status === "publicada" && !isArchivedMission(m))
    .map(m => scoreMission(m, normalizedTags, userPrefs, allCompletedIds));
  
  if (scored.length === 0) return empty;
  
  // ── Funnel boost: convite=+8, contato=+6, escuta=+4, rua=+2 ──
  const funnelBoost: Record<FunnelCategory, number> = {
    convite: 8,
    contato: 6,
    escuta: 4,
    rua: 2,
  };
  
  const boosted = scored.map(sm => ({
    ...sm,
    score: sm.score + (sm.funnelCategory ? funnelBoost[sm.funnelCategory] ?? 0 : 0),
  }));
  
  // Sort by score descending
  boosted.sort((a, b) => b.score - a.score);
  
  // ── Deterministic shuffle within same-score tiers ──
  const seed = todaySeed(userId);
  const shuffled = seededShuffle(boosted, seed);
  
  // Re-sort: within ±2 score points, the seeded shuffle determines order
  // This gives variety day-to-day while respecting priority
  shuffled.sort((a, b) => {
    const diff = b.score - a.score;
    if (Math.abs(diff) <= 2) return 0; // tie → keep seeded order
    return diff;
  });
  
  // ── Cooldown: avoid repeating yesterday's #1 ──
  const ySeed = yesterdaySeed(userId);
  const yesterdayShuffled = seededShuffle(boosted, ySeed);
  yesterdayShuffled.sort((a, b) => {
    const diff = b.score - a.score;
    if (Math.abs(diff) <= 2) return 0;
    return diff;
  });
  const yesterdayTopId = yesterdayShuffled[0]?.mission.id;
  
  // ── Pick top 3, excluding completed-today and yesterday's #1 ──
  const candidates = shuffled.filter(
    sm => !completedTodayIds.has(sm.mission.id) && sm.mission.id !== yesterdayTopId
  );
  
  // If all filtered out, fall back to full shuffled list
  const finalCandidates = candidates.length > 0 ? candidates : shuffled;
  
  const todayMission = finalCandidates[0]?.mission ?? null;
  const recommended = finalCandidates.slice(1, 3).map(sm => sm.mission);
  
  return {
    todayMission,
    recommended,
    allSorted: boosted,
  };
}

/**
 * Gets recommended missions for a user (legacy API, still used by some components)
 */
export function getRecommendedMissions(
  missions: Mission[],
  profile: Profile | null,
  completedMissionIds: Set<string> = new Set(),
  limit: number = 5,
  minScore: number = 3
): ScoredMission[] {
  if (!profile || missions.length === 0) return [];
  
  const normalizedTags = normalizeInterestTags(profile.interests, profile.onboarding_prefs);
  const userPrefs = profile.onboarding_prefs as OnboardingPrefs | null;
  
  const scoredMissions = missions
    .filter(m => m.status === "publicada" && !isArchivedMission(m))
    .map(mission => scoreMission(mission, normalizedTags, userPrefs, completedMissionIds));
  
  scoredMissions.sort((a, b) => b.score - a.score);
  
  const recommended = scoredMissions.filter(sm => sm.score >= minScore).slice(0, limit);
  
  if (recommended.length < limit) {
    const usedIds = new Set(recommended.map(sm => sm.mission.id));
    const recentFallback = scoredMissions
      .filter(sm => !usedIds.has(sm.mission.id))
      .slice(0, limit - recommended.length);
    recommended.push(...recentFallback);
  }
  
  return recommended.slice(0, limit);
}
