import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCRMContato,
  useCRMMutations,
  CRM_STATUS_OPTIONS,
  CRM_INTERACAO_OPTIONS,
} from "@/hooks/useCRM";
import { MaskedWhatsAppField } from "@/components/crm/MaskedWhatsAppField";
import { PostCreateNextSteps } from "@/components/crm/PostCreateNextSteps";
import { ContactSupportSection } from "@/components/crm/ContactSupportSection";
import { EventInviteSection } from "@/components/crm/EventInviteSection";
import { PlaybookMiniCard } from "@/components/playbook/PlaybookMiniCard";
import { useLogGrowthEvent } from "@/hooks/useGrowth";
import { useRoteirosAprovados } from "@/hooks/useRoteiros";
import { useInviteLoop } from "@/hooks/useInviteLoop";
import { usePostEventFollowups, POST_EVENT_FOLLOWUP_LABELS } from "@/hooks/usePostEventFollowups";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  UserCircle,
  MapPin,
  Clock,
  MessageCircle,
  Check,
  Copy,
  Loader2,
  Phone,
  History,
  Plus,
  CalendarClock,
} from "lucide-react";
import { Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import type { SupportLevel } from "@/hooks/useContactSupport";

type CRMContatoStatus = Database["public"]["Enums"]["crm_contato_status"];
type CRMInteracaoTipo = Database["public"]["Enums"]["crm_interacao_tipo"];

// Status that indicates contact needs engagement
const ENGAGEMENT_STATUSES: CRMContatoStatus[] = ["novo", "contatar", "em_conversa"];

interface ContactDetailDrawerProps {
  contactId: string | null;
  onClose: () => void;
}

export function ContactDetailDrawer({ contactId, onClose }: ContactDetailDrawerProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { contato, interacoes, isLoading, refetch } = useCRMContato(contactId || undefined);
  const { updateStatus, addInteracao } = useCRMMutations();
  const { mutate: logEvent } = useLogGrowthEvent();
  const { data: roteiros } = useRoteirosAprovados("convidar");
  const { inviteCode, inviteLink } = useInviteLoop();
  const { pendingFollowups, complete: completeEventFollowup, isCompleting, trackWhatsAppOpened } = usePostEventFollowups();

  const [showAddFollowup, setShowAddFollowup] = useState(false);
  const [followupTipo, setFollowupTipo] = useState<CRMInteracaoTipo>("whatsapp");
  const [followupNota, setFollowupNota] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if coming from "novo" (post-create flow)
  const isFromNovo = searchParams.get("from") === "novo";

  // Check if this contact has a pending post-event follow-up
  const eventFollowup = pendingFollowups.find(f => f.contact_id === contactId);
  const isEventFollowup = (contato as any)?.next_action_kind === 'event_followup' || !!eventFollowup;

  // Sync with URL param
  useEffect(() => {
    const urlContactId = searchParams.get("contato");
    if (contactId && contactId !== urlContactId) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set("contato", contactId);
      setSearchParams(newParams, { replace: true });
    }
  }, [contactId, searchParams, setSearchParams]);

  const handleClose = () => {
    // Remove query params (contato and from)
    searchParams.delete("contato");
    searchParams.delete("from");
    setSearchParams(searchParams, { replace: true });
    onClose();
  };

  const handleStatusChange = async (newStatus: CRMContatoStatus) => {
    if (!contato) return;

    try {
      await updateStatus.mutateAsync({ id: contato.id, status: newStatus });
      logEvent({
        eventType: "contact_status_changed",
        meta: {
          // No contact_id - privacy!
          old_status: contato.status,
          new_status: newStatus,
        },
      });
      refetch();
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleMarkEngaged = async () => {
    if (!contato) return;

    try {
      await updateStatus.mutateAsync({ id: contato.id, status: "confirmado" });
      logEvent({
        eventType: "contact_status_changed",
        meta: {
          // No contact_id - privacy!
          old_status: contato.status,
          new_status: "confirmado",
          action: "mark_engaged",
        },
      });
      toast.success("Contato marcado como engajado!");
      refetch();
    } catch (error) {
      console.error("Error marking engaged:", error);
    }
  };

  const handleAddFollowup = async () => {
    if (!contato || !followupNota.trim()) return;

    setIsSubmitting(true);
    try {
      await addInteracao.mutateAsync({
        contato_id: contato.id,
        tipo: followupTipo,
        nota: followupNota.trim(),
      });
      logEvent({
        eventType: "followup_logged",
        meta: {
          // No contact_id - privacy!
          tipo: followupTipo,
        },
      });
      setFollowupNota("");
      setShowAddFollowup(false);
      refetch();
    } catch (error) {
      console.error("Error adding followup:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyRoteiro = () => {
    const roteiro = roteiros?.[0];
    if (!roteiro) {
      toast.error("Nenhum roteiro disponível");
      return;
    }

    const text = roteiro.texto_base + (inviteLink ? `\n\n${inviteLink}` : "");
    navigator.clipboard.writeText(text);
    toast.success("Roteiro copiado!");
  };

  const handleOpenWhatsApp = () => {
    if (!contato?.whatsapp_last4) {
      toast.error("Contato não tem WhatsApp cadastrado");
      return;
    }

    // We need to get the full WhatsApp - this is masked
    // For now, show a toast explaining the privacy feature
    toast.info("Para abrir WhatsApp, utilize a opção de revelar número primeiro");
  };

  const getStatusColor = (status: CRMContatoStatus) => {
    return CRM_STATUS_OPTIONS.find((s) => s.value === status)?.color ?? "bg-gray-500";
  };

  const getStatusLabel = (status: CRMContatoStatus) => {
    return CRM_STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;
  };

  const getInteracaoLabel = (tipo: CRMInteracaoTipo) => {
    return CRM_INTERACAO_OPTIONS.find((i) => i.value === tipo)?.label ?? tipo;
  };

  return (
    <Sheet open={!!contactId} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2">
            <UserCircle className="h-5 w-5 text-primary" />
            Detalhes do Contato
          </SheetTitle>
          <SheetDescription>
            Gerencie o contato e histórico de interações
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !contato ? (
          <div className="py-8 text-center text-muted-foreground">
            Contato não encontrado
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {/* Post-Event Follow-up Banner */}
            {isEventFollowup && eventFollowup && (
              <Alert className="border-primary bg-primary/5">
                <CalendarClock className="h-4 w-4" />
                <AlertDescription className="flex flex-col gap-2">
                  <span className="font-medium">
                    Pós-evento ({POST_EVENT_FOLLOWUP_LABELS[eventFollowup.followup_kind as keyof typeof POST_EVENT_FOLLOWUP_LABELS] || 'Agradecer'}) — {eventFollowup.is_overdue ? 'Atrasado!' : '12h'}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        trackWhatsAppOpened(eventFollowup.followup_kind as any);
                        if (contato?.whatsapp_norm) {
                          window.open(`https://wa.me/${contato.whatsapp_norm}`, '_blank');
                        } else {
                          toast.info("Revele o número primeiro");
                        }
                      }}
                    >
                      <MessageCircle className="h-4 w-4 mr-1" />
                      WhatsApp
                    </Button>
                    <Button
                      size="sm"
                      onClick={async () => {
                        await completeEventFollowup(eventFollowup.event_id, eventFollowup.contact_id);
                        refetch();
                      }}
                      disabled={isCompleting}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      {isCompleting ? "..." : "Marcar como feito"}
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Post-Create Next Steps (only when from=novo) */}
            {isFromNovo && (
              <PostCreateNextSteps
                contactId={contato.id}
                contactName={contato.nome}
                hasPhone={!!contato.whatsapp_last4}
                whatsappNorm={contato.whatsapp_norm}
                onPhoneAdded={() => refetch()}
              />
            )}

            {/* Support Level Section (Apoio/Voto) - always show */}
            {!isFromNovo && (
              <>
                <ContactSupportSection
                  contactId={contato.id}
                  currentLevel={(contato as any).support_level as SupportLevel || 'unknown'}
                  onLevelChanged={() => refetch()}
                />
                <Separator />
                
                {/* Event Invite Section */}
                <EventInviteSection
                  contactId={contato.id}
                  contactName={contato.nome}
                  whatsappNorm={contato.whatsapp_norm}
                  onInviteCreated={() => refetch()}
                />
                <Separator />
              </>
            )}

            {/* Playbook Mini Card - only show for engagement statuses */}
            {!isFromNovo && ENGAGEMENT_STATUSES.includes(contato.status) && (
              <PlaybookMiniCard
                onCopyMessage={(text) => {
                  // Already handled in component
                }}
                onOpenWhatsApp={() => {
                  if (!contato.whatsapp_last4) {
                    toast.error("Contato não tem WhatsApp cadastrado");
                    return;
                  }
                  toast.info("Revele o número primeiro para abrir WhatsApp");
                }}
                onScheduleFollowup={async (days) => {
                  const newDate = addDays(new Date(), days);
                  newDate.setHours(9, 0, 0, 0);
                  try {
                    await supabase
                      .from("crm_contatos")
                      .update({ proxima_acao_em: newDate.toISOString() })
                      .eq("id", contato.id);
                    refetch();
                  } catch (error) {
                    console.error("Error scheduling followup:", error);
                  }
                }}
                objective="convidar"
              />
            )}

            {/* Contact Info */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{contato.nome}</h3>
                <Badge className={`${getStatusColor(contato.status)} text-white`}>
                  {getStatusLabel(contato.status)}
                </Badge>
              </div>

              <div className="space-y-2 text-sm text-muted-foreground">
                {contato.bairro && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{contato.bairro}, {contato.cidade}</span>
                  </div>
                )}
                {contato.whatsapp_last4 && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <MaskedWhatsAppField
                      contactId={contato.id}
                      last4={contato.whatsapp_last4}
                    />
                  </div>
                )}
                {contato.proxima_acao_em && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>
                      Follow-up: {format(new Date(contato.proxima_acao_em), "dd/MM HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                )}
              </div>

              {contato.tags && contato.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {contato.tags.map((tag: string) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {contato.observacao && (
                <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                  {contato.observacao}
                </p>
              )}
            </div>

            {/* Status Dropdown */}
            <div className="space-y-2">
              <Label>Status do Pipeline</Label>
              <Select
                value={contato.status}
                onValueChange={(val) => handleStatusChange(val as CRMContatoStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CRM_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${opt.color}`} />
                        {opt.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyRoteiro}
                className="flex items-center gap-2"
              >
                <Copy className="h-4 w-4" />
                Copiar Roteiro
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenWhatsApp}
                className="flex items-center gap-2"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleMarkEngaged}
                disabled={contato.status === "confirmado"}
                className="col-span-2"
              >
                <Check className="h-4 w-4 mr-2" />
                Marcar como Engajado
              </Button>
            </div>

            {/* Follow-up History */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Histórico de Follow-ups
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddFollowup(!showAddFollowup)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Novo
                </Button>
              </div>

              {/* Add Follow-up Form */}
              {showAddFollowup && (
                <div className="space-y-3 p-3 border border-border rounded-lg bg-muted/30">
                  <Select
                    value={followupTipo}
                    onValueChange={(val) => setFollowupTipo(val as CRMInteracaoTipo)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CRM_INTERACAO_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Textarea
                    placeholder="O que aconteceu nessa interação?"
                    value={followupNota}
                    onChange={(e) => setFollowupNota(e.target.value)}
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleAddFollowup}
                      disabled={!followupNota.trim() || isSubmitting}
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Salvar"
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowAddFollowup(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

              {/* Interactions List */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {interacoes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma interação registrada
                  </p>
                ) : (
                  interacoes.map((interacao) => (
                    <div
                      key={interacao.id}
                      className="p-3 border border-border rounded-lg bg-card"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className="text-xs">
                          {getInteracaoLabel(interacao.tipo)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(interacao.created_at), "dd/MM HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-sm">{interacao.nota}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
