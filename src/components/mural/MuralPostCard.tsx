import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { MessageSquare, Eye, EyeOff, Target, Calendar, ExternalLink, ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { SignalsBar } from "@/components/signals/SignalsBar";
import { ReportButton } from "@/components/signals/ReportButton";
import { TTSButton } from "@/components/a11y/TTSButton";
import {
  MuralPost,
  MuralPostTipo,
  MuralReacaoTipo,
  MURAL_TIPO_LABELS,
  MURAL_TIPO_COLORS,
  MURAL_REACAO_ICONS,
} from "@/hooks/useMural";
import { cn } from "@/lib/utils";

interface MuralPostCardProps {
  post: MuralPost;
  onToggleReacao?: (tipo: MuralReacaoTipo) => void;
  onHide?: () => void;
  onRestore?: () => void;
  canModerate?: boolean;
  showLink?: boolean;
  cellId?: string;
}

export function MuralPostCard({
  post,
  onToggleReacao,
  onHide,
  onRestore,
  canModerate = false,
  showLink = true,
  cellId,
}: MuralPostCardProps) {
  const isHidden = post.status === "oculto";
  const autorNome = post.autor?.nickname || post.autor?.full_name || "Voluntário";
  
  const timeAgo = formatDistanceToNow(new Date(post.created_at), {
    addSuffix: true,
    locale: ptBR,
  });

  const totalReacoes = post._count?.reacoes
    ? Object.values(post._count.reacoes).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <Card className={cn(
      "transition-all hover:shadow-md",
      isHidden && "opacity-60 border-destructive/30"
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge 
              variant="outline" 
              className={cn("text-xs", MURAL_TIPO_COLORS[post.tipo as MuralPostTipo])}
            >
              {MURAL_TIPO_LABELS[post.tipo as MuralPostTipo]}
            </Badge>

            {(post.tipo === "recibo_semana" || post.tipo === "recibo_atividade") && (
              <Badge variant="outline" className="text-xs text-muted-foreground border-border gap-1">
                <ClipboardList className="h-3 w-3" />
                {post.tipo === "recibo_semana" ? "Recibo de ciclo" : "Recibo de atividade"}
              </Badge>
            )}
            
            {isHidden && (
              <Badge variant="destructive" className="text-xs">
                <EyeOff className="h-3 w-3 mr-1" />
                Oculto
              </Badge>
            )}
            
            {post.mission_id && (
              <Badge variant="secondary" className="text-xs">
                <Target className="h-3 w-3 mr-1" />
                Missão
              </Badge>
            )}
            
            {post.atividade_id && (
              <Badge variant="secondary" className="text-xs">
                <Calendar className="h-3 w-3 mr-1" />
                Atividade
              </Badge>
            )}
          </div>
          
          {canModerate && (
            <div className="flex gap-1">
              {isHidden ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRestore}
                  className="h-7 text-xs"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Restaurar
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onHide}
                  className="h-7 text-xs text-destructive"
                >
                  <EyeOff className="h-3 w-3 mr-1" />
                  Ocultar
                </Button>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
          <span className="font-medium text-foreground">{autorNome}</span>
          <span>•</span>
          <span>{timeAgo}</span>
        </div>
      </CardHeader>
      
      <CardContent className="py-2">
        {post.titulo && (
          <h3 className="font-semibold mb-2">{post.titulo}</h3>
        )}
        <p className="text-sm text-muted-foreground line-clamp-4 whitespace-pre-wrap">
          {post.corpo_markdown}
        </p>
        
        {/* Linked items */}
        {(post.mission || post.atividade) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {post.mission && (
              <Link 
                to={`/voluntario/missao/${post.mission.id}`}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Target className="h-3 w-3" />
                {post.mission.title}
                <ExternalLink className="h-3 w-3" />
              </Link>
            )}
            {post.atividade && (
              <Link 
                to={`/voluntario/agenda/${post.atividade.id}`}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Calendar className="h-3 w-3" />
                {post.atividade.titulo}
                <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="pt-2 flex flex-wrap items-center justify-between gap-2">
        {/* Utility Signals */}
        <SignalsBar targetType="mural_post" targetId={post.id} size="sm" />
        
        {/* Comments count + Report + link */}
        <div className="flex items-center gap-2">
          <TTSButton 
            text={`${post.titulo || "Post"}. ${post.corpo_markdown}`}
            variant="iconOnly"
          />
          
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            {post._count?.comentarios ?? 0}
          </span>
          
          <ReportButton postId={post.id} size="sm" />
          
          {showLink && cellId && (
            <Link to={`/voluntario/celula/${cellId}/mural/${post.id}`}>
              <Button variant="ghost" size="sm" className="h-7 text-xs">
                Ver mais
              </Button>
            </Link>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
