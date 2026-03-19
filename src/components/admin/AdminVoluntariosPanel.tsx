import { useState } from "react";
import { useAdminVolunteers, VolunteerWithCell, VolunteerFilter } from "@/hooks/useAdminVolunteers";
import { useCells } from "@/hooks/useCells";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
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
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  UserX,
  AlertCircle,
  Link2,
  Filter
} from "lucide-react";
import { VolunteerTableRow } from "./VolunteerTableRow";

export default function AdminVoluntariosPanel() {
  const [filter, setFilter] = useState<VolunteerFilter>("todos");
  const { 
    volunteers, 
    isLoading, 
    pendingCount,
    withoutCellCount,
    approveVolunteer, 
    rejectVolunteer,
    isApproving,
    isRejecting
  } = useAdminVolunteers(filter);
  const { cells, addMember, isAddingMember } = useCells();
  
  const [selectedVolunteer, setSelectedVolunteer] = useState<VolunteerWithCell | null>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [linkCellDialogOpen, setLinkCellDialogOpen] = useState(false);
  const [selectedCellId, setSelectedCellId] = useState<string>("");
  const [rejectionReason, setRejectionReason] = useState("");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  const handleApproveClick = (volunteer: VolunteerWithCell) => {
    setSelectedVolunteer(volunteer);
    setSelectedCellId("");
    setApproveDialogOpen(true);
  };

  const handleRejectClick = (volunteer: VolunteerWithCell) => {
    setSelectedVolunteer(volunteer);
    setRejectionReason("");
    setRejectDialogOpen(true);
  };

  const handleLinkCellClick = (volunteer: VolunteerWithCell) => {
    setSelectedVolunteer(volunteer);
    setSelectedCellId("");
    setLinkCellDialogOpen(true);
  };

  const handleApproveConfirm = async () => {
    if (!selectedVolunteer) return;
    
    try {
      await approveVolunteer({ 
        userId: selectedVolunteer.id, 
        cellId: selectedCellId || undefined 
      });
      toast.success(`${selectedVolunteer.full_name || "Voluntário"} aprovado com sucesso!`);
      setApproveDialogOpen(false);
      setSelectedVolunteer(null);
    } catch (error) {
      toast.error("Erro ao aprovar voluntário");
      console.error(error);
    }
  };

  const handleRejectConfirm = async () => {
    if (!selectedVolunteer || !rejectionReason.trim()) {
      toast.error("Informe o motivo da recusa");
      return;
    }
    
    try {
      await rejectVolunteer({ 
        userId: selectedVolunteer.id, 
        reason: rejectionReason.trim() 
      });
      toast.success(`${selectedVolunteer.full_name || "Voluntário"} recusado`);
      setRejectDialogOpen(false);
      setSelectedVolunteer(null);
      setRejectionReason("");
    } catch (error) {
      toast.error("Erro ao recusar voluntário");
      console.error(error);
    }
  };

  const handleLinkCellConfirm = async () => {
    if (!selectedVolunteer || !selectedCellId) {
      toast.error("Selecione uma célula");
      return;
    }
    
    try {
      await addMember({ userId: selectedVolunteer.id, cellId: selectedCellId });
      toast.success(`${selectedVolunteer.full_name || "Voluntário"} vinculado à célula!`);
      setLinkCellDialogOpen(false);
      setSelectedVolunteer(null);
      setSelectedCellId("");
    } catch (error) {
      toast.error("Erro ao vincular célula");
      console.error(error);
    }
  };

  const filterOptions: { value: VolunteerFilter; label: string; icon: React.ReactNode; count?: number }[] = [
    { value: "todos", label: "Todos", icon: <Users className="h-4 w-4" /> },
    { value: "pendentes", label: "Pendentes", icon: <Clock className="h-4 w-4" />, count: pendingCount },
    { value: "aprovados", label: "Aprovados", icon: <CheckCircle2 className="h-4 w-4" /> },
    { value: "sem_celula", label: "Sem Célula", icon: <Link2 className="h-4 w-4" />, count: withoutCellCount },
    { value: "recusados", label: "Recusados", icon: <XCircle className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-primary mb-2">
          <Users className="h-5 w-5" />
          <span className="text-sm uppercase tracking-wider font-bold">Gestão de Voluntários</span>
        </div>
        <h2 className="text-2xl font-bold">Cadastros e Alocações</h2>
      </div>

      {/* Alerts */}
      {pendingCount > 0 && (
        <div className="card-luta border-primary/50 bg-primary/10">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-primary flex-shrink-0" />
            <div>
              <p className="font-bold">{pendingCount} cadastro{pendingCount > 1 ? "s" : ""} pendente{pendingCount > 1 ? "s" : ""}!</p>
              <p className="text-sm text-muted-foreground">
                Revise e aprove os voluntários para liberá-los
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {filterOptions.map((opt) => (
          <Button
            key={opt.value}
            variant={filter === opt.value ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(opt.value)}
            className={filter === opt.value ? "btn-luta" : ""}
          >
            {opt.icon}
            <span className="ml-1">{opt.label}</span>
            {opt.count !== undefined && opt.count > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-xs px-1.5 py-0">
                {opt.count}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Table */}
      {volunteers.length === 0 ? (
        <div className="card-luta text-center py-12">
          <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="font-bold text-lg">Nenhum voluntário encontrado</p>
          <p className="text-muted-foreground">Ajuste os filtros ou aguarde novos cadastros.</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Voluntário</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Célula</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {volunteers.map((volunteer) => (
                <VolunteerTableRow
                  key={volunteer.id}
                  volunteer={volunteer}
                  onApprove={() => handleApproveClick(volunteer)}
                  onReject={() => handleRejectClick(volunteer)}
                  onLinkCell={() => handleLinkCellClick(volunteer)}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar Voluntário</DialogTitle>
            <DialogDescription>
              Confirme a aprovação de {selectedVolunteer?.full_name || selectedVolunteer?.nickname || "voluntário"}
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
                      {cell.name} {cell.city !== "N/A" && `- ${cell.city}/${cell.state}`}
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
              <UserCheck className="h-4 w-4 mr-2" />
              {isApproving ? "Aprovando..." : "Aprovar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recusar Voluntário</DialogTitle>
            <DialogDescription>
              Informe o motivo da recusa para {selectedVolunteer?.full_name || selectedVolunteer?.nickname || "voluntário"}
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
              <UserX className="h-4 w-4 mr-2" />
              {isRejecting ? "Recusando..." : "Recusar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Cell Dialog */}
      <Dialog open={linkCellDialogOpen} onOpenChange={setLinkCellDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular a Célula</DialogTitle>
            <DialogDescription>
              Atribuir {selectedVolunteer?.full_name || selectedVolunteer?.nickname || "voluntário"} a uma célula
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Selecione a Célula *
              </label>
              <Select value={selectedCellId} onValueChange={setSelectedCellId}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha uma célula..." />
                </SelectTrigger>
                <SelectContent>
                  {cells.map((cell) => (
                    <SelectItem key={cell.id} value={cell.id}>
                      {cell.name} {cell.city !== "N/A" && `- ${cell.city}/${cell.state}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkCellDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleLinkCellConfirm} 
              disabled={isAddingMember || !selectedCellId}
              className="btn-luta"
            >
              <Link2 className="h-4 w-4 mr-2" />
              {isAddingMember ? "Vinculando..." : "Vincular"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
