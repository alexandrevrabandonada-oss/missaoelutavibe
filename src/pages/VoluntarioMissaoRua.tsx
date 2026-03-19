import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useVolunteerStatus } from "@/hooks/useVolunteerStatus";
import { useInviteLoop } from "@/hooks/useInviteLoop";
import {
  useStreetMission,
  StreetMissionMeta,
  StreetMissionCheckboxes,
  STREET_ACTION_LABELS,
  COMPLETION_CHECKBOX_OPTIONS,
} from "@/hooks/useStreetMission";
import { useStorage } from "@/hooks/useStorage";
import { useFirstAction } from "@/hooks/useFirstAction";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FullPageLoader } from "@/components/ui/LoadingSpinner";
import { QuickAddContactModal } from "@/components/crm/QuickAddContactModal";
import { Bring1Modal } from "@/components/activation/Bring1Modal";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft,
  MapPin,
  Clock,
  QrCode,
  CheckCircle,
  Camera,
  Loader2,
  Copy,
  Share2,
  MessageCircle,
  Sparkles,
  AlertCircle,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Mission = Tables<"missions">;

// Short scripts for street conversations
const CONVERSATION_SCRIPTS = [
  {
    id: "abrir",
    title: "Abrir conversa",
    text: "Oi! Tudo bem? Você já ouviu falar do movimento ÉLuta? Estamos organizando pessoas que querem fazer a diferença na nossa cidade.",
  },
  {
    id: "fechar",
    title: "Fechar convite",
    text: "Posso te mostrar como participar? É só escanear esse QR Code aqui – sua primeira missão leva menos de 10 minutos!",
  },
];

export default function VoluntarioMissaoRua() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPending, isRejected, isApproved, isStatusLoading } = useVolunteerStatus();
  const { inviteLink, copyLink, shareNative } = useInviteLoop();
  const { completeMission, isCompleting } = useStreetMission();
  const { uploadEvidenceImage, isUploading } = useStorage();
  const { needsFirstAction, completeFirstAction } = useFirstAction();

  const [checkboxes, setCheckboxes] = useState<StreetMissionCheckboxes>({});
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showBring1Modal, setShowBring1Modal] = useState(false);

  // Redirect unapproved users
  useEffect(() => {
    if (!isStatusLoading && (isPending || isRejected)) {
      navigate("/aguardando-aprovacao", { replace: true });
    }
  }, [isPending, isRejected, isStatusLoading, navigate]);

  // Fetch mission
  const missionQuery = useQuery({
    queryKey: ["street-mission", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("missions")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as Mission;
    },
    enabled: !!id,
  });

  const mission = missionQuery.data;
  const meta = mission?.meta_json as unknown as StreetMissionMeta | null;

  const handleCheckboxChange = (key: string, checked: boolean) => {
    setCheckboxes((prev) => ({ ...prev, [key]: checked }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleComplete = async () => {
    if (!mission?.id) return;

    // Check at least one checkbox
    const hasAnyChecked = Object.values(checkboxes).some((v) => v);
    if (!hasAnyChecked) {
      toast.error("Marque pelo menos uma opção para concluir");
      return;
    }

    try {
      let photoUrl: string | undefined;

      // Upload photo if provided
      if (photoFile) {
        const result = await uploadEvidenceImage(photoFile);
        if (result) {
          photoUrl = result;
        }
      }

      await completeMission({
        missionId: mission.id,
        checkboxes,
        photoUrl,
      });

      // Mark first action complete if needed + show Bring1 modal
      if (needsFirstAction) {
        completeFirstAction("rua");
        setShowBring1Modal(true);
        return; // Don't navigate yet
      }

      navigate("/voluntario");
    } catch (error) {
      console.error("Error completing mission:", error);
    }
  };

  const handleCopyScript = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Texto copiado!");
  };

  if (isStatusLoading || missionQuery.isLoading) {
    return <FullPageLoader />;
  }

  if (!isApproved) {
    return <FullPageLoader />;
  }

  if (!mission || !meta) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background texture-concrete">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h1 className="text-xl font-bold mb-2">Missão não encontrada</h1>
        <Button onClick={() => navigate("/voluntario")} variant="outline">
          Voltar
        </Button>
      </div>
    );
  }

  const isCompleted = mission.status === "concluida";
  const acaoLabel = STREET_ACTION_LABELS[meta.acao as keyof typeof STREET_ACTION_LABELS] || meta.acao;

  return (
    <div className="min-h-screen flex flex-col p-4 pb-24 bg-background texture-concrete">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/voluntario")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Logo size="sm" />
      </div>

      <div className="flex-1 space-y-4 animate-slide-up max-w-lg mx-auto w-full">
        {/* Status Badge */}
        {isCompleted && (
          <div className="flex items-center gap-2 text-green-500 mb-4">
            <CheckCircle className="h-5 w-5" />
            <span className="text-sm uppercase tracking-wider font-bold">Missão Concluída!</span>
          </div>
        )}

        {/* Mission Info */}
        <Card className="border-orange-500/30 bg-orange-500/5">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="h-5 w-5 text-orange-500" />
                {acaoLabel}
              </CardTitle>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {meta.tempo_estimado} min
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {meta.bairro && (
                <>
                  <span className="font-medium">Bairro:</span> {meta.bairro}
                  <br />
                </>
              )}
              {meta.cidade && (
                <>
                  <span className="font-medium">Cidade:</span> {meta.cidade}
                </>
              )}
            </p>
          </CardContent>
        </Card>

        {/* QR Code Section */}
        {!isCompleted && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <QrCode className="h-5 w-5 text-primary" />
                Seu QR de Convite
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center p-4 bg-white rounded-lg">
                {inviteLink ? (
                  <QRCodeSVG value={inviteLink} size={180} level="M" includeMargin={false} />
                ) : (
                  <div className="w-44 h-44 bg-muted animate-pulse rounded" />
                )}
              </div>

              <div className="flex gap-2">
                <Button onClick={copyLink} variant="outline" size="sm" className="flex-1 gap-1">
                  <Copy className="h-4 w-4" />
                  Copiar
                </Button>
                <Button onClick={shareNative} variant="outline" size="sm" className="flex-1 gap-1">
                  <Share2 className="h-4 w-4" />
                  Enviar
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                Mostre este QR para as pessoas que você conversar
              </p>
            </CardContent>
          </Card>
        )}

        {/* Quick Add Contact Button */}
        {!isCompleted && (
          <Card className="border-green-500/30 bg-green-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                    <UserPlus className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Cadastrar Contato</h3>
                    <p className="text-xs text-muted-foreground">
                      Registre em 10s quem você conversou
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setShowQuickAdd(true)}
                  size="sm"
                  variant="outline"
                  className="border-green-500/50 text-green-500 hover:bg-green-500/10"
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  + Contato
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Conversation Scripts */}
        {!isCompleted && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageCircle className="h-5 w-5 text-primary" />
                Scripts de Conversa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {CONVERSATION_SCRIPTS.map((script) => (
                <div
                  key={script.id}
                  className="p-3 rounded-lg bg-secondary/50 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{script.title}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCopyScript(script.text)}
                      className="h-7 px-2"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copiar
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">{script.text}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Completion Form */}
        {!isCompleted && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-5 w-5 text-primary" />
                Concluir Missão
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Checkboxes */}
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Marque o que você fez durante a ação:
                </p>
                {COMPLETION_CHECKBOX_OPTIONS.map((opt) => (
                  <div key={opt.key} className="flex items-center gap-3">
                    <Checkbox
                      id={opt.key}
                      checked={!!checkboxes[opt.key as keyof StreetMissionCheckboxes]}
                      onCheckedChange={(checked) =>
                        handleCheckboxChange(opt.key, checked as boolean)
                      }
                    />
                    <Label htmlFor={opt.key} className="text-sm cursor-pointer">
                      {opt.label}
                    </Label>
                  </div>
                ))}
              </div>

              {/* Photo (optional) */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Foto do local (opcional, sem rostos)
                </Label>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoChange}
                  className="hidden"
                  id="photo-input"
                />
                <label
                  htmlFor="photo-input"
                  className="flex items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary transition-colors"
                >
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="h-full object-cover rounded"
                    />
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <Camera className="h-6 w-6 mx-auto mb-1" />
                      <span className="text-xs">Toque para adicionar</span>
                    </div>
                  )}
                </label>
                <p className="text-xs text-muted-foreground text-center">
                  ⚠️ Não inclua rostos de pessoas na foto
                </p>
              </div>

              <Button
                onClick={handleComplete}
                disabled={isCompleting || isUploading}
                className="w-full bg-green-500 hover:bg-green-600"
              >
                {isCompleting || isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Concluindo...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Concluir Missão
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Completed State */}
        {isCompleted && (
          <Card className="border-green-500/30 bg-green-500/5">
            <CardContent className="py-8 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-green-600 mb-2">Parabéns!</h2>
              <p className="text-muted-foreground mb-4">
                Você completou sua missão de rua hoje. Cada conversa conta!
              </p>
              <Button onClick={() => navigate("/voluntario")} variant="outline">
                Voltar ao Hub
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Add Contact Modal */}
      <QuickAddContactModal
        open={showQuickAdd}
        onOpenChange={setShowQuickAdd}
        origem="rua"
        context={{
          mission_id: mission?.id,
          acao: meta?.acao,
          bairro: meta?.bairro,
          cidade: meta?.cidade,
        }}
        showWhatsAppButton
      />

      {/* Bring +1 Modal after first action */}
      <Bring1Modal
        open={showBring1Modal}
        onOpenChange={(open) => {
          setShowBring1Modal(open);
          if (!open) {
            navigate("/voluntario");
          }
        }}
      />
    </div>
  );
}
