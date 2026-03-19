import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SignalsBar } from "@/components/signals/SignalsBar";
import { TTSButton } from "@/components/a11y/TTSButton";
import { isReplicableMission } from "@/hooks/useReplicacao";
import { 
  Megaphone, 
  MapPin, 
  Users, 
  FileText, 
  Database, 
  GraduationCap,
  Clock,
  CheckCircle2,
  Send,
  Copy
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Mission = Tables<"missions">;

interface MissionCardProps {
  mission: Mission;
  onAction?: () => void;
  actionLabel?: string;
  showStatus?: boolean;
  showSignals?: boolean;
}

const missionTypeConfig: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  escuta: { icon: Megaphone, label: "Escuta", color: "bg-blue-500/20 text-blue-400" },
  rua: { icon: MapPin, label: "Rua", color: "bg-green-500/20 text-green-400" },
  mobilizacao: { icon: Users, label: "Mobilização", color: "bg-purple-500/20 text-purple-400" },
  conteudo: { icon: FileText, label: "Conteúdo", color: "bg-pink-500/20 text-pink-400" },
  dados: { icon: Database, label: "Dados", color: "bg-cyan-500/20 text-cyan-400" },
  formacao: { icon: GraduationCap, label: "Formação", color: "bg-orange-500/20 text-orange-400" },
  conversa: { icon: Users, label: "Conversa", color: "bg-orange-500/20 text-orange-400" },
  crm: { icon: Users, label: "CRM", color: "bg-indigo-500/20 text-indigo-400" },
  geral: { icon: FileText, label: "Geral", color: "bg-gray-500/20 text-gray-400" },
};

const defaultTypeConfig = { icon: FileText, label: "Missão", color: "bg-muted text-muted-foreground" };

const statusConfig = {
  rascunho: { label: "Rascunho", color: "bg-muted text-muted-foreground" },
  publicada: { label: "Nova!", color: "bg-primary/20 text-primary" },
  em_andamento: { label: "Em andamento", color: "bg-blue-500/20 text-blue-400" },
  enviada: { label: "Aguardando validação", color: "bg-yellow-500/20 text-yellow-400" },
  validada: { label: "Validada", color: "bg-green-500/20 text-green-400" },
  reprovada: { label: "Revisar", color: "bg-destructive/20 text-destructive" },
  concluida: { label: "Concluída", color: "bg-green-500/20 text-green-400" },
};

export function MissionCard({ mission, onAction, actionLabel, showStatus = true, showSignals = false }: MissionCardProps) {
  const typeConfig = missionTypeConfig[mission.type] || defaultTypeConfig;
  const TypeIcon = typeConfig.icon;
  const status = statusConfig[mission.status];
  const isPrivate = mission.privado || mission.type === "conversa";
  const isReplicavel = isReplicableMission(mission.meta_json);

  return (
    <div className="card-luta animate-in-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className={cn("p-2 rounded-lg", typeConfig.color)}>
            <TypeIcon className="h-5 w-5" />
          </div>
          <Badge variant="outline" className={typeConfig.color}>
            {typeConfig.label}
          </Badge>
          {isReplicavel && (
            <Badge variant="default" className="bg-primary/80 text-primary-foreground">
              <Copy className="h-3 w-3 mr-1" />
              REPLICÁVEL
            </Badge>
          )}
        </div>
        
        {showStatus && (
          <Badge variant="outline" className={status.color}>
            {status.label}
          </Badge>
        )}
      </div>

      {/* Content */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-xl font-bold normal-case">{mission.title}</h3>
        <TTSButton 
          text={`${mission.title}. ${mission.description || ""}`}
          variant="iconOnly"
        />
      </div>
      {mission.description && (
        <p className="text-muted-foreground mb-2 text-sm leading-relaxed">
          {mission.description}
        </p>
      )}

      {/* Por que importa - brief highlight */}
      {mission.porque_importa && (
        <p className="text-xs text-primary/80 italic mb-4 line-clamp-1">
          💡 {mission.porque_importa}
        </p>
      )}

      {/* Instructions */}
      {mission.instructions && (
        <div className="bg-secondary/50 rounded-lg p-4 mb-4">
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
            Instruções
          </h4>
          <p className="text-sm whitespace-pre-line">{mission.instructions}</p>
        </div>
      )}

      {/* Signals - only for public missions */}
      {showSignals && !isPrivate && (
        <div className="mb-4">
          <SignalsBar targetType="mission" targetId={mission.id} size="sm" />
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        {mission.deadline && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Prazo: {new Date(mission.deadline).toLocaleDateString("pt-BR")}</span>
          </div>
        )}
        
        {onAction && (
          <Button onClick={onAction} className="btn-luta ml-auto">
            {mission.status === "publicada" || mission.status === "em_andamento" ? (
              <>
                <Send className="h-4 w-4 mr-2" />
                {actionLabel || "Enviar Evidência"}
              </>
            ) : mission.status === "validada" || mission.status === "concluida" ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {actionLabel || "Ver Detalhes"}
              </>
            ) : (
              actionLabel || "Ação"
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
