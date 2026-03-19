/**
 * ShareReciboModal — F11.1 + F11.2 + F11.2b: Text, WhatsApp, and image share
 * Privacy-first: no names, no media, no full reports, sanitized location
 */

import { useState, useRef, useCallback } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Copy, Check, MessageCircle, Download, Loader2 } from "lucide-react";
import { toPng } from "html-to-image";
import { toast } from "sonner";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { getMissionTypeLabel } from "@/lib/missionLabels";
import { buildInviteShareUrl, openWhatsAppShare, copyToClipboard } from "@/lib/shareUtils";
import { usePersonalInviteCode } from "@/hooks/usePersonalInviteCode";
import { useLogGrowthEvent } from "@/hooks/useGrowth";
import { ReciboImageCard } from "./ReciboImageCard";

/* ── Data shapes ── */

export interface ShareRegistroData {
  mission_title: string;
  mission_type?: string | null;
  validated_at?: string | null;
  local_texto?: string | null;
  cidade?: string | null;
}

export interface ShareCicloData {
  titulo: string;
  inicio: string;
  fim: string;
  total_registros_celula: number;
  membros_participantes: number;
  missoes_cumpridas: number;
  sintese?: string | null;
}

type ShareData =
  | { kind: "registro"; data: ShareRegistroData }
  | { kind: "ciclo"; data: ShareCicloData };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  share: ShareData;
}

/* ── Location sanitizer ── */

/**
 * Conservative location sanitizer for share texts.
 * Goal: return "Bairro, Cidade" or just "Cidade" — never leak
 * streets, numbers, CEPs, or institution addresses.
 * When in doubt → cidade only.
 */
export function sanitizeLocal(local?: string | null, cidade?: string | null): string | null {
  if (!local && !cidade) return null;
  if (!local) return cidade || null;

  let s = local;

  // 1. Remove CEPs (with optional "CEP" prefix)
  s = s.replace(/\bCEP\s*/gi, "");
  s = s.replace(/\d{5}-?\d{3}/g, "");

  // 2. Remove street-level patterns
  s = s.replace(/\b(?:rua|r\.)\s+[^,]*/gi, "");
  s = s.replace(/\b(?:avenida|av\.?)\s+[^,]*/gi, "");
  s = s.replace(/\b(?:alameda|al\.?)\s+[^,]*/gi, "");
  s = s.replace(/\b(?:travessa|tv\.?)\s+[^,]*/gi, "");
  s = s.replace(/\b(?:rodovia|rod\.?)\s+[^,]*/gi, "");
  s = s.replace(/\b(?:estrada|estr\.?)\s+[^,]*/gi, "");

  // 3. Remove house/lot numbers
  s = s.replace(/\bn[ºo°.]?\s*\d+/gi, "");
  s = s.replace(/\blote?\s*\d+/gi, "");
  s = s.replace(/\bbloco?\s*\w{1,3}\b/gi, "");

  // 4. Remove institution-with-number patterns
  s = s.replace(/\b(?:UBS|CRAS|CREAS|UPA|ESF|PSF|CAPS)\s*\d+/gi, "");

  // 5. Remove standalone number sequences
  s = s.replace(/\b\d{1,5}\b/g, "");

  // 6. Clean up separators
  s = s
    .replace(/[,;-]\s*[,;-]/g, ",")
    .replace(/^[\s,;-]+|[\s,;-]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  // 7. If result is too short, fall back to cidade
  if (s.length < 3) return cidade || null;

  // 8. Append cidade if missing
  if (cidade && !s.toLowerCase().includes(cidade.toLowerCase())) {
    s = `${s}, ${cidade}`;
  }

  return s;
}

/* ── Text builders ── */

function buildRegistroText(data: ShareRegistroData, inviteCode: string | null): string {
  const lines: string[] = ["✓ Recibo emitido", ""];
  lines.push(`Missão: ${data.mission_title}`);
  if (data.mission_type) {
    lines.push(`Tipo: ${getMissionTypeLabel(data.mission_type)}`);
  }
  if (data.validated_at) {
    lines.push(`Validado em: ${format(new Date(data.validated_at), "dd/MM/yyyy", { locale: ptBR })}`);
  }
  const local = sanitizeLocal(data.local_texto, data.cidade);
  if (local) {
    lines.push(`Local: ${local}`);
  }
  lines.push("");
  lines.push("Conheça o projeto:");
  lines.push(buildInviteShareUrl(inviteCode));
  return lines.join("\n");
}

function buildCicloText(data: ShareCicloData, inviteCode: string | null): string {
  const lines: string[] = [`📊 Ciclo encerrado: ${data.titulo}`, ""];
  const inicio = format(new Date(data.inicio), "dd MMM", { locale: ptBR });
  const fim = format(new Date(data.fim), "dd MMM yyyy", { locale: ptBR });
  lines.push(`Período: ${inicio} — ${fim}`);
  lines.push("");
  lines.push(`• ${data.total_registros_celula} registros validados`);
  lines.push(`• ${data.membros_participantes} membros participantes`);
  lines.push(`• ${data.missoes_cumpridas} missões cumpridas`);
  if (data.sintese) {
    lines.push("");
    const maxLen = 200;
    const trimmed = data.sintese.length > maxLen
      ? data.sintese.slice(0, maxLen).trimEnd() + "…"
      : data.sintese;
    lines.push(trimmed);
  }
  lines.push("");
  lines.push("Conheça o projeto:");
  lines.push(buildInviteShareUrl(inviteCode));
  return lines.join("\n");
}

/* ── Component ── */

export function ShareReciboModal({ open, onOpenChange, share }: Props) {
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const { inviteCode } = usePersonalInviteCode();
  const imageRef = useRef<HTMLDivElement>(null);
  const logGrowthEvent = useLogGrowthEvent();

  const trackShare = (action: string) => {
    logGrowthEvent.mutate({
      eventType: `share_recibo_${action}`,
      inviteCode: inviteCode || undefined,
      meta: { kind: share.kind },
    });
  };

  const text =
    share.kind === "registro"
      ? buildRegistroText(share.data, inviteCode)
      : buildCicloText(share.data, inviteCode);

  const handleCopy = async () => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      trackShare("copy");
    }
  };

  const handleWhatsApp = () => {
    openWhatsAppShare(text);
    trackShare("whatsapp");
  };

  const handleDownloadImage = useCallback(async () => {
    if (!imageRef.current || generating) return;
    setGenerating(true);
    try {
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      // Warm-up pass
      await toPng(imageRef.current, { pixelRatio: 1, cacheBust: true });

      // Full quality
      const dataUrl = await toPng(imageRef.current, {
        pixelRatio: 2,
        cacheBust: true,
      });

      const link = document.createElement("a");
      link.download = share.kind === "registro"
        ? "recibo-missao.png"
        : "recibo-ciclo.png";
      link.href = dataUrl;
      link.click();
      trackShare("image");
    } catch (err) {
      console.error("Erro ao gerar imagem:", err);
      toast.error("Não foi possível gerar a imagem. Tente novamente.");
    } finally {
      setGenerating(false);
    }
  }, [share.kind, generating]);

  const title = share.kind === "registro" ? "Compartilhar recibo" : "Compartilhar ciclo";

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="px-4 pb-6">
        <DrawerHeader className="px-0 pb-3">
          <DrawerTitle className="text-base">{title}</DrawerTitle>
        </DrawerHeader>

        {/* Preview */}
        <div className="rounded-lg bg-muted/40 border border-border p-3 mb-4 max-h-48 overflow-y-auto">
          <p className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
            {text}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="h-4 w-4 text-emerald-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copied ? "Copiado!" : "Copiar"}
          </Button>

          <Button
            className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleWhatsApp}
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </Button>
        </div>

        {/* Image download */}
        <Button
          variant="outline"
          className="w-full gap-2 mt-2"
          onClick={handleDownloadImage}
          disabled={generating}
        >
          {generating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {generating ? "Gerando…" : "Baixar imagem"}
        </Button>

        <DrawerClose asChild>
          <Button variant="ghost" size="sm" className="mt-3 text-muted-foreground">
            Fechar
          </Button>
        </DrawerClose>
      </DrawerContent>

      {/* Off-screen card for image capture */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          left: -9999,
          top: -9999,
          pointerEvents: "none",
          opacity: 0,
        }}
      >
        <ReciboImageCard ref={imageRef} share={share} />
      </div>
    </Drawer>
  );
}
