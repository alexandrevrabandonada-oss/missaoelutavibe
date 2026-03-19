/**
 * RegistroDetailSheet – F4.2 + F15 Queue Mode + F16 Session Summary
 * 
 * Sheet lateral com detalhes completos de um registro da célula.
 * Reutiliza useCoordInlineValidation para ações.
 * F15: navegação sequencial (prev/next) e auto-avanço após ação.
 * F16: session counters + enhanced queue completion with summary & CTAs.
 */

import { CoordCriteriaRef } from "@/components/coordinator/CoordCriteriaRef";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SecureImage } from "@/components/ui/SecureImage";
import {
  REGISTRO_STATUS_LABELS,
  type CelulaRegistro,
  type RegistroStatus,
} from "@/hooks/useCoordCelulaRegistros";
import { useCoordInlineValidation } from "@/hooks/useCoordInlineValidation";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Image as ImageIcon,
  Loader2,
  MapPin,
  MessageSquare,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Status config ────────────────────────────────────────

const STATUS_VARIANT: Record<RegistroStatus, "default" | "secondary" | "outline" | "destructive"> = {
  enviado: "secondary",
  precisa_ajuste: "outline",
  validado: "default",
  rejeitado: "destructive",
};

const ACTIONABLE: RegistroStatus[] = ["enviado", "precisa_ajuste"];

// ─── Types ────────────────────────────────────────────────

export interface SessionCounts {
  validado: number;
  ajuste: number;
  rejeitado: number;
}

interface Props {
  registro: CelulaRegistro | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  celulaId: string;
  validation: ReturnType<typeof useCoordInlineValidation>;
  // F15: Queue mode
  queueMode?: boolean;
  queuePosition?: number;
  queueTotal?: number;
  onNavigate?: (direction: "prev" | "next") => void;
  onAfterAction?: () => void;
  // F16: Session summary
  onActionTaken?: (action: "validado" | "ajuste" | "rejeitado") => void;
  sessionCounts?: SessionCounts;
  otherQueueCounts?: { enviado: number; precisa_ajuste: number };
  onSwitchFilter?: (status: RegistroStatus) => void;
}

type ActionMode = "adjust" | "reject" | null;
type ValidateMode = "quick" | "with-feedback";


// ─── Queue Completion Summary ─────────────────────────────

function QueueCompletionSummary({
  sessionCounts,
  otherQueueCounts,
  onClose,
  onSwitchFilter,
}: {
  sessionCounts: SessionCounts;
  otherQueueCounts?: { enviado: number; precisa_ajuste: number };
  onClose: () => void;
  onSwitchFilter?: (status: RegistroStatus) => void;
}) {
  const total = sessionCounts.validado + sessionCounts.ajuste + sessionCounts.rejeitado;
  const hasOtherPending = (otherQueueCounts?.enviado ?? 0) > 0;
  const hasOtherAdjust = (otherQueueCounts?.precisa_ajuste ?? 0) > 0;

  return (
    <div className="flex flex-col items-center justify-center gap-5 py-8 px-4">
      <div className="rounded-full bg-primary/10 p-4">
        <Check className="h-8 w-8 text-primary" />
      </div>
      <div className="text-center space-y-1">
        <h3 className="text-base font-semibold text-foreground">Fila concluída</h3>
        <p className="text-sm text-muted-foreground">
          Todos os registros deste filtro foram processados.
        </p>
      </div>

      {/* Session summary */}
      {total > 0 && (
        <div className="w-full rounded-lg border border-border bg-muted/30 p-4 space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            Resumo da sessão
          </p>
          <div className="flex gap-4 justify-center">
            {sessionCounts.validado > 0 && (
              <div className="text-center">
                <p className="text-lg font-bold text-emerald-500">{sessionCounts.validado}</p>
                <p className="text-[11px] text-muted-foreground">Validado{sessionCounts.validado > 1 ? "s" : ""}</p>
              </div>
            )}
            {sessionCounts.ajuste > 0 && (
              <div className="text-center">
                <p className="text-lg font-bold text-amber-500">{sessionCounts.ajuste}</p>
                <p className="text-[11px] text-muted-foreground">Ajuste{sessionCounts.ajuste > 1 ? "s" : ""}</p>
              </div>
            )}
            {sessionCounts.rejeitado > 0 && (
              <div className="text-center">
                <p className="text-lg font-bold text-destructive">{sessionCounts.rejeitado}</p>
                <p className="text-[11px] text-muted-foreground">Rejeitado{sessionCounts.rejeitado > 1 ? "s" : ""}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CTAs */}
      <div className="w-full space-y-2">
        {hasOtherPending && onSwitchFilter && (
          <Button
            variant="default"
            className="w-full gap-2"
            size="sm"
            onClick={() => onSwitchFilter("enviado")}
          >
            Ver {otherQueueCounts!.enviado} pendente{otherQueueCounts!.enviado > 1 ? "s" : ""}
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        )}
        {hasOtherAdjust && onSwitchFilter && (
          <Button
            variant="outline"
            className="w-full gap-2"
            size="sm"
            onClick={() => onSwitchFilter("precisa_ajuste")}
          >
            Ver {otherQueueCounts!.precisa_ajuste} ajuste{otherQueueCounts!.precisa_ajuste > 1 ? "s" : ""} parado{otherQueueCounts!.precisa_ajuste > 1 ? "s" : ""}
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button variant="ghost" className="w-full" size="sm" onClick={onClose}>
          ← Voltar aos filtros
        </Button>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────

export function RegistroDetailSheet({
  registro,
  open,
  onOpenChange,
  celulaId,
  validation,
  queueMode = false,
  queuePosition = 0,
  queueTotal = 0,
  onNavigate,
  onAfterAction,
  onActionTaken,
  sessionCounts = { validado: 0, ajuste: 0, rejeitado: 0 },
  otherQueueCounts,
  onSwitchFilter,
}: Props) {
  const [actionMode, setActionMode] = useState<ActionMode>(null);
  const [validateMode, setValidateMode] = useState<ValidateMode | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [feedbackValue, setFeedbackValue] = useState("");

  // Reset action mode when registro changes (queue navigation)
  useEffect(() => {
    setActionMode(null);
    setValidateMode(null);
    setInputValue("");
    setFeedbackValue("");
  }, [registro?.id]);

  // Queue empty state — F16 enhanced
  if (open && queueMode && !registro) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-md">
          <QueueCompletionSummary
            sessionCounts={sessionCounts}
            otherQueueCounts={otherQueueCounts}
            onClose={() => onOpenChange(false)}
            onSwitchFilter={onSwitchFilter}
          />
        </SheetContent>
      </Sheet>
    );
  }

  if (!registro) return null;

  const status = registro.status as RegistroStatus;
  const isActionable = ACTIONABLE.includes(status);
  const isThisActive = validation.activeId === registro.id;
  const isBusy = isThisActive && (validation.isValidating || validation.isAdjusting || validation.isRejecting);
  const mediaItems = registro.media_urls?.filter(Boolean) ?? [];

  const handleValidate = async (feedback?: string) => {
    await validation.validate(registro.id, feedback || undefined);
    onActionTaken?.("validado");
    setValidateMode(null);
    setFeedbackValue("");
    onAfterAction?.();
  };

  const handleSubmitAction = async () => {
    if (!inputValue.trim()) return;
    if (actionMode === "adjust") {
      await validation.requestAdjust(registro.id, inputValue);
      onActionTaken?.("ajuste");
    } else if (actionMode === "reject") {
      await validation.reject(registro.id, inputValue);
      onActionTaken?.("rejeitado");
    }
    setActionMode(null);
    setInputValue("");
    onAfterAction?.();
  };

  const handleCancel = () => {
    setActionMode(null);
    setValidateMode(null);
    setInputValue("");
    setFeedbackValue("");
  };

  const fmtDate = (d: string | null) =>
    d ? format(new Date(d), "dd MMM yyyy · HH:mm", { locale: ptBR }) : null;

  const canPrev = queueMode && queuePosition > 1;
  const canNext = queueMode && queuePosition < queueTotal;

  return (
    <Sheet open={open} onOpenChange={(v) => {
      if (!v) { handleCancel(); }
      onOpenChange(v);
    }}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4">
          {/* F15: Queue nav bar */}
          {queueMode && queueTotal > 0 && (
            <div className="flex items-center justify-between mb-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs"
                disabled={!canPrev || isBusy}
                onClick={() => onNavigate?.("prev")}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Anterior
              </Button>
              <span className="text-xs text-muted-foreground font-medium">
                {queuePosition} / {queueTotal}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs"
                disabled={!canNext || isBusy}
                onClick={() => onNavigate?.("next")}
              >
                Próximo
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          <div className="flex items-start gap-2">
            <SheetTitle className="text-base font-semibold flex-1 leading-snug">
              {registro.mission_title || "Missão"}
            </SheetTitle>
            <Badge variant={STATUS_VARIANT[status] ?? "secondary"} className="shrink-0 text-[10px]">
              {REGISTRO_STATUS_LABELS[status] || status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {registro.safe_name} · {fmtDate(registro.created_at)}
          </p>
        </SheetHeader>

        <div className="space-y-5 pb-6">
          {/* ── Resumo ── */}
          {registro.resumo && (
            <Section icon={FileText} title="Resumo">
              <p className="text-sm text-foreground whitespace-pre-wrap">{registro.resumo}</p>
            </Section>
          )}

          {/* ── Local ── */}
          {registro.local_texto && (
            <Section icon={MapPin} title="Local">
              <p className="text-sm text-foreground">{registro.local_texto}</p>
            </Section>
          )}

          {/* ── Relato ── */}
          {registro.relato_texto && (
            <Section icon={MessageSquare} title="Relato">
              <p className="text-sm text-foreground whitespace-pre-wrap">{registro.relato_texto}</p>
            </Section>
          )}

          {/* ── Mídia ── */}
          {mediaItems.length > 0 && (
            <Section icon={ImageIcon} title={`Mídia (${mediaItems.length})`}>
              <div className="grid grid-cols-2 gap-2">
                {mediaItems.map((url, i) => (
                  <SecureImage
                    key={i}
                    bucket="evidences"
                    pathOrUrl={url}
                    alt={`Evidência ${i + 1}`}
                    className="rounded-md w-full aspect-square object-cover border border-border"
                  />
                ))}
              </div>
            </Section>
          )}

          {/* ── Coord feedback (validated) ── */}
          {registro.coord_feedback && (
            <div className="rounded-md border border-emerald-500/20 bg-emerald-500/[0.04] p-3">
              <p className="text-xs font-medium text-emerald-400 mb-1 flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" />
                Retorno da coordenação
              </p>
              <p className="text-sm text-foreground italic">"{registro.coord_feedback}"</p>
            </div>
          )}

          {/* ── Orientação de ajuste ── */}
          {registro.how_to_fix && (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
              <p className="text-xs font-medium text-amber-400 mb-1 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                O que precisa melhorar
              </p>
              <p className="text-sm text-foreground">{registro.how_to_fix}</p>
            </div>
          )}

          {/* ── Motivo de rejeição ── */}
          {registro.rejection_reason && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-xs font-medium text-destructive mb-1 flex items-center gap-1.5">
                <X className="h-3.5 w-3.5" />
                Por que não foi validado
              </p>
              <p className="text-sm text-foreground">{registro.rejection_reason}</p>
            </div>
          )}

          <Separator />

          {/* ── F21: Criteria reference for coordinator ── */}
          {isActionable && registro.mission_type && (
            <CoordCriteriaRef missionType={registro.mission_type} />
          )}

          <Separator />
          <Section icon={Clock} title="Timeline">
            <div className="space-y-2">
              <TimelineItem label="Enviado em" value={fmtDate(registro.created_at)} />
              {registro.validated_at && (
                <TimelineItem
                  label={
                    status === "validado" ? "Validado em" :
                    status === "rejeitado" ? "Rejeitado em" :
                    status === "precisa_ajuste" ? "Ajuste solicitado em" :
                    "Processado em"
                  }
                  value={fmtDate(registro.validated_at)}
                  sublabel={registro.validated_by ? `por coordenação` : undefined}
                />
              )}
            </div>
          </Section>

          <Separator />

          {/* ── Actions ── */}
          {isActionable && (
            <div className="space-y-3">
              {validateMode ? (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-foreground">
                    Retorno rápido <span className="text-muted-foreground font-normal">(opcional)</span>
                  </label>
                  <Input
                    value={feedbackValue}
                    onChange={(e) => setFeedbackValue(e.target.value)}
                    placeholder="Ex: Boa objetividade no resumo"
                    className="h-9 text-sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleValidate(feedbackValue);
                      if (e.key === "Escape") handleCancel();
                    }}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Esse retorno aparece no recibo do voluntário. Deixe vazio para validar sem comentário.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      disabled={isBusy}
                      onClick={() => handleValidate(feedbackValue)}
                    >
                      {isBusy && validation.isValidating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 mr-1" />
                      )}
                      Validar{feedbackValue.trim() ? " com retorno" : ""}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleCancel} disabled={isBusy}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : actionMode ? (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-foreground">
                    {actionMode === "adjust" ? "O que precisa melhorar:" : "Por que não pode ser validado:"}
                  </label>
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={
                      actionMode === "adjust"
                        ? "Ex: Adicione uma foto ou detalhe melhor o relato"
                        : "Ex: Registro não corresponde à missão indicada"
                    }
                    className="h-9 text-sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && inputValue.trim()) handleSubmitAction();
                      if (e.key === "Escape") handleCancel();
                    }}
                  />
                  {actionMode === "adjust" && (
                    <p className="text-[10px] text-muted-foreground">
                      Escreva de forma prática — o voluntário vai ler isso para saber como melhorar.
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      disabled={!inputValue.trim() || isBusy}
                      onClick={handleSubmitAction}
                    >
                      {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleCancel} disabled={isBusy}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 gap-1.5"
                      disabled={isBusy}
                      onClick={() => handleValidate()}
                    >
                      {isBusy && validation.isValidating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Validar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      disabled={isBusy}
                      onClick={() => setActionMode("adjust")}
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Ajuste
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-destructive hover:text-destructive"
                      disabled={isBusy}
                      onClick={() => setActionMode("reject")}
                    >
                      <X className="h-3.5 w-3.5" />
                      Rejeitar
                    </Button>
                  </div>
                  <button
                    className="text-[11px] text-muted-foreground hover:text-foreground transition-colors w-full text-center"
                    onClick={() => setValidateMode("with-feedback")}
                  >
                    Validar com retorno para o voluntário →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Helpers ──────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </p>
      {children}
    </div>
  );
}

function TimelineItem({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string | null;
  sublabel?: string;
}) {
  if (!value) return null;
  return (
    <div className="flex items-baseline gap-2 text-sm">
      <span className="text-muted-foreground text-xs w-32 shrink-0">{label}</span>
      <span className="text-foreground text-xs">{value}</span>
      {sublabel && <span className="text-muted-foreground text-[10px]">({sublabel})</span>}
    </div>
  );
}
