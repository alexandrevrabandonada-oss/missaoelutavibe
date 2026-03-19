import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import { 
  Share2, 
  Copy, 
  Download, 
  Link2, 
  ExternalLink,
  Smartphone,
  Monitor,
  AlertCircle,
  Check,
  ChevronDown,
  Info,
  Film
} from "lucide-react";
import { 
  useSharePack, 
  useTrackShareAction, 
  SharePlatform,
  PLATFORM_CONFIG,
  canShareFiles,
  shareMedia,
  openWhatsAppWithText,
  downloadFiles,
  copyToClipboard,
  SharePackFile
} from "@/hooks/useSharePack";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface SharePackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId: string;
  templateTitle: string;
}

// Platform-specific instructions for TikTok and Reels
const PLATFORM_INSTRUCTIONS: Partial<Record<SharePlatform, string[]>> = {
  tiktok: [
    "1. Abra o TikTok",
    "2. Toque no botão + (criar)",
    "3. Selecione 'Upload' e escolha o arquivo",
    "4. Cole a legenda copiada",
    "5. Adicione hashtags e publique!"
  ],
  instagram_reels: [
    "1. Abra o Instagram",
    "2. Toque no + e selecione 'Reels'",
    "3. Toque em 'Upload' (galeria)",
    "4. Selecione o arquivo baixado",
    "5. Cole a legenda e publique!"
  ]
};

// Platforms that prioritize 9:16 vertical format
const VERTICAL_PLATFORMS: SharePlatform[] = ['tiktok', 'instagram_reels'];

export function SharePackModal({ 
  open, 
  onOpenChange, 
  templateId,
  templateTitle 
}: SharePackModalProps) {
  const [platform, setPlatform] = useState<SharePlatform>("whatsapp");
  const [isSharing, setIsSharing] = useState(false);
  const [copied, setCopied] = useState<'caption' | 'link' | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  
  const { data: sharePack, isLoading } = useSharePack(templateId, platform);
  const trackAction = useTrackShareAction();
  
  const supportsFiles = canShareFiles();
  const isMobile = typeof window !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const isVerticalPlatform = VERTICAL_PLATFORMS.includes(platform);
  const instructions = PLATFORM_INSTRUCTIONS[platform];

  // Reset state when modal closes or platform changes
  useEffect(() => {
    if (!open) {
      setCopied(null);
      setShowInstructions(false);
    }
  }, [open]);

  useEffect(() => {
    setShowInstructions(false);
  }, [platform]);

  const handleShareMedia = async () => {
    if (!sharePack?.files?.length) {
      toast.error("Nenhuma mídia disponível");
      return;
    }

    setIsSharing(true);
    
    try {
      const result = await shareMedia(
        sharePack.files,
        sharePack.caption,
        sharePack.link_full,
        platform
      );

      // Track with specific platform action
      const trackingAction = platform === 'tiktok' 
        ? 'share_tiktok' 
        : platform === 'instagram_reels' 
          ? 'share_instagram_reels' 
          : `share_${platform}`;

      if (result.success) {
        trackAction.mutate({
          templateId,
          action: trackingAction as any,
          meta: { method: result.method, platform_post: `${platform}_post` }
        });
        toast.success("📣 Compartilhado!");
        onOpenChange(false);
      } else if (result.error === 'cancelled') {
        // User cancelled - do nothing
      } else if (result.error === 'not_supported') {
        toast.info("Use os botões abaixo para baixar e copiar");
      }
    } catch (error) {
      console.error("Share error:", error);
      toast.error("Erro ao compartilhar. Tente baixar e copiar.");
    } finally {
      setIsSharing(false);
    }
  };

  const handleWhatsAppText = () => {
    if (!sharePack) return;
    openWhatsAppWithText(sharePack.caption + "\n\n" + sharePack.link_full);
    trackAction.mutate({ templateId, action: 'share_whatsapp' });
  };

  const handleCopyCaption = async () => {
    if (!sharePack) return;
    const success = await copyToClipboard(sharePack.caption);
    if (success) {
      setCopied('caption');
      toast.success("Legenda copiada!");
      
      // Track with platform-specific action for TikTok/Reels
      const meta: Record<string, any> = {};
      if (platform === 'tiktok') {
        meta.platform_post = 'tiktok_post';
      } else if (platform === 'instagram_reels') {
        meta.platform_post = 'ig_reels_post';
      }
      
      trackAction.mutate({ templateId, action: 'copy_caption', meta });
      setTimeout(() => setCopied(null), 2000);
    } else {
      toast.error("Erro ao copiar");
    }
  };

  const handleCopyLink = async () => {
    if (!sharePack) return;
    const success = await copyToClipboard(sharePack.link_full);
    if (success) {
      setCopied('link');
      toast.success("Link copiado!");
      trackAction.mutate({ templateId, action: 'copy_link' });
      setTimeout(() => setCopied(null), 2000);
    } else {
      toast.error("Erro ao copiar");
    }
  };

  const handleDownload = async () => {
    if (!sharePack?.files?.length) {
      toast.error("Nenhuma mídia para baixar");
      return;
    }
    await downloadFiles(sharePack.files);
    toast.success(`${sharePack.files.length} arquivo(s) baixado(s)!`);
    
    // Track with platform-specific action for TikTok/Reels
    const meta: Record<string, any> = {};
    if (platform === 'tiktok') {
      meta.platform_post = 'tiktok_post';
    } else if (platform === 'instagram_reels') {
      meta.platform_post = 'ig_reels_post';
    }
    
    trackAction.mutate({ templateId, action: 'download_media', meta });
  };

  const config = PLATFORM_CONFIG[platform];

  const dialogTitleId = "share-pack-dialog-title";
  const dialogDescId = "share-pack-dialog-desc";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-md max-h-[90vh] overflow-y-auto"
        aria-labelledby={dialogTitleId}
        aria-describedby={dialogDescId}
      >
        <DialogHeader>
          <DialogTitle id={dialogTitleId} className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" aria-hidden="true" />
            Compartilhar
          </DialogTitle>
          <p id={dialogDescId} className="text-sm text-muted-foreground truncate">{templateTitle}</p>
        </DialogHeader>

        {/* Platform Tabs */}
        <Tabs value={platform} onValueChange={(v) => setPlatform(v as SharePlatform)}>
          <TabsList className="w-full grid grid-cols-4 h-auto" aria-label="Plataformas de compartilhamento">
            {(Object.entries(PLATFORM_CONFIG) as [SharePlatform, typeof config][]).map(([key, cfg]) => (
              <TabsTrigger 
                key={key} 
                value={key} 
                className="flex flex-col gap-0.5 py-2 text-xs"
                aria-label={cfg.label}
              >
                <span className="text-lg" aria-hidden="true">{cfg.emoji}</span>
                <span className="hidden sm:inline">{cfg.label.split(' ')[0]}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {(Object.keys(PLATFORM_CONFIG) as SharePlatform[]).map((platformKey) => (
            <TabsContent key={platformKey} value={platformKey} className="space-y-4 mt-4">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : sharePack?.success === false ? (
                <div className="text-center py-4 text-destructive">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  <p>{sharePack.error || "Erro ao carregar"}</p>
                </div>
              ) : sharePack ? (
                <>
                  {/* Vertical format badge for TikTok/Reels */}
                  {VERTICAL_PLATFORMS.includes(platformKey) && (
                    <div className="flex items-center justify-center gap-2">
                      <Badge variant="secondary" className="gap-1">
                        <Film className="h-3 w-3" />
                        Formato 9:16 (vertical)
                      </Badge>
                    </div>
                  )}

                  {/* Media Preview */}
                  {sharePack.files && sharePack.files.length > 0 && (
                    <div className="relative">
                      <div className="aspect-[9/16] max-h-48 bg-muted rounded-lg overflow-hidden mx-auto w-fit">
                        <img 
                          src={sharePack.files[0].url}
                          alt="Preview"
                          className="h-full w-auto object-contain mx-auto"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/placeholder.svg";
                          }}
                        />
                      </div>
                      {sharePack.files.length > 1 && (
                        <Badge 
                          variant="secondary" 
                          className="absolute bottom-2 right-2"
                        >
                          +{sharePack.files.length - 1}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Action Buttons - Different layout for vertical platforms */}
                  <div className="space-y-2">
                    {/* TikTok/Reels: Prioritize mobile share if available, then download */}
                    {VERTICAL_PLATFORMS.includes(platformKey) ? (
                      <>
                        {/* Mobile with file sharing support: Primary share button */}
                        {isMobile && supportsFiles && sharePack.files && sharePack.files.length > 0 ? (
                          <Button 
                            className="w-full gap-2" 
                            size="lg"
                            onClick={handleShareMedia}
                            disabled={isSharing}
                          >
                            {isSharing ? (
                              <LoadingSpinner size="sm" />
                            ) : (
                              <>
                                <Share2 className="h-4 w-4" />
                                Compartilhar arquivo
                              </>
                            )}
                          </Button>
                        ) : (
                          /* Fallback: Download as primary action */
                          sharePack.files && sharePack.files.length > 0 && (
                            <Button 
                              className="w-full gap-2" 
                              size="lg"
                              onClick={handleDownload}
                            >
                              <Download className="h-4 w-4" />
                              Baixar 9:16
                            </Button>
                          )
                        )}

                        {/* Secondary: Copy caption + Instructions */}
                        <div className="grid grid-cols-2 gap-2">
                          <Button 
                            variant="outline" 
                            className="gap-1"
                            onClick={handleCopyCaption}
                          >
                            {copied === 'caption' ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                            Copiar legenda
                          </Button>

                          <Button 
                            variant="outline" 
                            className="gap-1"
                            onClick={() => setShowInstructions(!showInstructions)}
                          >
                            <Info className="h-4 w-4" />
                            Instruções
                          </Button>
                        </div>

                        {/* Instructions collapse */}
                        {instructions && (
                          <Collapsible open={showInstructions} onOpenChange={setShowInstructions}>
                            <CollapsibleContent>
                              <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                                <p className="font-medium text-xs uppercase tracking-wider text-muted-foreground mb-2">
                                  Como postar no {platformKey === 'tiktok' ? 'TikTok' : 'Instagram Reels'}:
                                </p>
                                {instructions.map((step, idx) => (
                                  <p key={idx} className="text-muted-foreground">{step}</p>
                                ))}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        )}

                        {/* Extra download if share was primary */}
                        {isMobile && supportsFiles && sharePack.files && sharePack.files.length > 0 && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="w-full gap-2 text-muted-foreground"
                            onClick={handleDownload}
                          >
                            <Download className="h-4 w-4" />
                            Baixar mídia ({sharePack.files.length})
                          </Button>
                        )}
                      </>
                    ) : (
                      /* Original layout for WhatsApp and IG Feed */
                      <>
                        {/* Primary: Share Media (mobile only or with files support) */}
                        {sharePack.files && sharePack.files.length > 0 && (isMobile || supportsFiles) && (
                          <Button 
                            className="w-full gap-2" 
                            size="lg"
                            onClick={handleShareMedia}
                            disabled={isSharing}
                          >
                            {isSharing ? (
                              <LoadingSpinner size="sm" />
                            ) : (
                              <>
                                <Share2 className="h-4 w-4" />
                                Compartilhar mídia
                              </>
                            )}
                          </Button>
                        )}

                        {/* WhatsApp-specific: Open wa.me with text */}
                        {platformKey === 'whatsapp' && (
                          <Button 
                            variant="outline" 
                            className="w-full gap-2"
                            onClick={handleWhatsAppText}
                          >
                            <ExternalLink className="h-4 w-4" />
                            Abrir WhatsApp (só texto)
                          </Button>
                        )}

                        {/* Secondary buttons */}
                        <div className="grid grid-cols-2 gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="gap-1"
                            onClick={handleCopyCaption}
                          >
                            {copied === 'caption' ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                            Legenda
                          </Button>

                          <Button 
                            variant="outline" 
                            size="sm"
                            className="gap-1"
                            onClick={handleCopyLink}
                          >
                            {copied === 'link' ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Link2 className="h-4 w-4" />
                            )}
                            Link
                          </Button>
                        </div>

                        {/* Download (always available) */}
                        {sharePack.files && sharePack.files.length > 0 && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="w-full gap-2 text-muted-foreground"
                            onClick={handleDownload}
                          >
                            <Download className="h-4 w-4" />
                            Baixar mídia ({sharePack.files.length})
                          </Button>
                        )}
                      </>
                    )}
                  </div>

                  {/* Caption Preview */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Prévia da legenda
                    </p>
                    <div className="bg-muted/50 rounded-lg p-3 text-sm max-h-32 overflow-y-auto">
                      <p className="whitespace-pre-wrap">{sharePack.caption}</p>
                    </div>
                    {/* Instagram hashtag limit note */}
                    {(platformKey === 'instagram_feed' || platformKey === 'instagram_reels') && 
                      sharePack.hashtags && sharePack.hashtags.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        🏷️ {Math.min(sharePack.hashtags.length, 5)} hashtags incluídas (máx. 5 para IG)
                      </p>
                    )}
                  </div>

                  {/* Link Preview */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded px-2 py-1">
                    <Link2 className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{sharePack.link_full}</span>
                  </div>

                  {/* Device indicator */}
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    {isMobile ? (
                      <>
                        <Smartphone className="h-3 w-3" />
                        {supportsFiles ? "Mobile (Share Sheet ativo)" : "Mobile (baixe e copie)"}
                      </>
                    ) : (
                      <>
                        <Monitor className="h-3 w-3" />
                        Desktop (baixe e copie)
                      </>
                    )}
                  </div>
                </>
              ) : null}
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
