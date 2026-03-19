/**
 * CicloCelulaCard - Expandable card for closed cycles in Memória tab
 * F5.2: Shows collective stats + personal contribution + synopsis
 */

import { useState } from "react";
import { MemoriaCiclo } from "@/hooks/useCelulaMembroMemoria";
import { ShareReciboModal, ShareCicloData } from "./ShareReciboModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  Users,
  Target,
  FileText,
  User,
  CalendarDays,
  BookOpen,
  Share2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Props {
  ciclo: MemoriaCiclo;
}

export function CicloCelulaCard({ ciclo }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <div
      className={cn(
        "rounded-lg border border-border transition-colors",
        expanded && "bg-muted/20"
      )}
    >
      {/* Collapsed header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-3 p-3 w-full text-left"
      >
        <CalendarDays className="h-4 w-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {ciclo.titulo}
          </p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(ciclo.inicio), "dd MMM", { locale: ptBR })} — {format(new Date(ciclo.fim), "dd MMM yyyy", { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="secondary" className="text-xs">
            {ciclo.total_registros_celula} reg.
          </Badge>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              expanded && "rotate-180"
            )}
          />
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-2">
            <StatItem
              icon={<FileText className="h-3.5 w-3.5" />}
              label="Registros"
              value={ciclo.total_registros_celula}
            />
            <StatItem
              icon={<Users className="h-3.5 w-3.5" />}
              label="Membros"
              value={ciclo.membros_participantes}
            />
            <StatItem
              icon={<Target className="h-3.5 w-3.5" />}
              label="Missões"
              value={ciclo.missoes_cumpridas}
            />
            <StatItem
              icon={<User className="h-3.5 w-3.5" />}
              label="Seus registros"
              value={ciclo.meus_registros}
              highlight={ciclo.meus_registros > 0}
            />
          </div>

          {/* Synopsis */}
          {ciclo.sintese ? (
            <div className="rounded-md bg-muted/30 px-3 py-2">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wide">
                  Síntese do ciclo
                </p>
                {ciclo.fechamento_json?.editado_em && (
                  <span className="text-[10px] text-muted-foreground/60 font-medium">
                    Atualizado em {format(new Date(ciclo.fechamento_json.editado_em), "dd MMM", { locale: ptBR })}
                  </span>
                )}
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {ciclo.sintese}
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-2">
              <BookOpen className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
              <p className="text-xs text-muted-foreground/50">
                Síntese não registrada neste ciclo
              </p>
            </div>
          )}

          {/* Share button */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setShareOpen(true)}
          >
            <Share2 className="h-3.5 w-3.5" />
            Compartilhar ciclo
          </Button>

          <ShareReciboModal
            open={shareOpen}
            onOpenChange={setShareOpen}
            share={{
              kind: "ciclo",
              data: {
                titulo: ciclo.titulo,
                inicio: ciclo.inicio,
                fim: ciclo.fim,
                total_registros_celula: ciclo.total_registros_celula,
                membros_participantes: ciclo.membros_participantes,
                missoes_cumpridas: ciclo.missoes_cumpridas,
                sintese: ciclo.sintese,
              } satisfies ShareCicloData,
            }}
          />
        </div>
      )}
    </div>
  );
}

function StatItem({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-muted/40 px-2.5 py-2">
      <span className="text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <p
          className={cn(
            "text-sm font-semibold",
            highlight ? "text-primary" : "text-foreground"
          )}
        >
          {value}
        </p>
        <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
      </div>
    </div>
  );
}
