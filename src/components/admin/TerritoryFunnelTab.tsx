import { useState } from "react";
import { useTerritoryFunnel, TerritoryFunnelRow, TerritoryFunnelAlert } from "@/hooks/useTerritoryFunnel";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertTriangle,
  TrendingDown,
  Clock,
  Zap,
  ArrowRight,
} from "lucide-react";

function ConversionCell({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="text-muted-foreground">-</span>;
  }
  
  const color = 
    value >= 50 ? "text-green-500" :
    value >= 20 ? "text-amber-500" :
    "text-destructive";
  
  return <span className={color}>{value}%</span>;
}

function AlertCard({ alert }: { alert: TerritoryFunnelAlert }) {
  const Icon = 
    alert.type === "baixa_form" ? TrendingDown :
    alert.type === "gargalo_aprovacao" ? Clock :
    Zap;
  
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${
      alert.severity === "error" 
        ? "bg-destructive/10 border-destructive/30" 
        : "bg-amber-500/10 border-amber-500/30"
    }`}>
      <Icon className={`h-5 w-5 mt-0.5 ${
        alert.severity === "error" ? "text-destructive" : "text-amber-500"
      }`} />
      <div>
        <p className="text-sm font-medium">{alert.message}</p>
      </div>
    </div>
  );
}

function FunnelTable({ rows, totals }: { 
  rows: TerritoryFunnelRow[]; 
  totals: TerritoryFunnelRow;
}) {
  if (rows.length === 0) {
    return (
      <div className="card-luta text-center py-12">
        <TrendingDown className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Nenhum dado de funil neste período</p>
      </div>
    );
  }
  
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-bold">Cidade</TableHead>
            <TableHead className="text-center">Opens</TableHead>
            <TableHead className="text-center">Forms</TableHead>
            <TableHead className="text-center">Signups</TableHead>
            <TableHead className="text-center">Aprovados</TableHead>
            <TableHead className="text-center">1ª Ação</TableHead>
            <TableHead className="text-center text-xs">O→F</TableHead>
            <TableHead className="text-center text-xs">F→S</TableHead>
            <TableHead className="text-center text-xs">S→A</TableHead>
            <TableHead className="text-center text-xs">A→1</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.cidade}>
              <TableCell className="font-medium">{row.cidade}</TableCell>
              <TableCell className="text-center">{row.link_open}</TableCell>
              <TableCell className="text-center">{row.form_open}</TableCell>
              <TableCell className="text-center">{row.signup}</TableCell>
              <TableCell className="text-center">{row.approved}</TableCell>
              <TableCell className="text-center">{row.first_action}</TableCell>
              <TableCell className="text-center">
                <ConversionCell value={row.open_to_form} />
              </TableCell>
              <TableCell className="text-center">
                <ConversionCell value={row.form_to_signup} />
              </TableCell>
              <TableCell className="text-center">
                <ConversionCell value={row.signup_to_approved} />
              </TableCell>
              <TableCell className="text-center">
                <ConversionCell value={row.approved_to_action} />
              </TableCell>
            </TableRow>
          ))}
          {/* Totals Row */}
          <TableRow className="bg-muted/50 font-bold">
            <TableCell>TOTAL</TableCell>
            <TableCell className="text-center">{totals.link_open}</TableCell>
            <TableCell className="text-center">{totals.form_open}</TableCell>
            <TableCell className="text-center">{totals.signup}</TableCell>
            <TableCell className="text-center">{totals.approved}</TableCell>
            <TableCell className="text-center">{totals.first_action}</TableCell>
            <TableCell className="text-center">
              <ConversionCell value={totals.open_to_form} />
            </TableCell>
            <TableCell className="text-center">
              <ConversionCell value={totals.form_to_signup} />
            </TableCell>
            <TableCell className="text-center">
              <ConversionCell value={totals.signup_to_approved} />
            </TableCell>
            <TableCell className="text-center">
              <ConversionCell value={totals.approved_to_action} />
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

export function TerritoryFunnelTab() {
  const [period, setPeriod] = useState<"7" | "30">("7");
  const { data: data7d, isLoading: loading7d } = useTerritoryFunnel(7);
  const { data: data30d, isLoading: loading30d } = useTerritoryFunnel(30);
  
  const isLoading = period === "7" ? loading7d : loading30d;
  const data = period === "7" ? data7d : data30d;
  
  return (
    <div className="space-y-4 mt-4">
      {/* Period Toggle */}
      <Tabs value={period} onValueChange={(v) => setPeriod(v as "7" | "30")}>
        <TabsList className="grid w-48 grid-cols-2">
          <TabsTrigger value="7">7 dias</TabsTrigger>
          <TabsTrigger value="30">30 dias</TabsTrigger>
        </TabsList>
      </Tabs>
      
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : data ? (
        <>
          {/* Alerts Section */}
          {data.alerts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground uppercase tracking-wider">
                <AlertTriangle className="h-4 w-4" />
                Alertas ({data.alerts.length})
              </div>
              <div className="space-y-2">
                {data.alerts.map((alert, i) => (
                  <AlertCard key={i} alert={alert} />
                ))}
              </div>
            </div>
          )}
          
          {/* Summary Cards */}
          <div className="grid grid-cols-5 gap-2">
            <div className="card-luta p-3 text-center">
              <div className="text-2xl font-bold text-primary">{data.totals.link_open}</div>
              <div className="text-xs text-muted-foreground">Opens</div>
            </div>
            <div className="card-luta p-3 text-center relative">
              <ArrowRight className="absolute -left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <div className="text-2xl font-bold">{data.totals.form_open}</div>
              <div className="text-xs text-muted-foreground">Forms</div>
              <div className="text-xs">
                <ConversionCell value={data.totals.open_to_form} />
              </div>
            </div>
            <div className="card-luta p-3 text-center relative">
              <ArrowRight className="absolute -left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <div className="text-2xl font-bold">{data.totals.signup}</div>
              <div className="text-xs text-muted-foreground">Signups</div>
              <div className="text-xs">
                <ConversionCell value={data.totals.form_to_signup} />
              </div>
            </div>
            <div className="card-luta p-3 text-center relative">
              <ArrowRight className="absolute -left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <div className="text-2xl font-bold text-green-500">{data.totals.approved}</div>
              <div className="text-xs text-muted-foreground">Aprovados</div>
              <div className="text-xs">
                <ConversionCell value={data.totals.signup_to_approved} />
              </div>
            </div>
            <div className="card-luta p-3 text-center relative">
              <ArrowRight className="absolute -left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <div className="text-2xl font-bold text-primary">{data.totals.first_action}</div>
              <div className="text-xs text-muted-foreground">1ª Ação</div>
              <div className="text-xs">
                <ConversionCell value={data.totals.approved_to_action} />
              </div>
            </div>
          </div>
          
          {/* Funnel Table */}
          <FunnelTable 
            rows={data.rows} 
            totals={{
              cidade: "TOTAL",
              ...data.totals,
            }} 
          />
        </>
      ) : null}
    </div>
  );
}
