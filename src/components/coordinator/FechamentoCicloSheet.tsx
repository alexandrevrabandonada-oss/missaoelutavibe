/**
 * FechamentoCicloSheet - Sheet for closing an active cycle
 * F6.1: Stats read-only + synopsis textarea + confirmation
 * F6.3: Checkbox to publish receipt to mural
 */

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import type { CicloAtivo, CicloFechamentoStats } from "@/hooks/useCicloFechamento";
import {
  FileText,
  Users,
  Target,
  CalendarDays,
  Lock,
  AlertTriangle,
  Megaphone,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ciclo: CicloAtivo;
  stats: CicloFechamentoStats;
  isLoadingStats: boolean;
  onConfirm: (resumo: string, publicarMural: boolean) => Promise<void>;
  isFechando: boolean;
}

export function FechamentoCicloSheet({
  open,
  onOpenChange,
  ciclo,
  stats,
  isLoadingStats,
  onConfirm,
  isFechando,
}: Props) {
  const [resumo, setResumo] = useState("");
  const [publicarMural, setPublicarMural] = useState(true);
  const [confirmStep, setConfirmStep] = useState(false);

  const handleClose = () => {
    setResumo("");
    setPublicarMural(true);
    setConfirmStep(false);
    onOpenChange(false);
  };

  const handleConfirm = async () => {
    await onConfirm(resumo.trim(), publicarMural);
    handleClose();
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader className="text-left mb-4">
          <SheetTitle className="heading-luta text-base flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" />
            Encerrar ciclo
          </SheetTitle>
          <SheetDescription className="text-xs">
            {ciclo.titulo} · {format(new Date(ciclo.inicio), "dd MMM", { locale: ptBR })} — {format(new Date(ciclo.fim), "dd MMM yyyy", { locale: ptBR })}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5">
          {/* Stats — read-only snapshot */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              Resumo do ciclo
            </p>
            {isLoadingStats ? (
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <StatBox
                  icon={<FileText className="h-3.5 w-3.5" />}
                  value={stats.total_registros}
                  label="Registros"
                />
                <StatBox
                  icon={<Users className="h-3.5 w-3.5" />}
                  value={stats.membros_participantes}
                  label="Membros"
                />
                <StatBox
                  icon={<Target className="h-3.5 w-3.5" />}
                  value={stats.missoes_cumpridas}
                  label="Missões"
                />
              </div>
            )}
          </div>

          {/* Synopsis textarea */}
          <div>
            <label
              htmlFor="ciclo-resumo"
              className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 block"
            >
              Síntese do ciclo (opcional)
            </label>
            <Textarea
              id="ciclo-resumo"
              placeholder="O que marcou essa semana? Conquistas, desafios, próximos passos..."
              value={resumo}
              onChange={(e) => setResumo(e.target.value.slice(0, 500))}
              rows={4}
              className="resize-none text-sm"
              disabled={isFechando}
            />
            <p className="text-[10px] text-muted-foreground/50 text-right mt-1">
              {resumo.length}/500
            </p>
          </div>

          {/* Publish to mural checkbox */}
          <label className="flex items-start gap-3 cursor-pointer rounded-md border border-border px-3 py-2.5">
            <Checkbox
              checked={publicarMural}
              onCheckedChange={(v) => setPublicarMural(!!v)}
              disabled={isFechando}
              className="mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Megaphone className="h-3.5 w-3.5 text-primary" />
                Publicar recibo no mural da célula
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Um resumo do ciclo será visível para todos os membros
              </p>
            </div>
          </label>

          {/* Confirmation */}
          {!confirmStep ? (
            <Button
              onClick={() => setConfirmStep(true)}
              className="w-full"
              disabled={isFechando || isLoadingStats}
            >
              <CalendarDays className="h-4 w-4 mr-2" />
              Encerrar ciclo
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  Esta ação é irreversível. O ciclo será marcado como encerrado
                  {publicarMural ? " e o recibo será publicado no mural" : ""}.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => setConfirmStep(false)}
                  disabled={isFechando}
                >
                  Voltar
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={isFechando}
                  className="bg-primary text-primary-foreground"
                >
                  {isFechando ? "Encerrando..." : "Confirmar"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function StatBox({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="rounded-lg bg-muted/40 px-3 py-2.5 text-center">
      <div className="flex justify-center text-muted-foreground mb-1">{icon}</div>
      <p className="text-lg font-bold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
