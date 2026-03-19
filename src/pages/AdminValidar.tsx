import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLeads, LeadProfile, IntegrationStatus } from "@/hooks/useLeads";
import { useCells } from "@/hooks/useCells";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/ui/Logo";
import { RoleScopeBanner } from "@/components/admin/RoleScopeBanner";
import { FullPageLoader, LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Calendar,
  Mail,
  Copy,
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  Home,
  LogOut,
  Eye,
  UserCheck,
  UserX,
  ShieldAlert,
} from "lucide-react";

export default function AdminValidar() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isCoordinator, isAdmin, isLoading: rolesLoading } = useUserRoles();
  const { pendingLeads, isPendingLoading, counts, approveLead, rejectLead, isApproving, isRejecting, refetchPending, refetchCounts } = useLeads();
  const { cells } = useCells();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLead, setSelectedLead] = useState<LeadProfile | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedCellId, setSelectedCellId] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  // Filter leads by search term
  const filteredLeads = useMemo(() => {
    if (!searchTerm.trim()) return pendingLeads;
    
    const term = searchTerm.toLowerCase();
    return pendingLeads.filter(lead => 
      lead.full_name?.toLowerCase().includes(term) ||
      lead.city?.toLowerCase().includes(term) ||
      lead.neighborhood?.toLowerCase().includes(term)
    );
  }, [pendingLeads, searchTerm]);

  if (rolesLoading) {
    return <FullPageLoader text="Verificando acesso..." />;
  }

  if (!isCoordinator()) {
    navigate("/voluntario");
    return null;
  }

  const handleApproveClick = (lead: LeadProfile) => {
    setSelectedLead(lead);
    setSelectedCellId("");
    setApproveDialogOpen(true);
  };

  const handleRejectClick = (lead: LeadProfile) => {
    setSelectedLead(lead);
    setRejectionReason("");
    setRejectDialogOpen(true);
  };

  const handleViewDetails = (lead: LeadProfile) => {
    setSelectedLead(lead);
    setDetailsOpen(true);
  };

  const handleApproveConfirm = async () => {
    if (!selectedLead) return;
    
    // Block approval if no LGPD consent
    if (!selectedLead.lgpd_consent) {
      toast.error("Não é possível aprovar sem consentimento LGPD");
      return;
    }

    try {
      await approveLead({ userId: selectedLead.id, cellId: selectedCellId || undefined });
      setApproveDialogOpen(false);
      setSelectedLead(null);
    } catch (error) {
      console.error(error);
    }
  };

  const handleRejectConfirm = async () => {
    if (!selectedLead || !rejectionReason.trim()) {
      toast.error("Informe o motivo da recusa");
      return;
    }

    try {
      await rejectLead({ userId: selectedLead.id, reason: rejectionReason.trim() });
      setRejectDialogOpen(false);
      setSelectedLead(null);
      setRejectionReason("");
    } catch (error) {
      console.error(error);
    }
  };

  const copyEmail = (email: string | null) => {
    if (!email) {
      toast.error("Email não disponível");
      return;
    }
    navigator.clipboard.writeText(email);
    toast.success("Email copiado!");
  };

  const handleRefresh = () => {
    refetchPending();
    refetchCounts();
    toast.success("Dados atualizados!");
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatInterests = (interests: string[] | null) => {
    if (!interests || interests.length === 0) return [];
    return interests;
  };

  const formatAvailability = (availability: string[] | null) => {
    if (!availability || availability.length === 0) return [];
    const labels: Record<string, string> = {
      manha: "Manhã",
      tarde: "Tarde",
      noite: "Noite",
      fim_de_semana: "Fim de semana",
      flexivel: "Flexível",
    };
    return availability.map(a => labels[a] || a);
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
            {isAdmin() && (
              <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-1 rounded">
                Admin
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={handleRefresh}>
              <RefreshCw className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate("/voluntario")}>
              <Home className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 space-y-6">
        {/* Role Scope Banner */}
        <RoleScopeBanner />

        {/* Title & Counters */}
        <div>
          <div className="flex items-center gap-2 text-primary mb-2">
            <Clock className="h-5 w-5" />
            <span className="text-sm uppercase tracking-wider font-bold">Fila de Validação</span>
          </div>
          <h1 className="text-2xl font-bold">Leads Pendentes</h1>
          <div className="flex gap-4 mt-2">
            <Badge variant="outline" className="text-primary border-primary">
              <Clock className="h-3 w-3 mr-1" />
              {counts.pending} Pendentes
            </Badge>
            <Badge variant="outline" className="text-muted-foreground">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {counts.approved} Aprovados
            </Badge>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, cidade ou bairro..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Table */}
        {isPendingLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="card-luta text-center py-12">
            <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-4" />
            <p className="font-bold text-lg">Nenhum lead pendente!</p>
            <p className="text-muted-foreground">Todos os cadastros foram analisados.</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden sm:table-cell">Cidade/Estado</TableHead>
                  <TableHead className="hidden md:table-cell">Interesses</TableHead>
                  <TableHead className="hidden lg:table-cell">Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => (
                  <TableRow 
                    key={lead.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleViewDetails(lead)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                          {lead.full_name?.[0] || "?"}
                        </div>
                        <div>
                          <p className="font-medium">{lead.full_name || "Sem nome"}</p>
                          {!lead.lgpd_consent && (
                            <Badge variant="destructive" className="text-xs">
                              <ShieldAlert className="h-3 w-3 mr-1" />
                              Sem LGPD
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {lead.city || "N/A"}, {lead.state || "N/A"}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex gap-1 flex-wrap">
                        {formatInterests(lead.interests).slice(0, 2).map((interest) => (
                          <Badge key={interest} variant="secondary" className="text-xs">
                            {interest}
                          </Badge>
                        ))}
                        {(lead.interests?.length || 0) > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{(lead.interests?.length || 0) - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                      {formatDate(lead.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewDetails(lead)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => handleRejectClick(lead)}
                          disabled={isRejecting}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          className="btn-luta"
                          onClick={() => handleApproveClick(lead)}
                          disabled={isApproving || !lead.lgpd_consent}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>

      {/* Details Sheet */}
      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Detalhes do Lead</SheetTitle>
            <SheetDescription>
              Informações completas do cadastro
            </SheetDescription>
          </SheetHeader>
          
          {selectedLead && (
            <div className="space-y-6 mt-6">
              {/* Name & Status */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">
                  {selectedLead.full_name?.[0] || "?"}
                </div>
                <div>
                  <p className="font-bold text-lg">{selectedLead.full_name || "Sem nome"}</p>
                  <div className="flex gap-2">
                    <Badge variant="secondary">
                      <Clock className="h-3 w-3 mr-1" />
                      Pendente
                    </Badge>
                    {!selectedLead.lgpd_consent && (
                      <Badge variant="destructive">
                        <ShieldAlert className="h-3 w-3 mr-1" />
                        Sem LGPD
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Localização</h4>
                <div className="card-luta">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span>{selectedLead.city || "N/A"}, {selectedLead.state || "N/A"}</span>
                  </div>
                  {selectedLead.neighborhood && (
                    <p className="text-sm text-muted-foreground mt-1">Bairro: {selectedLead.neighborhood}</p>
                  )}
                </div>
              </div>

              {/* Interests */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Interesses</h4>
                <div className="flex gap-2 flex-wrap">
                  {formatInterests(selectedLead.interests).length > 0 ? (
                    formatInterests(selectedLead.interests).map((interest) => (
                      <Badge key={interest} variant="secondary">{interest}</Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-sm">Nenhum informado</span>
                  )}
                </div>
              </div>

              {/* Availability */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Disponibilidade</h4>
                <div className="flex gap-2 flex-wrap">
                  {formatAvailability(selectedLead.availability).length > 0 ? (
                    formatAvailability(selectedLead.availability).map((avail) => (
                      <Badge key={avail} variant="outline">{avail}</Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-sm">Nenhuma informada</span>
                  )}
                </div>
              </div>

              {/* Dates */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Datas</h4>
                <div className="card-luta space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Cadastro: {formatDate(selectedLead.created_at)}</span>
                  </div>
                  {selectedLead.lgpd_consent_at && (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span>LGPD: {formatDate(selectedLead.lgpd_consent_at)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  className="flex-1 border-destructive/50 text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    setDetailsOpen(false);
                    handleRejectClick(selectedLead);
                  }}
                  disabled={isRejecting}
                >
                  <UserX className="h-4 w-4 mr-2" />
                  Reprovar
                </Button>
                <Button
                  className="flex-1 btn-luta"
                  onClick={() => {
                    setDetailsOpen(false);
                    handleApproveClick(selectedLead);
                  }}
                  disabled={isApproving || !selectedLead.lgpd_consent}
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  Aprovar
                </Button>
              </div>

              {!selectedLead.lgpd_consent && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Este lead não deu consentimento LGPD. Não é possível aprovar sem consentimento.</span>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar Lead</DialogTitle>
            <DialogDescription>
              Confirme a aprovação de {selectedLead?.full_name || "lead"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Atribuir a uma Célula (opcional)
              </label>
              <Select value={selectedCellId || "none"} onValueChange={(v) => setSelectedCellId(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma célula..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem célula por enquanto</SelectItem>
                  {cells.map((cell) => (
                    <SelectItem key={cell.id} value={cell.id}>
                      {cell.name} - {cell.city}/{cell.state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleApproveConfirm} 
              disabled={isApproving}
              className="btn-luta"
            >
              {isApproving ? <LoadingSpinner size="sm" /> : (
                <>
                  <UserCheck className="h-4 w-4 mr-2" />
                  Aprovar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reprovar Lead</DialogTitle>
            <DialogDescription>
              Informe o motivo da recusa para {selectedLead?.full_name || "lead"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Motivo da Recusa *
              </label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explique o motivo da recusa..."
                className="min-h-[100px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={handleRejectConfirm} 
              disabled={isRejecting || !rejectionReason.trim()}
            >
              {isRejecting ? <LoadingSpinner size="sm" /> : (
                <>
                  <UserX className="h-4 w-4 mr-2" />
                  Reprovar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <p className="signature-luta text-center py-4 safe-bottom">
        #ÉLUTA — Escutar • Cuidar • Organizar
      </p>
    </div>
  );
}
