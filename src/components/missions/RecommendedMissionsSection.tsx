import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Clock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

type Mission = Tables<"missions">;

interface ScoredMission {
  mission: Mission;
  score: number;
  debugInfo?: {
    tagOverlap: number;
    typeBonus: number;
    timeBonus: number;
    penalties: number;
  };
}

interface RecommendedMissionsSectionProps {
  recommendations: ScoredMission[];
  showDebug?: boolean;
}

const missionTypeLabels: Record<string, string> = {
  escuta: "Escuta",
  rua: "Rua",
  mobilizacao: "Mobilização",
  conteudo: "Conteúdo",
  dados: "Dados",
  formacao: "Formação",
  conversa: "Conversa",
  crm: "CRM",
  geral: "Geral",
};

export function RecommendedMissionsSection({ 
  recommendations, 
  showDebug = false 
}: RecommendedMissionsSectionProps) {
  const navigate = useNavigate();

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold">Pra você hoje</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        com base no seu perfil e no que você tem feito
      </p>
      
      <div className="space-y-3">
        {recommendations.map(({ mission, score, debugInfo }) => {
          const metaJson = mission.meta_json as { estimated_min?: number; tags?: string[] } | null;
          
          return (
            <button
              key={mission.id}
              onClick={() => navigate(`/voluntario/missao/${mission.id}`)}
              className="card-luta w-full text-left hover:bg-secondary/80 transition-colors relative"
            >
              {/* Recommended badge */}
              <div className="absolute -top-2 -right-2">
                <Badge className="bg-primary text-primary-foreground text-xs px-2 py-0.5">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Recomendado
                </Badge>
              </div>
              
              <div className="flex items-start justify-between gap-3 pt-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm line-clamp-1">{mission.title}</h3>
                  {mission.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {mission.description}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      {missionTypeLabels[mission.type] || mission.type}
                    </Badge>
                    
                    {metaJson?.estimated_min && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        ~{metaJson.estimated_min}min
                      </span>
                    )}
                    
                    {mission.points && (
                      <span className="text-xs text-primary font-bold">
                        +{mission.points} pts
                      </span>
                    )}
                    
                    {/* Debug info */}
                    {showDebug && debugInfo && (
                      <span className="text-xs text-muted-foreground ml-2 font-mono">
                        [score:{score} tags:{debugInfo.tagOverlap} type:{debugInfo.typeBonus}]
                      </span>
                    )}
                  </div>
                  
                  {/* Show tags if present */}
                  {showDebug && metaJson?.tags && metaJson.tags.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {metaJson.tags.slice(0, 4).map(tag => (
                        <span key={tag} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                
                <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
