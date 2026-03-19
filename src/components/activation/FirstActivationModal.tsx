import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SharePackModal } from "@/components/fabrica/SharePackModal";
import { useFirstActivation } from "@/hooks/useFirstActivation";
import { useTemplatesForUser } from "@/hooks/useTemplatesForUser";
import {
  Sparkles,
  Rocket,
  Clock,
  Share2,
  CalendarCheck,
  Users,
  ArrowRight,
  Zap,
} from "lucide-react";

interface FirstActivationModalProps {
  forceOpen?: boolean;
}

export function FirstActivationModal({ forceOpen }: FirstActivationModalProps) {
  const navigate = useNavigate();
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  
  const {
    showModal,
    missionType,
    missionId,
    hasShared,
    dismissModal,
    logShareOpened,
    logShareCompleted,
  } = useFirstActivation();

  // Get first template for share pack
  const { templates } = useTemplatesForUser();
  const firstTemplate = templates?.[0];

  const isOpen = forceOpen ?? showModal;

  const handleDoNow = () => {
    dismissModal();
    
    if (missionType === "checkin" || hasShared) {
      navigate("/voluntario/hoje");
    } else if (missionId) {
      navigate(`/voluntario/missao/${missionId}`);
    } else {
      navigate("/voluntario/convite");
    }
  };

  const handleShareNow = () => {
    logShareOpened();
    
    if (firstTemplate?.id) {
      setSelectedTemplateId(firstTemplate.id);
      setShareModalOpen(true);
    } else {
      // Fallback to invite page if no templates
      navigate("/voluntario/convite");
      dismissModal();
    }
  };

  const handleShareModalClose = (open: boolean) => {
    setShareModalOpen(open);
    if (!open) {
      logShareCompleted();
      dismissModal();
    }
  };

  const handleDismiss = () => {
    dismissModal();
  };

  if (!isOpen) return null;

  const dialogTitleId = "first-activation-title";
  const dialogDescId = "first-activation-desc";

  return (
    <>
      <Dialog open={isOpen && !shareModalOpen} onOpenChange={(open) => !open && handleDismiss()}>
        <DialogContent 
          className="max-w-md"
          aria-labelledby={dialogTitleId}
          aria-describedby={dialogDescId}
        >
          <DialogHeader className="text-center pb-2">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center" aria-hidden="true">
              <Rocket className="h-8 w-8 text-primary" />
            </div>
            <DialogTitle id={dialogTitleId} className="text-xl flex items-center justify-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
              Você está dentro!
            </DialogTitle>
            <DialogDescription id={dialogDescId} className="text-base">
              Sua conta foi aprovada. Agora é hora de agir!
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Timer badge */}
            <div className="flex justify-center">
              <Badge variant="secondary" className="gap-1.5 px-3 py-1">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                ~5 minutos para sua primeira ação
              </Badge>
            </div>

            {/* Mission description */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                {missionType === "invite" ? (
                  <>
                    <Users className="h-4 w-4 text-primary" aria-hidden="true" />
                    Sua primeira missão: Convide 1 pessoa
                  </>
                ) : (
                  <>
                    <CalendarCheck className="h-4 w-4 text-primary" aria-hidden="true" />
                    Sua primeira missão: Fazer check-in do dia
                  </>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {missionType === "invite"
                  ? "Cada convite fortalece a rede. Compartilhe seu link ou um conteúdo pronto!"
                  : "Registre sua disponibilidade e entre na engrenagem do movimento."}
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="space-y-3">
              <Button
                onClick={handleDoNow}
                className="w-full gap-2 h-12 text-base"
                size="lg"
              >
                <Zap className="h-5 w-5" aria-hidden="true" />
                {missionType === "invite" ? "Fazer agora" : "Fazer check-in"}
                <ArrowRight className="h-4 w-4 ml-auto" aria-hidden="true" />
              </Button>

              {missionType === "invite" && (
                <Button
                  onClick={handleShareNow}
                  variant="outline"
                  className="w-full gap-2 h-12 text-base"
                  size="lg"
                >
                  <Share2 className="h-5 w-5" aria-hidden="true" />
                  Compartilhar agora
                  <ArrowRight className="h-4 w-4 ml-auto" aria-hidden="true" />
                </Button>
              )}

              <Button
                onClick={handleDismiss}
                variant="ghost"
                className="w-full text-sm text-muted-foreground hover:text-foreground"
              >
                Fazer depois
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Pack Modal */}
      {selectedTemplateId && (
        <SharePackModal
          open={shareModalOpen}
          onOpenChange={handleShareModalClose}
          templateId={selectedTemplateId}
          templateTitle={firstTemplate?.titulo || "Conteúdo"}
        />
      )}
    </>
  );
}
