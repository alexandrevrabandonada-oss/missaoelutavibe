import { useState, useCallback } from "react";
import { Upload, X, FileImage, FileVideo, FileText, FileAudio, File, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useContentUpload, ContentType } from "@/hooks/useContentUpload";

interface ContentUploadWizardProps {
  onComplete?: () => void;
  defaultType?: ContentType;
  parentContentId?: string;
  parentTags?: string[];
  className?: string;
}

type WizardStep = "file" | "type" | "category" | "details" | "uploading";

const TYPE_OPTIONS = [
  { value: "SHAREPACK" as ContentType, label: "Sharepack", emoji: "📦", desc: "Pacote para compartilhar" },
  { value: "TEMPLATE" as ContentType, label: "Template", emoji: "🎨", desc: "Modelo visual editável" },
  { value: "MATERIAL" as ContentType, label: "Material", emoji: "📄", desc: "Documento ou conteúdo escrito" },
] as const;

const CATEGORY_OPTIONS = [
  { value: "denuncia", label: "Denúncia", emoji: "⚠️" },
  { value: "convite", label: "Convite", emoji: "📩" },
  { value: "mobilizacao", label: "Mobilização", emoji: "📢" },
  { value: "servico", label: "Serviço", emoji: "🔧" },
  { value: "formacao", label: "Formação", emoji: "📚" },
  { value: "institucional", label: "Institucional", emoji: "🏛️" },
] as const;

type AssetKind = "image" | "video" | "audio" | "document" | "other";

function getIconForKind(kind: AssetKind) {
  switch (kind) {
    case "image": return FileImage;
    case "video": return FileVideo;
    case "audio": return FileAudio;
    case "document": return FileText;
    default: return File;
  }
}

function getKindFromMime(mimeType: string): AssetKind {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (
    mimeType.includes("pdf") ||
    mimeType.includes("document") ||
    mimeType.includes("text/") ||
    mimeType.includes("spreadsheet") ||
    mimeType.includes("presentation")
  )
    return "document";
  return "other";
}

export function ContentUploadWizard({
  onComplete,
  defaultType,
  parentContentId,
  parentTags = [],
  className,
}: ContentUploadWizardProps) {
  const [step, setStep] = useState<WizardStep>(parentContentId ? "file" : "type");
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [contentType, setContentType] = useState<ContentType>(defaultType || "SHAREPACK");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(parentTags);
  const [caption, setCaption] = useState("");
  const [title, setTitle] = useState("");
  const { uploadAsync, isUploading } = useContentUpload();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      setSelectedFile(files[0]);
      setTitle(files[0].name.replace(/\.[^/.]+$/, ""));
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setSelectedFile(files[0]);
      setTitle(files[0].name.replace(/\.[^/.]+$/, ""));
    }
    e.target.value = "";
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    setStep("uploading");
    try {
      await uploadAsync({
        file: selectedFile,
        type: contentType,
        tags: selectedCategories,
        parentContentId,
        title: title || selectedFile.name,
        caption,
      });
      onComplete?.();
    } catch (error) {
      // Error is handled by the hook
      setStep("details");
    }
  };

  const canProceed = () => {
    switch (step) {
      case "type": return true;
      case "file": return !!selectedFile;
      case "category": return selectedCategories.length > 0;
      case "details": return true;
      default: return false;
    }
  };

  const goNext = () => {
    if (step === "type") setStep("file");
    else if (step === "file") setStep("category");
    else if (step === "category") setStep("details");
    else if (step === "details") handleUpload();
  };

  const goBack = () => {
    if (step === "file" && !parentContentId) setStep("type");
    else if (step === "category") setStep("file");
    else if (step === "details") setStep("category");
  };

  const stepNumber = step === "type" ? 1 : step === "file" ? 2 : step === "category" ? 3 : 4;
  const totalSteps = parentContentId ? 3 : 4;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Passo {parentContentId ? stepNumber - 1 : stepNumber} de {totalSteps}</span>
          <span>
            {step === "type" && "Tipo"}
            {step === "file" && "Arquivo"}
            {step === "category" && "Categoria"}
            {step === "details" && "Detalhes"}
            {step === "uploading" && "Enviando..."}
          </span>
        </div>
        <Progress value={(stepNumber / totalSteps) * 100} className="h-1" />
      </div>

      {/* Step: Type Selection */}
      {step === "type" && (
        <div className="space-y-3">
          <Label className="text-base font-medium">Que tipo de conteúdo você vai enviar?</Label>
          <div className="grid gap-2">
            {TYPE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setContentType(opt.value)}
                className={cn(
                  "flex items-center gap-3 rounded-lg border-2 p-4 text-left transition-all",
                  contentType === opt.value
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:border-primary/50"
                )}
              >
                <span className="text-2xl">{opt.emoji}</span>
                <div>
                  <p className="font-medium">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </div>
                {contentType === opt.value && (
                  <Check className="ml-auto h-5 w-5 text-primary" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step: File Selection */}
      {step === "file" && (
        <div className="space-y-3">
          <Label className="text-base font-medium">Escolha o arquivo</Label>
          
          {!selectedFile ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "relative flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors",
                isDragOver
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
              )}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Upload className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="font-medium">Arraste um arquivo aqui</p>
                <p className="text-sm text-muted-foreground">ou clique para selecionar</p>
              </div>
              <input
                type="file"
                onChange={handleFileSelect}
                className="absolute inset-0 cursor-pointer opacity-0"
                aria-label="Selecionar arquivo"
              />
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-4">
              {(() => {
                const kind = getKindFromMime(selectedFile.type);
                const Icon = getIconForKind(kind);
                return <Icon className="h-8 w-8 text-muted-foreground" />;
              })()}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedFile(null)}
                aria-label="Remover arquivo"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Step: Category Selection */}
      {step === "category" && (
        <div className="space-y-3">
          <Label className="text-base font-medium">Em qual categoria se encaixa?</Label>
          <p className="text-sm text-muted-foreground">Selecione uma ou mais</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_OPTIONS.map(cat => (
              <button
                key={cat.value}
                type="button"
                onClick={() => toggleCategory(cat.value)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border-2 px-4 py-2 text-sm font-medium transition-all",
                  selectedCategories.includes(cat.value)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted hover:border-primary/50"
                )}
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
          {selectedCategories.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Selecionado: {selectedCategories.join(", ")}
            </p>
          )}
        </div>
      )}

      {/* Step: Details */}
      {step === "details" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nome do conteúdo"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="caption">Legenda (opcional)</Label>
            <Textarea
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Texto para acompanhar o material..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Será usada como legenda padrão para WhatsApp
            </p>
          </div>

          {/* Summary */}
          <div className="rounded-lg bg-muted/50 p-3 space-y-2">
            <p className="text-sm font-medium">Resumo:</p>
            <div className="flex flex-wrap gap-1">
              <Badge variant="secondary">
                {TYPE_OPTIONS.find(t => t.value === contentType)?.emoji}{" "}
                {TYPE_OPTIONS.find(t => t.value === contentType)?.label}
              </Badge>
              {selectedCategories.map(cat => {
                const catInfo = CATEGORY_OPTIONS.find(c => c.value === cat);
                return (
                  <Badge key={cat} variant="outline">
                    {catInfo?.emoji} {catInfo?.label}
                  </Badge>
                );
              })}
            </div>
            {selectedFile && (
              <p className="text-xs text-muted-foreground truncate">
                📎 {selectedFile.name}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Step: Uploading */}
      {step === "uploading" && (
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="font-medium">Enviando conteúdo...</p>
          <p className="text-sm text-muted-foreground">Aguarde um momento</p>
        </div>
      )}

      {/* Navigation */}
      {step !== "uploading" && (
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="ghost"
            onClick={goBack}
            disabled={step === "type" || (step === "file" && !!parentContentId)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          
          <Button
            onClick={goNext}
            disabled={!canProceed() || isUploading}
          >
            {step === "details" ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Enviar
              </>
            ) : (
              <>
                Continuar
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
