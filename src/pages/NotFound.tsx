/**
 * NotFound - 404 page with friendly UI
 * 
 * Shows a clear CTA to return to Hoje (home for volunteers).
 */

import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/Logo";
import { Home, ArrowLeft, AlertTriangle } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-background texture-concrete">
      {/* Header */}
      <header className="p-4 flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate(-1)}
          aria-label="Voltar"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Logo size="sm" />
      </header>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-sm space-y-6 animate-slide-up">
          {/* Icon */}
          <div className="h-20 w-20 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>

          {/* Title */}
          <div>
            <h1 className="text-4xl font-bold mb-2">404</h1>
            <p className="text-xl text-muted-foreground">Página não encontrada</p>
          </div>

          {/* Description */}
          <p className="text-muted-foreground">
            A página que você tentou acessar não existe ou foi movida.
            Use o menu de navegação ou volte para a página inicial.
          </p>

          {/* CTA */}
          <div className="space-y-3">
            <Button 
              onClick={() => navigate("/voluntario/hoje")} 
              className="w-full"
              size="lg"
            >
              <Home className="h-5 w-5 mr-2" />
              Voltar para Hoje
            </Button>

            <Button 
              variant="outline" 
              onClick={() => navigate(-1)} 
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para a página anterior
            </Button>
          </div>
        </div>
      </div>

      {/* Signature */}
      <footer className="p-4 text-center">
        <p className="signature-luta">#ÉLUTA — Escutar • Cuidar • Organizar</p>
      </footer>
    </div>
  );
};

export default NotFound;
