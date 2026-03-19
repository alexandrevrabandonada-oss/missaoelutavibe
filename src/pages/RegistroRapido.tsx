/**
 * RegistroRapido - F1.2 (polish)
 * 
 * Tela única. 4 blocos. Sem wizard.
 * Labels dinâmicos por tipo de missão.
 * Suporte a link para missões digitais.
 * Estado de sucesso próprio.
 */

import { useState, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useMissions } from "@/hooks/useMissions";
import { useEvidences } from "@/hooks/useEvidences";
import { useStorage } from "@/hooks/useStorage";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/ui/Logo";
import { FullPageLoader } from "@/components/ui/LoadingSpinner";
import { toast } from "sonner";
import {
  ArrowLeft,
  Send,
  Camera,
  X,
  Loader2,
  MapPin,
  Lock,
  FileText,
  Link as LinkIcon,
  CheckCircle2,
  ClipboardList,
  AlertCircle,
} from "lucide-react";
import { MissionProofGuide } from "@/components/missions/MissionProofGuide";
import { RegistroQualityHints } from "@/components/missions/RegistroQualityHints";
import { RegistroSignalBadge } from "@/components/missions/RegistroSignalBadge";
import { getQualityHints } from "@/lib/registroQualityCheck";
import { getRegistroSignal } from "@/lib/missionCriteria";

const MAX_RESUMO = 280;

// ─── Helpers por tipo de missão ────────────────────────────────────────────

type MissionType = string;

function getLocalLabel(type: MissionType): { label: string; placeholder: string } {
  switch (type) {
    case "conteudo":
      return { label: "Onde foi publicado?", placeholder: "Instagram, WhatsApp, TikTok..." };
    case "dados":
      return { label: "Qual foi a fonte ou contexto?", placeholder: "Site, pesquisa de campo, planilha..." };
    case "formacao":
      return { label: "Qual curso, aula ou atividade?", placeholder: "Nome do curso ou atividade..." };
    default:
      return { label: "Onde foi?", placeholder: "Centro, praça, reunião..." };
  }
}

function isDigitalMission(type: MissionType) {
  return ["conteudo", "dados"].includes(type);
}

// ─── Success Screen ────────────────────────────────────────────────────────

function RegistroEnviado({ onGoToRegistros, onGoToHoje }: { onGoToRegistros: () => void; onGoToHoje: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background animate-slide-up">
      <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center mb-5">
        <CheckCircle2 className="h-8 w-8 text-primary" />
      </div>

      <h1 className="text-2xl font-bold text-center mb-2">Registro enviado!</h1>

      <div className="text-sm text-muted-foreground text-center space-y-1 mb-8 max-w-xs">
        <p>Ele foi para validação da coordenação.</p>
        <p>Nasce como privado — só você e a coord veem.</p>
        <p>Acompanhe o status em <strong className="text-foreground">Meus Registros</strong>.</p>
      </div>

      <div className="w-full max-w-xs space-y-3">
        <Button onClick={onGoToRegistros} className="btn-luta w-full">
          <ClipboardList className="h-4 w-4 mr-2" />
          Ir para Meus Registros
        </Button>
        <Button variant="outline" onClick={onGoToHoje} className="w-full">
          Voltar para Hoje
        </Button>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function RegistroRapido() {
  const { missionId } = useParams<{ missionId: string }>();
  const { user } = useAuth();
  const { missions, isLoading: missionsLoading } = useMissions();
  const { submitEvidence, isSubmitting } = useEvidences();
  const { uploadEvidenceImage, isUploading } = useStorage();
  const navigate = useNavigate();
  const location = useLocation();

  // Support resubmission prefill from /voluntario/meus-registros
  const prefillState = location.state as {
    reenvio?: boolean;
    prefillResumo?: string;
    prefillLocal?: string;
    prefillRelato?: string;
    prefillLink?: string;
  } | null;

  const isReenvio = prefillState?.reenvio === true;

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [resumo, setResumo] = useState(prefillState?.prefillResumo ?? "");
  const [localTexto, setLocalTexto] = useState(prefillState?.prefillLocal ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [relatoTexto, setRelatoTexto] = useState(prefillState?.prefillRelato ?? "");
  const [linkConteudo, setLinkConteudo] = useState(prefillState?.prefillLink ?? "");
  const [submitted, setSubmitted] = useState(false);

  const mission = missions.find(m => m.id === missionId);

  if (missionsLoading) return <FullPageLoader />;

  if (!mission) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
        <h1 className="text-xl font-bold mb-4">Missão não encontrada</h1>
        <Button onClick={() => navigate("/voluntario/hoje")} variant="outline">Voltar</Button>
      </div>
    );
  }

  if (submitted) {
    return (
      <RegistroEnviado
        onGoToRegistros={() => navigate("/voluntario/meus-registros", { replace: true })}
        onGoToHoje={() => navigate("/voluntario/hoje", { replace: true })}
      />
    );
  }

  const localConfig = getLocalLabel(mission.type);
  const isDigital = isDigitalMission(mission.type);

  const hasPhoto = !!imageFile;
  const hasRelato = relatoTexto.trim().length >= 10;
  // Digital missions: link counts as evidence too
  const hasLink = linkConteudo.trim().length > 0;
  const hasEvidencia = hasPhoto || hasRelato || (isDigital && hasLink);

  // F18: Quality hints (only compute when user has started filling)
  const hasStartedFilling = resumo.trim().length > 0 || localTexto.trim().length > 0 || relatoTexto.trim().length > 0 || hasPhoto;
  const qualityHints = hasStartedFilling
    ? getQualityHints({
        resumo,
        localTexto,
        relatoTexto,
        hasPhoto,
        linkConteudo,
        missionType: mission.type,
      })
    : [];

  const canSubmit =
    resumo.trim().length >= 10 &&
    localTexto.trim().length >= 3 &&
    hasEvidencia &&
    !isSubmitting &&
    !isUploading;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Selecione uma imagem"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Imagem muito grande (máx. 10MB)"); return; }
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!user?.id || !missionId) { toast.error("Erro de autenticação"); return; }
    try {
      let mediaUrls: string[] = [];
      if (imageFile) {
        toast.loading("Enviando foto...", { id: "upload" });
        const url = await uploadEvidenceImage(imageFile);
        if (url) mediaUrls.push(url);
        toast.dismiss("upload");
      }

      // Append link to relato for digital missions
      const relatoFinal = [
        relatoTexto.trim(),
        isDigital && linkConteudo.trim() ? `Link: ${linkConteudo.trim()}` : "",
      ].filter(Boolean).join("\n\n") || null;

      await submitEvidence({
        mission_id: missionId,
        user_id: user.id,
        content_type: mediaUrls.length > 0 ? "image" : "text",
        resumo: resumo.trim(),
        local_texto: localTexto.trim(),
        relato_texto: relatoFinal,
        media_urls: mediaUrls.length > 0 ? mediaUrls : null,
        mode: "rapido",
        status: "enviado",
        visibilidade: "privada",
      });

      setSubmitted(true);
    } catch (error) {
      toast.dismiss("upload");
      toast.error("Erro ao enviar. Tente novamente.");
    }
  };

  const evidenceLabel = isDigital ? "Print ou link" : "Foto ou relato";
  const evidencePlaceholder = isDigital
    ? "Descreva o conteúdo publicado..."
    : "Descreva brevemente o que aconteceu...";

  return (
    <div className="min-h-screen flex flex-col bg-background texture-concrete">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Logo size="sm" />
      </div>

      <div className="flex-1 px-5 pb-4 space-y-4 animate-slide-up">

        {/* Banner de correção */}
        {isReenvio && (
          <div className="rounded-lg bg-orange-500/10 border border-orange-500/30 px-4 py-3 flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-orange-700 dark:text-orange-400">
              Você está corrigindo um registro rejeitado. Revise os campos abaixo.
            </p>
          </div>
        )}

        {/* BLOCO 1 — Missão */}
        <div className="card-luta">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Registrando para</p>
          <p className="font-bold text-base leading-snug">{mission.title}</p>
        </div>

        {/* BLOCO 2 — O que fiz + onde */}
        <div className="space-y-3">
          <div>
            <label className="text-sm font-semibold mb-1.5 block">
              O que você fez? <span className="text-destructive">*</span>
            </label>
            <Textarea
              value={resumo}
              onChange={(e) => setResumo(e.target.value.slice(0, MAX_RESUMO))}
              placeholder="Ex: Conversei com vizinhos na feira sobre o projeto..."
              className="min-h-[72px] resize-none bg-secondary border-border"
              maxLength={MAX_RESUMO}
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">{resumo.length}/{MAX_RESUMO}</p>
          </div>

          <div>
            <label className="text-sm font-semibold mb-1.5 flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              {localConfig.label} <span className="text-destructive">*</span>
            </label>
            <Input
              value={localTexto}
              onChange={(e) => setLocalTexto(e.target.value)}
              placeholder={localConfig.placeholder}
              className="bg-secondary border-border"
            />
          </div>
        </div>

        {/* BLOCO 3 — Comprovação */}
        <div>
          <label className="text-sm font-semibold mb-1.5 flex items-center gap-1.5">
            <Camera className="h-4 w-4 text-muted-foreground" />
            {evidenceLabel} <span className="text-destructive">*</span>
          </label>

          <p className="text-xs text-muted-foreground mb-2">
            {isDigital ? "Print, link ou relato — pelo menos um" : "Foto ou relato — pelo menos um"}
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />

          {/* Foto */}
          {imagePreview ? (
            <div className="relative inline-block mb-3">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-28 h-28 object-cover rounded-lg border border-border"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6"
                onClick={() => { setImageFile(null); setImagePreview(null); }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="mb-3"
            >
              <Camera className="h-4 w-4 mr-2" />
              {isDigital ? "Adicionar print" : "Adicionar foto"}
            </Button>
          )}

          {/* Link — só para digitais */}
          {isDigital && (
            <div className="mb-3">
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={linkConteudo}
                  onChange={(e) => setLinkConteudo(e.target.value)}
                  placeholder="Link do conteúdo (opcional)"
                  className="pl-9 bg-secondary border-border"
                  type="url"
                />
              </div>
            </div>
          )}

          {/* Relato */}
          <Textarea
            value={relatoTexto}
            onChange={(e) => setRelatoTexto(e.target.value)}
            placeholder={evidencePlaceholder}
            className="min-h-[56px] resize-none bg-secondary border-border"
          />
          {!hasPhoto && !(isDigital && hasLink) && relatoTexto.length > 0 && relatoTexto.length < 10 && (
            <p className="text-xs text-destructive mt-1">Escreva pelo menos 10 caracteres</p>
          )}
        </div>
      </div>

      {/* BLOCO 4 — CTA fixo */}
      <div className="px-5 pb-6 pt-3 space-y-3 border-t border-border bg-background safe-bottom">
        {/* F18: Proof guide contextual */}
        <MissionProofGuide missionType={mission.type} className="!p-3 !mb-0" />

        {/* F18: Quality hints */}
        <RegistroQualityHints hints={qualityHints} />

        {/* F21: Signal strength */}
        {hasStartedFilling && (
          <RegistroSignalBadge
            {...getRegistroSignal({
              resumo,
              localTexto,
              relatoTexto,
              hasPhoto,
              linkConteudo,
              missionType: mission.type,
            })}
          />
        )}

        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Lock className="h-3 w-3 flex-shrink-0" />
          Enviado para validação · nasce privado · acompanhe em Meus Registros
        </p>

        <Button onClick={handleSubmit} className="btn-luta w-full" disabled={!canSubmit}>
          {isSubmitting || isUploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Enviar Registro
            </>
          )}
        </Button>

        <button
          type="button"
          onClick={() => navigate(`/voluntario/evidencia/${missionId}`)}
          className="w-full text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 py-1 transition-colors"
        >
          <FileText className="h-3.5 w-3.5" />
          Detalhar mais
        </button>
      </div>
    </div>
  );
}
