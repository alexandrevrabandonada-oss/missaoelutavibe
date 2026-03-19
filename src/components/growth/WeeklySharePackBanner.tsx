import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, Copy, MessageCircle, X, Trophy, Flame, ArrowLeft } from "lucide-react";
import { useWeeklySharePack } from "@/hooks/useWeeklySharePack";

const REASON_CONFIG: Record<string, { icon: React.ReactNode; title: string; subtitle: string }> = {
  goal3: {
    icon: <Trophy className="h-5 w-5 text-yellow-500" />,
    title: "3 ações essa semana! 🎉",
    subtitle: "Compartilhe sua conquista e convide mais gente",
  },
  streak_milestone: {
    icon: <Flame className="h-5 w-5 text-orange-500" />,
    title: "3 dias de luta! 🔥",
    subtitle: "Seu ritmo inspira — compartilhe e some +1",
  },
  return_complete: {
    icon: <ArrowLeft className="h-5 w-5 text-green-500" />,
    title: "Você voltou! ✊",
    subtitle: "Celebre a retomada e convide alguém",
  },
};

export function WeeklySharePackBanner() {
  const { 
    data, 
    shouldShowBanner, 
    trackView, 
    shareNative, 
    copyText, 
    openWhatsApp,
    isLoading,
  } = useWeeklySharePack();
  
  const [dismissed, setDismissed] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // Track view on mount (with dedup)
  useEffect(() => {
    if (shouldShowBanner && !dismissed) {
      trackView();
    }
  }, [shouldShowBanner, dismissed, trackView]);

  if (isLoading || !shouldShowBanner || dismissed) {
    return null;
  }

  const reason = data?.reason || "goal3";
  const config = REASON_CONFIG[reason] || REASON_CONFIG.goal3;

  const handleShare = async () => {
    setIsSharing(true);
    
    // Try native share first
    const success = await shareNative();
    
    // If native share failed/cancelled, fall back to copy
    if (!success) {
      await copyText();
    }
    
    setIsSharing(false);
  };

  const handleWhatsApp = async () => {
    await openWhatsApp();
  };

  const handleCopy = async () => {
    await copyText();
  };

  return (
    <Card className="relative border-primary/30 bg-gradient-to-r from-primary/5 to-transparent overflow-hidden">
      {/* Dismiss button */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted/50 transition-colors"
        aria-label="Fechar"
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>

      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            {config.icon}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">
              {config.title}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {config.subtitle}
            </p>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 mt-3">
              <Button
                size="sm"
                onClick={handleShare}
                disabled={isSharing}
                className="gap-1.5"
              >
                <Share2 className="h-3.5 w-3.5" />
                Compartilhar
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={handleCopy}
                className="gap-1.5"
              >
                <Copy className="h-3.5 w-3.5" />
                Copiar
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={handleWhatsApp}
                className="gap-1.5 text-green-600 hover:text-green-700 hover:bg-green-50"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp
              </Button>
            </div>
          </div>
        </div>

        {/* Preview of share text (truncated) */}
        {data?.share_text && (
          <div className="mt-3 p-2 bg-muted/50 rounded text-xs text-muted-foreground line-clamp-2 italic">
            "{data.share_text.split("\n")[0]}..."
          </div>
        )}
      </CardContent>
    </Card>
  );
}
