/**
 * EventInviteSection - Section in ContactDetailDrawer for inviting contacts to events
 * 
 * Shows event picker, RSVP chips, and WhatsApp/copy CTAs
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  useContactEventInvites,
  useUpcomingEvents,
  getEventInviteScripts,
  INVITE_STATUS_LABELS,
  INVITE_STATUS_EMOJI,
  type EventInviteStatus,
  type EventInvite,
} from "@/hooks/useEventInvites";
import { useAppMode } from "@/hooks/useAppMode";
import { useLogGrowthEvent } from "@/hooks/useGrowth";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Calendar,
  CalendarPlus,
  MapPin,
  Copy,
  MessageCircle,
  ChevronRight,
  Loader2,
  Clock,
} from "lucide-react";

interface EventInviteSectionProps {
  contactId: string;
  contactName: string;
  whatsappNorm?: string | null;
  onInviteCreated?: () => void;
}

const RSVP_OPTIONS: { status: EventInviteStatus; emoji: string; label: string }[] = [
  { status: "going", emoji: "✅", label: "Vai" },
  { status: "maybe", emoji: "🤔", label: "Talvez" },
  { status: "declined", emoji: "❌", label: "Não vai" },
  { status: "no_answer", emoji: "🕒", label: "Sem resposta" },
];

export function EventInviteSection({
  contactId,
  contactName,
  whatsappNorm,
  onInviteCreated,
}: EventInviteSectionProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [selectedInvite, setSelectedInvite] = useState<EventInvite | null>(null);

  const { mode } = useAppMode();
  const { mutate: logEvent } = useLogGrowthEvent();
  const {
    invites,
    isLoading,
    upsertInvite,
    isUpserting,
    setStatus,
    isSettingStatus,
    markOutreach,
  } = useContactEventInvites(contactId);
  const { data: upcomingEvents, isLoading: loadingEvents } = useUpcomingEvents(10);

  const handleSelectEvent = async (eventId: string) => {
    try {
      await upsertInvite({ eventId, source: "crm_drawer" });
      setIsPickerOpen(false);
      onInviteCreated?.();
      toast.success("Convite criado!");
    } catch (error) {
      console.error("Error creating invite:", error);
      toast.error("Erro ao criar convite");
    }
  };

  const handleSetStatus = async (inviteId: string, status: EventInviteStatus) => {
    try {
      await setStatus({ inviteId, status });
      toast.success(`Status atualizado: ${INVITE_STATUS_LABELS[status]}`);
    } catch (error) {
      console.error("Error setting status:", error);
      toast.error("Erro ao atualizar status");
    }
  };

  const handleCopyText = async (invite: EventInvite, type: "invite" | "reminder") => {
    const scripts = getEventInviteScripts(
      mode,
      invite.event_title,
      invite.event_date,
      invite.event_location
    );

    const text = type === "invite" ? scripts.invite : scripts.reminder;
    await navigator.clipboard.writeText(text);

    await markOutreach(invite.invite_id);
    logEvent({
      eventType: "event_invite_text_copied",
      meta: { source: "crm_drawer", mode, type },
    });

    toast.success("Texto copiado!");
  };

  const handleOpenWhatsApp = async (invite: EventInvite) => {
    if (!whatsappNorm) {
      toast.error("Contato não tem WhatsApp cadastrado");
      return;
    }

    const scripts = getEventInviteScripts(
      mode,
      invite.event_title,
      invite.event_date,
      invite.event_location
    );

    const encoded = encodeURIComponent(scripts.invite);
    const url = `https://wa.me/${whatsappNorm}?text=${encoded}`;

    await markOutreach(invite.invite_id);
    logEvent({
      eventType: "event_invite_whatsapp_opened",
      meta: { source: "crm_drawer", mode },
    });

    window.open(url, "_blank");
  };

  // Filter out events already invited
  const invitedEventIds = new Set(invites.map((i) => i.event_id));
  const availableEvents = upcomingEvents?.filter((e) => !invitedEventIds.has(e.event_id)) || [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Convidar para Atividade
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsPickerOpen(true)}
          disabled={availableEvents.length === 0}
        >
          <CalendarPlus className="h-4 w-4 mr-1" />
          Escolher
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : invites.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-3">
          Nenhum convite ainda. Escolha uma atividade acima.
        </p>
      ) : (
        <div className="space-y-3">
          {invites.map((invite) => (
            <div
              key={invite.invite_id}
              className="border border-border rounded-lg p-3 bg-card space-y-3"
            >
              {/* Event Info */}
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="font-medium text-sm">{invite.event_title}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>
                      {format(new Date(invite.event_date), "EEE, dd/MM 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                  {invite.event_location && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate max-w-[180px]">{invite.event_location}</span>
                    </div>
                  )}
                </div>
                <Badge
                  variant="outline"
                  className="text-xs shrink-0"
                >
                  {INVITE_STATUS_EMOJI[invite.status as EventInviteStatus]}{" "}
                  {INVITE_STATUS_LABELS[invite.status as EventInviteStatus]}
                </Badge>
              </div>

              {/* RSVP Chips */}
              <div className="flex flex-wrap gap-1.5">
                {RSVP_OPTIONS.map((opt) => (
                  <Button
                    key={opt.status}
                    variant={invite.status === opt.status ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleSetStatus(invite.invite_id, opt.status)}
                    disabled={isSettingStatus}
                  >
                    {opt.emoji} {opt.label}
                  </Button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => handleCopyText(invite, "invite")}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copiar Convite
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => handleOpenWhatsApp(invite)}
                  disabled={!whatsappNorm}
                >
                  <MessageCircle className="h-3 w-3 mr-1" />
                  WhatsApp
                </Button>
              </div>

              {/* Last outreach indicator */}
              {invite.last_outreach_at && (
                <p className="text-xs text-muted-foreground">
                  Último contato:{" "}
                  {format(new Date(invite.last_outreach_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Event Picker Sheet */}
      <Sheet open={isPickerOpen} onOpenChange={setIsPickerOpen}>
        <SheetContent side="bottom" className="h-[70vh]">
          <SheetHeader className="text-left">
            <SheetTitle className="flex items-center gap-2">
              <CalendarPlus className="h-5 w-5 text-primary" />
              Escolher Atividade
            </SheetTitle>
            <SheetDescription>
              Selecione uma atividade para convidar {contactName}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-2 overflow-y-auto max-h-[50vh]">
            {loadingEvents ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : availableEvents.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma atividade futura disponível
              </p>
            ) : (
              availableEvents.map((event) => (
                <button
                  key={event.event_id}
                  onClick={() => handleSelectEvent(event.event_id)}
                  disabled={isUpserting}
                  className="w-full text-left p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{event.title}</p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(event.event_date), "EEE, dd/MM 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-1 truncate max-w-[120px]">
                          <MapPin className="h-3 w-3" />
                          {event.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
