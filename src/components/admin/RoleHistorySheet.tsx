/**
 * RoleHistorySheet - Shows audit history for role changes
 */

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { History, Shield, UserPlus, UserMinus, XCircle } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useScopedRoles, type RoleAuditEntry, ROLE_LABELS } from "@/hooks/useScopedRoles";
import { focusRingClass } from "@/utils/a11y";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName?: string;
}

export function RoleHistorySheet({ open, onOpenChange, userId, userName }: Props) {
  const { getRoleHistory } = useScopedRoles();
  const [history, setHistory] = useState<RoleAuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && userId) {
      setIsLoading(true);
      getRoleHistory(userId)
        .then(setHistory)
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [open, userId]);

  const getActionIcon = (action: string) => {
    switch (action) {
      case "grant":
        return <UserPlus className="h-4 w-4 text-green-500" />;
      case "revoke":
        return <UserMinus className="h-4 w-4 text-red-500" />;
      case "grant_denied":
      case "revoke_denied":
        return <XCircle className="h-4 w-4 text-amber-500" />;
      default:
        return <Shield className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case "grant":
        return "Atribuído";
      case "revoke":
        return "Revogado";
      case "grant_denied":
        return "Atribuição negada";
      case "revoke_denied":
        return "Revogação negada";
      default:
        return action;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Papéis
          </SheetTitle>
          <SheetDescription>
            {userName ? `Alterações de papéis para ${userName}` : "Histórico de alterações"}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] mt-4 pr-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Nenhum histórico encontrado</p>
            </div>
          ) : (
            <ul role="list" className="space-y-3">
              {history.map((entry) => (
                <li
                  key={entry.id}
                  role="listitem"
                  className={`border rounded-lg p-3 space-y-2 ${focusRingClass}`}
                  tabIndex={0}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {getActionIcon(entry.action)}
                      <span className="font-medium text-sm">
                        {getActionLabel(entry.action)}
                      </span>
                    </div>
                    <time className="text-xs text-muted-foreground">
                      {format(new Date(entry.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </time>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-xs">
                      {ROLE_LABELS[entry.role] || entry.role}
                    </Badge>
                    {entry.scope_type !== "—" && (
                      <Badge variant="secondary" className="text-xs">
                        {entry.scope_type}
                        {entry.scope_city !== "—" && `: ${entry.scope_city}`}
                      </Badge>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    <span>Por: {entry.actor_nickname}</span>
                    {entry.reason !== "—" && (
                      <span className="block mt-1 italic">"{entry.reason}"</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
