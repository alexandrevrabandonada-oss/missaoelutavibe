/**
 * CellPlaybookCompact - Shows cell playbook with 3 quick actions
 * 
 * Renders in the allocated state of MyAllocationCard
 */

import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  type CellPlaybook, 
  FALLBACK_PLAYBOOK,
  getDefaultPlaybook,
} from "@/lib/cellPlaybook";
import {
  Target,
  Users,
  UserPlus,
  ArrowRight,
  Sparkles,
} from "lucide-react";

interface CellPlaybookCompactProps {
  cellName: string;
  cellId?: string;
  playbook?: CellPlaybook | null;
}

// Map route patterns to icons
function getActionIcon(route: string) {
  if (route.includes("missao") || route.includes("missoes")) return Target;
  if (route.includes("mural")) return Users;
  if (route.includes("convite")) return UserPlus;
  return ArrowRight;
}

export function CellPlaybookCompact({ cellName, cellId, playbook }: CellPlaybookCompactProps) {
  // Try to get playbook from props, then default, then fallback
  const effectivePlaybook = playbook || getDefaultPlaybook(cellName) || FALLBACK_PLAYBOOK;

  // Resolve routes — replace "/voluntario/mural" with cell-scoped mural tab
  const resolveRoute = (route: string) => {
    if (route === "/voluntario/mural" && cellId) {
      return `/voluntario/celula/${cellId}?tab=mural`;
    }
    return route;
  };
  
  // Log warning if using fallback
  if (!playbook && !getDefaultPlaybook(cellName)) {
    console.warn(`[CellPlaybook] No playbook found for cell "${cellName}", using fallback`);
  }

  return (
    <div className="space-y-3 pt-2">
      {/* Headline */}
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-primary">
          {effectivePlaybook.headline}
        </span>
      </div>

      {/* What we do - collapsed */}
      <p className="text-xs text-muted-foreground line-clamp-2">
        {effectivePlaybook.whatWeDo}
      </p>

      {/* Next 3 Actions */}
      <div className="space-y-2">
        <Badge variant="outline" className="text-xs">
          Próximas 3 ações
        </Badge>
        
        <div className="grid gap-2">
          {effectivePlaybook.nextActions.slice(0, 3).map((action, index) => {
            const Icon = getActionIcon(action.ctaRoute);
            return (
              <Button
                key={index}
                variant="outline"
                size="sm"
                asChild
                className="justify-start h-auto py-2 px-3"
              >
                <Link to={resolveRoute(action.ctaRoute)}>
                  <Icon className="h-4 w-4 mr-2 text-primary shrink-0" />
                  <div className="text-left min-w-0">
                    <p className="font-medium text-sm truncate">{action.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {action.description}
                    </p>
                  </div>
                </Link>
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
