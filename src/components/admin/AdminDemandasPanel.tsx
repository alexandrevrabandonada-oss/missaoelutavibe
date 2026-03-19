import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDemandas, DEMANDA_STATUS_LABELS, DEMANDA_TIPO_LABELS, DEMANDA_PRIORIDADE_LABELS, DemandaStatus, DemandaTipo, DemandaPrioridade } from "@/hooks/useDemandas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { 
  MessageSquare,
  Search,
  Filter,
  AlertTriangle,
  Clock,
  CheckCircle2,
  MapPin,
  Eye,
  UserCheck
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function AdminDemandasPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { allDemandas, isLoadingAll, updateDemanda, isUpdating, refetch } = useDemandas();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTipo, setFilterTipo] = useState<DemandaTipo | "all">("all");
  const [filterPrioridade, setFilterPrioridade] = useState<DemandaPrioridade | "all">("all");
  const [filterTerritorio, setFilterTerritorio] = useState("");
  
  if (isLoadingAll) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const handleQuickAssign = async (demandaId: string) => {
    try {
      await updateDemanda({
        id: demandaId,
        atribuida_para: user?.id,
        status: "atribuida" as DemandaStatus,
      });
      toast({ title: "Demanda atribuída a você!" });
      refetch();
    } catch (error) {
      toast({ title: "Erro ao atribuir", variant: "destructive" });
    }
  };

  // Filter demandas
  const filteredDemandas = allDemandas.filter((d) => {
    const matchesSearch = 
      d.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.descricao.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTipo = filterTipo === "all" || d.tipo === filterTipo;
    const matchesPrioridade = filterPrioridade === "all" || d.prioridade === filterPrioridade;
    const matchesTerritorio = !filterTerritorio || 
      (d.territorio && d.territorio.toLowerCase().includes(filterTerritorio.toLowerCase()));
    return matchesSearch && matchesTipo && matchesPrioridade && matchesTerritorio;
  });

  // Group by status
  const demandsByStatus = {
    novas: filteredDemandas.filter(d => d.status === "nova"),
    emAndamento: filteredDemandas.filter(d => ["triagem", "atribuida", "agendada"].includes(d.status)),
    concluidas: filteredDemandas.filter(d => ["concluida", "arquivada"].includes(d.status)),
  };

  const getPrioridadeColor = (prioridade: string) => {
    switch (prioridade) {
      case "alta": return "text-destructive bg-destructive/10";
      case "media": return "text-primary bg-primary/10";
      default: return "text-muted-foreground bg-muted";
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-primary mb-2">
          <MessageSquare className="h-5 w-5" />
          <span className="text-sm uppercase tracking-wider font-bold">Demandas da Base</span>
        </div>
        <h1 className="text-2xl font-bold">Gerenciar Demandas</h1>
        <p className="text-muted-foreground">
          {allDemandas.length} demanda{allDemandas.length !== 1 ? "s" : ""} no sistema
        </p>
      </div>

      {/* Filters */}
      <div className="card-luta space-y-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span className="text-sm font-bold uppercase">Filtros</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={filterTipo} onValueChange={(v) => setFilterTipo(v as DemandaTipo | "all")}>
            <SelectTrigger>
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {Object.entries(DEMANDA_TIPO_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterPrioridade} onValueChange={(v) => setFilterPrioridade(v as DemandaPrioridade | "all")}>
            <SelectTrigger>
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as prioridades</SelectItem>
              {Object.entries(DEMANDA_PRIORIDADE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            placeholder="Território..."
            value={filterTerritorio}
            onChange={(e) => setFilterTerritorio(e.target.value)}
          />
        </div>
      </div>

      {/* Tabs by Status */}
      <Tabs defaultValue="novas" className="flex-1">
        <TabsList className="w-full">
          <TabsTrigger value="novas" className="flex-1">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Novas ({demandsByStatus.novas.length})
          </TabsTrigger>
          <TabsTrigger value="emAndamento" className="flex-1">
            <Clock className="h-4 w-4 mr-2" />
            Em Andamento ({demandsByStatus.emAndamento.length})
          </TabsTrigger>
          <TabsTrigger value="concluidas" className="flex-1">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Concluídas ({demandsByStatus.concluidas.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="novas" className="mt-4 space-y-3">
          {demandsByStatus.novas.length === 0 ? (
            <EmptyState message="Nenhuma demanda nova" />
          ) : (
            demandsByStatus.novas.map((demanda) => (
              <DemandaCard 
                key={demanda.id} 
                demanda={demanda} 
                getPrioridadeColor={getPrioridadeColor}
                onView={() => navigate(`/admin/demandas/${demanda.id}`)}
                onQuickAssign={() => handleQuickAssign(demanda.id)}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="emAndamento" className="mt-4 space-y-3">
          {demandsByStatus.emAndamento.length === 0 ? (
            <EmptyState message="Nenhuma demanda em andamento" />
          ) : (
            demandsByStatus.emAndamento.map((demanda) => (
              <DemandaCard 
                key={demanda.id} 
                demanda={demanda} 
                getPrioridadeColor={getPrioridadeColor}
                onView={() => navigate(`/admin/demandas/${demanda.id}`)}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="concluidas" className="mt-4 space-y-3">
          {demandsByStatus.concluidas.length === 0 ? (
            <EmptyState message="Nenhuma demanda concluída" />
          ) : (
            demandsByStatus.concluidas.map((demanda) => (
              <DemandaCard 
                key={demanda.id} 
                demanda={demanda} 
                getPrioridadeColor={getPrioridadeColor}
                onView={() => navigate(`/admin/demandas/${demanda.id}`)}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DemandaCard({ 
  demanda, 
  getPrioridadeColor,
  onView,
  onQuickAssign
}: { 
  demanda: any; 
  getPrioridadeColor: (p: string) => string;
  onView: () => void;
  onQuickAssign?: () => void;
}) {
  const createdAt = new Date(demanda.created_at).toLocaleDateString("pt-BR");

  return (
    <div className="card-luta">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h3 className="font-bold text-base">{demanda.titulo}</h3>
          <p className="text-xs text-muted-foreground">Criada em {createdAt}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${getPrioridadeColor(demanda.prioridade)}`}>
            {DEMANDA_PRIORIDADE_LABELS[demanda.prioridade as keyof typeof DEMANDA_PRIORIDADE_LABELS]}
          </span>
        </div>
      </div>
      
      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{demanda.descricao}</p>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs px-2 py-1 bg-secondary rounded-full">
            {DEMANDA_TIPO_LABELS[demanda.tipo as keyof typeof DEMANDA_TIPO_LABELS]}
          </span>
          <span className="text-xs px-2 py-1 bg-primary/20 text-primary rounded-full">
            {DEMANDA_STATUS_LABELS[demanda.status as keyof typeof DEMANDA_STATUS_LABELS]}
          </span>
          {demanda.territorio && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {demanda.territorio}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {onQuickAssign && (
            <Button size="sm" variant="ghost" onClick={onQuickAssign} title="Atribuir a mim">
              <UserCheck className="h-4 w-4" />
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onView}>
            <Eye className="h-4 w-4 mr-1" />
            Ver
          </Button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="card-luta text-center py-8">
      <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}
