/**
 * AdminShortcutButton - Atalho para admin/coordenador voltar ao painel
 * 
 * Só exibe para usuários com papel de coordenador/admin.
 * Posição: canto superior direito nas páginas de voluntário.
 */

import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";
import { useUserRoles } from "@/hooks/useUserRoles";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function AdminShortcutButton() {
  const navigate = useNavigate();
  const { isCoordinator, isLoading } = useUserRoles();

  // Only show for coordinators/admins
  if (isLoading || !isCoordinator()) {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/admin")}
          className="text-primary hover:bg-primary/10"
          aria-label="Ir para painel administrativo"
        >
          <Shield className="h-5 w-5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Painel Admin</p>
      </TooltipContent>
    </Tooltip>
  );
}
