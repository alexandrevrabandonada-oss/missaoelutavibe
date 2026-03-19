/**
 * MissionShareCard - Generates shareable cards on mission completion
 * Formats: 1:1 (feed), 3:4 (feed vertical), 9:16 (stories)
 * Always includes: pré-campanha + Alexandre + "Escutar • Cuidar • Organizar"
 */

import { useState, useRef, useCallback } from "react";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  MessageCircle,
  Copy,
  Download,
  Check,
  Link2,
  Zap,
} from "lucide-react";
import { openWhatsAppShare, copyToClipboard } from "@/lib/shareUtils";

type CardFormat = "1:1" | "3:4" | "9:16";

const FORMAT_CONFIG: Record<CardFormat, { width: number; height: number; label: string }> = {
  "1:1": { width: 1080, height: 1080, label: "Feed (1:1)" },
  "3:4": { width: 1080, height: 1440, label: "Feed (3:4)" },
  "9:16": { width: 1080, height: 1920, label: "Stories (9:16)" },
};

interface MissionShareCardProps {
  missionTitle: string;
  missionType?: string;
  shareMessage: string;
  publicLink: string;
}

export function MissionShareCard({
  missionTitle,
  missionType,
  shareMessage,
  publicLink,
}: MissionShareCardProps) {
  const [selectedFormat, setSelectedFormat] = useState<CardFormat>("1:1");
  const [isExporting, setIsExporting] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const caption = `✅ Missão concluída: ${missionTitle}

Pré-campanha — Alexandre Fonseca
ESCUTAR • CUIDAR • ORGANIZAR

Quer fazer a sua em 10 min?
${publicLink}

#ÉLUTA #PréCampanha #MissãoConcluída`;

  const getMissionTypeLabel = () => {
    switch (missionType) {
      case "rua": return "MISSÃO DE RUA";
      case "conversa": return "MISSÃO CONVERSA";
      case "conteudo": return "MISSÃO CONTEÚDO";
      default: return "MISSÃO CONCLUÍDA";
    }
  };

  const handleExportImage = useCallback(async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    try {
      const { width, height } = FORMAT_CONFIG[selectedFormat];
      const dataUrl = await toPng(cardRef.current, {
        width,
        height,
        pixelRatio: 2,
        backgroundColor: "#1a1a1a",
      });
      const link = document.createElement("a");
      link.download = `missao-${selectedFormat.replace(":", "x")}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Card baixado!");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Erro ao gerar imagem");
    } finally {
      setIsExporting(false);
    }
  }, [selectedFormat]);

  const handleShareWhatsApp = () => {
    const msg = `${shareMessage}\n\n${publicLink}`;
    openWhatsAppShare(msg);
  };

  const handleCopyCaption = async () => {
    const ok = await copyToClipboard(caption);
    if (ok) {
      setCopiedCaption(true);
      toast.success("Legenda copiada!");
      setTimeout(() => setCopiedCaption(false), 2000);
    } else {
      toast.error("Não foi possível copiar");
    }
  };

  const handleCopyLink = async () => {
    const ok = await copyToClipboard(publicLink);
    if (ok) {
      setCopiedLink(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopiedLink(false), 2000);
    } else {
      toast.error("Não foi possível copiar");
    }
  };

  const { width, height } = FORMAT_CONFIG[selectedFormat];
  const previewScale = Math.min(280 / width, 400 / height);

  return (
    <div className="w-full max-w-md space-y-4">
      {/* Format selector */}
      <div className="flex gap-2 justify-center">
        {(Object.entries(FORMAT_CONFIG) as [CardFormat, typeof FORMAT_CONFIG["1:1"]][]).map(
          ([format, config]) => (
            <Button
              key={format}
              variant={selectedFormat === format ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedFormat(format)}
              className={selectedFormat === format ? "btn-luta" : ""}
            >
              {config.label}
            </Button>
          )
        )}
      </div>

      {/* Card preview */}
      <div className="flex justify-center">
        <div
          style={{
            width: width * previewScale,
            height: height * previewScale,
            overflow: "hidden",
            borderRadius: "12px",
            border: "2px solid hsl(var(--border))",
          }}
        >
          <div
            ref={cardRef}
            style={{
              width: `${width}px`,
              height: `${height}px`,
              transform: `scale(${previewScale})`,
              transformOrigin: "top left",
              fontFamily: "'Inter', sans-serif",
            }}
            className="relative flex flex-col items-center justify-between overflow-hidden"
          >
            {/* Background */}
            <div className="absolute inset-0 bg-[#1a1a1a]" />
            <div className="absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
              }}
            />
            {/* Yellow accent top bar */}
            <div className="absolute top-0 left-0 right-0 h-3" style={{ background: "#F5C518" }} />

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-16 text-center gap-10 w-full">
              {/* Type badge */}
              <div className="rounded-full px-10 py-4" style={{ background: "rgba(245,197,24,0.15)", border: "2px solid rgba(245,197,24,0.4)" }}>
                <p className="text-3xl font-black tracking-[0.2em] uppercase" style={{ color: "#F5C518" }}>
                  {getMissionTypeLabel()}
                </p>
              </div>

              {/* Check icon */}
              <div className="h-32 w-32 rounded-full flex items-center justify-center" style={{ background: "rgba(245,197,24,0.2)" }}>
                <Zap className="h-16 w-16" style={{ color: "#F5C518" }} />
              </div>

              {/* Mission title */}
              <div className="max-w-[80%]">
                <p className="text-5xl font-black text-white leading-tight tracking-tight uppercase">
                  {missionTitle.length > 60 ? missionTitle.slice(0, 60) + "…" : missionTitle}
                </p>
              </div>

              {/* Divider */}
              <div className="w-24 h-1 rounded-full" style={{ background: "#F5C518" }} />

              {/* Signature */}
              <div className="space-y-3">
                <p className="text-3xl text-white/60 font-medium">
                  Pré-campanha
                </p>
                <p className="text-4xl font-black text-white">
                  Alexandre Fonseca
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="relative z-10 w-full pb-14 pt-6 text-center space-y-3">
              <p className="text-3xl font-black tracking-[0.25em]" style={{ color: "#F5C518" }}>
                ESCUTAR • CUIDAR • ORGANIZAR
              </p>
              <p className="text-2xl font-bold tracking-[0.3em] text-white/40">
                #ÉLUTA
              </p>
            </div>

            {/* Yellow accent bottom bar */}
            <div className="absolute bottom-0 left-0 right-0 h-3" style={{ background: "#F5C518" }} />
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="space-y-2">
        <Button onClick={handleExportImage} disabled={isExporting} className="w-full btn-luta">
          <Download className="h-4 w-4 mr-2" />
          {isExporting ? "Gerando..." : "Baixar Card"}
        </Button>

        <div className="grid grid-cols-3 gap-2">
          <Button
            onClick={handleShareWhatsApp}
            className="bg-[#25D366] hover:bg-[#20BD5A] text-white"
          >
            <MessageCircle className="h-4 w-4 mr-1" />
            WhatsApp
          </Button>
          <Button variant="outline" onClick={handleCopyCaption}>
            {copiedCaption ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
            Legenda
          </Button>
          <Button variant="outline" onClick={handleCopyLink}>
            {copiedLink ? <Check className="h-4 w-4 mr-1" /> : <Link2 className="h-4 w-4 mr-1" />}
            Link
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Sem spam: compartilhe com 1 pessoa ou 1 grupo com contexto.
      </p>
    </div>
  );
}
