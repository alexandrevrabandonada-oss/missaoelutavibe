import type { Database } from "@/integrations/supabase/types";

export type MissionType = Database["public"]["Enums"]["mission_type"];

/** Canonical mission types from the database enum */
export const VALID_MISSION_TYPES: { value: MissionType; label: string; aliases: string[] }[] = [
  { value: "escuta", label: "Escuta (pesquisa/entrevista)", aliases: ["listening", "research", "pesquisa", "entrevista", "survey"] },
  { value: "rua", label: "Rua (ação de rua)", aliases: ["street", "territorio", "território", "panfletagem", "door-to-door"] },
  { value: "mobilizacao", label: "Mobilização (eventos)", aliases: ["mobilização", "mobilization", "growth", "crescimento", "evento", "outreach"] },
  { value: "conteudo", label: "Conteúdo (criação)", aliases: ["conteúdo", "content", "comunicacao", "comunicação", "social media", "material"] },
  { value: "dados", label: "Dados (CRM/pesquisa)", aliases: ["data", "base", "crm", "data entry"] },
  { value: "formacao", label: "Formação (treinamento)", aliases: ["formação", "training", "curso", "course", "study"] },
  { value: "conversa", label: "Conversa (follow-up)", aliases: ["conversation", "debate", "call", "follow-up", "followup"] },
];

const ALIAS_MAP = new Map<string, MissionType>();

// Build the alias map once
for (const t of VALID_MISSION_TYPES) {
  ALIAS_MAP.set(t.value, t.value);
  ALIAS_MAP.set(t.label.toLowerCase(), t.value);
  for (const alias of t.aliases) {
    ALIAS_MAP.set(alias.toLowerCase(), t.value);
  }
}

/** Strip accents, lowercase, trim */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // strip diacritics
}

export interface NormalizationResult {
  normalized: MissionType | null;
  original: string;
  wasChanged: boolean;
  suggestion: MissionType | null;
}

/**
 * Attempt to normalize a raw type string to a valid MissionType.
 * Returns the match or null + a suggestion if close.
 */
export function normalizeMissionType(raw: string): NormalizationResult {
  const original = raw;
  const clean = normalize(raw);

  // Direct match (handles case/accent variations)
  for (const [key, value] of ALIAS_MAP.entries()) {
    if (normalize(key) === clean) {
      return { normalized: value, original, wasChanged: value !== raw, suggestion: null };
    }
  }

  // Fuzzy: check if clean string starts with or is contained in any alias
  for (const t of VALID_MISSION_TYPES) {
    const normValue = normalize(t.value);
    if (clean.startsWith(normValue) || normValue.startsWith(clean)) {
      return { normalized: null, original, wasChanged: false, suggestion: t.value };
    }
    for (const alias of t.aliases) {
      const normAlias = normalize(alias);
      if (clean.startsWith(normAlias) || normAlias.startsWith(clean)) {
        return { normalized: null, original, wasChanged: false, suggestion: t.value };
      }
    }
  }

  return { normalized: null, original, wasChanged: false, suggestion: null };
}

/**
 * Extract mission type from an object, checking type, kind, and category fields.
 */
export function extractMissionType(mission: Record<string, unknown>): { field: string; rawValue: string } | null {
  for (const field of ["type", "kind", "category", "tipo"]) {
    if (mission[field] && typeof mission[field] === "string") {
      return { field, rawValue: mission[field] as string };
    }
  }
  return null;
}

/** Generate a valid template pack JSON string */
export function generateTemplatePack(): string {
  return JSON.stringify({
    pack: {
      id: "pack_meu_v01",
      title: "Meu Pack de Missões",
      defaults: {
        assigned_to: "all",
        status: "rascunho",
        estimated_min: 15,
        points: 10,
      },
    },
    missions: [
      {
        type: "escuta",
        title: "Mini-escuta no bairro (2 perguntas)",
        description: "Fale com 1 pessoa e registre respostas.",
        tags: ["campo", "escuta"],
        estimated_min: 15,
      },
      {
        type: "rua",
        title: "Entregar 5 panfletos",
        description: "Distribuir material no ponto de ônibus.",
        tags: ["campo", "panfletagem"],
        estimated_min: 10,
      },
      {
        type: "conversa",
        title: "Ligar para 1 contato",
        description: "Follow-up com contato do CRM.",
        tags: ["conversa", "crm"],
        estimated_min: 10,
      },
    ],
  }, null, 2);
}
