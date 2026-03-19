/**
 * getCoordFocus - Deterministic priority helper for coordination
 * F17: Returns the single most important focus for a coordinator right now.
 *
 * Priority order:
 * 1. Pending evidences older than 48h
 * 2. Stalled adjustments (precisa_ajuste > 5 days)
 * 3. Recent pending evidences
 * 4. Cold cycle (active cycle, 0 submissions in 3d)
 * 5. Healthy — nothing to do
 */

import type { ValidationPulse } from "@/hooks/useCoordValidationPulse";

export type FocusLevel = "urgent" | "attention" | "normal" | "cold" | "healthy";

export interface CoordFocus {
  level: FocusLevel;
  title: string;
  reason: string;
  /** Navigation action string compatible with CoordCelulaHub handlers */
  action: string | null;
  ctaLabel: string | null;
}

export function getCoordFocus(pulse: ValidationPulse | undefined): CoordFocus {
  if (!pulse) {
    return { level: "healthy", title: "Carregando…", reason: "", action: null, ctaLabel: null };
  }

  // 1. Old pendings (> 48h)
  if (pulse.pendingCount > 0 && (pulse.oldestPendingHours ?? 0) > 48) {
    const count = pulse.pendingCount;
    return {
      level: "urgent",
      title: "Validar pendentes antigos",
      reason: `${count} registro${count > 1 ? "s" : ""} esperando há ${pulse.oldestPendingLabel}`,
      action: "registros:enviado",
      ctaLabel: "Abrir fila de pendentes",
    };
  }

  // 2. Stalled adjustments (> 5 days)
  if (pulse.stalledAdjustments > 0) {
    const n = pulse.stalledAdjustments;
    const age = pulse.oldestStalledHours
      ? `${Math.floor(pulse.oldestStalledHours / 24)}+ dias`
      : "> 5 dias";
    return {
      level: "urgent",
      title: "Revisar ajustes parados",
      reason: `${n} ajuste${n > 1 ? "s" : ""} sem resposta há ${age}`,
      action: "registros:precisa_ajuste",
      ctaLabel: "Ver ajustes parados",
    };
  }

  // 3. Recent pendings (≤ 48h)
  if (pulse.pendingCount > 0) {
    const count = pulse.pendingCount;
    return {
      level: "attention",
      title: "Validar pendentes",
      reason: `${count} registro${count > 1 ? "s" : ""} aguardando validação`,
      action: "registros:enviado",
      ctaLabel: "Abrir fila de pendentes",
    };
  }

  // 4. Cold cycle
  if (pulse.isCold) {
    return {
      level: "cold",
      title: "Mobilizar a célula",
      reason: "Nenhum registro nos últimos 3 dias com ciclo ativo",
      action: "tab:missoes",
      ctaLabel: "Ver missões",
    };
  }

  // 5. All clear
  return {
    level: "healthy",
    title: "Tudo sob controle",
    reason: "Sem gargalos detectados no momento",
    action: null,
    ctaLabel: null,
  };
}
