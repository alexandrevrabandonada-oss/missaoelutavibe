/**
 * LocalSuggestions - Always shows 3 suggestions with silent fallback
 * 
 * Never shows error alerts. Uses local fallbacks when API fails.
 */

import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Target,
  MapPin,
  MessageCircle,
  Phone,
  Calendar,
  Users,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Suggestion {
  id: string;
  type: "task" | "mission" | "crm" | "agenda" | "rua" | "conversa";
  title: string;
  subtitle?: string;
  href: string;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "outline" | "destructive";
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  task: <Users className="h-5 w-5 text-blue-500" />,
  mission: <Target className="h-5 w-5 text-orange-500" />,
  crm: <Phone className="h-5 w-5 text-green-500" />,
  agenda: <Calendar className="h-5 w-5 text-purple-500" />,
  rua: <MapPin className="h-5 w-5 text-orange-500" />,
  conversa: <MessageCircle className="h-5 w-5 text-blue-500" />,
};

// Default local suggestions (fallback)
const DEFAULT_SUGGESTIONS: Suggestion[] = [
  {
    id: "fallback-rua",
    type: "rua",
    title: "Missão de Rua (10 min)",
    subtitle: "Distribua materiais no seu bairro",
    href: "/voluntario/missoes",
    badge: "Sugerido",
  },
  {
    id: "fallback-conversa",
    type: "conversa",
    title: "Missão de Conversa",
    subtitle: "Fale com 3 contatos do CRM",
    href: "/voluntario/missoes",
    badge: "Rápido",
  },
  {
    id: "fallback-crm",
    type: "crm",
    title: "Cadastrar novo contato",
    subtitle: "Registre alguém que conheceu",
    href: "/voluntario/crm",
    badge: "CRM",
  },
];

interface LocalSuggestionsProps {
  apiSuggestions?: {
    task?: { id: string; titulo: string; squad_nome?: string; prazo_em?: string };
    crm?: { id: string; nome: string };
    agenda?: { id: string; titulo: string; inicio_em: string; local_texto?: string };
    mission?: { id: string; title: string; type?: string };
  };
  isLoading?: boolean;
  compact?: boolean;
}

export function LocalSuggestions({ 
  apiSuggestions, 
  isLoading = false,
  compact = false,
}: LocalSuggestionsProps) {
  // Build suggestions list from API + fallback
  const suggestions: Suggestion[] = [];

  if (apiSuggestions) {
    if (apiSuggestions.task) {
      suggestions.push({
        id: apiSuggestions.task.id,
        type: "task",
        title: apiSuggestions.task.titulo,
        subtitle: apiSuggestions.task.squad_nome,
        href: "/voluntario/squads",
        badge: apiSuggestions.task.prazo_em
          ? format(new Date(apiSuggestions.task.prazo_em), "dd/MM")
          : undefined,
        badgeVariant: apiSuggestions.task.prazo_em && new Date(apiSuggestions.task.prazo_em) < new Date()
          ? "destructive"
          : "secondary",
      });
    }

    if (apiSuggestions.crm) {
      suggestions.push({
        id: apiSuggestions.crm.id,
        type: "crm",
        title: `Contatar: ${apiSuggestions.crm.nome}`,
        subtitle: "Follow-up agendado",
        href: "/voluntario/crm",
        badge: "CRM",
      });
    }

    if (apiSuggestions.agenda) {
      suggestions.push({
        id: apiSuggestions.agenda.id,
        type: "agenda",
        title: apiSuggestions.agenda.titulo,
        subtitle: apiSuggestions.agenda.local_texto || "Local a definir",
        href: `/voluntario/agenda/${apiSuggestions.agenda.id}`,
        badge: format(new Date(apiSuggestions.agenda.inicio_em), "HH:mm"),
      });
    }

    if (apiSuggestions.mission) {
      suggestions.push({
        id: apiSuggestions.mission.id,
        type: "mission",
        title: apiSuggestions.mission.title,
        subtitle: apiSuggestions.mission.type,
        href: `/voluntario/missao/${apiSuggestions.mission.id}`,
        badge: "Missão",
      });
    }
  }

  // Fill remaining slots with defaults (always show 3)
  const finalSuggestions = suggestions.slice(0, 3);
  let defaultIndex = 0;
  while (finalSuggestions.length < 3 && defaultIndex < DEFAULT_SUGGESTIONS.length) {
    // Don't duplicate types
    const defaultSuggestion = DEFAULT_SUGGESTIONS[defaultIndex];
    if (!finalSuggestions.some(s => s.type === defaultSuggestion.type)) {
      finalSuggestions.push(defaultSuggestion);
    }
    defaultIndex++;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader className={compact ? "pb-2" : undefined}>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Sugestões
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div 
              key={i} 
              className="h-16 bg-muted animate-pulse rounded-lg" 
            />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className={compact ? "pb-2" : undefined}>
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Sugestões
        </CardTitle>
        {!compact && (
          <CardDescription>Baseado nas suas tarefas e agenda</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {finalSuggestions.map((suggestion) => (
          <Link
            key={suggestion.id}
            to={suggestion.href}
            className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
          >
            {TYPE_ICONS[suggestion.type]}
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{suggestion.title}</p>
              {suggestion.subtitle && (
                <p className="text-sm text-muted-foreground truncate">
                  {suggestion.subtitle}
                </p>
              )}
            </div>
            {suggestion.badge && (
              <Badge variant={suggestion.badgeVariant || "secondary"}>
                {suggestion.badge}
              </Badge>
            )}
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
