import { useQuickFunnel } from "@/hooks/useQuickFunnel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown,
  Users,
  CheckCircle2,
  Calendar,
  Share2,
  UserPlus,
  Zap,
} from "lucide-react";

interface QuickFunnelCardProps {
  className?: string;
}

export function QuickFunnelCard({ className }: QuickFunnelCardProps) {
  const { data: metrics, isLoading, error } = useQuickFunnel();

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !metrics) {
    return null;
  }

  const funnelItems = [
    { 
      label: "Cadastros", 
      value: metrics.signup, 
      variation: metrics.signup_variation,
      icon: Users,
      color: "text-blue-500",
    },
    { 
      label: "Aprovados", 
      value: metrics.approved, 
      variation: metrics.approved_variation,
      icon: CheckCircle2,
      color: "text-green-500",
    },
    { 
      label: "Check-ins", 
      value: metrics.checkin_submitted, 
      variation: metrics.checkin_variation,
      icon: Calendar,
      color: "text-primary",
    },
    { 
      label: "Ações", 
      value: metrics.next_action_completed, 
      variation: metrics.action_variation,
      icon: Zap,
      color: "text-yellow-500",
    },
    { 
      label: "Convites", 
      value: metrics.invite_shared, 
      icon: Share2,
      color: "text-purple-500",
    },
    { 
      label: "Contatos", 
      value: metrics.contact_created, 
      icon: UserPlus,
      color: "text-orange-500",
    },
  ];

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Funil (últimos 7 dias)
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            Hoje: {metrics.checkins_today} check-ins, {metrics.actions_today} ações
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {funnelItems.map((item) => (
            <div 
              key={item.label}
              className="bg-muted/50 rounded-lg p-3 text-center"
            >
              <div className="flex items-center justify-center gap-1 mb-1">
                <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
                <span className="text-xs text-muted-foreground">{item.label}</span>
              </div>
              <p className="text-2xl font-bold">{item.value}</p>
              {item.variation !== undefined && (
                <div className="flex items-center justify-center gap-0.5 mt-1">
                  {item.variation > 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : item.variation < 0 ? (
                    <TrendingDown className="h-3 w-3 text-destructive" />
                  ) : null}
                  <span className={`text-xs ${
                    item.variation > 0 ? "text-green-500" : 
                    item.variation < 0 ? "text-destructive" : 
                    "text-muted-foreground"
                  }`}>
                    {item.variation > 0 ? "+" : ""}{item.variation}%
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Conversion insight */}
        {metrics.signup > 0 && (
          <div className="mt-3 p-2 bg-primary/5 rounded-lg text-xs text-muted-foreground text-center">
            <span className="font-medium text-foreground">
              {metrics.approved > 0 
                ? Math.round((metrics.next_action_completed / metrics.approved) * 100) 
                : 0}%
            </span>
            {" "}dos aprovados fizeram ação • {" "}
            <span className="font-medium text-foreground">
              {metrics.approved > 0 
                ? Math.round((metrics.invite_shared / metrics.approved) * 100) 
                : 0}%
            </span>
            {" "}convidaram alguém
          </div>
        )}
      </CardContent>
    </Card>
  );
}
