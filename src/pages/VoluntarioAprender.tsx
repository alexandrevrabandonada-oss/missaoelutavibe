/**
 * VoluntarioAprender - Hub page for learning resources
 * 
 * Max 6 links to existing routes.
 */

import { useEffect } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { VoluntarioNavBar } from "@/components/navigation/VoluntarioNavBar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavTracking } from "@/hooks/useNavTracking";
import {
  MessagesSquare,
  FolderOpen,
  GraduationCap,
  Package,
  FileText,
  BookOpen,
  ArrowRight,
} from "lucide-react";

const APRENDER_LINKS = [
  {
    id: "formacao",
    title: "Formação",
    description: "Cursos e trilhas de aprendizado",
    icon: GraduationCap,
    path: "/formacao",
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
  },
  {
    id: "debates",
    title: "Debates",
    description: "Discussões e trocas de ideias",
    icon: MessagesSquare,
    path: "/debates",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    id: "materiais",
    title: "Materiais",
    description: "Artes, panfletos e textos prontos",
    icon: FolderOpen,
    path: "/materiais",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  {
    id: "fabrica",
    title: "Fábrica de Base",
    description: "Pacotes prontos para compartilhar",
    icon: Package,
    path: "/voluntario/base",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  {
    id: "arquivos",
    title: "Arquivos",
    description: "Biblioteca de arquivos da fábrica",
    icon: FileText,
    path: "/fabrica/arquivos",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
];

export default function VoluntarioAprender() {
  const { trackNavClick, trackHubOpened } = useNavTracking();

  // Track hub opened on mount
  useEffect(() => {
    trackHubOpened({ hub: "aprender" });
  }, [trackHubOpened]);

  const handleLinkClick = (id: string) => {
    trackNavClick({ role: "voluntario", item: id, section: "aprender" });
  };

  return (
    <>
      <AppShell>
        <div className="max-w-2xl mx-auto p-4 pb-24 space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 text-primary mb-2">
              <BookOpen className="h-6 w-6" />
              <span className="text-sm uppercase tracking-wider font-bold">Aprender</span>
            </div>
            <h1 className="text-2xl font-bold">Estude e se prepare</h1>
            <p className="text-muted-foreground mt-1">
              Formação, debates e materiais para sua atuação
            </p>
          </div>

          {/* Links Grid */}
          <div className="space-y-3">
            {APRENDER_LINKS.map((link) => (
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
                        <p className="font-bold group-hover:text-primary transition-colors">
                          {link.title}
                        </p>
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
