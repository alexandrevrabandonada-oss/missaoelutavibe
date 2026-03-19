import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/ui/Logo";
import { toast } from "sonner";
import { Eye, EyeOff, CheckCircle } from "lucide-react";

export default function RedefinirSenha() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    // Check if we have a valid session from the reset link
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSessionReady(true);
      } else {
        // Listen for auth state change (user clicking reset link)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === "PASSWORD_RECOVERY" && session) {
            setSessionReady(true);
          }
        });
        
        return () => subscription.unsubscribe();
      }
    };
    
    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    
    if (password.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres");
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) throw error;
      
      setSuccess(true);
      toast.success("Senha alterada com sucesso!");
      
      // Redirect after a short delay
      setTimeout(() => {
        navigate("/auth", { replace: true });
      }, 2000);
    } catch (error: any) {
      toast.error(error.message || "Erro ao alterar senha");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background texture-concrete">
        <div className="w-full max-w-sm space-y-8 animate-slide-up text-center">
          <Logo size="lg" />
          <div className="flex flex-col items-center gap-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
            <h2 className="text-xl font-semibold">Senha alterada!</h2>
            <p className="text-sm text-muted-foreground">
              Redirecionando para o login...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!sessionReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background texture-concrete">
        <div className="w-full max-w-sm space-y-8 animate-slide-up text-center">
          <Logo size="lg" />
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Link inválido ou expirado</h2>
            <p className="text-sm text-muted-foreground">
              O link de recuperação pode ter expirado. Solicite um novo link.
            </p>
            <Button 
              onClick={() => navigate("/auth")}
              className="btn-luta w-full"
            >
              Voltar ao login
            </Button>
          </div>
        </div>
        <p className="signature-luta mt-12">#ÉLUTA</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background texture-concrete">
      <div className="w-full max-w-sm space-y-8 animate-slide-up">
        <Logo size="lg" />
        
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold">Nova senha</h2>
          <p className="text-sm text-muted-foreground">
            Digite sua nova senha abaixo.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Nova senha</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="bg-secondary border-border pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar senha</Label>
            <Input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="bg-secondary border-border"
            />
          </div>

          <Button type="submit" className="btn-luta w-full" disabled={loading}>
            {loading ? "Salvando..." : "Salvar nova senha"}
          </Button>
        </form>
      </div>

      <p className="signature-luta mt-12">#ÉLUTA — Escutar • Cuidar • Organizar</p>
    </div>
  );
}
