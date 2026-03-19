/**
 * UserScopeBadge - Displays user's current role and scope
 */

import { Shield, MapPin, Building, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useScopedRoles, type UserScope } from "@/hooks/useScopedRoles";

interface Props {
  scope?: UserScope;
  variant?: "default" | "compact";
  className?: string;
}

export function UserScopeBadge({ scope: propScope, variant = "default", className = "" }: Props) {
  const { scope: hookScope, isLoadingScope } = useScopedRoles();
  const scope = propScope || hookScope;

  if (isLoadingScope && !propScope) {
    return null;
  }

  const getScopeIcon = () => {
    switch (scope.scope_type) {
      case "global":
        return <Shield className="h-4 w-4" />;
      case "estado":
      case "regional":
        return <Building className="h-4 w-4" />;
      case "cidade":
        return <MapPin className="h-4 w-4" />;
      case "celula":
        return <Users className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const getScopeColor = () => {
    switch (scope.role) {
      case "admin":
        return "bg-red-500/10 text-red-600 border-red-500/30";
      case "coordenador_estadual":
        return "bg-purple-500/10 text-purple-600 border-purple-500/30";
      case "coordenador_regional":
        return "bg-blue-500/10 text-blue-600 border-blue-500/30";
      case "coordenador_municipal":
        return "bg-cyan-500/10 text-cyan-600 border-cyan-500/30";
      case "coordenador_celula":
        return "bg-green-500/10 text-green-600 border-green-500/30";
      case "moderador_celula":
        return "bg-yellow-500/10 text-yellow-600 border-yellow-500/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (variant === "compact") {
    return (
      <Badge variant="outline" className={`${getScopeColor()} ${className}`}>
        {getScopeIcon()}
        <span className="ml-1">{scope.scope_label}</span>
      </Badge>
    );
  }

  return (
    <div className={`bg-primary/5 border border-primary/20 rounded-lg p-3 ${className}`}>
      <div className="flex items-center gap-2 text-primary">
        {getScopeIcon()}
        <span className="text-sm font-medium">Você está operando como:</span>
        <Badge variant="outline" className={getScopeColor()}>
          {scope.scope_label}
        </Badge>
      </div>
      {scope.scope_city && (
        <p className="text-xs text-muted-foreground mt-1 ml-6">
          Escopo: {scope.scope_city}
          {scope.scope_state && ` (${scope.scope_state})`}
        </p>
      )}
    </div>
  );
}
