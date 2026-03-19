import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRoleInvites, ROLE_LABELS } from "@/hooks/useRoleInvites";
import { Shield, Clock, CheckCircle, User, MapPin } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function VoluntarioConvitesPapeis() {
  const { myPendingInvites, isMyInvitesLoading, acceptInvite, isAccepting } = useRoleInvites();
  const [acceptingInvite, setAcceptingInvite] = useState<string | null>(null);

  const handleAccept = async () => {
    if (!acceptingInvite) return;
    const invite = myPendingInvites.find(i => i.id === acceptingInvite);
    if (!invite?.token) return;
    
    try {
      await acceptInvite(invite.token);
      setAcceptingInvite(null);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const getScopeLabel = (scopeTipo: string) => {
    switch (scopeTipo) {
      case "celula": return "Célula";
      case "cidade": return "Cidade";
      case "estado": return "Estado";
      default: return scopeTipo;
    }
  };

  return (
    <AppShell>
      <div className="p-4 pb-20 space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Convites de Papel
          </h1>
          <p className="text-muted-foreground">
            Aceite convites para assumir novos papéis no movimento
          </p>
        </div>

        {/* Pending Invites */}
        {isMyInvitesLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Carregando convites...
          </div>
        ) : myPendingInvites.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-muted-foreground">
                Você não tem convites pendentes no momento.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Quando alguém convidar você para um papel, aparecerá aqui.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {myPendingInvites.map((invite) => (
              <Card key={invite.id} className="border-primary/20">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {invite.role_label || ROLE_LABELS[invite.role_key] || invite.role_key}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        {getScopeLabel(invite.scope_tipo)}: {invite.scope_name || invite.scope_id}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                      <Clock className="h-3 w-3 mr-1" />
                      Pendente
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>Convidado por: {invite.created_by_name || "Coordenação"}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>
                      Expira {formatDistanceToNow(new Date(invite.expires_at), { 
                        addSuffix: true, 
                        locale: ptBR 
                      })}
                    </span>
                  </div>

                  <div className="pt-2">
                    <Button 
                      className="w-full" 
                      onClick={() => setAcceptingInvite(invite.id)}
                      disabled={isAccepting}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Aceitar Convite
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Confirmation Dialog */}
        <AlertDialog open={!!acceptingInvite} onOpenChange={() => setAcceptingInvite(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Aceitar Convite?</AlertDialogTitle>
              <AlertDialogDescription>
                Ao aceitar, você assumirá este novo papel e suas responsabilidades. 
                Você pode continuar usando o app normalmente após aceitar.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleAccept} disabled={isAccepting}>
                {isAccepting ? "Aceitando..." : "Confirmar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Info */}
        <Card className="bg-muted/30">
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">
              <strong>Sobre os papéis:</strong> Cada papel vem com responsabilidades específicas 
              para ajudar a organizar o movimento. Ao aceitar, você terá acesso a novas 
              funcionalidades e áreas do aplicativo.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
