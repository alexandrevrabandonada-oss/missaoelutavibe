/**
 * VoluntarioAgir - Hub page for action/mission resources
 * 
 * Max 6 links to existing routes.
 */

import { useEffect } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { VoluntarioNavBar } from "@/components/navigation/VoluntarioNavBar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavTracking } from "@/hooks/useNavTracking";
import { useVolunteerStats } from "@/hooks/useVolunteerStats";
import {
  Target,
  FileText,
  Phone,
  MapPin,
  Users,
  ListTodo,
  Zap,
  ArrowRight,
} from "lucide-react";

export default function VoluntarioAgir() {
  const { trackNavClick, trackHubOpened } = useNavTracking();
  const { 
    availableMissions, 
    inProgressMissions, 
    openDemandas,
    isLoading 
  } = useVolunteerStats();

  // Track hub opened on mount
  useEffect(() => {
    trackHubOpened({ hub: "agir" });
  }, [trackHubOpened]);

  const handleLinkClick = (id: string) => {
    trackNavClick({ role: "voluntario", item: id, section: "agir" });
  };

  const AGIR_LINKS = [
    {
      id: "missoes",
      title: "Missões",
      description: "Tarefas disponíveis para você",
      icon: Target,
      path: "/voluntario/missoes",
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      count: isLoading ? null : availableMissions + inProgressMissions,
      countLabel: "ativas",
    },
    {
      id: "demandas",
      title: "Demandas",
      description: "Registre problemas e necessidades",
      icon: FileText,
      path: "/voluntario/demandas",
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      count: isLoading ? null : openDemandas,
      countLabel: "abertas",
    },
    {
      id: "crm",
      title: "Contatos (CRM)",
      description: "Gerencie seus contatos e follow-ups",
      icon: Phone,
      path: "/voluntario/crm",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      id: "territorio",
      title: "Meu Território",
      description: "Mapeamento e atuação local",
      icon: MapPin,
      path: "/voluntario/territorio",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      id: "squads",
      title: "Squads & Tarefas",
      description: "Trabalho em equipe e projetos",
      icon: Users,
      path: "/voluntario/squads",
      color: "text-cyan-500",
      bgColor: "bg-cyan-500/10",
    },
    {
      id: "acoes",
      title: "Fila de Ações",
      description: "Suas próximas ações organizadas",
      icon: ListTodo,
      path: "/voluntario/acoes",
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
  ];

  return (
    <>
      <AppShell>
        <div className="max-w-2xl mx-auto p-4 pb-24 space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 text-primary mb-2">
              <Zap className="h-6 w-6" />
              <span className="text-sm uppercase tracking-wider font-bold">Agir</span>
            </div>
            <h1 className="text-2xl font-bold">Coloque em prática</h1>
            <p className="text-muted-foreground mt-1">
              Missões, demandas e ações no território
            </p>
          </div>

          {/* Links Grid */}
          <div className="space-y-3">
            {AGIR_LINKS.map((link) => (
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
                          {link.count !== undefined && link.count !== null && link.count > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {link.count} {link.countLabel}
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
