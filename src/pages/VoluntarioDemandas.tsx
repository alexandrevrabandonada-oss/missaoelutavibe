import { useNavigate, Link } from "react-router-dom";
import { useRequireApproval } from "@/hooks/useRequireApproval";
import { useDemandas, DEMANDA_STATUS_LABELS, DEMANDA_TIPO_LABELS, DEMANDA_PRIORIDADE_LABELS } from "@/hooks/useDemandas";
import { useMissionsByDemandas } from "@/hooks/useMissionsByDemanda";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/button";
import { FullPageLoader } from "@/components/ui/LoadingSpinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Plus, 
  MessageSquare,
  Clock,
  CheckCircle2,
  Target,
} from "lucide-react";

export default function VoluntarioDemandas() {
  const { isLoading, hasAccess } = useRequireApproval();
  const { userDemandas, isLoading: demandasLoading } = useDemandas();
  
  // Get missions linked to user's demands
  const demandaIds = userDemandas.map((d) => d.id);
  const { demandaToMission, isLoading: missionsLoading } = useMissionsByDemandas(demandaIds);
  
  const navigate = useNavigate();

  if (isLoading || demandasLoading) {
    return <FullPageLoader />;
  }

  if (!hasAccess) {
    return <FullPageLoader />;
  }

  const demandsByStatus = {
    abertas: userDemandas.filter(d => ["nova", "triagem", "atribuida", "agendada"].includes(d.status)),
    concluidas: userDemandas.filter(d => ["concluida", "arquivada"].includes(d.status)),
  };

  const getPrioridadeColor = (prioridade: string) => {
    switch (prioridade) {
      case "alta": return "text-destructive";
      case "media": return "text-primary";
      default: return "text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-6 bg-background texture-concrete">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/voluntario")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <Logo size="sm" />
        </div>
        <Button onClick={() => navigate("/voluntario/demandas/nova")}>
          <Plus className="h-4 w-4 mr-2" />
          Nova
        </Button>
      </div>

      <div className="flex-1 space-y-6 animate-slide-up">
        {/* Title */}
        <div>
          <div className="flex items-center gap-2 text-primary mb-2">
            <MessageSquare className="h-5 w-5" />
            <span className="text-sm uppercase tracking-wider font-bold">Demandas da Base</span>
          </div>
          <h1 className="text-2xl font-bold">Minhas Demandas</h1>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="abertas" className="flex-1">
          <TabsList className="w-full">
            <TabsTrigger value="abertas" className="flex-1">
              <Clock className="h-4 w-4 mr-2" />
              Abertas ({demandsByStatus.abertas.length})
            </TabsTrigger>
            <TabsTrigger value="concluidas" className="flex-1">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Concluídas ({demandsByStatus.concluidas.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="abertas" className="mt-4 space-y-3">
            {demandsByStatus.abertas.length === 0 ? (
              <EmptyState 
                icon={MessageSquare}
                title="Nenhuma demanda aberta"
                description="Crie uma demanda para comunicar necessidades do território"
                action={
                  <Button onClick={() => navigate("/voluntario/demandas/nova")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Demanda
                  </Button>
                }
              />
            ) : (
              demandsByStatus.abertas.map((demanda) => (
                <DemandaCard 
                  key={demanda.id} 
                  demanda={demanda} 
                  getPrioridadeColor={getPrioridadeColor}
                  onClick={() => navigate(`/voluntario/demandas/${demanda.id}`)}
                  linkedMission={demandaToMission[demanda.id]}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="concluidas" className="mt-4 space-y-3">
            {demandsByStatus.concluidas.length === 0 ? (
              <EmptyState 
                icon={CheckCircle2}
                title="Nenhuma demanda concluída"
                description="Suas demandas resolvidas aparecerão aqui"
              />
            ) : (
              demandsByStatus.concluidas.map((demanda) => (
                <DemandaCard 
                  key={demanda.id} 
                  demanda={demanda} 
                  getPrioridadeColor={getPrioridadeColor}
                  onClick={() => navigate(`/voluntario/demandas/${demanda.id}`)}
                  linkedMission={demandaToMission[demanda.id]}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      <p className="signature-luta mt-8">#ÉLUTA — Escutar • Cuidar • Organizar</p>
    </div>
  );
}

function DemandaCard({ 
  demanda, 
  getPrioridadeColor,
  onClick,
  linkedMission
}: { 
  demanda: any; 
  getPrioridadeColor: (p: string) => string;
  onClick: () => void;
  linkedMission?: any;
}) {
  const navigate = useNavigate();
  
  return (
    <div className="card-luta w-full text-left">
      <button onClick={onClick} className="w-full text-left hover:bg-secondary/80 transition-colors">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-bold text-base">{demanda.titulo}</h3>
          <span className={`text-xs font-bold ${getPrioridadeColor(demanda.prioridade)}`}>
            {DEMANDA_PRIORIDADE_LABELS[demanda.prioridade as keyof typeof DEMANDA_PRIORIDADE_LABELS]}
          </span>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{demanda.descricao}</p>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs px-2 py-1 bg-secondary rounded-full">
            {DEMANDA_TIPO_LABELS[demanda.tipo as keyof typeof DEMANDA_TIPO_LABELS]}
          </span>
          <span className="text-xs px-2 py-1 bg-primary/20 text-primary rounded-full">
            {DEMANDA_STATUS_LABELS[demanda.status as keyof typeof DEMANDA_STATUS_LABELS]}
          </span>
          {demanda.territorio && (
            <span className="text-xs text-muted-foreground">
              📍 {demanda.territorio}
            </span>
          )}
        </div>
      </button>
      
      {/* Linked Mission Badge */}
      {linkedMission && (
        <Link 
          to={`/voluntario/missao/${linkedMission.id}`}
          className="flex items-center gap-2 mt-3 pt-3 border-t border-border text-primary hover:underline text-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 hover:bg-green-500/30">
            <Target className="h-3 w-3 mr-1" />
            Virou Missão
          </Badge>
          <span className="text-xs">Ver missão →</span>
        </Link>
      )}
    </div>
  );
}

function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action 
}: { 
  icon: React.ElementType; 
  title: string; 
  description: string; 
  action?: React.ReactNode;
}) {
  return (
    <div className="card-luta text-center py-8">
      <Icon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
      <h3 className="font-bold text-lg mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm mb-4">{description}</p>
      {action}
    </div>
  );
}
