import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useMissions } from "@/hooks/useMissions";
import { useEvidences } from "@/hooks/useEvidences";
import { useStorage } from "@/hooks/useStorage";
import { useVolunteerStatus } from "@/hooks/useVolunteerStatus";
import { PostMissionImpact } from "@/components/missions/PostMissionImpact";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Logo } from "@/components/ui/Logo";
import { FullPageLoader } from "@/components/ui/LoadingSpinner";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Send, 
  Camera, 
  FileText, 
  CheckCircle, 
  X, 
  Loader2, 
  Plus,
} from "lucide-react";

const MAX_IMAGES = 3;

export default function VoluntarioEvidencia() {
  const { missionId } = useParams<{ missionId: string }>();
  const { user } = useAuth();
  const { missions, isLoading: missionsLoading } = useMissions();
  const { submitEvidence, isSubmitting } = useEvidences();
  const { uploadEvidenceImage, isUploading } = useStorage();
  const { isPending, isRejected, isApproved, isStatusLoading } = useVolunteerStatus();
  
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const location = useLocation();
  const prefillNote = (location.state as { prefillNote?: string } | null)?.prefillNote || "";
  const [contentText, setContentText] = useState(prefillNote);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState(-1);

  const mission = missions.find(m => m.id === missionId);

  // Redirect unapproved users
  useEffect(() => {
    if (!isStatusLoading && (isPending || isRejected)) {
      navigate("/aguardando-aprovacao", { replace: true });
    }
  }, [isPending, isRejected, isStatusLoading, navigate]);

  if (missionsLoading || isStatusLoading) {
    return <FullPageLoader />;
  }

  if (!isApproved) {
    return <FullPageLoader />;
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = MAX_IMAGES - imageFiles.length;
    const filesToAdd = files.slice(0, remainingSlots);

    for (const file of filesToAdd) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Selecione apenas arquivos de imagem");
        continue;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} excede 10MB`);
        continue;
      }

      // Add to files
      setImageFiles(prev => [...prev, file]);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!user?.id || !missionId) {
      toast.error("Erro de autenticação");
      return;
    }

    if (!contentText.trim()) {
      toast.error("O relato é obrigatório");
      return;
    }

    try {
      const imageUrls: string[] = [];

      // Upload all images
      for (let i = 0; i < imageFiles.length; i++) {
        setUploadingIndex(i);
        toast.loading(`Enviando imagem ${i + 1} de ${imageFiles.length}...`, { id: "upload" });
        const url = await uploadEvidenceImage(imageFiles[i]);
        if (url) {
          imageUrls.push(url);
        }
      }
      setUploadingIndex(-1);
      toast.dismiss("upload");

      // Submit evidence with all image URLs (comma separated if multiple)
      submitEvidence({
        mission_id: missionId,
        user_id: user.id,
        content_type: imageUrls.length > 0 ? "image" : "text",
        content_text: contentText.trim(),
        content_url: imageUrls.length > 0 ? imageUrls.join(",") : null,
      });

      setSubmitted(true);
      toast.success("Evidência enviada com sucesso!");
    } catch (error) {
      toast.dismiss("upload");
      toast.error("Erro ao enviar. Tente novamente.");
      console.error("Submit error:", error);
      setUploadingIndex(-1);
    }
  };

  const isProcessing = isSubmitting || isUploading;
  const canSubmit = contentText.trim() && !isProcessing;


  if (submitted && mission) {
    return (
      <PostMissionImpact
        mission={mission}
        onReset={() => navigate("/voluntario/hoje", { replace: true })}
      />
    );
  }

  if (submitted) {
    // Fallback if mission not found
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
        <CheckCircle className="h-16 w-16 text-primary mb-4" />
        <h1 className="text-2xl font-bold mb-2">Missão Enviada!</h1>
        <Button onClick={() => navigate("/voluntario/hoje", { replace: true })} className="btn-luta mt-4">
          Voltar ao Início
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col p-6 bg-background texture-concrete">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Logo size="sm" />
      </div>

      <div className="flex-1 animate-slide-up">
        <h1 className="text-2xl font-bold mb-2">Registro detalhadooo</h1>
        
        {mission && (
          <div className="card-luta mb-6">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Missão</p>
            <h2 className="font-bold text-lg normal-case">{mission.title}</h2>
          </div>
        )}

        <div className="space-y-4">
          {/* Text Input */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              <FileText className="inline h-4 w-4 mr-2" />
              Relato da sua ação *
            </label>
            <Textarea
              value={contentText}
              onChange={(e) => setContentText(e.target.value)}
              placeholder="Descreva o que você fez, com quem conversou, onde foi, o que aprendeu..."
              className="min-h-[150px] bg-secondary border-border"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Seja específico(a): detalhes ajudam na validação.
            </p>
          </div>

          {/* Image Upload */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              <Camera className="inline h-4 w-4 mr-2" />
              Fotoso registro (opcional, máx. {MAX_IMAGES})
            </label>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              className="hidden"
            />

            {/* Image Previews Grid */}
            <div className="grid grid-cols-3 gap-3 mb-3">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative aspect-square">
                  <img 
                    src={preview} 
                    alt={`Preview ${index + 1}`} 
                    className="w-full h-full object-cover rounded-lg border border-border"
                  />
                  {uploadingIndex === index && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  )}
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={() => handleRemoveImage(index)}
                    disabled={isProcessing}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}

              {/* Add more button */}
              {imageFiles.length < MAX_IMAGES && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="aspect-square border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1 hover:bg-secondary/50 transition-colors disabled:opacity-50"
                >
                  <Plus className="h-6 w-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Foto</span>
                </button>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Formatos aceitos: JPG, PNG, WEBP. Máximo 10MB cada.
            </p>
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="pt-6 safe-bottom">
        <Button 
          onClick={handleSubmit} 
          className="btn-luta w-full" 
          disabled={!canSubmit}
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {isUploading ? `Enviando imagem ${uploadingIndex + 1}...` : "Enviando..."}
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Enviar ERegistro            </>
          )}
        </Button>
      </div>
    </div>
  );
}
