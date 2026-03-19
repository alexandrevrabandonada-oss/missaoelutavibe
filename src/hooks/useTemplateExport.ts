/**
 * useTemplateExport - Hook para exportar TemplateRenderer como PNG
 * Usa html-to-image para conversão client-side com boa nitidez
 */

import { useState, useCallback, RefObject } from "react";
import { toPng } from "html-to-image";
import { toast } from "sonner";
import { 
  TemplateFormat, 
  TEMPLATE_FORMATS, 
  GeneratedImage,
  TemplateData 
} from "@/components/fabrica/template-engine/types";

interface UseTemplateExportOptions {
  /** Qualidade do PNG (1 = máxima) */
  pixelRatio?: number;
  /** Callback após export bem-sucedido */
  onSuccess?: (images: GeneratedImage[]) => void;
}

export function useTemplateExport(options: UseTemplateExportOptions = {}) {
  const { pixelRatio = 2, onSuccess } = options;
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  /**
   * Exporta um único elemento como PNG
   */
  const exportSingle = useCallback(
    async (
      elementRef: RefObject<HTMLDivElement>,
      format: TemplateFormat,
      filename: string
    ): Promise<GeneratedImage | null> => {
      if (!elementRef.current) {
        toast.error("Elemento não encontrado para exportar");
        return null;
      }

      try {
        const dataUrl = await toPng(elementRef.current, {
          pixelRatio,
          cacheBust: true,
          backgroundColor: '#0B0B0E',
        });

        return {
          format,
          dataUrl,
          filename: `${filename}-${TEMPLATE_FORMATS[format].variantKey}.png`,
        };
      } catch (error) {
        console.error("Export error:", error);
        toast.error(`Erro ao exportar ${format}`);
        return null;
      }
    },
    [pixelRatio]
  );

  /**
   * Exporta múltiplos formatos de uma vez
   */
  const exportMultiple = useCallback(
    async (
      refs: Record<TemplateFormat, RefObject<HTMLDivElement>>,
      baseFilename: string,
      formats: TemplateFormat[] = ['1:1', '4:5', '9:16']
    ): Promise<GeneratedImage[]> => {
      setIsExporting(true);
      setProgress(0);
      
      const results: GeneratedImage[] = [];
      const total = formats.length;

      for (let i = 0; i < formats.length; i++) {
        const format = formats[i];
        const ref = refs[format];
        
        if (!ref?.current) continue;

        try {
          const dataUrl = await toPng(ref.current, {
            pixelRatio,
            cacheBust: true,
            backgroundColor: '#0B0B0E',
          });

          // Converte dataUrl para Blob
          const response = await fetch(dataUrl);
          const blob = await response.blob();

          results.push({
            format,
            dataUrl,
            filename: `${baseFilename}-${TEMPLATE_FORMATS[format].variantKey}.png`,
            blob,
          });
        } catch (error) {
          console.error(`Export error for ${format}:`, error);
        }

        setProgress(((i + 1) / total) * 100);
      }

      setIsExporting(false);
      setProgress(0);

      if (results.length > 0) {
        onSuccess?.(results);
      }

      return results;
    },
    [pixelRatio, onSuccess]
  );

  /**
   * Faz download de uma imagem gerada
   */
  const downloadImage = useCallback((image: GeneratedImage) => {
    const link = document.createElement("a");
    link.href = image.dataUrl;
    link.download = image.filename;
    link.click();
    toast.success(`📥 ${image.filename} baixado!`);
  }, []);

  /**
   * Faz download de todas as imagens geradas
   */
  const downloadAll = useCallback((images: GeneratedImage[]) => {
    images.forEach((img, i) => {
      // Delay para evitar bloqueio do browser
      setTimeout(() => {
        downloadImage(img);
      }, i * 300);
    });
  }, [downloadImage]);

  /**
   * Converte dataUrl para Blob para upload
   */
  const dataUrlToBlob = useCallback(async (dataUrl: string): Promise<Blob> => {
    const response = await fetch(dataUrl);
    return response.blob();
  }, []);

  return {
    exportSingle,
    exportMultiple,
    downloadImage,
    downloadAll,
    dataUrlToBlob,
    isExporting,
    progress,
  };
}

/**
 * Gera nome de arquivo seguro a partir do título
 */
export function generateFilename(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}
