/**
 * VoluntarioMeusRegistros — F1.3
 * Lista histórico de registros (evidências) do voluntário.
 * Tabs: Todos | Atenção | Em análise | Validados
 * Cards expansíveis com feedback de rejeição + CTA de reenvio.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useEvidences } from "@/hooks/useEvidences";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FullPageLoader } from "@/components/ui/LoadingSpinner";
import { JourneyStepIndicator } from "@/components/missions/JourneyStepIndicator";
import { getJourneyStatus } from "@/lib/journeyStatus";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ClipboardList,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { EvidenceWithMission } from "@/hooks/useEvidences";

// ─── Status config (uses central journeyStatus) ────────────────────────────

function getStatusConfig(status: string) {
  const cfg = getJourneyStatus(status, true);
  return {
    label: cfg.label,
    icon: <cfg.icon className="h-3.5 w-3.5" />,
    badgeClass: cfg.badgeClass,
    borderClass: `border-l-4 ${cfg.borderClass}`,
    journeyStep: cfg.journeyStep,
    hint: cfg.hint,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function splitRelatoLink(relato: string | null): [string, string] {
  if (!relato) return ["", ""];
  const marker = "\n\nLink: ";
  const idx = relato.indexOf(marker);
  if (idx === -1) return [relato, ""];
  return [relato.slice(0, idx), relato.slice(idx + marker.length)];
}

// ─── RegistroCard ───────────────────────────────────────────────────────────

function RegistroCard({ evidence }: { evidence: EvidenceWithMission }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const cfg = getStatusConfig(evidence.status);
  const needsAction = evidence.status === "precisa_ajuste" || evidence.status === "rejeitado";
  const missionId = (evidence.missions as { id: string; title: string; type: string } | null)?.id;
  const missionTitle = (evidence.missions as { id: string; title: string; type: string } | null)?.title ?? "Missão";

  const handleReenviar = () => {
    if (!missionId) return;
    const [relato, link] = splitRelatoLink(evidence.relato_texto);
    navigate(`/voluntario/registro/${missionId}`, {
      state: {
        reenvio: true,
        prefillResumo: evidence.resumo ?? "",
        prefillLocal: evidence.local_texto ?? "",
        prefillRelato: relato,
        prefillLink: link,
      },
    });
  };

  return (
    <div className={`card-luta ${cfg.borderClass} p-0 overflow-hidden`}>
      {/* Main row */}
      <button
        className="w-full text-left p-4"
        onClick={() => needsAction && setExpanded(v => !v)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm leading-snug truncate">{missionTitle}</p>
            {evidence.resumo && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{evidence.resumo}</p>
            )}
            <div className="flex items-center gap-3 mt-1.5">
              <p className="text-xs text-muted-foreground">
                {format(new Date(evidence.created_at), "dd MMM yyyy", { locale: ptBR })}
              </p>
              <JourneyStepIndicator currentStep={cfg.journeyStep} />
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge className={`inline-flex items-center gap-1 text-xs font-semibold py-0.5 px-2 ${cfg.badgeClass}`}>
              {cfg.icon}
              {cfg.label}
            </Badge>
            {needsAction && (
              expanded
                ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                : <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
        {/* Hint for unexpanded actionable cards */}
        {needsAction && !expanded && (
          <p className="text-xs text-orange-600 dark:text-orange-400 mt-2 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Toque para ver o feedback
          </p>
        )}
      </button>

      {/* Expandable feedback */}
      {needsAction && expanded && (
        <div className="px-4 pb-4 border-t border-border pt-3 space-y-3 animate-slide-up">
          {evidence.rejection_reason && (
            <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3">
              <p className="text-xs font-semibold text-destructive/80 mb-1">Por que não foi validado</p>
              <p className="text-sm">{evidence.rejection_reason}</p>
            </div>
          )}
          {evidence.how_to_fix && (
            <div className="rounded-md border border-amber-500/20 bg-amber-500/5 p-3">
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">O que fazer agora</p>
              <p className="text-sm text-muted-foreground">{evidence.how_to_fix}</p>
            </div>
          )}
          {!evidence.rejection_reason && !evidence.how_to_fix && (
            <p className="text-sm text-muted-foreground italic">
              A coordenação pediu um ajuste neste registro. Tente reenviar com mais detalhes.
            </p>
          )}
          {missionId && (
            <Button
              size="sm"
              className="btn-luta w-full"
              onClick={handleReenviar}
            >
              <RefreshCw className="h-3.5 w-3.5 mr-2" />
              Corrigir e reenviar
            </Button>
          )}
        </div>
      )}

      {/* Coordinator feedback for validated records */}
      {evidence.status === "validado" && (evidence as any).coord_feedback && (
        <div className="px-4 pb-3">
          <div className="rounded-md border border-emerald-500/20 bg-emerald-500/[0.04] p-2.5">
            <p className="text-[10px] uppercase text-emerald-600 dark:text-emerald-400 mb-0.5 font-semibold tracking-wide">
              Retorno da coordenação
            </p>
            <p className="text-xs text-muted-foreground italic">"{(evidence as any).coord_feedback}"</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-40" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function VoluntarioMeusRegistros() {
  const navigate = useNavigate();
  const { myEvidences, isMyEvidencesLoading } = useEvidences();

  const atencao = myEvidences.filter(e => e.status === "precisa_ajuste" || e.status === "rejeitado");
  const emAnalise = myEvidences.filter(e => e.status === "enviado");
  const validados = myEvidences.filter(e => e.status === "validado");

  if (isMyEvidencesLoading) return <FullPageLoader />;

  return (
    <div className="min-h-screen flex flex-col bg-background texture-concrete">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/voluntario/eu")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-base font-bold">Meus Registros</h1>
          </div>
          <span className="text-xs text-muted-foreground font-mono">{myEvidences.length}</span>
        </div>
      </header>

      {/* Attention banner */}
      {atencao.length > 0 && (
        <div className="mx-4 mt-4 rounded-lg bg-orange-500/10 border border-orange-500/30 px-4 py-3 flex items-start gap-3">
          <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-orange-700 dark:text-orange-400">
            <strong>{atencao.length}</strong> {atencao.length === 1 ? "registro precisa" : "registros precisam"} de atenção.
          </p>
        </div>
      )}

      <main className="flex-1 px-4 py-4">
        <Tabs defaultValue={atencao.length > 0 ? "atencao" : "todos"}>
          <TabsList className="w-full mb-4">
            <TabsTrigger value="todos" className="flex-1 text-xs">
              Todos {myEvidences.length > 0 && `(${myEvidences.length})`}
            </TabsTrigger>
            <TabsTrigger value="atencao" className="flex-1 text-xs relative">
              Atenção
              {atencao.length > 0 && (
                <span className="ml-1 inline-flex items-center justify-center h-4 w-4 rounded-full bg-orange-500 text-white text-[10px] font-bold">
                  {atencao.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="analise" className="flex-1 text-xs">
              Análise {emAnalise.length > 0 && `(${emAnalise.length})`}
            </TabsTrigger>
            <TabsTrigger value="validados" className="flex-1 text-xs">
              Válidos {validados.length > 0 && `(${validados.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="todos" className="space-y-3">
            {myEvidences.length === 0
              ? <EmptyState message="Você ainda não enviou nenhum registro." />
              : myEvidences.map(e => <RegistroCard key={e.id} evidence={e} />)
            }
          </TabsContent>

          <TabsContent value="atencao" className="space-y-3">
            {atencao.length === 0
              ? <EmptyState message="Nenhum registro precisa de atenção. Ótimo trabalho!" />
              : atencao.map(e => <RegistroCard key={e.id} evidence={e} />)
            }
          </TabsContent>

          <TabsContent value="analise" className="space-y-3">
            {emAnalise.length === 0
              ? <EmptyState message="Nenhum registro em análise no momento." />
              : emAnalise.map(e => <RegistroCard key={e.id} evidence={e} />)
            }
          </TabsContent>

          <TabsContent value="validados" className="space-y-3">
            {validados.length === 0
              ? <EmptyState message="Nenhum registro validado ainda." />
              : validados.map(e => <RegistroCard key={e.id} evidence={e} />)
            }
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
