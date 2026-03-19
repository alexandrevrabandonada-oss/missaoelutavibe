/**
 * registroQualityCheck — F18
 * 
 * Pure, deterministic quality hints for registro submissions.
 * No scores, no AI, no magic. Just clear rules per mission type.
 * 
 * Returns soft hints (not hard errors) to guide the volunteer
 * toward a submission that won't bounce back as "precisa_ajuste".
 */

export type HintLevel = "tip" | "warning";

export interface QualityHint {
  field: "resumo" | "local" | "evidencia" | "relato" | "link";
  level: HintLevel;
  message: string;
}

interface RegistroFields {
  resumo: string;
  localTexto: string;
  relatoTexto: string;
  hasPhoto: boolean;
  linkConteudo: string;
  missionType: string;
}

// ── Per-type minimum guidance ──────────────────────────────────────────────

const RESUMO_MIN_WORDS: Record<string, number> = {
  conversa: 5,
  rua: 4,
  escuta: 5,
  mobilizacao: 4,
  conteudo: 3,
  dados: 3,
  formacao: 3,
};
const DEFAULT_RESUMO_MIN_WORDS = 4;

const TYPES_THAT_BENEFIT_FROM_PHOTO = ["rua", "mobilizacao", "conteudo"];
const TYPES_THAT_BENEFIT_FROM_LINK = ["conteudo", "dados"];
const TYPES_THAT_NEED_GOOD_RELATO = ["conversa", "escuta", "formacao"];

// ── Main check ─────────────────────────────────────────────────────────────

export function getQualityHints(fields: RegistroFields): QualityHint[] {
  const hints: QualityHint[] = [];
  const { resumo, localTexto, relatoTexto, hasPhoto, linkConteudo, missionType } = fields;

  const resumoWords = resumo.trim().split(/\s+/).filter(Boolean).length;
  const minWords = RESUMO_MIN_WORDS[missionType] ?? DEFAULT_RESUMO_MIN_WORDS;

  // ── Resumo ───────────────────────────────────────────────────────────────
  if (resumo.trim().length >= 10 && resumoWords < minWords) {
    hints.push({
      field: "resumo",
      level: "tip",
      message: "Tente ser mais específico — quem, onde, quantos?",
    });
  }

  // Generic/vague resumo detection (very light heuristic)
  const vagueStarts = ["fiz", "realizei", "cumpri", "missão"];
  const firstWord = resumo.trim().toLowerCase().split(/\s+/)[0] ?? "";
  if (resumoWords >= minWords && vagueStarts.includes(firstWord) && resumoWords < minWords + 3) {
    hints.push({
      field: "resumo",
      level: "tip",
      message: "Inclua um detalhe concreto — isso acelera a validação.",
    });
  }

  // ── Local ────────────────────────────────────────────────────────────────
  if (localTexto.trim().length >= 3 && localTexto.trim().length < 6) {
    hints.push({
      field: "local",
      level: "tip",
      message: "Quanto mais específico o local, mais fácil validar.",
    });
  }

  // ── Evidência / Foto ─────────────────────────────────────────────────────
  if (!hasPhoto && TYPES_THAT_BENEFIT_FROM_PHOTO.includes(missionType)) {
    hints.push({
      field: "evidencia",
      level: "tip",
      message: "Uma foto acelera muito a validação para esse tipo de missão.",
    });
  }

  // ── Link (digital missions) ──────────────────────────────────────────────
  if (!linkConteudo.trim() && TYPES_THAT_BENEFIT_FROM_LINK.includes(missionType)) {
    hints.push({
      field: "link",
      level: "tip",
      message: "Adicionar o link ajuda a coordenação a validar mais rápido.",
    });
  }

  // ── Relato ───────────────────────────────────────────────────────────────
  if (TYPES_THAT_NEED_GOOD_RELATO.includes(missionType)) {
    const relatoLen = relatoTexto.trim().length;
    if (relatoLen === 0 && !hasPhoto) {
      hints.push({
        field: "relato",
        level: "warning",
        message: missionType === "conversa"
          ? "Para conversas, o relato é essencial — descreva o que aconteceu."
          : missionType === "escuta"
          ? "Na escuta ativa, o relato escrito é a principal evidência."
          : "Uma reflexão curta sobre o que aprendeu fortalece o registro.",
      });
    } else if (relatoLen > 0 && relatoLen < 30 && !hasPhoto) {
      hints.push({
        field: "relato",
        level: "tip",
        message: "Relatos muito curtos costumam voltar para ajuste. Detalhe um pouco mais.",
      });
    }
  }

  return hints;
}

/** True if there are no warnings (tips are OK) */
export function isQualityGood(hints: QualityHint[]): boolean {
  return hints.every(h => h.level === "tip");
}
