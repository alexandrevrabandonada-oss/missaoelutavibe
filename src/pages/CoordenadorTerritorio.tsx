import { useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { UserScopeBadge } from "@/components/admin/UserScopeBadge";
import { CoordTeamTab } from "@/components/coordinator/CoordTeamTab";
import { CityBootstrapSection } from "@/components/coordinator/CityBootstrapSection";
import {
  useCityAssignmentRequests,
  useCityCells,
  useCellOpsMutations,
  type AssignmentRequest,
  type CityCell,
} from "@/hooks/useCellOps";
import { useCityCellSelection } from "@/hooks/useCityCellSelection";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useScopedRoles } from "@/hooks/useScopedRoles";
import {
  ArrowLeft,
  Building2,
  Check,
  Clock,
  Crown,
  MapPin,
  Plus,
  Users,
  UsersRound,
  X,
  AlertTriangle,
} from "lucide-react";

export default function CoordenadorTerritorio() {
  const { isCoordinator, isAdmin, isLoading: rolesLoading } = useUserRoles();
  const { scope } = useScopedRoles();
  const { cities, isLoadingCities } = useCityCellSelection();
  
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [showCellForm, setShowCellForm] = useState(false);
  const [editingCell, setEditingCell] = useState<CityCell | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<AssignmentRequest | null>(null);
  const [selectedCellForAssign, setSelectedCellForAssign] = useState<string>("");
  const [coordinatorNote, setCoordinatorNote] = useState("");
  const [makeCellCoordinator, setMakeCellCoordinator] = useState(false);
  
  // Cell form state
  const [cellForm, setCellForm] = useState({
    name: "",
    neighborhood: "",
    description: "",
    tags: "",
  });

  // Auto-select city based on coordinator scope (by city name)
  const scopeCityMatch = cities.find(c => c.nome === scope.scope_city);
  if (scopeCityMatch && !selectedCityId && !isLoadingCities) {
    setSelectedCityId(scopeCityMatch.id);
  }

  // Data queries
  const { data: requests = [], isLoading: requestsLoading } = useCityAssignmentRequests(
    selectedCityId,
    statusFilter === "all" ? undefined : statusFilter
  );
  const { data: cells = [], isLoading: cellsLoading } = useCityCells(selectedCityId);

  // Mutations
  const { upsertCell, isUpserting, approveRequest, isApproving, cancelRequest, isCancelling } = useCellOpsMutations();

  // Handle cell form submit
  const handleCellSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCityId || !cellForm.name.trim()) return;

    upsertCell({
      cityId: selectedCityId,
      name: cellForm.name,
      neighborhood: cellForm.neighborhood || undefined,
      notes: cellForm.description || undefined,
      tags: cellForm.tags ? cellForm.tags.split(",").map(t => t.trim()) : [],
      cellId: editingCell?.id,
    });

    setCellForm({ name: "", neighborhood: "", description: "", tags: "" });
    setShowCellForm(false);
    setEditingCell(null);
  };

  // Handle assign request
  const handleAssign = () => {
    if (!selectedRequest) return;

    // "__none__" means no cell, treat as undefined
    const cellId = selectedCellForAssign && selectedCellForAssign !== "__none__" 
      ? selectedCellForAssign 
      : undefined;

    approveRequest({
      requestId: selectedRequest.id,
      cellId,
      note: coordinatorNote || undefined,
      makeCellCoordinator: cellId ? makeCellCoordinator : false, // Only if cell is selected
    });

    setAssignDialogOpen(false);
    setSelectedRequest(null);
    setSelectedCellForAssign("");
    setCoordinatorNote("");
    setMakeCellCoordinator(false);
  };

  // Handle create initial "Geral" cell
  const handleCreateInitialCell = () => {
    if (!selectedCityId) return;
    upsertCell({
      cityId: selectedCityId,
      name: "Geral",
      notes: "Célula inicial da cidade - criada automaticamente",
      tags: ["inicial"],
    });
  };

  // Handle cancel request
  const handleCancel = (request: AssignmentRequest) => {
    cancelRequest({ requestId: request.id });
  };

  // Edit cell
  const handleEditCell = (cell: CityCell) => {
    setEditingCell(cell);
    setCellForm({
      name: cell.name,
      neighborhood: cell.neighborhood || "",
      description: cell.description || "",
      tags: cell.tags?.join(", ") || "",
    });
    setShowCellForm(true);
  };

  // Access control
  if (rolesLoading) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto p-4">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-64" />
        </div>
      </AppShell>
    );
  }

  if (!isCoordinator() && !isAdmin()) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto p-4">
          <p className="text-muted-foreground">Acesso restrito a coordenadores.</p>
          <Button asChild className="mt-4">
            <Link to="/voluntario/hoje">Voltar</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const pendingCount = requests.filter(r => r.status === "pending").length;

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-6 p-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/coordenador/hoje">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Inbox
                </Link>
              </Button>
            </div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              Operação de Células
            </h1>
            <p className="text-muted-foreground text-sm">
              Gerencie pedidos de alocação e células do território
            </p>
          </div>
        </div>

        <UserScopeBadge />

        {/* City Selector */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Selecionar Cidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select 
              value={selectedCityId || ""} 
              onValueChange={setSelectedCityId}
              disabled={isLoadingCities}
            >
              <SelectTrigger className="w-full md:w-80">
                <SelectValue placeholder="Escolha uma cidade..." />
              </SelectTrigger>
              <SelectContent>
                {cities.map((city) => (
                  <SelectItem key={city.id} value={city.id}>
                    {city.nome} - {city.uf}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Main Tabs */}
        {selectedCityId && (
          <Tabs defaultValue="requests" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="requests" className="relative">
                Pedidos
                {pendingCount > 0 && (
                  <Badge variant="destructive" className="ml-2 h-5 px-1.5 text-xs">
                    {pendingCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="setup" className="flex items-center gap-1">
                🚀 Setup
              </TabsTrigger>
              <TabsTrigger value="cells">
                Células ({cells.length})
              </TabsTrigger>
              <TabsTrigger value="team" className="flex items-center gap-1">
                <UsersRound className="h-4 w-4" />
                Equipe
              </TabsTrigger>
            </TabsList>

            {/* Requests Tab */}
            <TabsContent value="requests" className="mt-4 space-y-4">
              {/* Status Filter */}
              <div className="flex gap-2">
                {[
                  { value: "pending", label: "Pendentes" },
                  { value: "assigned", label: "Alocados" },
                  { value: "cancelled", label: "Cancelados" },
                  { value: "all", label: "Todos" },
                ].map((opt) => (
                  <Button
                    key={opt.value}
                    variant={statusFilter === opt.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter(opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>

              {/* Requests List */}
              {requestsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24" />
                  ))}
                </div>
              ) : requests.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>Nenhum pedido encontrado</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {requests.map((request) => {
                    // Find "Geral" cell for quick approve
                    const defaultCell = cells.find(c => c.name === "Geral" && c.is_active);
                    
                    return (
                      <RequestCard
                        key={request.id}
                        request={request}
                        onAssign={() => {
                          setSelectedRequest(request);
                          setAssignDialogOpen(true);
                        }}
                        onQuickApprove={defaultCell ? () => {
                          approveRequest({
                            requestId: request.id,
                            cellId: defaultCell.id,
                          });
                        } : undefined}
                        onCancel={() => handleCancel(request)}
                        isCancelling={isCancelling}
                        isApproving={isApproving}
                        defaultCellName={defaultCell?.name}
                      />
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Setup Tab */}
            <TabsContent value="setup" className="mt-4">
              <CityBootstrapSection 
                cityId={selectedCityId}
                cityName={cities.find(c => c.id === selectedCityId)?.nome || ""}
                existingCells={cells}
                isLoadingCells={cellsLoading}
              />
            </TabsContent>

            {/* Cells Tab */}
            <TabsContent value="cells" className="mt-4 space-y-4">
              {/* Add Cell Button */}
              <div className="flex justify-end">
                <Button onClick={() => setShowCellForm(!showCellForm)}>
                  {showCellForm ? (
                    <>
                      <X className="h-4 w-4 mr-2" />
                      Cancelar
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Célula
                    </>
                  )}
                </Button>
              </div>

              {/* Cell Form */}
              {showCellForm && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {editingCell ? "Editar Célula" : "Criar Nova Célula"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleCellSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Nome *</label>
                          <Input
                            value={cellForm.name}
                            onChange={(e) => setCellForm({ ...cellForm, name: e.target.value })}
                            placeholder="Ex: Centro, Zona Norte"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Bairro</label>
                          <Input
                            value={cellForm.neighborhood}
                            onChange={(e) => setCellForm({ ...cellForm, neighborhood: e.target.value })}
                            placeholder="Bairro principal"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Descrição</label>
                        <Textarea
                          value={cellForm.description}
                          onChange={(e) => setCellForm({ ...cellForm, description: e.target.value })}
                          placeholder="Contexto e objetivo da célula..."
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Tags (separadas por vírgula)</label>
                        <Input
                          value={cellForm.tags}
                          onChange={(e) => setCellForm({ ...cellForm, tags: e.target.value })}
                          placeholder="Ex: jovens, digital, presencial"
                        />
                      </div>
                      <Button type="submit" disabled={isUpserting || !cellForm.name.trim()}>
                        {isUpserting ? "Salvando..." : editingCell ? "Atualizar" : "Criar Célula"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}

              {/* Cells List */}
              {cellsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24" />
                  ))}
                </div>
              ) : cells.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                    <p className="font-medium">Nenhuma célula nesta cidade</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Crie a primeira célula para começar a alocar voluntários.
                    </p>
                    <Button onClick={handleCreateInitialCell} disabled={isUpserting}>
                      <Plus className="h-4 w-4 mr-2" />
                      {isUpserting ? "Criando..." : "Criar célula inicial (Geral)"}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {cells.map((cell) => (
                    <CellCard
                      key={cell.id}
                      cell={cell}
                      onEdit={() => handleEditCell(cell)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Team Tab */}
            <TabsContent value="team" className="mt-4">
              <CoordTeamTab 
                selectedCityId={selectedCityId}
                selectedCityName={cities.find(c => c.id === selectedCityId)?.nome}
              />
            </TabsContent>
          </Tabs>
        )}

        {/* Assign Dialog */}
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Aprovar e Alocar</DialogTitle>
              <DialogDescription>
                {selectedRequest?.profile_first_name
                  ? `Alocar ${selectedRequest.profile_first_name} em uma célula`
                  : "Aprovar pedido de alocação"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {selectedRequest && (
                <div className="p-3 bg-muted rounded-lg text-sm">
                  <p><strong>Bairro preferido:</strong> {selectedRequest.bairro || "Não informado"}</p>
                  <p><strong>Disponibilidade:</strong> {selectedRequest.disponibilidade || "Não informada"}</p>
                  {selectedRequest.interesses && selectedRequest.interesses.length > 0 && (
                    <p><strong>Interesses:</strong> {selectedRequest.interesses.join(", ")}</p>
                  )}
                </div>
              )}

              <div>
                <label className="text-sm font-medium">Célula (opcional)</label>
                <Select value={selectedCellForAssign} onValueChange={setSelectedCellForAssign}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecionar célula..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sem célula (apenas aprovar)</SelectItem>
                    {cells.filter(c => c.is_active).map((cell) => (
                      <SelectItem key={cell.id} value={cell.id}>
                        {cell.name} {cell.neighborhood && `(${cell.neighborhood})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Se não selecionar célula, o voluntário será aprovado mas ficará "sem célula"
                </p>
              </div>

              {/* Coordinator promotion checkbox - only show when cell is selected */}
              {selectedCellForAssign && selectedCellForAssign !== "__none__" && (
                <div className="flex items-start gap-3 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                  <Checkbox
                    id="make-coordinator"
                    checked={makeCellCoordinator}
                    onCheckedChange={(checked) => setMakeCellCoordinator(checked === true)}
                  />
                  <div className="space-y-1">
                    <label 
                      htmlFor="make-coordinator" 
                      className="text-sm font-medium flex items-center gap-2 cursor-pointer"
                    >
                      <Crown className="h-4 w-4 text-amber-600" />
                      Tornar coordenador desta célula
                    </label>
                    <p className="text-xs text-muted-foreground">
                      O voluntário receberá permissões de coordenação para gerenciar esta célula.
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium">Nota do coordenador (opcional)</label>
                <Textarea
                  value={coordinatorNote}
                  onChange={(e) => setCoordinatorNote(e.target.value)}
                  placeholder="Observações sobre a alocação..."
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAssign} disabled={isApproving}>
                  {isApproving ? "Aprovando..." : makeCellCoordinator ? "Aprovar e Promover" : "Aprovar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}

// Sub-components

function RequestCard({
  request,
  onAssign,
  onQuickApprove,
  onCancel,
  isCancelling,
  isApproving,
  defaultCellName,
}: {
  request: AssignmentRequest;
  onAssign: () => void;
  onQuickApprove?: () => void;
  onCancel: () => void;
  isCancelling: boolean;
  isApproving?: boolean;
  defaultCellName?: string;
}) {
  const isPending = request.status === "pending";
  const isAssigned = request.status === "assigned";

  return (
    <Card className={`border-l-4 ${
      isPending ? "border-l-amber-500" : 
      isAssigned ? "border-l-green-500" : 
      "border-l-muted"
    }`}>
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-medium">
                {request.profile_first_name || "Voluntário"}
              </span>
              {request.profile_neighborhood && (
                <Badge variant="outline" className="text-xs">
                  {request.profile_neighborhood}
                </Badge>
              )}
              <Badge 
                variant={isPending ? "default" : isAssigned ? "outline" : "secondary"}
                className={`text-xs ${isPending ? "bg-amber-500" : ""}`}
              >
                {isPending ? "Pendente" : isAssigned ? "Alocado" : request.status}
              </Badge>
            </div>

            <div className="text-sm text-muted-foreground space-y-0.5">
              {request.bairro && <p>Bairro: {request.bairro}</p>}
              {request.disponibilidade && <p>Disp: {request.disponibilidade}</p>}
              {isAssigned && request.assigned_cell_name && (
                <p className="text-green-600">→ {request.assigned_cell_name}</p>
              )}
            </div>

            {isPending && request.days_waiting > 0 && (
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{request.days_waiting} dia{request.days_waiting > 1 ? "s" : ""} aguardando</span>
              </div>
            )}
          </div>

          {isPending && (
            <div className="flex items-center gap-2 shrink-0">
              <Button 
                variant="outline" 
                size="sm"
                onClick={onCancel}
                disabled={isCancelling || isApproving}
                title="Cancelar pedido"
              >
                <X className="h-4 w-4" />
              </Button>
              {/* Quick approve button - 1 click */}
              {onQuickApprove && defaultCellName && (
                <Button 
                  size="sm" 
                  variant="default"
                  onClick={onQuickApprove}
                  disabled={isApproving || isCancelling}
                  title={`Aprovar na célula ${defaultCellName}`}
                >
                  {isApproving ? "..." : `✓ ${defaultCellName}`}
                </Button>
              )}
              {/* Full assign dialog */}
              <Button size="sm" variant="outline" onClick={onAssign} disabled={isApproving}>
                <Check className="h-4 w-4 mr-1" />
                Escolher
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CellCard({ cell, onEdit }: { cell: CityCell; onEdit: () => void }) {
  return (
    <Card className={!cell.is_active ? "opacity-60" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              {cell.name}
              {!cell.is_active && (
                <Badge variant="secondary" className="text-xs">Inativa</Badge>
              )}
            </CardTitle>
            {cell.neighborhood && (
              <CardDescription className="text-xs">
                {cell.neighborhood}
              </CardDescription>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onEdit}>
            Editar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {cell.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {cell.description}
          </p>
        )}

        <div className="flex items-center gap-4 text-sm flex-wrap">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{cell.member_count} membros</span>
          </div>
          {cell.coordinator_count > 0 && (
            <div className="flex items-center gap-1 text-primary">
              <Crown className="h-4 w-4" />
              <span>{cell.coordinator_count} coord{cell.coordinator_count > 1 ? "s" : ""}</span>
            </div>
          )}
          {cell.pending_requests > 0 && (
            <div className="flex items-center gap-1 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              <span>{cell.pending_requests} pendentes</span>
            </div>
          )}
        </div>

        {cell.tags && cell.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {cell.tags.map((tag, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
