import { usePendingStatus } from "@/hooks/useRequireApproval";
import { Clock, XCircle, AlertCircle } from "lucide-react";

interface PendingUserBannerProps {
  className?: string;
}

/**
 * Banner component to show pending user status.
 * Only visible to users who are PENDENTE or RECUSADO.
 */
export function PendingUserBanner({ className = "" }: PendingUserBannerProps) {
  const { isPending, isRejected, rejectionReason, isLoading } = usePendingStatus();

  if (isLoading || (!isPending && !isRejected)) {
    return null;
  }

  if (isRejected) {
    return (
      <div className={`card-luta bg-destructive/10 border-destructive/30 ${className}`}>
        <div className="flex items-start gap-3">
          <XCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-destructive">Cadastro Não Aprovado</p>
            <p className="text-sm text-muted-foreground mt-1">
              Seu cadastro não foi aprovado pela coordenação.
            </p>
            {rejectionReason && (
              <p className="text-sm text-destructive/80 mt-2">
                <strong>Motivo:</strong> {rejectionReason}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Entre em contato com a coordenação se acredita que houve um erro.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`card-luta bg-warning/10 border-warning/30 ${className}`}>
      <div className="flex items-start gap-3">
        <Clock className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-warning">Status: Aguardando aprovação</p>
          <p className="text-sm text-muted-foreground mt-1">
            Você está no modo leitura. Assim que aprovado, você terá acesso às missões e ferramentas.
          </p>
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Nossa equipe está verificando seu cadastro.
          </p>
        </div>
      </div>
    </div>
  );
}
