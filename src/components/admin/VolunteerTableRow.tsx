import { VolunteerWithCell } from "@/hooks/useAdminVolunteers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  CheckCircle2,
  XCircle,
  MapPin,
  Calendar,
  Link2,
  UserCheck,
  UserX,
  AlertCircle,
} from "lucide-react";

interface VolunteerTableRowProps {
  volunteer: VolunteerWithCell;
  onApprove?: () => void;
  onReject?: () => void;
  onLinkCell?: () => void;
}

export function VolunteerTableRow({
  volunteer,
  onApprove,
  onReject,
  onLinkCell,
}: VolunteerTableRowProps) {
  const isPending = volunteer.volunteer_status === "pendente";
  const isApproved = volunteer.volunteer_status === "ativo";
  const isRejected = volunteer.volunteer_status === "recusado";

  return (
    <TableRow>
      {/* Avatar + Name */}
      <TableCell>
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
              isApproved
                ? "bg-primary/20 text-primary"
                : isRejected
                ? "bg-destructive/20 text-destructive"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            {volunteer.nickname?.[0] || volunteer.full_name?.[0] || "?"}
          </div>
          <div className="min-w-0">
            <p className="font-medium truncate">
              {volunteer.full_name || volunteer.nickname || "Sem nome"}
            </p>
            {volunteer.city && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {volunteer.city}, {volunteer.state}
              </p>
            )}
          </div>
        </div>
      </TableCell>

      {/* Status */}
      <TableCell>
        {isPending && (
          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
            <AlertCircle className="h-3 w-3 mr-1" />
            Pendente
          </Badge>
        )}
        {isApproved && (
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Ativo
          </Badge>
        )}
        {isRejected && (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Recusado
          </Badge>
        )}
      </TableCell>

      {/* Cell */}
      <TableCell>
        {volunteer.cell_name ? (
          <Badge variant="secondary" className="text-xs">
            <Link2 className="h-3 w-3 mr-1" />
            {volunteer.cell_name}
          </Badge>
        ) : isApproved ? (
          <Badge variant="outline" className="text-xs text-muted-foreground">
            Sem célula
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>

      {/* Date */}
      <TableCell className="text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {new Date(volunteer.created_at).toLocaleDateString("pt-BR")}
        </div>
      </TableCell>

      {/* Actions */}
      <TableCell>
        <div className="flex items-center gap-2 justify-end">
          {isPending && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive border-destructive/50 hover:bg-destructive/10"
                onClick={onReject}
              >
                <UserX className="h-4 w-4" />
              </Button>
              <Button size="sm" className="btn-luta" onClick={onApprove}>
                <UserCheck className="h-4 w-4" />
              </Button>
            </>
          )}
          {isApproved && !volunteer.cell_id && (
            <Button size="sm" variant="outline" onClick={onLinkCell}>
              <Link2 className="h-4 w-4 mr-1" />
              Célula
            </Button>
          )}
          {isRejected && volunteer.rejection_reason && (
            <span className="text-xs text-destructive max-w-[200px] truncate" title={volunteer.rejection_reason}>
              {volunteer.rejection_reason}
            </span>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
