/**
 * VolunteerGuardLayout
 * 
 * Wraps all /voluntario/* routes. Redirects unapproved users to /aguardando-aprovacao.
 * Approved users see children via <Outlet />.
 */

import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useVolunteerStatus } from "@/hooks/useVolunteerStatus";
import { FullPageLoader } from "@/components/ui/LoadingSpinner";

export default function VolunteerGuardLayout() {
  const { user, loading: authLoading } = useAuth();
  const { volunteerStatus, isStatusLoading } = useVolunteerStatus();
  const navigate = useNavigate();

  const isLoading = authLoading || (!!user && isStatusLoading);

  useEffect(() => {
    if (isLoading) return;

    // Not logged in → auth
    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }

    // Not approved → aguardando
    if (volunteerStatus !== "ativo") {
      navigate("/aguardando-aprovacao", { replace: true });
    }
  }, [isLoading, user, volunteerStatus, navigate]);

  if (isLoading) {
    return <FullPageLoader text="Verificando acesso..." />;
  }

  // While redirecting, don't flash child content
  if (!user || volunteerStatus !== "ativo") {
    return <FullPageLoader text="Redirecionando..." />;
  }

  return <Outlet />;
}
