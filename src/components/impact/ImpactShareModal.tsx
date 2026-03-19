/**
 * ImpactShareModal - Share impact card as image or text
 */

import { useState, useRef, useCallback } from "react";
import { toPng } from "html-to-image";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Zap, Users, Share2, Download, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface ImpactShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: {
    actionsCompleted: number;
    contactsAdded: number;
    invitesShared: number;
    windowDays: number;
  };
  onShareOpened?: (format: "1:1" | "4:5") => void;
  onShared?: (format: "1:1" | "4:5") => void;
}

type Format = "1:1" | "4:5";

const FORMAT_SIZES: Record<Format, { width: number; height: number; label: string }> = {
  "1:1": { width: 1080, height: 1080, label: "Quadrado (1:1)" },
  "4:5": { width: 1080, height: 1350, label: "Feed (4:5)" },
};

export function ImpactShareModal({
  open,
  onOpenChange,
  data,
  onShareOpened,
  onShared,
}: ImpactShareModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<Format>("1:1");
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleFormatChange = (format: Format) => {
    setSelectedFormat(format);
    onShareOpened?.(format);
  };

  const generateShareText = () => {
    return `🔥 Meu Impacto nos últimos ${data.windowDays} dias:

⚡ ${data.actionsCompleted} ações concluídas
👥 ${data.contactsAdded} contatos salvos
🔗 ${data.invitesShared} convites enviados

#ÉLUTA`;
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(generateShareText());
      setCopied(true);
      toast.success("Texto copiado!");
      onShared?.(selectedFormat);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const handleExportImage = useCallback(async () => {
    if (!cardRef.current) return;

    setIsExporting(true);
    try {
      const { width, height } = FORMAT_SIZES[selectedFormat];
      
      const dataUrl = await toPng(cardRef.current, {
        width,
        height,
        pixelRatio: 2,
        backgroundColor: "#000000",
      });

      // Download the image
      const link = document.createElement("a");
      link.download = `meu-impacto-${selectedFormat.replace(":", "x")}.png`;
      link.href = dataUrl;
      link.click();

      toast.success("Imagem baixada!");
      onShared?.(selectedFormat);
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Erro ao gerar imagem. Tente copiar o texto.");
    } finally {
      setIsExporting(false);
    }
  }, [selectedFormat, onShared]);

  const { width, height } = FORMAT_SIZES[selectedFormat];
  const scale = 0.25; // Preview scale

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Compartilhar Impacto</SheetTitle>
          <SheetDescription>
            Exporte sua imagem ou copie o texto para compartilhar
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Format selector */}
          <div className="flex gap-2">
            {(Object.entries(FORMAT_SIZES) as [Format, typeof FORMAT_SIZES["1:1"]][]).map(
              ([format, config]) => (
                <Button
                  key={format}
                  variant={selectedFormat === format ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleFormatChange(format)}
                >
                  {config.label}
                </Button>
              )
            )}
          </div>

          {/* Preview */}
          <div className="flex justify-center">
            <div
              style={{
                width: width * scale,
                height: height * scale,
                overflow: "hidden",
                borderRadius: "8px",
                border: "1px solid hsl(var(--border))",
              }}
            >
              <div
                ref={cardRef}
                style={{
                  width: `${width}px`,
                  height: `${height}px`,
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                }}
                className="bg-black flex flex-col items-center justify-center p-12"
              >
                {/* Background pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-transparent" />
                </div>

                {/* Content */}
                <div className="relative z-10 text-center flex flex-col items-center justify-center h-full gap-8">
                  {/* Header */}
                  <div className="mb-4">
                    <h1 className="text-6xl font-black text-white tracking-tight mb-2">
                      MEU IMPACTO
                    </h1>
                    <p className="text-2xl text-white/70">
                      Últimos {data.windowDays} dias
                    </p>
                  </div>

                  {/* Metrics */}
                  <div className="flex flex-col gap-6 w-full max-w-lg">
                    {/* Actions */}
                    <div className="bg-white/10 rounded-2xl p-8 flex items-center gap-6">
                      <div className="h-20 w-20 rounded-full bg-primary flex items-center justify-center">
                        <Zap className="h-10 w-10 text-primary-foreground" />
                      </div>
                      <div className="text-left">
                        <p className="text-7xl font-black text-white">
                          {data.actionsCompleted}
                        </p>
                        <p className="text-2xl text-white/70">ações concluídas</p>
                      </div>
                    </div>

                    {/* Contacts */}
                    <div className="bg-white/10 rounded-2xl p-8 flex items-center gap-6">
                      <div className="h-20 w-20 rounded-full bg-green-500 flex items-center justify-center">
                        <Users className="h-10 w-10 text-white" />
                      </div>
                      <div className="text-left">
                        <p className="text-7xl font-black text-white">
                          {data.contactsAdded}
                        </p>
                        <p className="text-2xl text-white/70">contatos salvos</p>
                      </div>
                    </div>

                    {/* Invites */}
                    <div className="bg-white/10 rounded-2xl p-8 flex items-center gap-6">
                      <div className="h-20 w-20 rounded-full bg-blue-500 flex items-center justify-center">
                        <Share2 className="h-10 w-10 text-white" />
                      </div>
                      <div className="text-left">
                        <p className="text-7xl font-black text-white">
                          {data.invitesShared}
                        </p>
                        <p className="text-2xl text-white/70">convites enviados</p>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-8">
                    <p className="text-4xl font-black text-primary tracking-widest">
                      #ÉLUTA
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button onClick={handleExportImage} disabled={isExporting}>
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? "Gerando..." : "Baixar Imagem"}
            </Button>
            <Button variant="outline" onClick={handleCopyText}>
              {copied ? (
                <Check className="h-4 w-4 mr-2" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              {copied ? "Copiado!" : "Copiar Texto"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
