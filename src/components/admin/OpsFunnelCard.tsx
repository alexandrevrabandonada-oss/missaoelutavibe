import { useState } from "react";
import { useOpsFunnel } from "@/hooks/useOpsFunnel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity,
  Users,
  MapPin,
  MessageCircle,
  UserPlus,
  Phone,
  ArrowRight,
  TrendingUp,
  Trophy,
} from "lucide-react";

interface OpsFunnelCardProps {
  scopeCidade?: string | null;
  scopeCellId?: string | null;
}

export function OpsFunnelCard({ scopeCidade, scopeCellId }: OpsFunnelCardProps) {
  const [periodDays, setPeriodDays] = useState<7 | 30>(7);
  const { data: metrics, isLoading, error } = useOpsFunnel(periodDays, scopeCidade, scopeCellId);

  if (isLoading) {
    return (
      <Card className="border-primary/20">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !metrics) {
    return null;
  }

  const { ativacoes, rua, conversa, crm, followup, secundarias, top_cidades } = metrics;

  // Calculate total actions
  const totalActions = rua.concluidas + conversa.concluidas + followup.done;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Funil Operacional
          </CardTitle>
          <Tabs value={String(periodDays)} onValueChange={(v) => setPeriodDays(Number(v) as 7 | 30)}>
            <TabsList className="h-7">
              <TabsTrigger value="7" className="text-xs px-2 h-6">7d</TabsTrigger>
              <TabsTrigger value="30" className="text-xs px-2 h-6">30d</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Activation Row */}
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Ativações</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-lg font-bold">{ativacoes.onboarding_complete}</p>
              <p className="text-[10px] text-muted-foreground">onboarding</p>
            </div>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <div className="text-right">
              <p className="text-lg font-bold text-primary">{ativacoes.active_7d}</p>
              <p className="text-[10px] text-muted-foreground">ativos 7d</p>
            </div>
          </div>
        </div>

        {/* Mission Funnels Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Street Missions */}
          <FunnelStep
            icon={MapPin}
            label="Rua"
            generated={rua.geradas}
            completed={rua.concluidas}
            rate={rua.taxa_conversao}
          />

          {/* Conversation Missions */}
          <FunnelStep
            icon={MessageCircle}
            label="Conversa"
            generated={conversa.geradas}
            completed={conversa.concluidas}
            rate={conversa.taxa_conversao}
          />
        </div>

        {/* CRM & Followup Row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 p-2 bg-muted/20 rounded-lg">
            <UserPlus className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">CRM Contatos</p>
              <p className="font-bold">{crm.quick_add_saved}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 bg-muted/20 rounded-lg">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Follow-ups</p>
              <p className="font-bold">{followup.done}</p>
            </div>
          </div>
        </div>

        {/* Secondary Metrics */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>📋 {secundarias.script_copied} scripts</span>
          <span>💬 {secundarias.whatsapp_opened} WhatsApp</span>
        </div>

        {/* Summary */}
        <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Total Ações</span>
          </div>
          <span className="text-xl font-bold text-primary">{totalActions}</span>
        </div>

        {/* Top Cities */}
        {top_cidades.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Trophy className="h-3 w-3" />
              Top Cidades
            </p>
            <div className="space-y-1">
              {top_cidades.slice(0, 5).map((city, idx) => (
                <div
                  key={city.cidade}
                  className="flex items-center justify-between text-xs p-1.5 bg-muted/20 rounded"
                >
                  <span className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">{idx + 1}.</span>
                    <span className="font-medium truncate max-w-[120px]">{city.cidade}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px] px-1.5">
                      {city.concluidas} ✓
                    </Badge>
                    <Badge variant="outline" className="text-[10px] px-1.5">
                      {city.followups} 📞
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Sub-component for funnel steps
function FunnelStep({
  icon: Icon,
  label,
  generated,
  completed,
  rate,
}: {
  icon: React.ElementType;
  label: string;
  generated: number;
  completed: number;
  rate: number | null;
}) {
  return (
    <div className="p-3 bg-muted/20 rounded-lg space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold">{generated}</span>
        <ArrowRight className="h-3 w-3 text-muted-foreground" />
        <span className="text-lg font-bold text-primary">{completed}</span>
      </div>
      {rate !== null && (
        <Badge variant="outline" className="text-[10px]">
          {rate}% conversão
        </Badge>
      )}
    </div>
  );
}
