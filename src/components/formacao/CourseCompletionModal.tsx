/**
 * Course Completion Modal - Shows certificate, share options, and suggested missions
 */
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toPng } from "html-to-image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Award,
  Share2,
  Download,
  Copy,
  MessageCircle,
  Target,
  Users,
  MapPin,
  ArrowRight,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { CertificateRenderer, CertificateData } from "./CertificateRenderer";
import { CertificatePrivacySettings } from "./CertificatePrivacySettings";
import { useCertificates, FormacaoCertificate } from "@/hooks/useCertificates";
import { TemplateFormat } from "@/components/fabrica/template-engine/types";

import { PUBLISHED_URL } from "@/lib/shareUtils";

interface CourseCompletionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  courseTitle: string;
  courseLevel: string;
  volunteerName: string;
  volunteerCidade?: string;
  certificate: FormacaoCertificate | null;
}

export function CourseCompletionModal({
  open,
  onOpenChange,
  courseId,
  courseTitle,
  courseLevel,
  volunteerName,
  volunteerCidade,
  certificate,
}: CourseCompletionModalProps) {
  const navigate = useNavigate();
  const { trackCertificateViewed, trackCertificateShared, trackPostCourseMissionStarted } = useCertificates();
  
  const [activeTab, setActiveTab] = useState("certificate");
  const [isExporting, setIsExporting] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<TemplateFormat>("1:1");
  const [exportError, setExportError] = useState(false);
  
  const certificateRef1x1 = useRef<HTMLDivElement>(null);
  const certificateRef4x5 = useRef<HTMLDivElement>(null);

  // Track view on open
  useEffect(() => {
    if (open && certificate) {
      trackCertificateViewed(courseId, certificate.certificate_code);
    }
  }, [open, certificate, courseId, trackCertificateViewed]);

  if (!certificate) return null;

  const certificateData: CertificateData = {
    volunteerName,
    courseTitle,
    courseLevel,
    completedAt: certificate.issued_at,
    certificateCode: certificate.certificate_code,
    cidade: volunteerCidade,
  };

  const handleDownload = async () => {
    const ref = selectedFormat === "1:1" ? certificateRef1x1 : certificateRef4x5;
    if (!ref.current) {
      setExportError(true);
      return;
    }

    setIsExporting(true);
    setExportError(false);

    try {
      const dataUrl = await toPng(ref.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#0B0B0E",
      });

      // Create download link
      const link = document.createElement("a");
      link.download = `certificado-${courseTitle.replace(/\s+/g, "-").toLowerCase()}-${selectedFormat.replace(":", "x")}.png`;
      link.href = dataUrl;
      link.click();

      trackCertificateShared(courseId, certificate.certificate_code, "download");
      toast.success("Certificado baixado!");
    } catch (error) {
      console.error("Export error:", error);
      setExportError(true);
      toast.error("Erro ao gerar imagem. Use o botão de copiar texto.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = async () => {
    const ref = selectedFormat === "1:1" ? certificateRef1x1 : certificateRef4x5;
    if (!ref.current) {
      handleCopyText();
      return;
    }

    setIsExporting(true);
    setExportError(false);

    try {
      const dataUrl = await toPng(ref.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#0B0B0E",
      });

      // Convert to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], "certificado.png", { type: "image/png" });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Certificado: ${courseTitle}`,
          text: `Concluí o curso "${courseTitle}" na Missão ÉLuta! #ÉLUTA`,
        });
        trackCertificateShared(courseId, certificate.certificate_code, "native_share");
        toast.success("Compartilhado!");
      } else {
        // Fallback: download
        handleDownload();
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("Share error:", error);
        setExportError(true);
        handleCopyText();
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyText = () => {
    const text = `🎓 Certificado de Formação

Concluí o curso "${courseTitle}" (Nível ${courseLevel}) na Missão ÉLuta!

Código do certificado: ${certificate.certificate_code.toUpperCase()}

#ÉLUTA — Escutar • Cuidar • Organizar

${PUBLISHED_URL}`;

    navigator.clipboard.writeText(text);
    trackCertificateShared(courseId, certificate.certificate_code, "copy_text");
    toast.success("Texto copiado para o WhatsApp!");
  };

  const handleStartMission = (missionType: "street" | "conversation") => {
    trackPostCourseMissionStarted(courseId, missionType);
    onOpenChange(false);
    
    if (missionType === "street") {
      navigate("/voluntario/missao-rua");
    } else {
      navigate("/voluntario/missao-conversa");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Award className="h-5 w-5" />
            Curso Concluído!
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="certificate" className="text-xs">
              <Award className="h-4 w-4 mr-1" />
              Certificado
            </TabsTrigger>
            <TabsTrigger value="share" className="text-xs">
              <Share2 className="h-4 w-4 mr-1" />
              Compartilhar
            </TabsTrigger>
            <TabsTrigger value="action" className="text-xs">
              <Target className="h-4 w-4 mr-1" />
              Praticar
            </TabsTrigger>
          </TabsList>

          {/* Certificate Preview Tab */}
          <TabsContent value="certificate" className="space-y-4">
            <div className="text-center">
              <Badge variant="default" className="bg-green-600 mb-2">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Formação Completa
              </Badge>
              <p className="text-sm text-muted-foreground">
                Parabéns! Você completou o curso <strong>{courseTitle}</strong>.
              </p>
            </div>

            {/* Format selector */}
            <div className="flex justify-center gap-2">
              <Button
                variant={selectedFormat === "1:1" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedFormat("1:1")}
              >
                1:1
              </Button>
              <Button
                variant={selectedFormat === "4:5" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedFormat("4:5")}
              >
                4:5
              </Button>
            </div>

            {/* Certificate Preview */}
            <div className="flex justify-center overflow-hidden rounded-lg border border-border">
              <div style={{ transform: "scale(0.3)", transformOrigin: "top center" }}>
                {selectedFormat === "1:1" ? (
                  <CertificateRenderer
                    ref={certificateRef1x1}
                    data={certificateData}
                    format="1:1"
                  />
                ) : (
                  <CertificateRenderer
                    ref={certificateRef4x5}
                    data={certificateData}
                    format="4:5"
                  />
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleDownload}
                disabled={isExporting}
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Baixar
              </Button>
              <Button
                className="flex-1"
                onClick={handleShare}
                disabled={isExporting}
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Share2 className="h-4 w-4 mr-2" />
                )}
                Compartilhar
              </Button>
            </div>

            {exportError && (
              <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm">
                <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                <span className="text-muted-foreground">
                  Erro ao gerar imagem. Use o botão abaixo para copiar o texto.
                </span>
              </div>
            )}
          </TabsContent>

          {/* Share Tab */}
          <TabsContent value="share" className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Compartilhe sua conquista nas redes sociais!
            </p>

            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleShare}
                disabled={isExporting}
              >
                <Share2 className="h-4 w-4 mr-3" />
                Compartilhar Imagem
                <ArrowRight className="h-4 w-4 ml-auto" />
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleCopyText}
              >
                <MessageCircle className="h-4 w-4 mr-3" />
                Copiar texto para WhatsApp
                <Copy className="h-4 w-4 ml-auto" />
              </Button>
            </div>

            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">Prévia do texto:</p>
              <p className="text-sm">
                🎓 Concluí o curso "{courseTitle}" na Missão ÉLuta!<br />
                <span className="text-muted-foreground">Código: {certificate.certificate_code.toUpperCase()}</span>
              </p>
            </div>

            {/* Privacy Settings */}
            <div className="border-t pt-4">
              <p className="text-xs font-medium text-muted-foreground mb-3">
                Configurações do link público
              </p>
              <CertificatePrivacySettings certificate={certificate} />
            </div>
          </TabsContent>

          {/* Action Tab */}
          <TabsContent value="action" className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Aplique o que aprendeu! Escolha uma missão para colocar em prática:
              </p>
            </div>

            <div className="space-y-3">
              <button
                className="w-full p-4 border border-border rounded-lg hover:border-primary/50 transition-colors text-left"
                onClick={() => handleStartMission("street")}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold">Missão de Rua</h4>
                    <p className="text-sm text-muted-foreground">
                      Imprima materiais e distribua no seu bairro
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </button>

              <button
                className="w-full p-4 border border-border rounded-lg hover:border-primary/50 transition-colors text-left"
                onClick={() => handleStartMission("conversation")}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold">Missão de Conversa</h4>
                    <p className="text-sm text-muted-foreground">
                      Converse com contatos do seu CRM
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Sua ação será registrada para acompanhamento do progresso.
            </p>
          </TabsContent>
        </Tabs>

        {/* Hidden renderers for export */}
        <div className="fixed -left-[9999px] -top-[9999px]" aria-hidden="true">
          <CertificateRenderer
            ref={certificateRef1x1}
            data={certificateData}
            format="1:1"
          />
          <CertificateRenderer
            ref={certificateRef4x5}
            data={certificateData}
            format="4:5"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
