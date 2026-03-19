import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  useCRMContacts, 
  useCRMContato, 
  useCRMMutations, 
  CRM_STATUS_OPTIONS, 
  CRM_INTERACAO_OPTIONS,
  CRM_TAG_SUGGESTIONS,
  CRMContato 
} from "@/hooks/useCRM";
import { useUserRoles } from "@/hooks/useUserRoles";
import { Database } from "@/integrations/supabase/types";
import { 
  ArrowLeft, 
  Plus, 
  Search, 
  UserCircle, 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  AlertCircle,
  ChevronRight,
  MessageSquare,
  CalendarIcon,
  X,
  Edit,
  Users,
  Filter,
  FileText
} from "lucide-react";
import { format, isPast, isToday, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

type CRMContatoStatus = Database["public"]["Enums"]["crm_contato_status"];
type CRMInteracaoTipo = Database["public"]["Enums"]["crm_interacao_tipo"];

export default function AdminCRM() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedContatoId = searchParams.get("contato");
  const { isCoordinator } = useUserRoles();

  const [activeTab, setActiveTab] = useState("pipeline");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Fetch all contacts
  const { data: contatos, isLoading } = useCRMContacts();
  const { contato: selectedContato, interacoes, refetch: refetchContato } = useCRMContato(selectedContatoId ?? undefined);
  const { updateStatus, updateContato, addInteracao } = useCRMMutations();

  // Filter contacts
  const filteredContatos = useMemo(() => {
    return contatos?.filter((c) => {
      const matchesSearch = c.nome.toLowerCase().includes(search.toLowerCase()) ||
        c.bairro?.toLowerCase().includes(search.toLowerCase()) ||
        c.cidade.toLowerCase().includes(search.toLowerCase()) ||
        c.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
      const matchesStatus = filterStatus === "all" || c.status === filterStatus;
      return matchesSearch && matchesStatus;
    }) ?? [];
  }, [contatos, search, filterStatus]);

  // Group by status for pipeline
  const pipeline = useMemo(() => {
    const groups: Record<CRMContatoStatus, CRMContato[]> = {
      novo: [],
      contatar: [],
      em_conversa: [],
      confirmado: [],
      convertido: [],
      inativo: [],
      reagendado: [],
      perdido: [],
    };
    filteredContatos.forEach((c) => {
      groups[c.status].push(c);
    });
    return groups;
  }, [filteredContatos]);

  // Follow-ups
  const followups = useMemo(() => {
    const now = new Date();
    const in7Days = addDays(now, 7);
    
    const overdue = (contatos ?? []).filter(
      (c) => c.proxima_acao_em && isPast(new Date(c.proxima_acao_em)) && !isToday(new Date(c.proxima_acao_em))
    );
    const today = (contatos ?? []).filter(
      (c) => c.proxima_acao_em && isToday(new Date(c.proxima_acao_em))
    );
    const upcoming = (contatos ?? []).filter(
      (c) => c.proxima_acao_em && new Date(c.proxima_acao_em) > now && new Date(c.proxima_acao_em) <= in7Days && !isToday(new Date(c.proxima_acao_em))
    );

    return { overdue, today, upcoming };
  }, [contatos]);

  const closeContatoDetail = () => {
    searchParams.delete("contato");
    setSearchParams(searchParams);
  };

  const openContatoDetail = (id: string) => {
    searchParams.set("contato", id);
    setSearchParams(searchParams);
  };

  const getStatusColor = (status: CRMContatoStatus) => {
    return CRM_STATUS_OPTIONS.find((s) => s.value === status)?.color ?? "bg-gray-500";
  };

  const getStatusLabel = (status: CRMContatoStatus) => {
    return CRM_STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;
  };

  if (!isCoordinator()) {
    navigate("/voluntario/crm");
    return null;
  }

  return (
    <AppShell>
      <div className="p-4 pb-20 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">CRM Apoiadores</h1>
              <p className="text-sm text-muted-foreground">
                {contatos?.length ?? 0} contatos no território
              </p>
            </div>
          </div>
          <Button onClick={() => navigate("/voluntario/crm/novo")}>
            <Plus className="h-4 w-4 mr-2" />
            Novo
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="pipeline" className="flex-1">Pipeline</TabsTrigger>
            <TabsTrigger value="followup" className="flex-1">
              Follow-ups
              {(followups.overdue.length + followups.today.length) > 0 && (
                <Badge variant="destructive" className="ml-1 text-xs">
                  {followups.overdue.length + followups.today.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="lista" className="flex-1">Lista</TabsTrigger>
          </TabsList>

          {/* Pipeline View */}
          <TabsContent value="pipeline" className="mt-4">
            <div className="overflow-x-auto -mx-4 px-4">
              <div className="flex gap-3 min-w-max">
                {CRM_STATUS_OPTIONS.filter(s => s.value !== "inativo").map((statusOpt) => (
                  <div key={statusOpt.value} className="w-64 flex-shrink-0">
                    <div className={`rounded-t-lg p-2 ${statusOpt.color}`}>
                      <span className="text-white font-medium text-sm">
                        {statusOpt.label} ({pipeline[statusOpt.value]?.length ?? 0})
                      </span>
                    </div>
                    <div className="bg-muted/50 rounded-b-lg p-2 space-y-2 min-h-[200px]">
                      {pipeline[statusOpt.value]?.map((c) => (
                        <PipelineCard
                          key={c.id}
                          contato={c}
                          onClick={() => openContatoDetail(c.id)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Follow-ups View */}
          <TabsContent value="followup" className="mt-4 space-y-4">
            {followups.overdue.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-destructive mb-2 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  Atrasados ({followups.overdue.length})
                </h3>
                <div className="space-y-2">
                  {followups.overdue.map((c) => (
                    <FollowupCard
                      key={c.id}
                      contato={c}
                      variant="overdue"
                      onClick={() => openContatoDetail(c.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {followups.today.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-orange-500 mb-2 flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Hoje ({followups.today.length})
                </h3>
                <div className="space-y-2">
                  {followups.today.map((c) => (
                    <FollowupCard
                      key={c.id}
                      contato={c}
                      variant="today"
                      onClick={() => openContatoDetail(c.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {followups.upcoming.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-muted-foreground mb-2 flex items-center gap-1">
                  <CalendarIcon className="h-4 w-4" />
                  Próximos 7 dias ({followups.upcoming.length})
                </h3>
                <div className="space-y-2">
                  {followups.upcoming.map((c) => (
                    <FollowupCard
                      key={c.id}
                      contato={c}
                      variant="upcoming"
                      onClick={() => openContatoDetail(c.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {followups.overdue.length === 0 && followups.today.length === 0 && followups.upcoming.length === 0 && (
              <div className="py-8 text-center text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum follow-up agendado</p>
              </div>
            )}
          </TabsContent>

          {/* Lista View */}
          <TabsContent value="lista" className="mt-4 space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar nome, bairro, cidade, tag..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {CRM_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">Carregando...</div>
            ) : filteredContatos.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum contato encontrado</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredContatos.map((c) => (
                  <ListCard
                    key={c.id}
                    contato={c}
                    getStatusColor={getStatusColor}
                    getStatusLabel={getStatusLabel}
                    onClick={() => openContatoDetail(c.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Contact Detail Dialog */}
        <ContatoDetailDialog
          contato={selectedContato}
          interacoes={interacoes}
          open={!!selectedContatoId}
          onClose={closeContatoDetail}
          onStatusChange={async (status) => {
            await updateStatus.mutateAsync({ id: selectedContatoId!, status });
            refetchContato();
          }}
          onAddInteracao={async (tipo, nota) => {
            await addInteracao.mutateAsync({ contato_id: selectedContatoId!, tipo, nota });
            refetchContato();
          }}
          onUpdateProximaAcao={async (date) => {
            await updateContato.mutateAsync({ id: selectedContatoId!, proxima_acao_em: date?.toISOString() ?? null });
            refetchContato();
          }}
        />
      </div>
    </AppShell>
  );
}

// Pipeline Card
function PipelineCard({ contato, onClick }: { contato: CRMContato; onClick: () => void }) {
  const isOverdue = contato.proxima_acao_em && isPast(new Date(contato.proxima_acao_em));

  return (
    <Card 
      className={`cursor-pointer hover:border-primary/50 transition-colors ${isOverdue ? "border-destructive/50" : ""}`}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <p className="font-medium text-sm truncate">{contato.nome}</p>
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
          <MapPin className="h-3 w-3" />
          <span className="truncate">{contato.bairro || contato.cidade}</span>
        </div>
        {contato.proxima_acao_em && (
          <div className={`flex items-center gap-1 text-xs mt-1 ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
            <Clock className="h-3 w-3" />
            {format(new Date(contato.proxima_acao_em), "dd/MM", { locale: ptBR })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Followup Card
function FollowupCard({ contato, variant, onClick }: { contato: CRMContato; variant: "overdue" | "today" | "upcoming"; onClick: () => void }) {
  const borderColor = variant === "overdue" ? "border-destructive/50" : variant === "today" ? "border-orange-500/50" : "";

  return (
    <Card className={`cursor-pointer hover:border-primary/50 transition-colors ${borderColor}`} onClick={onClick}>
      <CardContent className="py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">{contato.nome}</p>
            <p className="text-sm text-muted-foreground">
              {contato.bairro ? `${contato.bairro}, ` : ""}{contato.cidade}
            </p>
          </div>
          <div className="text-right text-sm">
            <p className={variant === "overdue" ? "text-destructive" : variant === "today" ? "text-orange-500" : "text-muted-foreground"}>
              {format(new Date(contato.proxima_acao_em!), "dd/MM HH:mm", { locale: ptBR })}
            </p>
            {contato.telefone && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                <Phone className="h-3 w-3" />
                {contato.telefone}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// List Card
function ListCard({ contato, getStatusColor, getStatusLabel, onClick }: { contato: CRMContato; getStatusColor: (s: CRMContatoStatus) => string; getStatusLabel: (s: CRMContatoStatus) => string; onClick: () => void }) {
  return (
    <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={onClick}>
      <CardContent className="py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium truncate">{contato.nome}</p>
              <Badge className={`${getStatusColor(contato.status)} text-white text-xs`}>
                {getStatusLabel(contato.status)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {contato.bairro ? `${contato.bairro}, ` : ""}{contato.cidade}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}

// Contact Detail Dialog
function ContatoDetailDialog({
  contato,
  interacoes,
  open,
  onClose,
  onStatusChange,
  onAddInteracao,
  onUpdateProximaAcao,
}: {
  contato: CRMContato | undefined;
  interacoes: any[];
  open: boolean;
  onClose: () => void;
  onStatusChange: (status: CRMContatoStatus) => Promise<void>;
  onAddInteracao: (tipo: CRMInteracaoTipo, nota: string) => Promise<void>;
  onUpdateProximaAcao: (date: Date | null) => Promise<void>;
}) {
  const [interacaoTipo, setInteracaoTipo] = useState<CRMInteracaoTipo>("whatsapp");
  const [interacaoNota, setInteracaoNota] = useState("");
  const [showInteracaoForm, setShowInteracaoForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleAddInteracao = async () => {
    if (!interacaoNota.trim()) return;
    await onAddInteracao(interacaoTipo, interacaoNota.trim());
    setInteracaoNota("");
    setShowInteracaoForm(false);
  };

  const handleSetProximaAcao = async () => {
    await onUpdateProximaAcao(selectedDate ?? null);
    setShowDatePicker(false);
  };

  if (!contato) return null;

  const getStatusColor = (status: CRMContatoStatus) => {
    return CRM_STATUS_OPTIONS.find((s) => s.value === status)?.color ?? "bg-gray-500";
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl">{contato.nome}</DialogTitle>
              <DialogDescription>
                {contato.bairro ? `${contato.bairro}, ` : ""}{contato.cidade}
              </DialogDescription>
            </div>
            <Badge className={`${getStatusColor(contato.status)} text-white`}>
              {CRM_STATUS_OPTIONS.find(s => s.value === contato.status)?.label}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Contact Info */}
          <div className="space-y-2">
            {contato.telefone && (
              <a href={`tel:${contato.telefone}`} className="flex items-center gap-2 text-sm hover:text-primary">
                <Phone className="h-4 w-4" />
                {contato.telefone}
              </a>
            )}
            {contato.email && (
              <a href={`mailto:${contato.email}`} className="flex items-center gap-2 text-sm hover:text-primary">
                <Mail className="h-4 w-4" />
                {contato.email}
              </a>
            )}
          </div>

          {/* Tags */}
          {contato.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {contato.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Observação */}
          {contato.observacao && (
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm">{contato.observacao}</p>
            </div>
          )}

          {/* Próxima Ação */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>Próxima ação:</span>
              {contato.proxima_acao_em ? (
                <span className={isPast(new Date(contato.proxima_acao_em)) ? "text-destructive" : ""}>
                  {format(new Date(contato.proxima_acao_em), "dd/MM/yy HH:mm", { locale: ptBR })}
                </span>
              ) : (
                <span className="text-muted-foreground">Não definida</span>
              )}
            </div>
            <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <CalendarIcon className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  locale={ptBR}
                />
                <div className="p-3 border-t flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setShowDatePicker(false)}>
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={handleSetProximaAcao}>
                    {selectedDate ? "Definir" : "Limpar"}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Status Change */}
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Alterar Status</Label>
            <div className="flex flex-wrap gap-2">
              {CRM_STATUS_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  variant={contato.status === opt.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => onStatusChange(opt.value)}
                  className={contato.status === opt.value ? opt.color : ""}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Add Interação */}
          <div className="border-t pt-4">
            {!showInteracaoForm ? (
              <Button variant="outline" className="w-full" onClick={() => setShowInteracaoForm(true)}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Registrar Interação
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Select value={interacaoTipo} onValueChange={(v) => setInteracaoTipo(v as CRMInteracaoTipo)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CRM_INTERACAO_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" onClick={() => setShowInteracaoForm(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <Textarea
                  placeholder="Descreva a interação..."
                  value={interacaoNota}
                  onChange={(e) => setInteracaoNota(e.target.value)}
                  rows={2}
                />
                <Button onClick={handleAddInteracao} disabled={!interacaoNota.trim()}>
                  Salvar Interação
                </Button>
              </div>
            )}
          </div>

          {/* Histórico */}
          {interacoes.length > 0 && (
            <div className="border-t pt-4">
              <Label className="text-sm text-muted-foreground mb-2 block">Histórico</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {interacoes.map((i) => (
                  <div key={i.id} className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>{CRM_INTERACAO_OPTIONS.find(o => o.value === i.tipo)?.label}</span>
                      <span>{format(new Date(i.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}</span>
                    </div>
                    <p className="text-sm">{i.nota}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
