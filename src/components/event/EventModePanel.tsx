/**
 * EventModePanel - Full event participation flow
 * 
 * Shows 3 steps: Check-in → Mark attendance → Post-event actions
 * + Automatic follow-up scheduling for attended contacts
 */

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useEventParticipation } from "@/hooks/useEventParticipation";
import { usePostEventFollowups } from "@/hooks/usePostEventFollowups";
import { useLogGrowthEvent } from "@/hooks/useGrowth";
import { 
  MapPin, 
  Check, 
  Users, 
  PartyPopper, 
  Loader2,
  ChevronRight,
  Plus,
  Minus,
  Home,
  UserPlus,
  CalendarClock
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EventModePanelProps {
  eventId: string;
  eventTitle: string;
}

export function EventModePanel({ eventId, eventTitle }: EventModePanelProps) {
  const navigate = useNavigate();
  const { mutate: logEvent } = useLogGrowthEvent();
  const {
    participation,
    isLoadingParticipation,
    invites,
    isLoadingInvites,
    checkin,
    isCheckingIn,
    complete,
    isCompleting,
    markAttended,
    isMarkingAttended,
  } = useEventParticipation(eventId);

  const {
    generate: generateFollowups,
    isGenerating: isGeneratingFollowups,
  } = usePostEventFollowups(eventId);

  // Post-event form state
  const [broughtPlus1, setBroughtPlus1] = useState(false);
  const [qualifiedContacts, setQualifiedContacts] = useState(0);
  const [newContacts, setNewContacts] = useState(0);
  const [showPostSuccess, setShowPostSuccess] = useState(false);
  const [followupsScheduled, setFollowupsScheduled] = useState(false);

  const isCheckedIn = participation?.status === "checked_in" || participation?.status === "completed";
  const isCompleted = participation?.status === "completed";

  // Count attended contacts
  const attendedCount = useMemo(() => {
    return invites.filter(i => i.attended_at || i.status === "attended").length;
  }, [invites]);

  const handleCheckin = async () => {
    try {
      await checkin();
    } catch (error) {
      console.error("Check-in failed:", error);
    }
  };

  const handleMarkAttended = async (contactId: string) => {
    try {
      await markAttended(contactId);
      // Log with bucket
      const newAttendedCount = invites.filter(i => i.attended_at).length + 1;
      logEvent({
        eventType: "event_contacts_attended_marked",
        meta: { count_bucket: newAttendedCount === 1 ? "1" : newAttendedCount <= 3 ? "2-3" : "4+" },
      });
    } catch (error) {
      console.error("Mark attended failed:", error);
    }
  };

  const handleGenerateFollowups = async () => {
    try {
      await generateFollowups(eventId);
      setFollowupsScheduled(true);
    } catch (error) {
      console.error("Generate follow-ups failed:", error);
    }
  };

  const handleComplete = async () => {
    try {
      // Auto-generate follow-ups if there are attended contacts and not already scheduled
      if (attendedCount > 0 && !followupsScheduled) {
        await generateFollowups(eventId);
      }

      await complete({
        brought_plus1: broughtPlus1,
        qualified_contacts: qualifiedContacts,
        new_contacts: newContacts,
      });
      setShowPostSuccess(true);
    } catch (error) {
      console.error("Complete failed:", error);
    }
  };

  if (isLoadingParticipation) {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // Post-completion success state
  if (showPostSuccess || isCompleted) {
    return (
      <Card className="border-accent/30 bg-accent/5">
        <CardContent className="py-6 space-y-4">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-accent/20 mb-3">
              <PartyPopper className="h-6 w-6 text-accent-foreground" />
            </div>
            <h3 className="font-bold text-lg">Evento fechado!</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Obrigado por participar e registrar sua presença.
            </p>
            {attendedCount > 0 && (
              <p className="text-sm text-primary mt-2">
                📅 Follow-ups agendados para 12h
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Button
              onClick={() => navigate("/voluntario/hoje")}
              className="w-full font-bold"
            >
              <Home className="h-4 w-4 mr-2" />
              Voltar ao Hoje (ver fila)
            </Button>
            <Button
              onClick={() => navigate("/voluntario/convite")}
              variant="outline"
              className="w-full"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Convidar +1
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <PartyPopper className="h-5 w-5 text-primary" />
          Modo Evento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Step 1: Check-in */}
        <div className={cn(
          "p-3 rounded-lg border",
          isCheckedIn ? "bg-accent/10 border-accent/30" : "bg-background"
        )}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Badge variant={isCheckedIn ? "default" : "secondary"} className="text-xs">
                Passo 1
              </Badge>
              <span className="text-sm font-medium">Check-in</span>
            </div>
            {isCheckedIn && <Check className="h-4 w-4 text-accent-foreground" />}
          </div>
          {!isCheckedIn ? (
            <Button
              onClick={handleCheckin}
              disabled={isCheckingIn}
              className="w-full font-bold"
            >
              <MapPin className="h-4 w-4 mr-2" />
              {isCheckingIn ? "Registrando..." : "ESTOU AQUI"}
            </Button>
          ) : (
            <p className="text-sm text-accent-foreground flex items-center gap-1">
              <Check className="h-4 w-4" />
              Check-in realizado!
            </p>
          )}
        </div>

        {/* Step 2: Mark attendance (only if checked in and has invites) */}
        {isCheckedIn && invites.length > 0 && (
          <div className="p-3 rounded-lg border bg-background">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="secondary" className="text-xs">Passo 2</Badge>
              <span className="text-sm font-medium">Quem veio?</span>
            </div>
            <div className="space-y-2">
              {isLoadingInvites ? (
                <div className="flex items-center justify-center py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : (
                invites.map((invite) => (
                  <div 
                    key={invite.invite_id}
                    className="flex items-center justify-between p-2 rounded bg-muted/50"
                  >
                    <span className="text-sm font-medium truncate max-w-[150px]">
                      {invite.contact_name}
                    </span>
                    <div className="flex items-center gap-1">
                      {invite.attended_at || invite.status === "attended" ? (
                        <Badge variant="default" className="text-xs">
                          ✅ Veio
                        </Badge>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => handleMarkAttended(invite.contact_id)}
                            disabled={isMarkingAttended}
                          >
                            ✅ Veio
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-muted-foreground"
                            disabled
                          >
                            🕒
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Follow-up scheduling prompt */}
            {attendedCount > 0 && !followupsScheduled && (
              <div className="mt-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-sm font-medium mb-2">
                  ✅ {attendedCount} {attendedCount === 1 ? "pessoa veio" : "pessoas vieram"} — agendar follow-up em 12h?
                </p>
                <Button
                  onClick={handleGenerateFollowups}
                  disabled={isGeneratingFollowups}
                  className="w-full font-bold"
                  size="sm"
                >
                  <CalendarClock className="h-4 w-4 mr-2" />
                  {isGeneratingFollowups ? "Agendando..." : "AGENDAR FOLLOW-UPS"}
                </Button>
              </div>
            )}

            {followupsScheduled && (
              <div className="mt-3 p-2 rounded bg-accent/10 text-center">
                <p className="text-sm text-accent-foreground">
                  ✅ Follow-ups agendados!
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Post-event actions */}
        {isCheckedIn && (
          <div className="p-3 rounded-lg border bg-background">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="secondary" className="text-xs">
                {invites.length > 0 ? "Passo 3" : "Passo 2"}
              </Badge>
              <span className="text-sm font-medium">Pós-evento</span>
            </div>
            
            <div className="space-y-3">
              {/* Brought +1 toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={broughtPlus1}
                  onCheckedChange={(checked) => setBroughtPlus1(!!checked)}
                />
                <span className="text-sm">Trouxe +1</span>
              </label>

              {/* Qualified contacts stepper */}
              <div className="flex items-center justify-between">
                <span className="text-sm">Contatos qualificados</span>
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-7 w-7"
                    onClick={() => setQualifiedContacts(Math.max(0, qualifiedContacts - 1))}
                    disabled={qualifiedContacts === 0}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-6 text-center font-medium">{qualifiedContacts}</span>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-7 w-7"
                    onClick={() => setQualifiedContacts(Math.min(5, qualifiedContacts + 1))}
                    disabled={qualifiedContacts === 5}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* New contacts stepper */}
              <div className="flex items-center justify-between">
                <span className="text-sm">Novos contatos salvos</span>
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-7 w-7"
                    onClick={() => setNewContacts(Math.max(0, newContacts - 1))}
                    disabled={newContacts === 0}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-6 text-center font-medium">{newContacts}</span>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-7 w-7"
                    onClick={() => setNewContacts(Math.min(5, newContacts + 1))}
                    disabled={newContacts === 5}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Complete button */}
              <Button
                onClick={handleComplete}
                disabled={isCompleting || isGeneratingFollowups}
                className="w-full font-bold mt-2"
              >
                {isCompleting || isGeneratingFollowups ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {isGeneratingFollowups ? "Agendando follow-ups..." : "Salvando..."}
                  </>
                ) : (
                  <>
                    <PartyPopper className="h-4 w-4 mr-2" />
                    FECHAR EVENTO
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
