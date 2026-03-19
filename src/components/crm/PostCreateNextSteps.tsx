/**
 * PostCreateNextSteps
 * 
 * A block shown in ContactDetailDrawer when from=novo,
 * offering 3 quick actions after creating a contact.
 * Now includes "micro-completion" state with visual feedback.
 */

import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  MessageCircle,
  CalendarClock,
  ArrowLeft,
  Sparkles,
  Phone,
  CheckCircle2,
  PartyPopper,
} from "lucide-react";

interface PostCreateNextStepsProps {
  contactId: string;
  contactName: string;
  hasPhone: boolean;
  whatsappNorm?: string | null;
  onPhoneAdded?: () => void;
}

// Track growth events (no PII - NEVER send contact_id)
async function logGrowthEvent(eventType: string, meta?: Record<string, unknown>) {
  try {
    await (supabase.rpc as any)("log_growth_event", {
      _event_type: eventType,
      _meta: meta || {},
    });
  } catch (error) {
    console.warn("[PostCreateNextSteps] Tracking error:", error);
  }
}

type MicroAction = "whatsapp" | "followup" | "back_to_today" | null;

export function PostCreateNextSteps({
  contactId,
  contactName,
  hasPhone,
  whatsappNorm,
  onPhoneAdded,
}: PostCreateNextStepsProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Tracking refs (dedupe)
  const shownTrackedRef = useRef(false);
  const microDoneTrackedRef = useRef(false);
  
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [phoneValue, setPhoneValue] = useState("");
  const [isScheduling, setIsScheduling] = useState(false);
  const [isSavingPhone, setIsSavingPhone] = useState(false);
  
  // Micro-completion state
  const [completedAction, setCompletedAction] = useState<MicroAction>(null);
  const [isMicroDone, setIsMicroDone] = useState(false);

  // Track shown event once (no contact_id!)
  useEffect(() => {
    if (!shownTrackedRef.current) {
      shownTrackedRef.current = true;
      logGrowthEvent("contact_postcreate_shown", {
        source: "crm_new",
        contact_ref: "present", // No PII - just indicates contact exists
      });
    }
  }, []);

  // Track micro-done once
  const trackMicroDone = (action: MicroAction) => {
    if (microDoneTrackedRef.current) return;
    microDoneTrackedRef.current = true;
    
    logGrowthEvent("contact_postcreate_microdone_shown", {
      source: "crm_new",
      action: action || "unknown",
    });
    
    // Also log as next_action_completed with kind = crm_micro
    logGrowthEvent("next_action_completed", {
      kind: "crm_micro",
      source: "daily_fallback",
      action: action || "unknown",
      has_phone: hasPhone,
    });
  };

  const handleWhatsAppClick = () => {
    logGrowthEvent("contact_postcreate_whatsapp_clicked", {
      has_phone: hasPhone,
      source: "crm_new",
      // No contact_id!
    });

    if (hasPhone && whatsappNorm) {
      // Open WhatsApp with a simple message
      const fullNumber = whatsappNorm.startsWith("55") ? whatsappNorm : `55${whatsappNorm}`;
      const message = "Oi! Tudo bem?";
      const url = `https://wa.me/${fullNumber}?text=${encodeURIComponent(message)}`;
      window.open(url, "_blank");
      
      // Mark as micro-done
      setCompletedAction("whatsapp");
      setIsMicroDone(true);
      trackMicroDone("whatsapp");
    } else {
      // Show phone input
      setShowPhoneInput(true);
    }
  };

  const handleSavePhone = async () => {
    if (!phoneValue.trim()) {
      toast.error("Digite um número de telefone");
      return;
    }

    setIsSavingPhone(true);
    try {
      // Normalize phone
      const normalized = phoneValue.replace(/[^0-9]/g, "");
      
      const { error } = await supabase
        .from("crm_contatos")
        .update({
          telefone: phoneValue.trim(),
          whatsapp: normalized,
          whatsapp_norm: normalized,
          whatsapp_last4: normalized.slice(-4),
        })
        .eq("id", contactId);

      if (error) throw error;

      toast.success("Telefone salvo!");
      queryClient.invalidateQueries({ queryKey: ["crm-contato", contactId] });
      setShowPhoneInput(false);
      onPhoneAdded?.();

      // Now open WhatsApp
      const fullNumber = normalized.startsWith("55") ? normalized : `55${normalized}`;
      const message = "Oi! Tudo bem?";
      const url = `https://wa.me/${fullNumber}?text=${encodeURIComponent(message)}`;
      window.open(url, "_blank");
      
      // Mark as micro-done
      setCompletedAction("whatsapp");
      setIsMicroDone(true);
      trackMicroDone("whatsapp");
    } catch (error) {
      console.error("Error saving phone:", error);
      toast.error("Erro ao salvar telefone");
    } finally {
      setIsSavingPhone(false);
    }
  };

  const handleScheduleFollowup = async () => {
    logGrowthEvent("contact_postcreate_followup_scheduled", {
      source: "crm_new",
      // No contact_id!
    });

    setIsScheduling(true);
    try {
      // Schedule for tomorrow at 9 AM São Paulo time
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);

      // Update contact with next action
      const { error: updateError } = await supabase
        .from("crm_contatos")
        .update({
          proxima_acao_em: tomorrow.toISOString(),
          next_action_kind: "followup",
          next_action_context: {
            objective: "Retomar conversa após cadastro",
            channel: "whatsapp",
            updated_at: new Date().toISOString(),
          },
        })
        .eq("id", contactId);

      if (updateError) throw updateError;

      // Log to followup_logs
      const { error: logError } = await supabase
        .from("crm_followup_logs")
        .insert({
          contact_id: contactId,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          kind: "created",
          scheduled_for: tomorrow.toISOString(),
          meta: { source: "postcreate", objective: "Retomar conversa" },
        });

      if (logError) console.warn("Error logging followup:", logError);

      queryClient.invalidateQueries({ queryKey: ["crm-contato", contactId] });
      queryClient.invalidateQueries({ queryKey: ["due-followups"] });
      queryClient.invalidateQueries({ queryKey: ["my-due-followups"] });

      toast.success("Follow-up agendado para amanhã às 9h!");
      
      // Mark as micro-done
      setCompletedAction("followup");
      setIsMicroDone(true);
      trackMicroDone("followup");
    } catch (error) {
      console.error("Error scheduling followup:", error);
      toast.error("Erro ao agendar follow-up");
    } finally {
      setIsScheduling(false);
    }
  };

  const handleBackToToday = () => {
    // If not micro-done yet, mark as done with "back_to_today" action
    if (!isMicroDone) {
      trackMicroDone("back_to_today");
    }
    
    logGrowthEvent("contact_postcreate_back_to_today", {
      source: "crm_new",
      completed_action: completedAction || "none",
      // No contact_id!
    });
    
    // Navigate with micro-done flag
    navigate("/voluntario/hoje?done=micro");
  };

  // === MICRO-DONE STATE: Show success and big "Voltar ao Hoje" ===
  if (isMicroDone) {
    return (
      <Card className="border-green-500/50 bg-gradient-to-br from-green-500/10 to-transparent">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-green-500/20">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <PartyPopper className="h-4 w-4 text-amber-500" />
                Feito!
              </h3>
              <p className="text-xs text-muted-foreground">
                {completedAction === "whatsapp" && "WhatsApp enviado!"}
                {completedAction === "followup" && "Follow-up agendado!"}
                {completedAction === "back_to_today" && "Contato salvo!"}
              </p>
            </div>
          </div>

          <Button
            size="lg"
            className="w-full text-lg font-semibold"
            onClick={handleBackToToday}
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Voltar ao Hoje
          </Button>
        </CardContent>
      </Card>
    );
  }

  // === DEFAULT STATE: 3 action buttons ===
  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-transparent">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-semibold text-sm">Próximo passo (30s)</h3>
            <p className="text-xs text-muted-foreground">
              Fechou! Agora escolha um passo rápido pra virar conversa.
            </p>
          </div>
        </div>

        {showPhoneInput ? (
          <div className="space-y-3">
            <Label className="text-xs">Adicionar telefone para WhatsApp</Label>
            <div className="flex gap-2">
              <Input
                placeholder="(XX) XXXXX-XXXX"
                value={phoneValue}
                onChange={(e) => setPhoneValue(e.target.value)}
                className="flex-1"
              />
              <Button
                size="sm"
                onClick={handleSavePhone}
                disabled={isSavingPhone}
              >
                {isSavingPhone ? "..." : "Salvar"}
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPhoneInput(false)}
              className="w-full text-xs"
            >
              Cancelar
            </Button>
          </div>
        ) : (
          <div className="grid gap-2">
            <Button
              variant="default"
              className="w-full justify-start"
              onClick={handleWhatsAppClick}
            >
              {hasPhone ? (
                <>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Mandar WhatsApp agora
                </>
              ) : (
                <>
                  <Phone className="h-4 w-4 mr-2" />
                  Adicionar telefone
                </>
              )}
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleScheduleFollowup}
              disabled={isScheduling}
            >
              <CalendarClock className="h-4 w-4 mr-2" />
              {isScheduling ? "Agendando..." : "Agendar follow-up (amanhã)"}
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={handleBackToToday}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Hoje
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
