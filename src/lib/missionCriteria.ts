/**
 * missionCriteria — F21
 * 
 * Single source of truth for validation criteria per mission type.
 * Used by:
 *   - MissionProofGuide (volunteer-facing)
 *   - RegistroDetailSheet (coordinator-facing)
 *   - registroQualityCheck (pre-submit hints)
 *   - RegistroRapido (signal strength)
 * 
 * No scores, no AI. Just structured, human-readable criteria.
 */

export type CriterionWeight = "essential" | "recommended" | "forbidden";

export interface Criterion {
  text: string;
  weight: CriterionWeight;
  /** Which field this criterion maps to (for automated signal checking) */
  field?: "resumo" | "relato" | "photo" | "link" | "local";
}

export interface MissionCriteria {
  /** What usually makes this type valid */
  criteria: Criterion[];
  /** One-line summary for coordinators */
  coordTip: string;
}

const CRITERIA_MAP: Record<string, MissionCriteria> = {
  conversa: {
    criteria: [
      { text: "Resumo claro do que foi conversado", weight: "essential", field: "resumo" },
      { text: "Relato com substância (quem, contexto, resultado)", weight: "essential", field: "relato" },
      { text: "Nome do contato (se autorizado)", weight: "recommended" },
      { text: "Foto do encontro", weight: "recommended", field: "photo" },
      { text: "Dados pessoais sensíveis ou documentos", weight: "forbidden" },
    ],
    coordTip: "Priorize resumo + relato. Foto é bônus, não requisito.",
  },
  rua: {
    criteria: [
      { text: "Resumo da ação realizada", weight: "essential", field: "resumo" },
      { text: "Foto da ação OU relato detalhado", weight: "essential", field: "photo" },
      { text: "Local específico", weight: "essential", field: "local" },
      { text: "Quantidade de pessoas abordadas", weight: "recommended" },
      { text: "Fotos de terceiros sem consentimento", weight: "forbidden" },
    ],
    coordTip: "Foto + local forte = validação rápida. Sem foto, relato precisa compensar.",
  },
  escuta: {
    criteria: [
      { text: "Relato escrito do que ouviu", weight: "essential", field: "relato" },
      { text: "Resumo objetivo", weight: "essential", field: "resumo" },
      { text: "Contexto ou origem da conversa", weight: "recommended" },
      { text: "Gravações sem autorização", weight: "forbidden" },
    ],
    coordTip: "O relato é a evidência principal. Deve ter substância, não só 'ouvi coisas'.",
  },
  mobilizacao: {
    criteria: [
      { text: "Resumo da mobilização", weight: "essential", field: "resumo" },
      { text: "Foto do grupo OU relato", weight: "essential", field: "photo" },
      { text: "Número aproximado de participantes", weight: "recommended" },
      { text: "Fotos sem autorização dos presentes", weight: "forbidden" },
    ],
    coordTip: "Foto de grupo acelera validação. Número de participantes ajuda.",
  },
  conteudo: {
    criteria: [
      { text: "Print OU link do conteúdo publicado", weight: "essential", field: "link" },
      { text: "Resumo do que foi produzido", weight: "essential", field: "resumo" },
      { text: "Métricas ou alcance", weight: "recommended" },
      { text: "Conteúdo de terceiros sem crédito", weight: "forbidden" },
    ],
    coordTip: "Link ou print é obrigatório. Sem comprovação, pedir ajuste.",
  },
  dados: {
    criteria: [
      { text: "Print ou descrição da fonte consultada", weight: "essential", field: "photo" },
      { text: "Resumo do levantamento", weight: "essential", field: "resumo" },
      { text: "Link da fonte", weight: "recommended", field: "link" },
      { text: "Análise ou observação preliminar", weight: "recommended" },
      { text: "Dados pessoais de terceiros sem LGPD", weight: "forbidden" },
    ],
    coordTip: "Fonte verificável fortalece. Link ou print da fonte é ideal.",
  },
  formacao: {
    criteria: [
      { text: "Print de conclusão OU reflexão escrita", weight: "essential", field: "relato" },
      { text: "Resumo do que aprendeu", weight: "essential", field: "resumo" },
      { text: "O que vai aplicar na prática", weight: "recommended" },
      { text: "Cópias de materiais protegidos", weight: "forbidden" },
    ],
    coordTip: "Reflexão mínima é essencial. Print de certificado ajuda.",
  },
};

const DEFAULT_CRITERIA: MissionCriteria = {
  criteria: [
    { text: "Resumo claro da ação", weight: "essential", field: "resumo" },
    { text: "Foto OU relato escrito", weight: "essential", field: "photo" },
    { text: "Local ou contexto", weight: "recommended", field: "local" },
    { text: "Dados pessoais de terceiros", weight: "forbidden" },
  ],
  coordTip: "Verifique se há resumo + alguma evidência (foto ou relato).",
};

/** Get structured criteria for a mission type */
export function getMissionCriteria(type: string | null | undefined): MissionCriteria {
  if (!type) return DEFAULT_CRITERIA;
  return CRITERIA_MAP[type] ?? DEFAULT_CRITERIA;
}

/** Evaluate how well a registro meets criteria — returns "strong" | "acceptable" | "weak" */
export type SignalStrength = "strong" | "acceptable" | "weak";

interface RegistroSignalInput {
  resumo: string;
  localTexto: string;
  relatoTexto: string;
  hasPhoto: boolean;
  linkConteudo: string;
  missionType: string;
}

export function getRegistroSignal(input: RegistroSignalInput): {
  strength: SignalStrength;
  met: number;
  total: number;
} {
  const criteria = getMissionCriteria(input.missionType);
  const essentials = criteria.criteria.filter(c => c.weight === "essential");
  
  let met = 0;
  for (const c of essentials) {
    if (isFieldMet(c.field, input)) met++;
  }

  const total = essentials.length;
  const ratio = total > 0 ? met / total : 1;

  return {
    strength: ratio >= 1 ? "strong" : ratio >= 0.5 ? "acceptable" : "weak",
    met,
    total,
  };
}

function isFieldMet(
  field: Criterion["field"],
  input: RegistroSignalInput
): boolean {
  switch (field) {
    case "resumo":
      return input.resumo.trim().length >= 10;
    case "relato":
      return input.relatoTexto.trim().length >= 20;
    case "photo":
      return input.hasPhoto;
    case "link":
      return input.linkConteudo.trim().length > 0 || input.hasPhoto;
    case "local":
      return input.localTexto.trim().length >= 3;
    default:
      return true; // Non-field criteria (manual items) default to met
  }
}
