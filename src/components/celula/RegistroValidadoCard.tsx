/**
 * RegistroValidadoCard - Validated evidence receipt card in Memória tab
 * F5.1: Rich detail with lazy media loading
 * F10: Formal receipt identity — badge, hierarchy, timeline
 * F10.1: Human labels for mission type
 */

import { useState } from "react";
import { MemoriaRegistro } from "@/hooks/useCelulaMembroMemoria";
import { getSafeDisplayName } from "@/lib/safeIdentity";
import { getMissionTypeLabel } from "@/lib/missionLabels";
import { SecureImage } from "@/components/ui/SecureImage";
import { ShareReciboModal, ShareRegistroData } from "./ShareReciboModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  ChevronDown,
  MapPin,
  User,
  Image as ImageIcon,
  ShieldCheck,
  Send,
  Timer,
  Share2,
  MessageCircle,
} from "lucide-react";
import { format, formatDistanceStrict } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Props {
  registro: MemoriaRegistro;
}

export function RegistroValidadoCard({ registro: r }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const validatedDate = r.validated_at ? new Date(r.validated_at) : null;
  const createdDate = new Date(r.created_at);
  const responseTime =
    validatedDate
      ? formatDistanceStrict(createdDate, validatedDate, { locale: ptBR })
      : null;

  const hasMedia = r.media_urls && r.media_urls.length > 0;

  return (
    <div
      className={cn(
        "rounded-lg border transition-colors",
        expanded
          ? "border-emerald-500/30 bg-emerald-500/[0.03]"
          : "border-border"
      )}
    >
      {/* Collapsed header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-3 p-3 w-full text-left"
      >
        <div className="p-1.5 rounded-md bg-emerald-500/10 shrink-0">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {r.mission_title || "Missão"}
          </p>
          <p className="text-[11px] text-muted-foreground truncate">
            {validatedDate
              ? `Validado em ${format(validatedDate, "dd MMM yyyy", { locale: ptBR })}`
              : format(createdDate, "dd MMM yyyy", { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge
            variant="outline"
            className="text-[9px] gap-0.5 border-emerald-500/30 text-emerald-400 px-1.5 py-0"
          >
            <CheckCircle2 className="h-2.5 w-2.5" />
            Recibo
          </Badge>
          {hasMedia && <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />}
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
        <div className="px-3 pb-3 space-y-3 border-t border-border/50 pt-3">
          {/* Receipt badge + mission type */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className="text-[10px] gap-1 border-emerald-500/40 text-emerald-400"
            >
              <CheckCircle2 className="h-3 w-3" />
              Recibo validado
            </Badge>
            {r.mission_type && (
              <Badge variant="outline" className="text-[10px]">
                {getMissionTypeLabel(r.mission_type)}
              </Badge>
            )}
          </div>

          {/* Resumo */}
          {r.resumo && (
            <p className="text-sm text-foreground whitespace-pre-wrap">{r.resumo}</p>
          )}

          {/* Relato */}
          {r.relato_texto && (
            <div>
              <p className="text-[10px] uppercase text-muted-foreground mb-0.5 font-semibold tracking-wide">
                Relato
              </p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {r.relato_texto}
              </p>
            </div>
          )}

          {/* Local */}
          {r.local_texto && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              <span>{r.local_texto}</span>
            </div>
          )}

          {/* Timeline */}
          <div className="rounded-md bg-muted/30 px-3 py-2.5 space-y-1.5">
            <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wide mb-1">
              Linha do tempo
            </p>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Send className="h-3 w-3 shrink-0" />
              <span>Enviado em {format(createdDate, "dd/MM/yy · HH:mm", { locale: ptBR })}</span>
            </div>
            {validatedDate && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                <CheckCircle2 className="h-3 w-3 shrink-0" />
                <span>Validado em {format(validatedDate, "dd/MM/yy · HH:mm", { locale: ptBR })}</span>
              </div>
            )}
            {responseTime && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
                <Timer className="h-3 w-3 shrink-0" />
                <span>Tempo de resposta: {responseTime}</span>
              </div>
            )}
            {r.validated_by_name && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
                <User className="h-3 w-3 shrink-0" />
                <span>por {getSafeDisplayName(r.validated_by_name)}</span>
              </div>
            )}
          </div>

          {/* Coordinator feedback */}
          {r.coord_feedback && (
            <div className="rounded-md border border-emerald-500/20 bg-emerald-500/[0.04] p-3">
              <p className="text-[10px] uppercase text-emerald-500/70 mb-1 font-semibold tracking-wide flex items-center gap-1">
                <MessageCircle className="h-3 w-3" />
                Retorno da coordenação
              </p>
              <p className="text-sm text-foreground italic">"{r.coord_feedback}"</p>
            </div>
          )}

          {/* Media — lazy loaded only when expanded */}
          {hasMedia && (
            <div className="grid grid-cols-2 gap-2">
              {r.media_urls!.map((url, i) => (
                <SecureImage
                  key={i}
                  bucket="evidences"
                  pathOrUrl={url}
                  alt={`Mídia ${i + 1}`}
                  className="rounded-md object-cover w-full aspect-square"
                />
              ))}
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
            Compartilhar recibo
          </Button>

          <ShareReciboModal
            open={shareOpen}
            onOpenChange={setShareOpen}
            share={{
              kind: "registro",
              data: {
                mission_title: r.mission_title || "Missão",
                mission_type: r.mission_type,
                validated_at: r.validated_at,
                local_texto: r.local_texto,
                cidade: undefined,
              } satisfies ShareRegistroData,
            }}
          />
        </div>
      )}
    </div>
  );
}
