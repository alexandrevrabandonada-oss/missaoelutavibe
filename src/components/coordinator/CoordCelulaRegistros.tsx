/**
 * CoordCelulaRegistros - Tab "Registros" do hub de coordenação da célula (F4.1 + F4.2)
 * 
 * Inline actions: validar, pedir ajuste, rejeitar.
 * "Ver →" CTA opens RegistroDetailSheet.
 * Scoped validation via useCoordInlineValidation.
 * Safe identity (first name + initial).
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCoordCelulaRegistros,
  REGISTRO_STATUS_LABELS,
  type RegistroStatus,
  type CelulaRegistro,
} from "@/hooks/useCoordCelulaRegistros";
import { useCoordInlineValidation } from "@/hooks/useCoordInlineValidation";
import { RegistroDetailSheet } from "./RegistroDetailSheet";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  ClipboardList,
  Eye,
  FileText,
  Loader2,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Constants ────────────────────────────────────────────

const FILTERS: Array<{ key: RegistroStatus | "todos"; label: string }> = [
  { key: "todos", label: "Todos" },
  { key: "enviado", label: "Enviado" },
  { key: "precisa_ajuste", label: "Ajuste" },
  { key: "validado", label: "Validado" },
  { key: "rejeitado", label: "Rejeitado" },
];

const STATUS_CLASSES: Record<RegistroStatus, string> = {
  enviado: "text-[10px]",
  precisa_ajuste: "border-amber-500/50 text-amber-400 text-[10px]",
  validado: "text-emerald-400 text-[10px]",
  rejeitado: "text-destructive text-[10px]",
};

const ACTIONABLE_STATUSES: RegistroStatus[] = ["enviado", "precisa_ajuste"];

// ─── Inline Action Panel ──────────────────────────────────

type ActionMode = "adjust" | "reject" | null;

function InlineActionPanel({
  registro,
  validation,
}: {
  registro: CelulaRegistro;
  validation: ReturnType<typeof useCoordInlineValidation>;
}) {
  const [actionMode, setActionMode] = useState<ActionMode>(null);
  const [inputValue, setInputValue] = useState("");

  const isThisActive = validation.activeId === registro.id;
  const isBusy = isThisActive && (validation.isValidating || validation.isAdjusting || validation.isRejecting);
  const isActionable = ACTIONABLE_STATUSES.includes(registro.status as RegistroStatus);

  if (!isActionable) return null;

  const handleValidate = async () => {
    await validation.validate(registro.id);
  };

  const handleSubmitAction = async () => {
    if (!inputValue.trim()) return;
    if (actionMode === "adjust") {
      await validation.requestAdjust(registro.id, inputValue);
    } else if (actionMode === "reject") {
      await validation.reject(registro.id, inputValue);
    }
    setActionMode(null);
    setInputValue("");
  };

  const handleCancel = () => {
    setActionMode(null);
    setInputValue("");
  };

  if (actionMode) {
    return (
      <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
        <label className="text-xs font-medium text-foreground">
          {actionMode === "adjust" ? "Como corrigir:" : "Motivo da rejeição:"}
        </label>
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={
              actionMode === "adjust"
                ? "Ex: Foto ilegível, envie novamente"
                : "Ex: Registro fora do escopo da missão"
            }
            className="h-8 text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && inputValue.trim()) handleSubmitAction();
              if (e.key === "Escape") handleCancel();
            }}
          />
          <Button
            size="sm"
            className="h-8 shrink-0"
            disabled={!inputValue.trim() || isBusy}
            onClick={handleSubmitAction}
          >
            {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Enviar"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 shrink-0"
            onClick={handleCancel}
            disabled={isBusy}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 flex gap-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
      <Button
        size="sm"
        variant="default"
        className="h-7 text-xs gap-1"
        disabled={isBusy}
        onClick={handleValidate}
      >
        {isBusy && validation.isValidating ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Check className="h-3 w-3" />
        )}
        Validar
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-xs gap-1"
        disabled={isBusy}
        onClick={() => setActionMode("adjust")}
      >
        <AlertTriangle className="h-3 w-3" />
        Pedir ajuste
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
        disabled={isBusy}
        onClick={() => setActionMode("reject")}
      >
        <X className="h-3 w-3" />
        Rejeitar
      </Button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────

interface Props {
  celulaId: string;
  /** Optional initial status filter from URL param */
  initialStatus?: string;
}

export function CoordCelulaRegistros({ celulaId, initialStatus }: Props) {
  const validStatuses = ["enviado", "precisa_ajuste", "validado", "rejeitado"];
  const resolvedInitial: RegistroStatus | "todos" =
    initialStatus && validStatuses.includes(initialStatus)
      ? (initialStatus as RegistroStatus)
      : "todos";

  const [activeFilter, setActiveFilter] = useState<RegistroStatus | "todos">(resolvedInitial);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { data, isLoading, isError } = useCoordCelulaRegistros(celulaId);
  const validation = useCoordInlineValidation(celulaId);

  // F16: Session counters (reset on filter change)
  const sessionCountsRef = useRef({ validado: 0, ajuste: 0, rejeitado: 0 });

  const handleActionTaken = useCallback((action: "validado" | "ajuste" | "rejeitado") => {
    sessionCountsRef.current[action]++;
  }, []);

  // Reset session counters when filter changes
  useEffect(() => {
    sessionCountsRef.current = { validado: 0, ajuste: 0, rejeitado: 0 };
  }, [activeFilter]);

  // Sync filter when URL param changes (e.g. navigating from pulse card)
  useEffect(() => {
    if (initialStatus && validStatuses.includes(initialStatus)) {
      setActiveFilter(initialStatus as RegistroStatus);
    }
  }, [initialStatus]);

  const records = data?.records ?? [];
  const counts = data?.counts ?? { enviado: 0, precisa_ajuste: 0, validado: 0, rejeitado: 0, total: 0 };

  const filtered = activeFilter === "todos"
    ? records
    : records.filter((r) => r.status === activeFilter);

  const selectedRegistro = selectedIndex >= 0 && selectedIndex < filtered.length
    ? filtered[selectedIndex]
    : null;

  const isQueueMode = activeFilter === "enviado" || activeFilter === "precisa_ajuste";

  const handleOpenDetail = (registro: CelulaRegistro) => {
    const idx = filtered.findIndex((r) => r.id === registro.id);
    setSelectedIndex(idx);
    setSheetOpen(true);
  };

  const handleNavigate = (direction: "prev" | "next") => {
    const next = direction === "next" ? selectedIndex + 1 : selectedIndex - 1;
    if (next >= 0 && next < filtered.length) {
      setSelectedIndex(next);
    }
  };

  const handleAfterAction = () => {
    // After action, the current record will disappear from filtered list on refetch.
    // Stay on same index (next item slides into position) or close if queue ends.
    // We keep the sheet open; the parent query will refetch and the filtered list updates.
    // Use a small delay so the query refetches first.
    if (!isQueueMode) {
      setSheetOpen(false);
      return;
    }
    // Keep sheet open — selectedIndex stays, next record slides into place after refetch
  };

  if (isError) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">Erro ao carregar registros.</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-16" />
          ))}
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(({ key, label }) => {
          const count = key === "todos" ? counts.total : counts[key];
          const isActive = activeFilter === key;
          return (
            <Button
              key={key}
              variant={isActive ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => setActiveFilter(key)}
            >
              {label}
              {count > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                  isActive ? "bg-primary-foreground/20" : "bg-muted"
                }`}>
                  {count}
                </span>
              )}
            </Button>
          );
        })}
      </div>

      {/* Records list */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center">
          <FileText className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            {activeFilter === "todos"
              ? "Nenhum registro encontrado nesta célula"
              : `Nenhum registro com status "${REGISTRO_STATUS_LABELS[activeFilter]}"`}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {filtered.map((registro) => {
              const isActionable = ACTIONABLE_STATUSES.includes(registro.status as RegistroStatus);
              const isBeingProcessed = validation.activeId === registro.id;

              return (
                <div
                  key={registro.id}
                  className={`p-3 rounded-lg border transition-colors ${
                    isBeingProcessed
                      ? "border-primary/40 bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  {/* Row: info + status + "Ver" CTA */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenDetail(registro)}
                          className="text-sm font-medium text-foreground truncate hover:underline text-left"
                        >
                          {registro.safe_name}
                        </button>
                        <span className="text-xs text-muted-foreground">·</span>
                        <p className="text-xs text-muted-foreground truncate">
                          {registro.mission_title || "Missão"}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(registro.created_at), "dd MMM · HH:mm", { locale: ptBR })}
                        {registro.resumo && ` — ${registro.resumo.slice(0, 40)}${registro.resumo.length > 40 ? "…" : ""}`}
                      </p>
                    </div>
                    <Badge
                      variant={registro.status === "precisa_ajuste" || registro.status === "rejeitado" ? "outline" : "secondary"}
                      className={STATUS_CLASSES[registro.status as RegistroStatus] || "text-[10px]"}
                    >
                      {REGISTRO_STATUS_LABELS[registro.status as RegistroStatus] || registro.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1 shrink-0"
                      onClick={() => handleOpenDetail(registro)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Ver
                    </Button>
                  </div>

                  {/* Inline actions for actionable statuses */}
                  <InlineActionPanel
                    registro={registro}
                    validation={validation}
                  />
                </div>
              );
            })}
          </div>

          {/* Context hints */}
          <div className="flex items-center justify-between pt-2">
            <p className="text-[11px] text-muted-foreground">
              Últimos {counts.total} registros
            </p>
            {counts.total >= 100 && (
              <Link to="/admin/validar">
                <Button variant="link" size="sm" className="h-auto p-0 text-xs">
                  Fila completa →
                </Button>
              </Link>
            )}
          </div>
        </>
      )}

      {/* Detail sheet */}
      <RegistroDetailSheet
        registro={selectedRegistro}
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) setSelectedIndex(-1);
        }}
        celulaId={celulaId}
        validation={validation}
        queueMode={isQueueMode}
        queuePosition={selectedIndex + 1}
        queueTotal={filtered.length}
        onNavigate={handleNavigate}
        onAfterAction={handleAfterAction}
        onActionTaken={handleActionTaken}
        sessionCounts={sessionCountsRef.current}
        otherQueueCounts={{
          enviado: activeFilter !== "enviado" ? counts.enviado : 0,
          precisa_ajuste: activeFilter !== "precisa_ajuste" ? counts.precisa_ajuste : 0,
        }}
        onSwitchFilter={(status) => {
          setActiveFilter(status);
          setSheetOpen(false);
          setSelectedIndex(-1);
        }}
      />
    </div>
  );
}
