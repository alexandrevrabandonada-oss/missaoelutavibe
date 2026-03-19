import { useCallback, useState } from "react";
import { Upload, X, FileImage, FileVideo, FileText, FileAudio, File } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useContentUpload, ContentType } from "@/hooks/useContentUpload";

interface ContentUploadDropzoneProps {
  onUploadComplete?: () => void;
  defaultType?: ContentType;
  parentContentId?: string;
  className?: string;
}

type AssetKind = "image" | "video" | "audio" | "document" | "other";

function getIconForKind(kind: AssetKind) {
  switch (kind) {
    case "image":
      return FileImage;
    case "video":
      return FileVideo;
    case "audio":
      return FileAudio;
    case "document":
      return FileText;
    default:
      return File;
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

interface QueuedFile {
  file: File;
  id: string;
  status: "pending" | "uploading" | "done" | "error";
  progress: number;
}

export function ContentUploadDropzone({
  onUploadComplete,
  defaultType = "MATERIAL",
  parentContentId,
  className,
}: ContentUploadDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [contentType, setContentType] = useState<ContentType>(defaultType);
  const [tags, setTags] = useState<string>("");
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

  const processFiles = async (files: File[]) => {
    const newQueue: QueuedFile[] = files.map((file) => ({
      file,
      id: `${Date.now()}-${Math.random()}`,
      status: "pending" as const,
      progress: 0,
    }));

    setQueue((prev) => [...prev, ...newQueue]);
    const parsedTags = tags.split(",").map((t) => t.trim()).filter(Boolean);

    for (const item of newQueue) {
      setQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, status: "uploading" } : q))
      );

      try {
        await uploadAsync({
          file: item.file,
          type: contentType,
          tags: parsedTags,
          parentContentId,
        });
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id ? { ...q, status: "done", progress: 100 } : q
          )
        );
      } catch (error) {
        setQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, status: "error" } : q))
        );
      }
    }

    // Clear completed after delay
    setTimeout(() => {
      setQueue((prev) => prev.filter((q) => q.status !== "done"));
      onUploadComplete?.();
    }, 2000);
  };

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        await processFiles(files);
      }
    },
    [contentType, tags, parentContentId]
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      await processFiles(files);
    }
    e.target.value = "";
  };

  const removeFromQueue = (id: string) => {
    setQueue((prev) => prev.filter((q) => q.id !== id));
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Type and Tags Selection */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="content-type">Tipo de conteúdo</Label>
          <Select
            value={contentType}
            onValueChange={(v) => setContentType(v as ContentType)}
          >
            <SelectTrigger id="content-type">
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MATERIAL">📄 Material</SelectItem>
              <SelectItem value="SHAREPACK">📦 Sharepack</SelectItem>
              <SelectItem value="TEMPLATE">🎨 Template</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
          <Input
            id="tags"
            placeholder="ex: campanha, redes-sociais"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
        </div>
      </div>

      {/* Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-8 transition-colors",
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50",
          isUploading && "pointer-events-none opacity-50"
        )}
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Upload className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="text-lg font-medium">Arraste arquivos aqui</p>
          <p className="text-sm text-muted-foreground">
            ou clique para selecionar
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Cada arquivo criará um {contentType === "MATERIAL" ? "Material" : contentType === "SHAREPACK" ? "Sharepack" : "Template"} em rascunho
          </p>
        </div>
        <input
          type="file"
          multiple
          onChange={handleFileSelect}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label="Selecionar arquivos para upload"
        />
      </div>

      {/* Upload Queue */}
      {queue.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            Enviando {queue.length} arquivo(s)...
          </p>
          {queue.map((item) => {
            const kind = getKindFromMime(item.file.type);
            const Icon = getIconForKind(kind);

            return (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-lg border bg-card p-3"
              >
                <Icon className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.file.name}</p>
                  {item.status === "uploading" && (
                    <Progress value={50} className="mt-1 h-1" />
                  )}
                  {item.status === "done" && (
                    <p className="text-xs text-green-600">Concluído</p>
                  )}
                  {item.status === "error" && (
                    <p className="text-xs text-destructive">Erro no upload</p>
                  )}
                </div>
                {item.status !== "uploading" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => removeFromQueue(item.id)}
                    aria-label="Remover da fila"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
