/**
 * PendingVolunteersCard - Card for managing pending volunteer approvals
 * 
 * Shows list of pending volunteers with actions:
 * - Approve (sends to cell allocation queue)
 * - Approve + Assign Cell (direct assignment)
 * - Reject (with reason)
 * 
 * After approval, shows WhatsApp message copy CTA.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  usePendingVolunteers,
  getWelcomeMessage,
  type PendingVolunteer,
} from "@/hooks/usePendingVolunteers";
import {
  CheckCircle2,
  Clock,
  Copy,
  MessageCircle,
  UserCheck,
  UserPlus,
  UserX,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PendingVolunteersCardProps {
  cityId?: string | null;
  cityName?: string | null;
  limit?: number;
}

export function PendingVolunteersCard({ cityId, cityName, limit = 5 }: PendingVolunteersCardProps) {
  const {
    pendingVolunteers,
    pendingCount,
    isLoading,
    approveVolunteer,
    isApproving,
    rejectVolunteer,
    isRejecting,
  } = usePendingVolunteers(cityId);

  const [selectedVolunteer, setSelectedVolunteer] = useState<PendingVolunteer | null>(null);
  const [actionType, setActionType] = useState<"approve" | "assign" | "reject" | null>(null);
  const [selectedCellId, setSelectedCellId] = useState<string>("");
  const [rejectReason, setRejectReason] = useState("");
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [approvedName, setApprovedName] = useState("");

  // Fetch cells for assignment
  const { data: cells = [] } = useQuery({
    queryKey: ["city-cells-for-assign", cityId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_city_cells", {
        p_city_id: cityId || null,
      });
      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: actionType === "assign" && !!cityId,
  });

  const displayVolunteers = pendingVolunteers.slice(0, limit);
  const hasMore = pendingVolunteers.length > limit;

  const handleApprove = async (sendToAllocation: boolean) => {
    if (!selectedVolunteer) return;

    try {
      await approveVolunteer({
        userId: selectedVolunteer.id,
        cellId: sendToAllocation ? null : selectedCellId || null,
      });
      
      setApprovedName(selectedVolunteer.first_name);
      setShowSuccessDialog(true);
      closeActionDialog();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleReject = async () => {
    if (!selectedVolunteer || !rejectReason.trim()) return;

    try {
      await rejectVolunteer({
        userId: selectedVolunteer.id,
        reason: rejectReason,
      });
      closeActionDialog();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const closeActionDialog = () => {
    setSelectedVolunteer(null);
    setActionType(null);
    setSelectedCellId("");
    setRejectReason("");
  };

  const handleCopyMessage = () => {
    const message = getWelcomeMessage(approvedName);
    navigator.clipboard.writeText(message);
    toast.success("Mensagem copiada!");
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={pendingCount > 0 ? "border-primary" : ""}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Voluntários pendentes</CardTitle>
            </div>
            {pendingCount > 0 && (
              <Badge variant="default">
                {pendingCount}
              </Badge>
            )}
          </div>
          {cityName && (
            <CardDescription className="text-xs">
              {cityName}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {pendingCount === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500/50" />
              <p className="text-sm">Nenhum voluntário pendente! 🎉</p>
            </div>
          ) : (
            <>
              {displayVolunteers.map((volunteer) => (
                <VolunteerRow
                  key={volunteer.id}
                  volunteer={volunteer}
                  onApprove={() => {
                    setSelectedVolunteer(volunteer);
                    setActionType("approve");
                  }}
                  onAssign={() => {
                    setSelectedVolunteer(volunteer);
                    setActionType("assign");
                  }}
                  onReject={() => {
                    setSelectedVolunteer(volunteer);
                    setActionType("reject");
                  }}
                />
              ))}
              {hasMore && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  +{pendingVolunteers.length - limit} mais pendentes
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={!!actionType} onOpenChange={() => closeActionDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" && "Aprovar voluntário"}
              {actionType === "assign" && "Aprovar e alocar em célula"}
              {actionType === "reject" && "Recusar voluntário"}
            </DialogTitle>
            <DialogDescription>
              {selectedVolunteer?.first_name} • {selectedVolunteer?.city_name}
            </DialogDescription>
          </DialogHeader>

          {actionType === "approve" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                O voluntário será aprovado e encaminhado para a fila de alocação em célula.
                Você poderá atribuir a célula depois em "Operação de Células".
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={closeActionDialog}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => handleApprove(true)}
                  disabled={isApproving}
                >
                  {isApproving ? "Aprovando..." : "Aprovar"}
                </Button>
              </DialogFooter>
            </div>
          )}

          {actionType === "assign" && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Selecione a célula</label>
                <Select value={selectedCellId} onValueChange={setSelectedCellId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Escolher célula..." />
                  </SelectTrigger>
                  <SelectContent>
                    {cells.map((cell: any) => (
                      <SelectItem key={cell.id} value={cell.id}>
                        {cell.name} ({cell.member_count || 0} membros)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeActionDialog}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => handleApprove(false)}
                  disabled={isApproving || !selectedCellId}
                >
                  {isApproving ? "Aprovando..." : "Aprovar e alocar"}
                </Button>
              </DialogFooter>
            </div>
          )}

          {actionType === "reject" && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Motivo da recusa</label>
                <Textarea
                  className="mt-1"
                  placeholder="Informe o motivo..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeActionDialog}>
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={isRejecting || !rejectReason.trim()}
                >
                  {isRejecting ? "Recusando..." : "Recusar"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Success Dialog with WhatsApp CTA */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Voluntário aprovado!
            </DialogTitle>
            <DialogDescription>
              {approvedName} agora faz parte do time.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Copie a mensagem abaixo para dar as boas-vindas via WhatsApp:
            </p>
            <div className="p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap max-h-40 overflow-auto">
              {getWelcomeMessage(approvedName)}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCopyMessage} className="flex-1">
                <Copy className="h-4 w-4 mr-2" />
                Copiar mensagem
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowSuccessDialog(false)}
              >
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Sub-component for volunteer row
function VolunteerRow({
  volunteer,
  onApprove,
  onAssign,
  onReject,
}: {
  volunteer: PendingVolunteer;
  onApprove: () => void;
  onAssign: () => void;
  onReject: () => void;
}) {
  const timeAgo = formatDistanceToNow(new Date(volunteer.created_at), {
    addSuffix: true,
    locale: ptBR,
  });

  const isUrgent = volunteer.days_pending >= 2;

  return (
    <div className={`flex items-center justify-between p-2 rounded-lg border ${
      isUrgent ? "border-amber-500/50 bg-amber-500/5" : "border-border"
    }`}>
      <div className="flex items-center gap-2 min-w-0">
        <div className="p-1.5 rounded-full bg-primary/10">
          <Users className="h-3 w-3 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{volunteer.first_name}</p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{timeAgo}</span>
            {volunteer.city_name && (
              <>
                <span>•</span>
                <span className="truncate">{volunteer.city_name}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-500/10"
          onClick={onApprove}
          title="Aprovar"
        >
          <UserCheck className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-primary hover:text-primary hover:bg-primary/10"
          onClick={onAssign}
          title="Aprovar e alocar"
        >
          <UserPlus className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={onReject}
          title="Recusar"
        >
          <UserX className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
