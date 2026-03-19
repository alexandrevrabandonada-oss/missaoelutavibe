/**
 * PrintKitModal - Gera materiais de impressão (A4 flyer e sticker 9x9cm)
 * com QR code de convite na identidade #ÉLUTA
 */

import { useState, useRef, useCallback, useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";
import { toPng } from "html-to-image";
import { Download, Printer, FileImage, Loader2, Check, Copy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useInviteLoop } from "@/hooks/useInviteLoop";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Print format configurations (in pixels at 300 DPI)
export const PRINT_FORMATS = {
  a4: {
    width: 2480, // 210mm at 300 DPI
    height: 3508, // 297mm at 300 DPI
    label: "A4 Flyer",
    variantKey: "a4" as const,
    description: "Flyer de 1 página para impressão",
  },
  sticker: {
    width: 1063, // 90mm at 300 DPI
    height: 1063, // 90mm at 300 DPI (9x9cm)
    label: "Sticker 9x9cm",
    variantKey: "sticker" as const,
    description: "Adesivo quadrado com QR",
  },
};

export type PrintFormat = keyof typeof PRINT_FORMATS;

interface GeneratedPrintImage {
  format: PrintFormat;
  dataUrl: string;
  filename: string;
}

interface PrintKitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateTitle: string;
  templateId: string;
  baseText?: string;
  cidade?: string;
  onSaveAttachments?: (images: GeneratedPrintImage[]) => Promise<void>;
}

export function PrintKitModal({
  open,
  onOpenChange,
  templateTitle,
  templateId,
  baseText,
  cidade: cidadeProp,
  onSaveAttachments,
}: PrintKitModalProps) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { inviteCode, ensureInviteCode } = useInviteLoop();
  
  const [activeTab, setActiveTab] = useState<PrintFormat>("a4");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedPrintImage[]>([]);
  const [customCidade, setCustomCidade] = useState(cidadeProp || profile?.city || "");
  
  const a4Ref = useRef<HTMLDivElement>(null);
  const stickerRef = useRef<HTMLDivElement>(null);

  // Build the QR link with UTM for print
  const qrLink = useMemo(() => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const code = inviteCode || "convite";
    const params = new URLSearchParams();
    
    if (customCidade) params.set("cidade", customCidade);
    params.set("utm_source", "impresso");
    params.set("utm_medium", "qr");
    params.set("utm_campaign", templateId.slice(0, 8));
    
    return `${baseUrl}/r/${code}?${params.toString()}`;
  }, [inviteCode, customCidade, templateId]);

  // Log print download event
  const logPrintDownload = async (format: PrintFormat) => {
    try {
      await (supabase.rpc as any)("log_growth_event", {
        _event_type: "template_print_download",
        _template_id: templateId,
        _meta: { format, cidade: customCidade },
      });
    } catch (error) {
      console.error("Error logging print download:", error);
    }
  };

  // Generate image for a specific format
  const generateImage = useCallback(async (format: PrintFormat): Promise<GeneratedPrintImage | null> => {
    const ref = format === "a4" ? a4Ref : stickerRef;
    if (!ref.current) return null;

    try {
      // Ensure we have an invite code
      await ensureInviteCode();

      const dataUrl = await toPng(ref.current, {
        pixelRatio: 1, // Already high-res
        cacheBust: true,
        backgroundColor: "#0B0B0E",
      });

      const filename = `${templateTitle.toLowerCase().replace(/\s+/g, "-")}-${format}.png`;
      
      return { format, dataUrl, filename };
    } catch (error) {
      console.error(`Error generating ${format}:`, error);
      toast.error(`Erro ao gerar ${PRINT_FORMATS[format].label}`);
      return null;
    }
  }, [templateTitle, ensureInviteCode]);

  // Generate all formats
  const generateAll = async () => {
    setIsGenerating(true);
    const results: GeneratedPrintImage[] = [];

    for (const format of Object.keys(PRINT_FORMATS) as PrintFormat[]) {
      const result = await generateImage(format);
      if (result) results.push(result);
    }

    setGeneratedImages(results);
    setIsGenerating(false);

    if (results.length > 0) {
      toast.success(`✅ ${results.length} formato(s) gerado(s)!`);
    }
  };

  // Download single image
  const downloadImage = async (image: GeneratedPrintImage) => {
    const link = document.createElement("a");
    link.href = image.dataUrl;
    link.download = image.filename;
    link.click();
    
    await logPrintDownload(image.format);
    toast.success(`📥 ${image.filename} baixado!`);
  };

  // Download all images
  const downloadAll = async () => {
    for (let i = 0; i < generatedImages.length; i++) {
      setTimeout(async () => {
        await downloadImage(generatedImages[i]);
      }, i * 400);
    }
  };

  // Save to template attachments
  const handleSave = async () => {
    if (generatedImages.length === 0) {
      toast.error("Gere as imagens primeiro!");
      return;
    }
    
    if (onSaveAttachments) {
      await onSaveAttachments(generatedImages);
      toast.success("✅ Imagens salvas no template!");
    }
  };

  // Get generated image for format
  const getGeneratedImage = (format: PrintFormat) => 
    generatedImages.find(img => img.format === format);

  // Scale for preview (fit in modal)
  const previewScale = activeTab === "a4" ? 0.15 : 0.35;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Kit de Impressão
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* City input for QR */}
          <div className="flex items-center gap-3">
            <Label className="whitespace-nowrap">Cidade no QR:</Label>
            <Input
              value={customCidade}
              onChange={(e) => setCustomCidade(e.target.value)}
              placeholder="Ex: São Paulo"
              className="max-w-xs"
            />
            <Badge variant="outline" className="text-xs">
              QR aponta para /r/{inviteCode || "..."}
            </Badge>
          </div>

          {/* Format tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as PrintFormat)}>
            <TabsList className="grid grid-cols-2 w-full max-w-sm">
              <TabsTrigger value="a4">
                <FileImage className="h-4 w-4 mr-1" />
                A4 Flyer
              </TabsTrigger>
              <TabsTrigger value="sticker">
                <FileImage className="h-4 w-4 mr-1" />
                Sticker 9x9cm
              </TabsTrigger>
            </TabsList>

            {/* A4 Preview */}
            <TabsContent value="a4" className="mt-4">
              <div className="flex flex-col items-center gap-4">
                <p className="text-sm text-muted-foreground">
                  {PRINT_FORMATS.a4.description} (210×297mm)
                </p>
                
                <div 
                  className="border border-border rounded-lg overflow-hidden shadow-lg"
                  style={{ 
                    width: PRINT_FORMATS.a4.width * previewScale,
                    height: PRINT_FORMATS.a4.height * previewScale,
                  }}
                >
                  <A4Flyer
                    ref={a4Ref}
                    title={templateTitle}
                    subtitle={baseText?.slice(0, 120)}
                    qrLink={qrLink}
                    cidade={customCidade}
                    scale={previewScale}
                  />
                </div>
                
                {getGeneratedImage("a4") && (
                  <Badge variant="default" className="text-green-400">
                    <Check className="h-3 w-3 mr-1" />
                    Gerado
                  </Badge>
                )}
              </div>
            </TabsContent>

            {/* Sticker Preview */}
            <TabsContent value="sticker" className="mt-4">
              <div className="flex flex-col items-center gap-4">
                <p className="text-sm text-muted-foreground">
                  {PRINT_FORMATS.sticker.description} (90×90mm)
                </p>
                
                <div 
                  className="border border-border rounded-lg overflow-hidden shadow-lg"
                  style={{ 
                    width: PRINT_FORMATS.sticker.width * previewScale,
                    height: PRINT_FORMATS.sticker.height * previewScale,
                  }}
                >
                  <StickerQR
                    ref={stickerRef}
                    qrLink={qrLink}
                    cidade={customCidade}
                    scale={previewScale}
                  />
                </div>
                
                {getGeneratedImage("sticker") && (
                  <Badge variant="default" className="text-green-400">
                    <Check className="h-3 w-3 mr-1" />
                    Gerado
                  </Badge>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 justify-center pt-4 border-t">
            <Button onClick={generateAll} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <FileImage className="h-4 w-4 mr-2" />
                  Gerar Todos
                </>
              )}
            </Button>

            {generatedImages.length > 0 && (
              <>
                <Button variant="outline" onClick={downloadAll}>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Todos ({generatedImages.length})
                </Button>

                {onSaveAttachments && (
                  <Button variant="secondary" onClick={handleSave}>
                    <Copy className="h-4 w-4 mr-2" />
                    Salvar no Template
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Individual download buttons */}
          {generatedImages.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center">
              {generatedImages.map((img) => (
                <Button
                  key={img.format}
                  variant="ghost"
                  size="sm"
                  onClick={() => downloadImage(img)}
                >
                  <Download className="h-3 w-3 mr-1" />
                  {PRINT_FORMATS[img.format].label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ========================================
// A4 Flyer Component (full page with branding)
// ========================================
import { forwardRef } from "react";

interface A4FlyerProps {
  title: string;
  subtitle?: string;
  qrLink: string;
  cidade?: string;
  scale?: number;
}

const A4Flyer = forwardRef<HTMLDivElement, A4FlyerProps>(
  ({ title, subtitle, qrLink, cidade, scale = 1 }, ref) => {
    const config = PRINT_FORMATS.a4;
    const width = config.width * scale;
    const height = config.height * scale;
    
    // Font sizes scaled
    const titleSize = 140 * scale;
    const subtitleSize = 48 * scale;
    const ctaSize = 56 * scale;
    const footerSize = 36 * scale;
    const seloSize = 48 * scale;
    const qrSize = 500 * scale;
    const padding = 120 * scale;

    return (
      <div
        ref={ref}
        style={{
          width,
          height,
          position: "relative",
          overflow: "hidden",
          backgroundColor: "#0B0B0E",
          fontFamily: "'Oswald', 'Arial Narrow', sans-serif",
          color: "#F2F2F2",
        }}
      >
        {/* Texture overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `
              radial-gradient(circle at 20% 80%, rgba(192, 57, 43, 0.08) 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, rgba(255, 209, 0, 0.05) 0%, transparent 50%)
            `,
            pointerEvents: "none",
          }}
        />

        {/* Stencil border */}
        <div
          style={{
            position: "absolute",
            inset: padding * 0.4,
            border: `${4 * scale}px solid rgba(255, 209, 0, 0.2)`,
            pointerEvents: "none",
          }}
        />

        {/* Content */}
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            padding,
            zIndex: 1,
          }}
        >
          {/* Header - Selo #ÉLUTA */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                backgroundColor: "rgba(255, 209, 0, 0.15)",
                border: `${2 * scale}px solid rgba(255, 209, 0, 0.4)`,
                borderRadius: 8 * scale,
                padding: `${10 * scale}px ${24 * scale}px`,
                fontSize: seloSize,
                fontWeight: 700,
                letterSpacing: "0.1em",
                color: "#FFD100",
              }}
            >
              #ÉLUTA
            </div>
            
            {cidade && (
              <div
                style={{
                  fontSize: footerSize,
                  color: "rgba(242, 242, 242, 0.6)",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                📍 {cidade}
              </div>
            )}
          </div>

          {/* Main content */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              textAlign: "center",
              gap: 40 * scale,
            }}
          >
            {/* Title */}
            <h1
              style={{
                fontSize: titleSize,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
                margin: 0,
                color: "#F2F2F2",
                maxWidth: "90%",
              }}
            >
              {title}
            </h1>

            {/* Subtitle */}
            {subtitle && (
              <p
                style={{
                  fontSize: subtitleSize,
                  color: "rgba(242, 242, 242, 0.8)",
                  maxWidth: "80%",
                  lineHeight: 1.4,
                  margin: 0,
                }}
              >
                {subtitle}
              </p>
            )}

            {/* QR Code */}
            <div
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 16 * scale,
                padding: 32 * scale,
                marginTop: 40 * scale,
              }}
            >
              <QRCodeSVG
                value={qrLink}
                size={qrSize}
                level="H"
                includeMargin={false}
                bgColor="#FFFFFF"
                fgColor="#000000"
              />
            </div>

            {/* CTA */}
            <div
              style={{
                fontSize: ctaSize,
                fontWeight: 600,
                color: "#FFD100",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                padding: `${16 * scale}px ${40 * scale}px`,
                border: `${3 * scale}px solid #FFD100`,
                borderRadius: 8 * scale,
              }}
            >
              ESCANEIE E PARTICIPE
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <div
              style={{
                fontSize: footerSize,
                fontWeight: 500,
                color: "rgba(242, 242, 242, 0.6)",
                textTransform: "uppercase",
                letterSpacing: "0.25em",
              }}
            >
              ESCUTAR • CUIDAR • ORGANIZAR
            </div>
          </div>
        </div>
      </div>
    );
  }
);
A4Flyer.displayName = "A4Flyer";

// ========================================
// Sticker QR Component (9x9cm square)
// ========================================
interface StickerQRProps {
  qrLink: string;
  cidade?: string;
  scale?: number;
}

const StickerQR = forwardRef<HTMLDivElement, StickerQRProps>(
  ({ qrLink, cidade, scale = 1 }, ref) => {
    const config = PRINT_FORMATS.sticker;
    const size = config.width * scale;
    
    const seloSize = 40 * scale;
    const ctaSize = 28 * scale;
    const qrSize = 600 * scale;
    const padding = 60 * scale;

    return (
      <div
        ref={ref}
        style={{
          width: size,
          height: size,
          position: "relative",
          overflow: "hidden",
          backgroundColor: "#0B0B0E",
          fontFamily: "'Oswald', 'Arial Narrow', sans-serif",
          color: "#F2F2F2",
        }}
      >
        {/* Stencil border */}
        <div
          style={{
            position: "absolute",
            inset: padding * 0.3,
            border: `${3 * scale}px solid rgba(255, 209, 0, 0.3)`,
            borderRadius: 12 * scale,
            pointerEvents: "none",
          }}
        />

        {/* Content */}
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            padding,
            gap: 20 * scale,
            zIndex: 1,
          }}
        >
          {/* Selo */}
          <div
            style={{
              backgroundColor: "rgba(255, 209, 0, 0.2)",
              border: `${2 * scale}px solid rgba(255, 209, 0, 0.5)`,
              borderRadius: 6 * scale,
              padding: `${6 * scale}px ${16 * scale}px`,
              fontSize: seloSize,
              fontWeight: 700,
              letterSpacing: "0.1em",
              color: "#FFD100",
            }}
          >
            #ÉLUTA
          </div>

          {/* QR Code */}
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 12 * scale,
              padding: 20 * scale,
            }}
          >
            <QRCodeSVG
              value={qrLink}
              size={qrSize}
              level="H"
              includeMargin={false}
              bgColor="#FFFFFF"
              fgColor="#000000"
            />
          </div>

          {/* CTA */}
          <div
            style={{
              fontSize: ctaSize,
              fontWeight: 600,
              color: "#FFD100",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            {cidade ? `📍 ${cidade}` : "ESCANEIE AQUI"}
          </div>
        </div>
      </div>
    );
  }
);
StickerQR.displayName = "StickerQR";

export { A4Flyer, StickerQR };
