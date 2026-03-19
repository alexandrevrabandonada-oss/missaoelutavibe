import { useState } from "react";
import { useFullFunnel7d, type FunnelStage } from "@/hooks/useFullFunnel7d";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TrendingUp,
  Users,
  CheckCircle2,
  Calendar,
  Target,
  FileCheck,
  Shield,
  Share2,
  UserPlus,
  ChevronRight,
  ArrowDown,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FullFunnelCardProps {
  className?: string;
  scopeCidade?: string | null;
}

const STAGES = [
  { key: "cadastros", label: "Cadastros", icon: Users, color: "text-blue-500" },
  { key: "aprovados", label: "Aprovados", icon: CheckCircle2, color: "text-green-500" },
  { key: "checkins", label: "Check-ins", icon: Calendar, color: "text-primary" },
  { key: "missoes_iniciadas", label: "Missões", icon: Target, color: "text-yellow-500" },
  { key: "evidencias_enviadas", label: "Evidências", icon: FileCheck, color: "text-orange-500" },
  { key: "evidencias_validadas", label: "Validadas", icon: Shield, color: "text-emerald-500" },
  { key: "convites_gerados", label: "Convites", icon: Share2, color: "text-purple-500" },
  { key: "convites_convertidos", label: "Convertidos", icon: UserPlus, color: "text-pink-500" },
] as const;

function conversionRate(from: number, to: number): string | null {
  if (from === 0) return null;
  return `${Math.round((to / from) * 100)}%`;
}

export function FullFunnelCard({ className, scopeCidade }: FullFunnelCardProps) {
  const { data, isLoading, error } = useFullFunnel7d(scopeCidade);
  const [openStage, setOpenStage] = useState<string | null>(null);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) return null;

  const stageData = STAGES.map((s) => ({
    ...s,
    stage: (data as any)[s.key] as FunnelStage,
  }));

  const selectedStage = stageData.find((s) => s.key === openStage);

  // Find biggest drop
  let biggestDropIdx = -1;
  let biggestDropPct = Infinity;
  for (let i = 1; i < stageData.length; i++) {
    const prev = stageData[i - 1].stage.count;
    const curr = stageData[i].stage.count;
    if (prev > 0) {
      const pct = curr / prev;
      if (pct < biggestDropPct) {
        biggestDropPct = pct;
        biggestDropIdx = i;
      }
    }
  }

  return (
    <>
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Funil Completo (7 dias)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {stageData.map((s, i) => {
            const prev = i > 0 ? stageData[i - 1].stage.count : null;
            const rate = prev !== null ? conversionRate(prev, s.stage.count) : null;
            const isDrop = i === biggestDropIdx && biggestDropPct < 0.5;
            const Icon = s.icon;

            return (
              <div key={s.key}>
                {/* Conversion arrow between stages */}
                {i > 0 && (
                  <div className="flex items-center justify-center py-0.5">
                    <ArrowDown className="h-3 w-3 text-muted-foreground/50" />
                    {rate && (
                      <span
                        className={`text-[10px] ml-1 font-medium ${
                          isDrop ? "text-destructive" : "text-muted-foreground"
                        }`}
                      >
                        {rate}
                      </span>
                    )}
                  </div>
                )}
                <button
                  onClick={() => setOpenStage(s.key)}
                  className={`w-full flex items-center justify-between rounded-md px-3 py-2 text-left transition-colors hover:bg-muted/50 ${
                    isDrop ? "bg-destructive/5 border border-destructive/20 rounded-md" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${s.color}`} />
                    <span className="text-sm">{s.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold tabular-nums">{s.stage.count}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </button>
              </div>
            );
          })}

          {/* Biggest leak insight */}
          {biggestDropIdx > 0 && biggestDropPct < 0.5 && (
            <div className="mt-3 p-2 bg-destructive/5 border border-destructive/20 rounded-lg text-xs text-center">
              <span className="font-medium text-destructive">
                ⚠️ Maior vazamento: {stageData[biggestDropIdx - 1].label} → {stageData[biggestDropIdx].label}
              </span>
              <span className="text-muted-foreground">
                {" "}({Math.round(biggestDropPct * 100)}% de conversão)
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Drill-down Dialog */}
      <Dialog open={!!openStage} onOpenChange={() => setOpenStage(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedStage && <selectedStage.icon className={`h-5 w-5 ${selectedStage.color}`} />}
              {selectedStage?.label} — últimos 7 dias
              <Badge variant="secondary" className="ml-auto">
                {selectedStage?.stage.count || 0}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          {selectedStage && selectedStage.stage.items.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-right">Quando</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedStage.stage.items.slice(0, 50).map((item, idx) => (
                  <TableRow key={item.id || idx}>
                    <TableCell className="text-sm">
                      {item.name || item.used_by_name || "—"}
                      {item.title && (
                        <span className="block text-xs text-muted-foreground truncate max-w-[200px]">
                          {item.title}
                        </span>
                      )}
                      {item.city && (
                        <span className="text-xs text-muted-foreground"> · {item.city}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(item.at), "dd/MM HH:mm", { locale: ptBR })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum registro nos últimos 7 dias.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
