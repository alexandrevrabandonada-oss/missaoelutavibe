/**
 * getMemberPriority — Single source of truth for member priority hierarchy.
 *
 * Used by HojePendencias, MinhaCelulaCard, CelulaProximaAcao.
 *
 * Priority order:
 * 1. fix    — Registro precisa de ajuste (precisa_ajuste)
 * 2. review — Registro em análise (enviado, has evidence)
 * 3. action — Missões sem ação (no evidence, not concluded)
 * 4. clear  — Tudo em dia
 */

export type MemberPriorityType = "fix" | "review" | "action" | "clear";

export interface MemberPriority {
  type: MemberPriorityType;
  /** Mission that triggered this priority (null for "clear") */
  triggerMission: MissionSnapshot | null;
  /** Count of actionable missions (only relevant for "action" type) */
  actionableCount: number;
}

export interface MissionSnapshot {
  title: string;
  missionId: string;
}

interface MissionInput {
  id: string;
  title: string;
  status: string | null;
  myLatestStatus: string | null;
  myEvidenceCount: number;
}

export function getMemberPriority(missions: MissionInput[]): MemberPriority {
  // 1. Ajuste necessário
  const needsFix = missions.find(
    (m) => m.myLatestStatus === "precisa_ajuste" && m.status !== "concluida"
  );
  if (needsFix) {
    return {
      type: "fix",
      triggerMission: { title: needsFix.title, missionId: needsFix.id },
      actionableCount: 0,
    };
  }

  // 2. Em análise
  const inReview = missions.find(
    (m) =>
      m.myEvidenceCount > 0 &&
      m.myLatestStatus === "enviado" &&
      m.status !== "concluida"
  );
  if (inReview) {
    return {
      type: "review",
      triggerMission: { title: inReview.title, missionId: inReview.id },
      actionableCount: 0,
    };
  }

  // 3. Missões sem ação
  const actionable = missions.filter(
    (m) => m.myEvidenceCount === 0 && m.status !== "concluida"
  );
  if (actionable.length > 0) {
    return {
      type: "action",
      triggerMission: { title: actionable[0].title, missionId: actionable[0].id },
      actionableCount: actionable.length,
    };
  }

  // 4. Tudo em dia
  return { type: "clear", triggerMission: null, actionableCount: 0 };
}
