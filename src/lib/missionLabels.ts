/**
 * Mission labels — human-readable names for mission types and evidence statuses
 * F10.1: Single source of truth for consistent copy across surfaces
 */

export const MISSION_TYPE_LABELS: Record<string, string> = {
  conversa: "Conversa",
  rua: "Ação de rua",
  escuta: "Escuta ativa",
  mobilizacao: "Mobilização",
  conteudo: "Conteúdo",
  dados: "Levantamento de dados",
  formacao: "Formação",
  evento: "Evento",
  articulacao: "Articulação",
};

/** Returns human label or title-cased fallback */
export function getMissionTypeLabel(type: string | null | undefined): string {
  if (!type) return "Missão";
  return MISSION_TYPE_LABELS[type] ?? type.charAt(0).toUpperCase() + type.slice(1);
}

export const EVIDENCE_STATUS_LABELS: Record<string, string> = {
  validado: "Recibo emitido",
  enviado: "Em análise",
  precisa_ajuste: "Ajuste necessário",
  rejeitado: "Rejeitado",
  rascunho: "Rascunho",
};

export function getEvidenceStatusLabel(status: string | null | undefined): string {
  if (!status) return "Pendente";
  return EVIDENCE_STATUS_LABELS[status] ?? status;
}
