/**
 * CoordGuardLayout - Route guard for admin/coordinator areas
 * 
 * Redirects non-coordinator/admin users to /voluntario/hoje.
 * Prevents volunteers from ever landing on technical/admin screens.
 */

import { Navigate, Outlet } from "react-router-dom";
import { useUserRoles } from "@/hooks/useUserRoles";
import { FullPageLoader } from "@/components/ui/LoadingSpinner";

export default function CoordGuardLayout() {
  const { isCoordinator, isAdmin, isLoading } = useUserRoles();

  if (isLoading) {
    return <FullPageLoader text="Verificando acesso..." />;
  }

  if (!isCoordinator() && !isAdmin()) {
    return <Navigate to="/voluntario/hoje" replace />;
  }

  return <Outlet />;
}
