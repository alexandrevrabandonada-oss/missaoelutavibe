import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  MessageCircle,
  UserPlus,
  Clock,
  Sparkles,
  CheckCircle,
  ArrowRight,
} from "lucide-react";
import { useInviteLoop } from "@/hooks/useInviteLoop";
import { QuickAddContactModal } from "@/components/crm/QuickAddContactModal";
import { useLogGrowthEvent } from "@/hooks/useGrowth";
import { openWhatsAppShare } from "@/lib/shareUtils";

interface Bring1ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Modal shown after first action completion to encourage bringing +1 in 48h
 */
export function Bring1Modal({ open, onOpenChange }: Bring1ModalProps) {
  const { shareNative, copyLink, inviteLink, isLoading } = useInviteLoop();
  const logGrowthEvent = useLogGrowthEvent();
  
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [addedCount, setAddedCount] = useState(0);
  const [hasTrackedOpen, setHasTrackedOpen] = useState(false);

  // Track modal shown
  useEffect(() => {
    if (open && !hasTrackedOpen) {
      logGrowthEvent.mutate({
        eventType: "invite_shared",
        meta: { stage: "bring1_modal_shown" },
      });
      setHasTrackedOpen(true);
    }
  }, [open, hasTrackedOpen]);

  const handleShareWhatsApp = async () => {
    // Direct WhatsApp share with pre-filled message
    const text = "Acabei de fazer minha primeira ação no ÉLuta! Vem comigo em menos de 10 minutos 👊";
    const url = inviteLink;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Junte-se ao ÉLuta",
          text,
          url,
        });
        logGrowthEvent.mutate({
          eventType: "invite_shared",
          meta: { stage: "bring1_whatsapp_native" },
        });
      } catch {
        // Fallback to copy
        await copyLink();
      }
    } else {
      // Open WhatsApp directly
      openWhatsAppShare(text + "\n\n" + url);
      logGrowthEvent.mutate({
        eventType: "invite_shared",
        meta: { stage: "bring1_whatsapp_direct" },
      });
    }
  };

  const handleAddContacts = () => {
    setShowQuickAdd(true);
    logGrowthEvent.mutate({
      eventType: "invite_shared",
      meta: { stage: "bring1_quick_add_opened" },
    });
  };

  const handleContactAdded = () => {
    setAddedCount((c) => c + 1);
    
    // After 3 contacts, close and celebrate
    if (addedCount >= 2) {
      setShowQuickAdd(false);
      onOpenChange(false);
    }
  };

  const handleQuickAddClose = (isOpen: boolean) => {
    if (!isOpen && addedCount > 0 && addedCount < 3) {
      // Reopen for next contact
      setTimeout(() => setShowQuickAdd(true), 300);
    } else {
      setShowQuickAdd(isOpen);
    }
  };

  return (
    <>
      <Dialog open={open && !showQuickAdd} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-2">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <DialogTitle className="text-xl flex items-center justify-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              Primeira ação concluída!
            </DialogTitle>
            <DialogDescription className="text-center">
              Agora traga +1 pessoa em 48h e multiplique o impacto
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Timer badge */}
            <div className="flex justify-center">
              <Badge variant="secondary" className="bg-primary/10 text-primary gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Meta: 48 horas
              </Badge>
            </div>

            {/* Primary CTA: WhatsApp */}
            <Button
              size="lg"
              className="w-full bg-green-600 hover:bg-green-700 gap-2"
              onClick={handleShareWhatsApp}
              disabled={isLoading}
            >
              <MessageCircle className="h-5 w-5" />
              Compartilhar no WhatsApp
              <ArrowRight className="h-4 w-4" />
            </Button>

            {/* Secondary CTA: Add contacts */}
            <Button
              variant="outline"
              size="lg"
              className="w-full gap-2"
              onClick={handleAddContacts}
            >
              <UserPlus className="h-5 w-5" />
              Adicionar 3 contatos
              {addedCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {addedCount}/3
                </Badge>
              )}
            </Button>

            {/* Info */}
            <p className="text-xs text-muted-foreground text-center">
              Cada pessoa que faz sua primeira ação conta para sua meta
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Add Modal in sequence mode */}
      <QuickAddContactModal
        open={showQuickAdd}
        onOpenChange={handleQuickAddClose}
        origem="manual"
        context={{ source: "bring1_loop", sequence: addedCount + 1 }}
        onSuccess={handleContactAdded}
        showWhatsAppButton
      />
    </>
  );
}
