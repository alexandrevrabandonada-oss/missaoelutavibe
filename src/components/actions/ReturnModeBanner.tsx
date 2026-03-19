/**
 * ReturnModeBanner
 * 
 * Shown on /voluntario/hoje when user has been inactive for 48h+.
 * Provides a gentle nudge to complete a quick 30s action.
 */

import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { X, Zap, UserPlus, MessageCircle, MapPin, ChevronRight } from "lucide-react";
import { useReturnMode } from "@/hooks/useReturnMode";
import { QuickAddContactModal } from "@/components/crm/QuickAddContactModal";
import { useQuickAddContact } from "@/hooks/useQuickAddContact";

interface ReturnModeBannerProps {
  onDismiss?: () => void;
}

export function ReturnModeBanner({ onDismiss }: ReturnModeBannerProps) {
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();
  const {
    isAtRisk,
    suggestedKind,
    suggestedCta,
    trackStarted,
    trackCompleted,
    trackDismissed,
    isLoading,
  } = useReturnMode();

  const [showOptions, setShowOptions] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const quickAdd = useQuickAddContact();

  // Don't show if not at risk or loading
  if (isLoading || !isAtRisk) {
    return null;
  }

  const handleDismiss = () => {
    trackDismissed();
    onDismiss?.();
  };

  const handlePrimaryAction = () => {
    trackStarted(suggestedKind);
    
    if (suggestedKind === "contact") {
      setShowQuickAdd(true);
    } else if (suggestedKind === "followup") {
      // Navigate to CRM with followup focus
      navigate("/voluntario/crm?focus=followup");
    } else {
      // Default: open quick add
      setShowQuickAdd(true);
    }
  };

  const handleOptionClick = (kind: "contact" | "followup" | "mission") => {
    trackStarted(kind);
    setShowOptions(false);
    
    if (kind === "contact") {
      setShowQuickAdd(true);
    } else if (kind === "followup") {
      navigate("/voluntario/crm?focus=followup");
    } else if (kind === "mission") {
      navigate("/voluntario/missoes");
    }
  };

  const handleQuickAddComplete = (_result: { contact_id: string; is_new: boolean }) => {
    trackCompleted("crm_contact");
    setShowQuickAdd(false);
    // Redirect with ?done=return
    setSearchParams({ done: "return" }, { replace: true });
  };

  const handleQuickAddClose = () => {
    setShowQuickAdd(false);
  };

  return (
    <>
      <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent animate-in fade-in slide-in-from-top-2 duration-300 mb-4">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-amber-500/20 shrink-0">
              <Zap className="h-5 w-5 text-amber-500" />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-base">
                Bora voltar no leve? (30s)
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Sem culpa. Uma ação pequena hoje já coloca você no trilho.
              </p>
              
              <div className="flex flex-wrap gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={handlePrimaryAction}
                  className="font-semibold bg-amber-600 hover:bg-amber-700"
                >
                  <Zap className="h-4 w-4 mr-1" />
                  FAZER 30s AGORA
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowOptions(true)}
                >
                  VER OUTRAS OPÇÕES
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 -mt-1 -mr-1"
              onClick={handleDismiss}
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Options Bottom Sheet */}
      <Sheet open={showOptions} onOpenChange={setShowOptions}>
        <SheetContent side="bottom" className="pb-8">
          <SheetHeader className="text-left mb-4">
            <SheetTitle>Escolha uma ação rápida</SheetTitle>
            <SheetDescription>
              Qualquer uma dessas conta como ação do dia
            </SheetDescription>
          </SheetHeader>
          
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start h-auto py-3 px-4"
              onClick={() => handleOptionClick("contact")}
            >
              <UserPlus className="h-5 w-5 mr-3 text-primary" />
              <div className="text-left">
                <p className="font-medium">Salvar 1 contato</p>
                <p className="text-xs text-muted-foreground">
                  Cadastre alguém que você conheceu
                </p>
              </div>
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start h-auto py-3 px-4"
              onClick={() => handleOptionClick("followup")}
            >
              <MessageCircle className="h-5 w-5 mr-3 text-green-600" />
              <div className="text-left">
                <p className="font-medium">Fazer 1 follow-up</p>
                <p className="text-xs text-muted-foreground">
                  Mande mensagem pra alguém do seu CRM
                </p>
              </div>
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start h-auto py-3 px-4"
              onClick={() => handleOptionClick("mission")}
            >
              <MapPin className="h-5 w-5 mr-3 text-orange-600" />
              <div className="text-left">
                <p className="font-medium">Pegar missão</p>
                <p className="text-xs text-muted-foreground">
                  Missão de rua ou conversa
                </p>
              </div>
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Quick Add Contact Modal */}
      <QuickAddContactModal
        open={showQuickAdd}
        onOpenChange={(open) => {
          if (!open) handleQuickAddClose();
        }}
        origem="manual"
        onSuccess={handleQuickAddComplete}
      />
    </>
  );
}
