/**
 * journeyStatus.ts — F20: Single source of truth for volunteer journey states.
 *
 * Every surface (Missões, Meus Registros, Memória, Hoje, Missão detail)
 * imports from here instead of defining local status maps.
 *
 * Evidence-level status → unified label, icon name, semantic color token.
 */

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  ShieldCheck,
  Target,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ─── Journey steps (linear progression) ─────────────────────

export type JourneyStep = "agir" | "enviado" | "analise" | "recibo";

export const JOURNEY_STEPS: { key: JourneyStep; label: string }[] = [
  { key: "agir", label: "Agir" },
  { key: "enviado", label: "Enviado" },
  { key: "analise", label: "Análise" },
  { key: "recibo", label: "Recibo" },
];

// ─── Evidence status config ─────────────────────────────────

export type EvidenceStatusKey =
  | "nao_iniciou"
  | "rascunho"
  | "enviado"
  | "precisa_ajuste"
  | "validado"
  | "rejeitado";

export interface StatusConfig {
  /** Short user-facing label (e.g. "Em análise") */
  label: string;
  /** Lucide icon component */
  icon: LucideIcon;
  /** Semantic color class for icon/text */
  colorClass: string;
  /** Badge background class */
  badgeClass: string;
  /** Left border class for cards */
  borderClass: string;
  /** Which journey step this maps to */
  journeyStep: JourneyStep;
  /** Default CTA label */
  ctaLabel: string;
  /** Short explanation for the volunteer */
  hint: string;
}

const STATUS_MAP: Record<EvidenceStatusKey, StatusConfig> = {
  nao_iniciou: {
    label: "Não iniciou",
    icon: Target,
    colorClass: "text-primary",
    badgeClass: "border-transparent bg-primary/15 text-primary",
    borderClass: "border-l-primary",
    journeyStep: "agir",
    ctaLabel: "Agir agora",
    hint: "Você ainda não registrou ação nesta missão",
  },
  rascunho: {
    label: "Rascunho",
    icon: FileText,
    colorClass: "text-muted-foreground",
    badgeClass: "border-transparent bg-muted text-muted-foreground",
    borderClass: "border-l-muted-foreground/40",
    journeyStep: "agir",
    ctaLabel: "Continuar registro",
    hint: "Registro salvo como rascunho",
  },
  enviado: {
    label: "Em análise",
    icon: Clock,
    colorClass: "text-amber-500",
    badgeClass: "border-transparent bg-amber-500/15 text-amber-600 dark:text-amber-400",
    borderClass: "border-l-amber-500",
    journeyStep: "analise",
    ctaLabel: "Acompanhar",
    hint: "Aguardando validação da coordenação",
  },
  precisa_ajuste: {
    label: "Ajuste necessário",
    icon: AlertTriangle,
    colorClass: "text-orange-500",
    badgeClass: "border-transparent bg-orange-500/15 text-orange-600 dark:text-orange-400",
    borderClass: "border-l-orange-500",
    journeyStep: "agir",
    ctaLabel: "Corrigir registro",
    hint: "A coordenação pediu uma correção",
  },
  validado: {
    label: "Recibo emitido",
    icon: ShieldCheck,
    colorClass: "text-emerald-500",
    badgeClass: "border-transparent bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    borderClass: "border-l-emerald-500",
    journeyStep: "recibo",
    ctaLabel: "Ver recibo",
    hint: "Registro validado pela coordenação",
  },
  rejeitado: {
    label: "Não validado",
    icon: XCircle,
    colorClass: "text-destructive",
    badgeClass: "border-transparent bg-destructive/15 text-destructive",
    borderClass: "border-l-destructive",
    journeyStep: "agir",
    ctaLabel: "Ver detalhes",
    hint: "Registro não atendeu aos critérios desta vez",
  },
};

/**
 * Get unified status config for an evidence status string.
 * Falls back to "rascunho" for unknown values.
 */
export function getJourneyStatus(
  evidenceStatus: string | null | undefined,
  hasEvidence: boolean = true
): StatusConfig {
  if (!hasEvidence || !evidenceStatus) return STATUS_MAP.nao_iniciou;
  return STATUS_MAP[evidenceStatus as EvidenceStatusKey] ?? STATUS_MAP.rascunho;
}

/**
 * Get the current journey step index (0-3) for progress indicators.
 */
export function getJourneyStepIndex(step: JourneyStep): number {
  return JOURNEY_STEPS.findIndex((s) => s.key === step);
}
