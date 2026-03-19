import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTerritorio, useCidadeCelulas, useCoordInterest, usePendingMemberships, useCidades, CidadeOverview, CoordInterest } from "@/hooks/useTerritorio";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useConvites } from "@/hooks/useConvites";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FullPageLoader, LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { TerritoryLinkQRModal } from "@/components/admin/TerritoryLinkQRModal";
import { TerritoryFunnelTab } from "@/components/admin/TerritoryFunnelTab";
import { ConvertInterestModal } from "@/components/admin/ConvertInterestModal";
import { CellPendingTab } from "@/components/admin/CellPendingTab";
import { useCellPending } from "@/hooks/useCellPending";
import {
  ArrowLeft,
  MapPin,
  Building2,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  RefreshCw,
  Plus,
  ChevronRight,
  UserPlus,
  Hand,
  QrCode,
  BarChart3,
} from "lucide-react";

const ALERT_LABELS: Record<string, { label: string; severity: "error" | "warning" | "info" }> = {
  sem_coord: { label: "Sem coordenador", severity: "error" },
  sem_celula: { label: "Sem células", severity: "warning" },
  crescendo_sem_estrutura: { label: "Crescendo sem estrutura", severity: "error" },
  sem_semana_ativa: { label: "Sem semana ativa", severity: "warning" },
  sem_moderador: { label: "Sem moderador", severity: "warning" },
  sem_atividade: { label: "Sem atividades", severity: "info" },
  pendencias: { label: "Pedidos pendentes", severity: "info" },
};

export default function AdminTerritorio() {
  const navigate = useNavigate();
  const { isCoordinator, isAdmin, isLoading: rolesLoading, getScope } = useUserRoles();
  const { overview, kpis, isLoading, refetch } = useTerritorio();
  const { interests, updateStatus, isUpdating } = useCoordInterest();
  const { pending, decide, isDeciding } = usePendingMemberships();
  const { cidades, createCidade, isCreating } = useCidades();
  const { convitesComUsos } = useConvites();
  const { pending: cellPending } = useCellPending();

  const [activeTab, setActiveTab] = useState("cidades");
  const [ufFilter, setUfFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCidadeId, setSelectedCidadeId] = useState<string | null>(null);
  const [showNewCidadeDialog, setShowNewCidadeDialog] = useState(false);
  const [newCidade, setNewCidade] = useState({ nome: "", uf: "RJ", slug: "" });
  const [qrModalCidade, setQrModalCidade] = useState<CidadeOverview | null>(null);
  const [convertModalInterest, setConvertModalInterest] = useState<CoordInterest | null>(null);

  const { data: celulas, isLoading: celulasLoading } = useCidadeCelulas(selectedCidadeId);

  // Get user's primary invite code for attribution
  const userInviteCode = convitesComUsos.find(c => c.ativo)?.code;

  // Get user scope for filtering
  const scope = getScope();

  if (rolesLoading) {
    return <FullPageLoader text="Carregando..." />;
  }

  if (!isCoordinator()) {
    navigate("/admin");
    return null;
  }

  // Filter overview by search, UF, and status
  const filteredOverview = overview.filter(cidade => {
    if (ufFilter !== "all" && cidade.uf !== ufFilter) return false;
    if (statusFilter !== "all" && cidade.status !== statusFilter) return false;
    if (searchQuery && !cidade.nome.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    // If coord municipal, only show their city
    if (scope.type === "cidade" && cidade.nome !== scope.cidade) return false;
    return true;
  });

  // Filter interests by status
  const pendingInterests = interests.filter(i => i.status === "pendente");

  const handleCreateCidade = () => {
    if (!newCidade.nome) return;
    const slug = newCidade.nome
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-");
    createCidade({ ...newCidade, slug });
    setShowNewCidadeDialog(false);
    setNewCidade({ nome: "", uf: "RJ", slug: "" });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background texture-concrete">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Logo size="sm" />
          </div>
          <div className="flex gap-2">
            <NotificationBell />
            <Button variant="ghost" size="icon" onClick={refetch}>
              <RefreshCw className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 max-w-4xl mx-auto w-full">
        <div className="space-y-6 animate-slide-up">
          {/* Title */}
          <div>
            <div className="flex items-center gap-2 text-primary mb-2">
              <MapPin className="h-5 w-5" />
              <span className="text-sm uppercase tracking-wider font-bold">Território</span>
            </div>
            <h1 className="text-2xl font-bold">Gestão Territorial</h1>
          </div>

          {/* KPIs Summary */}
          {kpis && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="card-luta p-3 text-center">
                <div className="text-2xl font-bold text-destructive">{kpis.cidades_sem_coord}</div>
                <div className="text-xs text-muted-foreground">Cidades sem coord</div>
              </div>
              <div className="card-luta p-3 text-center">
                <div className="text-2xl font-bold text-amber-500">{kpis.celulas_sem_moderador}</div>
                <div className="text-xs text-muted-foreground">Células sem mod</div>
              </div>
              <div className="card-luta p-3 text-center">
                <div className="text-2xl font-bold text-destructive">{kpis.cidades_crescendo_sem_estrutura}</div>
                <div className="text-xs text-muted-foreground">Crescendo s/ estrutura</div>
              </div>
              <div className="card-luta p-3 text-center">
                <div className="text-2xl font-bold text-primary">{kpis.interesses_pendentes}</div>
                <div className="text-xs text-muted-foreground">Interesses pendentes</div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="cidades" className="gap-1">
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">Cidades</span>
              </TabsTrigger>
              <TabsTrigger value="celulas" className="gap-1">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Células</span>
              </TabsTrigger>
              <TabsTrigger value="pendencias" className="gap-1 relative">
                <UserPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Pendências</span>
                {cellPending.length > 0 && (
                  <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {cellPending.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="funil" className="gap-1">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Funil</span>
              </TabsTrigger>
              <TabsTrigger value="fila" className="gap-1 relative">
                <Hand className="h-4 w-4" />
                <span className="hidden sm:inline">Fila</span>
                {pendingInterests.length > 0 && (
                  <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {pendingInterests.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* CIDADES TAB */}
            <TabsContent value="cidades" className="space-y-4 mt-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                <Input
                  placeholder="Buscar cidade..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 min-w-[200px]"
                />
                <Select value={ufFilter} onValueChange={setUfFilter}>
                  <SelectTrigger className="w-24">
                    <SelectValue placeholder="UF" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="RJ">RJ</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="ativa">Ativa</SelectItem>
                    <SelectItem value="piloto">Piloto</SelectItem>
                    <SelectItem value="prioritaria">Prioritária</SelectItem>
                  </SelectContent>
                </Select>
                {isAdmin() && (
                  <Dialog open={showNewCidadeDialog} onOpenChange={setShowNewCidadeDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-1" />
                        Nova Cidade
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Nova Cidade</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <Input
                          placeholder="Nome da cidade"
                          value={newCidade.nome}
                          onChange={(e) => setNewCidade({ ...newCidade, nome: e.target.value })}
                        />
                        <Select value={newCidade.uf} onValueChange={(v) => setNewCidade({ ...newCidade, uf: v })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="RJ">RJ</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button onClick={handleCreateCidade} disabled={isCreating || !newCidade.nome}>
                          {isCreating ? <LoadingSpinner size="sm" /> : "Criar Cidade"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>

              {/* Cities List */}
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <LoadingSpinner />
                </div>
              ) : filteredOverview.length === 0 ? (
                <div className="card-luta text-center py-12">
                  <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhuma cidade encontrada</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredOverview.map((cidade) => (
                    <div
                      key={cidade.cidade_id}
                      className="card-luta cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => {
                        setSelectedCidadeId(cidade.cidade_id);
                        setActiveTab("celulas");
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold">{cidade.nome}</h3>
                            <Badge variant="outline" className="text-xs">{cidade.uf}</Badge>
                            {cidade.has_coord && (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            )}
                          </div>
                          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                            <span>{cidade.celulas_count} células</span>
                            <span>{cidade.voluntarios_aprovados} voluntários</span>
                            <span>{cidade.ativos_7d} ativos 7d</span>
                            {cidade.signups_7d > 0 && (
                              <span className="text-primary flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" />
                                +{cidade.signups_7d} signups
                              </span>
                            )}
                          </div>
                          {cidade.alerts && cidade.alerts.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {cidade.alerts.map((alert) => {
                                const info = ALERT_LABELS[alert] || { label: alert, severity: "info" };
                                return (
                                  <Badge
                                    key={alert}
                                    variant={info.severity === "error" ? "destructive" : "outline"}
                                    className={info.severity === "warning" ? "border-amber-500 text-amber-500" : ""}
                                  >
                                    {info.severity === "error" && <AlertTriangle className="h-3 w-3 mr-1" />}
                                    {info.label}
                                  </Badge>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              setQrModalCidade(cidade);
                            }}
                            title="Gerar Link/QR"
                          >
                            <QrCode className="h-4 w-4" />
                          </Button>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* CÉLULAS TAB */}
            <TabsContent value="celulas" className="space-y-4 mt-4">
              {/* City selector */}
              <div className="flex items-center gap-2">
                <Select value={selectedCidadeId || ""} onValueChange={setSelectedCidadeId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione uma cidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {overview.map((c) => (
                      <SelectItem key={c.cidade_id} value={c.cidade_id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!selectedCidadeId ? (
                <div className="card-luta text-center py-12">
                  <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Selecione uma cidade para ver as células</p>
                </div>
              ) : celulasLoading ? (
                <div className="flex justify-center py-12">
                  <LoadingSpinner />
                </div>
              ) : !celulas || celulas.length === 0 ? (
                <div className="card-luta text-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhuma célula nesta cidade</p>
                  <Button className="mt-4" onClick={() => navigate("/admin/celulas")}>
                    <Plus className="h-4 w-4 mr-1" />
                    Criar Célula
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {celulas.map((celula) => (
                    <div key={celula.id} className="card-luta">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold">{celula.name}</h3>
                            {celula.has_moderador && (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            )}
                            {!celula.is_active && (
                              <Badge variant="secondary">Inativa</Badge>
                            )}
                          </div>
                          {celula.neighborhood && (
                            <p className="text-sm text-muted-foreground">{celula.neighborhood}</p>
                          )}
                          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-1">
                            <span>{celula.membros_aprovados} membros</span>
                            {celula.pendentes > 0 && (
                              <span className="text-primary">{celula.pendentes} pendentes</span>
                            )}
                            <span>{celula.missoes_7d} missões 7d</span>
                            <span>{celula.atividades_7d} atividades 7d</span>
                          </div>
                          {celula.alerts && celula.alerts.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {celula.alerts.map((alert) => {
                                const info = ALERT_LABELS[alert] || { label: alert, severity: "info" };
                                return (
                                  <Badge
                                    key={alert}
                                    variant={info.severity === "error" ? "destructive" : "outline"}
                                    className={info.severity === "warning" ? "border-amber-500 text-amber-500" : ""}
                                  >
                                    {info.label}
                                  </Badge>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <Button variant="outline" size="sm" onClick={() => navigate(`/admin/papeis?cell=${celula.id}`)}>
                          Gerenciar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pending Memberships */}
              {pending.length > 0 && (
                <div className="space-y-2 mt-6">
                  <h3 className="font-bold flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Pedidos de Entrada Pendentes
                  </h3>
                  {pending.map((m) => (
                    <div key={m.id} className="card-luta flex items-center justify-between">
                      <div>
                        <p className="font-medium">{m.profile_nickname || m.profile_name || "Voluntário"}</p>
                        <p className="text-sm text-muted-foreground">
                          Quer entrar em: {m.cell_name}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => decide({ membershipId: m.id, decision: "recusado" })}
                          disabled={isDeciding}
                        >
                          Recusar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => decide({ membershipId: m.id, decision: "aprovado" })}
                          disabled={isDeciding}
                        >
                          Aprovar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* PENDÊNCIAS CÉLULA TAB */}
            <TabsContent value="pendencias" className="mt-4">
              <CellPendingTab />
            </TabsContent>

            {/* FUNIL TAB */}
            <TabsContent value="funil">
              <TerritoryFunnelTab />
            </TabsContent>

            {/* FILA COORD TAB */}
            <TabsContent value="fila" className="space-y-4 mt-4">
              {interests.length === 0 ? (
                <div className="card-luta text-center py-12">
                  <Hand className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhum interesse registrado</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {interests.map((interest) => (
                    <div key={interest.id} className="card-luta">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold">{interest.profile_nickname || interest.profile_name || "Voluntário"}</h3>
                            <Badge
                              variant={interest.status === "pendente" ? "outline" : interest.status === "aprovado" ? "default" : "secondary"}
                            >
                              {interest.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Cidade: {interest.cidade_nome} • {interest.profile_city}
                          </p>
                          {interest.disponibilidade && (
                            <p className="text-sm">Disponibilidade: {interest.disponibilidade}</p>
                          )}
                          {interest.msg && (
                            <p className="text-sm mt-2 bg-secondary/50 p-2 rounded">{interest.msg}</p>
                          )}
                        </div>
                        {interest.status === "pendente" && (
                          <div className="flex flex-col gap-1">
                            <Button
                              size="sm"
                              onClick={() => setConvertModalInterest(interest)}
                            >
                              <Building2 className="h-4 w-4 mr-1" />
                              Criar Célula
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateStatus({ id: interest.id, status: "contatado" })}
                              disabled={isUpdating}
                            >
                              Marcar Contatado
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => navigate(`/admin/papeis?user=${interest.user_id}`)}
                            >
                              <UserPlus className="h-4 w-4 mr-1" />
                              Convidar Papel
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <p className="signature-luta text-center py-4 safe-bottom">
        #ÉLUTA — Territorializar para Vencer
      </p>

      {/* QR Modal */}
      {qrModalCidade && (
        <TerritoryLinkQRModal
          open={!!qrModalCidade}
          onOpenChange={(open) => !open && setQrModalCidade(null)}
          cidade={{
            id: qrModalCidade.cidade_id,
            nome: qrModalCidade.nome,
            slug: qrModalCidade.slug,
            uf: qrModalCidade.uf,
          }}
          userInviteCode={userInviteCode}
        />
      )}

      {/* Convert Interest Modal */}
      {convertModalInterest && (
        <ConvertInterestModal
          open={!!convertModalInterest}
          onOpenChange={(open) => !open && setConvertModalInterest(null)}
          interest={convertModalInterest}
        />
      )}
    </div>
  );
}
