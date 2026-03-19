import { useNavigate } from "react-router-dom";
import { useRequireApproval } from "@/hooks/useRequireApproval";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/button";
import { FullPageLoader } from "@/components/ui/LoadingSpinner";
import { MyAllocationCard } from "@/components/territory/MyAllocationCard";
import { useCellAssignmentRequest } from "@/hooks/useCellAssignmentRequest";
import {
  ArrowLeft,
  MapPin,
  Home,
} from "lucide-react";

export default function VoluntarioTerritorio() {
  const navigate = useNavigate();
  const { isLoading: authLoading, hasAccess } = useRequireApproval();
  const { isLoading } = useCellAssignmentRequest();

  if (authLoading || isLoading) {
    return <FullPageLoader text="Carregando território..." />;
  }

  if (!hasAccess) {
    return <FullPageLoader />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background texture-concrete">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Logo size="sm" />
          </div>
          <Button variant="ghost" size="icon" onClick={() => navigate("/voluntario")}>
            <Home className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="flex-1 p-4 max-w-lg mx-auto w-full">
        <div className="space-y-6 animate-slide-up">
          {/* Title */}
          <div>
            <div className="flex items-center gap-2 text-primary mb-2">
              <MapPin className="h-5 w-5" />
              <span className="text-sm uppercase tracking-wider font-bold">Meu Território</span>
            </div>
            <h1 className="text-2xl font-bold">Onde você atua</h1>
          </div>

          {/* Main allocation card - handles all 3 states */}
          <MyAllocationCard />
        </div>
      </main>

      <p className="signature-luta text-center py-4 safe-bottom">
        #ÉLUTA — Territorializar para Vencer
      </p>
    </div>
  );
}
