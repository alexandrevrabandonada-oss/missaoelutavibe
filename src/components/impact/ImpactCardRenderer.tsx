/**
 * ImpactCardRenderer - Generates shareable impact card images
 * Reuses the pattern from CertificateRenderer
 */

import { useRef, useCallback } from "react";
import { toPng } from "html-to-image";
import { Card, CardContent } from "@/components/ui/card";
import { Zap, Users, Share2 } from "lucide-react";

interface ImpactCardData {
  actionsCompleted: number;
  contactsAdded: number;
  invitesShared: number;
  windowDays: number;
}

interface ImpactCardRendererProps {
  data: ImpactCardData;
  format: "1:1" | "4:5";
  onExport?: (blob: Blob) => void;
}

const FORMAT_SIZES = {
  "1:1": { width: 1080, height: 1080 },
  "4:5": { width: 1080, height: 1350 },
};

export function ImpactCardRenderer({ data, format, onExport }: ImpactCardRendererProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { width, height } = FORMAT_SIZES[format];

  const exportImage = useCallback(async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;

    try {
      const dataUrl = await toPng(cardRef.current, {
        width,
        height,
        pixelRatio: 2,
        backgroundColor: "#000000",
      });

      // Convert data URL to Blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      
      if (onExport) {
        onExport(blob);
      }
      
      return blob;
    } catch (error) {
      console.error("Failed to export impact card:", error);
      return null;
    }
  }, [width, height, onExport]);

  return (
    <>
      {/* Hidden render target */}
      <div
        ref={cardRef}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          position: "absolute",
          left: "-9999px",
          top: "-9999px",
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

      {/* Expose export function */}
      <ImpactCardExporter exportImage={exportImage} />
    </>
  );
}

// Separate component to expose export function via ref
interface ExporterProps {
  exportImage: () => Promise<Blob | null>;
}

let exportFn: (() => Promise<Blob | null>) | null = null;

function ImpactCardExporter({ exportImage }: ExporterProps) {
  exportFn = exportImage;
  return null;
}

export function getImpactCardExporter(): (() => Promise<Blob | null>) | null {
  return exportFn;
}
