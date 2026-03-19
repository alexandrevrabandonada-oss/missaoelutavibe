/**
 * InviteRequiredCard - Shown when signup requires an invite in pre-campaign mode
 */

import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Ticket, MessageCircle, LogIn } from "lucide-react";
import { INVITE_CONFIG } from "@/lib/inviteConfig";

interface InviteRequiredCardProps {
  onLoginClick?: () => void;
}

export function InviteRequiredCard({ onLoginClick }: InviteRequiredCardProps) {
  const navigate = useNavigate();

  const handleRequestInvite = () => {
    window.open(INVITE_CONFIG.getWhatsAppUrl(), "_blank");
  };

  const handleHaveInvite = () => {
    navigate("/aceitar-convite");
  };

  return (
    <Card className="w-full max-w-sm border-primary/20">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
          <Ticket className="h-8 w-8 text-primary" />
        </div>
        <Badge variant="outline" className="mx-auto mb-2 text-xs">
          Pré-Campanha
        </Badge>
        <CardTitle className="text-xl">Acesso por convite</CardTitle>
        <CardDescription className="text-sm">
          O Missão ÉLuta está em fase de pré-campanha. Peça um convite com a sua célula ou coordenação.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button 
          className="w-full btn-luta" 
          onClick={handleHaveInvite}
        >
          <Ticket className="h-4 w-4 mr-2" />
          Tenho um convite
        </Button>
        
        <Button 
          className="w-full" 
          variant="outline"
          onClick={handleRequestInvite}
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          Pedir convite
        </Button>

        {onLoginClick && (
          <div className="pt-2 border-t border-border">
            <Button 
              variant="ghost" 
              className="w-full text-muted-foreground"
              onClick={onLoginClick}
            >
              <LogIn className="h-4 w-4 mr-2" />
              Já tenho conta
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
