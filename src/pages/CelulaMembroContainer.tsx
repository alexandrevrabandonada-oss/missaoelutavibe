/**
 * CelulaMembroContainer - Cell view for members (F12.1b)
 * 
 * Membership check: only approved members can access.
 * Tabs: Visão | Missões | Mural | Memória
 * Tabs controlled by React state — no DOM manipulation.
 */

import { useParams, Link, useSearchParams } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCelulaMembroData } from "@/hooks/useCelulaMembroData";
import { ArrowLeft, Clock, MapPin, ShieldX, UserX } from "lucide-react";
import { FullPageLoader } from "@/components/ui/LoadingSpinner";
import { CelulaMembroVisao } from "@/components/celula/CelulaMembroVisao";
import { CelulaMembroMissoes } from "@/components/celula/CelulaMembroMissoes";
import { CelulaMembroMural } from "@/components/celula/CelulaMembroMural";
import { CelulaMembroMemoria } from "@/components/celula/CelulaMembroMemoria";
import { useCallback } from "react";

// ─────────────────────────────────────────────────────────────
// Tab type
// ─────────────────────────────────────────────────────────────

type CelulaTab = "visao" | "missoes" | "mural" | "memoria";
const VALID_TABS: CelulaTab[] = ["visao", "missoes", "mural", "memoria"];

// ─────────────────────────────────────────────────────────────
// Edge states
// ─────────────────────────────────────────────────────────────

function NotMemberState() {
  return (
    <AppShell>
      <div className="p-4 max-w-lg mx-auto w-full flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="p-4 rounded-full bg-muted mb-4">
          <UserX className="h-10 w-10 text-muted-foreground" />
        </div>
        <h1 className="heading-luta text-xl mb-2">Você não é membro desta célula</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Fale com a coordenação para ser atribuído a uma célula.
        </p>
        <Link to="/voluntario/hoje">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </Link>
      </div>
    </AppShell>
  );
}

function PendingMemberState({ status }: { status: string }) {
  const messages: Record<string, { title: string; desc: string }> = {
    pendente: {
      title: "Solicitação pendente",
      desc: "Sua entrada nesta célula ainda está aguardando aprovação da coordenação.",
    },
    rejeitado: {
      title: "Acesso não aprovado",
      desc: "Sua solicitação para esta célula não foi aprovada. Fale com a coordenação.",
    },
    removido: {
      title: "Acesso removido",
      desc: "Você foi removido desta célula. Fale com a coordenação se isso foi um engano.",
    },
  };

  const msg = messages[status] || messages.pendente;

  return (
    <AppShell>
      <div className="p-4 max-w-lg mx-auto w-full flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="p-4 rounded-full bg-muted mb-4">
          {status === "pendente" ? (
            <Clock className="h-10 w-10 text-muted-foreground" />
          ) : (
            <ShieldX className="h-10 w-10 text-destructive" />
          )}
        </div>
        <h1 className="heading-luta text-xl mb-2">{msg.title}</h1>
        <p className="text-sm text-muted-foreground mb-6">{msg.desc}</p>
        <Link to="/voluntario/hoje">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </Link>
      </div>
    </AppShell>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

export default function CelulaMembroContainer() {
  const { cellId } = useParams<{ cellId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") ?? "";
  const activeTab: CelulaTab = VALID_TABS.includes(tabParam as CelulaTab) ? (tabParam as CelulaTab) : "visao";

  // Tab is fully URL-controlled. setActiveTab updates ?tab= in the URL.
  const setActiveTab = useCallback((tab: CelulaTab) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (tab === "visao") {
        next.delete("tab");
      } else {
        next.set("tab", tab);
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const {
    membership,
    isLoadingMembership,
    cycle,
    isLoadingCycle,
    personalStats,
    isLoadingStats,
    missions,
    isLoadingMissions,
  } = useCelulaMembroData(cellId);

  // Stable callbacks for child components
  const goToMural = useCallback(() => setActiveTab("mural"), []);
  const goToMissoes = useCallback(() => setActiveTab("missoes"), []);

  // Loading
  if (isLoadingMembership) {
    return <FullPageLoader text="Carregando célula..." />;
  }

  // Not a member at all
  if (!membership) {
    return <NotMemberState />;
  }

  // Member but not approved
  if (membership.status !== "aprovado") {
    return <PendingMemberState status={membership.status || "pendente"} />;
  }

  return (
    <AppShell>
      <div className="p-4 space-y-4 pb-20 max-w-lg mx-auto w-full">
        {/* Header — F12 enriched */}
        <div>
          <div className="flex items-center gap-3">
            <Link to="/voluntario/hoje">
              <Button variant="ghost" size="icon" className="shrink-0">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="min-w-0 flex-1">
              <h1 className="heading-luta text-xl truncate">{membership.cellName}</h1>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">
                  {membership.neighborhood
                    ? `${membership.neighborhood} — ${membership.city}/${membership.state}`
                    : `${membership.city}/${membership.state}`}
                </span>
              </div>
            </div>
            {cycle && (
              <Badge variant="secondary" className="text-[10px] shrink-0">
                {cycle.isCityFallback ? "Ciclo cidade" : "Ciclo ativo"}
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground/70 mt-2 ml-12">
            Aqui sua atuação local ganha forma, memória e missão.
          </p>
        </div>

        {/* Tabs — URL is the source of truth (?tab=) */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as CelulaTab)} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="visao">Visão</TabsTrigger>
            <TabsTrigger value="missoes">Missões</TabsTrigger>
            <TabsTrigger value="mural">Mural</TabsTrigger>
            <TabsTrigger value="memoria">Memória</TabsTrigger>
          </TabsList>

          <TabsContent value="visao" className="mt-4">
            <CelulaMembroVisao
              cycle={cycle}
              isLoadingCycle={isLoadingCycle}
              stats={personalStats}
              isLoadingStats={isLoadingStats}
              missions={missions}
              isLoadingMissions={isLoadingMissions}
              onGoToMural={goToMural}
              onGoToMissoes={goToMissoes}
            />
          </TabsContent>

          <TabsContent value="missoes" className="mt-4">
            <CelulaMembroMissoes
              missions={missions}
              isLoading={isLoadingMissions}
            />
          </TabsContent>

          <TabsContent value="mural" className="mt-4">
            {cellId && <CelulaMembroMural cellId={cellId} />}
          </TabsContent>

          <TabsContent value="memoria" className="mt-4">
            {cellId && <CelulaMembroMemoria cellId={cellId} />}
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
