import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useVolunteerStatus } from "./useVolunteerStatus";
import { useUserRoles } from "./useUserRoles";

interface RequireApprovalOptions {
  /** Redirect path for pending users. Defaults to /aguardando-aprovacao */
  pendingRedirect?: string;
  /** Require admin/coordinator role */
  requireAdmin?: boolean;
  /** Redirect path for non-admins. Defaults to /voluntario/ajuda */
  adminRedirect?: string;
}

/**
 * Hook to guard routes against pending users.
 * 
 * - PENDENTE users can only access /voluntario/ajuda
 * - All other routes should redirect to /voluntario/ajuda
 * - Admin routes require coordinator role
 * 
 * @returns Object with loading state and permission flags
 */
export function useRequireApproval(options: RequireApprovalOptions = {}) {
  const { 
    pendingRedirect = "/aguardando-aprovacao",
    requireAdmin = false,
    adminRedirect = "/voluntario/ajuda"
  } = options;
  
  const navigate = useNavigate();
  const { isPending, isRejected, isApproved, isStatusLoading } = useVolunteerStatus();
  const { isCoordinator, isLoading: rolesLoading } = useUserRoles();

  const isLoading = isStatusLoading || rolesLoading;
  const isAdmin = isCoordinator();
  
  // Check if user should have access
  const hasAccess = isApproved && (!requireAdmin || isAdmin);
  
  // Redirect pending/rejected users to help page
  useEffect(() => {
    if (isLoading) return;
    
    // Pending or rejected users go to help page
    if (isPending || isRejected) {
      navigate(pendingRedirect, { replace: true });
      return;
    }
    
    // If admin is required but user is not admin
    if (requireAdmin && !isAdmin && isApproved) {
      navigate(adminRedirect, { replace: true });
    }
  }, [isPending, isRejected, isApproved, isAdmin, isLoading, requireAdmin, navigate, pendingRedirect, adminRedirect]);

  return {
    isLoading,
    isPending,
    isRejected,
    isApproved,
    isAdmin,
    hasAccess,
  };
}

/**
 * Hook specifically for pending users to check their status.
 * Used on the /voluntario/ajuda page to show appropriate UI.
 */
export function usePendingStatus() {
  const { isPending, isRejected, isApproved, isStatusLoading, rejectionReason } = useVolunteerStatus();
  const { isCoordinator, isLoading: rolesLoading } = useUserRoles();
  
  return {
    isLoading: isStatusLoading || rolesLoading,
    isPending,
    isRejected,
    isApproved,
    isAdmin: isCoordinator(),
    rejectionReason,
    // Simplified status label
    statusLabel: isPending 
      ? "Aguardando aprovação" 
      : isRejected 
        ? "Cadastro não aprovado" 
        : isApproved 
          ? "Aprovado" 
          : "Desconhecido",
  };
}
