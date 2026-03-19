import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import AdminSetupPanel from "@/components/admin/AdminSetupPanel";

export default function AdminSetup() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-background texture-concrete">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border p-4">
        <div className="flex items-center justify-between">
          <Logo size="sm" />
          <Button variant="ghost" size="icon" onClick={() => navigate("/missao")}>
            <Home className="h-5 w-5" />
          </Button>
        </div>
      </header>
      <main className="flex-1 p-4 max-w-md mx-auto w-full">
        <div className="space-y-6 animate-slide-up">
          <div>
            <h1 className="text-2xl font-bold">Configuração de Admin</h1>
            <p className="text-muted-foreground">
              Configure ou visualize o status de administrador do sistema.
            </p>
          </div>
          <AdminSetupPanel />
        </div>
      </main>
      <p className="signature-luta text-center py-4 safe-bottom">
        #ÉLUTA — Escutar • Cuidar • Organizar
      </p>
    </div>
  );
}
