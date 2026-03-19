/**
 * TemplateGeneratorModal - Modal para gerar artes PNG
 * Integra na Fábrica de Base para templates aprovados
 */

import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Download, 
  Image as ImageIcon, 
  Wand2, 
  Check, 
  Square, 
  RectangleVertical,
  Smartphone,
  Save,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";

import { TemplateRenderer } from "./template-engine/TemplateRenderer";
import { 
  TemplateData, 
  TemplateFormat, 
  TEMPLATE_FORMATS,
  GeneratedImage 
} from "./template-engine/types";
import { useTemplateExport, generateFilename } from "@/hooks/useTemplateExport";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface TemplateGeneratorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateTitle: string;
  templateId: string;
  baseText?: string;
  onSaveAttachments?: (images: GeneratedImage[]) => Promise<void>;
}

// Valores default oficiais (sem PII)
const DEFAULT_DATA: Partial<TemplateData> = {
  name: 'Alexandre Fonseca',
  handle: '@alexandre_fonseca',
  footer: 'ESCUTAR • CUIDAR • ORGANIZAR',
};

export function TemplateGeneratorModal({
  open,
  onOpenChange,
  templateTitle,
  templateId,
  baseText,
  onSaveAttachments,
}: TemplateGeneratorModalProps) {
  // Refs para cada formato
  const ref1x1 = useRef<HTMLDivElement>(null);
  const ref4x5 = useRef<HTMLDivElement>(null);
  const ref9x16 = useRef<HTMLDivElement>(null);

  // Estado do formulário
  const [data, setData] = useState<TemplateData>({
    title: templateTitle || 'TÍTULO AQUI',
    subtitle: '',
    cta: '',
    emphasisWords: '',
    ...DEFAULT_DATA,
  });

  // Formatos selecionados para geração
  const [selectedFormats, setSelectedFormats] = useState<TemplateFormat[]>(['1:1', '4:5', '9:16']);
  
  // Imagens geradas
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const { exportMultiple, downloadImage, downloadAll, isExporting, progress } = useTemplateExport({
    pixelRatio: 2,
    onSuccess: (images) => {
      setGeneratedImages(images);
      toast.success(`✨ ${images.length} imagem(ns) gerada(s)!`);
    },
  });

  // Atualiza título quando prop muda
  useEffect(() => {
    if (templateTitle) {
      setData(prev => ({ ...prev, title: templateTitle }));
    }
  }, [templateTitle]);

  // Extrai palavras-chave do baseText para sugestão de ênfase
  useEffect(() => {
    if (baseText && !data.emphasisWords) {
      // Sugere primeiras 2 palavras importantes (>4 chars)
      const words = baseText.split(/\s+/)
        .filter(w => w.length > 4 && !w.startsWith('#'))
        .slice(0, 2);
      if (words.length > 0) {
        setData(prev => ({ ...prev, emphasisWords: words.join('|') }));
      }
    }
  }, [baseText]);

  const handleGenerate = async () => {
    await exportMultiple(
      { '1:1': ref1x1, '4:5': ref4x5, '9:16': ref9x16 },
      generateFilename(data.title),
      selectedFormats
    );
  };

  const handleSave = async () => {
    if (generatedImages.length === 0 || !onSaveAttachments) return;
    
    setIsSaving(true);
    try {
      await onSaveAttachments(generatedImages);
      toast.success("✅ Imagens salvas no template!");
      onOpenChange(false);
    } catch (error) {
      toast.error("Erro ao salvar imagens");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleFormat = (format: TemplateFormat) => {
    setSelectedFormats(prev => 
      prev.includes(format)
        ? prev.filter(f => f !== format)
        : [...prev, format]
    );
  };

  const dialogTitleId = "template-generator-dialog-title";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-4xl max-h-[95vh] overflow-y-auto"
        aria-labelledby={dialogTitleId}
      >
        <DialogHeader>
          <DialogTitle id={dialogTitleId} className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" aria-hidden="true" />
            Gerador de Artes #ÉLUTA
          </DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Formulário */}
          <div className="space-y-4">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Headline Principal
              </Label>
              <Textarea
                value={data.title}
                onChange={(e) => setData({ ...data, title: e.target.value })}
                placeholder="TEXTO PRINCIPAL EM CAIXA ALTA"
                rows={2}
                className="font-bold uppercase"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {data.title.length}/50 caracteres
              </p>
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Subtítulo (opcional)
              </Label>
              <Input
                value={data.subtitle || ''}
                onChange={(e) => setData({ ...data, subtitle: e.target.value })}
                placeholder="Contexto ou categoria"
              />
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                CTA - Call to Action (opcional)
              </Label>
              <Input
                value={data.cta || ''}
                onChange={(e) => setData({ ...data, cta: e.target.value })}
                placeholder="Ex: COMPARTILHE AGORA"
              />
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Palavras em Amarelo (separar com |)
              </Label>
              <Input
                value={data.emphasisWords || ''}
                onChange={(e) => setData({ ...data, emphasisWords: e.target.value })}
                placeholder="palavra1|palavra2|palavra3"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Estas palavras aparecerão em amarelo destaque
              </p>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Cidade (opcional)</Label>
                <Input
                  value={data.cidade || ''}
                  onChange={(e) => setData({ ...data, cidade: e.target.value })}
                  placeholder="São Paulo"
                />
              </div>
              <div>
                <Label className="text-xs">Handle</Label>
                <Input
                  value={data.handle || ''}
                  onChange={(e) => setData({ ...data, handle: e.target.value })}
                  placeholder="@usuario"
                />
              </div>
            </div>

            <Separator />

            {/* Seleção de formatos */}
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
                Formatos para gerar
              </Label>
              <div className="flex gap-2">
                {(Object.entries(TEMPLATE_FORMATS) as [TemplateFormat, typeof TEMPLATE_FORMATS['1:1']][]).map(
                  ([format, config]) => (
                    <Button
                      key={format}
                      variant={selectedFormats.includes(format) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleFormat(format)}
                      className="flex-1 gap-1"
                    >
                      {format === '1:1' && <Square className="h-3 w-3" />}
                      {format === '4:5' && <RectangleVertical className="h-3 w-3" />}
                      {format === '9:16' && <Smartphone className="h-3 w-3" />}
                      {format}
                      {selectedFormats.includes(format) && <Check className="h-3 w-3 ml-1" />}
                    </Button>
                  )
                )}
              </div>
            </div>

            {/* Botão de geração */}
            <Button
              onClick={handleGenerate}
              disabled={isExporting || selectedFormats.length === 0}
              className="w-full gap-2"
              size="lg"
            >
              {isExporting ? (
                <>
                  <LoadingSpinner size="sm" />
                  Gerando... {Math.round(progress)}%
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  Gerar {selectedFormats.length} Imagem(ns)
                </>
              )}
            </Button>

            {isExporting && <Progress value={progress} className="h-2" />}
          </div>

          {/* Preview */}
          <div className="space-y-4">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Preview (escala reduzida)
            </Label>
            
            <Tabs defaultValue="9:16" className="w-full">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="1:1">1:1</TabsTrigger>
                <TabsTrigger value="4:5">4:5</TabsTrigger>
                <TabsTrigger value="9:16">9:16</TabsTrigger>
              </TabsList>

              <TabsContent value="1:1" className="flex justify-center py-2">
                <div className="border border-border rounded overflow-hidden">
                  <TemplateRenderer ref={ref1x1} data={data} format="1:1" scale={0.25} />
                </div>
              </TabsContent>

              <TabsContent value="4:5" className="flex justify-center py-2">
                <div className="border border-border rounded overflow-hidden">
                  <TemplateRenderer ref={ref4x5} data={data} format="4:5" scale={0.22} />
                </div>
              </TabsContent>

              <TabsContent value="9:16" className="flex justify-center py-2">
                <div className="border border-border rounded overflow-hidden">
                  <TemplateRenderer ref={ref9x16} data={data} format="9:16" scale={0.18} />
                </div>
              </TabsContent>
            </Tabs>

            {/* Imagens geradas */}
            {generatedImages.length > 0 && (
              <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                    ✅ Imagens Geradas
                  </Label>
                  <Button variant="ghost" size="sm" onClick={() => downloadAll(generatedImages)}>
                    <Download className="h-3 w-3 mr-1" />
                    Baixar Todas
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {generatedImages.map((img) => (
                    <div
                      key={img.format}
                      className="relative group cursor-pointer"
                      onClick={() => downloadImage(img)}
                    >
                      <img
                        src={img.dataUrl}
                        alt={img.filename}
                        className="w-full h-auto rounded border border-border"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded">
                        <Download className="h-5 w-5 text-white" />
                      </div>
                      <Badge variant="secondary" className="absolute bottom-1 right-1 text-[10px]">
                        {img.format}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          {onSaveAttachments && generatedImages.length > 0 && (
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              {isSaving ? (
                <LoadingSpinner size="sm" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Salvar no Template
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
