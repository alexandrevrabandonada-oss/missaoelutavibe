/**
 * ShareMaterialModal - 1-click sharing modal for content items.
 * Includes WhatsApp, copy caption (Instagram), copy short text, copy link.
 * Always appends branded footer with invite code when available.
 * Marks pilot step 3 as done when user shares.
 *
 * ALL links use shareUtils for consistent ref= tracking.
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink, Check, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { usePersonalInviteCode } from "@/hooks/usePersonalInviteCode";
import { useAuth } from "@/hooks/useAuth";
import { markMaterialSharedToday } from "@/hooks/usePilotMode";
import {
  buildInviteShareUrl,
  openWhatsAppShare,
  copyToClipboard,
} from "@/lib/shareUtils";

interface ShareMaterialModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** WhatsApp-ready text (legenda_whatsapp) */
  whatsappText?: string | null;
  /** Instagram caption (legenda_instagram) */
  instagramCaption?: string | null;
  /** Short description for generic sharing */
  description?: string | null;
}

const BRAND_FOOTER = "Pré-campanha — Alexandre Fonseca\nEscutar • Cuidar • Organizar";

export function ShareMaterialModal({
  open,
  onOpenChange,
  title,
  whatsappText,
  instagramCaption,
  description,
}: ShareMaterialModalProps) {
  const { inviteCode, inviteLink } = usePersonalInviteCode();
  const { user } = useAuth();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const markShared = () => {
    if (user?.id) markMaterialSharedToday(user.id);
  };

  // Standard invite line with ref=
  const inviteLine = inviteCode
    ? `\n\nEntra pelo meu link: ${inviteLink}`
    : "";

  // Build final texts
  const finalWhatsApp = (whatsappText || description || title) + inviteLine;
  const finalInstagram = (instagramCaption || description || title) + "\n\n" + BRAND_FOOTER + inviteLine;
  const shortText = (description || title).slice(0, 200) + inviteLine;

  const handleCopy = async (text: string, key: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedKey(key);
      markShared();
      toast.success("Copiado!");
      setTimeout(() => setCopiedKey(null), 2000);
    } else {
      toast.error("Não foi possível copiar");
    }
  };

  const handleWhatsApp = () => {
    openWhatsAppShare(finalWhatsApp);
    markShared();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">📤 Compartilhar</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
          {title}
        </p>

        <div className="space-y-2">
          {/* WhatsApp */}
          <Button
            onClick={handleWhatsApp}
            className="w-full justify-start gap-3"
            size="lg"
          >
            <ExternalLink className="h-5 w-5" />
            <div className="text-left">
              <p className="font-medium">WhatsApp</p>
              <p className="text-xs opacity-80">Enviar texto pronto</p>
            </div>
          </Button>

          {/* Copy Instagram caption */}
          {instagramCaption && (
            <Button
              variant="outline"
              onClick={() => handleCopy(finalInstagram, "ig")}
              className="w-full justify-start gap-3"
              size="lg"
            >
              {copiedKey === "ig" ? (
                <Check className="h-5 w-5 text-green-500" />
              ) : (
                <Copy className="h-5 w-5" />
              )}
              <div className="text-left">
                <p className="font-medium">Copiar legenda Instagram</p>
                <p className="text-xs text-muted-foreground">Com hashtags e marca</p>
              </div>
            </Button>
          )}

          {/* Copy short text */}
          <Button
            variant="outline"
            onClick={() => handleCopy(shortText, "short")}
            className="w-full justify-start gap-3"
            size="lg"
          >
            {copiedKey === "short" ? (
              <Check className="h-5 w-5 text-green-500" />
            ) : (
              <MessageSquare className="h-5 w-5" />
            )}
            <div className="text-left">
              <p className="font-medium">Copiar texto curto</p>
              <p className="text-xs text-muted-foreground">Para qualquer rede</p>
            </div>
          </Button>

          {/* Copy invite link */}
          {inviteLink && (
            <Button
              variant="ghost"
              onClick={() => handleCopy(inviteLink, "link")}
              className="w-full justify-start gap-3"
              size="sm"
            >
              {copiedKey === "link" ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              <span className="text-sm">Copiar link com meu convite</span>
            </Button>
          )}
        </div>

        <p className="text-[10px] text-muted-foreground text-center mt-2">
          {BRAND_FOOTER.replace("\n", " | ")}
        </p>
      </DialogContent>
    </Dialog>
  );
}
