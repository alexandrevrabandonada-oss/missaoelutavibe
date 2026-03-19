import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { Bring1Modal } from "@/components/activation/Bring1Modal";
import { PlaybookSection } from "@/components/playbook/PlaybookSection";
import { QuickAddContactModal } from "@/components/crm/QuickAddContactModal";
import { toast } from "sonner";
import {
  MessageCircle,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Check,
  User,
  MapPin,
  FileText,
  Loader2,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import {
  useConversationMissionDetails,
  useCompleteConversationMission,
  useConversationTracking,
  ConversationOutcome,
  OUTCOME_LABELS,
  OUTCOME_COLORS,
  OBJECTIVE_LABELS,
} from "@/hooks/useConversationMission";
import { useRoteiro, useRoteiroActions, RoteiroVersoes } from "@/hooks/useRoteiros";
import { useInviteLoop } from "@/hooks/useInviteLoop";
import { useFirstAction } from "@/hooks/useFirstAction";
import { useCRMMutations } from "@/hooks/useCRM";
import { addDays } from "date-fns";

type VersionKey = 'curta' | 'media' | 'longa';

const OUTCOME_OPTIONS: ConversationOutcome[] = [
  'convite_enviado',
  'topou',
  'talvez_depois',
  'nao_agora',
  'numero_errado',
  'sem_resposta',
];

// Regex to block phone/email in notes
const PII_PATTERNS = /(\d{10,})|(\S+@\S+\.\S+)/g;

export default function VoluntarioMissaoConversa() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { mission, contacts, isLoading, refetch } = useConversationMissionDetails(id);
  const { data: roteiro, isLoading: roteiroLoading } = useRoteiro(mission?.meta_json?.roteiro_id);
  const { trackAction } = useRoteiroActions();
  const { logMissionOpened, logScriptCopied, logWhatsAppOpened } = useConversationTracking();
  const completeMission = useCompleteConversationMission();
  const { profile, inviteCode } = useInviteLoop();
  const { needsFirstAction, completeFirstAction } = useFirstAction();

  const [selectedVersion, setSelectedVersion] = useState<VersionKey>('media');
  const [roteiroOpen, setRoteiroOpen] = useState(true);
  const [outcomes, setOutcomes] = useState<Record<string, ConversationOutcome>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [isCopied, setIsCopied] = useState(false);
  const [showBring1Modal, setShowBring1Modal] = useState(false);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);

  // CRM mutation for follow-up scheduling from playbook
  const { updateStatus } = useCRMMutations();

  // Log mission opened on mount
  useEffect(() => {
    if (id) {
      logMissionOpened(id);
    }
  }, [id]);

  // Initialize outcomes from contacts
  useEffect(() => {
    if (contacts.length > 0) {
      const initialOutcomes: Record<string, ConversationOutcome> = {};
      const initialNotes: Record<string, string> = {};
      contacts.forEach(c => {
        initialOutcomes[c.contact_id] = c.outcome || 'sem_resposta';
        initialNotes[c.contact_id] = c.notes || '';
      });
      setOutcomes(initialOutcomes);
      setNotes(initialNotes);
    }
  }, [contacts]);

  if (isLoading) {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto space-y-4 p-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </AppShell>
    );
  }

  if (!mission) {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto p-4 text-center">
          <p className="text-muted-foreground">Missão não encontrada</p>
          <Button variant="outline" onClick={() => navigate("/voluntario/hoje")} className="mt-4">
            Voltar
          </Button>
        </div>
      </AppShell>
    );
  }

  const isCompleted = mission.status === 'concluida';
  const objective = mission.meta_json?.objective || 'convidar';

  // Get roteiro text based on selected version
  const versoes = roteiro?.versoes_json as unknown as RoteiroVersoes | null;
  const roteiroText = versoes?.[selectedVersion] || roteiro?.texto_base || '';

  // Generate WhatsApp link with invite code
  const inviteLink = inviteCode 
    ? `${window.location.origin}/r/${inviteCode}?utm_source=conversa&utm_medium=whatsapp&utm_campaign=missao_conversa`
    : '';
  
  const whatsappText = roteiroText + (inviteLink ? `\n\nLink: ${inviteLink}` : '');
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;

  const handleCopyRoteiro = async () => {
    try {
      await navigator.clipboard.writeText(whatsappText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      
      // Track actions
      if (roteiro?.id) {
        trackAction.mutate({ roteiroId: roteiro.id, actionType: 'copiou' });
        logScriptCopied(roteiro.id);
      }
      toast.success("Roteiro copiado!");
    } catch {
      toast.error("Erro ao copiar");
    }
  };

  const handleOpenWhatsApp = () => {
    if (roteiro?.id) {
      trackAction.mutate({ roteiroId: roteiro.id, actionType: 'abriu_whatsapp' });
      logWhatsAppOpened(roteiro.id);
    }
    window.open(whatsappUrl, '_blank');
  };

  const handleNoteChange = (contactId: string, value: string) => {
    // Block PII patterns
    const sanitized = value.replace(PII_PATTERNS, '[REMOVIDO]').substring(0, 240);
    setNotes(prev => ({ ...prev, [contactId]: sanitized }));
  };

  const handleComplete = async () => {
    const results = contacts.map(c => ({
      contact_id: c.contact_id,
      outcome: outcomes[c.contact_id] || 'sem_resposta',
      notes: notes[c.contact_id] || '',
    }));

    // Check at least one outcome is not sem_resposta
    const hasValidOutcome = results.some(r => r.outcome !== 'sem_resposta');
    if (!hasValidOutcome) {
      toast.error("Registre pelo menos 1 resultado antes de concluir");
      return;
    }

    const result = await completeMission.mutateAsync({
      missionId: mission.id,
      results,
    });

    if (result.success) {
      // Mark first action complete if needed + show Bring1 modal
      if (needsFirstAction) {
        completeFirstAction("conversa");
        setShowBring1Modal(true);
      }
      refetch();
    }
  };

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6 p-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/voluntario/hoje")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-purple-500" />
              {mission.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              Objetivo: {OBJECTIVE_LABELS[objective as keyof typeof OBJECTIVE_LABELS]}
            </p>
          </div>
          {isCompleted && (
            <Badge className="bg-green-500/10 text-green-600">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Concluída
            </Badge>
          )}
        </div>

        {/* Roteiro Section */}
        <Collapsible open={roteiroOpen} onOpenChange={setRoteiroOpen}>
          <Card className="border-purple-500/30">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-purple-500" />
                    <CardTitle className="text-base">Roteiro: {roteiro?.titulo || "Carregando..."}</CardTitle>
                  </div>
                  {roteiroOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                {roteiroLoading ? (
                  <Skeleton className="h-24 w-full" />
                ) : (
                  <>
                    {/* Version Tabs */}
                    {versoes && (versoes.curta || versoes.media || versoes.longa) && (
                      <Tabs value={selectedVersion} onValueChange={(v) => setSelectedVersion(v as VersionKey)}>
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="curta" disabled={!versoes.curta}>Curta</TabsTrigger>
                          <TabsTrigger value="media" disabled={!versoes.media}>Média</TabsTrigger>
                          <TabsTrigger value="longa" disabled={!versoes.longa}>Longa</TabsTrigger>
                        </TabsList>
                      </Tabs>
                    )}

                    {/* Roteiro Text */}
                    <div className="p-3 bg-muted/50 rounded-lg text-sm whitespace-pre-wrap max-h-48 overflow-y-auto">
                      {roteiroText || roteiro?.texto_base || "Texto do roteiro não disponível"}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        className="flex-1 gap-2" 
                        onClick={handleCopyRoteiro}
                        disabled={isCompleted}
                      >
                        {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        {isCopied ? "Copiado!" : "Copiar"}
                      </Button>
                      <Button 
                        className="flex-1 gap-2 bg-green-600 hover:bg-green-700" 
                        onClick={handleOpenWhatsApp}
                        disabled={isCompleted}
                      >
                        <ExternalLink className="h-4 w-4" />
                        WhatsApp
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Playbook Section - Objections + Next Steps */}
        {!isCompleted && (
          <PlaybookSection
            roteiroId={mission.meta_json?.roteiro_id}
            objective={objective}
            onScheduleFollowup={() => {
              toast.info("Agende follow-up no resultado de cada contato");
            }}
            onInvitePlus1={() => setShowBring1Modal(true)}
            onSaveContact={() => setShowQuickAddModal(true)}
            onOpenWhatsApp={handleOpenWhatsApp}
            showNextSteps={true}
          />
        )}

        {/* Contacts Section */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <User className="h-5 w-5" />
            Contatos ({contacts.length})
          </h2>

          {contacts.map((contact) => (
            <Card key={contact.id} className={outcomes[contact.contact_id] !== 'sem_resposta' ? 'border-green-500/30' : ''}>
              <CardContent className="p-4 space-y-3">
                {/* Contact Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{contact.contact_name}</p>
                      {contact.contact_bairro && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {contact.contact_bairro}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {contact.contact_status}
                  </Badge>
                </div>

                {/* Outcome Select */}
                <div className="space-y-2">
                  <Label className="text-xs">Resultado da conversa</Label>
                  <Select
                    value={outcomes[contact.contact_id] || 'sem_resposta'}
                    onValueChange={(val) => setOutcomes(prev => ({ ...prev, [contact.contact_id]: val as ConversationOutcome }))}
                    disabled={isCompleted}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OUTCOME_OPTIONS.map((outcome) => (
                        <SelectItem key={outcome} value={outcome}>
                          <span className="flex items-center gap-2">
                            <span className={`inline-block w-2 h-2 rounded-full ${OUTCOME_COLORS[outcome].split(' ')[0]}`} />
                            {OUTCOME_LABELS[outcome]}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label className="text-xs">Observação (opcional, máx 240 chars)</Label>
                  <Textarea
                    placeholder="Ex: Interessado em educação, ligar novamente terça..."
                    value={notes[contact.contact_id] || ''}
                    onChange={(e) => handleNoteChange(contact.contact_id, e.target.value)}
                    maxLength={240}
                    rows={2}
                    disabled={isCompleted}
                    className="text-sm"
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {(notes[contact.contact_id] || '').length}/240
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Complete Button */}
        {!isCompleted && (
          <Button 
            onClick={handleComplete} 
            disabled={completeMission.isPending}
            className="w-full bg-purple-500 hover:bg-purple-600"
            size="lg"
          >
            {completeMission.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Concluindo...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Concluir Missão
              </>
            )}
          </Button>
        )}

        {isCompleted && (
          <Card className="border-green-500/30 bg-green-500/5">
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="font-medium text-green-600">Missão concluída!</p>
              <p className="text-sm text-muted-foreground">Obrigado por fazer a diferença.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bring +1 Modal after first action */}
      <Bring1Modal
        open={showBring1Modal}
        onOpenChange={setShowBring1Modal}
      />

      {/* Quick Add Contact Modal from playbook */}
      <QuickAddContactModal
        open={showQuickAddModal}
        onOpenChange={setShowQuickAddModal}
      />
    </AppShell>
  );
}
