import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
import { 
  ChevronDown, 
  ChevronUp, 
  Upload, 
  X, 
  Check, 
  AlertCircle,
  Link2
} from "lucide-react";
import { VARIANT_LABELS, PLATFORM_CONFIG } from "@/hooks/useSharePack";

export interface SharePackFormData {
  whatsapp_text: string;
  instagram_caption: string;
  tiktok_caption: string;
  hook: string;
  cta: string;
}

export interface VariantFile {
  url: string;
  filename: string;
}

export interface AttachmentsByVariant {
  square_1x1?: VariantFile[];
  feed_4x5?: VariantFile[];
  vertical_9x16?: VariantFile[];
  thumb_16x9?: VariantFile[];
}

interface SharePackEditorProps {
  sharePack: SharePackFormData;
  onSharePackChange: (data: Partial<SharePackFormData>) => void;
  attachmentsByVariant: AttachmentsByVariant;
  onVariantFilesChange: (variant: string, files: VariantFile[]) => void;
  onAddVariantFile: (variant: string, url: string, filename: string) => void;
  onRemoveVariantFile: (variant: string, index: number) => void;
  templateTitulo?: string;
  templateId?: string;
  baseText?: string;
  hashtags?: string[];
}

const VARIANTS = ['square_1x1', 'feed_4x5', 'vertical_9x16', 'thumb_16x9'] as const;
const REQUIRED_VARIANTS = ['vertical_9x16', 'feed_4x5'] as const;

export function SharePackEditor({
  sharePack,
  onSharePackChange,
  attachmentsByVariant,
  onAddVariantFile,
  onRemoveVariantFile,
  templateTitulo = "",
  templateId = "",
  baseText = "",
  hashtags = [],
}: SharePackEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newFileUrl, setNewFileUrl] = useState<Record<string, string>>({});
  const [newFileName, setNewFileName] = useState<Record<string, string>>({});

  // Check which variants have files
  const variantStatus = VARIANTS.map(v => ({
    variant: v,
    hasFiles: (attachmentsByVariant[v]?.length || 0) > 0,
    count: attachmentsByVariant[v]?.length || 0,
    required: REQUIRED_VARIANTS.includes(v as any),
  }));

  const hasRequiredVariant = variantStatus.some(v => v.required && v.hasFiles);

  // Generate preview link
  const previewLink = templateId 
    ? `https://missaoeluta.lovable.app/comecar?t=${templateId}&ref=CODIGO&utm_source=fabrica&utm_medium=whatsapp`
    : "(salve primeiro para gerar link)";

  const handleAddFile = (variant: string) => {
    const url = newFileUrl[variant];
    const filename = newFileName[variant] || `arquivo-${variant}`;
    
    if (url) {
      onAddVariantFile(variant, url, filename);
      setNewFileUrl({ ...newFileUrl, [variant]: "" });
      setNewFileName({ ...newFileName, [variant]: "" });
    }
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card className="border-dashed">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                📦 Share Pack
                {!hasRequiredVariant && (
                  <Badge variant="outline" className="text-destructive border-destructive text-xs">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Sem variante
                  </Badge>
                )}
                {hasRequiredVariant && (
                  <Badge variant="outline" className="text-green-500 border-green-500 text-xs">
                    <Check className="h-3 w-3 mr-1" />
                    OK
                  </Badge>
                )}
              </CardTitle>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {/* Variant Checklist */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Variantes de Mídia
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {variantStatus.map(({ variant, hasFiles, count, required }) => (
                  <div 
                    key={variant}
                    className={`flex items-center justify-between p-2 rounded border ${
                      hasFiles 
                        ? "border-green-500/50 bg-green-500/5" 
                        : required 
                        ? "border-destructive/50 bg-destructive/5"
                        : "border-muted"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {hasFiles ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                      )}
                      <span className="text-xs">{VARIANT_LABELS[variant]}</span>
                    </div>
                    {count > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {count}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                * Requer pelo menos 1 arquivo em <strong>Feed 4:5</strong> ou <strong>Vertical 9:16</strong>
              </p>
            </div>

            <Separator />

            {/* Add files per variant */}
            <div className="space-y-3">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Adicionar Arquivos
              </Label>
              
              {VARIANTS.map((variant) => (
                <div key={variant} className="space-y-2 p-2 bg-muted/30 rounded">
                  <p className="text-xs font-medium">{VARIANT_LABELS[variant]}</p>
                  
                  {/* Existing files */}
                  {(attachmentsByVariant[variant] || []).map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs bg-background rounded p-1">
                      <img 
                        src={file.url} 
                        alt={file.filename}
                        className="h-8 w-8 object-cover rounded"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/placeholder.svg";
                        }}
                      />
                      <span className="flex-1 truncate">{file.filename}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => onRemoveVariantFile(variant, idx)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  
                  {/* Add new file */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="URL do arquivo..."
                      value={newFileUrl[variant] || ""}
                      onChange={(e) => setNewFileUrl({ ...newFileUrl, [variant]: e.target.value })}
                      className="text-xs h-8"
                    />
                    <Input
                      placeholder="Nome"
                      value={newFileName[variant] || ""}
                      onChange={(e) => setNewFileName({ ...newFileName, [variant]: e.target.value })}
                      className="text-xs h-8 w-24"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8"
                      onClick={() => handleAddFile(variant)}
                      disabled={!newFileUrl[variant]}
                    >
                      <Upload className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <Separator />

            {/* Text fields */}
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Hook (1 linha)</Label>
                <Input
                  placeholder="Ex: 🚨 URGENTE: O governo..."
                  value={sharePack.hook}
                  onChange={(e) => onSharePackChange({ hook: e.target.value })}
                  className="text-sm"
                />
              </div>

              <div>
                <Label className="text-xs">CTA (1 linha)</Label>
                <Input
                  placeholder="Ex: Compartilhe e ajude a espalhar!"
                  value={sharePack.cta}
                  onChange={(e) => onSharePackChange({ cta: e.target.value })}
                  className="text-sm"
                />
              </div>

              <div>
                <Label className="text-xs">Texto WhatsApp (curto)</Label>
                <Textarea
                  placeholder="Texto curto para WhatsApp com CTA..."
                  value={sharePack.whatsapp_text}
                  onChange={(e) => onSharePackChange({ whatsapp_text: e.target.value })}
                  rows={3}
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {sharePack.whatsapp_text?.length || 0} chars
                </p>
              </div>

              <div>
                <Label className="text-xs">Legenda Instagram (até 2200)</Label>
                <Textarea
                  placeholder="Legenda completa para Instagram..."
                  value={sharePack.instagram_caption}
                  onChange={(e) => onSharePackChange({ instagram_caption: e.target.value })}
                  rows={4}
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {sharePack.instagram_caption?.length || 0}/2200 chars
                </p>
              </div>

              <div>
                <Label className="text-xs">Legenda TikTok (150-300)</Label>
                <Textarea
                  placeholder="Texto curto para TikTok..."
                  value={sharePack.tiktok_caption}
                  onChange={(e) => onSharePackChange({ tiktok_caption: e.target.value })}
                  rows={2}
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {sharePack.tiktok_caption?.length || 0} chars (ideal: 150-300)
                </p>
              </div>
            </div>

            <Separator />

            {/* Link Preview */}
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Link2 className="h-3 w-3" />
                Link Rastreável
              </Label>
              <div className="bg-muted/50 rounded p-2 text-xs break-all font-mono">
                {previewLink}
              </div>
              <p className="text-xs text-muted-foreground">
                O código de convite do voluntário será inserido automaticamente
              </p>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

// Helper to check if template has required variants
export function hasRequiredSharePackVariant(attachmentsByVariant: AttachmentsByVariant | null): boolean {
  if (!attachmentsByVariant) return false;
  return (
    (attachmentsByVariant.vertical_9x16?.length || 0) > 0 ||
    (attachmentsByVariant.feed_4x5?.length || 0) > 0
  );
}
