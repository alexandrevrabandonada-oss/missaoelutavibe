import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, MessageCircle, Check, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { 
  useRoteirosAprovados, 
  useRoteiroActions,
  RoteiroObjetivo,
  OBJETIVO_LABELS,
  OBJETIVO_COLORS,
} from "@/hooks/useRoteiros";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface RoteiroDoDiaSectionProps {
  compact?: boolean;
}

export function RoteiroDoDiaSection({ compact = false }: RoteiroDoDiaSectionProps) {
  const [selectedObjetivo, setSelectedObjetivo] = useState<RoteiroObjetivo | "all">("all");
  const [usedRoteiros, setUsedRoteiros] = useState<Set<string>>(new Set());
  const [isExpanded, setIsExpanded] = useState(!compact);
  
  const { data: roteiros, isLoading } = useRoteirosAprovados(
    selectedObjetivo === "all" ? undefined : selectedObjetivo
  );
  const { trackAction } = useRoteiroActions();

  const handleCopy = async (roteiro: { id: string; texto_base: string; titulo: string }) => {
    try {
      await navigator.clipboard.writeText(roteiro.texto_base);
      trackAction.mutate({ roteiroId: roteiro.id, actionType: "copiou" });
      toast({ title: "Texto copiado!" });
    } catch (error) {
      toast({ title: "Erro ao copiar", variant: "destructive" });
    }
  };

  const handleWhatsApp = (roteiro: { id: string; texto_base: string }) => {
    const text = encodeURIComponent(roteiro.texto_base);
    window.open(`https://wa.me/?text=${text}`, "_blank");
    trackAction.mutate({ roteiroId: roteiro.id, actionType: "abriu_whatsapp" });
  };

  const handleMarkUsed = (roteiroId: string) => {
    trackAction.mutate({ roteiroId, actionType: "usei" });
    setUsedRoteiros((prev) => new Set([...prev, roteiroId]));
    toast({ title: "Marcado como usado! ✅" });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!roteiros || roteiros.length === 0) {
    return null;
  }

  // Pick a random roteiro for "do dia"
  const roteiroDoDia = roteiros[0];

  return (
    <Card className="border-primary/20">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Roteiro do Dia
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select
                value={selectedObjetivo}
                onValueChange={(v) => setSelectedObjetivo(v as RoteiroObjetivo | "all")}
              >
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue placeholder="Objetivo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {Object.entries(OBJETIVO_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Roteiro do Dia */}
            <div className="p-3 bg-muted/50 rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">{roteiroDoDia.titulo}</span>
                <Badge className={OBJETIVO_COLORS[roteiroDoDia.objetivo as RoteiroObjetivo]}>
                  {OBJETIVO_LABELS[roteiroDoDia.objetivo as RoteiroObjetivo]}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                {roteiroDoDia.texto_base}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(roteiroDoDia)}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copiar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleWhatsApp(roteiroDoDia)}
                  className="text-green-600 border-green-200 hover:bg-green-50"
                >
                  <MessageCircle className="h-3 w-3 mr-1" />
                  WhatsApp
                </Button>
                <Button
                  variant={usedRoteiros.has(roteiroDoDia.id) ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleMarkUsed(roteiroDoDia.id)}
                  disabled={usedRoteiros.has(roteiroDoDia.id)}
                >
                  <Check className="h-3 w-3 mr-1" />
                  {usedRoteiros.has(roteiroDoDia.id) ? "Usado!" : "Eu usei"}
                </Button>
              </div>
            </div>

            {/* Other roteiros */}
            {roteiros.length > 1 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">
                  Outros roteiros ({roteiros.length - 1})
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {roteiros.slice(1).map((roteiro) => (
                    <div
                      key={roteiro.id}
                      className="p-2 border rounded-md hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium truncate flex-1">
                          {roteiro.titulo}
                        </span>
                        <Badge
                          variant="outline"
                          className={`ml-2 text-xs ${OBJETIVO_COLORS[roteiro.objetivo as RoteiroObjetivo]}`}
                        >
                          {OBJETIVO_LABELS[roteiro.objetivo as RoteiroObjetivo]}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {roteiro.texto_base}
                      </p>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => handleCopy(roteiro)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs text-green-600"
                          onClick={() => handleWhatsApp(roteiro)}
                        >
                          <MessageCircle className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => handleMarkUsed(roteiro.id)}
                          disabled={usedRoteiros.has(roteiro.id)}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
