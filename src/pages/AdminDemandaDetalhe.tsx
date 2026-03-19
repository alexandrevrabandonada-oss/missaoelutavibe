import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useDemandas, DEMANDA_STATUS_LABELS, DEMANDA_TIPO_LABELS, DEMANDA_PRIORIDADE_LABELS, DemandaStatus } from "@/hooks/useDemandas";
import { useDemandasUpdates } from "@/hooks/useDemandasUpdates";
import { useMissions } from "@/hooks/useMissions";
import { useCiclos } from "@/hooks/useCiclos";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/button";
import { FullPageLoader, LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  MessageSquare,
  MapPin,
  Phone,
  Calendar,
  User,
  Clock,
  Send,
  CheckCircle2,
  Archive,
  UserCheck,
  Target,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type MissionType = Database["public"]["Enums"]["mission_type"];

const MISSION_TYPES: { value: MissionType; label: string }[] = [
  { value: "escuta", label: "Escuta" },
  { value: "rua", label: "Rua" },
  { value: "mobilizacao", label: "Mobilização" },
  { value: "conteudo", label: "Conteúdo" },
  { value: "dados", label: "Dados" },
  { value: "formacao", label: "Formação" },
];

export default function AdminDemandaDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isCoordinator, getScope, isMasterAdmin, isLoading: rolesLoading } = useUserRoles();
  const { allDemandas, isLoadingAll, updateDemanda, isUpdating } = useDemandas();
  const { updates, isLoading: updatesLoading, createUpdate, isCreating } = useDemandasUpdates(id);
  const { createMission, isCreating: isCreatingMission } = useMissions();
  const { ciclos, activeCycle, getCyclesForScope, isLoading: ciclosLoading } = useCiclos();
  const { toast } = useToast();
  const scope = getScope();

  const [newMessage, setNewMessage] = useState("");
  const [isVisibleToVolunteer, setIsVisibleToVolunteer] = useState(true);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showMissionDialog, setShowMissionDialog] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<DemandaStatus | "">("");
  const [prazo, setPrazo] = useState("");
  
  // Mission creation form
  const [missionForm, setMissionForm] = useState({
    title: "",
    description: "",
    type: "mobilizacao" as MissionType,
    ciclo_id: "",
  });

  const demanda = allDemandas.find((d) => d.id === id);

  // Get available cycles for this admin's scope
  const availableCycles = useMemo(() => {
    if (isMasterAdmin()) return ciclos.filter(c => c.status === "ativo" || c.status === "rascunho");
    return getCyclesForScope(scope.cidade, scope.cellId).filter(c => c.status === "ativo" || c.status === "rascunho");
  }, [ciclos, scope, isMasterAdmin, getCyclesForScope]);

  useEffect(() => {
    if (demanda) {
      setSelectedStatus(demanda.status);
      setPrazo(demanda.prazo ? format(new Date(demanda.prazo), "yyyy-MM-dd") : "");
      setMissionForm({
        title: demanda.titulo,
        description: demanda.descricao,
        type: "mobilizacao",
        ciclo_id: activeCycle?.id ?? "",
      });
    }
  }, [demanda, activeCycle]);

  if (rolesLoading || isLoadingAll || ciclosLoading) {
    return <FullPageLoader />;
  }

  if (!isCoordinator()) {
    navigate("/admin");
    return null;
  }

  if (!demanda) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background texture-concrete">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h1 className="text-xl font-bold mb-2">Demanda não encontrada</h1>
        <Button onClick={() => navigate("/admin")}>Voltar</Button>
      </div>
    );
  }

  const handleQuickAction = async (action: "assign" | "conclude" | "archive") => {
    try {
      let updates: any = {};
      let message = "";

      switch (action) {
        case "assign":
          updates = { atribuida_para: user?.id, status: "atribuida" as DemandaStatus };
          message = "Demanda atribuída a você!";
          break;
        case "conclude":
          updates = { status: "concluida" as DemandaStatus };
          message = "Demanda concluída!";
          break;
        case "archive":
          updates = { status: "arquivada" as DemandaStatus };
          message = "Demanda arquivada!";
          break;
      }

      await updateDemanda({ id: demanda.id, ...updates });
      toast({ title: message });
    } catch (error) {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedStatus) return;
    try {
      await updateDemanda({
        id: demanda.id,
        status: selectedStatus,
        prazo: prazo ? new Date(prazo).toISOString() : null,
      });
      toast({ title: "Status atualizado!" });
      setShowStatusDialog(false);
    } catch (error) {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    try {
      await createUpdate({
        demanda_id: demanda.id,
        mensagem: newMessage,
        visivel_para_voluntario: isVisibleToVolunteer,
      });
      setNewMessage("");
      toast({ title: "Mensagem enviada!" });
    } catch (error) {
      toast({ title: "Erro ao enviar mensagem", variant: "destructive" });
    }
  };

  const handleCreateMission = async () => {
    if (!missionForm.title.trim()) {
      toast({ title: "Título é obrigatório", variant: "destructive" });
      return;
    }

    // Validate scope
    if (!isMasterAdmin() && missionForm.ciclo_id) {
      const selectedCycle = ciclos.find(c => c.id === missionForm.ciclo_id);
      if (selectedCycle) {
        if (scope.type === "cidade" && selectedCycle.cidade !== scope.cidade) {
          toast({ 
            title: "Fora do escopo", 
            description: "Você não pode criar missões para ciclos de outra cidade.",
            variant: "destructive" 
          });
          return;
        }
      }
    }

    try {
      await createMission({
        title: missionForm.title,
        description: missionForm.description || null,
        type: missionForm.type,
        ciclo_id: missionForm.ciclo_id || null,
        demanda_origem_id: demanda.id, // Link to origin demand - triggers notification
        status: "publicada",
        requires_validation: true,
      });
      await updateDemanda({ id: demanda.id, status: "atribuida" });
      toast({ 
        title: "Missão criada! 🎯", 
        description: "O autor da demanda foi notificado automaticamente." 
      });
      setShowMissionDialog(false);
      navigate("/admin");
    } catch (error) {
      toast({ title: "Erro ao criar missão", variant: "destructive" });
    }
  };

  const getPrioridadeColor = (prioridade: string) => {
    switch (prioridade) {
      case "alta":
        return "text-destructive bg-destructive/10";
      case "media":
        return "text-primary bg-primary/10";
      default:
        return "text-muted-foreground bg-muted";
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background texture-concrete">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border p-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <Logo size="sm" />
          </div>
        </div>
      </header>

      <div className="flex-1 p-4 space-y-6 animate-slide-up">
        {/* Title */}
        <div>
          <div className="flex items-center gap-2 text-primary mb-2">
            <MessageSquare className="h-5 w-5" />
            <span className="text-sm uppercase tracking-wider font-bold">Detalhe da Demanda</span>
          </div>
          <h1 className="text-2xl font-bold">{demanda.titulo}</h1>
          <p className="text-muted-foreground text-sm">
            Criada em {format(new Date(demanda.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        </div>

        {/* Info Card */}
        <div className="card-luta space-y-4">
          <p className="text-foreground">{demanda.descricao}</p>

          <div className="flex flex-wrap gap-2">
            <span className="text-xs px-2 py-1 bg-secondary rounded-full">
              {DEMANDA_TIPO_LABELS[demanda.tipo as keyof typeof DEMANDA_TIPO_LABELS]}
            </span>
            <span className="text-xs px-2 py-1 bg-primary/20 text-primary rounded-full">
              {DEMANDA_STATUS_LABELS[demanda.status as keyof typeof DEMANDA_STATUS_LABELS]}
            </span>
            <span className={`text-xs px-2 py-1 rounded-full ${getPrioridadeColor(demanda.prioridade)}`}>
              {DEMANDA_PRIORIDADE_LABELS[demanda.prioridade as keyof typeof DEMANDA_PRIORIDADE_LABELS]}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            {demanda.territorio && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{demanda.territorio}</span>
              </div>
            )}
            {demanda.contato && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{demanda.contato}</span>
              </div>
            )}
            {demanda.prazo && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Prazo: {format(new Date(demanda.prazo), "dd/MM/yyyy")}</span>
              </div>
            )}
            {demanda.atribuida_para && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                <span>Atribuída</span>
              </div>
            )}
          </div>

          {demanda.resolucao && (
            <div className="pt-4 border-t border-border">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Resolução</p>
              <p className="text-sm">{demanda.resolucao}</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="card-luta">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Ações Rápidas</p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickAction("assign")}
              disabled={isUpdating || demanda.atribuida_para === user?.id}
            >
              <UserCheck className="h-4 w-4 mr-2" />
              Atribuir a mim
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowStatusDialog(true)}>
              <Clock className="h-4 w-4 mr-2" />
              Mudar status
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickAction("conclude")}
              disabled={isUpdating || demanda.status === "concluida"}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Concluir
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickAction("archive")}
              disabled={isUpdating || demanda.status === "arquivada"}
            >
              <Archive className="h-4 w-4 mr-2" />
              Arquivar
            </Button>
            <Button
              variant="default"
              size="sm"
              className="col-span-2"
              onClick={() => setShowMissionDialog(true)}
            >
              <Target className="h-4 w-4 mr-2" />
              Transformar em Missão
            </Button>
          </div>
        </div>

        {/* Updates/History */}
        <div className="card-luta">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
            Histórico / Comentários
          </p>

          {updatesLoading ? (
            <LoadingSpinner size="sm" />
          ) : updates.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">Nenhum comentário ainda</p>
          ) : (
            <div className="space-y-3 mb-4">
              {updates.map((update) => (
                <div
                  key={update.id}
                  className={`p-3 rounded-lg ${
                    update.visivel_para_voluntario ? "bg-primary/10 border border-primary/30" : "bg-muted"
                  }`}
                >
                  <p className="text-sm">{update.mensagem}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {format(new Date(update.created_at), "dd/MM/yyyy HH:mm")}
                    {update.visivel_para_voluntario && (
                      <span className="text-primary font-medium">• Visível para voluntário</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Comment */}
          <div className="space-y-3 pt-4 border-t border-border">
            <Textarea
              placeholder="Escreva uma resposta..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              rows={3}
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="visible"
                  checked={isVisibleToVolunteer}
                  onCheckedChange={(checked) => setIsVisibleToVolunteer(checked as boolean)}
                />
                <Label htmlFor="visible" className="text-sm">
                  Visível para o voluntário
                </Label>
              </div>
              <Button size="sm" onClick={handleSendMessage} disabled={isCreating || !newMessage.trim()}>
                {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Enviar
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Status Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Status</DialogTitle>
            <DialogDescription>Atualize o status e prazo da demanda</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as DemandaStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DEMANDA_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prazo (opcional)</Label>
              <Input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleStatusUpdate} disabled={isUpdating}>
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Mission Dialog - Enhanced */}
      <Dialog open={showMissionDialog} onOpenChange={setShowMissionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Transformar em Missão
            </DialogTitle>
            <DialogDescription>
              Uma nova missão será criada a partir desta demanda. O autor será notificado automaticamente.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Cycle Selector */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Vincular ao Ciclo
              </Label>
              <Select 
                value={missionForm.ciclo_id} 
                onValueChange={(v) => setMissionForm({ ...missionForm, ciclo_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um ciclo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">
                    <span className="flex items-center gap-2">
                      <AlertTriangle className="h-3 w-3 text-yellow-500" />
                      Sem ciclo (fora da cadência)
                    </span>
                  </SelectItem>
                  {availableCycles.map((cycle) => (
                    <SelectItem key={cycle.id} value={cycle.id}>
                      {cycle.titulo} {cycle.status === "ativo" && "(✓ Ativo)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!missionForm.ciclo_id && (
                <p className="text-xs text-yellow-600">
                  ⚠️ Missões sem ciclo não aparecem na "Semana" do voluntário.
                </p>
              )}
              {activeCycle && missionForm.ciclo_id === activeCycle.id && (
                <Badge variant="outline" className="text-xs bg-primary/10">
                  <Calendar className="h-3 w-3 mr-1" />
                  {format(new Date(activeCycle.inicio), "dd/MM", { locale: ptBR })} – {format(new Date(activeCycle.fim), "dd/MM", { locale: ptBR })}
                </Badge>
              )}
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label>Título da Missão</Label>
              <Input
                value={missionForm.title}
                onChange={(e) => setMissionForm({ ...missionForm, title: e.target.value })}
                placeholder="Título da missão"
              />
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select 
                value={missionForm.type} 
                onValueChange={(v) => setMissionForm({ ...missionForm, type: v as MissionType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MISSION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={missionForm.description}
                onChange={(e) => setMissionForm({ ...missionForm, description: e.target.value })}
                placeholder="Descrição da missão..."
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMissionDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateMission} disabled={isCreatingMission}>
              {isCreatingMission ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar Missão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <p className="signature-luta text-center py-4">#ÉLUTA — Escutar • Cuidar • Organizar</p>
    </div>
  );
}
