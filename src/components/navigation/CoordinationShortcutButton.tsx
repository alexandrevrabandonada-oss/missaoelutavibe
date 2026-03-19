/**
 * CoordinationShortcutButton - Visible menu item for coordinators/admins to reach /coordenador/hoje
 * 
 * Displayed in navigation areas (like AppShell or volunteer pages) when the user
 * has a coordinator or admin role. Provides quick access to the canonical
 * coordination entry point.
 */

import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Target } from "lucide-react";
import { useUserRoles } from "@/hooks/useUserRoles";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface CoordinationShortcutButtonProps {
  variant?: "icon" | "full";
  className?: string;
}

export function CoordinationShortcutButton({ 
  variant = "icon",
  className = "" 
}: CoordinationShortcutButtonProps) {
  const navigate = useNavigate();
  const { isCoordinator, isLoading } = useUserRoles();

  // Only show for coordinators/admins
  if (isLoading || !isCoordinator()) {
    return null;
  }

  if (variant === "full") {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate("/coordenador/hoje")}
        className={className}
      >
        <Target className="h-4 w-4 mr-2" />
        Coordenação
      </Button>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/coordenador/hoje")}
          className={`text-primary hover:bg-primary/10 ${className}`}
          aria-label="Ir para Coordenação"
        >
          <Target className="h-5 w-5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Coordenação</p>
      </TooltipContent>
    </Tooltip>
  );
}
