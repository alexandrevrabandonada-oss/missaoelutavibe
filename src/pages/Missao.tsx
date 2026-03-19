import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMissions } from "@/hooks/useMissions";
import { useProfile } from "@/hooks/useProfile";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useFirstMission } from "@/hooks/useFirstMission";
import { useVolunteerStatus } from "@/hooks/useVolunteerStatus";
import { Logo } from "@/components/ui/Logo";
import { MissionCard } from "@/components/ui/MissionCard";
import { FullPageLoader } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { LogOut, Rocket, Settings } from "lucide-react";

export default function Missao() {
  const navigate = useNavigate();

  // Redirect to voluntario area (this page is deprecated in favor of /voluntario)
  useEffect(() => {
    navigate("/voluntario", { replace: true });
  }, [navigate]);

  return <FullPageLoader text="Redirecionando..." />;
}
