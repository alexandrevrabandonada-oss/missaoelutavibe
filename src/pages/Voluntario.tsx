/**
 * Voluntario - Main volunteer home
 * 
 * Simplified: redirects to /voluntario/hoje with bottom nav bar.
 * Guards: redirects to /voluntario/primeiros-passos if city_id is not set.
 */

import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useProfile } from "@/hooks/useProfile";
import { useRequireApproval } from "@/hooks/useRequireApproval";
import { FullPageLoader } from "@/components/ui/LoadingSpinner";

export default function Voluntario() {
  const { profile, isLoading: profileLoading } = useProfile();
  const { isLoading, hasAccess, isApproved } = useRequireApproval();
  const navigate = useNavigate();

  useEffect(() => {
    // Wait for loading to complete
    if (isLoading || profileLoading) return;

    // If not approved, the guard in useRequireApproval handles redirect
    if (!hasAccess || !isApproved) return;

    // Guard: If city_id is not set, redirect to onboarding wizard
    if (isApproved && profile && !profile.city_id) {
      navigate("/voluntario/primeiros-passos", { replace: true });
      return;
    }

    // If onboarding is not complete (old flow), also redirect
    if (isApproved && profile && profile.onboarding_status !== "concluido") {
      navigate("/voluntario/primeiros-passos", { replace: true });
      return;
    }
    
    // After checks pass, redirect to /voluntario/hoje
    if (hasAccess && isApproved && profile?.city_id) {
      navigate("/voluntario/hoje", { replace: true });
    }
  }, [profile, isApproved, isLoading, profileLoading, hasAccess, navigate]);

  if (isLoading || profileLoading) {
    return <FullPageLoader />;
  }

  if (!hasAccess) {
    return <FullPageLoader />;
  }

  // While redirecting, show loader
  return <FullPageLoader />;
}
