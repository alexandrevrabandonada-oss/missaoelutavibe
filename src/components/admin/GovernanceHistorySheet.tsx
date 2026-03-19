/**
 * Governance History Sheet v0
 * 
 * Reusable sheet component to display audit history for governance entities
 * Mobile-first, accessible design
 */

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { focusRingClass } from "@/utils/a11y";
import { 
  useEntityAudit, 
  GovernanceEntityType, 
  GovernanceAuditEntry,
  ACTION_LABELS,
  ENTITY_TYPE_LABELS,
  formatStatus,
  formatAuditDate,
} from "@/hooks/useGovernanceAudit";
import { 
  Clock, 
  User, 
  ArrowRight, 
  FileText,
  AlertCircle,
  CheckCircle,
  Archive,
  Send,
  Share2,
  Trash2,
  Edit,
  Plus,
} from "lucide-react";

interface GovernanceHistorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: GovernanceEntityType;
  entityId: string | null;
  entityTitle?: string;
}

// Icon mapping for actions
const ACTION_ICONS: Record<string, React.ReactNode> = {
  status_change: <ArrowRight className="h-4 w-4" />,
  created: <Plus className="h-4 w-4" />,
  updated: <Edit className="h-4 w-4" />,
  deleted: <Trash2 className="h-4 w-4" />,
  published_to_mural: <Share2 className="h-4 w-4" />,
  approved: <CheckCircle className="h-4 w-4" />,
  archived: <Archive className="h-4 w-4" />,
  requested_review: <Send className="h-4 w-4" />,
  accepted: <CheckCircle className="h-4 w-4" />,
  rejected: <AlertCircle className="h-4 w-4" />,
};

// Color mapping for status badges
function getStatusColor(status: string | null): string {
  if (!status) return "bg-muted text-muted-foreground";
  const colors: Record<string, string> = {
    rascunho: "bg-gray-100 text-gray-800",
    revisao: "bg-yellow-100 text-yellow-800",
    aprovado: "bg-green-100 text-green-800",
    arquivado: "bg-red-100 text-red-800",
    aberto: "bg-blue-100 text-blue-800",
    em_andamento: "bg-purple-100 text-purple-800",
    fechado: "bg-gray-100 text-gray-800",
    pendente: "bg-yellow-100 text-yellow-800",
    aceito: "bg-green-100 text-green-800",
    recusado: "bg-red-100 text-red-800",
    enviado: "bg-blue-100 text-blue-800",
    retirado: "bg-gray-100 text-gray-800",
  };
  return colors[status] || "bg-muted text-muted-foreground";
}

function AuditEntryCard({ entry }: { entry: GovernanceAuditEntry }) {
  const showStatusChange = entry.action === "status_change" && (entry.old_status || entry.new_status);

  return (
    <article 
      className={`p-3 border rounded-lg bg-card ${focusRingClass}`}
      role="listitem"
      tabIndex={0}
      aria-label={`${ACTION_LABELS[entry.action]} por ${entry.actor_nickname} ${formatAuditDate(entry.created_at)}`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 p-2 rounded-full bg-muted">
          {ACTION_ICONS[entry.action] || <FileText className="h-4 w-4" />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="font-medium text-sm">
              {ACTION_LABELS[entry.action]}
            </span>
            <time 
              dateTime={entry.created_at}
              className="text-xs text-muted-foreground flex items-center gap-1"
            >
              <Clock className="h-3 w-3" aria-hidden="true" />
              {formatAuditDate(entry.created_at)}
            </time>
          </div>

          {/* Status change visualization */}
          {showStatusChange && (
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge className={`text-xs ${getStatusColor(entry.old_status)}`}>
                {formatStatus(entry.old_status)}
              </Badge>
              <ArrowRight className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
              <Badge className={`text-xs ${getStatusColor(entry.new_status)}`}>
                {formatStatus(entry.new_status)}
              </Badge>
            </div>
          )}

          {/* Actor info */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3" aria-hidden="true" />
            <span>{entry.actor_nickname || "Sistema"}</span>
          </div>

          {/* Meta info (if relevant) */}
          {entry.meta && Object.keys(entry.meta).length > 0 && entry.meta.titulo && (
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {entry.meta.titulo || entry.meta.chamado_titulo}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

export function GovernanceHistorySheet({
  open,
  onOpenChange,
  entityType,
  entityId,
  entityTitle,
}: GovernanceHistorySheetProps) {
  const { data: auditEntries, isLoading, error } = useEntityAudit(entityType, entityId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        className="w-full sm:max-w-md" 
        side="right"
        aria-describedby="history-description"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" aria-hidden="true" />
            Histórico
          </SheetTitle>
          <p id="history-description" className="text-sm text-muted-foreground">
            {ENTITY_TYPE_LABELS[entityType]}
            {entityTitle && `: ${entityTitle}`}
          </p>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] mt-4 pr-4">
          {isLoading ? (
            <div className="flex justify-center py-8" aria-live="polite">
              <LoadingSpinner />
              <span className="sr-only">Carregando histórico...</span>
            </div>
          ) : error ? (
            <div 
              className="text-center py-8 text-muted-foreground"
              role="alert"
            >
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" aria-hidden="true" />
              <p>Erro ao carregar histórico</p>
            </div>
          ) : !auditEntries || auditEntries.length === 0 ? (
            <div 
              className="text-center py-8 text-muted-foreground"
              role="status"
            >
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" aria-hidden="true" />
              <p>Nenhuma ação registrada</p>
            </div>
          ) : (
            <div 
              className="space-y-3" 
              role="list" 
              aria-label="Lista de ações"
            >
              {auditEntries.map((entry) => (
                <AuditEntryCard key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
