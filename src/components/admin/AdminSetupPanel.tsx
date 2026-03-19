import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminBootstrap } from "@/hooks/useAdminBootstrap";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield, ShieldCheck, AlertTriangle, Copy, Check } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export default function AdminSetupPanel() {
  const navigate = useNavigate();
  const {
    adminCount,
    isAdmin,
    canBootstrap,
    needsBootstrap,
    isLoading,
    bootstrap,
    isBootstrapping,
    user,
  } = useAdminBootstrap();

  const [copied, setCopied] = useState(false);

  const handleCopyUID = () => {
    if (user?.id) {
      navigator.clipboard.writeText(user.id);
      setCopied(true);
      toast.success("UID copiado!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleBootstrap = () => {
    bootstrap(undefined, {
      onSuccess: () => {
        // Wait a bit then redirect
        setTimeout(() => {
          navigate("/admin");
        }, 1500);
      },
    });
  };

  if (isLoading) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Already has admin configured and current user is admin
  if (!needsBootstrap && isAdmin) {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Sistema Configurado</CardTitle>
          </div>
          <CardDescription>
            Você é um Admin Master com poderes totais.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge variant="outline" className="font-mono text-xs">
              {user?.email}
            </Badge>
            <Badge variant="secondary" className="font-mono text-xs">
              {adminCount} admin{adminCount !== 1 ? "s" : ""} configurado{adminCount !== 1 ? "s" : ""}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Has admin configured but current user is NOT admin
  if (!needsBootstrap && !isAdmin) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <CardTitle className="text-lg">Acesso Restrito</CardTitle>
          </div>
          <CardDescription>
            O sistema já possui administradores configurados. 
            Você não tem permissão de admin.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge variant="outline" className="font-mono text-xs">
              {user?.email}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Peça a um admin existente para te adicionar como administrador.
          </p>
        </CardContent>
      </Card>
    );
  }

  // No admin configured - show bootstrap option
  return (
    <Card className="border-primary/50 bg-primary/10">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Configuração Inicial</CardTitle>
        </div>
        <CardDescription>
          Nenhum administrador configurado. Você pode se tornar o Admin Master.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* User info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Email:</span>
            <Badge variant="outline" className="font-mono text-xs">
              {user?.email || "N/A"}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">UID:</span>
            <Badge variant="secondary" className="font-mono text-xs max-w-[200px] truncate">
              {user?.id || "N/A"}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleCopyUID}
              disabled={!user?.id}
            >
              {copied ? (
                <Check className="h-3 w-3 text-primary" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2 p-2 rounded bg-background/50">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-medium">
            Nenhum admin configurado no sistema
          </span>
        </div>

        {/* Bootstrap button with confirmation */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              className="w-full" 
              disabled={!canBootstrap || isBootstrapping}
            >
              {isBootstrapping ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Ativando...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Ativar Admin Master
                </>
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Confirmar Ativação de Admin Master
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <p>
                  Você está prestes a se tornar o <strong>Admin Master</strong> do sistema.
                </p>
                <div className="bg-muted p-3 rounded-md text-sm space-y-2">
                  <p className="font-medium">Isso concederá poderes totais:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Gerenciar todos os voluntários</li>
                    <li>Aprovar e recusar cadastros</li>
                    <li>Criar e editar missões</li>
                    <li>Adicionar outros administradores</li>
                    <li>Acesso total ao sistema</li>
                  </ul>
                </div>
                <p className="text-amber-600 dark:text-amber-400 font-medium">
                  Esta ação não pode ser desfeita facilmente.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleBootstrap} disabled={isBootstrapping}>
                {isBootstrapping ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Ativando...
                  </>
                ) : (
                  "Confirmar Ativação"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
