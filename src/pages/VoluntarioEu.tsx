/**
 * VoluntarioEu - Hub page for personal/profile resources
 * 
 * Max 6 links to existing routes.
 */

import { useEffect } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { VoluntarioNavBar } from "@/components/navigation/VoluntarioNavBar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavTracking } from "@/hooks/useNavTracking";
import { useTickets } from "@/hooks/useTickets";
import { useUnreadAnunciosCount } from "@/hooks/useAnuncios";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Inbox,
  Megaphone,
  Calendar,
  Link2,
  Send,
  User,
  ArrowRight,
  Crown,
  TrendingUp,
  Copy,
  Hash,
} from "lucide-react";

export default function VoluntarioEu() {
  const { trackNavClick, trackHubOpened } = useNavTracking();
  const { openCount: openTickets } = useTickets();
  const { unreadCount: unreadAnuncios } = useUnreadAnunciosCount();
  const { profile } = useProfile();
  const { user } = useAuth();

  // User code for coordination (V#XXXXXX format)
  const userCode = user?.id ? `V#${user.id.substring(0, 6).toUpperCase()}` : null;

  // Copy user ID to clipboard
  const copyUserId = () => {
    if (user?.id) {
      navigator.clipboard.writeText(user.id);
      toast.success("UUID copiado para a área de transferência!");
    }
  };

  // Track hub opened on mount
  useEffect(() => {
    trackHubOpened({ hub: "eu" });
  }, [trackHubOpened]);

  const handleLinkClick = (id: string) => {
    trackNavClick({ role: "voluntario", item: id, section: "eu" });
  };

  const EU_LINKS = [
    {
      id: "impacto",
      title: "Meu Impacto",
      description: "Suas métricas e progresso semanal",
      icon: TrendingUp,
      path: "/voluntario/impacto",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      id: "inbox",
      title: "Inbox",
      description: "Mensagens e tickets",
      icon: Inbox,
      path: "/voluntario/inbox",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      count: openTickets,
    },
    {
      id: "anuncios",
      title: "Anúncios",
      description: "Comunicados e novidades",
      icon: Megaphone,
      path: "/voluntario/anuncios",
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
      count: unreadAnuncios,
    },
    {
      id: "agenda",
      title: "Agenda",
      description: "Atividades e eventos",
      icon: Calendar,
      path: "/voluntario/agenda",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      id: "convite",
      title: "Meu Convite",
      description: "Compartilhe e traga mais pessoas",
      icon: Link2,
      path: "/voluntario/convite",
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      id: "meus-registros",
      title: "Meus Registros",
      description: "Histórico de registros enviados",
      icon: Send,
      path: "/voluntario/meus-registros",
      color: "text-cyan-500",
      bgColor: "bg-cyan-500/10",
    },
    {
      id: "convites-papeis",
      title: "Convites de Papéis",
      description: "Convites para funções especiais",
      icon: Crown,
      path: "/voluntario/convites-papeis",
      color: "text-pink-500",
      bgColor: "bg-pink-500/10",
    },
  ];

  return (
    <>
      <AppShell>
        <div className="max-w-2xl mx-auto p-4 pb-24 space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 text-primary mb-2">
              <User className="h-6 w-6" />
              <span className="text-sm uppercase tracking-wider font-bold">Eu</span>
            </div>
            <h1 className="text-2xl font-bold">
              {profile?.nickname ? `Olá, ${profile.nickname}!` : "Minha conta"}
            </h1>
            <p className="text-muted-foreground mt-1">
              Suas mensagens, convites e histórico
            </p>
          </div>

          {/* Meu Código Card */}
          {userCode && (
            <Card className="border-dashed">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Hash className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Meu código</p>
                      <p className="font-mono font-bold text-lg">{userCode}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyUserId}
                    className="gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Copiar UUID
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Use este código para ser adicionado como coordenador. 
                  Clique em "Copiar UUID" para compartilhar com administradores.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Links Grid */}
          <div className="space-y-3">
            {EU_LINKS.map((link) => (
              <Link
                key={link.id}
                to={link.path}
                onClick={() => handleLinkClick(link.id)}
                className="block"
              >
                <Card className="hover:border-primary/50 transition-colors group">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className={`h-12 w-12 rounded-full ${link.bgColor} flex items-center justify-center flex-shrink-0`}>
                        <link.icon className={`h-6 w-6 ${link.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold group-hover:text-primary transition-colors">
                            {link.title}
                          </p>
                          {link.count !== undefined && link.count > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {link.count}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {link.description}
                        </p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </AppShell>
      <VoluntarioNavBar />
    </>
  );
}
