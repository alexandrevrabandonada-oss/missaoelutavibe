import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useInviteLoop } from "@/hooks/useInviteLoop";
import { QRCodeSVG } from "qrcode.react";
import { Copy, QrCode, Share2, Users, X, ArrowRight, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface InviteLoopCardProps {
  variant?: "full" | "compact";
  className?: string;
}

export function InviteLoopCard({ variant = "full", className = "" }: InviteLoopCardProps) {
  const navigate = useNavigate();
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const {
    hasShared,
    inviteCode,
    inviteLink,
    isLoading,
    copyLink,
    shareNative,
    logQrOpen,
    profile,
  } = useInviteLoop();

  // Don't show if user has already shared
  if (hasShared && variant === "full") {
    return null;
  }

  const handleQrOpen = () => {
    setQrModalOpen(true);
    logQrOpen();
  };

  const handleCopyFromQr = async () => {
    await copyLink();
  };

  const cidade = profile?.city || "";

  if (variant === "compact") {
    return (
      <button
        onClick={() => navigate("/voluntario/convite")}
        className={`card-luta w-full text-left hover:bg-secondary/80 transition-colors group border-primary/30 bg-primary/5 ${className}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-bold text-sm group-hover:text-primary transition-colors">
                Convide 1 pessoa hoje
              </p>
              <p className="text-xs text-muted-foreground">
                Compartilhe e ajude a crescer
              </p>
            </div>
          </div>
          <Badge className="bg-primary/10 text-primary text-xs">Convide</Badge>
        </div>
      </button>
    );
  }

  return (
    <>
      <div className={`card-luta border-primary/40 bg-gradient-to-br from-primary/10 to-primary/5 ${className}`}>
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-base">Convide 1 pessoa hoje</h3>
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Cada convite fortalece a rede. Compartilhe seu link!
            </p>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="default"
                className="gap-1.5"
                onClick={copyLink}
                disabled={isLoading}
              >
                <Copy className="h-4 w-4" />
                Copiar meu link
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={handleQrOpen}
                disabled={isLoading}
              >
                <QrCode className="h-4 w-4" />
                Gerar QR
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={shareNative}
                disabled={isLoading}
              >
                <Share2 className="h-4 w-4" />
                Compartilhar
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              Seu QR Code de Convite
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-center p-4 bg-white rounded-lg">
              {inviteLink ? (
                <QRCodeSVG
                  value={inviteLink}
                  size={200}
                  level="M"
                  includeMargin={false}
                />
              ) : (
                <div className="w-48 h-48 bg-muted animate-pulse rounded" />
              )}
            </div>

            {cidade && (
              <p className="text-center text-sm text-muted-foreground">
                Cidade: <span className="font-medium">{cidade}</span>
              </p>
            )}

            <div className="flex gap-2">
              <Button
                className="flex-1 gap-1.5"
                onClick={handleCopyFromQr}
              >
                <Copy className="h-4 w-4" />
                Copiar link
              </Button>
              <Button
                variant="outline"
                className="flex-1 gap-1.5"
                onClick={shareNative}
              >
                <Share2 className="h-4 w-4" />
                Compartilhar
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Mostre este QR para amigos ou imprima para eventos
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
