import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useEvidences, type EvidenceWithMission } from "@/hooks/useEvidences";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useCells } from "@/hooks/useCells";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { SecureImageLink } from "@/components/ui/SecureImage";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PreCampaignBadge } from "@/components/ui/PreCampaignBadge";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileText,
  AlertCircle,
  Filter,
  Info,
} from "lucide-react";

export default function AdminValidarPanelWithFilters() {
  const { pendingEvidences, isLoading, approve, reject } = useEvidences();
  const { isAdmin, getScope } = useUserRoles();
  const { cells } = useCells();
  const scope = getScope();
  
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [howToFix, setHowToFix] = useState("");
  
  // Filters
  const [cellFilter, setCellFilter] = useState<string>("all");

  // Filter evidences based on scope
  const filteredEvidences = useMemo(() => {
    let filtered = pendingEvidences;
    
    // Filter by cell if selected
    if (cellFilter !== "all") {
      // Type assertion to access cell_id
      filtered = filtered.filter(e => {
        const mission = e.missions as { title: string; type: string; cell_id?: string } | null;
        return mission?.cell_id === cellFilter;
      });
    }
    
    return filtered;
  }, [pendingEvidences, cellFilter]);

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      await approve(id);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectionReason.trim()) return;
    
    setProcessingId(id);
    try {
      await reject(id, rejectionReason, howToFix);
      setRejectingId(null);
      setRejectionReason("");
      setHowToFix("");
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-primary mb-2">
            <Clock className="h-5 w-5" />
            <span className="text-sm uppercase tracking-wider font-bold">Validação de Evidências</span>
          </div>
          <h2 className="text-2xl font-bold">Pendentes de Revisão</h2>
        </div>
        <PreCampaignBadge />
      </div>

      {/* Filters */}
      <div className="card-luta">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filtros de Escopo</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Célula</label>
            <Select value={cellFilter} onValueChange={setCellFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as células" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as células</SelectItem>
                {cells.map(cell => (
                  <SelectItem key={cell.id} value={cell.id}>
                    {cell.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Hint for CELL_COORD */}
      {scope.type === "celula" && scope.cellId && (
        <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 px-3 py-2.5">
          <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Para registros da sua célula, a aba Registros dentro da célula é mais rápida.{" "}
            <Link
              to={`/voluntario/celula/${scope.cellId}`}
              className="text-primary hover:underline font-medium"
            >
              Ir para minha célula →
            </Link>
          </p>
        </div>
      )}

      {/* List */}
      {filteredEvidences.length === 0 ? (
        <div className="card-luta text-center py-12">
          <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-4" />
          <p className="font-bold text-lg">Tudo validado!</p>
          <p className="text-muted-foreground">
            {pendingEvidences.length === 0 
              ? "Nenhuma evidência pendente."
              : "Nenhuma evidência nos filtros selecionados."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {filteredEvidences.length} evidência{filteredEvidences.length > 1 ? "s" : ""} pendente{filteredEvidences.length > 1 ? "s" : ""}
          </p>
          {filteredEvidences.map((evidence) => (
            <EvidenceCard
              key={evidence.id}
              evidence={evidence}
              isProcessing={processingId === evidence.id}
              isRejecting={rejectingId === evidence.id}
              rejectionReason={rejectionReason}
              howToFix={howToFix}
              onReasonChange={setRejectionReason}
              onHowToFixChange={setHowToFix}
              onApprove={() => handleApprove(evidence.id)}
              onReject={() => handleReject(evidence.id)}
              onStartReject={() => setRejectingId(evidence.id)}
              onCancelReject={() => {
                setRejectingId(null);
                setRejectionReason("");
                setHowToFix("");
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EvidenceCard({
  evidence,
  isProcessing,
  isRejecting,
  rejectionReason,
  howToFix,
  onReasonChange,
  onHowToFixChange,
  onApprove,
  onReject,
  onStartReject,
  onCancelReject,
}: {
  evidence: EvidenceWithMission;
  isProcessing: boolean;
  isRejecting: boolean;
  rejectionReason: string;
  howToFix: string;
  onReasonChange: (value: string) => void;
  onHowToFixChange: (value: string) => void;
  onApprove: () => void;
  onReject: () => void;
  onStartReject: () => void;
  onCancelReject: () => void;
}) {
  return (
    <div className="card-luta">
      {/* Mission Info */}
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 rounded-lg bg-secondary">
          <FileText className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="font-bold">{evidence.missions?.title || "Missão"}</p>
          <p className="text-sm text-muted-foreground">
            Tipo: {evidence.missions?.type || "N/A"}
          </p>
          <p className="text-xs text-muted-foreground">
            Enviada em: {new Date(evidence.created_at).toLocaleDateString("pt-BR")}
          </p>
        </div>
      </div>

      {/* Evidence Content */}
      <div className="bg-secondary/50 rounded-lg p-4 mb-4">
        <p className="text-sm font-medium mb-2">Evidência enviada:</p>
        
        {/* Text content */}
        {evidence.content_text && (
          <p className="text-sm mb-3 whitespace-pre-wrap">{evidence.content_text}</p>
        )}
        
        {/* Images - Using signed URLs for private storage */}
        {evidence.content_url && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {evidence.content_url.split(",").map((pathOrUrl, index) => (
              <SecureImageLink
                key={index}
                bucket="evidences"
                pathOrUrl={pathOrUrl.trim()}
                alt={`Evidência ${index + 1}`}
                className="rounded-lg w-full h-32 object-cover hover:opacity-80 transition-opacity border border-border"
                fallbackClassName="rounded-lg w-full h-32"
              />
            ))}
          </div>
        )}
        
        {!evidence.content_text && !evidence.content_url && (
          <p className="text-sm text-muted-foreground">Sem conteúdo</p>
        )}
      </div>

      {/* Rejection Form */}
      {isRejecting ? (
        <div className="space-y-3 mb-4">
          <div>
            <label className="text-sm font-medium mb-1 block">
              <AlertCircle className="h-4 w-4 inline mr-1" />
              Motivo da reprovação *
            </label>
            <Textarea
              value={rejectionReason}
              onChange={(e) => onReasonChange(e.target.value)}
              placeholder="Explique porque a evidência não foi aceita..."
              className="min-h-[80px]"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">
              Como corrigir (opcional)
            </label>
            <Textarea
              value={howToFix}
              onChange={(e) => onHowToFixChange(e.target.value)}
              placeholder="Dê orientações de como o voluntário pode refazer..."
              className="min-h-[60px]"
            />
          </div>
        </div>
      ) : null}

      {/* Actions */}
      <div className="flex gap-2">
        {isRejecting ? (
          <>
            <Button
              variant="outline"
              className="flex-1"
              onClick={onCancelReject}
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={onReject}
              disabled={isProcessing || !rejectionReason.trim()}
            >
              {isProcessing ? <LoadingSpinner size="sm" /> : (
                <>
                  <XCircle className="h-4 w-4 mr-1" />
                  Confirmar Reprovação
                </>
              )}
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="outline"
              className="flex-1 border-destructive/50 text-destructive hover:bg-destructive/10"
              onClick={onStartReject}
              disabled={isProcessing}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Reprovar
            </Button>
            <Button
              className="flex-1"
              onClick={onApprove}
              disabled={isProcessing}
            >
              {isProcessing ? <LoadingSpinner size="sm" /> : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Aprovar
                </>
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
