import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRoleInvites } from "@/hooks/useRoleInvites";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Shield, CheckCircle, XCircle, LogIn } from "lucide-react";

export default function AceitarConvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { acceptInvite, isAccepting } = useRoleInvites();
  const [status, setStatus] = useState<"pending" | "success" | "error">("pending");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    // If not logged in, redirect to auth with return URL
    if (!authLoading && !user) {
      const returnUrl = `/aceitar/${token}`;
      navigate(`/auth?redirect=${encodeURIComponent(returnUrl)}`);
      return;
    }

    // If logged in and token exists, try to accept
    if (user && token && status === "pending") {
      handleAccept();
    }
  }, [user, authLoading, token]);

  const handleAccept = async () => {
    if (!token) return;
    
    try {
      await acceptInvite(token);
      setStatus("success");
      // Redirect after 2 seconds
      setTimeout(() => {
        navigate("/voluntario/hoje");
      }, 2000);
    } catch (error: any) {
      setStatus("error");
      setErrorMessage(error.message || "Erro ao aceitar convite");
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
              <LogIn className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>Faça login para continuar</CardTitle>
            <CardDescription>
              Você precisa estar logado para aceitar este convite
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              onClick={() => navigate(`/auth?redirect=${encodeURIComponent(`/aceitar/${token}`)}`)}
            >
              Ir para Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {status === "pending" && (
            <>
              <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
                <Shield className="h-8 w-8 text-primary animate-pulse" />
              </div>
              <CardTitle>Aceitando Convite...</CardTitle>
              <CardDescription>
                Aguarde enquanto processamos seu convite
              </CardDescription>
            </>
          )}
          
          {status === "success" && (
            <>
              <div className="mx-auto mb-4 p-3 bg-green-500/10 rounded-full w-fit">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <CardTitle className="text-green-600">Convite Aceito!</CardTitle>
              <CardDescription>
                Seu novo papel foi ativado com sucesso. Redirecionando...
              </CardDescription>
            </>
          )}
          
          {status === "error" && (
            <>
              <div className="mx-auto mb-4 p-3 bg-destructive/10 rounded-full w-fit">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-destructive">Erro ao Aceitar</CardTitle>
              <CardDescription>
                {errorMessage}
              </CardDescription>
            </>
          )}
        </CardHeader>
        
        <CardContent>
          {status === "pending" && (
            <div className="flex justify-center">
              <LoadingSpinner />
            </div>
          )}
          
          {status === "error" && (
            <div className="space-y-3">
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => navigate("/voluntario/convites-papeis")}
              >
                Ver Meus Convites
              </Button>
              <Button 
                className="w-full" 
                variant="ghost"
                onClick={() => navigate("/voluntario/hoje")}
              >
                Voltar ao Início
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
