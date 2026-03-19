import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { EyeOff, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MuralComentario } from "@/hooks/useMural";
import { cn } from "@/lib/utils";

interface MuralComentarioItemProps {
  comentario: MuralComentario;
  onHide?: () => void;
  canModerate?: boolean;
}

export function MuralComentarioItem({
  comentario,
  onHide,
  canModerate = false,
}: MuralComentarioItemProps) {
  const isHidden = comentario.status === "oculto";
  const autorNome = comentario.autor?.nickname || comentario.autor?.full_name || "Voluntário";
  
  const timeAgo = formatDistanceToNow(new Date(comentario.created_at), {
    addSuffix: true,
    locale: ptBR,
  });

  return (
    <div className={cn(
      "p-3 rounded-lg border bg-muted/30",
      isHidden && "opacity-60 border-destructive/30"
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{autorNome}</span>
          <span>•</span>
          <span>{timeAgo}</span>
          {isHidden && (
            <Badge variant="destructive" className="text-xs h-5">
              <EyeOff className="h-3 w-3 mr-1" />
              Oculto
            </Badge>
          )}
        </div>
        
        {canModerate && !isHidden && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onHide}
            className="h-6 text-xs text-destructive"
          >
            <EyeOff className="h-3 w-3" />
          </Button>
        )}
      </div>
      
      <p className="text-sm mt-2 whitespace-pre-wrap">
        {comentario.corpo_markdown}
      </p>
    </div>
  );
}
